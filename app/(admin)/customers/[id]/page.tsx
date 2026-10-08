"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ActivityCards } from "@/components/customer/activity-cards";
import { ConsentDialog } from "@/components/customer/consent-dialog";
import { CustomerFormDialog } from "@/components/customer/customer-form-dialog";
import { PurchaseCard } from "@/components/customer/purchase-card";
import {
  CHANNEL_LABEL,
  CONSENT_SOURCE_LABEL,
  type Channel,
  type ConsentHistory,
  type Customer,
  formatDateTime,
  regionName,
} from "@/components/customer/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// 고객 상세 (PRD 4장 /customers/[id]). 인적사항·수신동의·동의 이력·구매·발송/이벤트/쿠폰 이력
export default function CustomerDetailPage() {
  const id = Number(useParams<{ id: string }>().id);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [consentChannel, setConsentChannel] = useState<Channel | null>(null);

  const customer = useQuery({
    queryKey: queryKeys.customers.detail(id),
    queryFn: () => api<Customer>(`/api/v1/customers/${id}`),
  });
  const history = useQuery({
    queryKey: queryKeys.customers.consentHistory(id),
    queryFn: () => api<ConsentHistory[]>(`/api/v1/customers/${id}/consent-history`),
  });

  const remove = useMutation({
    mutationFn: () => api(`/api/v1/customers/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      // 상세 쿼리까지 무효화하면 삭제된 고객을 다시 조회해 404 가 난다 → 목록만 갱신
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists });
      toast.success("삭제했습니다.");
      router.replace("/customers");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "삭제하지 못했습니다."),
  });

  if (customer.isPending) return <div className="p-6 text-muted-foreground">불러오는 중...</div>;
  if (customer.isError) {
    const notFound = customer.error instanceof ApiError && customer.error.status === 404;
    return (
      <div className="space-y-2 p-6">
        <p>
          {notFound
            ? "고객을 찾을 수 없습니다. 삭제된 고객일 수 있습니다."
            : "불러오지 못했습니다."}
        </p>
        <Link href="/customers" className="text-sm underline">
          목록으로
        </Link>
      </div>
    );
  }
  const c = customer.data;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/customers" className="text-sm text-muted-foreground hover:underline">
            ← 고객 목록
          </Link>
          <h1 className="text-xl font-semibold">{c.name ?? "(이름 없음)"}</h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setEditing(true)}>
            수정
          </Button>
          <Button variant="destructive" onClick={() => setDeleting(true)}>
            삭제
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>인적사항</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-4">
            <Item label="이메일" value={c.email} />
            <Item label="휴대폰" value={c.phone ?? "-"} />
            <Item label="지역" value={regionName(c.region)} />
            <Item label="생년월일" value={c.birthDate ?? "-"} />
            <Item label="가입일" value={c.joinedAt} />
            <Item label="누적구매액" value={`${c.totalPurchase.toLocaleString()}원`} />
            <Item label="휴면" value={c.dormant === "Y" ? "휴면" : "활성"} />
            <Item label="등록 경로" value={c.source === "UPLOAD" ? "업로드" : "개별 등록"} />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>수신동의</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(["EMAIL", "SMS"] as const).map((ch) => {
            const yn = ch === "EMAIL" ? c.emailConsent : c.smsConsent;
            const at = ch === "EMAIL" ? c.emailConsentAt : c.smsConsentAt;
            return (
              <div key={ch} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="w-12 font-medium">{CHANNEL_LABEL[ch]}</span>
                  {yn === "Y" ? <Badge>동의</Badge> : <Badge variant="outline">거부</Badge>}
                  {at && <span className="text-muted-foreground">{formatDateTime(at)}</span>}
                  {c.suppressedChannels.includes(ch) && (
                    <Badge variant="destructive">수신거부 이력</Badge>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setConsentChannel(ch)}>
                  {yn === "Y" ? "거부로 변경" : "동의로 변경"}
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>동의 이력</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>일시</TableHead>
                <TableHead>채널</TableHead>
                <TableHead>변경</TableHead>
                <TableHead>경로</TableHead>
                <TableHead>메모</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    이력이 없습니다.
                  </TableCell>
                </TableRow>
              )}
              {history.data?.map((h) => (
                <TableRow key={h.historyId}>
                  <TableCell>{formatDateTime(h.changedAt)}</TableCell>
                  <TableCell>{CHANNEL_LABEL[h.channel]}</TableCell>
                  <TableCell>
                    {h.before == null ? "최초 " : `${ynLabel(h.before)} → `}
                    {ynLabel(h.after)}
                  </TableCell>
                  <TableCell>{CONSENT_SOURCE_LABEL[h.source]}</TableCell>
                  <TableCell className="whitespace-normal">{h.note ?? "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <PurchaseCard customerId={id} />
      <ActivityCards customerId={id} />

      <CustomerFormDialog open={editing} onOpenChange={setEditing} customer={c} />
      <ConsentDialog
        customer={c}
        channel={consentChannel}
        onOpenChange={(open) => !open && setConsentChannel(null)}
      />
      <Dialog open={deleting} onOpenChange={setDeleting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>고객을 삭제할까요?</DialogTitle>
            <DialogDescription>
              목록과 발송 대상에서 빠집니다. 수신거부 목록과 동의 이력은 지워지지 않으며, 같은
              이메일로 다시 등록하면 새 고객이 됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="destructive"
              onClick={() => remove.mutate()}
              disabled={remove.isPending}
            >
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function ynLabel(yn: "Y" | "N") {
  return yn === "Y" ? "동의" : "거부";
}
