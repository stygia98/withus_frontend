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
