"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button, LinkError, PublicShell, Status, type Tone } from "@/components/withus-b";
import { ApiError, api } from "@/lib/api-client";
import { type PublicCoupon, formatPeriod } from "@/lib/coupon";
import { queryKeys } from "@/lib/query-keys";
import { useSeoulToday } from "@/lib/period";

const SOON_DAYS = 3; // 만료 3일 전부터 '곧 만료'로 보여 준다
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 고객 쿠폰 화면 (PRD F-10, API_SPEC 8장) — 디자인 키트 B의 팬 화면. 로그인 없이 메일 속 링크의 UUID 토큰으로 연다.
 * 조회(GET)는 상태를 바꾸지 않고, 사용 처리는 확인 단계를 거쳐 POST 로만 한다.
 * API 가 주지 않는 값(쿠폰 코드·최소 구매금액·매장 이름·사용 시각)은 보여 주지 않는다.
 */
export function PublicCouponCard({ token }: { token: string }) {
  return (
    <PublicShell>
      <CouponBody token={token} />
    </PublicShell>
  );
}

function CouponBody({ token }: { token: string }) {
  const queryClient = useQueryClient();
  const today = useSeoulToday();
  const [confirm, setConfirm] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const path = `/api/v1/public/coupons/${encodeURIComponent(token)}` as const;
  const key = queryKeys.coupons.publicCard(token);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => api<PublicCoupon>(path),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
  });

  const use = useMutation({
    mutationFn: () => api<PublicCoupon>(`${path}/use`, { method: "POST" }),
    onSuccess: (card) => {
      queryClient.setQueryData(key, card);
      setConfirm(false);
      toast.success("사용 처리됐어요");
    },
    onError: (err) => {
      // 다른 기기에서 먼저 썼거나(409) 기간이 바뀐(422) 경우: 화면을 최신 상태로 바꾸고 확인 단계를 닫는다
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) {
        setConfirm(false);
        toast.error(err.message);
      }
      queryClient.invalidateQueries({ queryKey: key });
    },
  });

  const used = data?.status === "USED";
  // 사용 완료 화면에는 초 단위로 흐르는 현재 시각을 보여 줘서, 캡처한 화면이 아님을 직원이 알 수 있게 한다
  useEffect(() => {
    if (!used) return;
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, [used]);

  if (isPending) return <p className="wb-public__lead">쿠폰을 불러오는 중...</p>;
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return <LinkError kind={notFound ? "notFound" : "network"} onRetry={() => refetch()} />;
  }

  const daysLeft = differenceInCalendarDays(parseISO(data.validTo), parseISO(today));
  const expired = data.status === "EXPIRED";
  const off = used || expired;
  const soon = data.status === "USABLE" && daysLeft <= SOON_DAYS;
  const [tone, label]: [Tone, string] = used
    ? ["mute", "사용 완료"]
    : expired
      ? ["mute", "기한 만료"]
      : data.status === "NOT_STARTED"
        ? ["info", "사용 기간 전"]
        : soon
          ? ["warn", "곧 만료"]
          : ["ok", "사용 가능"];
  const value =
    data.discountType === "RATE"
      ? `${data.discountValue}% 할인`
      : `${data.discountValue.toLocaleString("ko-KR")}원 할인`;
  // 남은 날은 아직 쓸 수 있는 쿠폰에만 붙인다 (사용 완료·만료에는 의미가 없다)
  const dDay = off ? null : daysLeft <= 0 ? "D-DAY" : `D-${daysLeft}`;
  const who = data.customerName ? `${data.customerName}님` : "고객님";
  // 제목·안내는 상태에 맞춘다 — 다 쓴 쿠폰에 '도착했어요'가 뜨지 않게
  const [title, lead] = used
    ? ["사용한 쿠폰이에요", `${who}이 사용한 쿠폰이에요.`]
    : expired
      ? ["기한이 지난 쿠폰이에요", `${who}께 드렸던 쿠폰이에요. 사용 기간이 끝났어요.`]
      : [
          "쿠폰이 도착했어요",
          `${who}께 드리는 쿠폰이에요. 사용할 때 직원에게 이 화면을 보여 주세요.`,
        ];

  return (
    <>
      <span className="wb-eyebrow">내 쿠폰</span>
      <h1 className="wb-public__title wb-anim">{title}</h1>
      <p className="wb-public__lead">{lead}</p>
      <article className="wb-public__card wb-coupon" data-off={off}>
        <div className="wb-coupon__visual">
          <div className="wb-coupon__ticket">
            <header>
              <span>withus 쿠폰</span>
              <Status tone={tone}>{label}</Status>
            </header>
            <p className="wb-coupon__value">{value}</p>
            <p className="wb-coupon__name">{data.couponName}</p>
          </div>
        </div>
        <dl className="wb-dl" aria-live="polite">
          {data.discountType === "RATE" && data.maxDiscountAmount != null && (
            <div>
              <dt>최대 할인</dt>
              <dd>{data.maxDiscountAmount.toLocaleString("ko-KR")}원</dd>
            </div>
          )}
          <div>
            <dt>사용 기간</dt>
            <dd>
              {formatPeriod(data.validFrom, data.validTo)}
              {dDay && ` · ${dDay}`}
            </dd>
          </div>
          {used && (
            <div>
              <dt>지금 시각</dt>
              <dd className="wb-num">
                {now
                  ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
                  : ""}
              </dd>
            </div>
          )}
        </dl>
        <div className="wb-coupon__act">
          {used ? (
            <p className="wb-coupon__help" style={{ marginTop: 0 }}>
              사용 처리가 끝났어요. 흐르는 지금 시각은 캡처한 화면이 아니라는 표시예요.
            </p>
          ) : expired ? (
            <>
              <p className="wb-coupon__help" style={{ marginTop: 0 }}>
                새 쿠폰은 메일 또는 문자로 안내해 드려요.
              </p>
            </>
          ) : data.status === "NOT_STARTED" ? (
            <>
              <Button variant="secondary" size="lg" block disabled>
                사용 기간이 되면 쓸 수 있어요
              </Button>
              <p className="wb-coupon__help">
                {formatPeriod(data.validFrom, data.validTo)}에 사용할 수 있어요.
              </p>
            </>
          ) : confirm ? (
            // 확인 단계: 여기서 한 번 더 눌러야 POST 가 나간다
            <div className="wb-coupon__confirm" role="alertdialog" aria-label="쿠폰 사용 확인">
              <p>
                <b>직원이 확인했나요?</b>
                <br />
                <span style={{ color: "var(--wb-mute)" }}>
                  사용하면 되돌릴 수 없어요. 쿠폰은 1회만 쓸 수 있어요.
                </span>
              </p>
              {use.isError &&
              !(use.error instanceof ApiError && [409, 422].includes(use.error.status)) ? (
                <p role="alert" style={{ marginTop: 10, color: "var(--wb-err)", fontSize: 13 }}>
                  {use.error instanceof ApiError
                    ? use.error.message
                    : "연결이 잠깐 끊겼어요. 쿠폰은 아직 그대로예요. 다시 눌러 주세요."}
                </p>
              ) : null}
              <div>
                <Button
                  variant="secondary"
                  onClick={() => setConfirm(false)}
                  disabled={use.isPending}
                >
                  취소
                </Button>
                <Button onClick={() => use.mutate()} loading={use.isPending}>
                  {use.isPending ? "처리 중" : "사용 확정"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <Button size="lg" block onClick={() => setConfirm(true)}>
                사용하기
              </Button>
              <p className="wb-coupon__help">
                {soon
                  ? daysLeft <= 0
                    ? "오늘까지 사용할 수 있어요."
                    : `사용 기한이 ${daysLeft}일 남았어요.`
                  : "계산할 때 직원이 확인한 뒤 눌러 주세요."}
              </p>
            </>
          )}
        </div>
      </article>
    </>
  );
}
