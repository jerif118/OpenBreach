import {
  pushFilledRect,
  pushStrokeRect,
  pushText,
  serializePdfDocument,
  type PdfPage,
  type RgbColor,
} from "./pdf-document.ts";
import {
  parseMarkdown,
  stripInlineMarkdown,
  wrapTextToWidth,
  type MarkdownBlock,
  type PdfFontKey,
} from "./pdf-markdown-parser.ts";
import type { RemediationReport } from "../shared/contracts.ts";

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
type TextBlockSettings = {
  fontKey: PdfFontKey;
  fontSize: number;
  color: RgbColor;
  lineHeight: number;
  after: number;
  extra: number;
};
type PdfPageState = PdfPage & { y: number; number: number };
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT_MARGIN = 48;
const TOP_MARGIN = 74;
const BOTTOM_MARGIN = 44;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - 48;

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

export function buildStyledPdfDocument(
  markdown: string,
  variant: RemediationReport["variant"],
) {
  const theme = themeByVariant[variant];
  const pages: PdfPageState[] = [];
  let currentPage = addPage(pages, theme);

  for (const block of parseMarkdown(markdown)) {
    currentPage = renderBlock(block, currentPage, pages, theme);
  }

  return serializePdfDocument({
    pages,
    pageWidth: PAGE_WIDTH,
    pageHeight: PAGE_HEIGHT,
  });
}

function renderBlock(
  block: MarkdownBlock,
  currentPage: PdfPageState,
  pages: PdfPageState[],
  theme: PdfTheme,
) {
  if (block.type === "heading1") {
    return renderHeading1(block.text, currentPage, pages, theme);
  }
  if (block.type === "heading2") {
    return renderHeading2(block.text, currentPage, pages, theme);
  }
  if (block.type === "heading3") {
    return renderTextBlock(block.text, currentPage, pages, theme, "heading3");
  }
  if (block.type === "strongline") {
    return renderTextBlock(block.text, currentPage, pages, theme, "strongline");
  }
  if (block.type === "quote") {
    return renderQuote(block.text, currentPage, pages, theme);
  }
  if (block.type === "bullet" || block.type === "ordered") {
    return renderList({
      items: block.items.map(stripInlineMarkdown),
      ordered: block.type === "ordered",
      currentPage,
      pages,
      theme,
    });
  }
  return renderTextBlock(
    stripInlineMarkdown(block.text),
    currentPage,
    pages,
    theme,
    "paragraph",
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
  return { commands, y: PAGE_HEIGHT - TOP_MARGIN, number };
}

function addPage(pages: PdfPageState[], theme: PdfTheme) {
  const page = createPageState(theme, pages.length + 1);
  pages.push(page);
  return page;
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
  return currentPage.y - requiredHeight >= BOTTOM_MARGIN
    ? currentPage
    : addPage(pages, theme);
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

function renderTextBlock(
  text: string,
  currentPage: PdfPageState,
  pages: PdfPageState[],
  theme: PdfTheme,
  kind: "heading3" | "strongline" | "paragraph",
) {
  const settings: Record<typeof kind, TextBlockSettings> = {
    heading3: {
      fontKey: "F2",
      fontSize: 12,
      color: theme.accent,
      lineHeight: 16,
      after: 4,
      extra: 8,
    },
    strongline: {
      fontKey: "F2",
      fontSize: 10.5,
      color: theme.text,
      lineHeight: 14,
      after: 2,
      extra: 4,
    },
    paragraph: {
      fontKey: "F1",
      fontSize: 10.5,
      color: theme.text,
      lineHeight: 14,
      after: 8,
      extra: 8,
    },
  };
  const setting = settings[kind];
  const lines = wrapTextToWidth(
    text,
    CONTENT_WIDTH,
    setting.fontSize,
    setting.fontKey,
  );
  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: lines.length * setting.lineHeight + setting.extra,
    theme,
  });

  for (const line of lines) {
    pushText({
      commands: currentPage.commands,
      fontKey: setting.fontKey,
      fontSize: setting.fontSize,
      color: setting.color,
      x: LEFT_MARGIN,
      y: currentPage.y,
      text: line,
    });
    currentPage.y -= setting.lineHeight;
  }

  currentPage.y -= setting.after;
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
  const boxY = currentPage.y - boxHeight + 4;
  pushFilledRect({
    commands: currentPage.commands,
    color: theme.quoteBackground,
    x: LEFT_MARGIN,
    y: boxY,
    width: CONTENT_WIDTH,
    height: boxHeight,
  });
  pushFilledRect({
    commands: currentPage.commands,
    color: theme.quoteBorder,
    x: LEFT_MARGIN,
    y: boxY,
    width: 6,
    height: boxHeight,
  });
  pushStrokeRect({
    commands: currentPage.commands,
    color: theme.quoteBorder,
    x: LEFT_MARGIN,
    y: boxY,
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
      text: ordered ? `${index + 1}.` : "-",
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
