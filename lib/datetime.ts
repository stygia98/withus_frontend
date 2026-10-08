// 날짜·시각 표시 공용 헬퍼. 서버와 같은 서울 시간으로 고정해, 브라우저 시간대가 달라도 같은 값을 보여 준다

const SEOUL_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

/**
 * ISO-8601 → 서울 시간 문자열. 패턴 토큰: yyyy, MM(01), M(1), dd(01), d(1), HH, mm, ss
 * 예: formatSeoul(iso, "M/d HH:mm") → "10/2 09:30"
 */
export function formatSeoul(iso: string, pattern: string): string {
  const p = Object.fromEntries(
    SEOUL_PARTS.formatToParts(new Date(iso)).map((part) => [part.type, part.value]),
  );
  const tokens: Record<string, string> = {
    yyyy: p.year,
    MM: p.month,
    M: String(Number(p.month)),
    dd: p.day,
    d: String(Number(p.day)),
    HH: p.hour,
    mm: p.minute,
    ss: p.second,
  };
  return pattern.replace(/yyyy|MM|M|dd|d|HH|mm|ss/g, (token) => tokens[token]);
}

/** ISO-8601 → "2026-10-02 09:30" (서울 시간) */
export function formatDateTime(iso: string): string {
  return formatSeoul(iso, "yyyy-MM-dd HH:mm");
}
