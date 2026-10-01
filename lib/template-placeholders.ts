// 템플릿에서 쓸 수 있는 치환자 전체 목록 (PRD F-04, 백엔드 TemplateService 화이트리스트와 동일)
export const TEMPLATE_PLACEHOLDERS = [
  { token: "{{name|고객}}", label: "이름" },
  { token: "{{email}}", label: "이메일" },
  { token: "{{region}}", label: "지역" },
  { token: "{{totalPurchase}}", label: "누적구매액" },
  { token: "{{couponUrl}}", label: "쿠폰 링크" },
] as const;

/** SMS 바이트 수. 한글 등 비 ASCII 문자는 2바이트로 센다(치환 전 기준, 실제 발송 기준은 서버 미리보기가 계산) */
export function smsByteLength(text: string): number {
  let bytes = 0;
  for (const ch of text) {
    bytes += ch.charCodeAt(0) > 127 ? 2 : 1;
  }
  return bytes;
}

export const SMS_BYTE_LIMIT = 90;
