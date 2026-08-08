export const PAPERS = ['blank', 'sand', 'clay', 'periwinkle', 'lilac', 'aqua', 'slate'] as const;
export type Paper = (typeof PAPERS)[number];

// Each curated category gets its own paper tint, so browsing a category
// feels like a distinct "section" — mirrors the colophon reference where
// the paper changes per section but ink/surface rules stay constant.
export const CATEGORY_PAPER: Record<string, Paper> = {
  'Self-Referential': 'aqua',
  'Interpolation': 'periwinkle',
  'Namechecks': 'clay',
  'Meta Medleys': 'lilac',
  'Most Referenced': 'sand',
};

export function paperForCategoryName(name: string | undefined | null): Paper {
  if (!name) return 'blank';
  return CATEGORY_PAPER[name] ?? 'blank';
}

// A song inherits the tint of its first known category tag, if it has one.
export function paperForSong(categoryTagValues: string[]): Paper {
  for (const value of categoryTagValues) {
    const paper = CATEGORY_PAPER[value];
    if (paper) return paper;
  }
  return 'blank';
}
