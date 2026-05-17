export function TextAreaField({
  helpText,
  label,
  onChange,
  value,
  error,
  id,
  maxLength,
}: {
  helpText?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
  error?: string;
  id?: string;
  maxLength?: number;
}) {
  const inputId = id ?? `textarea-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const errorId = `${inputId}-error`;
  const helpId = `${inputId}-help`;
  const charCount = value.length;

  return (
    <div className="grid gap-2">
      <div className="flex justify-between">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-200">
          {label}
        </label>
        {maxLength ? (
          <span className="text-xs text-slate-400">
            {charCount}/{maxLength}
          </span>
        ) : null}
      </div>
      <textarea
        aria-describedby={error ? errorId : helpText ? helpId : undefined}
        aria-invalid={error ? true : undefined}
        className="min-h-40 rounded-[1.5rem] border border-white/10 bg-slate-950 px-3 py-3 text-sm leading-6 text-white transition outline-none placeholder:text-slate-500 focus:border-teal-200 focus:ring-2 focus:ring-teal-200/30"
        id={inputId}
        maxLength={maxLength}
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
