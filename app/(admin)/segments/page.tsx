"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import { formatSeoul } from "@/lib/datetime";
import { CustomerTabs } from "@/components/layout/section-tabs";
import { queryKeys } from "@/lib/query-keys";

// 타겟팅 목록 (PRD 4장 /segments): 조건 요약, 현재 대상 고객 수
const PAGE_SIZE = 20;

export default function SegmentsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const params = { page, size: PAGE_SIZE };
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.segments.list(params),
    queryFn: () => api<Page<Segment>>(`/api/v1/segments?page=${page}&size=${PAGE_SIZE}`),
    // 페이지를 넘기는 동안 이전 목록을 유지해, 표가 사라져 문서 높이가 줄며 스크롤이 맨 위로 튀는 것을 막는다
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="wb-title">고객 타겟팅</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            조건으로 고객을 묶어요. 대상 고객은 발송할 때마다 다시 계산돼요.
          </p>
        </div>
        <Link href="/segments/new" className={buttonVariants()}>
          타겟팅 만들기
        </Link>
      </div>

      <CustomerTabs />

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
          {isError && <MessageRow text="목록을 불러오지 못했어요." />}
          {data?.content.length === 0 && <MessageRow text="타겟팅이 없어요." />}
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
              <TableCell>{formatSeoul(s.createdAt, "yyyy.MM.dd")}</TableCell>
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
