// 고객 API 타입 (백엔드 customer 패키지 DTO, Swagger 기준)

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
