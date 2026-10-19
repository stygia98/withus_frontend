// 상태 표시 색 규칙 — 모든 화면의 상태는 <Status tone> 연한 색 알약으로 보여 주고, 색은 여기서만 정한다.
// ok=초록(정상·진행), warn=노랑(주의·멈춤), err=빨강(실패·차단), info=파랑(대기·예정), mute=회색(끝남·해당 없음)
import type { Tone } from "@/components/withus-b";
import type { CampaignStatus } from "@/lib/types/campaign";
import type { InstanceStatus } from "@/lib/types/workflow";
import type { IssueStatus } from "@/lib/coupon";
import type { SendStatus } from "@/components/customer/types";
import type { RecentEvent } from "@/lib/dashboard";

export const CAMPAIGN_STATUS_TONE: Record<CampaignStatus, Tone> = {
  DRAFT: "mute",
  SCHEDULED: "info",
  ACTIVE: "ok",
  PAUSED: "warn",
  COMPLETED: "mute",
};

/** 쿠폰 발급 건(고객이 받은 쿠폰)과 쿠폰 자체의 기간 상태 모두 */
export const COUPON_STATUS_TONE: Record<IssueStatus, Tone> = {
  USABLE: "ok",
  NOT_STARTED: "info",
  USED: "mute",
  EXPIRED: "mute",
};

export const SEND_STATUS_TONE: Record<SendStatus, Tone> = {
  PENDING: "info",
  SENDING: "info",
  SENT: "ok",
  FAILED: "err",
  BOUNCED: "err",
  SKIPPED: "mute",
};

/** 대시보드 최근 이벤트. 클릭은 오픈보다 한 단계 더 나아간 반응이라 색을 달리한다 */
export const EVENT_TYPE_TONE: Record<RecentEvent["eventType"], Tone> = {
  OPEN: "info",
  CLICK: "ok",
};

export const INSTANCE_STATUS_TONE: Record<InstanceStatus, Tone> = {
  WAITING: "info",
  RUNNING: "info",
  COMPLETED: "ok",
  FAILED: "err",
  CANCELLED: "mute",
};

/** 수신 동의 Y/N */
export const CONSENT_TONE: Record<"Y" | "N", Tone> = { Y: "ok", N: "mute" };
