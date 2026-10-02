"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

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
import { queryKeys } from "@/lib/query-keys";
import {
  CAMPAIGN_STATUS_LABEL,
  CAMPAIGN_STATUS_VARIANT,
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
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);

  const apiType = type === "ALL" ? undefined : (type as CampaignType);
  const apiStatus = status === "ALL" ? undefined : (status as CampaignStatus);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.campaigns.list({ type: apiType, status: apiStatus, page, size: SIZE }),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: String(SIZE) });
      if (apiType) params.set("type", apiType);
      if (apiStatus) params.set("status", apiStatus);
      return api<Page<Campaign>>(`/api/v1/campaigns?${params}`);
    },
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">캠페인</h1>
        <Button render={<Link href="/campaigns/new" />} nativeButton={false}>
          새 캠페인
        </Button>
      </div>

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
          {!isLoading && data?.content.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                캠페인이 없습니다.
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
                <Badge variant={CAMPAIGN_STATUS_VARIANT[campaign.status]}>
                  {CAMPAIGN_STATUS_LABEL[campaign.status]}
                </Badge>
              </TableCell>
              <TableCell>
                {campaign.scheduledAt
                  ? new Date(campaign.scheduledAt).toLocaleString("ko-KR")
                  : "-"}
              </TableCell>
              <TableCell>{new Date(campaign.updatedAt).toLocaleString("ko-KR")}</TableCell>
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
