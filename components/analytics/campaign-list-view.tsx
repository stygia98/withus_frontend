"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
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
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_TYPE_LABEL,
  type CampaignStatus,
  type CampaignSummaryItem,
} from "@/lib/dashboard";
import { formatSeoul } from "@/lib/datetime";
import { queryKeys } from "@/lib/query-keys";

const PAGE_SIZE = 20;

/** 상태 필터. 성과를 볼 일이 많은 순서로 둔다 (초안·예약은 아직 발송 전이라 지표가 비어 있다) */
const STATUS_FILTERS: { value: CampaignStatus | undefined; label: string }[] = [
  { value: undefined, label: "전체" },
  { value: "ACTIVE", label: CAMPAIGN_STATUS_LABEL.ACTIVE },
  { value: "COMPLETED", label: CAMPAIGN_STATUS_LABEL.COMPLETED },
  { value: "PAUSED", label: CAMPAIGN_STATUS_LABEL.PAUSED },
  { value: "SCHEDULED", label: CAMPAIGN_STATUS_LABEL.SCHEDULED },
  { value: "DRAFT", label: CAMPAIGN_STATUS_LABEL.DRAFT },
];

/**
 * 성과 리포트 목록 (PRD 4장 /analytics). 캠페인을 골라 성과 화면(/analytics/[campaignId])으로 간다.
 * 목록은 팀원2 캠페인 API(GET /campaigns, 최신순)를 그대로 쓰고, 지표는 상세 화면에서 본다
 */
export function CampaignListView() {
  const [status, setStatus] = useState<CampaignStatus | undefined>(undefined);
  const [page, setPage] = useState(0);
  const { data, isPending, isError, isPlaceholderData } = useQuery({
    queryKey: queryKeys.analytics.campaignList(status, page),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: String(PAGE_SIZE) });
      if (status) params.set("status", status);
      return api<Page<CampaignSummaryItem>>(`/api/v1/campaigns?${params}`);
    },
    placeholderData: keepPreviousData,
  });

  function changeStatus(next: CampaignStatus | undefined) {
    setStatus(next);
    setPage(0);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">성과 리포트</h1>
          <p className="text-muted-foreground text-sm">
            캠페인을 누르면 발송·오픈·클릭·전환 성과를 볼 수 있습니다. 최근 만든 순서입니다.
          </p>
        </div>
        <div
          role="group"
          aria-label="캠페인 상태"
          className="bg-muted inline-flex flex-wrap gap-0.5 rounded-lg p-0.5"
        >
          {STATUS_FILTERS.map((f) => {
            const selected = status === f.value;
            return (
              <Button
                key={f.label}
                type="button"
                size="sm"
                variant="ghost"
                aria-pressed={selected}
                onClick={() => changeStatus(f.value)}
                className={
                  selected
                    ? "bg-background text-foreground hover:bg-background font-medium shadow-sm"
                    : "text-muted-foreground"
                }
              >
                {f.label}
              </Button>
            );
          })}
        </div>
      </header>

      <Card>
        <CardContent>
          {isError ? (
            <p role="alert" className="text-destructive text-sm">
              캠페인 목록을 불러오지 못했습니다.
            </p>
          ) : (
            <Table aria-busy={isPlaceholderData}>
              <TableHeader>
                <TableRow>
                  <TableHead>캠페인</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>기간</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isPending ? (
                  <EmptyRow>불러오는 중...</EmptyRow>
                ) : data.content.length === 0 ? (
                  <EmptyRow>
                    {status
                      ? `${CAMPAIGN_STATUS_LABEL[status]} 상태인 캠페인이 없습니다.`
                      : "아직 만든 캠페인이 없습니다."}
                  </EmptyRow>
                ) : (
                  data.content.map((c) => (
                    <TableRow key={c.campaignId}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/analytics/${c.campaignId}`}
                          className="focus-visible:ring-ring/50 rounded-sm outline-none hover:underline focus-visible:ring-3"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell>{CAMPAIGN_TYPE_LABEL[c.type]}</TableCell>
                      <TableCell>
                        <Badge variant={c.status === "ACTIVE" ? "default" : "outline"}>
                          {CAMPAIGN_STATUS_LABEL[c.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {describePeriod(c)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <nav aria-label="캠페인 목록 페이지" className="flex items-center justify-end gap-2">
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

/** 시작~종료(진행 중이면 시작만), 시작 전이면 예약 시각. 날짜는 서울 기준 */
function describePeriod(c: CampaignSummaryItem): string {
  const day = (iso: string) => formatSeoul(iso, "yyyy.MM.dd");
  if (c.startedAt)
    return c.endedAt ? `${day(c.startedAt)} ~ ${day(c.endedAt)}` : `${day(c.startedAt)} ~`;
  if (c.scheduledAt) return `${formatSeoul(c.scheduledAt, "yyyy.MM.dd HH:mm")} 예약`;
  return "–";
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
