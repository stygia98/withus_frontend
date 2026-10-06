"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DeleteTemplateDialog } from "@/components/template/DeleteTemplateDialog";
import { useTemplateActions } from "@/components/template/useTemplateActions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type Page } from "@/lib/api-client";
import { formatDateTime } from "@/lib/datetime";
import { queryKeys } from "@/lib/query-keys";
import type { Channel, Template } from "@/lib/types/template";

const SIZE = 20;
const CHANNEL_FILTERS = [
  { value: "ALL", label: "전체 채널" },
  { value: "EMAIL", label: "EMAIL" },
  { value: "SMS", label: "SMS" },
] as const;
type ChannelFilter = (typeof CHANNEL_FILTERS)[number]["value"];

export default function TemplatesPage() {
  const [channel, setChannel] = useState<ChannelFilter>("ALL");
  const [page, setPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Template | null>(null);
  const { duplicate, remove } = useTemplateActions();

  const apiChannel: Channel | undefined = channel === "ALL" ? undefined : channel;
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.templates.list({ channel: apiChannel, page, size: SIZE }),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: String(SIZE) });
      if (apiChannel) params.set("channel", apiChannel);
      return api<Page<Template>>(`/api/v1/templates?${params}`);
    },
  });

  function onChannelChange(next: ChannelFilter) {
    setChannel(next);
    setPage(0); // 필터가 바뀌면 첫 페이지로
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">템플릿</h1>
        <Button render={<Link href="/templates/new" />} nativeButton={false}>
          새 템플릿
        </Button>
      </div>

      <Select
        items={CHANNEL_FILTERS}
        value={channel}
        onValueChange={(next) => onChannelChange(next as ChannelFilter)}
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="채널" />
        </SelectTrigger>
        <SelectContent>
          {CHANNEL_FILTERS.map((f) => (
            <SelectItem key={f.value} value={f.value}>
              {f.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>채널</TableHead>
            <TableHead>광고</TableHead>
            <TableHead>수정일</TableHead>
            <TableHead className="text-right">작업</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                불러오는 중...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && data?.content.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                템플릿이 없습니다.
              </TableCell>
            </TableRow>
          )}
          {data?.content.map((template) => (
            <TableRow key={template.templateId}>
              <TableCell>
                <Link href={`/templates/${template.templateId}`} className="hover:underline">
                  {template.name}
                </Link>
              </TableCell>
              <TableCell>{template.channel}</TableCell>
              <TableCell>
                <Badge variant={template.adYn === "Y" ? "default" : "secondary"}>
                  {template.adYn === "Y" ? "광고" : "비광고"}
                </Badge>
              </TableCell>
              <TableCell>{formatDateTime(template.updatedAt)}</TableCell>
              <TableCell className="flex justify-end gap-1">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="복제"
                  disabled={duplicate.isPending}
                  onClick={() => duplicate.mutate(template.templateId)}
                >
                  <Copy className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label="삭제"
                  onClick={() => setDeleteTarget(template)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <DeleteTemplateDialog
        templateName={deleteTarget?.name ?? null}
        pending={remove.isPending}
        onConfirm={() => {
          if (!deleteTarget) return;
          remove.mutate(deleteTarget.templateId, { onSuccess: () => setDeleteTarget(null) });
        }}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {data
            ? `전체 ${data.totalElements}건 · ${data.totalPages === 0 ? 0 : page + 1}/${data.totalPages} 페이지`
            : ""}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            이전
          </Button>
          <Button
            variant="outline"
            disabled={!data || page + 1 >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </div>
      </div>
    </main>
  );
}
