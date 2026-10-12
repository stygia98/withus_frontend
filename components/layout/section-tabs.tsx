"use client";

import { usePathname, useRouter } from "next/navigation";

import { Tabs } from "@/components/withus";

type SectionTab = { href: string; label: string };

/** 사이드바에서 '&' 로 합친 메뉴(고객 관리, 캠페인&템플릿&쿠폰) 안에서 화면을 오가는 탭 (디자인 키트) */
function SectionTabs({ tabs }: { tabs: SectionTab[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const value = tabs.find((t) => pathname === t.href || pathname.startsWith(`${t.href}/`))?.href;
  return (
    <Tabs
      tabs={tabs.map((t) => ({ id: t.href, label: t.label }))}
      value={value ?? tabs[0].href}
      onChange={(href) => router.push(href)}
    />
  );
}

export function CustomerTabs() {
  return (
    <SectionTabs
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
      tabs={[
        { href: "/campaigns", label: "캠페인" },
        { href: "/templates", label: "템플릿" },
        { href: "/coupons", label: "쿠폰" },
      ]}
    />
  );
}
