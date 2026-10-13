"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScanBarcode } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

import { formatCouponCode } from "@/components/coupon/coupon-barcode";
import type { Me } from "@/components/layout/admin-shell";
import { TemplateCouponTabs } from "@/components/layout/section-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Status } from "@/components/withus-b";
import { ApiError, api } from "@/lib/api-client";
import { ISSUE_STATUS_LABEL, type RedeemCoupon, formatDiscount, formatPeriod } from "@/lib/coupon";
import { formatDateTime } from "@/lib/datetime";
import { queryKeys } from "@/lib/query-keys";
import { COUPON_STATUS_TONE } from "@/lib/status-tone";

/** 숫자만 남긴다 — 스캐너는 숫자만 보내지만 직원이 손으로 칠 때 넣은 공백·하이픈을 지운다 (서버도 같은 규칙) */
const digitsOf = (v: string) => v.replace(/\D/g, "");

/**
 * 매장 쿠폰 사용 처리 (PRD F-10 ②, 4장 /coupons/redeem, project #51).
 * USB/블루투스 바코드 스캐너는 키보드처럼 숫자를 입력하고 Enter 를 보내므로, 입력칸 하나에 포커스를 두면 찍는 즉시 조회된다.
 * 조회(GET)로 쿠폰을 확인한 뒤 '사용 처리'(POST)를 눌러야 사용된다. 권한은 OWNER·MANAGER (PRD 3장).
 */
export function CouponRedeemView() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [typed, setTyped] = useState("");
  const [code, setCode] = useState<string | null>(null);

  const me = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api<Me>("/api/v1/auth/me"),
    staleTime: 5 * 60 * 1000,
  });
  const canRedeem = me.data?.role === "OWNER" || me.data?.role === "MANAGER";

  const coupon = useQuery({
    queryKey: queryKeys.coupons.redeem(code ?? ""),
    queryFn: () => api<RedeemCoupon>(`/api/v1/coupon-issues/by-code/${code}`),
    enabled: code != null,
    retry: false,
  });

  const redeem = useMutation({
    mutationFn: (c: string) =>
      api<RedeemCoupon>(`/api/v1/coupon-issues/by-code/${c}/use`, { method: "POST" }),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.coupons.redeem(data.code), data);
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all });
      toast.success("사용 처리했어요");
      // 다음 손님을 바로 찍을 수 있게 입력칸을 비우고 다시 포커스
      setTyped("");
      inputRef.current?.focus();
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "사용 처리하지 못했어요.");
      if (code) queryClient.invalidateQueries({ queryKey: queryKeys.coupons.redeem(code) });
    },
  });

  function lookUp(e: React.FormEvent) {
    e.preventDefault();
    const digits = digitsOf(typed);
    if (digits.length !== 12) {
      toast.error("쿠폰 번호는 숫자 12자리예요.");
      return;
    }
    redeem.reset();
    setCode(digits);
    // 같은 번호를 다시 찍으면 최신 상태로 다시 읽는다
    if (digits === code) coupon.refetch();
  }

  const data = coupon.data;
  const notFound = coupon.error instanceof ApiError && coupon.error.status === 404;

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <header>
        <h1 className="wb-title">쿠폰 사용 처리</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          고객 화면의 바코드를 스캐너로 찍거나 12자리 쿠폰 번호를 입력하세요. 확인한 뒤 사용
          처리해요.
        </p>
      </header>
      <TemplateCouponTabs />

      <Card>
        <CardContent>
          <form onSubmit={lookUp} className="flex gap-2">
            <div className="relative flex-1">
              <ScanBarcode
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              />
              <Input
                ref={inputRef}
                autoFocus
                inputMode="numeric"
                autoComplete="off"
                aria-label="쿠폰 번호"
                placeholder="바코드를 찍거나 번호 입력 (예: 1234 5678 9012)"
                className="pl-9 tabular-nums"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
              />
            </div>
            <Button type="submit" variant="outline" disabled={coupon.isFetching}>
              조회
            </Button>
          </form>
          {!me.isPending && !canRedeem && (
            <p className="mt-3 text-sm text-muted-foreground">
              쿠폰 사용 처리는 OWNER·MANAGER만 할 수 있어요.
            </p>
          )}
        </CardContent>
      </Card>

      {code && coupon.isPending && <p className="text-sm text-muted-foreground">확인하는 중...</p>}
      {coupon.isError && (
        <Card>
          <CardContent>
            <p className="font-semibold">
              {notFound ? "쿠폰을 찾을 수 없어요" : "쿠폰을 확인하지 못했어요"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {notFound
                ? `${formatCouponCode(code ?? "")} — 번호를 다시 확인하거나 바코드를 다시 찍어 주세요.`
                : coupon.error instanceof ApiError
                  ? coupon.error.message
                  : "연결을 확인한 뒤 다시 조회해 주세요."}
            </p>
          </CardContent>
        </Card>
      )}

      {data && (
        <Card>
          <CardContent className="flex flex-col gap-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-sm text-muted-foreground">
                  {data.customerName ? `${data.customerName}님` : "고객"} ·{" "}
                  <span className="tabular-nums">{formatCouponCode(data.code)}</span>
                </p>
                <p className="mt-1 text-2xl font-semibold tracking-tight">{formatDiscount(data)}</p>
                <p className="mt-1 text-sm">{data.couponName}</p>
              </div>
              <Status tone={COUPON_STATUS_TONE[data.status]}>
                {ISSUE_STATUS_LABEL[data.status]}
              </Status>
            </div>

            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted-foreground">사용 기간</dt>
              <dd className="tabular-nums">{formatPeriod(data.validFrom, data.validTo)}</dd>
              {data.usedAt && (
                <>
                  <dt className="text-muted-foreground">사용 일시</dt>
                  <dd className="tabular-nums">{formatDateTime(data.usedAt)}</dd>
                </>
              )}
            </dl>

            {data.status === "USABLE" ? (
              <Button
                size="lg"
                disabled={!canRedeem || redeem.isPending}
                onClick={() => redeem.mutate(data.code)}
              >
                {redeem.isPending ? "처리 중" : "사용 처리"}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">
                {data.status === "USED"
                  ? "이미 사용한 쿠폰이에요. 다시 사용할 수 없어요."
                  : data.status === "EXPIRED"
                    ? "사용 기간이 지난 쿠폰이에요."
                    : "아직 사용 기간 전인 쿠폰이에요."}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
