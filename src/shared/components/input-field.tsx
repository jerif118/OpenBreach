import type { HTMLAttributes, HTMLInputTypeAttribute } from "react";

export function InputField({
  inputMode,
  label,
  onChange,
  placeholder,
  type = "text",
  value,
  error,
  helpText,
  id,
}: {
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  label: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: HTMLInputTypeAttribute;
  value: string;
  error?: string;
  helpText?: string;
  id?: string;
}) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;

  return (
    <div className="grid gap-2">
      <label htmlFor={inputId} className="text-sm font-medium text-slate-200">
        {label}
      </label>
      <input
        aria-describedby={error ? errorId : helpText ? helpId : undefined}
        aria-invalid={error ? true : undefined}
        className="rounded-2xl border border-white/10 bg-slate-950 px-3 py-2.5 text-sm text-white transition outline-none placeholder:text-slate-500 focus:border-teal-200 focus:ring-2 focus:ring-teal-200/30 aria-invalid:border-rose-300 aria-invalid:ring-rose-200/30"
        id={inputId}
        inputMode={inputMode}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {error ? (
        <p className="text-xs text-rose-300" id={errorId} role="alert">
          {error}
        </p>
      ) : helpText ? (
        <p className="text-xs text-slate-400" id={helpId}>
          {helpText}
        </p>
      ) : null}
    </div>
  );
}
