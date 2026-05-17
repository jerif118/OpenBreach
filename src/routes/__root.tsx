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
        title: "DEFF-ACC",
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
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          to="/"
          className="font-mono text-sm font-semibold text-cyan-300 transition hover:text-cyan-100"
        >
          DEFF-ACC
        </Link>
        <div className="h-4 w-px bg-white/10" />
        <Link
          to="/targets"
          className="font-mono text-sm text-slate-300 transition hover:text-white"
          activeProps={{ className: "font-mono text-sm text-cyan-300" }}
        >
          Targets
        </Link>
      </div>
    </nav>
  );
}
