// 성과 화면 기간 필터 (PRD F-09: 최근 7/30일, 직접 지정). 날짜는 YYYY-MM-DD, 양 끝 포함
// '오늘'은 브라우저 시간대가 아니라 서버와 같은 서울 날짜로 계산한다
import { useCallback, useEffect, useMemo, useState } from "react";

export type PeriodPreset = "ALL" | "7" | "30" | "CUSTOM";

export type Period = {
  preset: PeriodPreset;
  /** CUSTOM 일 때 입력값 */
  customFrom: string;
  customTo: string;
};

/** API 에 보낼 기간. 둘 다 없으면 서버 기본값(대시보드 최근 7일, 캠페인 전체 기간) */
export type DateRange = { from?: string; to?: string };

/** 서버와 같은 조회 기간 상한 (API_SPEC 10장) */
export const MAX_PERIOD_DAYS = 366;

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  ALL: "전체",
  "7": "최근 7일",
  "30": "최근 30일",
  CUSTOM: "직접 지정",
};

const DAY_MS = 86_400_000;
/** 서울은 일광 절약 시간이 없어 UTC+9 고정 */
const SEOUL_OFFSET_MS = 9 * 3_600_000;

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

/** 다음 서울 자정까지 남은 밀리초 */
function msUntilSeoulMidnight(now: number = Date.now()): number {
  const nextMidnight =
    (Math.floor((now + SEOUL_OFFSET_MS) / DAY_MS) + 1) * DAY_MS - SEOUL_OFFSET_MS;
  return nextMidnight - now;
}

/** 서울 날짜. 화면을 켜 둔 채 자정이 지나면 새 날짜로 다시 그린다 */
export function useSeoulToday(): string {
  const [today, setToday] = useState(() => seoulToday());
  useEffect(() => {
    const timer = setTimeout(() => setToday(seoulToday()), msUntilSeoulMidnight() + 1_000);
    return () => clearTimeout(timer);
  }, [today]);
  return today;
}

/** YYYY-MM-DD 에서 days 일 전 (시간대 영향 없이 달력 날짜로만 계산) */
function minusDays(ymd: string, days: number): string {
  const date = new Date(`${ymd}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

/** 양 끝 포함 일수 */
function daysInclusive(from: string, to: string): number {
  return (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS + 1;
}

/** 직접 지정 입력의 문제. 빈 칸은 아직 입력 중이라 문제로 보지 않는다(null) */
export function customRangeError(period: Period): string | null {
  const { customFrom, customTo } = period;
  if (period.preset !== "CUSTOM" || !customFrom || !customTo) return null;
  if (customFrom > customTo) return "종료일은 시작일보다 빠를 수 없습니다.";
  if (daysInclusive(customFrom, customTo) > MAX_PERIOD_DAYS)
    return `조회 기간은 최대 ${MAX_PERIOD_DAYS}일입니다.`;
  return null;
}

/** 조회해도 되는 기간인가 — 직접 지정은 두 칸이 모두 있고 문제가 없어야 한다(입력 중 요청을 보내지 않는다) */
export function isComplete(period: Period): boolean {
  return (
    period.preset !== "CUSTOM" ||
    (period.customFrom !== "" && period.customTo !== "" && customRangeError(period) === null)
  );
}

/** 완성된 기간 → 조회 범위. serverDefault 프리셋은 날짜를 보내지 않고 서버 기본값에 맡긴다 */
export function toRange(period: Period, serverDefault: PeriodPreset, today: string): DateRange {
  if (period.preset === serverDefault || period.preset === "ALL") return {};
  if (period.preset === "CUSTOM") return { from: period.customFrom, to: period.customTo };
  return { from: minusDays(today, Number(period.preset) - 1), to: today };
}

/**
 * 기간 필터 상태. 입력 중인 값(period)과 마지막으로 조회한 완성 값(applied)을 한 상태로 들고,
 * 범위는 서울 날짜(today)와 함께 계산한다 — 자정이 지나면 today 가 바뀌어 범위·쿼리 키가 새 날짜가 된다.
 */
export function usePeriodRange(initial: PeriodPreset, serverDefault: PeriodPreset) {
  const [state, setState] = useState(() => {
    const period: Period = { preset: initial, customFrom: "", customTo: "" };
    return { period, applied: period };
  });
  const today = useSeoulToday();

  const changePeriod = useCallback((next: Period) => {
    setState((prev) => ({ period: next, applied: isComplete(next) ? next : prev.applied }));
  }, []);
  const range = useMemo(
    () => toRange(state.applied, serverDefault, today),
    [state.applied, serverDefault, today],
  );
  return { period: state.period, changePeriod, range, today };
}

/** "?from=…&to=…" (값이 없으면 빈 문자열) */
export function rangeQuery(range: DateRange): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const q = params.toString();
  return q ? `?${q}` : "";
}

/** 서버 응답의 from·to 가 '전체 기간'인가 (필드가 없거나 null) */
export function isWholePeriod(from?: string | null, to?: string | null): boolean {
  return !from && !to;
}

/** 화면 설명용: 서버 응답의 from·to 로 "전체 기간" 또는 "2026.09.25 ~ 2026.10.01" */
export function describeRange(from?: string | null, to?: string | null): string {
  if (isWholePeriod(from, to) || !from || !to) return "전체 기간";
  const dot = (s: string) => s.replaceAll("-", ".");
  return `${dot(from)} ~ ${dot(to)}`;
}
