// 템플릿에서 쓸 수 있는 치환자 전체 목록 (PRD F-04, 백엔드 TemplateService 화이트리스트와 동일)
export const TEMPLATE_PLACEHOLDERS = [
  { token: "{{name|고객}}", label: "이름" },
  { token: "{{email}}", label: "이메일" },
  { token: "{{region}}", label: "지역" },
  { token: "{{totalPurchase}}", label: "누적구매액" },
  { token: "{{couponUrl}}", label: "쿠폰 링크" },
] as const;

/** SMS 바이트 수. 한글 등 비 ASCII 문자는 2바이트로 센다(치환 전 근사값) */
export function smsByteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.charCodeAt(0) > 127 ? 2 : 1;
  }
  return bytes;
}

export const SMS_BYTE_LIMIT = 90;

// 광고성 SMS 는 발송 시 "(광고)발신자 " 와 "\n무료수신거부 번호" 가 자동으로 붙는다(PRD 8.4, 백엔드 AdCopyInserter).
// 실제 값은 서버 설정(withus.sender.*)이며 여기서는 시연 기본값으로 센다
const AD_SMS_FIXED_TEXT = "(광고)위드어스 " + "\n무료수신거부 080-000-0000";

/** 광고성이면 자동 삽입 문구의 바이트를 더한 SMS 바이트 수 */
export function smsTotalBytes(body: string, adYn: "Y" | "N"): number {
  return smsByteLength(body) + (adYn === "Y" ? smsByteLength(AD_SMS_FIXED_TEXT) : 0);
}
