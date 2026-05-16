import { mkdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { renderReportMarkdown } from "./markdown-template.ts";
import {
  reportArtifactReferenceSchema,
  reportArtifactsSchema,
  reportPdfReferenceSchema,
  type RemediationReport,
  type RemediationReportVariants,
  type ReportArtifacts,
  type ReportPdfReference,
} from "../shared/contracts.ts";

export type RenderReportPdfInput = {
  municipalityName: string;
  report: RemediationReport;
  generatedAt: string;
  outputDirectory?: string;
};

export type RenderReportArtifactsInput = {
  municipalityName: string;
  reports: RemediationReportVariants;
  generatedAt: string;
  outputDirectory?: string;
};

export type RenderReportArtifactsResult = {
  pdf: ReportPdfReference;
  artifacts: ReportArtifacts;
};

type MarkdownBlock =
  | { type: "heading1" | "heading2" | "heading3" | "strongline"; text: string }
  | { type: "paragraph" | "quote"; text: string }
  | { type: "bullet"; items: string[] }
  | { type: "ordered"; items: string[] };

type RgbColor = [number, number, number];

type PdfTheme = {
  pageBackground: RgbColor;
  text: RgbColor;
  muted: RgbColor;
  accent: RgbColor;
  accentSoft: RgbColor;
  quoteBackground: RgbColor;
  quoteBorder: RgbColor;
  footerText: RgbColor;
  topBand: RgbColor;
};

type PdfPageState = {
  commands: string[];
  y: number;
  number: number;
};

const DEFAULT_OUTPUT_DIRECTORY = "data/reports";
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT_MARGIN = 48;
const RIGHT_MARGIN = 48;
const TOP_MARGIN = 74;
const BOTTOM_MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;

const themeByVariant: Record<RemediationReport["variant"], PdfTheme> = {
  technical: {
    pageBackground: [0.986, 0.992, 0.996],
    text: [0.11, 0.15, 0.2],
    muted: [0.34, 0.41, 0.48],
    accent: [0.08, 0.44, 0.67],
    accentSoft: [0.87, 0.94, 0.98],
    quoteBackground: [0.92, 0.96, 0.99],
    quoteBorder: [0.14, 0.53, 0.76],
    footerText: [0.28, 0.36, 0.44],
    topBand: [0.05, 0.15, 0.24],
  },
  friendly: {
    pageBackground: [0.995, 0.996, 0.99],
    text: [0.14, 0.18, 0.16],
    muted: [0.35, 0.42, 0.37],
    accent: [0.12, 0.55, 0.44],
    accentSoft: [0.89, 0.97, 0.94],
    quoteBackground: [0.93, 0.98, 0.96],
    quoteBorder: [0.17, 0.63, 0.49],
    footerText: [0.33, 0.4, 0.36],
    topBand: [0.08, 0.3, 0.25],
  },
};

function sanitizePdfFileStem(value: string) {
  const sanitized = value
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^[._-]+|[._-]+$/g, "");
  return sanitized || "municipality-report";
}

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function colorCommand([red, green, blue]: RgbColor) {
  return `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)}`;
}

function normalizeWhitespace(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripInlineMarkdown(value: string) {
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
  fontKey: "F1" | "F2" | "F3",
) {
  const weightFactor = fontKey === "F2" ? 0.58 : fontKey === "F3" ? 0.54 : 0.52;
  return text.length * fontSize * weightFactor;
}

function wrapTextToWidth(
  text: string,
  maxWidth: number,
  fontSize: number,
  fontKey: "F1" | "F2" | "F3",
) {
  const normalized = stripInlineMarkdown(text);

  if (!normalized) {
    return [""];
  }

  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
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

function pushText({
  commands,
  fontKey,
  fontSize,
  color,
  x,
  y,
  text,
}: {
  commands: string[];
  fontKey: "F1" | "F2" | "F3";
  fontSize: number;
  color: RgbColor;
  x: number;
  y: number;
  text: string;
}) {
  commands.push(
    `BT /${fontKey} ${fontSize} Tf ${colorCommand(color)} rg ${x.toFixed(2)} ${y.toFixed(2)} Td (${escapePdfText(
      text,
    )}) Tj ET`,
  );
}

function pushFilledRect({
  commands,
  color,
  x,
  y,
  width,
  height,
}: {
  commands: string[];
  color: RgbColor;
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  commands.push(
    `q ${colorCommand(color)} rg ${x} ${y} ${width} ${height} re f Q`,
  );
}

function pushStrokeRect({
  commands,
  color,
  x,
  y,
  width,
  height,
  lineWidth = 1,
}: {
  commands: string[];
  color: RgbColor;
  x: number;
  y: number;
  width: number;
  height: number;
  lineWidth?: number;
}) {
  commands.push(
    `q ${lineWidth} w ${colorCommand(color)} RG ${x} ${y} ${width} ${height} re S Q`,
  );
}

function createPageState(theme: PdfTheme, number: number): PdfPageState {
  const commands: string[] = [];

  pushFilledRect({
    commands,
    color: theme.pageBackground,
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  });
  pushFilledRect({
    commands,
    color: theme.topBand,
    x: 0,
    y: PAGE_HEIGHT - 32,
    width: PAGE_WIDTH,
    height: 32,
  });
  pushFilledRect({
    commands,
    color: theme.accentSoft,
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: 18,
  });
  pushText({
    commands,
    fontKey: "F2",
    fontSize: 9,
    color: theme.footerText,
    x: LEFT_MARGIN,
    y: 8,
    text: `Page ${number}`,
  });

  return {
    commands,
    y: PAGE_HEIGHT - TOP_MARGIN,
    number,
  };
}

function addPage(pages: PdfPageState[], theme: PdfTheme) {
  const page = createPageState(theme, pages.length + 1);
  pages.push(page);
  return page;
}

function parseMarkdown(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraphLines: string[] = [];

  function flushParagraph() {
    if (paragraphLines.length === 0) {
      return;
    }

    blocks.push({
      type: "paragraph",
      text: paragraphLines.join(" "),
    });
    paragraphLines = [];
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (trimmed.startsWith("# ")) {
      flushParagraph();
      blocks.push({ type: "heading1", text: trimmed.slice(2) });
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      blocks.push({ type: "heading2", text: trimmed.slice(3) });
      continue;
    }

    if (trimmed.startsWith("### ")) {
      flushParagraph();
      blocks.push({ type: "heading3", text: trimmed.slice(4) });
      continue;
    }

    if (/^\*\*(.+)\*\*$/.test(trimmed)) {
      flushParagraph();
      blocks.push({ type: "strongline", text: trimmed.slice(2, -2) });
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushParagraph();
      const quoteLines = [trimmed.slice(2)];

      while (
        index + 1 < lines.length &&
        lines[index + 1].trim().startsWith("> ")
      ) {
        index += 1;
        quoteLines.push(lines[index].trim().slice(2));
      }

      blocks.push({ type: "quote", text: quoteLines.join(" ") });
      continue;
    }

    if (trimmed.startsWith("- ")) {
      flushParagraph();
      const items = [trimmed.slice(2)];

      while (
        index + 1 < lines.length &&
        lines[index + 1].trim().startsWith("- ")
      ) {
        index += 1;
        items.push(lines[index].trim().slice(2));
      }

      blocks.push({ type: "bullet", items });
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      flushParagraph();
      const items = [trimmed.replace(/^\d+\.\s+/, "")];

      while (
        index + 1 < lines.length &&
        /^\d+\.\s+/.test(lines[index + 1].trim())
      ) {
        index += 1;
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
      }

      blocks.push({ type: "ordered", items });
      continue;
    }

    paragraphLines.push(trimmed);
  }

  flushParagraph();
  return blocks;
}

function ensureSpace({
  currentPage,
  pages,
  requiredHeight,
  theme,
}: {
  currentPage: PdfPageState;
  pages: PdfPageState[];
  requiredHeight: number;
  theme: PdfTheme;
}) {
  if (currentPage.y - requiredHeight >= BOTTOM_MARGIN) {
    return currentPage;
  }

  return addPage(pages, theme);
}

function renderHeading1(
  text: string,
  currentPage: PdfPageState,
  pages: PdfPageState[],
  theme: PdfTheme,
) {
  const fontSize = 24;
  const lineHeight = 30;
  const lines = wrapTextToWidth(text, CONTENT_WIDTH, fontSize, "F2");
  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: lines.length * lineHeight + 18,
    theme,
  });

  for (const line of lines) {
    pushText({
      commands: currentPage.commands,
      fontKey: "F2",
      fontSize,
      color: theme.text,
      x: LEFT_MARGIN,
      y: currentPage.y,
      text: line,
    });
    currentPage.y -= lineHeight;
  }

  pushFilledRect({
    commands: currentPage.commands,
    color: theme.accent,
    x: LEFT_MARGIN,
    y: currentPage.y - 3,
    width: 88,
    height: 4,
  });
  currentPage.y -= 18;
  return currentPage;
}

function renderHeading2(
  text: string,
  currentPage: PdfPageState,
  pages: PdfPageState[],
  theme: PdfTheme,
) {
  currentPage = ensureSpace({ currentPage, pages, requiredHeight: 34, theme });
  pushFilledRect({
    commands: currentPage.commands,
    color: theme.accent,
    x: LEFT_MARGIN,
    y: currentPage.y - 18,
    width: CONTENT_WIDTH,
    height: 22,
  });
  pushText({
    commands: currentPage.commands,
    fontKey: "F2",
    fontSize: 12,
    color: [1, 1, 1],
    x: LEFT_MARGIN + 12,
    y: currentPage.y - 4,
    text: stripInlineMarkdown(text),
  });
  currentPage.y -= 32;
  return currentPage;
}

function renderHeading3(
  text: string,
  currentPage: PdfPageState,
  pages: PdfPageState[],
  theme: PdfTheme,
) {
  const lines = wrapTextToWidth(text, CONTENT_WIDTH, 12, "F2");
  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: lines.length * 16 + 8,
    theme,
  });

  for (const line of lines) {
    pushText({
      commands: currentPage.commands,
      fontKey: "F2",
      fontSize: 12,
      color: theme.accent,
      x: LEFT_MARGIN,
      y: currentPage.y,
      text: line,
    });
    currentPage.y -= 16;
  }

  currentPage.y -= 4;
  return currentPage;
}

function renderStrongLine(
  text: string,
  currentPage: PdfPageState,
  pages: PdfPageState[],
  theme: PdfTheme,
) {
  const lines = wrapTextToWidth(text, CONTENT_WIDTH, 10.5, "F2");
  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: lines.length * 14 + 4,
    theme,
  });

  for (const line of lines) {
    pushText({
      commands: currentPage.commands,
      fontKey: "F2",
      fontSize: 10.5,
      color: theme.text,
      x: LEFT_MARGIN,
      y: currentPage.y,
      text: line,
    });
    currentPage.y -= 14;
  }

  currentPage.y -= 2;
  return currentPage;
}

function renderParagraph(
  text: string,
  currentPage: PdfPageState,
  pages: PdfPageState[],
  theme: PdfTheme,
) {
  const lines = wrapTextToWidth(text, CONTENT_WIDTH, 10.5, "F1");
  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: lines.length * 14 + 8,
    theme,
  });

  for (const line of lines) {
    pushText({
      commands: currentPage.commands,
      fontKey: "F1",
      fontSize: 10.5,
      color: theme.text,
      x: LEFT_MARGIN,
      y: currentPage.y,
      text: line,
    });
    currentPage.y -= 14;
  }

  currentPage.y -= 8;
  return currentPage;
}

function renderQuote(
  text: string,
  currentPage: PdfPageState,
  pages: PdfPageState[],
  theme: PdfTheme,
) {
  const lines = wrapTextToWidth(text, CONTENT_WIDTH - 34, 10, "F3");
  const boxHeight = lines.length * 14 + 18;
  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: boxHeight + 8,
    theme,
  });

  pushFilledRect({
    commands: currentPage.commands,
    color: theme.quoteBackground,
    x: LEFT_MARGIN,
    y: currentPage.y - boxHeight + 4,
    width: CONTENT_WIDTH,
    height: boxHeight,
  });
  pushFilledRect({
    commands: currentPage.commands,
    color: theme.quoteBorder,
    x: LEFT_MARGIN,
    y: currentPage.y - boxHeight + 4,
    width: 6,
    height: boxHeight,
  });
  pushStrokeRect({
    commands: currentPage.commands,
    color: theme.quoteBorder,
    x: LEFT_MARGIN,
    y: currentPage.y - boxHeight + 4,
    width: CONTENT_WIDTH,
    height: boxHeight,
  });

  let y = currentPage.y - 12;

  for (const line of lines) {
    pushText({
      commands: currentPage.commands,
      fontKey: "F3",
      fontSize: 10,
      color: theme.muted,
      x: LEFT_MARGIN + 18,
      y,
      text: line,
    });
    y -= 14;
  }

  currentPage.y -= boxHeight + 10;
  return currentPage;
}

function renderList({
  items,
  ordered,
  currentPage,
  pages,
  theme,
}: {
  items: string[];
  ordered: boolean;
  currentPage: PdfPageState;
  pages: PdfPageState[];
  theme: PdfTheme;
}) {
  for (const [index, item] of items.entries()) {
    const marker = ordered ? `${index + 1}.` : "-";
    const textLines = wrapTextToWidth(item, CONTENT_WIDTH - 26, 10, "F1");
    const requiredHeight = textLines.length * 14 + 4;
    currentPage = ensureSpace({ currentPage, pages, requiredHeight, theme });

    pushText({
      commands: currentPage.commands,
      fontKey: "F2",
      fontSize: 10,
      color: theme.accent,
      x: LEFT_MARGIN,
      y: currentPage.y,
      text: marker,
    });

    for (const [lineIndex, line] of textLines.entries()) {
      pushText({
        commands: currentPage.commands,
        fontKey: "F1",
        fontSize: 10,
        color: theme.text,
        x: LEFT_MARGIN + 18,
        y: currentPage.y - lineIndex * 14,
        text: line,
      });
    }

    currentPage.y -= requiredHeight;
  }

  currentPage.y -= 4;
  return currentPage;
}

function buildStyledPdfDocument(
  markdown: string,
  variant: RemediationReport["variant"],
) {
  const theme = themeByVariant[variant];
  const blocks = parseMarkdown(markdown);
  const pages: PdfPageState[] = [];
  let currentPage = addPage(pages, theme);

  for (const block of blocks) {
    if (block.type === "heading1") {
      currentPage = renderHeading1(block.text, currentPage, pages, theme);
      continue;
    }

    if (block.type === "heading2") {
      currentPage = renderHeading2(block.text, currentPage, pages, theme);
      continue;
    }

    if (block.type === "heading3") {
      currentPage = renderHeading3(block.text, currentPage, pages, theme);
      continue;
    }

    if (block.type === "strongline") {
      currentPage = renderStrongLine(block.text, currentPage, pages, theme);
      continue;
    }

    if (block.type === "quote") {
      currentPage = renderQuote(block.text, currentPage, pages, theme);
      continue;
    }

    if (block.type === "bullet") {
      currentPage = renderList({
        items: block.items.map(stripInlineMarkdown),
        ordered: false,
        currentPage,
        pages,
        theme,
      });
      continue;
    }

    if (block.type === "ordered") {
      currentPage = renderList({
        items: block.items.map(stripInlineMarkdown),
        ordered: true,
        currentPage,
        pages,
        theme,
      });
      continue;
    }

    currentPage = renderParagraph(
      stripInlineMarkdown(block.text),
      currentPage,
      pages,
      theme,
    );
  }

  const pageObjectStart = 5;
  const pageCount = pages.length;
  const pageObjectIds = pages.map((_, index) => pageObjectStart + index);
  const contentObjectIds = pages.map(
    (_, index) => pageObjectStart + pageCount + index,
  );
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`,
  );
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");
  objects.push(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
  );

  for (const [index] of pages.entries()) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>`,
    );
  }

  for (const page of pages) {
    const stream = page.commands.join("\n");
    objects.push(
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    );
  }

  let body = "%PDF-1.4\n";
  const offsets = [0];

  for (const [index, object] of objects.entries()) {
    offsets.push(Buffer.byteLength(body, "latin1"));
    body += `${index + 1} 0 obj\n${object}\nendobj\n`;
  }

  const xrefOffset = Buffer.byteLength(body, "latin1");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";

  for (const offset of offsets.slice(1)) {
    body += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return body;
}

export async function renderReportPdf({
  municipalityName,
  report,
  generatedAt,
  outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
}: RenderReportPdfInput): Promise<ReportPdfReference> {
  const fileName = `${sanitizePdfFileStem(report.municipalityId)}-${report.variant}.pdf`;
  const storagePath = join(outputDirectory, fileName).replace(/\\/g, "/");
  const markdown = await renderReportMarkdown({ municipalityName, report });
  const pdf = buildStyledPdfDocument(markdown, report.variant);

  await mkdir(dirname(storagePath), { recursive: true });
  await writeFile(storagePath, pdf, "latin1");

  const { size } = await stat(storagePath);

  return reportPdfReferenceSchema.parse({
    storagePath,
    fileName,
    contentType: "application/pdf",
    generatedAt,
    sizeBytes: size,
  });
}

export async function renderReportArtifacts({
  municipalityName,
  reports,
  generatedAt,
  outputDirectory = DEFAULT_OUTPUT_DIRECTORY,
}: RenderReportArtifactsInput): Promise<RenderReportArtifactsResult> {
  const technicalPdf = await renderReportPdf({
    municipalityName,
    report: reports.technical,
    generatedAt,
    outputDirectory,
  });
  const friendlyPdf = await renderReportPdf({
    municipalityName,
    report: reports.friendly,
    generatedAt,
    outputDirectory,
  });

  const artifacts = reportArtifactsSchema.parse({
    technical: reportArtifactReferenceSchema.parse({
      variant: "technical",
      label: "Technical report PDF",
      pdf: technicalPdf,
    }),
    friendly: reportArtifactReferenceSchema.parse({
      variant: "friendly",
      label: "Friendly report PDF",
      pdf: friendlyPdf,
    }),
  });

  return {
    pdf: technicalPdf,
    artifacts,
  };
}
