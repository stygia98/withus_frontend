// 성과 화면 기간 필터 (PRD F-09: 최근 7/30일, 직접 지정). 날짜는 YYYY-MM-DD, 양 끝 포함
// '오늘'은 브라우저 시간대가 아니라 서버와 같은 서울 날짜로 계산한다
import { useState } from "react";

export type PeriodPreset = "ALL" | "7" | "30" | "CUSTOM";

export type Period = {
  preset: PeriodPreset;
  /** CUSTOM 일 때 입력값 */
  customFrom: string;
  customTo: string;
};

/** API 에 보낼 기간. 둘 다 없으면 서버 기본값(대시보드 최근 7일, 캠페인 전체 기간) */
export type DateRange = { from?: string; to?: string };

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  ALL: "전체",
  "7": "최근 7일",
  "30": "최근 30일",
  CUSTOM: "직접 지정",
};

const SEOUL_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 서울 기준 오늘 (YYYY-MM-DD). 브라우저가 다른 시간대여도 서버(Asia/Seoul)와 같은 날짜다 */
export function seoulToday(now: Date = new Date()): string {
  return SEOUL_DATE.format(now);
}

/** YYYY-MM-DD 에서 days 일 전 (시간대 영향 없이 달력 날짜로만 계산) */
function minusDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** 직접 지정이 완성됐는가(두 칸 모두 입력, 시작 ≤ 종료) */
export function isComplete(period: Period): boolean {
  return (
    period.preset !== "CUSTOM" ||
    (period.customFrom !== "" && period.customTo !== "" && period.customFrom <= period.customTo)
  );
}

/** 완성된 기간 → 조회 범위. serverDefault 프리셋은 날짜를 보내지 않고 서버 기본값에 맡긴다 */
export function toRange(
  period: Period,
  serverDefault: PeriodPreset,
  today: string = seoulToday(),
): DateRange {
  if (period.preset === serverDefault || period.preset === "ALL") return {};
  if (period.preset === "CUSTOM") return { from: period.customFrom, to: period.customTo };
  return { from: minusDays(today, Number(period.preset) - 1), to: today };
}

/**
 * 기간 필터 상태. 쿼리 키에는 프리셋(직접 지정이면 그 날짜)만 넣고, 실제 날짜는 조회할 때 계산한다 —
 * 화면을 켜 둔 채 자정이 지나도 다음 조회부터 새 날짜가 쓰인다.
 * 직접 지정 입력이 덜 끝났으면 마지막으로 완성된 기간으로 계속 조회한다.
 */
export function usePeriodRange(initial: PeriodPreset, serverDefault: PeriodPreset) {
  const [period, setPeriod] = useState<Period>({ preset: initial, customFrom: "", customTo: "" });
  const [applied, setApplied] = useState<Period>(period);

  function changePeriod(next: Period) {
    setPeriod(next);
    if (isComplete(next)) setApplied(next);
  }

  const periodKey =
    applied.preset === "CUSTOM" ? `${applied.customFrom}~${applied.customTo}` : applied.preset;
  const currentRange = () => toRange(applied, serverDefault);
  return { period, changePeriod, periodKey, currentRange };
}

/** "?from=…&to=…" (값이 없으면 빈 문자열) */
export function rangeQuery(range: DateRange): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const q = params.toString();
  return q ? `?${q}` : "";
}

/** 화면 설명용: 서버 응답의 from·to 로 "전체 기간" 또는 "2026.09.25 ~ 2026.10.01" */
export function describeRange(from: string | null, to: string | null): string {
  if (!from || !to) return "전체 기간";
  const dot = (s: string) => s.replaceAll("-", ".");
  return `${dot(from)} ~ ${dot(to)}`;
}
