"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { QueryError } from "@/components/common/QueryError";
import { DeleteTemplateDialog } from "@/components/template/DeleteTemplateDialog";
import { TemplateForm } from "@/components/template/TemplateForm";
import { TemplatePreviewPanel } from "@/components/template/TemplatePreviewPanel";
import { useTemplateActions } from "@/components/template/useTemplateActions";
import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Template } from "@/lib/types/template";

export default function EditTemplatePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const templateId = Number(params.id);
  const [deleteOpen, setDeleteOpen] = useState(false);
  // 삭제를 시작하면 상세 조회를 끈다 — 캐시에서 뺀 뒤 마운트된 화면이 다시 요청해 404 가 나는 것을 막는다
  const [deleting, setDeleting] = useState(false);
  const { duplicate, remove } = useTemplateActions();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.templates.detail(templateId),
    queryFn: () => api<Template>(`/api/v1/templates/${templateId}`),
    enabled: Number.isFinite(templateId) && !deleting,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-4 p-6">
      {isLoading && <p className="text-muted-foreground">불러오는 중...</p>}
      {isError && (
        <QueryError
          message={error instanceof ApiError ? error.message : "템플릿을 불러오지 못했습니다."}
          onRetry={() => refetch()}
        />
      )}
      {data && (
        <>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              disabled={duplicate.isPending}
              onClick={() =>
                duplicate.mutate(templateId, {
                  onSuccess: (copy) => router.push(`/templates/${copy.templateId}`),
                })
              }
            >
              <Copy className="size-4" />
              복제
            </Button>
            <Button variant="outline" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="size-4" />
              삭제
            </Button>
          </div>
          <TemplateForm mode="edit" templateId={templateId} template={data} />
          <TemplatePreviewPanel template={data} />
        </>
      )}

      <DeleteTemplateDialog
        templateName={deleteOpen ? (data?.name ?? null) : null}
        pending={remove.isPending}
        onConfirm={() => {
          setDeleting(true);
          remove.mutate(templateId, {
            onSuccess: () => router.push("/templates"),
            onError: () => setDeleting(false), // 사용 중(409) 등 실패하면 화면을 그대로 둔다
          });
        }}
        onOpenChange={setDeleteOpen}
      />
    </main>
  );
}
