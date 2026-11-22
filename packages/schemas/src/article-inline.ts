type InlinePart =
  { type: "text" | "bold" | "italic"; text: string } | { type: "link"; text: string; href: string };

export function articleInline(text: string): InlinePart[] {
  const tokens = /\[([^\]\n]+)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*/g;
  const parts: InlinePart[] = [];
  let cursor = 0;
  for (const match of text.matchAll(tokens)) {
    if (match.index > cursor) parts.push({ type: "text", text: text.slice(cursor, match.index) });
    const [source, label, url, bold, italic] = match;
    if (label && url) {
      let link: URL | undefined;
      try {
        link = new URL(url);
      } catch {
        // Leave invalid links as text.
      }
      if (link?.protocol === "https:" && !link.username && !link.password)
        parts.push({ type: "link", text: label, href: link.href });
      else parts.push({ type: "text", text: source });
    } else if (bold) parts.push({ type: "bold", text: bold });
    else if (italic) parts.push({ type: "italic", text: italic });
    cursor = match.index + source.length;
  }
  if (cursor < text.length) parts.push({ type: "text", text: text.slice(cursor) });
  return parts;
}
