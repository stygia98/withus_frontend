import Link from "next/link";

/* 링크 오류 — 잘못된 링크(nf) · 만료(exp) · 연결 오류(net). Next.js의 not-found.tsx / error.tsx 에서 써요. */
const E = {
  nf: [
    "Link error",
    "Not found.",
    "",
    "찾을 수 없는 링크예요",
    "주소가 잘렸거나 잘못 입력된 것 같아요. 받은 메일이나 문자에 있는 링크를 다시 눌러 주세요.",
  ],
  exp: [
    "Link expired",
    "Expired.",
    "exp",
    "유효 기간이 지난 링크예요",
    "보안을 위해 링크는 받은 날부터 90일 동안만 열려요. 가장 최근에 받은 메일이나 문자의 링크로 들어와 주세요.",
  ],
  net: [
    "Connection",
    "Try again.",
    "net",
    "잠깐 연결이 끊겼어요",
    "쿠폰과 수신 설정은 그대로예요. 잠시 뒤 다시 시도해 주세요.",
  ],
} as const;

export function LinkError({
  kind = "nf",
  onRetry,
  contact,
}: {
  kind?: keyof typeof E;
  onRetry?: () => void;
  /** 연락처가 있을 때만 문의 영역을 보여 준다 */
  contact?: string;
}) {
  const e = E[kind];
  return (
    <div className="cp">
      <span className="eyebrow">{e[0]}</span>
      <h1 className={`er-big rise ${e[2]}`}>{e[1]}</h1>
      <h2 className="er-t">{e[3]}</h2>
      <p className="er-p">{e[4]}</p>
      <div className="er-a">
        {kind === "net" && onRetry ? (
          <button type="button" className="cp-btn" onClick={onRetry}>
            다시 시도
          </button>
        ) : (
          <Link href="/" className="cp-btn" style={{ textDecoration: "none" }}>
            처음으로
          </Link>
        )}
      </div>
      {contact ? (
        <dl className="cp-done" style={{ marginTop: 40 }}>
          <div>
            <dt>문의</dt>
            <dd>{contact}</dd>
          </div>
        </dl>
      ) : null}
    </div>
  );
}
