import type { ReactNode } from "react";

export type Tone = "ok" | "warn" | "err" | "info" | "mute";

/** 상태 표시 — 진행 중(ok) · 일시정지(warn) · 실패(err) · 예약(info) · 완료(mute) */
export function Chip({ tone = "mute", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`chip c-${tone}`}>{children}</span>;
}
