"use client";

// 목록·상세 화면이 함께 쓰는 복제·삭제 mutation (useMutation 성공 시 templates 쿼리 무효화)
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Template } from "@/lib/types/template";

export function useTemplateActions() {
  const queryClient = useQueryClient();

  const duplicate = useMutation({
    mutationFn: (templateId: number) =>
      api<Template>(`/api/v1/templates/${templateId}/duplicate`, { method: "POST" }),
    onSuccess: (copy) => {
      toast.success(`"${copy.name}"(으)로 복제했습니다.`);
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "복제에 실패했습니다.");
    },
  });

  const remove = useMutation({
    mutationFn: (templateId: number) =>
      api<null>(`/api/v1/templates/${templateId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("템플릿을 삭제했습니다.");
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
    },
    onError: (err) => {
      // 사용 중(409 TEMPLATE_IN_USE)이면 백엔드 메시지를 그대로 보여준다
      toast.error(err instanceof ApiError ? err.message : "삭제에 실패했습니다.");
    },
  });

  return { duplicate, remove };
}
