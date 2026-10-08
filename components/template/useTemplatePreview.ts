"use client";

// 저장된 템플릿의 서버 렌더링 결과(POST /templates/{id}/preview). 편집 폼의 SMS 바이트 표시와 미리보기 카드가 같이 쓰므로
// 같은 쿼리 키로 한 번만 받는다. sampleCustomerId 를 보내지 않아 서버가 고정 샘플 값(홍길동 등)으로 치환한다
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Template, TemplatePreview } from "@/lib/types/template";

export function useTemplatePreview(template: Template | undefined) {
  return useQuery({
    queryKey: queryKeys.templates.preview(template?.templateId ?? 0, template?.updatedAt ?? ""),
    queryFn: () =>
      api<TemplatePreview>(`/api/v1/templates/${template!.templateId}/preview`, {
        method: "POST",
        body: JSON.stringify({}),
      }),
    enabled: !!template,
  });
}
