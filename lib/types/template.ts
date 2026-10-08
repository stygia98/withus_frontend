// 백엔드 campaign.dto.TemplateResponse 와 1:1 대응 (API_SPEC 5장)
export type Channel = "EMAIL" | "SMS";

export type Template = {
  templateId: number;
  channel: Channel;
  name: string;
  subject: string | null;
  body: string;
  adYn: "Y" | "N";
  createdAt: string;
  updatedAt: string;
  /** 상세 조회에서만 채워진다 (목록은 undefined) */
  inUse?: boolean;
};

/** POST /templates/{id}/preview 응답 (API_SPEC 5장). 메일은 subject·html, SMS 는 text·smsBytes·smsType 만 채워진다 */
export type TemplatePreview = {
  subject: string | null;
  html: string | null;
  text: string | null;
  /** (광고)·발신자·수신거부 문구를 포함한 값. ASCII 1바이트, 그 외 2바이트 */
  smsBytes: number | null;
  /** 90바이트 초과면 LMS */
  smsType: "SMS" | "LMS" | null;
  /** 요청에 segmentId 를 보냈을 때만 채워진다. usingDefault 는 치환 값이 없어 기본값으로 나가는 대상 수 (PRD F-04) */
  defaultValueCount: { total: number; usingDefault: number } | null;
};
