import type { ReactNode } from "react";

export function GuardianHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: ReactNode;
}) {
  return (
    <header className="border-primary/20 flex flex-col justify-between gap-4 border-b pb-4 lg:flex-row lg:items-end">
      <div>
        <h1 className="font-display text-xl tracking-[0.14em] text-[#00dbe9] uppercase lg:text-2xl">
          {title}
        </h1>
        <p className="mt-2 font-mono text-[10px] text-[#b9cacb] lg:text-xs">
          {subtitle}
        </p>
      </div>
      {action}
    </header>
  );
}

export function GuardianPanel({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="border-primary/15 relative overflow-hidden border bg-[#2a2a2a] p-4">
      <div className="scanlines absolute inset-0 opacity-20" />
      <div className="relative z-10">
        <div className="border-primary/10 mb-4 flex items-center justify-between gap-4 border-b pb-3">
          <h2 className="font-display text-primary text-base uppercase lg:text-lg">
            {title}
          </h2>
          {action}
        </div>
        {children}
      </div>
    </section>
  );
}

export function SmallMetric({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: string;
  tone?: "primary" | "green" | "red" | "amber";
}) {
  const toneClassName =
    tone === "green"
      ? "text-[#00e639]"
      : tone === "red"
        ? "text-[#ffb4ab]"
        : tone === "amber"
          ? "text-[#ffd580]"
          : "text-[#00dbe9]";

  return (
    <div className="border-primary/10 border bg-[#131313]/70 p-4">
      <p className="font-mono text-[10px] text-[#b9cacb] uppercase">{label}</p>
      <p className={`font-display mt-2 text-xl ${toneClassName}`}>{value}</p>
    </div>
  );
}

export function ToneBadge({
  label,
  tone,
}: {
  label: string;
  tone: "green" | "red" | "cyan" | "amber";
}) {
  const className =
    tone === "green"
      ? "border-[#ecffe3] bg-[#ecffe3]/10 text-[#00e639]"
      : tone === "red"
        ? "border-[#ffb4ab] bg-[#ffb4ab]/10 text-[#ffb4ab]"
        : tone === "amber"
          ? "border-[#ffd580] bg-[#ffd580]/10 text-[#ffd580]"
          : "border-primary bg-primary/10 text-[#00dbe9]";

  return (
    <span
      className={`pixel-corner inline-flex items-center gap-2 border px-2 py-1 font-mono text-[10px] uppercase ${className}`}
    >
      {label}
    </span>
  );
}

export function EmptyPanel({ message }: { message: string }) {
  return (
    <div className="border-primary/10 border border-dashed bg-[#131313]/50 p-4 font-mono text-[10px] text-[#b9cacb]">
      {message}
    </div>
  );
}
