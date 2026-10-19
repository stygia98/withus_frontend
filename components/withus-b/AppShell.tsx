"use client";
/**
 * withus 시안 B — 관리자 화면 틀 (왼쪽 메뉴 + 위쪽 줄 + 본문)
 * 사용: components/layout/admin-shell.tsx 에서 <AppShell user={...}>{children}</AppShell>
 * 메뉴 구성은 NAV 만 고치면 된다. 비밀번호 변경 · 로그아웃은 아래 프로필을 누르면 열린다
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { Icon, Logo, type IconName } from "./ui";

type Role = "OWNER" | "MANAGER" | "STAFF";

/* roles 가 있으면 그 역할에게만 보인다(PRD 3장 권한표). also 는 같은 메뉴로 강조할 다른 경로.
   하나로 합친 메뉴(고객 관리, 캠페인 관리)는 화면 안의 탭(components/layout/section-tabs.tsx)으로 서로 오간다 */
export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  roles?: Role[];
  also?: string[];
};
export const NAV: { group: string; items: NavItem[] }[] = [
  {
    group: "운영",
    items: [
      { href: "/dashboard", label: "대시보드", icon: "dashboard" },
      { href: "/analytics", label: "성과 리포트", icon: "report" },
    ],
  },
  {
    group: "발송",
    items: [
      {
        href: "/customers",
        label: "고객 관리",
        icon: "customers",
        roles: ["OWNER", "MANAGER"],
        also: ["/segments"],
      },
      {
        href: "/campaigns",
        label: "캠페인 관리",
        icon: "campaigns",
        also: ["/templates", "/coupons"],
      },
    ],
  },
  {
    group: "기타",
    items: [{ href: "/settings/users", label: "사용자 관리", icon: "users", roles: ["OWNER"] }],
  },
];

export type ShellUser = { name: string; role: Role };

const isOn = (path: string, item: NavItem) =>
  [item.href, ...(item.also ?? [])].some((h) => path === h || path.startsWith(`${h}/`));

export default function AppShell({
  user,
  children,
  onLogout,
  onChangePassword,
}: {
  user: ShellUser;
  children: ReactNode;
  onLogout: () => void;
  onChangePassword?: () => void;
}) {
  const path = usePathname() || "";
  const [open, setOpen] = useState(false); // 휴대폰: 메뉴 서랍
  const [menu, setMenu] = useState(false); // 프로필 메뉴
  const meRef = useRef<HTMLDivElement>(null);
  const current = NAV.flatMap((g) => g.items).find((i) => isOn(path, i));

  useEffect(() => {
    setOpen(false);
    setMenu(false);
  }, [path]);
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (meRef.current && !meRef.current.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="wb wb-app">
      {open && <div className="wb-side__scrim" aria-hidden onClick={() => setOpen(false)} />}
      <aside className="wb-side" data-open={open} aria-label="주요 메뉴">
        <Link href="/dashboard" className="wb-side__logo">
          <Logo />
        </Link>
        <nav>
          {NAV.map((g) => {
            const items = g.items.filter((i) => !i.roles || i.roles.includes(user.role));
            if (items.length === 0) return null;
            return (
              <div key={g.group}>
                <p className="wb-side__group">{g.group}</p>
                {items.map((i) => (
                  <Link
                    key={i.href}
                    href={i.href}
                    className="wb-nav"
                    aria-current={isOn(path, i) ? "page" : undefined}
                  >
                    <Icon name={i.icon} />
                    {i.label}
                  </Link>
                ))}
              </div>
            );
          })}
        </nav>
        <div className="wb-side__me" ref={meRef}>
          {menu && (
            <div className="wb-me__menu" role="menu">
              {onChangePassword && (
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenu(false);
                    onChangePassword();
                  }}
                >
                  비밀번호 변경
                </button>
              )}
              <button role="menuitem" onClick={onLogout}>
                로그아웃
              </button>
            </div>
          )}
          <button
            className="wb-me"
            aria-haspopup="menu"
            aria-expanded={menu}
            onClick={() => setMenu((m) => !m)}
          >
            <span className="wb-avatar">{user.name.slice(0, 1)}</span>
            <span>
              <b>{user.name}</b>
              <small>{user.role}</small>
            </span>
          </button>
        </div>
      </aside>
      <div className="wb-main">
        <header className="wb-top">
          <button className="wb-top__menu" aria-label="메뉴 열기" onClick={() => setOpen(true)}>
            <Icon name="menu" />
          </button>
          <span className="wb-top__crumb">
            withus / <b>{current?.label ?? ""}</b>
          </span>
        </header>
        <main className="wb-page">{children}</main>
      </div>
    </div>
  );
}
