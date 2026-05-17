export function ObjectPreview({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-[1.4rem] border border-white/10 bg-slate-950/55 p-4">
      <p className="text-xs font-semibold tracking-[0.28em] text-teal-300 uppercase">
        {label}
      </p>
      <pre className="mt-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#030712] p-3 text-xs leading-6 text-slate-300">
        {value ? JSON.stringify(value, null, 2) : "null"}
      </pre>
    </div>
  );
}
