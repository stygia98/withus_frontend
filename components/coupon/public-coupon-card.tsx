"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Clock, TicketX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ApiError, api } from "@/lib/api-client";
import { ISSUE_STATUS_LABEL, type PublicCoupon, formatPeriod } from "@/lib/coupon";
import { queryKeys } from "@/lib/query-keys";

/**
 * 고객 쿠폰 카드 (PRD F-10, API_SPEC 8장). 로그인 없이 메일 속 링크의 UUID 토큰으로 연다.
 * 조회는 상태를 바꾸지 않고, 사용 처리는 버튼을 두 번(사용하기 → 사용 확정) 눌러 POST 로만 한다.
 */
export function PublicCouponCard({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);
  const path = `/api/v1/public/coupons/${encodeURIComponent(token)}` as const;

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.coupons.publicCard(token),
    queryFn: () => api<PublicCoupon>(path),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });

  const use = useMutation({
    mutationFn: () => api<PublicCoupon>(`${path}/use`, { method: "POST" }),
    onSuccess: (card) => {
      queryClient.setQueryData(queryKeys.coupons.publicCard(token), card);
      toast.success("쿠폰을 사용했습니다.");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "잠시 후 다시 시도해 주세요.");
      // 다른 기기에서 먼저 썼거나 기간이 바뀐 경우를 화면에 반영
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.publicCard(token) });
    },
    onSettled: () => setConfirming(false),
  });

  return (
    <main className="bg-muted/40 flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {isPending ? (
          <Shell>
            <p className="text-muted-foreground py-16 text-center text-sm">쿠폰을 불러오는 중...</p>
          </Shell>
        ) : error ? (
          <Shell>
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <TicketX className="text-muted-foreground size-10" aria-hidden />
              <p className="font-medium">
                {error instanceof ApiError && error.status === 404
                  ? "쿠폰을 찾을 수 없습니다."
                  : "쿠폰을 불러오지 못했습니다."}
              </p>
              <p className="text-muted-foreground text-sm">
                받으신 메일·문자의 링크를 다시 확인해 주세요.
              </p>
            </div>
          </Shell>
        ) : (
          <Shell>
            <div className="space-y-1 text-center">
              <p className="text-muted-foreground text-sm">
                {data.customerName
                  ? `${data.customerName}님께 드리는 쿠폰`
                  : "고객님께 드리는 쿠폰"}
              </p>
              <h1 className="text-lg font-semibold break-keep">{data.couponName}</h1>
            </div>

            <div className="border-border my-6 border-y border-dashed py-6 text-center">
              <Discount coupon={data} />
            </div>

            <dl className="text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">유효기간</dt>
                <dd className="tabular-nums">{formatPeriod(data.validFrom, data.validTo)}</dd>
              </div>
            </dl>

            <div className="mt-6">
              {data.status === "USABLE" ? (
                confirming ? (
                  <div className="space-y-2">
                    <p className="text-center text-sm">
                      사용 처리하면 되돌릴 수 없습니다. 지금 사용할까요?
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={() => setConfirming(false)}
                        disabled={use.isPending}
                      >
                        취소
                      </Button>
                      <Button size="lg" onClick={() => use.mutate()} disabled={use.isPending}>
                        {use.isPending ? "처리 중..." : "사용 확정"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button size="lg" className="w-full" onClick={() => setConfirming(true)}>
                    사용하기
                  </Button>
                )
              ) : (
                <StatusNotice status={data.status} />
              )}
            </div>
          </Shell>
        )}
        <p className="text-muted-foreground mt-4 text-center text-xs">위드어스</p>
      </div>
    </main>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <section className="bg-card rounded-2xl border p-6 shadow-sm">{children}</section>;
}

function Discount({ coupon }: { coupon: PublicCoupon }) {
  if (coupon.discountType === "AMOUNT") {
    return (
      <p className="text-4xl font-bold tabular-nums">
        {coupon.discountValue.toLocaleString("ko-KR")}
        <span className="ml-1 text-xl font-semibold">원 할인</span>
      </p>
    );
  }
  return (
    <>
      <p className="text-4xl font-bold tabular-nums">
        {coupon.discountValue}
        <span className="ml-1 text-xl font-semibold">% 할인</span>
      </p>
      {coupon.maxDiscountAmount != null && (
        <p className="text-muted-foreground mt-1 text-sm tabular-nums">
          최대 {coupon.maxDiscountAmount.toLocaleString("ko-KR")}원
        </p>
      )}
    </>
  );
}

/** 상태는 색만으로 구분하지 않고 아이콘 + 문구로 보여 준다 */
function StatusNotice({ status }: { status: Exclude<PublicCoupon["status"], "USABLE"> }) {
  const Icon = status === "USED" ? CheckCircle2 : status === "EXPIRED" ? TicketX : Clock;
  const detail =
    status === "USED"
      ? "사용 처리된 쿠폰입니다."
      : status === "EXPIRED"
        ? "유효기간이 지났습니다."
        : "아직 사용 기간이 아닙니다.";
  return (
    <div
      role="status"
      className="bg-muted flex items-center justify-center gap-2 rounded-lg py-3 text-sm font-medium"
    >
      <Icon className="size-4" aria-hidden />
      {ISSUE_STATUS_LABEL[status]} · {detail}
    </div>
  );
}
