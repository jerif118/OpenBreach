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
        title: "OPEN CREACH",
      },
      {
        name: "description",
        content: "Passive municipal cyber risk map MVP.",
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
        href: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&family=Geist:wght@400;600;700&display=swap",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap",
      },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html>
      <head>
        <HeadContent />
      </head>
      <body>
        <AppProviders>
          <TopNav />
          {children}
        </AppProviders>
        <TanStackRouterDevtools position="bottom-right" />
        <Scripts />
      </body>
    </html>
  );
}

function TopNav() {
  return (
    <nav className="sticky top-0 z-50 border-b border-primary/10 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="min-w-0">
          <div className="terminal-wordmark text-2xl leading-none text-primary">
            OPEN CREACH
          </div>
          <p className="mt-1 font-mono text-[10px] tracking-[0.28em] text-primary/45 uppercase">
            guardian console
          </p>
        </Link>

        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/guardian"
            className="font-mono text-[10px] tracking-[0.22em] text-on-surface-variant uppercase transition hover:text-primary sm:text-xs"
            activeProps={{
              className:
                "font-mono text-[10px] tracking-[0.22em] text-primary uppercase transition sm:text-xs",
            }}
          >
            Guardian
          </Link>
          <Link
            to="/targets"
            className="font-mono text-[10px] tracking-[0.22em] text-on-surface-variant uppercase transition hover:text-primary sm:text-xs"
            activeProps={{
              className:
                "font-mono text-[10px] tracking-[0.22em] text-primary uppercase transition sm:text-xs",
            }}
          >
            Targets
          </Link>
          <Link
            to="/guardian/reports"
            className="font-mono text-[10px] tracking-[0.22em] text-on-surface-variant uppercase transition hover:text-primary sm:text-xs"
            activeProps={{
              className:
                "font-mono text-[10px] tracking-[0.22em] text-primary uppercase transition sm:text-xs",
            }}
          >
            Reports
          </Link>
        </div>
      </div>
    </nav>
  );
}
