"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, api, type Page } from "@/lib/api-client";
import { type Coupon, type CouponIssue, ISSUE_STATUS_LABEL, formatDiscount } from "@/lib/coupon";
import { formatCount } from "@/lib/dashboard";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 20;

const dateTime = (iso: string) => format(parseISO(iso), "yyyy.MM.dd HH:mm");

/**
 * 쿠폰 하나의 발급 현황 (API_SPEC 7장 GET /coupons/{id}/issues, 권한 O M).
 * 고객별 발급 시각·사용 시각·상태. 토큰은 고객 페이지 접근 수단이라 서버가 내려주지 않는다
 */
export function CouponIssuesPanel({ coupon, onClose }: { coupon: Coupon; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const { data, error, isPending } = useQuery({
    queryKey: queryKeys.coupons.issues(coupon.couponId, page),
    queryFn: () =>
      api<Page<CouponIssue>>(
        `/api/v1/coupons/${coupon.couponId}/issues?page=${page}&size=${PAGE_SIZE}`,
      ),
    placeholderData: keepPreviousData,
    retry: (count, err) => !(err instanceof ApiError && err.status === 403) && count < 2,
  });

  return (
    <Card id="coupon-issues-panel" aria-label={`${coupon.name} 발급 현황`}>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="space-y-1.5">
          <CardTitle>발급 현황 · {coupon.name}</CardTitle>
          <CardDescription>
            {formatDiscount(coupon)} · 발급 {formatCount(coupon.issuedCount)} · 사용{" "}
            {formatCount(coupon.usedCount)}. 최근 발급순입니다.
          </CardDescription>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="발급 현황 닫기">
          <X aria-hidden />
        </Button>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-destructive text-sm">
            {error instanceof ApiError && error.status === 403
              ? "발급 현황은 OWNER·MANAGER만 볼 수 있습니다."
              : "발급 현황을 불러오지 못했습니다."}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>고객</TableHead>
                <TableHead>발급</TableHead>
                <TableHead>사용</TableHead>
                <TableHead>상태</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isPending ? (
                <EmptyRow>불러오는 중...</EmptyRow>
              ) : data.content.length === 0 ? (
                <EmptyRow>아직 발급된 쿠폰이 없습니다. 발송 직전에 고객별로 발급됩니다.</EmptyRow>
              ) : (
                data.content.map((issue) => (
                  <TableRow key={issue.issueId}>
                    <TableCell>
                      {issue.customerName ?? (
                        <span className="text-muted-foreground">이름 없음</span>
                      )}
                      <span className="text-muted-foreground ml-1.5 text-xs tabular-nums">
                        #{issue.customerId}
                      </span>
                    </TableCell>
                    <TableCell className="tabular-nums">{dateTime(issue.issuedAt)}</TableCell>
                    <TableCell className="tabular-nums">
                      {issue.usedAt ? dateTime(issue.usedAt) : "–"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={issue.status === "USED" ? "secondary" : "outline"}>
                        {ISSUE_STATUS_LABEL[issue.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        {data && data.totalPages > 1 && (
          <nav aria-label="발급 현황 페이지" className="mt-4 flex items-center justify-end gap-2">
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
      </CardContent>
    </Card>
  );
}

function EmptyRow({ children }: { children: React.ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={4} className="text-muted-foreground py-8 text-center">
        {children}
      </TableCell>
    </TableRow>
  );
}
