import { Link, Navigate, useLocation } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth, useUser } from "@clerk/tanstack-react-start";
import { UserButton } from "@clerk/tanstack-react-start";
import { MaterialSymbol } from "../../components/ui/MaterialSymbol";

export function OpenBreachAppFrame({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn } = useUser();
  const location = useLocation();
  const isPublicOverview =
    location.pathname === "/" ||
    location.pathname === "/guardian" ||
    location.pathname === "/guardian/";
  const isPublicMode = !isLoaded || !isSignedIn;

  if (!isLoaded && !isPublicOverview) {
    return (
      <div className="text-on-background flex min-h-screen items-center justify-center bg-[#131313]">
        <div className="scanlines pointer-events-none fixed inset-0 z-50 opacity-20" />
        <div className="border-primary/20 pixel-corner border bg-[#1a1a1a] px-5 py-4 font-mono text-xs tracking-[0.2em] text-[#b9cacb] uppercase">
          Loading session
        </div>
      </div>
    );
  }

  if (isPublicMode && !isPublicOverview) {
    return <Navigate replace to="/auth" />;
  }

  return (
    <div className="text-on-background min-h-screen bg-[#131313]">
      <div className="scanlines pointer-events-none fixed inset-0 z-50 opacity-20" />
      <SideNavBar isPublicMode={isPublicMode} />
      <TopNavBarMobile isPublicMode={isPublicMode} />
      <main className="min-h-screen p-4 md:ml-64 lg:p-8">
        <div className="mx-auto max-w-[1440px]">{children}</div>
      </main>
    </div>
  );
}

function SideNavBar({ isPublicMode }: { isPublicMode: boolean }) {
  const { signOut } = useAuth();
  const user = useUser();

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
    <nav className="border-primary/10 bg-surface-container-lowest fixed top-0 left-0 z-40 hidden h-full w-64 flex-col border-r md:flex">
      <div className="border-primary/10 mb-6 flex flex-col items-center overflow-hidden border-b px-6 pt-10 pb-6">
        <div
          className="text-primary text-center font-mono text-[2.5rem] leading-[1] font-bold tracking-tight"
          style={{ transform: "scaleX(1.35)", transformOrigin: "center" }}
        >
          OPEN
          <br />
          BREACH
        </div>
        {isPublicMode ? (
          <Link
            className="border-primary/20 bg-surface-container-low pixel-corner text-primary hover:bg-primary/10 mt-5 flex w-full items-center justify-center gap-2 border px-3 py-3 font-mono text-[10px] tracking-[0.2em] uppercase transition-colors"
            to="/auth"
          >
            <MaterialSymbol icon="login" />
            Sign in
          </Link>
        ) : (
          <div className="border-primary/10 bg-surface-container-low pixel-corner mt-5 flex w-full items-center gap-3 border px-3 py-3">
            <div className="border-primary/20 bg-surface pixel-corner flex h-10 w-10 items-center justify-center border">
              <UserButton />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-primary truncate text-sm uppercase">
                {user.user?.primaryEmailAddress?.emailAddress || "OPERATOR"}
              </p>
              <p className="text-secondary-fixed-dim mt-1 font-mono text-[10px] uppercase">
                STATUS: AUTHENTICATED
              </p>
            </div>
            <button
              className="ml-auto font-mono text-[10px] text-[#ffb4ab] uppercase hover:text-[#ffb4ab]/80"
              onClick={() => signOut()}
              title="Sign Out"
            >
              <MaterialSymbol icon="logout" />
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-grow flex-col gap-1 overflow-y-auto pb-4">
        {items.map((item) => (
          <NavItem
            key={item.to}
            exact={"exact" in item ? item.exact : undefined}
            icon={item.icon}
            label={item.label}
            to={isPublicMode && item.to !== "/guardian" ? "/auth" : item.to}
          />
        ))}
      </div>

      <div className="space-y-3 p-6">
        <Link
          className="group border-primary/30 bg-surface text-primary pixel-corner hover:bg-primary/10 flex w-full items-center justify-center gap-2 border px-3 py-3 text-center font-mono text-[10px] tracking-[0.22em] uppercase transition-colors"
          to={isPublicMode ? "/auth" : "/targets/new"}
        >
          <MaterialSymbol
            className="shrink-0 group-hover:animate-pulse"
            icon="add_circle"
          />
          <span className="min-w-0 leading-tight break-words whitespace-normal">
            REGISTER_TARGET
          </span>
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
      className="text-on-surface-variant hover:bg-primary/5 hover:text-primary flex items-center gap-4 px-4 py-3 font-mono text-[10px] tracking-[0.22em] uppercase transition-all sm:text-xs"
      to={to}
    >
      <MaterialSymbol icon={icon} />
      {label}
    </Link>
  );
}

function TopNavBarMobile({ isPublicMode }: { isPublicMode: boolean }) {
  const { signOut } = useAuth();

  return (
    <nav className="border-primary/10 bg-surface/90 sticky top-0 z-50 flex h-16 w-full items-center justify-between border-b px-4 backdrop-blur-md md:hidden">
      <div>
        <h1 className="terminal-wordmark text-primary text-xl leading-none">
          OPEN BREACH
        </h1>
        <p className="text-on-surface-variant mt-1 font-mono text-[9px] tracking-[0.24em] uppercase">
          Control Plane
        </p>
      </div>
      {isPublicMode ? (
        <Link className="text-primary" to="/auth">
          <MaterialSymbol icon="login" />
        </Link>
      ) : (
        <div className="flex items-center gap-4">
          <UserButton />
          <button onClick={() => signOut()} className="text-[#ffb4ab]">
            <MaterialSymbol icon="logout" />
          </button>
        </div>
      )}
    </nav>
  );
}
