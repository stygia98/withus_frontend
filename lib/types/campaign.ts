// 백엔드 campaign.dto.CampaignResponse 와 1:1 대응 (API_SPEC 6장)
export type CampaignType = "ONE_TIME" | "WORKFLOW";
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "ACTIVE" | "PAUSED" | "COMPLETED";
export type TriggerType = "SEGMENT_SCHEDULED" | "CUSTOMER_REGISTERED";

export type Campaign = {
  campaignId: number;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  segmentId: number;
  templateId: number | null;
  couponId: number | null;
  scheduledAt: string | null;
  triggerType: TriggerType | null;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

// 백엔드 campaign.dto.CampaignEstimateResponse — reason·nextAvailableAt 은 allowed=false 일 때만 온다
export type CampaignEstimate = {
  targetCount: number;
  pendingBacklog: number;
  ratePerSecond: number;
  expectedEndAt: string;
  adYn: "Y" | "N";
  allowed: boolean;
  reason?: string;
  nextAvailableAt?: string;
};

export const TRIGGER_TYPE_LABEL: Record<TriggerType, string> = {
  SEGMENT_SCHEDULED: "예약 시각에 세그먼트 전체 시작",
  CUSTOMER_REGISTERED: "신규 고객 등록 시 시작",
};

export const CAMPAIGN_TYPE_LABEL: Record<CampaignType, string> = {
  ONE_TIME: "일회성",
  WORKFLOW: "워크플로우",
};

export const CAMPAIGN_STATUS_LABEL: Record<CampaignStatus, string> = {
  DRAFT: "작성 중",
  SCHEDULED: "예약됨",
  ACTIVE: "실행 중",
  PAUSED: "일시정지",
  COMPLETED: "종료",
};

// 실행 중은 강조, 종료·예약은 약하게, 일시정지는 경고색(destructive)으로 구분한다
export const CAMPAIGN_STATUS_VARIANT: Record<
  CampaignStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  DRAFT: "outline",
  SCHEDULED: "secondary",
  ACTIVE: "default",
  PAUSED: "destructive",
  COMPLETED: "secondary",
};
