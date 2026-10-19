"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { CAMPAIGN_STATUS_TONE } from "@/lib/status-tone";
import { Status } from "@/components/withus-b";
import { QueryError } from "@/components/common/QueryError";
import { TemplateCouponTabs } from "@/components/layout/section-tabs";
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
import { useCanManageCampaign } from "@/lib/use-can-manage-campaign";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_TYPE_LABEL,
  type Campaign,
  type CampaignStatus,
  type CampaignType,
} from "@/lib/types/campaign";

const SIZE = 20;

const TYPE_FILTERS = [
  { value: "ALL", label: "전체 유형" },
  ...(Object.keys(CAMPAIGN_TYPE_LABEL) as CampaignType[]).map((value) => ({
    value,
    label: CAMPAIGN_TYPE_LABEL[value],
  })),
];
const STATUS_FILTERS = [
  { value: "ALL", label: "전체 상태" },
  ...(Object.keys(CAMPAIGN_STATUS_LABEL) as CampaignStatus[]).map((value) => ({
    value,
    label: CAMPAIGN_STATUS_LABEL[value],
  })),
];

export default function CampaignsPage() {
  const canManage = useCanManageCampaign();
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);

  const apiType = type === "ALL" ? undefined : (type as CampaignType);
  const apiStatus = status === "ALL" ? undefined : (status as CampaignStatus);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.campaigns.list({ type: apiType, status: apiStatus, page, size: SIZE }),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: String(SIZE) });
      if (apiType) params.set("type", apiType);
      if (apiStatus) params.set("status", apiStatus);
      return api<Page<Campaign>>(`/api/v1/campaigns?${params}`);
    },
    // 페이지를 넘기는 동안 이전 목록을 유지해, 표가 사라져 문서 높이가 줄며 스크롤이 맨 위로 튀는 것을 막는다
    placeholderData: keepPreviousData,
  });

  return (
    <main className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="wb-title">캠페인 목록</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            일회성 예약 발송과 워크플로우 캠페인을 만들고, 시작하거나 멈출 수 있어요.
          </p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" render={<Link href="/campaigns/plan" />} nativeButton={false}>
              <Sparkles aria-hidden />
              AI로 캠페인 생성하기
            </Button>
            <Button render={<Link href="/campaigns/new" />} nativeButton={false}>
              새 캠페인
            </Button>
          </div>
        )}
      </div>

      <TemplateCouponTabs />

      <div className="flex gap-2">
        <Select
          items={TYPE_FILTERS}
          value={type}
          onValueChange={(next) => {
            setType(next as string);
            setPage(0); // 필터가 바뀌면 첫 페이지로
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="유형" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          items={STATUS_FILTERS}
          value={status}
          onValueChange={(next) => {
            setStatus(next as string);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="상태" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>유형</TableHead>
            <TableHead>상태</TableHead>
            <TableHead>예약 시각</TableHead>
            <TableHead>수정일</TableHead>
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
          {isError && (
            <TableRow>
              <TableCell colSpan={5}>
                <QueryError message="캠페인 목록을 불러오지 못했어요." onRetry={() => refetch()} />
              </TableCell>
            </TableRow>
          )}
          {!isLoading && data?.content.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                캠페인이 없어요.
              </TableCell>
            </TableRow>
          )}
          {data?.content.map((campaign) => (
            <TableRow key={campaign.campaignId}>
              <TableCell>
                <Link href={`/campaigns/${campaign.campaignId}/edit`} className="hover:underline">
                  {campaign.name}
                </Link>
              </TableCell>
              <TableCell>{CAMPAIGN_TYPE_LABEL[campaign.type]}</TableCell>
              <TableCell>
                <Status tone={CAMPAIGN_STATUS_TONE[campaign.status]}>
                  {CAMPAIGN_STATUS_LABEL[campaign.status]}
                </Status>
              </TableCell>
              <TableCell>
                {campaign.scheduledAt ? formatDateTime(campaign.scheduledAt) : "-"}
              </TableCell>
              <TableCell>{formatDateTime(campaign.updatedAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          {data
            ? `전체 ${data.totalElements}건 · ${data.totalPages === 0 ? 0 : page + 1}/${data.totalPages} 페이지`
            : ""}
        </span>
        {/* 한 페이지뿐이면 넘길 곳이 없어 버튼을 숨긴다 */}
        {data && data.totalPages > 1 && (
          <div className="flex gap-2">
            <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              이전
            </Button>
            <Button
              variant="outline"
              disabled={page + 1 >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              다음
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
