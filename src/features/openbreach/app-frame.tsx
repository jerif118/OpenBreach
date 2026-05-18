import { Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { SignInButton, UserButton, useUser } from "@clerk/tanstack-react-start";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api.js";
import { MaterialSymbol } from "../../components/ui/MaterialSymbol";

const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const isConvexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

export function OpenBreachAppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="text-on-background min-h-screen bg-[#131313]">
      <div className="scanlines pointer-events-none fixed inset-0 z-50 opacity-20" />
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
    { icon: "play_circle", label: "RUNS", to: "/guardian/runs" },
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
        <AuthWidget />
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
          className="group border-primary/30 bg-surface text-primary pixel-corner hover:bg-primary/10 flex w-full items-center justify-center gap-2 border px-3 py-3 text-center font-mono text-[10px] tracking-[0.22em] uppercase transition-colors"
          to="/targets/new"
        >
          <MaterialSymbol
            className="shrink-0 group-hover:animate-pulse"
            icon="add_circle"
          />
          <span className="min-w-0 leading-tight break-words whitespace-normal">
            REGISTER_TARGET
          </span>
        </Link>
        <Link
          className="group border-secondary-fixed-dim/40 bg-secondary-fixed-dim/5 text-secondary-fixed-dim pixel-corner hover:bg-secondary-fixed-dim/10 flex w-full items-center justify-center gap-2 border px-3 py-3 text-center font-mono text-[10px] tracking-[0.22em] uppercase transition-colors"
          to="/guardian/reports"
        >
          <MaterialSymbol className="shrink-0" icon="download" />
          <span className="min-w-0 leading-tight break-words whitespace-normal">
            OPEN_REPORTS
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
          "flex w-full min-w-0 items-start gap-4 border-l-4 border-secondary-fixed-dim bg-secondary-container/10 px-4 py-3 font-mono text-[10px] tracking-[0.22em] text-secondary-fixed-dim uppercase transition-all sm:text-xs",
      }}
      className="text-on-surface-variant hover:bg-primary/5 hover:text-primary flex w-full min-w-0 items-start gap-4 px-4 py-3 font-mono text-[10px] tracking-[0.22em] uppercase transition-all sm:text-xs"
      to={to}
    >
      <MaterialSymbol className="mt-0.5 shrink-0" icon={icon} />
      <span className="min-w-0 flex-1 leading-tight break-words whitespace-normal">
        {label}
      </span>
    </Link>
  );
}

function TopNavBarMobile() {
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
      <div className="flex items-center gap-4">
        <Link className="hover:text-primary text-[#b9cacb]" to="/targets">
          <MaterialSymbol icon="security" />
        </Link>
        <Link
          className="hover:text-primary text-[#b9cacb]"
          to="/guardian/validations"
        >
          <MaterialSymbol icon="sensors" />
        </Link>
        <Link
          className="hover:text-primary text-[#b9cacb]"
          to="/guardian/reports"
        >
          <MaterialSymbol icon="terminal" />
        </Link>
        <MobileAuthAffordance />
      </div>
    </nav>
  );
}

// Sidebar identity / sign-in widget. Branches on whether Clerk is configured
// so we never call Clerk hooks without a provider above us.
function AuthWidget() {
  if (!isClerkConfigured) {
    return <AuthWidgetUnconfigured />;
  }
  return <AuthWidgetClerk />;
}

function AuthWidgetClerk() {
  const { isLoaded, isSignedIn, user } = useUser();
  useEnsureConvexProfile(isLoaded && Boolean(isSignedIn));

  if (!isLoaded) {
    return (
      <div className="border-primary/10 bg-surface-container-low pixel-corner mt-5 flex w-full items-center gap-3 border px-3 py-3">
        <div className="border-primary/20 bg-surface pixel-corner h-10 w-10 animate-pulse border" />
        <div className="flex-1">
          <div className="bg-surface-container-high h-3 w-24 animate-pulse" />
          <div className="bg-surface-container-high mt-2 h-2 w-16 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="border-primary/20 bg-surface-container-low pixel-corner mt-5 flex w-full flex-col gap-3 border px-3 py-3">
        <div className="flex items-center gap-3">
          <div className="border-primary/20 bg-surface pixel-corner flex h-10 w-10 items-center justify-center border">
            <MaterialSymbol className="text-primary" icon="lock" />
          </div>
          <div>
            <p className="font-display text-primary text-sm uppercase">
              SIGNED OUT
            </p>
            <p className="text-on-surface-variant mt-1 font-mono text-[10px] uppercase">
              Authenticate to act
            </p>
          </div>
        </div>
        <SignInButton mode="modal" forceRedirectUrl="/guardian">
          <button
            type="button"
            className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 pixel-corner border px-3 py-2 font-mono text-[10px] tracking-[0.22em] uppercase transition-colors"
          >
            ▶ Sign In
          </button>
        </SignInButton>
        <Link
          to="/sign-in"
          className="text-on-surface-variant hover:text-primary text-center font-mono text-[9px] tracking-[0.22em] uppercase"
        >
          Or open full sign-in page
        </Link>
      </div>
    );
  }

  const displayName =
    user.fullName ??
    user.username ??
    user.primaryEmailAddress?.emailAddress ??
    "Operator";

  return (
    <div className="border-primary/10 bg-surface-container-low pixel-corner mt-5 flex w-full items-center gap-3 border px-3 py-3">
      <UserButton appearance={{ elements: { avatarBox: "h-10 w-10" } }} />
      <div className="min-w-0 flex-1">
        <p className="font-display text-primary truncate text-sm uppercase">
          {displayName}
        </p>
        <p className="text-secondary-fixed-dim mt-1 font-mono text-[10px] uppercase">
          STATUS: AUTHENTICATED
        </p>
      </div>
    </div>
  );
}

function AuthWidgetUnconfigured() {
  return (
    <div className="border-error/30 bg-error/5 pixel-corner mt-5 flex w-full flex-col gap-2 border px-3 py-3">
      <div className="flex items-center gap-3">
        <div className="border-error/30 bg-surface pixel-corner flex h-10 w-10 items-center justify-center border">
          <MaterialSymbol className="text-error" icon="key_off" />
        </div>
        <div>
          <p className="font-display text-error text-sm uppercase">
            AUTH OFFLINE
          </p>
          <p className="text-on-surface-variant mt-1 font-mono text-[10px] uppercase">
            Clerk not configured
          </p>
        </div>
      </div>
      <p className="text-on-surface-variant font-mono text-[10px] leading-tight">
        Set VITE_CLERK_PUBLISHABLE_KEY in .env.local and restart the dev server
        to enable sign-in.
      </p>
    </div>
  );
}

function MobileAuthAffordance() {
  if (!isClerkConfigured) {
    return null;
  }
  return <MobileAuthAffordanceClerk />;
}

function MobileAuthAffordanceClerk() {
  const { isLoaded, isSignedIn } = useUser();
  if (!isLoaded) return null;
  if (isSignedIn) {
    return <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />;
  }
  return (
    <Link
      to="/sign-in"
      className="border-primary/40 bg-primary/10 text-primary pixel-corner hover:bg-primary/15 border px-2 py-1 font-mono text-[9px] tracking-[0.22em] uppercase"
    >
      Sign In
    </Link>
  );
}

// Ensures a `userProfiles` row exists for the signed-in Clerk user. Without
// this the back-end role checks (and the admin-elevation script) have nothing
// to match against. Runs once per signed-in session; errors are swallowed
// because this is best-effort bootstrap and the mutation is idempotent.
function useEnsureConvexProfile(active: boolean) {
  const provision = useMutation(api.users.updateCurrentMetadata);
  const ranRef = useRef(false);

  useEffect(() => {
    if (!active || !isConvexConfigured || ranRef.current) {
      return;
    }
    ranRef.current = true;
    provision({}).catch((err) => {
      console.warn("Failed to provision Convex user profile:", err);
      ranRef.current = false;
    });
  }, [active, provision]);
}
