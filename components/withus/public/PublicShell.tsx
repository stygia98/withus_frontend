"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "../Logo";
import { CurtainProvider } from "../Curtain";
import { ToastProvider } from "../Toast";

/* 팬이 링크로 들어오는 화면(쿠폰 · 수신 거부 · 오류)의 공통 틀. 로그인 없이 열려요. */
export function PublicShell({
  tag,
  homeHref = "#",
  className = "",
  children,
}: {
  tag: string;
  homeHref?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`wu-public ${className}`.trim()}>
      <CurtainProvider>
        <ToastProvider kind="public">
          <header className="top">
            <Link href={homeHref} className="logo" aria-label="withus">
              <Logo className="" />
            </Link>
            <span className="tag">{tag}</span>
          </header>
          <main className="page on">{children}</main>
        </ToastProvider>
      </CurtainProvider>
    </div>
  );
}
