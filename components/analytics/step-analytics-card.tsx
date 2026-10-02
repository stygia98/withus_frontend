"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Mail, MessageSquare, Ticket } from "lucide-react";

import { FunnelChart } from "@/components/analytics/funnel-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import {
  type CampaignSteps,
  type StepAnalytics,
  formatCount,
  formatRate,
  funnelOf,
} from "@/lib/dashboard";
import { type DateRange, rangeQuery } from "@/lib/period";
import { queryKeys } from "@/lib/query-keys";

/** 문자는 열람 픽셀·링크 치환이 없어 오픈·클릭을 잴 수 없다 (PRD 8.1: 추적은 메일 HTML 대상) */
function tracksEngagement(step: StepAnalytics): boolean {
  return step.nodeType === "SEND_EMAIL";
}

function stepTitle(step: StepAnalytics, index: number): string {
  return `${index + 1}단계 · ${step.templateName ?? "템플릿 없음"}`;
}

/**
 * 워크플로우 단계별 성과 (PRD 4장 "단계별 발송/성공/오픈/클릭/전환 차트", F-09).
 * 단계 간 비율 비교는 표로, 단계마다의 흐름은 같은 형태의 작은 차트를 반복한다(계열을 색으로 섞지 않는다).
 * 일회성 캠페인이면 아무것도 그리지 않는다.
 */
export function StepAnalyticsCard({ campaignId, range }: { campaignId: number; range: DateRange }) {
  const { data, isError } = useQuery({
    queryKey: queryKeys.analytics.steps(campaignId, range.from, range.to),
    queryFn: () =>
      api<CampaignSteps>(`/api/v1/analytics/campaigns/${campaignId}/steps${rangeQuery(range)}`),
    placeholderData: keepPreviousData,
  });

  if (isError) {
    return <p className="text-destructive text-sm">단계별 성과를 불러오지 못했습니다.</p>;
  }
  if (!data || data.type !== "WORKFLOW") return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>단계별 성과</CardTitle>
        <CardDescription>
          워크플로우의 발송 단계마다 따로 집계합니다. 비율은 그 단계의 발송 성공 대비입니다. 문자는
          오픈·클릭을 추적하지 않아 –로 표시합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {data.steps.length === 0 ? (
          <p className="text-muted-foreground text-sm">아직 발송 단계가 없습니다.</p>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>단계</TableHead>
                  <TableHead className="text-right">발송 성공</TableHead>
                  <TableHead className="text-right">오픈율</TableHead>
                  <TableHead className="text-right">클릭률</TableHead>
                  <TableHead className="text-right">전환율</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.steps.map((step, i) => (
                  <TableRow key={step.stepId}>
                    <TableCell>
                      <StepLabel step={step} index={i} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCount(step.kpi.sent)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tracksEngagement(step) ? formatRate(step.kpi.openRate) : <NotTracked />}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {tracksEngagement(step) ? formatRate(step.kpi.clickRate) : <NotTracked />}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRate(step.kpi.conversionRate)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="grid gap-6 lg:grid-cols-2">
              {data.steps.map((step, i) => (
                <section key={step.stepId} aria-label={`${stepTitle(step, i)} 전환 흐름`}>
                  <h3 className="mb-2 text-sm font-medium">
                    <StepLabel step={step} index={i} />
                  </h3>
                  {step.kpi.attempted === 0 ? (
                    <p className="text-muted-foreground text-sm">아직 발송이 없습니다.</p>
                  ) : (
                    <FunnelChart
                      caption={`${stepTitle(step, i)} 전환 흐름`}
                      funnel={funnelOf(step.kpi).filter(
                        (s) =>
                          tracksEngagement(step) || (s.stage !== "OPENED" && s.stage !== "CLICKED"),
                      )}
                    />
                  )}
                </section>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function NotTracked() {
  return (
    <>
      <span aria-hidden>–</span>
      <span className="sr-only">추적 안 함</span>
    </>
  );
}

/** 채널은 아이콘 + 글자로, 쿠폰 연결은 아이콘 + 글자로 (색만으로 구분하지 않음) */
function StepLabel({ step, index }: { step: StepAnalytics; index: number }) {
  const Channel = step.nodeType === "SEND_SMS" ? MessageSquare : Mail;
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <Channel className="text-muted-foreground size-3.5" aria-hidden />
      <span className="sr-only">{step.nodeType === "SEND_SMS" ? "문자" : "메일"}</span>
      {stepTitle(step, index)}
      {step.couponId != null && (
        <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
          <Ticket className="size-3" aria-hidden />
          쿠폰
        </span>
      )}
    </span>
  );
}
