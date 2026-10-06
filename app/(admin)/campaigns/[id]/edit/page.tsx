"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { QueryError } from "@/components/common/QueryError";
import { CampaignForm } from "@/components/campaign/CampaignForm";
import { SchedulePanel } from "@/components/campaign/SchedulePanel";
import { Badge } from "@/components/ui/badge";
import { CampaignActions } from "@/components/campaign/CampaignActions";
import { InstancesPanel } from "@/components/workflow/InstancesPanel";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCanManageCampaign } from "@/lib/use-can-manage-campaign";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_VARIANT,
  type Campaign,
} from "@/lib/types/campaign";

export default function EditCampaignPage() {
  const canManage = useCanManageCampaign();
  const params = useParams<{ id: string }>();
  const campaignId = Number(params.id);

  const validId = Number.isFinite(campaignId);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.campaigns.detail(campaignId),
    queryFn: () => api<Campaign>(`/api/v1/campaigns/${campaignId}`),
    enabled: validId,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      {!validId && <p className="text-destructive">잘못된 캠페인 주소입니다.</p>}
      {validId && isLoading && <p className="text-muted-foreground">불러오는 중...</p>}
      {isError && <QueryError message="캠페인을 불러오지 못했습니다." onRetry={() => refetch()} />}
      {data && (
        <>
          <div className="flex items-center justify-between gap-2">
            <Badge variant={CAMPAIGN_STATUS_VARIANT[data.status]}>
              {CAMPAIGN_STATUS_LABEL[data.status]}
            </Badge>
            <CampaignActions campaign={data} />
          </div>
          {/* 상태가 바뀌면 폼의 잠금 상태가 달라지므로 key 로 다시 만든다 */}
          <CampaignForm key={`${data.campaignId}-${data.status}`} mode="edit" campaign={data} />
          {data.type === "ONE_TIME" && <SchedulePanel campaign={data} />}
          {data.type === "WORKFLOW" && <WorkflowBuilder campaign={data} />}
          {data.type === "WORKFLOW" &&
            data.status !== "DRAFT" &&
            data.status !== "SCHEDULED" &&
            canManage && <InstancesPanel campaignId={data.campaignId} />}
        </>
      )}
    </main>
  );
}
