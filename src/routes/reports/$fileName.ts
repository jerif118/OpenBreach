import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createFileRoute } from "@tanstack/react-router";
import { buildStyledPdfDocument } from "../../reports/pdf-layout.ts";
import { renderReportMarkdownTemplate } from "../../reports/markdown-template.ts";
import type { RemediationReport } from "../../shared/contracts.ts";

const safePdfFileNamePattern = /^[A-Za-z0-9._-]+\.pdf$/;
const reportVariants = ["technical", "friendly"] as const;

type ReportVariant = (typeof reportVariants)[number];

type ReportGenerationFixture = {
  batch?: {
    results?: {
      municipalityId: string;
      result: {
        metadata?: {
          artifacts?: Partial<
            Record<
              ReportVariant,
              {
                pdf?: {
                  fileName?: string;
                };
              }
            >
          >;
        };
        reports?: Partial<Record<ReportVariant, RemediationReport>>;
        status: string;
      };
    }[];
  };
  selected?: {
    municipality?: {
      id: string;
      name: string;
    };
  }[];
};

async function loadBundledReportData() {
  const [
    reportGenerationModule,
    technicalTemplateModule,
    friendlyTemplateModule,
  ] = await Promise.all([
    import("../../../data/reports/latest.report-generation.json"),
    import("../../reports/templates/technical-report.md?raw"),
    import("../../reports/templates/friendly-report.md?raw"),
  ]);

  return {
    reportGeneration:
      reportGenerationModule.default as unknown as ReportGenerationFixture,
    templateByVariant: {
      technical: technicalTemplateModule.default,
      friendly: friendlyTemplateModule.default,
    } satisfies Record<ReportVariant, string>,
  };
}

function findOnDemandReport(
  reportGeneration: ReportGenerationFixture,
  fileName: string,
) {
  for (const record of reportGeneration.batch?.results ?? []) {
    if (record.result.status !== "completed") {
      continue;
    }

    for (const variant of reportVariants) {
      if (
        record.result.metadata?.artifacts?.[variant]?.pdf?.fileName !==
        fileName
      ) {
        continue;
      }

      const report = record.result.reports?.[variant];
      if (!report || report.variant !== variant) {
        continue;
      }

      const municipalityName =
        reportGeneration.selected?.find(
          (selected) => selected.municipality?.id === record.municipalityId,
        )?.municipality?.name ?? record.municipalityId;

      return { municipalityName, report };
    }
  }

  return null;
}

async function generatePdfResponse(fileName: string) {
  const { reportGeneration, templateByVariant } = await loadBundledReportData();
  const match = findOnDemandReport(reportGeneration, fileName);

  if (!match) {
    return null;
  }

  const markdown = renderReportMarkdownTemplate({
    municipalityName: match.municipalityName,
    report: match.report,
    template: templateByVariant[match.report.variant],
  });
  const pdf = await buildStyledPdfDocument(markdown, match.report.variant);
  const pdfBlob = new Blob([new Uint8Array(pdf)], {
    type: "application/pdf",
  });

  return new Response(pdfBlob, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Type": "application/pdf",
    },
  });
}

export const Route = createFileRoute("/reports/$fileName")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const encodedFileName =
          new URL(request.url).pathname.split("/").at(-1) ?? "";
        let fileName: string;

        try {
          fileName = decodeURIComponent(encodedFileName);
        } catch {
          return new Response("Invalid report file name", { status: 400 });
        }

        if (!safePdfFileNamePattern.test(fileName)) {
          return new Response("Invalid report file name", { status: 400 });
        }

        const generatedPdf = await generatePdfResponse(fileName);
        if (generatedPdf) {
          return generatedPdf;
        }

        try {
          const pdf = await readFile(
            join(process.cwd(), "data", "reports", fileName),
          );

          return new Response(pdf, {
            headers: {
              "Content-Disposition": `attachment; filename="${fileName}"`,
              "Content-Type": "application/pdf",
            },
          });
        } catch {
          return new Response("Report PDF not found", { status: 404 });
        }
      },
    },
  },
});
