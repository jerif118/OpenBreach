export type PdfFontKey = "F1" | "F2" | "F3";

export type MarkdownBlock =
  | { type: "heading1" | "heading2" | "heading3" | "strongline"; text: string }
  | { type: "paragraph" | "quote"; text: string }
  | { type: "bullet"; items: string[] }
  | { type: "ordered"; items: string[] };

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function stripInlineMarkdown(value: string) {
  return normalizeWhitespace(
    value
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/`(.+?)`/g, "$1")
      .replace(/\[(.+?)\]\(.+?\)/g, "$1"),
  );
}

function estimateTextWidth(
  text: string,
  fontSize: number,
  fontKey: PdfFontKey,
) {
  const weightFactor = fontKey === "F2" ? 0.58 : fontKey === "F3" ? 0.54 : 0.52;
  return text.length * fontSize * weightFactor;
}

export function wrapTextToWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontKey: PdfFontKey,
) {
  const normalized = stripInlineMarkdown(text);

  if (!normalized) {
    return [""];
  }

  const lines: string[] = [];
  let current = "";

  for (const word of normalized.split(" ")) {
    const next = current ? `${current} ${word}` : word;

    if (estimateTextWidth(next, fontSize, fontKey) <= maxWidth) {
      current = next;
      continue;
    }

    if (current) {
      lines.push(current);
    }

    current = word;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

export function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }
    blocks.push({ type: "paragraph", text: paragraphLines.join(" ") });
    paragraphLines = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
    } else if (trimmed.startsWith("# ")) {
      flushParagraph();
      blocks.push({ type: "heading1", text: trimmed.slice(2) });
    } else if (trimmed.startsWith("## ")) {
      flushParagraph();
      blocks.push({ type: "heading2", text: trimmed.slice(3) });
    } else if (trimmed.startsWith("### ")) {
      flushParagraph();
      blocks.push({ type: "heading3", text: trimmed.slice(4) });
    } else if (/^\*\*(.+)\*\*$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "strongline", text: trimmed.slice(2, -2) });
    } else if (trimmed.startsWith("> ")) {
      flushParagraph();
      const quoteLines = collectPrefixedLines(lines, index, "> ");
      index += quoteLines.length - 1;
      blocks.push({ type: "quote", text: quoteLines.join(" ") });
    } else if (trimmed.startsWith("- ")) {
      flushParagraph();
      const items = collectPrefixedLines(lines, index, "- ");
      index += items.length - 1;
      blocks.push({ type: "bullet", items });
    } else if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const items = collectOrderedLines(lines, index);
      index += items.length - 1;
      blocks.push({ type: "ordered", items });
    } else {
      paragraphLines.push(trimmed);
    }
  }

  flushParagraph();
  return blocks;
}

function collectPrefixedLines(lines: string[], start: number, prefix: string) {
  const values: string[] = [];
  for (let index = start; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!trimmed.startsWith(prefix)) {
      break;
    }
    values.push(trimmed.slice(prefix.length));
  }
  return values;
}

function collectOrderedLines(lines: string[], start: number) {
  const values: string[] = [];
  for (let index = start; index < lines.length; index += 1) {
    const trimmed = lines[index].trim();
    if (!/^\d+\.\s+/.test(trimmed)) {
      break;
    }
    values.push(trimmed.replace(/^\d+\.\s+/, ""));
  }
  return values;
}
