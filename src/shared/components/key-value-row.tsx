export function KeyValueRow({
  label,
  value,
  labelId,
}: {
  label: string;
  value: string;
  labelId?: string;
}) {
  return (
    <>
      <dt className="text-slate-400" id={labelId}>
        {label}
      </dt>
      <dd className="font-mono text-xs break-words text-slate-100">{value}</dd>
    </>
  );
}
