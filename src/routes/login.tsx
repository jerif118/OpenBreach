import {
  SignIn,
  UserButton,
  useAuth,
} from "@clerk/tanstack-react-start";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { type ReactNode, useState } from "react";
import { api } from "../../convex/_generated/api.js";

export const Route = createFileRoute("/login")({
  component: LoginRoute,
});

const isClerkConfigured = Boolean(import.meta.env.VITE_CLERK_PUBLISHABLE_KEY);
const isConvexConfigured = Boolean(import.meta.env.VITE_CONVEX_URL);

function LoginRoute() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.16),_transparent_28rem),linear-gradient(180deg,_#020617_0%,_#0f172a_55%,_#111827_100%)] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto flex max-w-6xl flex-col gap-6">
        <header className="rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-semibold tracking-[0.32em] text-cyan-300 uppercase">
                Operator access
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                Clerk login and Convex authorization
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
                Public dashboard access remains open. This route handles
                operator sign-in and the current authenticated user profile used
                by Convex authorization checks.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-full border border-cyan-200/40 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-100 hover:text-white"
              >
                Back to public dashboard
              </Link>
              <Link
                to="/municipalities/$id"
                params={{ id: "mx-yuc-merida" }}
                className="inline-flex items-center justify-center rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-white/30 hover:text-white"
              >
                Go to protected panel
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-5 shadow-2xl shadow-black/20 backdrop-blur sm:p-6">
            {isClerkConfigured ? <ConfiguredAuthCard /> : <DemoModeCard />}
          </div>

          <aside className="grid gap-6">
            <InfoCard
              eyebrow="Public access"
              title="What stays open without login"
            >
              <p className="text-sm leading-6 text-slate-300">
                The public risk map, ranked list, municipality detail, and PDF
                downloads stay readable without authentication. Login is only
                required for protected operator and admin workflows.
              </p>
            </InfoCard>

            <InfoCard
              eyebrow="Protected writes"
              title="What this login enables"
            >
              <p className="text-sm leading-6 text-slate-300">
                Clerk-authenticated sessions can sync the current user profile
                into Convex and are then eligible for server-side role checks.
                Protected writes such as report persistence remain guarded in
                Convex and are denied by default to non-operator roles.
              </p>
            </InfoCard>

            <InfoCard
              eyebrow="Environment"
              title="Required variables"
            >
              <ul className="grid gap-2 text-sm text-slate-300">
                <li>`VITE_CLERK_PUBLISHABLE_KEY`</li>
                <li>`CLERK_SECRET_KEY`</li>
                <li>`CLERK_JWT_ISSUER_DOMAIN`</li>
                <li>`VITE_CONVEX_URL`</li>
                <li>`CONVEX_DEPLOYMENT`</li>
              </ul>
            </InfoCard>
          </aside>
        </section>
      </section>
    </main>
  );
}

function ConfiguredAuthCard() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return <LoadingCard />;
  }

  if (isSignedIn) {
    return <SignedInCard />;
  }

  return <SignedOutCard />;
}

function SignedOutCard() {
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.28em] text-cyan-300 uppercase">
          Signed out
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Sign in with Clerk
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Use the hosted Clerk interface below. After sign-in, this route shows
          the authenticated Convex profile and lets you sync the minimal MVP
          role record.
        </p>
      </div>
      <div className="overflow-hidden rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-4">
        <SignIn
          path="/login"
          routing="path"
          fallbackRedirectUrl="/login"
        />
      </div>
    </div>
  );
}

function SignedInCard() {
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-[0.28em] text-emerald-300 uppercase">
            Signed in
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Clerk session is active
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Your browser session is authenticated. The profile panel below
            reflects the server-derived Convex record used for role checks.
          </p>
        </div>
        <UserButton />
      </div>

      {isConvexConfigured ? <CurrentProfileCard /> : <ConvexMissingCard />}
    </div>
  );
}

function LoadingCard() {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.28em] text-cyan-300 uppercase">
        Auth loading
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-white">
        Waiting for Clerk session state
      </h2>
      <p className="mt-3 text-sm leading-6 text-slate-300">
        Public routes remain readable while the protected session state
        initializes.
      </p>
    </div>
  );
}

function DemoModeCard() {
  return (
    <div className="grid gap-5">
      <div>
        <p className="text-xs font-semibold tracking-[0.28em] text-amber-300 uppercase">
          Demo mode
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">
          Clerk login is not configured
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          This environment still serves the public dashboard, but the Clerk
          login interface is unavailable until the required variables are set.
        </p>
      </div>
      <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-400/10 p-4 text-sm text-amber-50">
        Set `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`,
        `CLERK_JWT_ISSUER_DOMAIN`, `VITE_CONVEX_URL`, and
        `CONVEX_DEPLOYMENT` to enable real login and Convex auth.
      </div>
    </div>
  );
}

function ConvexMissingCard() {
  return (
    <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-400/10 p-4">
      <p className="text-sm leading-6 text-amber-50">
        Clerk login is active, but `VITE_CONVEX_URL` is missing. The session is
        authenticated in Clerk, yet Convex profile sync and role-backed queries
        are unavailable in this environment.
      </p>
    </div>
  );
}

function CurrentProfileCard() {
  const profile = useQuery(api.users.current, {});
  const updateCurrentMetadata = useMutation(api.users.updateCurrentMetadata);
  const [statusMessage, setStatusMessage] = useState(
    "Use the sync action to create or refresh the current user profile in Convex.",
  );
  const [isSyncing, setIsSyncing] = useState(false);

  async function handleSyncProfile() {
    setIsSyncing(true);
    setStatusMessage("Syncing current Clerk metadata into Convex...");

    try {
      await updateCurrentMetadata({});
      setStatusMessage(
        "Current user profile synced successfully. Protected role checks can now resolve this account server-side.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown sync error.";
      setStatusMessage(`Profile sync failed: ${message}`);
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
        <p className="text-xs font-semibold tracking-[0.28em] text-cyan-300 uppercase">
          Convex user profile
        </p>
        {profile === undefined ? (
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Loading the current Convex profile...
          </p>
        ) : profile === null ? (
          <div className="mt-3 grid gap-3">
            <p className="text-sm leading-6 text-slate-300">
              No `userProfiles` record exists yet for this signed-in user.
            </p>
            <button
              type="button"
              className="inline-flex w-fit items-center justify-center rounded-full border border-cyan-200/40 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-100 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSyncing}
              onClick={handleSyncProfile}
            >
              {isSyncing ? "Syncing profile..." : "Create profile in Convex"}
            </button>
          </div>
        ) : (
          <div className="mt-3 grid gap-3">
            <pre className="overflow-x-auto rounded-2xl border border-white/10 bg-[#030712] p-3 text-xs leading-6 text-slate-300">
              {JSON.stringify(profile, null, 2)}
            </pre>
            <button
              type="button"
              className="inline-flex w-fit items-center justify-center rounded-full border border-cyan-200/40 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:border-cyan-100 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSyncing}
              onClick={handleSyncProfile}
            >
              {isSyncing ? "Refreshing profile..." : "Refresh profile metadata"}
            </button>
          </div>
        )}
      </div>

      <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/55 p-4">
        <p className="text-xs font-semibold tracking-[0.28em] text-cyan-300 uppercase">
          Sync status
        </p>
        <p className="mt-3 text-sm leading-6 text-slate-300">{statusMessage}</p>
      </div>
    </div>
  );
}

function InfoCard({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/10 p-5 shadow-xl shadow-black/20 backdrop-blur">
      <p className="text-xs font-semibold tracking-[0.28em] text-cyan-300 uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold text-white">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
