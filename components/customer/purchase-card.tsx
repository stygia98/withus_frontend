"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { type CustomerActivity, formatDateTime, type Purchase } from "./types";

// 구매 목록과 구매 등록 (PRD F-10 ①). 누적구매액은 이 경로로만 늘어난다
export function PurchaseCard({ customerId }: { customerId: number }) {
  const [open, setOpen] = useState(false);
  const purchases = useQuery({
    queryKey: queryKeys.customers.purchases(customerId),
    queryFn: () => api<Purchase[]>(`/api/v1/customers/${customerId}/purchases`),
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>구매 이력</CardTitle>
        <Button size="sm" onClick={() => setOpen(true)}>
          구매 등록
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>구매일시</TableHead>
              <TableHead className="text-right">금액</TableHead>
              <TableHead>사용 쿠폰</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(purchases.isError || purchases.data?.length === 0) && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  {purchases.isError ? "불러오지 못했습니다." : "구매 이력이 없습니다."}
                </TableCell>
              </TableRow>
            )}
            {purchases.data?.map((p) => (
              <TableRow key={p.purchaseId}>
                <TableCell>{formatDateTime(p.purchasedAt)}</TableCell>
                <TableCell className="text-right">{p.amount.toLocaleString()}원</TableCell>
                <TableCell>{p.couponName ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
      <PurchaseDialog customerId={customerId} open={open} onOpenChange={setOpen} />
    </Card>
  );
}

const schema = z.object({
  amount: z
    .string()
    .transform((v) => v.replaceAll(",", "").trim())
    .refine((v) => /^[1-9]\d{0,14}$/.test(v), "1원 이상 숫자로 입력하세요."),
  /** datetime-local 값. 비우면 지금 */
  purchasedAt: z.string(),
  couponIssueId: z.string(),
});
type FormInput = z.input<typeof schema>;
type FormValues = z.output<typeof schema>;

const NO_COUPON = { value: "", label: "쿠폰 사용 안 함" };

function PurchaseDialog({
  customerId,
  open,
  onOpenChange,
}: {
  customerId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { amount: "", purchasedAt: "", couponIssueId: "" },
  });
  // 쿠폰 후보는 활동 이력의 발급 쿠폰 중 "구매일이 유효기간 안인 미사용" 건 (status 는 오늘 기준이라 쓰지 않는다, #14)
  const activity = useQuery({
    queryKey: queryKeys.customers.activity(customerId),
    queryFn: () => api<CustomerActivity>(`/api/v1/customers/${customerId}/activity`),
    enabled: open,
  });
  const purchasedAt = useWatch({ control: form.control, name: "purchasedAt" });
  const purchaseDate = purchasedAt ? purchasedAt.slice(0, 10) : format(new Date(), "yyyy-MM-dd");
  const couponItems = [
    NO_COUPON,
    ...(activity.data?.coupons ?? [])
      .filter((c) => c.usedAt == null && c.validFrom <= purchaseDate && purchaseDate <= c.validTo)
      .map((c) => ({
        value: String(c.issueId),
        label: `${c.couponName} (~${c.validTo})`,
      })),
  ];
  // 구매일을 바꿔 후보에서 빠진 쿠폰은 선택 해제로 본다
  const selected = useWatch({ control: form.control, name: "couponIssueId" });
  const couponIssueId = couponItems.some((i) => i.value === selected) ? selected : "";

  const save = useMutation({
    mutationFn: (v: FormValues) =>
      api<Purchase>(`/api/v1/customers/${customerId}/purchases`, {
        method: "POST",
        body: JSON.stringify({
          amount: Number(v.amount),
          couponIssueId: couponIssueId ? Number(couponIssueId) : null,
          // 비우면 서버 시각(지금). 브라우저 시계가 앞서 있어 미래로 거부되는 일을 피한다
          purchasedAt: v.purchasedAt ? `${v.purchasedAt}:00+09:00` : null,
        }),
      }),
    onSuccess: () => {
      // 상세(누적구매액)·구매·활동(쿠폰 사용) 모두 이 고객 상세 키 아래에 있다
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.detail(customerId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.lists });
      toast.success("구매를 등록했습니다.");
      form.reset();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "등록하지 못했습니다."),
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>구매 등록</DialogTitle>
          <DialogDescription>
            금액은 누적구매액에 더해집니다. 쿠폰을 고르면 사용 처리됩니다.
          </DialogDescription>
        </DialogHeader>
        <form
          id="purchase-form"
          onSubmit={form.handleSubmit((v) => save.mutate(v))}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="amount">금액(원) *</Label>
            <Input
              id="amount"
              inputMode="numeric"
              placeholder="45000"
              {...form.register("amount")}
              aria-invalid={!!errors.amount}
            />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="purchasedAt">구매일시</Label>
            <Input
              id="purchasedAt"
              type="datetime-local"
              max={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
              {...form.register("purchasedAt")}
            />
            <p className="text-xs text-muted-foreground">비우면 지금으로 등록합니다.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="couponIssueId">쿠폰</Label>
            <Controller
              control={form.control}
              name="couponIssueId"
              render={({ field }) => (
                <Select
                  items={couponItems}
                  value={couponIssueId}
                  onValueChange={(v) => field.onChange(v ?? "")}
                >
                  <SelectTrigger id="couponIssueId" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {couponItems.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              이 고객에게 발급된 미사용 쿠폰 중 구매일({purchaseDate})이 유효기간 안인 것만
              보입니다.
            </p>
          </div>
        </form>
        <DialogFooter>
          <Button type="submit" form="purchase-form" disabled={save.isPending}>
            {save.isPending ? "등록 중..." : "등록"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
