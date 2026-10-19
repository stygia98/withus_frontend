import Link from "next/link";

import { CampaignForm } from "@/components/campaign/CampaignForm";

export default function NewCampaignPage() {
  return (
    <main className="max-w-3xl space-y-4">
      <div>
        <Link href="/campaigns" className="text-sm text-muted-foreground hover:underline">
          ← 캠페인 목록
        </Link>
        <h1 className="wb-title">새 캠페인</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          타겟팅과 템플릿을 고르고, 일회성 예약 발송인지 워크플로우인지 정해요.
        </p>
      </div>
      <CampaignForm mode="create" />
    </main>
  );
}
