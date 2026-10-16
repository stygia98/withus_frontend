import { CouponRedeemView } from "@/components/coupon/coupon-redeem-view";

export const metadata = { title: "쿠폰 사용 처리 · withus" };

// 매장 바코드 쿠폰 사용 처리 (PRD 4장 /coupons/redeem, F-10 ②)
export default async function CouponRedeemPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  // 발급 현황의 쿠폰 번호 링크로 들어오면 12자리 숫자일 때만 바로 조회한다
  const initialCode = code && /^\d{12}$/.test(code) ? code : undefined;
  return <CouponRedeemView initialCode={initialCode} />;
}
