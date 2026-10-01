// 대시보드·성과 리포트 API 타입과 표시 도우미 (API_SPEC 10장, 팀원3)
// 모든 지표는 봇 이벤트와 TEST·NOTICE 발송을 뺀 값이다.

export type SendKpi = {
  attempted: number;
  sent: number;
  successRate: number;
  uniqueOpens: number;
  openRate: number;
  uniqueClicks: number;
  clickRate: number;
  couponUsed: number;
  conversionRate: number;
};

export type DashboardSummary = { from: string; to: string; kpi: SendKpi };

export type DailySend = { date: string; sent: number };

export type QueueStatus = {
  pending: number;
  sending: number;
  retrying: number;
  ratePerSecond: number;
  expectedEndAt: string | null;
  adSendWindowOpen: boolean;
};

export type RecentEvent = {
  eventId: number;
  eventType: "OPEN" | "CLICK";
  occurredAt: string;
  campaignId: number | null;
  campaignName: string | null;
  customerName: string | null;
};

export type RecentEvents = { events: RecentEvent[]; lastEventId: number | null };

export type FunnelStage = {
  stage: "ATTEMPTED" | "SENT" | "OPENED" | "CLICKED" | "CONVERTED";
  count: number;
};

export type CampaignAnalytics = {
  campaignId: number;
  name: string;
  kpi: SendKpi;
  funnel: FunnelStage[];
};

/** 팀원2 캠페인 목록(GET /campaigns)에서 대시보드가 쓰는 필드만 */
export type CampaignSummaryItem = { campaignId: number; name: string };

export const FUNNEL_LABEL: Record<FunnelStage["stage"], string> = {
  ATTEMPTED: "발송 시도",
  SENT: "발송 성공",
  OPENED: "오픈",
  CLICKED: "클릭",
  CONVERTED: "쿠폰 사용",
};

/** 0~1 비율 → "31.2%" */
export function formatRate(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

export function formatCount(n: number): string {
  return n.toLocaleString("ko-KR");
}

/** 워크플로우 단계별 성과 (GET /analytics/campaigns/{id}/steps) */
export type StepAnalytics = {
  stepId: number;
  nodeType: "SEND_EMAIL" | "SEND_SMS";
  templateId: number | null;
  templateName: string | null;
  couponId: number | null;
  kpi: SendKpi;
};

export type CampaignSteps = {
  campaignId: number;
  name: string;
  type: "ONE_TIME" | "WORKFLOW";
  steps: StepAnalytics[];
};

/** 캠페인 응답의 funnel 과 같은 순서로 KPI 에서 전환 흐름을 만든다 (단계별 차트용) */
export function funnelOf(kpi: SendKpi): FunnelStage[] {
  return [
    { stage: "ATTEMPTED", count: kpi.attempted },
    { stage: "SENT", count: kpi.sent },
    { stage: "OPENED", count: kpi.uniqueOpens },
    { stage: "CLICKED", count: kpi.uniqueClicks },
    { stage: "CONVERTED", count: kpi.couponUsed },
  ];
}
