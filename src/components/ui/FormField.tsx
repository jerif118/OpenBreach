import type { InputHTMLAttributes } from "react";
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

export interface FormFieldProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "value" | "onChange"
> {
  label: string;
  name: string;
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  type?: "text" | "url" | "number";
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function FormField({
  label,
  name,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  required,
  disabled,
  ...rest
}: FormFieldProps) {
  const inputClass = error
    ? `${INPUT_BASE} ${INPUT_ERROR}`
    : `${INPUT_BASE} ${INPUT_FOCUS}`;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="w-full">
      <label htmlFor={name} className={LABEL_BASE}>
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
        className={inputClass}
        {...rest}
      />
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
