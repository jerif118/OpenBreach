/// <reference types="vite/client" />
import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import type { ReactNode } from "react";
import { AppProviders } from "~/providers/app-providers";
import appCss from "~/styles/app.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "OpenBreach",
      },
      {
        name: "description",
        content: "OpenBreach - Authorized security validation workflow",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,400,0,0",
      },
    ],
  }),
  notFoundComponent: OpenBreachNotFound,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}

function OpenBreachNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#131313] px-6 text-on-background">
      <div className="max-w-md border border-primary/20 bg-[#0e0e0e] p-8 text-center pixel-corner">
        <p className="font-mono text-[10px] tracking-[0.28em] text-[#00dbe9] uppercase">
          OpenBreach
        </p>
        <h1 className="font-display mt-3 text-2xl text-primary uppercase">
          Route Not Found
        </h1>
        <p className="mt-3 font-mono text-[10px] leading-6 text-[#b9cacb]">
          The requested path is outside the current approved interface scope.
        </p>
        <Link
          className="mt-6 inline-flex border border-primary px-4 py-2 font-mono text-[10px] tracking-[0.24em] text-primary uppercase transition-colors hover:bg-primary/10"
          to="/"
        >
          Return Home
        </Link>
      </div>
    </main>
  );
}
