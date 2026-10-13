"use client";
/**
 * withus 시안 B — 팬 화면 공통 (로그인 없이 토큰 링크로 여는 화면)
 * PublicShell · LinkError · CheckRow. 화면 본문은 실제 API 에 맞춰
 * components/coupon/public-coupon-card.tsx(/c/[token]), components/customer/unsubscribe-card.tsx(/unsubscribe/[token]) 에 있다
 */
import Link from "next/link";
import type { ReactNode } from "react";

import { Button, Icon, Logo, type IconName } from "../ui";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="wb wb-public">
      <header className="wb-public__top">
        <Link href="/" aria-label="withus 홈">
          <Logo size={20} />
        </Link>
      </header>
      <main className="wb-public__col">{children}</main>
    </div>
  );
}

/* ---------- 체크 줄 (수신 거부 채널 고르기) ---------- */
export function CheckRow({
  checked,
  disabled,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  title: string;
  desc: string;
}) {
  return (
    <label className="wb-check" style={disabled ? { cursor: "default", opacity: 0.5 } : undefined}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="wb-check__box">
        <svg viewBox="0 0 24 24">
          <path d="m5 12 5 5 9-10" />
        </svg>
      </span>
      <span>
        <b>{title}</b>
        <small>{desc}</small>
      </span>
    </label>
  );
}

/* ---------- 링크 오류 ---------- */
const ERR: Record<"notFound" | "expired" | "network", [IconName, string, string]> = {
  notFound: [
    "link",
    "링크를 찾을 수 없어요",
    "주소가 잘못됐거나 삭제된 링크예요. 받은 메시지의 링크를 다시 눌러 주세요.",
  ],
  expired: [
    "clock",
    "링크 기한이 지났어요",
    "보안을 위해 링크는 일정 기간이 지나면 닫혀요. 가장 최근에 받은 메시지의 링크로 들어와 주세요.",
  ],
  network: [
    "wifi",
    "연결이 불안정해요",
    "쿠폰과 수신 설정은 그대로예요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.",
  ],
};
export function LinkError({
  kind = "notFound",
  onRetry,
}: {
  kind?: keyof typeof ERR;
  onRetry?: () => void;
}) {
  const [icon, title, desc] = ERR[kind];
  return (
    <div>
      <span className="wb-icon">
        <Icon name={icon} />
      </span>
      <h1 className="wb-public__title wb-anim" style={{ marginTop: 22 }}>
        {title}
      </h1>
      <p className="wb-public__lead">{desc}</p>
      {kind === "network" && onRetry ? (
        <div style={{ marginTop: 26 }}>
          <Button size="lg" onClick={onRetry}>
            다시 시도
          </Button>
        </div>
      ) : null}
    </div>
  );
}
