"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { formatISO } from "date-fns";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Campaign, CampaignEstimate } from "@/lib/types/campaign";

type Mode = "NOW" | "SCHEDULE";

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ko-KR");
}

/**
 * 일회성 캠페인의 즉시 시작·예약·예약 취소 (API_SPEC 6장). 시작 시각을 정하면 estimate 로 예상 종료 시각을 보여주고,
 * 광고성인데 20:50 을 넘기면(allowed=false) 안내와 함께 버튼을 막는다. 서버도 같은 검사로 한 번 더 막는다
 */
export function SchedulePanel({ campaign }: { campaign: Campaign }) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>("NOW");
  const [local, setLocal] = useState(""); // datetime-local 값 (예: 2026-10-05T19:30)
  const [nowIso, setNowIso] = useState(() => formatISO(new Date()));

  const draft = campaign.status === "DRAFT";
  const scheduled = campaign.status === "SCHEDULED";

  // datetime-local 은 시간대 정보가 없다. 브라우저 시간대로 해석하면(new Date(local)) 서울이 아닌 PC 에서 다른 시각으로
  // 예약되어 estimate·20:50 판정이 틀리므로, 서울 시각으로 보고 +09:00 을 직접 붙인다(CLAUDE.md 6장 3번)
  const startAt = mode === "NOW" ? nowIso : local ? `${local}:00+09:00` : null;

  const { data: estimate, isFetching } = useQuery({
    queryKey: queryKeys.campaigns.estimate(campaign.campaignId, startAt ?? ""),
    queryFn: () =>
      api<CampaignEstimate>(
        `/api/v1/campaigns/${campaign.campaignId}/estimate?startAt=${encodeURIComponent(startAt!)}`,
      ),
    enabled: draft && startAt !== null,
  });

  function refresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
  }

  function onError(err: unknown) {
    if (err instanceof ApiError && err.code === "CAMPAIGN_SEND_WINDOW_EXCEEDED") {
      const next = (err.details as { nextAvailableAt?: string } | undefined)?.nextAvailableAt;
      toast.error(`${err.message}${next ? ` 가능한 시각: ${fmt(next)}` : ""}`);
      return;
    }
    toast.error(err instanceof ApiError ? err.message : "요청에 실패했습니다.");
  }

  const start = useMutation({
    mutationFn: () =>
      api<Campaign>(`/api/v1/campaigns/${campaign.campaignId}/start`, { method: "POST" }),
    onSuccess: () => {
      toast.success("캠페인을 시작했습니다.");
      refresh();
    },
    onError,
  });

  const schedule = useMutation({
    mutationFn: () =>
      api<Campaign>(`/api/v1/campaigns/${campaign.campaignId}/schedule`, {
        method: "POST",
        body: JSON.stringify({ scheduledAt: startAt }),
      }),
    onSuccess: () => {
      toast.success("예약했습니다.");
      refresh();
    },
    onError,
  });

  const cancel = useMutation({
    mutationFn: () =>
      api<Campaign>(`/api/v1/campaigns/${campaign.campaignId}/cancel-schedule`, {
        method: "POST",
      }),
    onSuccess: () => {
      toast.success("예약을 취소했습니다.");
      refresh();
    },
    onError,
  });

  const blocked = !estimate?.allowed || isFetching;

  if (scheduled) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>예약됨</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm">
            {campaign.scheduledAt ? fmt(campaign.scheduledAt) : "-"} 에 시작됩니다.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" disabled={cancel.isPending} onClick={() => cancel.mutate()}>
              예약 취소
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!draft) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>발송 시작</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            type="button"
            variant={mode === "NOW" ? "default" : "outline"}
            onClick={() => {
              setNowIso(formatISO(new Date()));
              setMode("NOW");
            }}
          >
            즉시 시작
          </Button>
          <Button
            type="button"
            variant={mode === "SCHEDULE" ? "default" : "outline"}
            onClick={() => setMode("SCHEDULE")}
          >
            예약
          </Button>
        </div>

        {mode === "SCHEDULE" && (
          <div className="space-y-2">
            <Label htmlFor="scheduledAt">예약 일시</Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={local}
              onChange={(e) => setLocal(e.target.value)}
            />
          </div>
        )}

        {startAt === null && (
          <p className="text-sm text-muted-foreground">예약 일시를 선택하세요.</p>
        )}
        {estimate && (
          <div className="rounded-md border bg-muted/40 p-3 text-sm">
            <p>
              대상 {estimate.targetCount.toLocaleString()}명 · 대기 중{" "}
              {estimate.pendingBacklog.toLocaleString()}건 · 초당 {estimate.ratePerSecond}건
            </p>
            <p>예상 종료: {fmt(estimate.expectedEndAt)}</p>
            {!estimate.allowed && (
              <p className="mt-2 font-medium text-destructive">
                광고성 메시지는 20:50 이후까지 이어질 수 없어 이 시각에는 시작할 수 없습니다.
                {estimate.nextAvailableAt && ` 가능한 시각: ${fmt(estimate.nextAvailableAt)}`}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end">
          {mode === "NOW" ? (
            <Button disabled={blocked || start.isPending} onClick={() => start.mutate()}>
              지금 시작
            </Button>
          ) : (
            <Button disabled={blocked || schedule.isPending} onClick={() => schedule.mutate()}>
              예약하기
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
