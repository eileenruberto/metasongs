import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

marked.setOptions({ breaks: true });

// Song descriptions carry light markdown (bold, links, blockquotes) from
// the Glide days. Rendered server-side (these pages are on-demand, not
// static), sanitized since it's stored content even if only the site owner
// can currently write it.
export async function renderMarkdown(source: string): Promise<string> {
  const html = await marked.parse(source);
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'strong', 'em', 'a', 'blockquote', 'ul', 'ol', 'li', 'code', 'pre', 'h1', 'h2', 'h3', 'hr'],
    allowedAttributes: { a: ['href', 'title'] },
    allowedSchemes: ['http', 'https', 'mailto'],
  });
}
