"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SegmentEditor, type SegmentForm } from "@/components/segment/segment-editor";
import { emptyRule, type Segment } from "@/components/segment/types";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// 세그먼트 생성 (PRD 4장 /segments/new)
export default function NewSegmentPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (form: SegmentForm) =>
      api<Segment>("/api/v1/segments", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.segments.lists });
      toast.success("세그먼트를 만들었어요.");
      router.push("/segments");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "저장하지 못했어요."),
  });

  return (
    <div className="space-y-4">
      <div>
        <Link href="/segments" className="text-sm text-muted-foreground hover:underline">
          ← 세그먼트 목록
        </Link>
        <h1 className="wb-title">세그먼트 만들기</h1>
      </div>
      <SegmentEditor
        initial={{ name: "", description: "", rule: emptyRule() }}
        saving={create.isPending}
        saveError={create.error}
        onSave={(form) => create.mutate(form)}
      />
    </div>
  );
}
