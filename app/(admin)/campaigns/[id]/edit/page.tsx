"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { CampaignForm } from "@/components/campaign/CampaignForm";
import { SchedulePanel } from "@/components/campaign/SchedulePanel";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_VARIANT,
  type Campaign,
} from "@/lib/types/campaign";

export default function EditCampaignPage() {
  const params = useParams<{ id: string }>();
  const campaignId = Number(params.id);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.campaigns.detail(campaignId),
    queryFn: () => api<Campaign>(`/api/v1/campaigns/${campaignId}`),
    enabled: Number.isFinite(campaignId),
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      {isLoading && <p className="text-muted-foreground">불러오는 중...</p>}
      {data && (
        <>
          <div className="flex items-center gap-2">
            <Badge variant={CAMPAIGN_STATUS_VARIANT[data.status]}>
              {CAMPAIGN_STATUS_LABEL[data.status]}
            </Badge>
          </div>
          {/* 상태가 바뀌면 폼의 잠금 상태가 달라지므로 key 로 다시 만든다 */}
          <CampaignForm key={`${data.campaignId}-${data.status}`} mode="edit" campaign={data} />
          {data.type === "ONE_TIME" && <SchedulePanel campaign={data} />}
        </>
      )}
    </main>
  );
}
