// 고객 API 타입 (백엔드 customer 패키지 DTO, Swagger 기준)

import { format } from "date-fns";

export type Yn = "Y" | "N";
export type Channel = "EMAIL" | "SMS";

/** 목록 한 줄 — 이메일·휴대폰은 서버에서 마스킹되어 온다 */
export type CustomerListItem = {
  customerId: number;
  name: string | null;
  email: string;
  phone: string | null;
  region: string | null;
  joinedAt: string;
  totalPurchase: number;
  emailConsent: Yn;
  smsConsent: Yn;
  dormant: Yn;
  createdAt: string;
};

/** 상세 — 마스킹 없음 */
export type Customer = Omit<CustomerListItem, "createdAt"> & {
  birthDate: string | null;
  emailConsentAt: string | null;
  smsConsentAt: string | null;
  source: "MANUAL" | "UPLOAD";
  createdAt: string;
  /** 수신거부 목록에 있는 채널. 이 채널을 동의 Y로 바꾸려면 증빙 메모가 필요하다 */
  suppressedChannels: Channel[];
};

export type ConsentHistory = {
  historyId: number;
  channel: Channel;
  /** null 이면 최초 등록 */
  before: Yn | null;
  after: Yn;
  source: "ADMIN" | "UPLOAD" | "UNSUBSCRIBE" | "BOUNCE" | "COMPLAINT";
  note: string | null;
  changedAt: string;
};

/** 시·도 코드 — 백엔드 customer.domain.Region 과 같은 목록 (코드 기준은 백엔드) */
export const REGIONS = [
  { code: "SEOUL", name: "서울" },
  { code: "BUSAN", name: "부산" },
  { code: "DAEGU", name: "대구" },
  { code: "INCHEON", name: "인천" },
  { code: "GWANGJU", name: "광주" },
  { code: "DAEJEON", name: "대전" },
  { code: "ULSAN", name: "울산" },
  { code: "SEJONG", name: "세종" },
  { code: "GYEONGGI", name: "경기" },
  { code: "GANGWON", name: "강원" },
  { code: "CHUNGBUK", name: "충북" },
  { code: "CHUNGNAM", name: "충남" },
  { code: "JEONBUK", name: "전북" },
  { code: "JEONNAM", name: "전남" },
  { code: "GYEONGBUK", name: "경북" },
  { code: "GYEONGNAM", name: "경남" },
  { code: "JEJU", name: "제주" },
] as const;

export function regionName(code: string | null): string {
  return REGIONS.find((r) => r.code === code)?.name ?? "-";
}

export const CHANNEL_LABEL: Record<Channel, string> = { EMAIL: "이메일", SMS: "SMS" };

export const CONSENT_SOURCE_LABEL: Record<ConsentHistory["source"], string> = {
  ADMIN: "관리자",
  UPLOAD: "업로드",
  UNSUBSCRIBE: "수신거부 페이지",
  BOUNCE: "메일 반송",
  COMPLAINT: "스팸 신고",
};

export function formatDateTime(iso: string) {
  return format(new Date(iso), "yyyy-MM-dd HH:mm");
}

/** GET /customers/{id}/activity — 고객 상세의 발송·이벤트·쿠폰 이력 */
export type CustomerActivity = {
  /** 최근 100건, 최신순 */
  sends: SendActivity[];
  /** 최신 발급순 */
  coupons: CouponActivity[];
};

export type SendStatus = "PENDING" | "SENDING" | "SENT" | "FAILED" | "SKIPPED" | "BOUNCED";

export type SendActivity = {
  sendLogId: number;
  campaignId: number | null;
  /** NOTICE 는 null */
  campaignName: string | null;
  channel: Channel;
  kind: "CAMPAIGN" | "NOTICE" | "TEST";
  status: SendStatus;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
  /** 봇 제외 첫 오픈·클릭 시각 */
  openedAt: string | null;
  clickedAt: string | null;
};

export type CouponStatus = "USABLE" | "USED" | "EXPIRED" | "NOT_STARTED";

export type CouponActivity = {
  issueId: number;
  couponId: number;
  couponName: string;
  /** 오늘 기준 */
  status: CouponStatus;
  validFrom: string;
  validTo: string;
  issuedAt: string;
  usedAt: string | null;
};

export const SEND_STATUS_LABEL: Record<SendStatus, string> = {
  PENDING: "대기",
  SENDING: "발송 중",
  SENT: "발송됨",
  FAILED: "실패",
  SKIPPED: "제외",
  BOUNCED: "반송",
};

export const COUPON_STATUS_LABEL: Record<CouponStatus, string> = {
  USABLE: "사용 가능",
  USED: "사용함",
  EXPIRED: "만료",
  NOT_STARTED: "시작 전",
};
