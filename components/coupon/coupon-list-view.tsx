"use client";

import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api, type Page } from "@/lib/api-client";
import { type Coupon, formatDiscount, formatPeriod, periodStatus } from "@/lib/coupon";
import { formatCount, formatRate } from "@/lib/dashboard";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 20;

/** 쿠폰 자체의 기간 상태 (발급 건 상태 라벨과 구분) */
const PERIOD_LABEL = { USABLE: "진행 중", NOT_STARTED: "시작 전", EXPIRED: "종료" } as const;

/** 쿠폰 목록 (PRD 4장 /coupons, F-10). 쿠폰 정의와 발급·사용 현황 */
export function CouponListView() {
  const [page, setPage] = useState(0);
  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.coupons.list(page),
    queryFn: () => api<Page<Coupon>>(`/api/v1/coupons?page=${page}&size=${PAGE_SIZE}`),
  });
  // 관리자 화면은 한국 시간 브라우저 기준. 정확한 판정은 서버(발급·사용 처리)가 한다
  const today = format(new Date(), "yyyy-MM-dd");

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">쿠폰</h1>
          <p className="text-muted-foreground text-sm">
            유효기간은 모든 발급 건에 같게 적용됩니다. 사용률 = 사용 / 발급.
          </p>
        </div>
        <Button nativeButton={false} render={<Link href="/coupons/new" />}>
          <Plus aria-hidden />새 쿠폰
        </Button>
      </header>

      <Card>
        <CardContent>
          {isError ? (
            <p className="text-destructive text-sm">쿠폰 목록을 불러오지 못했습니다.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>쿠폰명</TableHead>
                  <TableHead>할인</TableHead>
                  <TableHead>유효기간</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">발급</TableHead>
                  <TableHead className="text-right">사용</TableHead>
                  <TableHead className="text-right">사용률</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <EmptyRow>불러오는 중...</EmptyRow>
                ) : data.content.length === 0 ? (
                  <EmptyRow>아직 만든 쿠폰이 없습니다.</EmptyRow>
                ) : (
                  data.content.map((c) => {
                    const status = periodStatus(c.validFrom, c.validTo, today);
                    return (
                      <TableRow key={c.couponId}>
                        <TableCell className="font-medium">{c.name}</TableCell>
                        <TableCell>{formatDiscount(c)}</TableCell>
                        <TableCell className="tabular-nums">
                          {formatPeriod(c.validFrom, c.validTo)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={status === "USABLE" ? "secondary" : "outline"}>
                            {PERIOD_LABEL[status]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCount(c.issuedCount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatCount(c.usedCount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {c.issuedCount > 0 ? formatRate(c.usedCount / c.issuedCount) : "–"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <nav aria-label="쿠폰 목록 페이지" className="flex items-center justify-end gap-2">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
            이전
          </Button>
          <span className="text-muted-foreground text-sm tabular-nums">
            {page + 1} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page + 1 >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            다음
          </Button>
        </nav>
      )}
    </div>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={7} className="text-muted-foreground py-8 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}
