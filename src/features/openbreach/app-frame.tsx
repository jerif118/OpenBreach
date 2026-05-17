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
  const items = [
    { exact: true, icon: "grid_view", label: "OVERVIEW", to: "/guardian" },
    { icon: "travel_explore", label: "TARGETS", to: "/targets" },
    { icon: "lan", label: "NETWORK", to: "/guardian/network" },
    { icon: "security", label: "THREATS", to: "/guardian/threats" },
    { icon: "database", label: "EVIDENCE", to: "/guardian/evidence" },
    {
      icon: "verified_user",
      label: "VALIDATIONS",
      to: "/guardian/validations",
    },
    { icon: "description", label: "REPORTS", to: "/guardian/reports" },
    { icon: "terminal", label: "LOGS", to: "/guardian/logs" },
    { icon: "settings", label: "CONFIG", to: "/guardian/config" },
  ] as const;

  return (
    <nav className="fixed left-0 top-0 z-40 hidden h-full w-64 flex-col border-r border-primary/10 bg-surface-container-lowest md:flex">
      <div className="mb-6 flex flex-col items-center border-b border-primary/10 px-6 pb-6 pt-10 overflow-hidden">
        <div 
          className="font-mono font-bold tracking-tight text-center text-[2.5rem] leading-[1] text-primary"
          style={{ transform: "scaleX(1.35)", transformOrigin: "center" }}
        >
          OPEN
          <br />
          CREACH
        </div>
        <div className="mt-5 w-full flex items-center gap-3 border border-primary/10 bg-surface-container-low px-3 py-3 pixel-corner">
          <div className="flex h-10 w-10 items-center justify-center border border-primary/20 bg-surface pixel-corner">
            <span className="material-symbols-outlined text-primary">
              verified_user
            </span>
          </div>
          <div>
            <p className="font-display text-sm text-primary uppercase">
              OPERATOR_01
            </p>
            <p className="mt-1 font-mono text-[10px] text-secondary-fixed-dim uppercase">
              STATUS: ENCRYPTED
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-grow flex-col gap-1 overflow-y-auto pb-4">
        {items.map((item) => (
          <NavItem
            key={item.to}
            exact={"exact" in item ? item.exact : undefined}
            icon={item.icon}
            label={item.label}
            to={item.to}
          />
        ))}
      </div>

      <div className="space-y-3 p-6">
        <Link
          className="group flex w-full items-center justify-center gap-2 border border-primary/30 bg-surface px-3 py-3 font-mono text-[10px] tracking-[0.22em] text-primary uppercase transition-colors pixel-corner hover:bg-primary/10"
          to="/targets/new"
        >
          <span className="material-symbols-outlined group-hover:animate-pulse">
            add_circle
          </span>
          REGISTER_TARGET
        </Link>
        <Link
          className="group flex w-full items-center justify-center gap-2 border border-secondary-fixed-dim/40 bg-secondary-fixed-dim/5 px-3 py-3 font-mono text-[10px] tracking-[0.22em] text-secondary-fixed-dim uppercase transition-colors pixel-corner hover:bg-secondary-fixed-dim/10"
          to="/guardian/reports"
        >
          <span className="material-symbols-outlined">download</span>
          OPEN_REPORTS
        </Link>
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
          "flex items-center gap-4 border-l-4 border-secondary-fixed-dim bg-secondary-container/10 px-4 py-3 font-mono text-[10px] tracking-[0.22em] text-secondary-fixed-dim uppercase transition-all sm:text-xs",
      }}
      className="flex items-center gap-4 px-4 py-3 font-mono text-[10px] tracking-[0.22em] text-on-surface-variant uppercase transition-all hover:bg-primary/5 hover:text-primary sm:text-xs"
      to={to}
    >
      <span className="material-symbols-outlined">{icon}</span>
      {label}
    </Link>
  );
}

function TopNavBarMobile() {
  return (
    <nav className="sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b border-primary/10 bg-surface/90 px-4 backdrop-blur-md md:hidden">
      <div>
        <h1 className="terminal-wordmark text-xl leading-none text-primary">
          OPEN CREACH
        </h1>
        <p className="mt-1 font-mono text-[9px] tracking-[0.24em] text-on-surface-variant uppercase">
          Control Plane
        </p>
      </div>
      <div className="flex gap-4">
        <Link className="text-[#b9cacb] hover:text-primary" to="/targets">
          <span className="material-symbols-outlined">security</span>
        </Link>
        <Link className="text-[#b9cacb] hover:text-primary" to="/guardian/validations">
          <span className="material-symbols-outlined">sensors</span>
        </Link>
        <Link className="text-[#b9cacb] hover:text-primary" to="/guardian/reports">
          <span className="material-symbols-outlined">terminal</span>
        </Link>
      </div>
    </nav>
  );
}
