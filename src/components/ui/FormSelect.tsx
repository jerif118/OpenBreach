import {
  INPUT_BASE,
  INPUT_FOCUS,
  INPUT_ERROR,
  LABEL_BASE,
  ERROR_TEXT,
} from "~/lib/terminal-styles";

// ============================================================================
// Types
// ============================================================================

export interface FormSelectOption {
  value: string;
  label: string;
}

export interface FormSelectProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: FormSelectOption[];
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function FormSelect({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required,
  disabled,
}: FormSelectProps) {
  const inputClass = error
    ? `${INPUT_BASE} ${INPUT_ERROR}`
    : `${INPUT_BASE} ${INPUT_FOCUS}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="w-full">
      <label htmlFor={name} className={LABEL_BASE}>
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          aria-invalid={!!error}
          aria-describedby={error ? `${name}-error` : undefined}
          className={`${inputClass} appearance-none pr-10`}
        >
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              className="bg-slate-900 text-slate-200"
            >
              {opt.label}
            </option>
          ))}
        </select>
        {/* Custom cyan chevron */}
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
          <svg
            className="h-4 w-4 text-cyan-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </div>
      {error && (
        <p
          id={`${name}-error`}
          className={`mt-1.5 font-mono text-sm ${ERROR_TEXT}`}
        >
          {error}
        </p>
      )}
    </div>
  );
}
