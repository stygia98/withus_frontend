"use client";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "../PageHeader";
import { KpiRow } from "../Sparkline";
import { Chip, type Tone } from "../Chip";

/*
  대시보드 — 기간(오늘 · 7일 · 30일) KPI 4칸, 활성 캠페인 표, 10초마다 새로 고치는 최근 이벤트
  실제 데이터: props로 넘기고, 이벤트는 fetchEvents()를 10초마다 불러요. 없으면 예시 데이터로 보여 줘요.
*/
export type Period = "today" | "7" | "30";
export type KpiData = {
  label: string;
  value: string;
  delta: string;
  dir: "up" | "down" | "flat";
  series: number[];
};
export type Campaign = {
  name: string;
  kind: string;
  tone: Tone;
  status: string;
  target: number;
  sent?: number;
  open?: number;
  conv?: number;
  next: string;
  href?: string;
};
export type EventItem = {
  t: number;
  type: "send" | "open" | "click" | "coupon" | "fail";
  who?: string;
  ch: "메일" | "문자";
  camp: string;
  n?: number;
};

const fmt = (n: number) => n.toLocaleString("ko-KR");
const pad = (n: number) => String(n).padStart(2, "0");
const hms = (t: number) => {
  const d = new Date(t);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};
const DOT: Record<EventItem["type"], string> = {
  send: "var(--sky)",
  open: "var(--sky-ink)",
  click: "var(--ink)",
  coupon: "var(--ok)",
  fail: "var(--err)",
};
const FILTERS = [
  ["all", "전체"],
  ["send", "발송"],
  ["open", "오픈"],
  ["click", "클릭"],
  ["coupon", "쿠폰"],
  ["fail", "실패"],
] as const;

function what(e: EventItem) {
  return {
    send: `${e.ch} 발송`,
    open: "메일 오픈",
    click: `${e.ch} 링크 클릭`,
    coupon: "쿠폰 사용",
    fail: `${e.ch} ${e.n ?? 1}건 발송 실패`,
  }[e.type];
}

export function DashboardView({
  kpis,
  campaigns,
  initialEvents,
  fetchEvents,
}: {
  kpis: Record<Period, KpiData[]>;
  campaigns: Campaign[];
  initialEvents: EventItem[];
  /** 마지막으로 받은 시각 이후 새 이벤트를 돌려주세요 (10초마다 불러요) */
  fetchEvents?: (since: number) => Promise<EventItem[]>;
}) {
  const [period, setPeriod] = useState<Period>("7");
  const [events, setEvents] = useState<(EventItem & { fresh?: boolean })[]>(initialEvents);
  const [filter, setFilter] = useState<string>("all");
  const [paused, setPaused] = useState(false);
  const [lastPoll, setLastPoll] = useState(() => Date.now());
  const [, tick] = useState(0);

  useEffect(() => {
    if (paused || !fetchEvents) return;
    const id = setInterval(async () => {
      const since = lastPoll;
      const now = Date.now();
      try {
        const add = await fetchEvents(since);
        setEvents((list) =>
          [
            ...add.map((e) => ({ ...e, fresh: true })),
            ...list.map((e) => ({ ...e, fresh: false })),
          ].slice(0, 80),
        );
      } finally {
        setLastPoll(now);
      }
    }, 10_000);
    return () => clearInterval(id);
  }, [paused, fetchEvents, lastPoll]);
  useEffect(() => {
    const id = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const secs = Math.round((Date.now() - lastPoll) / 1000);
  const shown = useMemo(
    () => events.filter((e) => filter === "all" || e.type === filter).slice(0, 30),
    [events, filter],
  );
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - (period === "today" ? 0 : +period - 1));
  const range =
    period === "today"
      ? `${today.getMonth() + 1}.${pad(today.getDate())} 오늘`
      : `${from.getMonth() + 1}.${pad(from.getDate())} – ${today.getMonth() + 1}.${pad(today.getDate())}`;

  return (
    <section>
      <div className="ph">
        <div>
          <span className="eyebrow">Dashboard</span>
          <h1 className="rise">대시보드</h1>
          <p>
            <span className={`live ${paused ? "off" : ""}`} />
            <span>
              {paused ? "새로 고침 멈춤" : secs < 2 ? "방금 업데이트" : `${secs}초 전 업데이트`}
            </span>{" "}
            · 10초마다 새로 고침
          </p>
        </div>
        <div className="period">
          <span className="rlabel">{range}</span>
          <div className="seg" role="group" aria-label="기간">
            {(["today", "7", "30"] as Period[]).map((p) => (
              <button key={p} aria-pressed={period === p} onClick={() => setPeriod(p)}>
                {p === "today" ? "오늘" : `${p}일`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <KpiRow items={kpis[period]} />

      <div className="grid">
        <div className="panel">
          <h2>
            활성 캠페인 현황{" "}
            <span className="r">
              <span className="mute">{campaigns.length}개</span>
              <Link href="/campaigns" className="b g" style={{ height: 28, padding: "0 8px" }}>
                전체 보기 →
              </Link>
            </span>
          </h2>
          <div className="tw">
            <table>
              <thead>
                <tr>
                  <th>캠페인</th>
                  <th>상태</th>
                  <th className="r">대상</th>
                  <th className="r">발송</th>
                  <th>오픈율</th>
                  <th className="r">쿠폰 전환</th>
                  <th>다음 발송</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.name}>
                    <td>
                      <span className="t">{c.name}</span>
                      <span className="s">{c.kind}</span>
                    </td>
                    <td>
                      <Chip tone={c.tone}>{c.status}</Chip>
                    </td>
                    <td className="r" data-l="대상">
                      {fmt(c.target)}
                    </td>
                    <td className="r" data-l="발송">
                      {c.sent ? fmt(c.sent) : "—"}
                    </td>
                    <td data-l="오픈율">
                      {c.open != null ? (
                        <>
                          <span className="bar">
                            <i style={{ width: `${c.open}%` }} />
                          </span>
                          {c.open.toFixed(1)}%
                        </>
                      ) : (
                        <span className="mute">—</span>
                      )}
                    </td>
                    <td className="r" data-l="쿠폰 전환">
                      {c.conv != null ? `${c.conv.toFixed(1)}%` : "—"}
                    </td>
                    <td className="mute nx" data-l="다음 발송">
                      {c.next}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <h2>
            최근 이벤트{" "}
            <span className="r">
              <button
                className="b g"
                style={{ height: 28, padding: "0 8px" }}
                aria-pressed={paused}
                onClick={() => setPaused((p) => !p)}
              >
                {paused ? "다시 받기" : "일시정지"}
              </button>
            </span>
          </h2>
          <div className="filters" role="group" aria-label="이벤트 종류">
            {FILTERS.map(([id, label]) => (
              <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>
                {label}
              </button>
            ))}
          </div>
          <ul className="log" aria-live="polite">
            {shown.length ? (
              shown.map((e, i) => (
                <li
                  key={e.t + "-" + i}
                  className={`${e.type === "fail" ? "fail" : ""} ${e.fresh ? "new" : ""}`}
                >
                  <time>{hms(e.t)}</time>
                  <span className="dot" style={{ background: DOT[e.type] }} />
                  <span>
                    {e.type !== "fail" && e.who ? (
                      <>
                        <span className="who">{e.who}</span> ·{" "}
                      </>
                    ) : null}
                    <span className="what">{what(e)}</span>
                    <span className="meta">
                      {e.camp}
                      {e.type === "fail" ? " · 수신 번호 확인 필요" : ""}
                    </span>
                  </span>
                </li>
              ))
            ) : (
              <li className="empty" style={{ display: "block" }}>
                이 종류의 이벤트가 아직 없어요
              </li>
            )}
          </ul>
        </div>
      </div>
    </section>
  );
}
