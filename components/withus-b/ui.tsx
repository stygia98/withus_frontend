"use client";
/**
 * withus 시안 B — 기본 부품
 * Logo · Button · Status · Pill · Card · PageHeader · Segmented · KpiCard · Field · Icon
 * 그래프는 기술 스택(shadcn Chart · Recharts)으로 그린다 — components/dashboard/daily-sends-chart.tsx
 */
import { type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* 로고: 고딕 굵게 소문자 withus + 파랑 그라데이션 작은 사각형 하나 */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <span className="wb-logo" style={{ fontSize: size }}>
      <i aria-hidden />
      withus
    </span>
  );
}

/* 버튼 */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  block?: boolean;
  loading?: boolean;
};
export function Button({
  variant = "primary",
  size = "md",
  block,
  loading,
  className,
  children,
  ...rest
}: BtnProps) {
  return (
    <button
      className={cx(
        "wb-btn",
        `wb-btn--${variant}`,
        size !== "md" && `wb-btn--${size}`,
        block && "wb-btn--block",
        className,
      )}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <span className="wb-spin" aria-hidden />}
      {children}
    </button>
  );
}

/* 상태: 점 + 글자 (배경색 없음) */
export type Tone = "ok" | "warn" | "err" | "info" | "mute";
export function Status({ tone = "mute", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={cx("wb-status", tone !== "mute" && `wb-status--${tone}`)}>{children}</span>
  );
}
/* 마감 · 기한처럼 눈에 띄어야 할 때만 쓰는 알약 */
export function Pill({
  tone = "info",
  children,
}: {
  tone?: Exclude<Tone, "mute">;
  children: ReactNode;
}) {
  return <span className={`wb-pill wb-pill--${tone}`}>{children}</span>;
}

/* 카드 */
export function Card({
  title,
  aside,
  grey,
  children,
  className,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  grey?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cx("wb-card", grey && "wb-card--grey", className)}>
      {(title || aside) && (
        <header className="wb-card__head">
          {title && <h3 className="wb-card__title">{title}</h3>}
          {aside && <span className="wb-card__aside">{aside}</span>}
        </header>
      )}
      {children}
    </section>
  );
}

/* 화면 제목: 영어 작은 제목 + 명조 큰 제목 (강조 상자 없음) */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="wb-ph">
      <div>
        <span className="wb-eyebrow">{eyebrow}</span>
        <h1 className="wb-anim">{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="wb-ph__actions">{actions}</div>}
    </div>
  );
}

/* 기간 선택 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="wb-seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* 숫자 카드: 4개 모두 회색 */
export function KpiCard({
  label,
  value,
  sub,
  delta,
}: {
  label: string;
  value: string;
  sub?: ReactNode;
  delta?: { text: string; dir: "up" | "down" | "flat" };
}) {
  return (
    <div className="wb-kpi">
      <span className="wb-kpi__label">{label}</span>
      <p className="wb-kpi__value" style={{ margin: "16px 0 0" }}>
        {value}
      </p>
      {(sub || delta) && (
        <p className="wb-kpi__sub" style={{ margin: "8px 0 0" }}>
          {delta && (
            <span className={delta.dir === "flat" ? undefined : `wb-kpi__delta--${delta.dir}`}>
              {delta.text}{" "}
            </span>
          )}
          {sub}
        </p>
      )}
    </div>
  );
}

/* 입력칸 */
export function Field({
  label,
  error,
  id,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; error?: string; id: string }) {
  return (
    <div className="wb-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        className="wb-input"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : undefined}
        {...rest}
      />
      {error && (
        <span className="wb-field__error" id={`${id}-err`}>
          {error}
        </span>
      )}
    </div>
  );
}

/* 선 아이콘 (메뉴용) */
const ICONS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  report: <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
  customers: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2 20c.8-3.4 3.4-5 7-5s6.2 1.6 7 5" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 15c2 .6 3.4 2.2 4 5" />
    </>
  ),
  campaigns: <path d="m3 11 18-8-8 18-2-8z" />,
  coupons: (
    <>
      <path d="M3 8a2 2 0 0 0 0 8v3h18v-3a2 2 0 0 1 0-8V5H3z" />
      <path d="M14 5v14" strokeDasharray="2 2" />
    </>
  ),
  templates: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  users: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />
    </>
  ),
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  check: <path d="m5 12 5 5 9-10" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1" />
      <path d="M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  wifi: (
    <>
      <path d="M2 9a15 15 0 0 1 20 0M5 13a10 10 0 0 1 14 0M8.5 16.5a5 5 0 0 1 7 0" />
      <circle cx="12" cy="20" r="1" />
    </>
  ),
};
export type IconName = keyof typeof ICONS;
export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}
