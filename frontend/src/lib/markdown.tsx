import type { ReactNode } from "react";

/** Inline **bold** only; everything else stays text (never raw HTML). */
function inline(text: string): ReactNode[] {
  return text
    .split(/(\*\*[^*]+\*\*)/g)
    .map((part, i) =>
      part.startsWith("**") && part.endsWith("**") ? <strong key={i}>{part.slice(2, -2)}</strong> : part,
    );
}

export type Block = { type: "h" | "p"; text: string } | { type: "ul"; items: string[] };

/** Parse the small markdown subset the AI prompt asks for: ### headings, bullet lists and paragraphs. */
export function parseMarkdown(source: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of source.split(/\r?\n/)) {
    const line = raw.trim();
    const last = blocks[blocks.length - 1];
    if (!line) continue;
    const heading = line.match(/^#{1,6}\s+(.*)$/);
    const bullet = line.match(/^(?:[-*•]|\d+[.)])\s+(.*)$/);
    if (heading) blocks.push({ type: "h", text: heading[1]!.replace(/\*\*/g, "") });
    else if (bullet && last?.type === "ul") last.items.push(bullet[1]!);
    else if (bullet) blocks.push({ type: "ul", items: [bullet[1]!] });
    else if (last?.type === "p") last.text += ` ${line}`;
    else blocks.push({ type: "p", text: line });
  }
  return blocks;
}

export function Markdown({ source }: { source: string }) {
  return (
    <div className="space-y-3 text-[15px] leading-relaxed text-ink">
      {parseMarkdown(source).map((block, i) => {
        if (block.type === "h")
          return (
            <h3 key={i} className="pt-2 font-display text-lg font-semibold text-ink first:pt-0">
              {block.text}
            </h3>
          );
        if (block.type === "ul")
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-brand">
              {block.items.map((item, j) => (
                <li key={j} className="text-pretty">
                  {inline(item)}
                </li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="text-pretty">
            {inline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
