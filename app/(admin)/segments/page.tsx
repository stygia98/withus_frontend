"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { type Segment, summarize } from "@/components/segment/types";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type Page } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// 세그먼트 목록 (PRD 4장 /segments): 조건 요약, 현재 대상 고객 수
const PAGE_SIZE = 20;

export default function SegmentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const params = { page, size: PAGE_SIZE };
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.segments.list(params),
    queryFn: () => api<Page<Segment>>(`/api/v1/segments?page=${page}&size=${PAGE_SIZE}`),
  });

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">세그먼트</h1>
        <Link href="/segments/new" className={buttonVariants()}>
          세그먼트 만들기
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>조건</TableHead>
            <TableHead className="text-right">현재 대상</TableHead>
            <TableHead>만든 날</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending && <MessageRow text="불러오는 중..." />}
          {isError && <MessageRow text="목록을 불러오지 못했습니다." />}
          {data?.content.length === 0 && <MessageRow text="세그먼트가 없습니다." />}
          {data?.content.map((s) => (
            <TableRow
              key={s.segmentId}
              className="cursor-pointer"
              onClick={() => router.push(`/segments/${s.segmentId}`)}
            >
              <TableCell>
                <Link href={`/segments/${s.segmentId}`} className="font-medium hover:underline">
                  {s.name}
                </Link>
                {s.description && <p className="text-xs text-muted-foreground">{s.description}</p>}
              </TableCell>
              <TableCell className="max-w-xl whitespace-normal text-sm">
                {summarize(s.rule)}
              </TableCell>
              <TableCell className="text-right">{s.targetCount.toLocaleString()}명</TableCell>
              <TableCell>{format(new Date(s.createdAt), "yyyy-MM-dd")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            이전
          </Button>
          <span>
            {page + 1} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
}

function MessageRow({ text }: { text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}
