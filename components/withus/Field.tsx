import type { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  full?: boolean;
};

/** 입력칸 — 오류가 있으면 빨간 테두리와 안내 문구 */
export function Field({ label, hint, error, full, className = "", ...input }: Props) {
  return (
    <label className={`fld ${error ? "err" : ""} ${full ? "full" : ""} ${className}`.trim()}>
      {label}
      <input {...input} aria-invalid={!!error || undefined} />
      {error ? <small className="e">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}
