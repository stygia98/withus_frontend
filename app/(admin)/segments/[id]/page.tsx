"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { SegmentEditor, type SegmentForm } from "@/components/segment/segment-editor";
import type { Segment } from "@/components/segment/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// 타겟팅 수정 (PRD 4장 /segments/[id])
export default function SegmentDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [deleting, setDeleting] = useState(false);

  const segment = useQuery({
    queryKey: queryKeys.segments.detail(id),
    queryFn: () => api<Segment>(`/api/v1/segments/${id}`),
  });
  const update = useMutation({
    mutationFn: (form: SegmentForm) =>
      api<Segment>(`/api/v1/segments/${id}`, { method: "PUT", body: JSON.stringify(form) }),
    onSuccess: (s) => {
      queryClient.setQueryData(queryKeys.segments.detail(id), s);
      queryClient.invalidateQueries({ queryKey: queryKeys.segments.lists });
      toast.success("저장했어요.");
      router.push("/segments");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "저장하지 못했어요."),
  });
  const remove = useMutation({
    mutationFn: () => api(`/api/v1/segments/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      // 상세 쿼리를 무효화하면 지운 타겟팅을 다시 불러 404 가 난다 → 목록만
      queryClient.invalidateQueries({ queryKey: queryKeys.segments.lists });
      toast.success("삭제했어요.");
      router.replace("/segments");
    },
    onError: (err) => {
      setDeleting(false);
      // SEGMENT_IN_USE(409): 캠페인이 쓰는 타겟팅
      toast.error(err instanceof ApiError ? err.message : "삭제하지 못했어요.");
    },
  });

  if (segment.isPending) return <div className="text-muted-foreground">불러오는 중...</div>;
  if (segment.isError) {
    return (
      <div className="space-y-2">
        <p>타겟팅을 찾을 수 없어요.</p>
        <Link href="/segments" className="text-sm underline">
          목록으로
        </Link>
      </div>
    );
  }
  const s = segment.data;

  return (
    <div className="space-y-4">
      <div>
        <Link href="/segments" className="text-sm text-muted-foreground hover:underline">
          ← 타겟팅 목록
        </Link>
        <h1 className="wb-title">{s.name}</h1>
      </div>
      <SegmentEditor
        initial={{ name: s.name, description: s.description ?? "", rule: s.rule }}
        saving={update.isPending}
        saveError={update.error}
        onSave={(form) => update.mutate(form)}
        actions={
          <Button variant="destructive" className="w-full" onClick={() => setDeleting(true)}>
            삭제
          </Button>
        }
      />
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>타겟팅을 삭제할까요?</DialogTitle>
            <DialogDescription>
              이 타겟팅을 쓰는 캠페인이 있으면 삭제할 수 없어요.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
