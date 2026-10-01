import { notFound } from "next/navigation";

import { CampaignAnalyticsView } from "@/components/analytics/campaign-analytics-view";

export const metadata = { title: "캠페인 성과 · 위드어스" };

export default async function CampaignAnalyticsPage({
  params,
}: {
  params: Promise<{ campaignId: string }>;
}) {
  const { campaignId } = await params;
  const id = Number(campaignId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  return <CampaignAnalyticsView campaignId={id} />;
}
