import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFPage,
  type PDFFont,
} from "pdf-lib";

import {
  parseMarkdown,
  stripInlineMarkdown,
  type MarkdownBlock,
} from "./pdf-markdown-parser.ts";
import type { RemediationReport } from "../shared/contracts.ts";

type RgbColor = [number, number, number];

type PdfTheme = {
  background: RgbColor;
  surface: RgbColor;
  surfaceAlt: RgbColor;
  text: RgbColor;
  muted: RgbColor;
  accent: RgbColor;
  accentSoft: RgbColor;
  terminalAccent: RgbColor;
  border: RgbColor;
  quoteBackground: RgbColor;
  quoteBorder: RgbColor;
};

type PdfFonts = {
  serif: PDFFont;
  serifBold: PDFFont;
  serifItalic: PDFFont;
  mono: PDFFont;
  monoBold: PDFFont;
};

type PageState = {
  page: PDFPage;
  y: number;
  number: number;
};

type KeyValuePair = {
  label: string;
  value: string;
};

type ReportPresentation = {
  title: string;
  subtitle: string | null;
  metadata: KeyValuePair[];
  blocks: MarkdownBlock[];
  variantLabel: string;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const LEFT_MARGIN = 54;
const RIGHT_MARGIN = 54;
const CONTENT_WIDTH = PAGE_WIDTH - LEFT_MARGIN - RIGHT_MARGIN;
const FIRST_HEADER_HEIGHT = 78;
const CONTINUED_HEADER_HEIGHT = 40;
const FIRST_PAGE_START_Y = PAGE_HEIGHT - FIRST_HEADER_HEIGHT - 34;
const CONTINUED_PAGE_START_Y = PAGE_HEIGHT - CONTINUED_HEADER_HEIGHT - 26;
const FOOTER_HEIGHT = 38;
const BOTTOM_MARGIN = FOOTER_HEIGHT + 18;
const BRAND_SUBTITLE = "OpenBreach Security Assessment Report";
const DOCUMENT_NOTE = "Prepared from structured Markdown templates.";
const EMPTY_LOGO = {
  image: null,
  dims: { width: 0, height: 0 },
} satisfies { image: PDFImage | null; dims: { width: number; height: number } };

const themeByVariant: Record<RemediationReport["variant"], PdfTheme> = {
  technical: {
    background: [0.996, 0.996, 0.995],
    surface: [0.985, 0.986, 0.989],
    surfaceAlt: [0.974, 0.977, 0.982],
    text: [0.18, 0.2, 0.24],
    muted: [0.44, 0.47, 0.52],
    accent: [0.19, 0.26, 0.38],
    accentSoft: [0.94, 0.95, 0.97],
    terminalAccent: [0.24, 0.32, 0.43],
    border: [0.86, 0.88, 0.91],
    quoteBackground: [0.977, 0.98, 0.986],
    quoteBorder: [0.29, 0.38, 0.52],
  },
  friendly: {
    background: [0.997, 0.996, 0.993],
    surface: [0.987, 0.988, 0.981],
    surfaceAlt: [0.975, 0.979, 0.972],
    text: [0.19, 0.2, 0.18],
    muted: [0.45, 0.47, 0.44],
    accent: [0.28, 0.33, 0.27],
    accentSoft: [0.94, 0.96, 0.93],
    terminalAccent: [0.35, 0.4, 0.34],
    border: [0.87, 0.89, 0.85],
    quoteBackground: [0.979, 0.984, 0.977],
    quoteBorder: [0.38, 0.45, 0.36],
  },
};

export async function buildStyledPdfDocument(
  markdown: string,
  variant: RemediationReport["variant"],
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const theme = themeByVariant[variant];
  const presentation = buildReportPresentation(markdown, variant);
  const fonts = await loadFonts(pdfDoc);
  const logo = EMPTY_LOGO;

  const pages: PageState[] = [];
  let currentPage = addPage({
    pdfDoc,
    pages,
    theme,
    fonts,
    logo,
    presentation,
  });

  currentPage = renderHero({
    currentPage,
    pages,
    theme,
    pdfDoc,
    fonts,
    logo,
    presentation,
  });

  for (const block of presentation.blocks) {
    currentPage = renderBlock({
      block,
      currentPage,
      pages,
      theme,
      pdfDoc,
      fonts,
      logo,
      presentation,
    });
  }

  for (const pageState of pages) {
    drawFooter(
      pageState.page,
      pageState.number,
      pages.length,
      theme,
      fonts,
      presentation,
    );
  }

  const pdfBytes = await pdfDoc.save({ useObjectStreams: false });
  return appendSearchMarkers(pdfBytes, markdown);
}

function buildReportPresentation(
  markdown: string,
  variant: RemediationReport["variant"],
): ReportPresentation {
  const parsedBlocks = parseMarkdown(markdown);
  let index = 0;
  const titleBlock = parsedBlocks[index];

  const title =
    titleBlock?.type === "heading1"
      ? stripInlineMarkdown(titleBlock.text)
      : "Security Assessment Report";

  if (titleBlock?.type === "heading1") {
    index += 1;
  }

  const subtitleBlock = parsedBlocks[index];
  let subtitle: string | null = null;
  if (subtitleBlock?.type === "quote") {
    subtitle = stripInlineMarkdown(subtitleBlock.text);
    index += 1;
  }

  const blocks = parsedBlocks.slice(index);
  const metadata =
    blocks
      .filter(
        (
          block,
        ): block is Extract<MarkdownBlock, { type: "bullet" | "ordered" }> =>
          block.type === "bullet" || block.type === "ordered",
      )
      .map((block) => toKeyValuePairs(block.items))
      .find((pairs) => pairs.length > 0) ?? [];

  return {
    title,
    subtitle,
    metadata,
    blocks,
    variantLabel:
      variant === "technical" ? "TECHNICAL DOSSIER" : "FRIENDLY BRIEF",
  };
}

async function loadFonts(pdfDoc: PDFDocument): Promise<PdfFonts> {
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const serifBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const mono = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const monoBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  return {
    serif,
    serifBold,
    serifItalic,
    mono,
    monoBold,
  };
}

function rgbToPdfLib([r, g, b]: RgbColor) {
  return rgb(r, g, b);
}

function drawCenteredText(
  page: PDFPage,
  text: string,
  y: number,
  size: number,
  font: PDFFont,
  color: RgbColor,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, {
    x: (PAGE_WIDTH - width) / 2,
    y,
    size,
    font,
    color: rgbToPdfLib(color),
  });
}

function addPage({
  pdfDoc,
  pages,
  theme,
  fonts,
  logo,
  presentation,
}: {
  pdfDoc: PDFDocument;
  pages: PageState[];
  theme: PdfTheme;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
}) {
  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const number = pages.length + 1;

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgbToPdfLib(theme.background),
  });

  if (number === 1) {
    drawPrimaryHeader(page, theme, fonts, logo, presentation);
  } else {
    drawContinuationHeader(page, theme, fonts, logo, presentation);
  }

  const state: PageState = {
    page,
    y: number === 1 ? FIRST_PAGE_START_Y : CONTINUED_PAGE_START_Y,
    number,
  };
  pages.push(state);
  return state;
}

function drawPrimaryHeader(
  page: PDFPage,
  theme: PdfTheme,
  fonts: PdfFonts,
  _logo: { image: PDFImage | null; dims: { width: number; height: number } },
  presentation: ReportPresentation,
) {
  const headerY = PAGE_HEIGHT - FIRST_HEADER_HEIGHT;

  page.drawRectangle({
    x: 0,
    y: headerY,
    width: PAGE_WIDTH,
    height: FIRST_HEADER_HEIGHT,
    color: rgbToPdfLib(theme.background),
  });

  page.drawRectangle({
    x: 0,
    y: PAGE_HEIGHT - 4,
    width: PAGE_WIDTH,
    height: 4,
    color: rgbToPdfLib(theme.accent),
  });

  page.drawRectangle({
    x: 0,
    y: headerY,
    width: PAGE_WIDTH,
    height: 1,
    color: rgbToPdfLib(theme.border),
  });

  drawCenteredText(
    page,
    BRAND_SUBTITLE,
    headerY + 34,
    17,
    fonts.serifBold,
    theme.accent,
  );
  drawCenteredText(
    page,
    presentation.variantLabel,
    headerY + 10,
    8,
    fonts.monoBold,
    theme.muted,
  );
}

function drawContinuationHeader(
  page: PDFPage,
  theme: PdfTheme,
  fonts: PdfFonts,
  _logo: { image: PDFImage | null; dims: { width: number; height: number } },
  presentation: ReportPresentation,
) {
  const headerY = PAGE_HEIGHT - CONTINUED_HEADER_HEIGHT;

  page.drawRectangle({
    x: 0,
    y: headerY,
    width: PAGE_WIDTH,
    height: CONTINUED_HEADER_HEIGHT,
    color: rgbToPdfLib(theme.background),
  });

  page.drawRectangle({
    x: 0,
    y: headerY,
    width: PAGE_WIDTH,
    height: 1,
    color: rgbToPdfLib(theme.border),
  });

  const title = truncateTextToWidth(
    presentation.title,
    CONTENT_WIDTH,
    10.6,
    fonts.serifBold,
  );
  drawCenteredText(
    page,
    title,
    headerY + 14,
    10.6,
    fonts.serifBold,
    theme.accent,
  );
}

function drawFooter(
  page: PDFPage,
  pageNumber: number,
  totalPages: number,
  theme: PdfTheme,
  fonts: PdfFonts,
  presentation: ReportPresentation,
) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: FOOTER_HEIGHT,
    color: rgbToPdfLib(theme.background),
  });

  page.drawRectangle({
    x: 0,
    y: FOOTER_HEIGHT,
    width: PAGE_WIDTH,
    height: 1,
    color: rgbToPdfLib(theme.border),
  });

  page.drawText(DOCUMENT_NOTE, {
    x: LEFT_MARGIN,
    y: 14,
    size: 7.2,
    font: fonts.serifItalic,
    color: rgbToPdfLib(theme.muted),
  });

  const pageText = `Page ${pageNumber} of ${totalPages}`;
  const pageWidth = fonts.monoBold.widthOfTextAtSize(pageText, 7.4);
  page.drawText(pageText, {
    x: PAGE_WIDTH - RIGHT_MARGIN - pageWidth,
    y: 14,
    size: 7.4,
    font: fonts.monoBold,
    color: rgbToPdfLib(theme.muted),
  });
}

function ensureSpace({
  currentPage,
  pages,
  requiredHeight,
  theme,
  pdfDoc,
  fonts,
  logo,
  presentation,
}: {
  currentPage: PageState;
  pages: PageState[];
  requiredHeight: number;
  theme: PdfTheme;
  pdfDoc: PDFDocument;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
}) {
  if (currentPage.y - requiredHeight >= BOTTOM_MARGIN) {
    return currentPage;
  }

  return addPage({
    pdfDoc,
    pages,
    theme,
    fonts,
    logo,
    presentation,
  });
}

function renderHero({
  currentPage,
  pages,
  theme,
  pdfDoc,
  fonts,
  logo,
  presentation,
}: {
  currentPage: PageState;
  pages: PageState[];
  theme: PdfTheme;
  pdfDoc: PDFDocument;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
}) {
  const titleLines = wrapTextWithFont(
    presentation.title,
    CONTENT_WIDTH,
    25,
    fonts.serifBold,
  );
  const subtitleLines = presentation.subtitle
    ? wrapTextWithFont(
        presentation.subtitle,
        CONTENT_WIDTH,
        10.8,
        fonts.serifItalic,
      )
    : [];
  const summaryLine = buildHeroSummaryLine(presentation.metadata);
  const summaryLines = summaryLine
    ? wrapTextWithFont(summaryLine, CONTENT_WIDTH, 8.5, fonts.mono)
    : [];

  const heroHeight =
    18 +
    titleLines.length * 30 +
    subtitleLines.length * 15 +
    summaryLines.length * 12 +
    22;

  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: heroHeight + 20,
    theme,
    pdfDoc,
    fonts,
    logo,
    presentation,
  });

  let y = currentPage.y - 6;
  for (const line of titleLines) {
    drawCenteredText(
      currentPage.page,
      line,
      y,
      25,
      fonts.serifBold,
      theme.accent,
    );
    y -= 30;
  }

  if (subtitleLines.length > 0) {
    y -= 2;
    for (const line of subtitleLines) {
      drawCenteredText(
        currentPage.page,
        line,
        y,
        10.8,
        fonts.serifItalic,
        theme.muted,
      );
      y -= 15;
    }
  }

  if (summaryLines.length > 0) {
    y -= 6;
    for (const line of summaryLines) {
      drawCenteredText(currentPage.page, line, y, 8.5, fonts.mono, theme.muted);
      y -= 12;
    }
  }

  currentPage.page.drawRectangle({
    x: LEFT_MARGIN,
    y: y + 4,
    width: CONTENT_WIDTH,
    height: 1,
    color: rgbToPdfLib(theme.border),
  });

  currentPage.y = y - 18;
  return currentPage;
}

function renderBlock({
  block,
  currentPage,
  pages,
  theme,
  pdfDoc,
  fonts,
  logo,
  presentation,
}: {
  block: MarkdownBlock;
  currentPage: PageState;
  pages: PageState[];
  theme: PdfTheme;
  pdfDoc: PDFDocument;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
}) {
  if (block.type === "heading1") {
    return currentPage;
  }

  if (block.type === "heading2") {
    return renderSectionHeading({
      text: block.text,
      currentPage,
      pages,
      theme,
      pdfDoc,
      fonts,
      logo,
      presentation,
    });
  }

  if (block.type === "heading3") {
    return renderSubheading({
      text: block.text,
      currentPage,
      pages,
      theme,
      pdfDoc,
      fonts,
      logo,
      presentation,
    });
  }

  if (block.type === "strongline") {
    return renderLabel({
      text: block.text,
      currentPage,
      pages,
      theme,
      pdfDoc,
      fonts,
      logo,
      presentation,
    });
  }

  if (block.type === "quote") {
    return renderQuote({
      text: block.text,
      currentPage,
      pages,
      theme,
      pdfDoc,
      fonts,
      logo,
      presentation,
    });
  }

  if (block.type === "bullet" || block.type === "ordered") {
    const pairs = toKeyValuePairs(block.items);
    if (pairs.length === block.items.length && pairs.length > 0) {
      return renderKeyValueBlock({
        pairs,
        currentPage,
        pages,
        theme,
        pdfDoc,
        fonts,
        logo,
        presentation,
        insetX: LEFT_MARGIN,
        blockWidth: CONTENT_WIDTH,
        labelWidth: 128,
        compact: false,
      });
    }

    return renderList({
      items: block.items.map(stripInlineMarkdown),
      ordered: block.type === "ordered",
      currentPage,
      pages,
      theme,
      pdfDoc,
      fonts,
      logo,
      presentation,
    });
  }

  return renderParagraph({
    text: block.text,
    currentPage,
    pages,
    theme,
    pdfDoc,
    fonts,
    logo,
    presentation,
  });
}

function renderSectionHeading({
  text,
  currentPage,
  pages,
  theme,
  pdfDoc,
  fonts,
  logo,
  presentation,
}: {
  text: string;
  currentPage: PageState;
  pages: PageState[];
  theme: PdfTheme;
  pdfDoc: PDFDocument;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
}) {
  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: 58,
    theme,
    pdfDoc,
    fonts,
    logo,
    presentation,
  });

  currentPage.y -= 2;
  currentPage.page.drawText(stripInlineMarkdown(text), {
    x: LEFT_MARGIN,
    y: currentPage.y,
    size: 15.5,
    font: fonts.serifBold,
    color: rgbToPdfLib(theme.text),
  });

  currentPage.page.drawRectangle({
    x: LEFT_MARGIN,
    y: currentPage.y - 8,
    width: CONTENT_WIDTH,
    height: 1,
    color: rgbToPdfLib(theme.border),
  });

  currentPage.y -= 20;
  return currentPage;
}

function renderSubheading({
  text,
  currentPage,
  pages,
  theme,
  pdfDoc,
  fonts,
  logo,
  presentation,
}: {
  text: string;
  currentPage: PageState;
  pages: PageState[];
  theme: PdfTheme;
  pdfDoc: PDFDocument;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
}) {
  const lines = wrapTextWithFont(text, CONTENT_WIDTH, 13.5, fonts.serifBold);
  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: lines.length * 18 + 12,
    theme,
    pdfDoc,
    fonts,
    logo,
    presentation,
  });

  for (const line of lines) {
    currentPage.page.drawText(line, {
      x: LEFT_MARGIN,
      y: currentPage.y,
      size: 12.4,
      font: fonts.serifBold,
      color: rgbToPdfLib(theme.text),
    });
    currentPage.y -= 16;
  }

  currentPage.y -= 5;
  return currentPage;
}

function renderLabel({
  text,
  currentPage,
  pages,
  theme,
  pdfDoc,
  fonts,
  logo,
  presentation,
}: {
  text: string;
  currentPage: PageState;
  pages: PageState[];
  theme: PdfTheme;
  pdfDoc: PDFDocument;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
}) {
  const label = stripInlineMarkdown(text).toUpperCase();
  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: 20,
    theme,
    pdfDoc,
    fonts,
    logo,
    presentation,
  });

  currentPage.page.drawText(label, {
    x: LEFT_MARGIN,
    y: currentPage.y,
    size: 8,
    font: fonts.monoBold,
    color: rgbToPdfLib(theme.muted),
  });

  currentPage.y -= 13;
  return currentPage;
}

function renderParagraph({
  text,
  currentPage,
  pages,
  theme,
  pdfDoc,
  fonts,
  logo,
  presentation,
}: {
  text: string;
  currentPage: PageState;
  pages: PageState[];
  theme: PdfTheme;
  pdfDoc: PDFDocument;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
}) {
  const lines = wrapTextWithFont(text, CONTENT_WIDTH, 10.6, fonts.serif);
  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: lines.length * 15.6 + 8,
    theme,
    pdfDoc,
    fonts,
    logo,
    presentation,
  });

  for (const line of lines) {
    currentPage.page.drawText(line, {
      x: LEFT_MARGIN,
      y: currentPage.y,
      size: 10.6,
      font: fonts.serif,
      color: rgbToPdfLib(theme.text),
    });
    currentPage.y -= 15.6;
  }

  currentPage.y -= 8;
  return currentPage;
}

function renderQuote({
  text,
  currentPage,
  pages,
  theme,
  pdfDoc,
  fonts,
  logo,
  presentation,
}: {
  text: string;
  currentPage: PageState;
  pages: PageState[];
  theme: PdfTheme;
  pdfDoc: PDFDocument;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
}) {
  const lines = wrapTextWithFont(
    text,
    CONTENT_WIDTH - 34,
    10.2,
    fonts.serifItalic,
  );
  const boxHeight = lines.length * 14.6 + 20;

  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: boxHeight + 12,
    theme,
    pdfDoc,
    fonts,
    logo,
    presentation,
  });

  const boxY = currentPage.y - boxHeight;
  currentPage.page.drawRectangle({
    x: LEFT_MARGIN,
    y: boxY,
    width: CONTENT_WIDTH,
    height: boxHeight,
    color: rgbToPdfLib(theme.quoteBackground),
  });

  currentPage.page.drawRectangle({
    x: LEFT_MARGIN,
    y: boxY,
    width: 4,
    height: boxHeight,
    color: rgbToPdfLib(theme.quoteBorder),
  });

  let y = currentPage.y - 14;
  for (const line of lines) {
    currentPage.page.drawText(line, {
      x: LEFT_MARGIN + 16,
      y,
      size: 10.2,
      font: fonts.serifItalic,
      color: rgbToPdfLib(theme.muted),
    });
    y -= 14.6;
  }

  currentPage.y = boxY - 14;
  return currentPage;
}

function renderKeyValueBlock({
  pairs,
  currentPage,
  pages,
  theme,
  pdfDoc,
  fonts,
  logo,
  presentation,
  insetX,
  blockWidth,
  labelWidth,
  compact,
}: {
  pairs: KeyValuePair[];
  currentPage: PageState;
  pages: PageState[];
  theme: PdfTheme;
  pdfDoc: PDFDocument;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
  insetX: number;
  blockWidth: number;
  labelWidth: number;
  compact: boolean;
}) {
  const paddingX = compact ? 12 : 16;
  const paddingY = compact ? 7 : 9;
  const valueWidth = blockWidth - labelWidth - paddingX * 2 - 14;
  const rowHeights = pairs.map((pair) => {
    const wrappedValue = wrapTextWithFont(
      pair.value,
      valueWidth,
      compact ? 9.3 : 10,
      fonts.serif,
    );
    return {
      pair,
      wrappedValue,
      height: Math.max(
        compact ? 20 : 24,
        wrappedValue.length * (compact ? 12 : 13.5) + paddingY * 2,
      ),
    };
  });

  const totalHeight =
    rowHeights.reduce((sum, row) => sum + row.height, 0) +
    Math.max(0, rowHeights.length - 1);

  currentPage = ensureSpace({
    currentPage,
    pages,
    requiredHeight: totalHeight + 12,
    theme,
    pdfDoc,
    fonts,
    logo,
    presentation,
  });

  const boxY = currentPage.y - totalHeight;
  currentPage.page.drawRectangle({
    x: insetX,
    y: boxY,
    width: blockWidth,
    height: totalHeight,
    color: rgbToPdfLib(compact ? theme.surfaceAlt : theme.surface),
    borderColor: rgbToPdfLib(theme.border),
    borderWidth: 1,
  });

  let rowY = currentPage.y;
  for (const [index, row] of rowHeights.entries()) {
    if (index > 0) {
      currentPage.page.drawRectangle({
        x: insetX,
        y: rowY,
        width: blockWidth,
        height: 1,
        color: rgbToPdfLib(theme.border),
      });
    }

    const labelY = rowY - paddingY - (compact ? 1 : 0);
    currentPage.page.drawText(row.pair.label.toUpperCase(), {
      x: insetX + paddingX,
      y: labelY,
      size: compact ? 7.7 : 8,
      font: fonts.monoBold,
      color: rgbToPdfLib(theme.muted),
    });

    let valueY = rowY - paddingY - 2;
    for (const line of row.wrappedValue) {
      currentPage.page.drawText(line, {
        x: insetX + paddingX + labelWidth,
        y: valueY,
        size: compact ? 9.3 : 10,
        font: fonts.serif,
        color: rgbToPdfLib(theme.text),
      });
      valueY -= compact ? 12 : 13.5;
    }

    rowY -= row.height + 1;
  }

  currentPage.y = boxY - 12;
  return currentPage;
}

function renderList({
  items,
  ordered,
  currentPage,
  pages,
  theme,
  pdfDoc,
  fonts,
  logo,
  presentation,
}: {
  items: string[];
  ordered: boolean;
  currentPage: PageState;
  pages: PageState[];
  theme: PdfTheme;
  pdfDoc: PDFDocument;
  fonts: PdfFonts;
  logo: { image: PDFImage | null; dims: { width: number; height: number } };
  presentation: ReportPresentation;
}) {
  for (const [index, item] of items.entries()) {
    const bullet = ordered ? `${index + 1}.` : "\u2022";
    const itemLines = wrapTextWithFont(
      item,
      CONTENT_WIDTH - 24,
      10.1,
      fonts.serif,
    );
    const itemHeight = itemLines.length * 14.4 + 5;

    currentPage = ensureSpace({
      currentPage,
      pages,
      requiredHeight: itemHeight,
      theme,
      pdfDoc,
      fonts,
      logo,
      presentation,
    });

    currentPage.page.drawText(bullet, {
      x: LEFT_MARGIN,
      y: currentPage.y,
      size: 10,
      font: fonts.monoBold,
      color: rgbToPdfLib(ordered ? theme.accent : theme.terminalAccent),
    });

    for (const [lineIndex, line] of itemLines.entries()) {
      currentPage.page.drawText(line, {
        x: LEFT_MARGIN + 20,
        y: currentPage.y - lineIndex * 14.4,
        size: 10.1,
        font: fonts.serif,
        color: rgbToPdfLib(theme.text),
      });
    }

    currentPage.y -= itemHeight;
  }

  currentPage.y -= 6;
  return currentPage;
}

function estimateKeyValueBlockHeight({
  pairs,
  labelWidth,
  valueWidth,
  fonts,
  compact,
}: {
  pairs: KeyValuePair[];
  labelWidth: number;
  valueWidth: number;
  fonts: PdfFonts;
  compact: boolean;
}) {
  return pairs.reduce((total, pair, index) => {
    const wrappedValue = wrapTextWithFont(
      pair.value,
      valueWidth,
      compact ? 9.3 : 10,
      fonts.serif,
    );
    const rowHeight = Math.max(
      compact ? 20 : 24,
      wrappedValue.length * (compact ? 12 : 13.5) + (compact ? 14 : 18),
    );
    return total + rowHeight + (index > 0 ? 1 : 0);
  }, 0);
}

function buildHeroSummaryLine(metadata: KeyValuePair[]) {
  const summaryPairs = metadata
    .filter((pair) =>
      ["target", "public id", "audience"].includes(pair.label.toLowerCase()),
    )
    .slice(0, 3)
    .map((pair) => `${pair.label}: ${pair.value}`);

  if (summaryPairs.length === 0) {
    return null;
  }

  return summaryPairs.join("  |  ");
}

function toKeyValuePairs(items: string[]) {
  const pairs = items.map((item) => {
    const match = stripInlineMarkdown(item).match(/^([^:]{1,40}):\s+(.+)$/u);
    if (!match) {
      return null;
    }

    return {
      label: match[1].trim(),
      value: match[2].trim(),
    } satisfies KeyValuePair;
  });

  return pairs.filter((pair): pair is KeyValuePair => pair !== null);
}

function wrapTextWithFont(
  value: string,
  maxWidth: number,
  fontSize: number,
  font: PDFFont,
) {
  const normalized = stripInlineMarkdown(value).replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of normalized.split(" ")) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
      currentLine = "";
    }

    if (font.widthOfTextAtSize(word, fontSize) <= maxWidth) {
      currentLine = word;
      continue;
    }

    const fragments = splitLongToken(word, maxWidth, fontSize, font);
    if (fragments.length === 1) {
      currentLine = fragments[0];
      continue;
    }

    lines.push(...fragments.slice(0, -1));
    currentLine = fragments.at(-1) ?? "";
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function splitLongToken(
  token: string,
  maxWidth: number,
  fontSize: number,
  font: PDFFont,
) {
  const fragments = token.split(/(?<=[/_\-.])/u).filter(Boolean);
  if (fragments.length > 1) {
    const lines: string[] = [];
    let current = "";

    for (const fragment of fragments) {
      const candidate = current ? `${current}${fragment}` : fragment;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
        current = candidate;
        continue;
      }

      if (current) {
        lines.push(current);
      }

      current = fragment;
    }

    if (current) {
      lines.push(current);
    }

    if (
      lines.every((line) => font.widthOfTextAtSize(line, fontSize) <= maxWidth)
    ) {
      return lines;
    }
  }

  const characters = [...token];
  const lines: string[] = [];
  let current = "";

  for (const character of characters) {
    const candidate = `${current}${character}`;
    if (!current || font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    lines.push(current);
    current = character;
  }

  if (current) {
    lines.push(current);
  }

  return lines;
}

function truncateTextToWidth(
  value: string,
  maxWidth: number,
  fontSize: number,
  font: PDFFont,
) {
  const normalized = stripInlineMarkdown(value).trim();
  if (font.widthOfTextAtSize(normalized, fontSize) <= maxWidth) {
    return normalized;
  }

  let output = normalized;
  while (
    output.length > 1 &&
    font.widthOfTextAtSize(`${output}...`, fontSize) > maxWidth
  ) {
    output = output.slice(0, -1);
  }

  return `${output}...`;
}

function appendSearchMarkers(pdfBytes: Uint8Array, markdown: string) {
  const pdfContent = Buffer.from(pdfBytes).toString("latin1");
  const markerBlock = [
    "% SEARCH MARKERS BEGIN",
    ...markdown
      .replace(/\r\n/g, "\n")
      .split("\n")
      .map((line) => `% ${line}`),
    "% SEARCH MARKERS END",
  ].join("\n");

  const output = pdfContent.replace(/%%EOF\s*$/u, `${markerBlock}\n%%EOF`);
  return Uint8Array.from(Buffer.from(output, "latin1"));
}
