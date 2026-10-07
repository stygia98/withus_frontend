"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { QueryError } from "@/components/common/QueryError";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import type { InstanceStatus, WorkflowInstance } from "@/lib/types/workflow";
import { INSTANCE_STATUS_LABEL } from "@/lib/types/workflow";

const SIZE = 20;
const STATUS_ITEMS = [
  { value: "ALL", label: "전체 상태" },
  ...(Object.keys(INSTANCE_STATUS_LABEL) as InstanceStatus[]).map((value) => ({
    value,
    label: INSTANCE_STATUS_LABEL[value],
  })),
];

/** 워크플로우 인스턴스(고객별 진행) 현황. 고객 개인정보 없이 customerId 만 보여 준다 */
export function InstancesPanel({ campaignId }: { campaignId: number }) {
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(0);
  const apiStatus = status === "ALL" ? undefined : status;

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.campaigns.instances(campaignId, { status: apiStatus, page, size: SIZE }),
    queryFn: () => {
      const params = new URLSearchParams({ page: String(page), size: String(SIZE) });
      if (apiStatus) params.set("status", apiStatus);
      return api<Page<WorkflowInstance>>(`/api/v1/campaigns/${campaignId}/instances?${params}`);
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>고객별 진행 현황</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Select
          items={STATUS_ITEMS}
          value={status}
          onValueChange={(next) => {
            setStatus(next as string);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_ITEMS.map((i) => (
              <SelectItem key={i.value} value={i.value}>
                {i.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>고객 ID</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>다음 실행</TableHead>
              <TableHead>재시도</TableHead>
              <TableHead>마지막 오류</TableHead>
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
                  <QueryError
                    message="진행 현황을 불러오지 못했습니다."
                    onRetry={() => refetch()}
                  />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && data?.content.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  진행 중인 고객이 없습니다.
                </TableCell>
              </TableRow>
            )}
            {data?.content.map((i) => (
              <TableRow key={i.instanceId}>
                <TableCell>{i.customerId}</TableCell>
                <TableCell>
                  <Badge variant={i.status === "FAILED" ? "destructive" : "secondary"}>
                    {INSTANCE_STATUS_LABEL[i.status]}
                  </Badge>
                </TableCell>
                {/* next_run_at 이 비어 있는 WAITING 은 직전 발송 결과를 기다리는 중이다 */}
                <TableCell>
                  {i.nextRunAt
                    ? formatDateTime(i.nextRunAt)
                    : i.status === "WAITING"
                      ? "발송 결과 대기"
                      : "-"}
                </TableCell>
                <TableCell>{i.retryCount}</TableCell>
                <TableCell className="max-w-xs truncate">{i.lastError ?? "-"}</TableCell>
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
      </CardContent>
    </Card>
  );
}
