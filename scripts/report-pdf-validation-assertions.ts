import { pushText } from "../src/reports/pdf-document.ts";

import {
  requiredElement,
  requiredMatchGroup,
} from "./report-pdf-validation-helpers.ts";

const PDF_TEXT_ESCAPING_RULE =
  "PDF text escaping must escape newlines, carriage returns, backslashes, and parentheses.";

export function assertPdfTextEscapesLiteralControls(): void {
  const commands: string[] = [];

  pushText({
    commands,
    fontKey: "F1",
    fontSize: 12,
    color: [0, 0, 0],
    x: 1,
    y: 2,
    text: "Line\nBreak\rReturn (path\\value)",
  });

  const command = requiredElement(commands, 0, PDF_TEXT_ESCAPING_RULE);
  const expected = String.raw`BT /F1 12 Tf 0.000 0.000 0.000 rg 1.00 2.00 Td (Line\nBreak\rReturn \(path\\value\)) Tj ET`;

  if (command !== expected) {
    throw new Error(PDF_TEXT_ESCAPING_RULE);
  }
}

export function assertPageTreeReferencesPageObjects(pdfContent: string): void {
  const objects = new Map<number, string>();

  for (const match of pdfContent.matchAll(
    /^(\d+) 0 obj\n([\s\S]*?)\nendobj/gm,
  )) {
    const objectId = Number(requiredMatchGroup(match, 1, "PDF object"));
    const objectContent = requiredMatchGroup(match, 2, "PDF object");

    objects.set(objectId, objectContent);
  }

  const pagesObject = objects.get(2);
  const kidsMatch = /\/Kids \[([^\]]+)\]/.exec(pagesObject ?? "");

  if (!kidsMatch) {
    throw new Error("Generated PDF page tree is missing /Kids references.");
  }

  const kidsReferences = requiredMatchGroup(kidsMatch, 1, "PDF page tree /Kids");

  for (const pageRef of kidsReferences.matchAll(/(\d+) 0 R/g)) {
    const pageObjectId = Number(
      requiredMatchGroup(pageRef, 1, "PDF page reference"),
    );
    const pageObject = objects.get(pageObjectId);

    if (!pageObject || !/\/Type\s+\/Page\b/.test(pageObject)) {
      throw new Error(
        `Generated PDF /Kids references non-page object ${pageObjectId}.`,
      );
    }
  }
}
