"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";

import { CAMPAIGN_STATUS_TONE } from "@/lib/status-tone";
import { Status } from "@/components/withus-b";
import { QueryError } from "@/components/common/QueryError";
import { CampaignForm } from "@/components/campaign/CampaignForm";
import { SchedulePanel } from "@/components/campaign/SchedulePanel";
import { CampaignActions } from "@/components/campaign/CampaignActions";
import { InstancesPanel } from "@/components/workflow/InstancesPanel";
import { WorkflowBuilder } from "@/components/workflow/WorkflowBuilder";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCanManageCampaign } from "@/lib/use-can-manage-campaign";
import { CAMPAIGN_STATUS_LABEL, type Campaign } from "@/lib/types/campaign";

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
    <main className="max-w-3xl space-y-4">
      {!validId && <p className="text-destructive">잘못된 캠페인 주소예요.</p>}
      {validId && isLoading && <p className="text-muted-foreground">불러오는 중...</p>}
      {isError && <QueryError message="캠페인을 불러오지 못했어요." onRetry={() => refetch()} />}
      {data && (
        <>
          <div>
            <Link href="/campaigns" className="text-sm text-muted-foreground hover:underline">
              ← 캠페인 목록
            </Link>
            <h1 className="wb-title">{data.name}</h1>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Status tone={CAMPAIGN_STATUS_TONE[data.status]}>
              {CAMPAIGN_STATUS_LABEL[data.status]}
            </Status>
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
