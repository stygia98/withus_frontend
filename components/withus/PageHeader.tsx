import type { ReactNode } from "react";

type Props = {
  /** 제목 위 작은 영어 이름표 — 예: 'Dashboard', 'Customers' */
  en: string;
  title: ReactNode;
  sub?: ReactNode;
  actions?: ReactNode;
};

/** 화면 맨 위: 영어 이름표 + 한글 제목(아래에서 올라오며 나타남) + 설명 + 오른쪽 버튼 */
export function PageHeader({ en, title, sub, actions }: Props) {
  return (
    <div className="ph">
      <div>
        <span className="eyebrow">{en}</span>
        <h1 className="rise">{title}</h1>
        {sub ? <p>{sub}</p> : null}
      </div>
      {actions ? <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{actions}</div> : null}
    </div>
  );
}
