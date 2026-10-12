"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type MouseEvent, type ReactNode } from "react";
import { Logo } from "./Logo";
import { CurtainProvider, useCurtainNavigate } from "./Curtain";
import { ToastProvider } from "./Toast";

/* 관리자 화면 틀 — 왼쪽 접히는 메뉴(휴대폰에서는 아래 탭) + 본문. 주소는 프로젝트에 맞게 바꾸세요. */
type Role = "OWNER" | "MANAGER" | "STAFF";
type NavItem = {
  href: string;
  label: string;
  en: string;
  d: string;
  roles?: Role[];
  also?: string[];
};

/* roles 가 있으면 그 역할에게만 보인다(PRD 3장 권한표). also 는 같은 메뉴로 강조할 다른 경로.
   '&' 로 합친 메뉴는 화면 안의 탭(components/layout/section-tabs.tsx)으로 서로 오간다 */
const ICON = {
  dashboard: "M4 13h6V4H4zM14 20h6v-9h-6zM4 20h6v-4H4zM14 4v4h6V4z",
  reports: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  customers:
    "M16 20v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 20v-1a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  campaigns: "M3 11l18-8-8 18-2-8z",
  templates: "M4 4h16v16H4zM4 9h16M9 9v11",
  settings:
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4",
};

export const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "운영",
    items: [
      { href: "/dashboard", label: "대시보드", en: "Dashboard", d: ICON.dashboard },
      { href: "/analytics", label: "성과 리포트", en: "Reports", d: ICON.reports },
    ],
  },
  {
    title: "발송",
    items: [
      {
        href: "/customers",
        label: "고객 관리",
        en: "Customers",
        roles: ["OWNER", "MANAGER"],
        also: ["/segments"],
        d: ICON.customers,
      },
      {
        href: "/campaigns",
        label: "캠페인 관리",
        en: "Campaigns",
        also: ["/templates", "/coupons"],
        d: ICON.campaigns,
      },
    ],
  },
  {
    title: "기타",
    items: [
      {
        href: "/settings/users",
        label: "사용자 관리",
        en: "Settings",
        roles: ["OWNER"],
        d: ICON.settings,
      },
    ],
  },
];

type Me = { name: string; role: Role };

function Rail({
  me,
  onLogout,
  onChangePassword,
}: {
  me: Me;
  onLogout: () => void;
  onChangePassword?: () => void;
}) {
  const path = usePathname();
  const go = useCurtainNavigate();
  const [pin, setPin] = useState(false);
  useEffect(() => {
    try {
      setPin(localStorage.getItem("wu.pin") === "1");
    } catch {}
  }, []);
  const togglePin = () => {
    setPin((p) => {
      try {
        localStorage.setItem("wu.pin", p ? "0" : "1");
      } catch {}
      return !p;
    });
  };
  const click = (e: MouseEvent, href: string, en: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || path === href) return;
    e.preventDefault();
    go(href, en);
  };
  return (
    <aside className={`rail ${pin ? "pin" : ""}`} aria-label="관리자 메뉴">
      <div className="mark">
        <Logo compact />
        <span className="full">
          <Logo className="" />
        </span>
      </div>
      <nav>
        {NAV_GROUPS.map((g) => {
          const items = g.items.filter((n) => !n.roles || n.roles.includes(me.role));
          if (items.length === 0) return null;
          return (
            <div className="rgrp" key={g.title}>
              <span className="lbl rgt">{g.title}</span>
              {items.map((n) => {
                const on = [n.href, ...(n.also ?? [])].some(
                  (h) => path === h || path.startsWith(h + "/"),
                );
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    title={n.label}
                    className={on ? "on" : ""}
                    aria-current={on ? "page" : undefined}
                    onClick={(e) => click(e, n.href, n.en)}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinejoin="round"
                      strokeLinecap="round"
                    >
                      <path d={n.d} />
                    </svg>
                    <span className="lbl">{n.label}</span>
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>
      <div className="foot">
        <button className="pinbtn" aria-pressed={pin} onClick={togglePin}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M15 4l5 5-3 1-4 4 1 4-2 2-4-4-4 4-1-1 4-4-4-4 2-2 4 1 4-4z" />
          </svg>
          <span className="lbl">메뉴 고정</span>
        </button>
        <div className="me">
          <span className="av">{me.name[0]}</span>
          <span className="lbl">
            <b>{me.name}</b>
            <span>{me.role}</span>
          </span>
        </div>
        {onChangePassword && (
          <button className="pinbtn" onClick={onChangePassword}>
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
            >
              <path d="M8 11a4 4 0 100 8 4 4 0 000-8zM11 12l9-9M16 7l3 3M14 9l2 2" />
            </svg>
            <span className="lbl">비밀번호 변경</span>
          </button>
        )}
        <button className="pinbtn" onClick={onLogout}>
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h11" />
          </svg>
          <span className="lbl">로그아웃</span>
        </button>
      </div>
    </aside>
  );
}

export function AdminShell({
  me,
  onLogout,
  onChangePassword,
  children,
}: {
  me: Me;
  onLogout: () => void;
  onChangePassword?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="wu-admin">
      <CurtainProvider>
        <ToastProvider kind="admin">
          <div className="shell">
            <Rail me={me} onLogout={onLogout} onChangePassword={onChangePassword} />
            <main className="content">{children}</main>
          </div>
        </ToastProvider>
      </CurtainProvider>
    </div>
  );
}
