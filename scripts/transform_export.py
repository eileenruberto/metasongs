#!/usr/bin/env python3
"""
Transforms the raw Glide CSV export into supabase/seed.sql.

Input: the "<hash>.Metasongs-Artists,<hash>.Metasongs-Categories,<hash>.Metasongs-Songs"
folder produced by Glide's data export, containing three CSVs.

Output: supabase/seed.sql (INSERT statements) and a plain-text report of
anything that needed a judgment call (duplicate artists, unmatched song
artists, unmatched song references) so a human can review it.
"""
import csv
import re
import sys
import uuid
from collections import defaultdict
from pathlib import Path

NAMESPACE = uuid.UUID("6f6a1f6e-2c8b-4b7a-9f0e-3a2f8e6a5c11")

ROOT = Path(__file__).resolve().parent.parent
EXPORT_DIR = ROOT.parent / "2026-07-16 - Metasongs Export" / (
    "65b254.Metasongs-Artists,65b254.Metasongs-Categories,65b254.Metasongs-Songs"
)
OUT_SQL = ROOT / "supabase" / "seed.sql"
OUT_REPORT = ROOT / "scripts" / "transform_report.txt"


def read_csv(name):
    with open(EXPORT_DIR / name, newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def sql_str(value):
    if value is None:
        return "null"
    return "'" + str(value).replace("'", "''") + "'"


def sql_bool(value):
    return "true" if value else "false"


def slugify(text, taken):
    base = text.strip().lower()
    base = re.sub(r"[’'\"]", "", base)
    base = re.sub(r"[^a-z0-9]+", "-", base).strip("-")
    base = base or "item"
    slug = base
    n = 2
    while slug in taken:
        slug = f"{base}-{n}"
        n += 1
    taken.add(slug)
    return slug


def stable_uuid(*parts):
    return str(uuid.uuid5(NAMESPACE, "|".join(parts)))


def split_tags(raw):
    if not raw or not raw.strip():
        return []
    return [v.strip() for v in raw.split(",") if v.strip()]


def truthy_published(raw):
    return raw.strip() in ("true", "1")


def main():
    report = []

    categories_raw = read_csv("65b254.Metasongs-Categories.csv")
    artists_raw = read_csv("65b254.Metasongs-Artists.csv")
    songs_raw = read_csv("65b254.Metasongs-Songs.csv")

    # ---- categories ----
    categories = []
    category_slugs = set()
    for row in categories_raw:
        glide_id = row["🔒 Row ID"]
        name = row["Name"].strip()
        categories.append({
            "id": stable_uuid("category", glide_id),
            "glide_row_id": glide_id,
            "name": name,
            "slug": slugify(name, category_slugs),
            "description": row["Description"].strip() or None,
        })
    category_names = {c["name"] for c in categories}

    # ---- artists (dedupe by name, keep first occurrence's data) ----
    artists_by_name = {}
    artist_slugs = set()
    for row in artists_raw:
        name = row["Artist Name"].strip()
        glide_id = row["🔒 Row ID"]
        if name in artists_by_name:
            report.append(
                f"Duplicate artist name {name!r}: kept row {artists_by_name[name]['glide_row_id']}, "
                f"dropped row {glide_id} (image {row['Artist Image'].strip() or '(none)'})"
            )
            continue
        artists_by_name[name] = {
            "id": stable_uuid("artist", glide_id),
            "glide_row_id": glide_id,
            "name": name,
            "slug": slugify(name, artist_slugs),
            "image_url": row["Artist Image"].strip() or None,
            "is_most_referenced": row["Category"].strip() == "Most Referenced",
        }

    # ---- songs ----
    song_slugs = set()
    songs = []
    song_tags_rows = []
    songs_by_title_lower = {}
    missing_artist_count = 0

    for row in songs_raw:
        glide_id = row["🔒 Row ID"]
        title = row["Song Title"].strip()
        artist_name = row["Artist"].strip()

        if artist_name not in artists_by_name:
            missing_artist_count += 1
            report.append(f"Song {title!r} references artist {artist_name!r} not in Artists table -> creating artist record")
            artists_by_name[artist_name] = {
                "id": stable_uuid("artist-from-song", artist_name),
                "glide_row_id": None,
                "name": artist_name,
                "slug": slugify(artist_name, artist_slugs),
                "image_url": None,
                "is_most_referenced": False,
            }

        song_id = stable_uuid("song", glide_id)
        slug = slugify(f"{title}-{artist_name}", song_slugs)

        song = {
            "id": song_id,
            "glide_row_id": glide_id,
            "slug": slug,
            "title": title,
            "artist_id": artists_by_name[artist_name]["id"],
            "image_url": row["Image"].strip() or None,
            "spotify_url": row["Spotify Link"].strip() or None,
            "apple_music_url": row["Apple Music"].strip() or None,
            "song_link_url": row["Song Link"].strip() or None,
            "meta_lyrics": row["Meta Lyrics"].strip() or None,
            "description": row["Description Rich"].strip() or None,
            "source_url": row["Source"].strip() or None,
            "album": row["Album"].strip() or None,
            "featured_artists": row["Featured Artists (Album or Artist)"].strip() or None,
            "sentiment": row["Sentiment"].strip() or None,
            "published": truthy_published(row["Published"]),
        }
        songs.append(song)
        songs_by_title_lower[title.lower()] = song_id

        for value in split_tags(row["Category"]):
            if value not in category_names:
                report.append(f"Song {title!r} has category tag {value!r} not present in curated Categories list")
            song_tags_rows.append((song_id, "category", value))
        for value in split_tags(row["Subcategory"]):
            song_tags_rows.append((song_id, "subcategory", value))
        for value in split_tags(row["Reference Type"]):
            song_tags_rows.append((song_id, "reference_type", value))

    # ---- song_references (match SongsReferenced text against song titles) ----
    song_references_rows = []
    matched = 0
    unmatched = 0
    for row, song in zip(songs_raw, songs):
        raw = row["SongsReferenced"].strip()
        if not raw:
            continue
        for ref_title in split_tags(raw):
            # Self-references are meaningful here: the "Self-Referential"
            # category is exactly songs that name-check their own title.
            ref_id = songs_by_title_lower.get(ref_title.lower())
            if ref_id:
                matched += 1
            else:
                unmatched += 1
                report.append(f"Song {song['title']!r} references {ref_title!r} -> no matching song title found")
            song_references_rows.append((song["id"], ref_id, ref_title))

    report.insert(0, f"song_references: {matched} matched to a known song, {unmatched} kept as text-only")
    report.insert(0, f"songs: {len(songs)} total, {missing_artist_count} needed an auto-created artist")
    report.insert(0, f"artists: {len(artists_by_name)} unique (from {len(artists_raw)} source rows)")
    report.insert(0, f"categories: {len(categories)}")

    # ---- write seed.sql ----
    lines = [
        "-- Generated by scripts/transform_export.py -- do not edit by hand.",
        "-- Re-run the script against the export to regenerate.",
        "begin;",
        "",
        "truncate table song_references, song_tags, songs, artists, categories restart identity cascade;",
        "",
    ]

    lines.append("-- categories")
    for c in categories:
        lines.append(
            "insert into categories (id, glide_row_id, name, slug, description) values "
            f"({sql_str(c['id'])}, {sql_str(c['glide_row_id'])}, {sql_str(c['name'])}, {sql_str(c['slug'])}, {sql_str(c['description'])});"
        )

    lines.append("")
    lines.append("-- artists")
    for a in artists_by_name.values():
        lines.append(
            "insert into artists (id, glide_row_id, name, slug, image_url, is_most_referenced) values "
            f"({sql_str(a['id'])}, {sql_str(a['glide_row_id'])}, {sql_str(a['name'])}, {sql_str(a['slug'])}, "
            f"{sql_str(a['image_url'])}, {sql_bool(a['is_most_referenced'])});"
        )

    lines.append("")
    lines.append("-- songs")
    for s in songs:
        lines.append(
            "insert into songs (id, glide_row_id, slug, title, artist_id, image_url, spotify_url, "
            "apple_music_url, song_link_url, meta_lyrics, description, source_url, album, "
            "featured_artists, sentiment, published) values ("
            f"{sql_str(s['id'])}, {sql_str(s['glide_row_id'])}, {sql_str(s['slug'])}, {sql_str(s['title'])}, "
            f"{sql_str(s['artist_id'])}, {sql_str(s['image_url'])}, {sql_str(s['spotify_url'])}, "
            f"{sql_str(s['apple_music_url'])}, {sql_str(s['song_link_url'])}, {sql_str(s['meta_lyrics'])}, "
            f"{sql_str(s['description'])}, {sql_str(s['source_url'])}, {sql_str(s['album'])}, "
            f"{sql_str(s['featured_artists'])}, {sql_str(s['sentiment'])}, {sql_bool(s['published'])});"
        )

    lines.append("")
    lines.append("-- song_tags")
    for song_id, tag_type, value in song_tags_rows:
        lines.append(
            "insert into song_tags (song_id, tag_type, value) values "
            f"({sql_str(song_id)}, {sql_str(tag_type)}, {sql_str(value)}) on conflict do nothing;"
        )

    lines.append("")
    lines.append("-- song_references")
    for song_id, ref_id, raw_title in song_references_rows:
        lines.append(
            "insert into song_references (song_id, referenced_song_id, referenced_title_raw) values "
            f"({sql_str(song_id)}, {sql_str(ref_id)}, {sql_str(raw_title)}) on conflict do nothing;"
        )

    lines.append("")
    lines.append("commit;")

    OUT_SQL.parent.mkdir(parents=True, exist_ok=True)
    OUT_SQL.write_text("\n".join(lines) + "\n", encoding="utf-8")
    OUT_REPORT.write_text("\n".join(report) + "\n", encoding="utf-8")

    print(f"Wrote {OUT_SQL} ({len(lines)} lines)")
    print(f"Wrote {OUT_REPORT} ({len(report)} notes)")


if __name__ == "__main__":
    sys.exit(main())
