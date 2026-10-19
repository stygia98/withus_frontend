"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type SectionTab = { href: string; label: string };

/** 사이드바에서 하나로 합친 메뉴(고객 관리, 캠페인 관리) 안에서 화면을 오가는 탭 (디자인 키트 B의 .wb-seg 모양) */
function SectionTabs({ tabs, label }: { tabs: SectionTab[]; label: string }) {
  const pathname = usePathname();
  // 가장 길게 맞는 탭을 고른다 — /coupons/redeem 에서 '/coupons' 보다 '/coupons/redeem' 이 이기게
  const value =
    tabs
      .filter((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))
      .sort((a, b) => b.href.length - a.href.length)[0]?.href ?? tabs[0].href;
  return (
    <nav className="wb wb-seg" aria-label={label}>
      {tabs.map((t) => (
        <Link key={t.href} href={t.href} aria-current={t.href === value ? "page" : undefined}>
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

export function CustomerTabs() {
  return (
    <SectionTabs
      label="고객 관리"
      tabs={[
        { href: "/customers", label: "고객 목록" },
        { href: "/segments", label: "고객 타겟팅" },
      ]}
    />
  );
}

export function TemplateCouponTabs() {
  return (
    <SectionTabs
      label="캠페인 관리"
      tabs={[
        { href: "/campaigns", label: "캠페인 목록" },
        { href: "/templates", label: "메시지 템플릿" },
        { href: "/coupons", label: "쿠폰 관리" },
        { href: "/coupons/redeem", label: "쿠폰 사용 처리" },
      ]}
    />
  );
}
