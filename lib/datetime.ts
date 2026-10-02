// 날짜·시각 표시 공용 헬퍼. 서버와 같은 서울 시간으로 고정해, 브라우저 시간대가 달라도 같은 값을 보여 준다

const SEOUL_DATE_TIME = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** ISO-8601 → "2026-10-02 09:30" (서울 시간) */
export function formatDateTime(iso: string): string {
  const part = Object.fromEntries(
    SEOUL_DATE_TIME.formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return `${part.year}-${part.month}-${part.day} ${part.hour}:${part.minute}`;
}
