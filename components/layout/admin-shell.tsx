"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { AdminShell as WuAdminShell } from "@/components/withus";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type Role = "OWNER" | "MANAGER" | "STAFF";

export type Me = { memberId: number; email: string; name: string; role: Role };

/**
 * 관리자 화면 공통 틀: 디자인 키트의 왼쪽 메뉴 + 본문 (메뉴 구성은 components/withus/AdminShell.tsx 의 NAV).
 * 인증 가드도 여기서 한다. Access 쿠키가 만료돼도 Refresh 가 남아 있을 수 있어
 * 서버(미들웨어)에서 쿠키 유무로 판단하지 않고, /auth/me 결과(필요하면 재발급 후)로 판단한다
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const me = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api<Me>("/api/v1/auth/me"),
    staleTime: 5 * 60 * 1000,
  });
  const unauthorized = me.error instanceof ApiError && me.error.status === 401;

  useEffect(() => {
    if (unauthorized) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [unauthorized, pathname, router]);

  async function logout() {
    await api("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    queryClient.clear(); // 다른 사용자가 이어서 로그인해도 이전 데이터가 보이지 않게
    router.replace("/login");
  }

  // 로그인 확인 전에는 화면(과 각 페이지의 API 호출)을 띄우지 않는다
  if (!me.data) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        {me.isError && !unauthorized ? "사용자 정보를 불러오지 못했습니다." : "불러오는 중..."}
      </div>
    );
  }

  return (
    <WuAdminShell me={me.data} onLogout={logout}>
      {children}
    </WuAdminShell>
  );
}
