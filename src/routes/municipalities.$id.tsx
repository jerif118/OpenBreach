import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/municipalities/$id")({
  component: MunicipalityPlaceholder,
});

function MunicipalityPlaceholder() {
  const { id } = Route.useParams();

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
          Municipality detail route
        </p>
        <h1 className="mt-3 text-3xl font-semibold text-white">Detail placeholder</h1>
        <p className="mt-4 text-sm leading-6 text-slate-300">
          Dashboard navigation is wired for municipality id <span className="font-semibold text-white">{id}</span>. The full municipality detail page belongs to issue #8.
        </p>
      </section>
    </main>
  );
}
