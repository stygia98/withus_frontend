"use client";

import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { PeriodFilter } from "@/components/analytics/period-filter";
import { DailySendsChart } from "@/components/dashboard/daily-sends-chart";
import { Button, Card, KpiCard, PageHeader, Status } from "@/components/withus-b";
import { ApiError, api, type Page } from "@/lib/api-client";
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
import {
  type DateRange,
  daysInclusive,
  describeRange,
  rangeQuery,
  usePeriodRange,
} from "@/lib/period";
import { queryKeys } from "@/lib/query-keys";
import { CAMPAIGN_STATUS_TONE, EVENT_TYPE_TONE } from "@/lib/status-tone";

const EVENT_POLL_MS = 10_000;
const EVENT_LIMIT = 20;
/** 일별 발송 API 가 받는 최대 일수 (API_SPEC 10장) */
const MAX_DAILY_DAYS = 90;

/**
 * 메인 대시보드 (PRD 4장 /dashboard, F-09) — 디자인 키트 B. 기간 KPI(기본 최근 7일, 7/30일·직접 지정),
 * 일별 발송(고른 기간을 따라감), 발송 큐, 활성 캠페인, 최근 이벤트. 큐·이벤트는 기간과 무관한 실시간 값이다
 */
export function DashboardView() {
  // '최근 7일'은 날짜를 보내지 않고 서버 기본값(서울 기준 오늘 포함 7일)을 쓴다
  const { period, changePeriod, range, today } = usePeriodRange("7", "7");
  const summary = useQuery({
    // today: 기간을 생략(서버 기본값 최근 7일)해도 서울 자정이 지나면 키가 바뀌어 새로 조회한다
    queryKey: queryKeys.dashboard.summary(range.from, range.to, today),
    queryFn: () => api<DashboardSummary>(`/api/v1/dashboard/summary${rangeQuery(range)}`),
    placeholderData: keepPreviousData,
  });
  // 서버가 실제로 적용한 기간(생략 시 기본값)을 보여 준다
  const shown = summary.data ? describeRange(summary.data.from, summary.data.to) : "불러오는 중";

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="대시보드"
        description="봇 이벤트와 테스트 · 안내 발송은 모든 지표에서 빼요."
        actions={
          <>
            <span className="wb-ph__range" aria-live="polite">
              발송일 기준 {shown}
            </span>
            <PeriodFilter value={period} onChange={changePeriod} presets={["7", "30", "CUSTOM"]} />
          </>
        }
      />
      <KpiRow query={summary} shown={shown} />
      <div className="wb-row">
        <DailySendsCard range={range} today={today} />
        <QueueCard />
      </div>
      <div className="wb-row wb-row--even">
        <ActiveCampaignsCard />
        <RecentEventsCard />
      </div>
    </>
  );
}

function KpiRow({
  query,
  shown,
}: {
  query: { data?: DashboardSummary; error: Error | null; isFetching: boolean; refetch: () => void };
  shown: string;
}) {
  const { data, error, isFetching, refetch } = query;
  if (error) {
    // 기간 초과(최대 366일) 같은 입력 오류는 서버 메시지를 그대로, 그 밖의 오류는 다시 시도할 수 있게 한다
    const invalidInput = error instanceof ApiError && error.status === 400;
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p role="alert" className="text-destructive text-sm">
          {invalidInput ? error.message : "KPI 를 불러오지 못했어요."}
        </p>
        {!invalidInput && (
          <Button variant="secondary" size="sm" disabled={isFetching} onClick={() => refetch()}>
            다시 시도
          </Button>
        )}
      </div>
    );
  }
  const kpi = data?.kpi;
  return (
    <section aria-label={`핵심 지표 (${shown})`} className="wb-kpis">
      <KpiCard
        label="총 발송(성공)"
        value={kpi ? formatCount(kpi.sent) : "–"}
        sub={
          kpi ? `시도 ${formatCount(kpi.attempted)} · 성공률 ${formatRate(kpi.successRate)}` : null
        }
      />
      <KpiCard
        label="오픈율"
        value={kpi ? formatRate(kpi.openRate) : "–"}
        sub={kpi ? `고유 오픈 ${formatCount(kpi.uniqueOpens)}명` : null}
      />
      <KpiCard
        label="클릭률"
        value={kpi ? formatRate(kpi.clickRate) : "–"}
        sub={kpi ? `고유 클릭 ${formatCount(kpi.uniqueClicks)}명` : null}
      />
      <KpiCard
        label="전환율(쿠폰 사용)"
        value={kpi ? formatRate(kpi.conversionRate) : "–"}
        sub={kpi ? `쿠폰 사용 ${formatCount(kpi.couponUsed)}명` : null}
      />
    </section>
  );
}

function DailySendsCard({ range, today }: { range: DateRange; today: string }) {
  // API 는 '오늘 포함 최근 N일'만 주므로, 고른 기간의 시작일부터 오늘까지 받아 기간 안의 날짜만 그린다
  const from = range.from;
  const wanted = from ? daysInclusive(from, today) : 7;
  const days = Math.min(MAX_DAILY_DAYS, Math.max(1, wanted));
  const { data, isError } = useQuery({
    queryKey: queryKeys.dashboard.dailySends(days),
    queryFn: () => api<DailySend[]>(`/api/v1/dashboard/daily-sends?days=${days}`),
    placeholderData: keepPreviousData,
  });
  const rows = data?.filter((d) => (!from || d.date >= from) && (!range.to || d.date <= range.to));
  return (
    <Card
      title="일별 발송 성공"
      aside={
        wanted > MAX_DAILY_DAYS
          ? `최근 ${MAX_DAILY_DAYS}일까지만 표시`
          : from
            ? describeRange(from, range.to)
            : "최근 7일"
      }
    >
      {isError ? (
        <p className="text-destructive text-sm">일별 발송을 불러오지 못했어요.</p>
      ) : !rows ? (
        <div className="h-56" />
      ) : rows.some((d) => d.sent > 0) ? (
        <DailySendsChart data={rows} />
      ) : (
        <p className="wb-empty">이 기간에는 발송이 없어요.</p>
      )}
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
    <Card
      title="발송 큐"
      aside={
        data ? (
          // 광고성 발송 가능 시간 08:00~20:50 (PRD 8.4)
          <Status tone={data.adSendWindowOpen ? "ok" : "warn"}>
            {data.adSendWindowOpen ? "발송 가능 · 20:50 마감" : "제한 시간 · 08:00 재개"}
          </Status>
        ) : null
      }
    >
      {isError ? (
        <p className="text-destructive text-sm">발송 큐를 불러오지 못했어요.</p>
      ) : (
        <>
          <dl className="wb-queue">
            <QueueNumber label="대기" value={data?.pending} />
            <QueueNumber label="재시도" value={data?.retrying} />
            <QueueNumber label="발송 중" value={data?.sending} />
          </dl>
          <p className="wb-empty" style={{ paddingBottom: 0 }}>
            {data?.expectedEndAt
              ? `초당 ${data.ratePerSecond}건 · 예상 종료 ${formatSeoul(data.expectedEndAt, "MM.dd HH:mm")}`
              : data
                ? "남은 발송이 없어요."
                : ""}
          </p>
        </>
      )}
    </Card>
  );
}

function QueueNumber({ label, value }: { label: string; value?: number }) {
  return (
    <div>
      <dt>
        <small>{label}</small>
      </dt>
      <dd style={{ margin: 0 }}>
        <b>{value === undefined ? "–" : formatCount(value)}</b>
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
    <Card
      title="활성 캠페인"
      aside={
        <Link className="wb-link" href="/analytics">
          전체 보기 →
        </Link>
      }
    >
      {isError ? (
        <p className="wb-empty">캠페인 목록을 불러올 수 없어요.</p>
      ) : data && data.content.length === 0 ? (
        <p className="wb-empty">진행 중인 캠페인이 없어요.</p>
      ) : (
        <div className="wb-table-wrap">
          <table className="wb-table">
            <thead>
              <tr>
                <th>캠페인</th>
                <th>유형</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {data?.content.map((c) => (
                <tr key={c.campaignId}>
                  <td>
                    {/* 누르면 캠페인 성과로 이동 */}
                    <Link href={`/analytics/${c.campaignId}`} style={{ fontWeight: 600 }}>
                      {c.name}
                    </Link>
                  </td>
                  <td>{CAMPAIGN_TYPE_LABEL[c.type]}</td>
                  <td>
                    <Status tone={CAMPAIGN_STATUS_TONE[c.status]}>
                      {CAMPAIGN_STATUS_LABEL[c.status]}
                    </Status>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
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
    <Card title="최근 이벤트">
      {isError ? (
        <p className="text-destructive text-sm">이벤트를 불러오지 못했어요.</p>
      ) : data && data.length === 0 ? (
        <p className="wb-empty">아직 오픈 · 클릭 이벤트가 없어요.</p>
      ) : (
        // 20줄을 다 펼치면 옆 카드보다 길어지므로 높이를 제한하고 안에서 스크롤한다 (스크롤바는 숨김)
        <div className="wb-events wb-events--scroll">
          {data?.map((e) => (
            <div className="wb-event" key={e.eventId}>
              <time dateTime={e.occurredAt}>{formatSeoul(e.occurredAt, "MM.dd HH:mm")}</time>
              <Status tone={EVENT_TYPE_TONE[e.eventType]}>
                {e.eventType === "OPEN" ? "오픈" : "클릭"}
              </Status>
              <span>
                {e.customerName ?? "이름 없음"} · {e.campaignName ?? "캠페인 없음"}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
