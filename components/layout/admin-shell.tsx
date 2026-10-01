"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type Role = "OWNER" | "MANAGER" | "STAFF";

export type Me = { memberId: number; email: string; name: string; role: Role };

/** GNB 메뉴 (PRD 4장). roles 가 있으면 그 역할에게만 보인다 (PRD 3장 권한표) */
const NAV: { href: string; label: string; roles?: Role[] }[] = [
  { href: "/dashboard", label: "대시보드" },
  { href: "/customers", label: "고객", roles: ["OWNER", "MANAGER"] },
  { href: "/segments", label: "세그먼트" },
  { href: "/campaigns", label: "캠페인" },
  { href: "/templates", label: "템플릿" },
  { href: "/coupons", label: "쿠폰" },
  { href: "/analytics", label: "성과 리포트" },
  { href: "/settings/users", label: "시스템 설정", roles: ["OWNER"] },
];

/**
 * 관리자 화면 공통 틀 (목업 01~06): 왼쪽 GNB + 본문.
 * 인증 가드도 여기서 한다. Access 쿠키가 만료돼도 Refresh 가 남아 있을 수 있어
 * 서버(미들웨어)에서 쿠키 유무로 판단하지 않고, /auth/me 결과(필요하면 재발급 후)로 판단한다
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const me = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api<Me>("/api/v1/auth/me"),
    staleTime: 5 * 60 * 1000,
  });
  const unauthorized = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (unauthorized) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [unauthorized, pathname, router]);

  // 로그인 확인 전에는 화면(과 각 페이지의 API 호출)을 띄우지 않는다
  if (!me.data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {me.isError && !unauthorized ? "사용자 정보를 불러오지 못했습니다." : "불러오는 중..."}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar me={me.data} pathname={pathname} />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}

function Sidebar({ me, pathname }: { me: Me; pathname: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();

  async function logout() {
    await api("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    queryClient.clear(); // 다른 사용자가 이어서 로그인해도 이전 데이터가 보이지 않게
    router.replace("/login");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-44 shrink-0 flex-col bg-sidebar px-3 py-6 text-sidebar-foreground">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-1">
        <span className="flex size-6 items-center justify-center rounded-md bg-sidebar-primary text-xs font-bold text-sidebar-primary-foreground">
          W
        </span>
        <span className="leading-tight">
          <span className="block text-sm font-bold text-white">위드어스</span>
          <span className="block text-[11px]">With Us CRM</span>
        </span>
      </Link>

      <nav aria-label="주 메뉴" className="flex flex-col gap-1">
        {NAV.filter((item) => !item.roles || item.roles.includes(me.role)).map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-primary font-semibold text-sidebar-primary-foreground"
                  : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto flex items-center gap-2.5 border-t border-sidebar-border px-1 pt-4">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-white">
          {me.name.slice(0, 1)}
        </span>
        <span className="min-w-0 flex-1 leading-tight">
          <span className="block truncate text-sm font-semibold text-white">{me.name}</span>
          <span className="block text-[11px]">{me.role}</span>
        </span>
        <button
          type="button"
          onClick={logout}
          className="rounded px-1.5 py-1 text-[11px] hover:bg-sidebar-accent hover:text-white"
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
