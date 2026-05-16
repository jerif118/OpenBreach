import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { createFileRoute } from "@tanstack/react-router";

const safePdfFileNamePattern = /^[A-Za-z0-9._-]+\.pdf$/;

export const Route = createFileRoute("/reports/$fileName")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const encodedFileName = new URL(request.url).pathname.split("/").at(-1) ?? "";
        let fileName: string;

        try {
          fileName = decodeURIComponent(encodedFileName);
        } catch {
          return new Response("Invalid report file name", { status: 400 });
        }

        if (!safePdfFileNamePattern.test(fileName)) {
          return new Response("Invalid report file name", { status: 400 });
        }

        try {
          const pdf = await readFile(join(process.cwd(), "data", "reports", fileName));

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
