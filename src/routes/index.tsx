import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-16 sm:px-10">
        <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-300">
          DEFF-ACC
        </p>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-7xl">
              Passive cyber risk intelligence for Mexican municipalities.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              The MVP foundation combines a public risk-map shell, Convex-backed
              data contracts, Clerk-ready authentication, and deterministic
              remediation report scaffolding for local demos.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-950">
              <span className="rounded-full bg-cyan-300 px-4 py-2 font-medium">
                Public demo shell
              </span>
              <span className="rounded-full bg-lime-300 px-4 py-2 font-medium">
                No-secret fallback reports
              </span>
              <span className="rounded-full bg-fuchsia-300 px-4 py-2 font-medium">
                Convex + Clerk ready
              </span>
            </div>
          </div>
          <aside className="rounded-3xl border border-white/10 bg-white/10 p-6 shadow-2xl shadow-cyan-950/40 backdrop-blur">
            <h2 className="text-xl font-semibold text-white">MVP runtime surfaces</h2>
            <dl className="mt-6 grid gap-5 text-sm">
              <div>
                <dt className="text-cyan-200">Contracts</dt>
                <dd className="mt-1 text-slate-300">Municipalities, scans, findings, reports, roles, and users.</dd>
              </div>
              <div>
                <dt className="text-cyan-200">Backend</dt>
                <dd className="mt-1 text-slate-300">Source Convex schema and placeholder function paths.</dd>
              </div>
              <div>
                <dt className="text-cyan-200">Agents</dt>
                <dd className="mt-1 text-slate-300">Mastra workflow skeleton calling the TanStack AI boundary.</dd>
              </div>
            </dl>
          </aside>
        </div>
      </section>
    </main>
  );
}
