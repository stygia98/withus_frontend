"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { QueryError } from "@/components/common/QueryError";
import { DeleteTemplateDialog } from "@/components/template/DeleteTemplateDialog";
import { TemplateForm } from "@/components/template/TemplateForm";
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
  const { duplicate, remove } = useTemplateActions();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: queryKeys.templates.detail(templateId),
    queryFn: () => api<Template>(`/api/v1/templates/${templateId}`),
    enabled: Number.isFinite(templateId),
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
        </>
      )}

      <DeleteTemplateDialog
        templateName={deleteOpen ? (data?.name ?? null) : null}
        pending={remove.isPending}
        onConfirm={() =>
          remove.mutate(templateId, {
            onSuccess: () => router.push("/templates"),
          })
        }
        onOpenChange={setDeleteOpen}
      />
    </main>
  );
}
