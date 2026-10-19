// AI-04 캠페인 기획 도우미 (API_SPEC 11장 POST /ai/campaign-plans, /ai/campaign-plans/apply)

import type { Preview, Rule } from "@/components/segment/types";

export type CampaignPlanCoupon = {
  name: string;
  discountType: "AMOUNT" | "RATE";
  discountValue: number;
  maxDiscountAmount: number | null;
  validFrom: string;
  validTo: string;
};

/** 초안 API 응답이자 저장 API 요청 본문. 화면에서 고친 값이 그대로 저장된다 */
export type CampaignPlan = {
  campaignName: string;
  channel: "EMAIL" | "SMS";
  segment: { name: string; rule: Rule };
  coupon: CampaignPlanCoupon | null;
  /** body 는 빈 줄로 문단을 나눈 평문. 메일 HTML·쿠폰 링크는 저장할 때 서버가 만든다 */
  template: { name: string; subject: string | null; body: string };
};

export type CampaignPlanResponse = { plan: CampaignPlan; target: Preview };

export type CampaignPlanApplyResponse = {
  campaignId: number;
  segmentId: number;
  couponId: number | null;
  templateId: number;
};

/** 누르면 목표 입력칸이 채워지는 예시 (최소 입력) */
export const GOAL_EXAMPLES = [
  "최근 30일 가입 고객에게 환영 메일과 5,000원 쿠폰",
  "휴면 고객에게 다시 찾아 달라는 메일과 10% 쿠폰",
  "서울·경기 누적구매 10만 원 이상 고객에게 VIP 감사 15% 쿠폰",
  "20~30대 SMS 동의 고객에게 이번 주말 특가 문자",
] as const;
