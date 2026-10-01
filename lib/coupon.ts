// 쿠폰 API 응답 타입과 표시용 포맷 (API_SPEC 7·8장, PRD F-10)
import { format, parseISO } from "date-fns";

export type DiscountType = "AMOUNT" | "RATE";
export type IssueStatus = "USABLE" | "USED" | "EXPIRED" | "NOT_STARTED";

export type Coupon = {
  couponId: number;
  name: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  validFrom: string; // YYYY-MM-DD
  validTo: string;
  issuedCount: number;
  usedCount: number;
  createdAt: string;
  updatedAt: string;
};

export type CouponRequest = {
  name: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  validFrom: string;
  validTo: string;
};

/** 고객 쿠폰 페이지 카드. customerName 은 마스킹된 값(김**)이거나 null */
export type PublicCoupon = {
  customerName: string | null;
  couponName: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscountAmount: number | null;
  validFrom: string;
  validTo: string;
  status: IssueStatus;
};

export const ISSUE_STATUS_LABEL: Record<IssueStatus, string> = {
  USABLE: "사용 가능",
  USED: "사용 완료",
  EXPIRED: "기간 만료",
  NOT_STARTED: "사용 기간 전",
};

/** 예: "5,000원 할인", "15% 할인 (최대 30,000원)" */
export function formatDiscount(
  c: Pick<Coupon, "discountType" | "discountValue" | "maxDiscountAmount">,
): string {
  if (c.discountType === "AMOUNT") return `${c.discountValue.toLocaleString("ko-KR")}원 할인`;
  const cap =
    c.maxDiscountAmount != null ? ` (최대 ${c.maxDiscountAmount.toLocaleString("ko-KR")}원)` : "";
  return `${c.discountValue}% 할인${cap}`;
}

/** 예: "2026.10.01 ~ 2026.10.31" (시작일·종료일 당일 포함) */
export function formatPeriod(validFrom: string, validTo: string): string {
  return `${format(parseISO(validFrom), "yyyy.MM.dd")} ~ ${format(parseISO(validTo), "yyyy.MM.dd")}`;
}

/** 목록에서 쿠폰 자체의 기간 상태 (발급 건의 사용 여부와는 별개) */
export function periodStatus(
  validFrom: string,
  validTo: string,
  today: string,
): Exclude<IssueStatus, "USED"> {
  if (today < validFrom) return "NOT_STARTED";
  if (today > validTo) return "EXPIRED";
  return "USABLE";
}
