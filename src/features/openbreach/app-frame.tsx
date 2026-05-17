import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

export function OpenBreachAppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#131313] text-on-background">
      <div className="fixed inset-0 z-50 pointer-events-none opacity-20 scanlines" />
      <SideNavBar />
      <TopNavBarMobile />
      <main className="min-h-screen p-4 md:ml-64 lg:p-8">
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}

function SideNavBar() {
  return (
    <nav className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-primary/10 bg-[#0e0e0e] pt-16 md:flex">
      <div className="mb-8 flex flex-col gap-2 px-6">
        <h2 className="font-display text-2xl tracking-[0.2em] text-primary">
          OPENBREACH
        </h2>
        <p className="font-mono text-[10px] tracking-[0.28em] text-[#00dbe9] uppercase">
          Authorized Validation Grid
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden border border-primary/40 bg-[#131313] pixel-corner">
            <span className="material-symbols-outlined text-primary">
              verified_user
            </span>
          </div>
          <div>
            <p className="font-mono text-xs tracking-widest text-[#00dbe9] uppercase crt-glow">
              OPERATOR_01
            </p>
            <p className="font-mono text-[10px] text-[#00e639] uppercase">
              STATUS: VERIFIED
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-grow flex-col gap-2">
        <NavItem exact icon="grid_view" label="OVERVIEW" to="/guardian/" />
        <NavItem icon="lan" label="NETWORK" to="/guardian/network" />
        <NavItem icon="security" label="THREATS" to="/guardian/threats" />
        <NavItem icon="terminal" label="LOGS" to="/guardian/logs" />
        <NavItem icon="settings" label="CONFIG" to="/guardian/config" />
      </div>

      <div className="p-6">
        <button className="group flex w-full items-center justify-center gap-2 border border-primary bg-[#131313] py-3 font-mono text-xs tracking-widest text-primary uppercase transition-colors pixel-corner hover:bg-primary/10">
          <span className="material-symbols-outlined group-hover:animate-pulse">
            radar
          </span>
          START_SWEEP
        </button>
      </div>
    </nav>
  );
}

function NavItem({
  to,
  icon,
  label,
  exact,
}: {
  to: string;
  icon: string;
  label: string;
  exact?: boolean;
}) {
  return (
    <Link
      activeOptions={{ exact }}
      activeProps={{
        className:
          "flex items-center gap-4 border-l-4 border-[#00e639] bg-[#13ff43]/10 px-4 py-3 font-mono text-xs tracking-widest text-[#00e639] uppercase translate-x-1 crt-glow",
      }}
      className="flex items-center gap-4 px-4 py-3 font-mono text-xs tracking-widest text-[#b9cacb] uppercase transition-all hover:bg-primary/5 hover:text-primary"
      to={to}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {label}
    </Link>
  );
}

function TopNavBarMobile() {
  return (
    <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-primary/10 bg-[#131313]/90 px-4 backdrop-blur-md md:hidden">
      <div>
        <h1 className="font-display text-2xl tracking-[0.16em] text-primary uppercase crt-glow">
          OB
        </h1>
        <p className="font-mono text-[9px] tracking-[0.24em] text-[#00dbe9] uppercase">
          OpenBreach
        </p>
      </div>
      <div className="flex gap-4">
        <button className="text-[#b9cacb] hover:text-primary">
          <span className="material-symbols-outlined">security</span>
        </button>
        <button className="text-[#b9cacb] hover:text-primary">
          <span className="material-symbols-outlined">sensors</span>
        </button>
        <button className="text-[#b9cacb] hover:text-primary">
          <span className="material-symbols-outlined">terminal</span>
        </button>
      </div>
    </nav>
  );
}
