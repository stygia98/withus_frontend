import type { Metadata } from "next";

import { PublicCouponCard } from "@/components/coupon/public-coupon-card";

// 고객별 링크라 검색에 노출되지 않게 한다
export const metadata: Metadata = {
  title: "쿠폰 · 위드어스",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PublicCouponPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicCouponCard token={token} />;
}
