"use client";

import { useQuery } from "@tanstack/react-query";

import { CampaignReportCard } from "@/components/analytics/campaign-report-card";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import { StepAnalyticsCard } from "@/components/analytics/step-analytics-card";
import { StatTile } from "@/components/dashboard/stat-tile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api-client";
import { type CampaignAnalytics, formatCount, formatRate } from "@/lib/dashboard";
import { queryKeys } from "@/lib/query-keys";

/** 캠페인 성과 (PRD 4장 /analytics/[campaignId], F-09). KPI 카드, 전환 흐름, 단계별 성과(워크플로우), AI-03 성과 요약 */
export function CampaignAnalyticsView({ campaignId }: { campaignId: number }) {
  const { data, error, isPending } = useQuery({
    queryKey: queryKeys.analytics.campaign(campaignId),
    queryFn: () => api<CampaignAnalytics>(`/api/v1/analytics/campaigns/${campaignId}`),
    retry: false,
  });

  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <main className="mx-auto max-w-6xl p-6">
        <p className="text-destructive text-sm">
          {notFound ? "캠페인을 찾을 수 없습니다." : "캠페인 성과를 불러오지 못했습니다."}
        </p>
      </main>
    );
  }
  if (isPending) return <main className="mx-auto max-w-6xl p-6" />;

  const { kpi } = data;
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header>
        <p className="text-muted-foreground text-sm">캠페인 성과</p>
        <h1 className="text-2xl font-semibold">{data.name}</h1>
      </header>
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
      <StepAnalyticsCard campaignId={campaignId} />
      <CampaignReportCard campaignId={campaignId} kpi={kpi} />
      {/* PRD 8.1: 오픈율 한계 안내 문구를 리포트에 표시한다 */}
      <p className="text-muted-foreground text-xs">
        Apple Mail 개인정보 보호, Gmail 이미지 프록시 등으로 오픈율은 실제와 다를 수 있습니다.
        클릭률과 전환율을 함께 보세요. 봇 이벤트와 테스트·안내 발송은 모든 지표에서 뺍니다.
      </p>
    </main>
  );
}
