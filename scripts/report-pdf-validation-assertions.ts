import { pushText } from "../src/reports/pdf-document.ts";

function requiredMatchGroup(
  match: RegExpMatchArray,
  groupIndex: number,
  description: string,
): string {
  const group = match[groupIndex];

  if (group === undefined) {
    throw new Error(`${description} is missing an expected capture group.`);
  }

  return group;
}

function requiredCommand(commands: readonly string[]): string {
  const command = commands[0];

  if (command === undefined) {
    throw new Error(
      "PDF text escaping must escape newlines, carriage returns, backslashes, and parentheses.",
    );
  }

  return command;
}

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

  const command = requiredCommand(commands);
  const expected = String.raw`BT /F1 12 Tf 0.000 0.000 0.000 rg 1.00 2.00 Td (Line\nBreak\rReturn \(path\\value\)) Tj ET`;

  if (command !== expected) {
    throw new Error(
      "PDF text escaping must escape newlines, carriage returns, backslashes, and parentheses.",
    );
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
