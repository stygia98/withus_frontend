import Link from "next/link";

import { CampaignPlanner } from "@/components/campaign/CampaignPlanner";

export default function CampaignPlanPage() {
  return (
    <main className="max-w-3xl space-y-4">
      <div>
        <Link href="/campaigns" className="text-sm text-muted-foreground hover:underline">
          ← 캠페인 목록
        </Link>
        <h1 className="wb-title">AI로 캠페인 생성하기</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          목표 한 줄로 타겟팅·쿠폰·메시지·일회성 캠페인 초안을 한 번에 만들어요.
        </p>
      </div>
      <CampaignPlanner />
    </main>
  );
}
