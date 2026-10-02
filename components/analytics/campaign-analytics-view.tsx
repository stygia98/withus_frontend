"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { CampaignReportCard } from "@/components/analytics/campaign-report-card";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import { PeriodFilter } from "@/components/analytics/period-filter";
import { StepAnalyticsCard } from "@/components/analytics/step-analytics-card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api-client";
import { type CampaignAnalytics, formatCount, formatRate } from "@/lib/dashboard";
import {
  type DateRange,
  describeRange,
  isWholePeriod,
  rangeQuery,
  usePeriodRange,
} from "@/lib/period";
import { queryKeys } from "@/lib/query-keys";

/**
 * 캠페인 성과 (PRD 4장 /analytics/[campaignId], F-09). 기간 필터, KPI 카드, 전환 흐름, 단계별 성과(워크플로우),
 * AI-03 성과 요약
 */
export function CampaignAnalyticsView({ campaignId }: { campaignId: number }) {
  // 서버 기본값(기간 생략)은 캠페인 전체 기간
  const { period, changePeriod, range } = usePeriodRange("ALL", "ALL");

  const { data, error, isPending, isPlaceholderData, isFetching, refetch } = useQuery({
    queryKey: queryKeys.analytics.campaign(campaignId, range.from, range.to),
    queryFn: () =>
      api<CampaignAnalytics>(`/api/v1/analytics/campaigns/${campaignId}${rangeQuery(range)}`),
    placeholderData: keepPreviousData,
    retry: false,
  });
  // 제목은 전체 기간 응답(같은 쿼리 키라 처음 화면이면 추가 요청 없음)에서 가져와, 다른 기간 조회가 실패해도 유지한다
  const { data: name } = useQuery({
    queryKey: queryKeys.analytics.campaign(campaignId),
    queryFn: () => api<CampaignAnalytics>(`/api/v1/analytics/campaigns/${campaignId}`),
    select: (whole) => whole.name,
    retry: false,
  });

  const canRetry = error && !(error instanceof ApiError && [400, 404].includes(error.status));
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      {/* 오류가 나도 제목과 기간 필터는 남겨 다른 기간으로 다시 조회할 수 있게 한다 */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">캠페인 성과</p>
          <h1 className="text-2xl font-semibold">{data?.name ?? name ?? "캠페인"}</h1>
        </div>
        <PeriodFilter
          value={period}
          onChange={changePeriod}
          presets={["ALL", "7", "30", "CUSTOM"]}
        />
      </header>
      {error ? (
        <div className="flex flex-wrap items-center gap-3">
          <p role="alert" className="text-destructive text-sm">
            {errorMessage(error)}
          </p>
          {canRetry && (
            <Button variant="outline" size="sm" disabled={isFetching} onClick={() => refetch()}>
              다시 시도
            </Button>
          )}
        </div>
      ) : isPending ? (
        <p className="text-muted-foreground text-sm" aria-live="polite">
          불러오는 중...
        </p>
      ) : (
        <AnalyticsBody
          campaignId={campaignId}
          data={data}
          loading={isPlaceholderData}
          range={range}
        />
      )}
    </div>
  );
}

function errorMessage(error: Error): string {
  if (error instanceof ApiError && error.status === 404) return "캠페인을 찾을 수 없습니다.";
  // 기간 초과(최대 366일) 같은 입력 오류는 서버 메시지를 그대로 보여 준다
  if (error instanceof ApiError && error.status === 400) return error.message;
  return "캠페인 성과를 불러오지 못했습니다.";
}

function AnalyticsBody({
  campaignId,
  data,
  loading,
  range,
}: {
  campaignId: number;
  data: CampaignAnalytics;
  /** 다른 기간을 불러오는 중이라 data 가 이전 기간 값인가 */
  loading: boolean;
  range: DateRange;
}) {
  const { kpi } = data;
  // 기간 판단은 요청 상태가 아니라 서버가 적용한 기간(응답 from·to)으로 한다
  const wholePeriod = isWholePeriod(data.from, data.to);
  return (
    <>
      <p className="text-muted-foreground -mt-3 text-sm" aria-live="polite">
        발송일 기준 {describeRange(data.from, data.to)}
        {loading && " · 불러오는 중..."}
      </p>
      <section aria-label="캠페인 핵심 지표" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="발송 성공"
          value={formatCount(kpi.sent)}
          hint={`시도 ${formatCount(kpi.attempted)} · 성공률 ${formatRate(kpi.successRate)}`}
        />
        <StatTile
          label="오픈율"
          value={formatRate(kpi.openRate)}
          hint={`고유 오픈 ${formatCount(kpi.uniqueOpens)}명`}
        />
        <StatTile
          label="클릭률"
          value={formatRate(kpi.clickRate)}
          hint={`고유 클릭 ${formatCount(kpi.uniqueClicks)}명`}
        />
        <StatTile
          label="전환율(쿠폰 사용)"
          value={formatRate(kpi.conversionRate)}
          hint={`쿠폰 사용 ${formatCount(kpi.couponUsed)}명`}
        />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>전환 흐름</CardTitle>
          <CardDescription>괄호 안은 발송 시도 대비 비율</CardDescription>
        </CardHeader>
        <CardContent>
          <FunnelChart funnel={data.funnel} />
        </CardContent>
      </Card>
      <StepAnalyticsCard campaignId={campaignId} range={range} />
      {/* AI 요약은 항상 캠페인 전체 기간이라, 전체 기간 결과가 화면에 있을 때만 현재 지표와 비교한다
          (기간을 바꾸는 중에는 이전 기간 값이라 비교하지 않는다) */}
      <CampaignReportCard campaignId={campaignId} kpi={wholePeriod && !loading ? kpi : null} />
      {/* PRD 8.1: 오픈율 한계 안내 문구를 리포트에 표시한다 */}
      <p className="text-muted-foreground text-xs">
        Apple Mail 개인정보 보호, Gmail 이미지 프록시 등으로 오픈율은 실제와 다를 수 있습니다.
        클릭률과 전환율을 함께 보세요. 봇 이벤트와 테스트·안내 발송은 모든 지표에서 뺍니다.
      </p>
    </>
  );
}
