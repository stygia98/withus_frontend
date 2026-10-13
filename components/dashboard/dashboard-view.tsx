"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { useState } from "react";

import { PeriodFilter } from "@/components/analytics/period-filter";
import { PageHeader } from "@/components/withus";
import { DailySendsChart } from "@/components/dashboard/daily-sends-chart";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ApiError, api, type Page } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_TYPE_LABEL,
  type CampaignSummaryItem,
  type DailySend,
  type DashboardSummary,
  type QueueStatus,
  type RecentEvent,
  type RecentEvents,
  formatCount,
  formatRate,
} from "@/lib/dashboard";
import { formatSeoul } from "@/lib/datetime";
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
  const { period, changePeriod, range, today } = usePeriodRange("7", "7");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <PageHeader
        en="Dashboard"
        title={<span className="hl">대시보드</span>}
        sub="봇 이벤트와 테스트·안내 발송은 모든 지표에서 뺍니다."
        actions={
          <>
            <PeriodFilter value={period} onChange={changePeriod} presets={["7", "30", "CUSTOM"]} />
          </>
        }
      />
      <KpiRow range={range} today={today} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <DailySendsCard />
        <div className="flex flex-col gap-6">
          <AiSummaryCard />
          <QueueCard />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <ActiveCampaignsCard />
        <RecentEventsCard />
      </div>
    </div>
  );
}

function KpiRow({ range, today }: { range: DateRange; today: string }) {
  const { data, error, isFetching, refetch } = useQuery({
    // today: 기간을 생략(서버 기본값 최근 7일)해도 서울 자정이 지나면 키가 바뀌어 새로 조회한다
    queryKey: queryKeys.dashboard.summary(range.from, range.to, today),
    queryFn: () => api<DashboardSummary>(`/api/v1/dashboard/summary${rangeQuery(range)}`),
    placeholderData: keepPreviousData,
  });
  if (error) {
    // 기간 초과(최대 366일) 같은 입력 오류는 서버 메시지를 그대로, 그 밖의 오류는 다시 시도할 수 있게 한다
    const invalidInput = error instanceof ApiError && error.status === 400;
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="text-destructive text-sm">
          {invalidInput ? error.message : "KPI 를 불러오지 못했습니다."}
        </p>
        {!invalidInput && (
          <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
            다시 시도
          </Button>
        )}
      </div>
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
          tone="lav"
          label="총 발송(성공)"
          value={kpi ? formatCount(kpi.sent) : "–"}
          hint={
            kpi
              ? `시도 ${formatCount(kpi.attempted)} · 성공률 ${formatRate(kpi.successRate)}`
              : undefined
          }
        />
        <StatTile
          tone="mint"
          label="오픈율"
          value={kpi ? formatRate(kpi.openRate) : "–"}
          hint={kpi ? `고유 오픈 ${formatCount(kpi.uniqueOpens)}명` : undefined}
        />
        <StatTile
          tone="cream"
          label="클릭률"
          value={kpi ? formatRate(kpi.clickRate) : "–"}
          hint={kpi ? `고유 클릭 ${formatCount(kpi.uniqueClicks)}명` : undefined}
        />
        <StatTile
          tone="pink"
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
    <Card>
      <CardHeader>
        <CardTitle>일별 발송 성공</CardTitle>
        <CardDescription>최근 {days}일</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col">
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

/**
 * 시안의 AI 요약 카드. 진행 중인 첫 캠페인의 최근 AI-03 요약을 읽기만 한다(생성·재생성은 캠페인 성과 화면).
 * 대시보드 전체를 요약하는 API 는 없다
 */
function AiSummaryCard() {
  const { data: campaigns } = useQuery({
    queryKey: queryKeys.dashboard.activeCampaigns,
    queryFn: () => api<Page<CampaignSummaryItem>>("/api/v1/campaigns?status=ACTIVE&page=0&size=5"),
    retry: false,
  });
  const campaign = campaigns?.content[0];
  const { data: report, isPending } = useQuery({
    queryKey: queryKeys.analytics.report(campaign?.campaignId ?? 0),
    queryFn: () =>
      api<{ content: string; createdAt: string } | null>(
        `/api/v1/ai/reports/campaigns/${campaign?.campaignId}`,
      ),
    enabled: !!campaign,
    retry: false,
  });
  return (
    <Card className="flex-1 bg-[var(--wu-cream)] ring-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-1.5">
          <Sparkles className="size-4" aria-hidden />
          AI 요약
        </CardTitle>
        <CardDescription className="text-foreground/70">
          {campaign ? campaign.name : "진행 중인 캠페인 기준"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!campaign ? (
          <p className="text-foreground/70">진행 중인 캠페인이 없습니다.</p>
        ) : isPending ? (
          <p className="text-foreground/70">불러오는 중...</p>
        ) : report ? (
          <>
            <p className="leading-6 break-keep">{report.content}</p>
            <p className="text-foreground/70 text-xs">
              {formatSeoul(report.createdAt, "M/d HH:mm")} 기준 ·{" "}
              <Link href={`/analytics/${campaign.campaignId}`} className="underline">
                자세히
              </Link>
            </p>
          </>
        ) : (
          <p className="text-foreground/70">
            아직 만든 요약이 없습니다.{" "}
            <Link href={`/analytics/${campaign.campaignId}`} className="underline">
              성과 화면에서 생성
            </Link>
          </p>
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
    <Card className="gap-2 py-3">
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
            <div className="text-muted-foreground col-span-3 text-xs">
              {data?.expectedEndAt
                ? `초당 ${data.ratePerSecond}건 · 예상 종료 ${formatSeoul(data.expectedEndAt, "M/d HH:mm")}`
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
        <CardTitle>진행 중인 캠페인</CardTitle>
        <CardAction>
          <Link href="/campaigns" className="text-muted-foreground hover:text-foreground text-xs">
            전체 보기 →
          </Link>
        </CardAction>
      </CardHeader>
      <CardContent>
        {isError ? (
          <p className="text-muted-foreground text-sm">캠페인 목록을 불러올 수 없습니다.</p>
        ) : data && data.content.length === 0 ? (
          <p className="text-muted-foreground text-sm">진행 중인 캠페인이 없습니다.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-muted-foreground text-left text-xs">
              <tr>
                <th className="pb-2 font-medium">캠페인</th>
                <th className="pb-2 font-medium">유형</th>
                <th className="pb-2 font-medium">상태</th>
                <th className="pb-2 text-right font-medium">시작</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data?.content.map((c) => (
                <tr key={c.campaignId} className="hover:bg-muted/50">
                  <td className="py-2 pr-2">
                    <Link href={`/analytics/${c.campaignId}`} className="font-medium">
                      {c.name}
                    </Link>
                  </td>
                  <td className="text-muted-foreground py-2 pr-2">{CAMPAIGN_TYPE_LABEL[c.type]}</td>
                  <td className="py-2 pr-2">
                    <span className="bg-[var(--wu-mint)] rounded px-1.5 py-0.5 text-xs">
                      {CAMPAIGN_STATUS_LABEL[c.status]}
                    </span>
                  </td>
                  <td className="text-muted-foreground py-2 text-right tabular-nums">
                    {c.startedAt ? formatSeoul(c.startedAt, "M/d HH:mm") : "–"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLICK">("ALL");
  const shown = data?.filter((e) => filter === "ALL" || e.eventType === filter);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="whitespace-nowrap">실시간 이벤트</CardTitle>
        <CardAction className="flex gap-1">
          {(["ALL", "OPEN", "CLICK"] as const).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs whitespace-nowrap",
                filter === f ? "bg-foreground text-background" : "text-muted-foreground bg-muted",
              )}
            >
              {f === "ALL" ? "전체" : f === "OPEN" ? "오픈" : "클릭"}
            </button>
          ))}
        </CardAction>
      </CardHeader>
      <CardContent>
        {isError ? (
          <ErrorText>이벤트를 불러오지 못했습니다.</ErrorText>
        ) : shown && shown.length === 0 ? (
          <p className="text-muted-foreground text-sm">아직 오픈·클릭 이벤트가 없습니다.</p>
        ) : (
          // 20줄을 다 펼치면 옆 카드보다 길어지므로 높이를 제한하고 안에서 스크롤한다 (스크롤바는 숨김)
          <ul className="max-h-80 divide-y overflow-y-auto text-sm [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {shown?.map((e) => (
              // 카드가 좁아 두 줄로 쌓는다: 고객·캠페인은 왼쪽, 시간은 오른쪽
              <li key={e.eventId} className="flex items-start gap-2 py-2">
                <span
                  className={cn(
                    "shrink-0 rounded px-1.5 py-0.5 text-xs font-medium",
                    e.eventType === "OPEN" ? "bg-[var(--wu-mint)]" : "bg-[var(--wu-lemon)]",
                  )}
                >
                  {e.eventType === "OPEN" ? "오픈" : "클릭"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {e.customerName ?? "이름 없음"}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">
                    {e.campaignName ?? "캠페인 없음"}
                  </span>
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatSeoul(e.occurredAt, "M/d HH:mm")}
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
