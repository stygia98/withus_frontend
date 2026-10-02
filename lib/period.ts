// 성과 화면 기간 필터 (PRD F-09: 최근 7/30일, 직접 지정). 날짜는 YYYY-MM-DD, 양 끝 포함
import { format, subDays } from "date-fns";

export type PeriodPreset = "ALL" | "7" | "30" | "CUSTOM";

export type Period = {
  preset: PeriodPreset;
  /** CUSTOM 일 때 입력값 */
  customFrom: string;
  customTo: string;
};

/** API 에 보낼 기간. undefined 는 그쪽 제한 없음 */
export type DateRange = { from?: string; to?: string };

export const PERIOD_LABEL: Record<PeriodPreset, string> = {
  ALL: "전체",
  "7": "최근 7일",
  "30": "최근 30일",
  CUSTOM: "직접 지정",
};

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

/** 직접 지정이 아직 완성되지 않았으면(빈 칸·시작 > 종료) null — 화면은 이전 결과를 유지한다 */
export function toRange(period: Period, today: Date = new Date()): DateRange | null {
  switch (period.preset) {
    case "ALL":
      return {};
    case "7":
    case "30":
      return { from: ymd(subDays(today, Number(period.preset) - 1)), to: ymd(today) };
    case "CUSTOM":
      if (!period.customFrom || !period.customTo || period.customFrom > period.customTo)
        return null;
      return { from: period.customFrom, to: period.customTo };
  }
}

/** "?from=…&to=…" (값이 없으면 빈 문자열) */
export function rangeQuery(range: DateRange): string {
  const params = new URLSearchParams();
  if (range.from) params.set("from", range.from);
  if (range.to) params.set("to", range.to);
  const q = params.toString();
  return q ? `?${q}` : "";
}

/** 화면 설명용: "전체 기간", "2026.09.25 ~ 2026.10.01" */
export function describeRange(range: DateRange): string {
  const dot = (s: string) => s.replaceAll("-", ".");
  if (!range.from && !range.to) return "전체 기간";
  return `${range.from ? dot(range.from) : "처음"} ~ ${range.to ? dot(range.to) : "오늘"}`;
}
