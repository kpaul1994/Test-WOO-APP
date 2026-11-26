const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#039;': "'",
  '&apos;': "'",
  '&rsquo;': '’',
  '&lsquo;': '‘',
  '&rdquo;': '”',
  '&ldquo;': '“',
  '&ndash;': '–',
  '&mdash;': '—',
  '&nbsp;': ' ',
  '&#36;': '$',
  '&dollar;': '$',
  '&euro;': '€',
  '&pound;': '£',
  '&yen;': '¥',
  '&#8377;': '₹',
  '&#x20B9;': '₹',
};

export function decodeEntities(input?: string | null): string {
  if (!input) return '';
  let out = input.trim();
  Object.entries(ENTITIES).forEach(([k, v]) => {
    out = out.replace(new RegExp(k, 'gi'), v);
  });
  out = out.replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)));
  return out.trim();
}

export function htmlToPlainText(html?: string | null): string {
  if (!html) return '';
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '• ')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '');
  return decodeEntities(withBreaks)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
