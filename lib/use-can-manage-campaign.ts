"use client";

import { useQuery } from "@tanstack/react-query";

import type { Me } from "@/components/layout/admin-shell";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

/**
 * 캠페인·워크플로우를 만들고 바꿀 수 있는 역할인가 (PRD 3장: STAFF 는 조회만, API 도 OWNER·MANAGER 전용).
 * 역할을 아직 모르면 false — 잠깐 읽기 전용으로 보이는 편이 눌러서 403 이 나는 것보다 낫다
 */
export function useCanManageCampaign(): boolean {
  const { data } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api<Me>("/api/v1/auth/me"),
    staleTime: 5 * 60 * 1000,
  });
  return data?.role === "OWNER" || data?.role === "MANAGER";
}
