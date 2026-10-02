"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import Link from "next/link";

import { PeriodFilter } from "@/components/analytics/period-filter";
import { DailySendsChart } from "@/components/dashboard/daily-sends-chart";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, api, type Page } from "@/lib/api-client";
import {
  type CampaignSummaryItem,
  type DailySend,
  type DashboardSummary,
  type QueueStatus,
  type RecentEvent,
  type RecentEvents,
  formatCount,
  formatRate,
} from "@/lib/dashboard";
import { type DateRange, describeRange, rangeQuery, usePeriodRange } from "@/lib/period";
import { queryKeys } from "@/lib/query-keys";

const EVENT_POLL_MS = 10_000;
const EVENT_LIMIT = 20;

/**
 * 메인 대시보드 (PRD 4장 /dashboard, F-09). 기간 KPI(기본 최근 7일, 7/30일·직접 지정), 일별 발송, 발송 큐,
 * 활성 캠페인, 최근 이벤트. 기간 필터는 KPI 에만 걸린다(일별 발송은 자체 기간, 큐·이벤트는 실시간)
 */
export function DashboardView() {
  // '최근 7일'은 날짜를 보내지 않고 서버 기본값(서울 기준 오늘 포함 7일)을 쓴다
  const { period, changePeriod, periodKey, currentRange } = usePeriodRange("7", "7");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">대시보드</h1>
          <p className="text-muted-foreground text-sm">
            봇 이벤트와 테스트·안내 발송은 모든 지표에서 뺍니다.
          </p>
        </div>
        <PeriodFilter value={period} onChange={changePeriod} presets={["7", "30", "CUSTOM"]} />
      </header>
      <KpiRow periodKey={periodKey} currentRange={currentRange} />
      <div className="grid gap-6 lg:grid-cols-3">
        <DailySendsCard />
        <QueueCard />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <ActiveCampaignsCard />
        <RecentEventsCard />
      </div>
    </div>
  );
}

function KpiRow({ periodKey, currentRange }: { periodKey: string; currentRange: () => DateRange }) {
  const { data, error } = useQuery({
    queryKey: queryKeys.dashboard.summary(periodKey),
    // 날짜는 조회 시점에 계산한다 — 켜 둔 채 자정이 지나도 다음 조회부터 새 날짜
    queryFn: () => api<DashboardSummary>(`/api/v1/dashboard/summary${rangeQuery(currentRange())}`),
    placeholderData: keepPreviousData,
  });
  // 기간 초과(최대 366일) 같은 입력 오류는 서버 메시지를 그대로 보여 준다
  if (error) {
    return (
      <ErrorText>
        {error instanceof ApiError && error.status === 400
          ? error.message
          : "KPI 를 불러오지 못했습니다."}
      </ErrorText>
    );
  }
  const kpi = data?.kpi;
  // 서버가 실제로 적용한 기간(생략 시 기본값)을 보여 준다
  const shown = data ? describeRange(data.from, data.to) : "불러오는 중";
  return (
    <section aria-label={`핵심 지표 (${shown})`} className="space-y-2">
      <p className="text-muted-foreground text-sm" aria-live="polite">
        발송일 기준 {shown}
      </p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="총 발송(성공)"
          value={kpi ? formatCount(kpi.sent) : "–"}
          hint={
            kpi
              ? `시도 ${formatCount(kpi.attempted)} · 성공률 ${formatRate(kpi.successRate)}`
              : undefined
          }
        />
        <StatTile
          label="오픈율"
          value={kpi ? formatRate(kpi.openRate) : "–"}
          hint={kpi ? `고유 오픈 ${formatCount(kpi.uniqueOpens)}명` : undefined}
        />
        <StatTile
          label="클릭률"
          value={kpi ? formatRate(kpi.clickRate) : "–"}
          hint={kpi ? `고유 클릭 ${formatCount(kpi.uniqueClicks)}명` : undefined}
        />
        <StatTile
          label="전환율(쿠폰 사용)"
          value={kpi ? formatRate(kpi.conversionRate) : "–"}
          hint={kpi ? `쿠폰 사용 ${formatCount(kpi.couponUsed)}명` : undefined}
        />
      </div>
    </section>
  );
}

function DailySendsCard() {
  const days = 14;
  const { data, isError } = useQuery({
    queryKey: queryKeys.dashboard.dailySends(days),
    queryFn: () => api<DailySend[]>(`/api/v1/dashboard/daily-sends?days=${days}`),
  });
  return (
    <Card className="lg:col-span-2">
      <CardHeader>
        <CardTitle>일별 발송 성공</CardTitle>
        <CardDescription>최근 {days}일</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorText>일별 발송을 불러오지 못했습니다.</ErrorText>
        ) : data ? (
          <DailySendsChart data={data} />
        ) : (
          <div className="h-56" />
        )}
      </CardContent>
    </Card>
  );
}

function QueueCard() {
  const { data, isError } = useQuery({
    queryKey: queryKeys.dashboard.queue,
    queryFn: () => api<QueueStatus>("/api/v1/dashboard/queue"),
    refetchInterval: EVENT_POLL_MS,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>발송 큐</CardTitle>
        <CardDescription>
          {data
            ? data.adSendWindowOpen
              ? "광고성 발송 가능 시간"
              : "광고성 발송 보류 시간 (08:00~20:50 밖)"
            : " "}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorText>발송 큐를 불러오지 못했습니다.</ErrorText>
        ) : (
          <dl className="grid grid-cols-3 gap-2 text-center">
            <QueueNumber label="대기" value={data?.pending} />
            <QueueNumber label="재시도" value={data?.retrying} />
            <QueueNumber label="발송 중" value={data?.sending} />
            <div className="text-muted-foreground col-span-3 mt-2 text-xs">
              {data?.expectedEndAt
                ? `초당 ${data.ratePerSecond}건 · 예상 종료 ${format(parseISO(data.expectedEndAt), "M/d HH:mm")}`
                : data
                  ? "남은 발송이 없습니다."
                  : ""}
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}

function QueueNumber({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <dt className="text-muted-foreground text-xs">{label}</dt>
      <dd className="text-xl font-semibold tabular-nums">
        {value === undefined ? "–" : formatCount(value)}
      </dd>
    </div>
  );
}

function ActiveCampaignsCard() {
  // 활성 캠페인 목록은 팀원2 캠페인 API 를 그대로 쓴다 (API_SPEC 10장 안내)
  const { data, isError } = useQuery({
    queryKey: queryKeys.dashboard.activeCampaigns,
    queryFn: () => api<Page<CampaignSummaryItem>>("/api/v1/campaigns?status=ACTIVE&page=0&size=5"),
    retry: false,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>활성 캠페인</CardTitle>
        <CardDescription>누르면 캠페인 성과로 이동합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-muted-foreground text-sm">캠페인 목록을 불러올 수 없습니다.</p>
        ) : data && data.content.length === 0 ? (
          <p className="text-muted-foreground text-sm">진행 중인 캠페인이 없습니다.</p>
        ) : (
          <ul className="divide-y">
            {data?.content.map((c) => (
              <li key={c.campaignId}>
                <Link
                  href={`/analytics/${c.campaignId}`}
                  className="hover:bg-muted/50 block rounded px-1 py-2 text-sm"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentEventsCard() {
  const queryClient = useQueryClient();
  // 10초마다 직전 최신 이벤트 이후만 받아 앞에 붙인다 (API_SPEC 10장 events)
  const { data, isError } = useQuery({
    queryKey: queryKeys.dashboard.events,
    queryFn: async () => {
      const prev = queryClient.getQueryData<RecentEvent[]>(queryKeys.dashboard.events) ?? [];
      const after = prev[0]?.eventId;
      const res = await api<RecentEvents>(
        `/api/v1/dashboard/events?size=${EVENT_LIMIT}${after ? `&after=${after}` : ""}`,
      );
      return [...res.events, ...prev].slice(0, EVENT_LIMIT);
    },
    refetchInterval: EVENT_POLL_MS,
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 이벤트</CardTitle>
        <CardDescription>10초마다 새로 고침</CardDescription>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorText>이벤트를 불러오지 못했습니다.</ErrorText>
        ) : data && data.length === 0 ? (
          <p className="text-muted-foreground text-sm">아직 오픈·클릭 이벤트가 없습니다.</p>
        ) : (
          // 20줄을 다 펼치면 옆 카드보다 길어지므로 높이를 제한하고 안에서 스크롤한다
          <ul className="max-h-80 divide-y overflow-y-auto text-sm">
            {data?.map((e) => (
              <li key={e.eventId} className="flex items-center gap-3 py-2">
                <span className="text-muted-foreground w-24 shrink-0 tabular-nums">
                  {format(parseISO(e.occurredAt), "M/d HH:mm:ss")}
                </span>
                <span className="w-10 shrink-0 font-medium">
                  {e.eventType === "OPEN" ? "오픈" : "클릭"}
                </span>
                <span className="truncate">
                  {e.customerName ?? "이름 없음"} · {e.campaignName ?? "캠페인 없음"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="text-destructive text-sm">{children}</p>;
}
