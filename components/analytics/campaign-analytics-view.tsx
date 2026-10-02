"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { CampaignReportCard } from "@/components/analytics/campaign-report-card";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import { PeriodFilter } from "@/components/analytics/period-filter";
import { StepAnalyticsCard } from "@/components/analytics/step-analytics-card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api-client";
import { type CampaignAnalytics, formatCount, formatRate } from "@/lib/dashboard";
import { type DateRange, type Period, describeRange, rangeQuery, toRange } from "@/lib/period";
import { queryKeys } from "@/lib/query-keys";

/**
 * 캠페인 성과 (PRD 4장 /analytics/[campaignId], F-09). 기간 필터, KPI 카드, 전환 흐름, 단계별 성과(워크플로우),
 * AI-03 성과 요약
 */
export function CampaignAnalyticsView({ campaignId }: { campaignId: number }) {
  const [period, setPeriod] = useState<Period>({ preset: "ALL", customFrom: "", customTo: "" });
  const [range, setRange] = useState<DateRange>({});

  function changePeriod(next: Period) {
    setPeriod(next);
    // 직접 지정 입력이 덜 끝났으면(null) 마지막으로 유효했던 기간을 그대로 쓴다
    const nextRange = toRange(next);
    if (nextRange) setRange(nextRange);
  }

  const { data, error, isPending, isPlaceholderData } = useQuery({
    queryKey: queryKeys.analytics.campaign(campaignId, range.from, range.to),
    queryFn: () =>
      api<CampaignAnalytics>(`/api/v1/analytics/campaigns/${campaignId}${rangeQuery(range)}`),
    placeholderData: keepPreviousData,
    retry: false,
  });

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="mx-auto max-w-6xl p-6">
        <p className="text-destructive text-sm">
          {notFound ? "캠페인을 찾을 수 없습니다." : "캠페인 성과를 불러오지 못했습니다."}
        </p>
      </div>
    );
  }
  if (isPending) return <div className="mx-auto max-w-6xl p-6" />;

  const { kpi } = data;
  const wholePeriod = !range.from && !range.to;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">캠페인 성과</p>
          <h1 className="text-2xl font-semibold">{data.name}</h1>
        </div>
        <PeriodFilter
          value={period}
          onChange={changePeriod}
          presets={["ALL", "7", "30", "CUSTOM"]}
        />
      </header>
      <p className="text-muted-foreground -mt-3 text-sm" aria-live="polite">
        발송일 기준 {describeRange(range)}
        {isPlaceholderData && " · 불러오는 중..."}
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
      {/* AI 요약은 항상 캠페인 전체 기간이라, 전체 기간을 볼 때만 현재 지표와 비교한다 */}
      <CampaignReportCard campaignId={campaignId} kpi={wholePeriod ? kpi : null} />
      {/* PRD 8.1: 오픈율 한계 안내 문구를 리포트에 표시한다 */}
      <p className="text-muted-foreground text-xs">
        Apple Mail 개인정보 보호, Gmail 이미지 프록시 등으로 오픈율은 실제와 다를 수 있습니다.
        클릭률과 전환율을 함께 보세요. 봇 이벤트와 테스트·안내 발송은 모든 지표에서 뺍니다.
      </p>
    </div>
  );
}
