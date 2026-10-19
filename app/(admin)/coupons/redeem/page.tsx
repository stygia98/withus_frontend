import { CouponRedeemView } from "@/components/coupon/coupon-redeem-view";

export const metadata = { title: "쿠폰 사용 처리 · withus" };

// 매장 바코드 쿠폰 사용 처리 (PRD 4장 /coupons/redeem, F-10 ②)
export default function CouponRedeemPage() {
  return <CouponRedeemView />;
}
