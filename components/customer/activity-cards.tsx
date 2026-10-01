"use client";

import { useQuery } from "@tanstack/react-query";

import {
  CHANNEL_LABEL,
  COUPON_STATUS_LABEL,
  type CustomerActivity,
  formatDateTime,
  SEND_STATUS_LABEL,
} from "@/components/customer/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// 고객 상세의 발송·이벤트·쿠폰 이력 (PRD 4장). 오픈·클릭은 봇을 뺀 첫 시각이다
export function ActivityCards({ customerId }: { customerId: number }) {
  const activity = useQuery({
    queryKey: queryKeys.customers.activity(customerId),
    queryFn: () => api<CustomerActivity>(`/api/v1/customers/${customerId}/activity`),
  });
  const sends = activity.data?.sends;
  const coupons = activity.data?.coupons;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>발송·이벤트 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>일시</TableHead>
                <TableHead>캠페인</TableHead>
                <TableHead>채널</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>오픈</TableHead>
                <TableHead>클릭</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.isError && <EmptyRow colSpan={6} text="불러오지 못했습니다." />}
              {sends?.length === 0 && <EmptyRow colSpan={6} text="발송 이력이 없습니다." />}
              {sends?.map((s) => (
                <TableRow key={s.sendLogId}>
                  <TableCell>{formatDateTime(s.sentAt ?? s.createdAt)}</TableCell>
                  <TableCell>
                    {s.kind === "NOTICE" ? "수신동의 안내" : (s.campaignName ?? "-")}
                  </TableCell>
                  <TableCell>{CHANNEL_LABEL[s.channel]}</TableCell>
                  <TableCell>
                    <Badge variant={s.status === "SENT" ? "default" : "outline"}>
                      {SEND_STATUS_LABEL[s.status]}
                    </Badge>
                    {s.errorMessage && (
                      <span className="ml-2 text-xs text-muted-foreground">{s.errorMessage}</span>
                    )}
                  </TableCell>
                  <TableCell>{s.openedAt ? formatDateTime(s.openedAt) : "-"}</TableCell>
                  <TableCell>{s.clickedAt ? formatDateTime(s.clickedAt) : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {sends?.length === 100 && (
            <p className="mt-2 text-xs text-muted-foreground">최근 100건만 표시합니다.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>쿠폰 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>발급일시</TableHead>
                <TableHead>쿠폰</TableHead>
                <TableHead>유효기간</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>사용일시</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activity.isError && <EmptyRow colSpan={5} text="불러오지 못했습니다." />}
              {coupons?.length === 0 && <EmptyRow colSpan={5} text="발급된 쿠폰이 없습니다." />}
              {coupons?.map((c) => (
                <TableRow key={c.issueId}>
                  <TableCell>{formatDateTime(c.issuedAt)}</TableCell>
                  <TableCell>{c.couponName}</TableCell>
                  <TableCell>
                    {c.validFrom} ~ {c.validTo}
                  </TableCell>
                  <TableCell>
                    <Badge variant={c.status === "USABLE" ? "default" : "outline"}>
                      {COUPON_STATUS_LABEL[c.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.usedAt ? formatDateTime(c.usedAt) : "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}
