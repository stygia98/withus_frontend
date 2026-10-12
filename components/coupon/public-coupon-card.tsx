"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";
import { useEffect, useState } from "react";

import { CouponHero, type CouponState } from "@/components/withus/CouponHero";
import { useToast } from "@/components/withus/Toast";
import { LinkError } from "@/components/withus/public/LinkError";
import { PublicShell } from "@/components/withus/public/PublicShell";
import { ApiError, api } from "@/lib/api-client";
import { type PublicCoupon, formatDiscount, formatPeriod } from "@/lib/coupon";
import { queryKeys } from "@/lib/query-keys";
import { useSeoulToday } from "@/lib/period";

const SOON_DAYS = 3; // 만료 3일 전부터 '곧 만료'로 보여 준다
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * 고객 쿠폰 화면 (PRD F-10, API_SPEC 8장) — 디자인 키트의 팬 화면. 로그인 없이 메일 속 링크의 UUID 토큰으로 연다.
 * 조회(GET)는 상태를 바꾸지 않고, 사용 처리는 확인 창을 거쳐 POST 로만 한다.
 * API 가 주지 않는 값(쿠폰 번호·코드·최소 구매금액·연락처)은 보여 주지 않는다.
 */
export function PublicCouponCard({ token }: { token: string }) {
  return (
    <PublicShell tag="My coupon" homeHref="/">
      <CouponBody token={token} />
    </PublicShell>
  );
}

function CouponBody({ token }: { token: string }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const today = useSeoulToday();
  const [sheet, setSheet] = useState(false);
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
      setSheet(false);
      toast("사용 처리되었습니다");
    },
    onError: (err) => {
      // 다른 기기에서 먼저 썼거나(409) 기간이 바뀐(422) 경우: 화면을 최신 상태로 바꾸고 확인 창을 닫는다
      if (err instanceof ApiError && (err.status === 409 || err.status === 422)) {
        setSheet(false);
        toast(err.message);
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

  useEffect(() => {
    if (!sheet) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !use.isPending && setSheet(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheet, use.isPending]);

  if (isPending) return <p className="cp-from">쿠폰을 불러오는 중...</p>;
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return <LinkError kind={notFound ? "nf" : "net"} onRetry={() => refetch()} />;
  }

  const daysLeft = differenceInCalendarDays(parseISO(data.validTo), parseISO(today));
  const state: CouponState =
    data.status === "USED"
      ? "used"
      : data.status === "EXPIRED"
        ? "exp"
        : data.status === "NOT_STARTED"
          ? "wait"
          : daysLeft <= SOON_DAYS
            ? "soon"
            : "ok";
  const cap =
    data.discountType === "RATE" && data.maxDiscountAmount != null
      ? ` · 최대 ${data.maxDiscountAmount.toLocaleString("ko-KR")}원`
      : "";
  const usable = data.status === "USABLE";

  return (
    <div className={`cp ${sheet ? "sheet-open" : ""}`}>
      <span className="eyebrow">My coupon</span>
      <h1 className="cp-title rise">
        내 <em>쿠폰</em>
      </h1>
      <p className="cp-from">
        <b>{data.customerName ? `${data.customerName}님` : "고객님"}</b>께 드리는 쿠폰입니다.
      </p>

      <CouponHero
        coupon={{
          name: data.couponName,
          type: data.discountType === "RATE" ? "percent" : "fixed",
          value: data.discountValue,
          until: parseISO(data.validTo),
          state,
          daysLeft,
          desc: `${formatPeriod(data.validFrom, data.validTo)}${cap}`,
        }}
      />

      <h2>쿠폰 상세</h2>
      <dl className="cp-done" aria-live="polite">
        <div>
          <dt>쿠폰명</dt>
          <dd>{data.couponName}</dd>
        </div>
        <div>
          <dt>할인</dt>
          <dd>{formatDiscount(data)}</dd>
        </div>
        <div>
          <dt>사용 기간</dt>
          <dd>{formatPeriod(data.validFrom, data.validTo)}</dd>
        </div>
      </dl>
      {state === "soon" ? (
        <p className="cp-left">
          {daysLeft === 0
            ? "오늘까지 사용할 수 있습니다."
            : `사용 기한이 ${daysLeft}일 남았습니다.`}
        </p>
      ) : null}

      {usable ? (
        <section className="cp-sec">
          <h2>매장에서 사용</h2>
          <button className="cp-btn" type="button" onClick={() => setSheet(true)}>
            사용하기
          </button>
          <p className="sub">
            계산할 때 직원 앞에서 눌러 주세요.
            <br />
            쿠폰은 1회만 사용할 수 있으며, 사용 후에는 취소할 수 없습니다.
          </p>
        </section>
      ) : null}

      {used ? (
        <section className="cp-sec">
          <h2>사용 완료</h2>
          <dl className="cp-done">
            <div>
              <dt>현재 시각</dt>
              <dd className="now">
                {now
                  ? `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
                  : ""}
              </dd>
            </div>
          </dl>
          <p className="sub">이 화면을 직원에게 보여 주세요.</p>
        </section>
      ) : null}

      {data.status === "EXPIRED" ? (
        <section className="cp-sec">
          <h2>사용 기한 만료</h2>
          <button className="cp-btn" type="button" disabled>
            사용할 수 없는 쿠폰입니다
          </button>
          <p className="sub">사용 기한이 지났습니다. 새 쿠폰은 메일 또는 문자로 안내해 드립니다.</p>
        </section>
      ) : null}

      {data.status === "NOT_STARTED" ? (
        <section className="cp-sec">
          <h2>아직 사용 기간이 아니에요</h2>
          <button className="cp-btn" type="button" disabled>
            사용 기간이 되면 쓸 수 있어요
          </button>
          <p className="sub">{formatPeriod(data.validFrom, data.validTo)} 에 사용할 수 있습니다.</p>
        </section>
      ) : null}

      {/* 확인 창: 여기서 한 번 더 눌러야 POST 가 나간다 */}
      <div
        className={`scrim ${sheet ? "on" : ""}`}
        aria-hidden={!sheet}
        onClick={(e) => {
          if (e.target === e.currentTarget && !use.isPending) setSheet(false);
        }}
      >
        <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="cfT">
          <h2 id="cfT">쿠폰을 사용하시겠습니까?</h2>
          <div className="sum">
            <span>{data.couponName}</span>
            <b>
              {data.discountType === "RATE"
                ? `${data.discountValue}%`
                : `${data.discountValue.toLocaleString("ko-KR")}원`}
            </b>
          </div>
          <ul>
            <li>사용 후에는 취소할 수 없습니다.</li>
            <li>매장에서는 직원 앞에서 눌러 주세요.</li>
          </ul>
          {use.isError ? (
            <p className="err-line">
              {use.error instanceof ApiError
                ? use.error.message
                : "연결이 잠깐 끊겼어요. 쿠폰은 아직 그대로예요. 다시 눌러 주세요."}
            </p>
          ) : null}
          <div className="row">
            <button
              className="btn sec"
              type="button"
              disabled={use.isPending}
              onClick={() => setSheet(false)}
            >
              취소
            </button>
            <button
              className="btn pri"
              type="button"
              disabled={use.isPending}
              onClick={() => use.mutate()}
            >
              {use.isPending ? (
                <>
                  <span className="spin" />
                  처리 중
                </>
              ) : (
                "사용하기"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
