import type { Metadata } from "next";

import { UnsubscribeCard } from "@/components/customer/unsubscribe-card";

// 고객별 링크라 검색에 노출되지 않게 한다
export const metadata: Metadata = {
  title: "수신거부 · 위드어스",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function UnsubscribePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <UnsubscribeCard token={token} />;
}
