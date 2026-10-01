"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { RefreshCw, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, api } from "@/lib/api-client";
import type { SendKpi } from "@/lib/dashboard";
import { queryKeys } from "@/lib/query-keys";

/** AI-03 응답 (API_SPEC 11장). input 은 요약을 만든 시점의 지표 */
type CampaignReport = {
  reportId: number;
  campaignId: number;
  content: string;
  model: string;
  input: { campaignName: string; kpi: SendKpi };
  createdAt: string;
};

/** 성공 발송이 없어 AI 를 부르지 않고 서버가 안내 문장을 저장한 경우 */
const NO_LLM_MODEL = "none";

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403) return "요약 생성은 OWNER·MANAGER만 할 수 있습니다.";
    return err.message;
  }
  return "요약을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

/** AI-03 성과 요약 카드 (PRD 5.3: ai_report 저장, 재생성 버튼). 현재 지표와 요약 시점 지표가 다르면 재생성을 권한다 */
export function CampaignReportCard({
  campaignId,
  kpi,
}: {
  campaignId: number;
  /** 캠페인 전체 기간 지표. 기간 필터가 걸려 있으면 null — 요약과 비교하지 않는다 */
  kpi: SendKpi | null;
}) {
  const queryClient = useQueryClient();
  const {
    data: report,
    isPending,
    isError,
  } = useQuery({
    queryKey: queryKeys.analytics.report(campaignId),
    queryFn: () => api<CampaignReport | null>(`/api/v1/ai/reports/campaigns/${campaignId}`),
  });

  const generate = useMutation({
    mutationFn: () =>
      api<CampaignReport>(`/api/v1/ai/reports/campaigns/${campaignId}`, { method: "POST" }),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.analytics.report(campaignId), created);
      toast.success("성과 요약을 만들었습니다.");
    },
    onError: (err) => toast.error(errorMessage(err)),
  });

  // 요약 이후 발송·오픈·클릭·전환이 늘었으면 숫자가 어긋난다
  const stale =
    report != null &&
    kpi != null &&
    (report.input.kpi.sent !== kpi.sent ||
      report.input.kpi.uniqueOpens !== kpi.uniqueOpens ||
      report.input.kpi.uniqueClicks !== kpi.uniqueClicks ||
      report.input.kpi.couponUsed !== kpi.couponUsed);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden />
            AI 성과 요약
          </CardTitle>
          <CardDescription>
            캠페인 전체 기간의 집계 지표만 AI에 보내 5문장 이내로 요약합니다. 고객 개인정보는 보내지
            않습니다.
          </CardDescription>
        </div>
        {report != null && (
          <Button variant="outline" onClick={() => generate.mutate()} disabled={generate.isPending}>
            <RefreshCw className={generate.isPending ? "animate-spin" : undefined} aria-hidden />
            {generate.isPending ? "요약 중..." : "재생성"}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isPending ? (
          <p className="text-muted-foreground text-sm">불러오는 중...</p>
        ) : isError ? (
          <p className="text-destructive text-sm">성과 요약을 불러오지 못했습니다.</p>
        ) : report == null ? (
          <div className="flex flex-col items-start gap-3">
            <p className="text-muted-foreground text-sm">아직 만든 요약이 없습니다.</p>
            <Button onClick={() => generate.mutate()} disabled={generate.isPending}>
              <Sparkles aria-hidden />
              {generate.isPending ? "요약 중..." : "요약 생성"}
            </Button>
            {generate.isError && (
              <p role="alert" className="text-destructive text-sm">
                {errorMessage(generate.error)} 버튼을 눌러 다시 시도할 수 있습니다.
              </p>
            )}
          </div>
        ) : (
          <>
            <p className="leading-7 break-keep">{report.content}</p>
            <p className="text-muted-foreground text-xs">
              {format(parseISO(report.createdAt), "yyyy.MM.dd HH:mm")} 기준 지표
              {report.model !== NO_LLM_MODEL && ` · ${report.model}`}
            </p>
            {stale && (
              <p role="status" className="bg-muted rounded-md px-3 py-2 text-sm">
                요약 이후 지표가 바뀌었습니다. 재생성하면 최신 지표로 다시 요약합니다.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
