"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCanManageCampaign } from "@/lib/use-can-manage-campaign";
import type { Campaign } from "@/lib/types/campaign";

/**
 * 캠페인 상태 버튼 (PRD 6.7 전이표). 현재 상태에서 가능한 것만 활성화한다:
 * DRAFT 워크플로우·SCHEDULED → 지금 시작, ACTIVE → 일시정지·종료, PAUSED → 재개·종료, 복제는 어느 상태에서나 가능(새 DRAFT).
 * 일회성 DRAFT 의 시작·예약은 SchedulePanel 이 맡는다(시작 시각 검사가 필요해서)
 */
export function CampaignActions({ campaign }: { campaign: Campaign }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [confirmComplete, setConfirmComplete] = useState(false);
  const canManage = useCanManageCampaign();
  const base = `/api/v1/campaigns/${campaign.campaignId}` as const;

  function refresh() {
    queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
  }
  function onError(err: unknown) {
    toast.error(err instanceof ApiError ? err.message : "요청에 실패했습니다.");
  }

  const transition = useMutation({
    mutationFn: (action: "start" | "pause" | "resume" | "complete") =>
      api<Campaign>(`${base}/${action}`, { method: "POST" }),
    onSuccess: (_, action) => {
      toast.success(
        {
          start: "캠페인을 시작했습니다.",
          pause: "일시정지했습니다.",
          resume: "재개했습니다.",
          complete: "종료했습니다.",
        }[action],
      );
      setConfirmComplete(false);
      refresh();
    },
    onError,
  });

  const duplicate = useMutation({
    mutationFn: () => api<Campaign>(`${base}/duplicate`, { method: "POST" }),
    onSuccess: (copy) => {
      toast.success(`"${copy.name}"(으)로 복제했습니다.`);
      refresh();
      router.push(`/campaigns/${copy.campaignId}/edit`);
    },
    onError,
  });

  if (!canManage) return null; // STAFF 는 조회만 (PRD 3장)

  const { status } = campaign;
  const canStartHere =
    (status === "DRAFT" && campaign.type === "WORKFLOW") || status === "SCHEDULED";
  const pending = transition.isPending || duplicate.isPending;

  return (
    <div className="flex flex-wrap gap-2">
      {canStartHere && (
        <Button disabled={pending} onClick={() => transition.mutate("start")}>
          지금 시작
        </Button>
      )}
      {status === "ACTIVE" && (
        <Button variant="outline" disabled={pending} onClick={() => transition.mutate("pause")}>
          일시정지
        </Button>
      )}
      {status === "PAUSED" && (
        <Button variant="outline" disabled={pending} onClick={() => transition.mutate("resume")}>
          재개
        </Button>
      )}
      {(status === "ACTIVE" || status === "PAUSED") && (
        <Button variant="destructive" disabled={pending} onClick={() => setConfirmComplete(true)}>
          종료
        </Button>
      )}
      <Button variant="outline" disabled={pending} onClick={() => duplicate.mutate()}>
        복제
      </Button>

      <AlertDialog open={confirmComplete} onOpenChange={setConfirmComplete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>캠페인을 종료할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{campaign.name}&rdquo;을(를) 종료합니다. 진행 중인 고객 흐름은 취소되고 대기
              중인 발송은 나가지 않습니다. 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => transition.mutate("complete")}
              disabled={transition.isPending}
            >
              종료
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
