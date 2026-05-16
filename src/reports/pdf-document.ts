import type { PdfFontKey } from "./pdf-markdown-parser.ts";

export type RgbColor = [number, number, number];

export type PdfPage = {
  commands: string[];
};

function escapePdfText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function colorCommand([red, green, blue]: RgbColor) {
  return `${red.toFixed(3)} ${green.toFixed(3)} ${blue.toFixed(3)}`;
}

export function pushText({
  commands,
  fontKey,
  fontSize,
  color,
  x,
  y,
  text,
}: {
  commands: string[];
  fontKey: PdfFontKey;
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

export function pushFilledRect({
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

export function pushStrokeRect({
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

export function serializePdfDocument({
  pages,
  pageWidth,
  pageHeight,
}: {
  pages: PdfPage[];
  pageWidth: number;
  pageHeight: number;
}) {
  const pageObjectStart = 6;
  const pageCount = pages.length;
  const pageObjectIds = pages.map((_, index) => pageObjectStart + index);
  const contentObjectIds = pages.map(
    (_, index) => pageObjectStart + pageCount + index,
  );
  const objects = buildPdfObjects({
    pages,
    pageWidth,
    pageHeight,
    pageCount,
    pageObjectIds,
    contentObjectIds,
  });

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

function buildPdfObjects({
  pages,
  pageWidth,
  pageHeight,
  pageCount,
  pageObjectIds,
  contentObjectIds,
}: {
  pages: PdfPage[];
  pageWidth: number;
  pageHeight: number;
  pageCount: number;
  pageObjectIds: number[];
  contentObjectIds: number[];
}) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageCount} >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>",
  ];

  for (const [index] of pages.entries()) {
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${contentObjectIds[index]} 0 R >>`,
    );
  }

  for (const page of pages) {
    const stream = page.commands.join("\n");
    objects.push(
      `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    );
  }

  return objects;
}
