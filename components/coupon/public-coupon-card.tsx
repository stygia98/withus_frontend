"use client";

import { useQuery } from "@tanstack/react-query";
import { differenceInCalendarDays, parseISO } from "date-fns";

import { CouponBarcode, formatCouponCode } from "@/components/coupon/coupon-barcode";
import { LinkError, PublicShell, Status, type Tone } from "@/components/withus-b";
import { ApiError, api } from "@/lib/api-client";
import { type PublicCoupon, formatPeriod } from "@/lib/coupon";
import { queryKeys } from "@/lib/query-keys";
import { useSeoulToday } from "@/lib/period";

const SOON_DAYS = 3; // 만료 3일 전부터 '곧 만료'로 보여 준다
const WATCH_MS = 5000; // 쓸 수 있는 쿠폰은 5초마다 다시 읽어, 매장에서 찍자마자 '사용한 쿠폰'으로 바뀌게 한다

/**
 * 고객 쿠폰 화면 (PRD F-10, API_SPEC 8장) — 디자인 키트 B의 팬 화면. 로그인 없이 메일 속 링크의 UUID 토큰으로 연다.
 * 쿠폰은 오프라인(매장) 전용이다(project #51): 이 화면은 조회만 하고 바코드와 12자리 쿠폰 번호를 보여 준다.
 * 사용 처리는 매장 직원이 관리자 화면(/coupons/redeem)에서 바코드를 찍어 한다.
 */
export function PublicCouponCard({ token }: { token: string }) {
  return (
    <PublicShell>
      <CouponBody token={token} />
    </PublicShell>
  );
}

function CouponBody({ token }: { token: string }) {
  const today = useSeoulToday();
  const path = `/api/v1/public/coupons/${encodeURIComponent(token)}` as const;
  const key = queryKeys.coupons.publicCard(token);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: key,
    queryFn: () => api<PublicCoupon>(path),
    retry: (count, err) => !(err instanceof ApiError && err.status === 404) && count < 2,
    refetchInterval: (q) => (q.state.data?.status === "USABLE" ? WATCH_MS : false),
  });

  if (isPending) return <p className="wb-public__lead">쿠폰을 불러오는 중...</p>;
  if (error) {
    const notFound = error instanceof ApiError && error.status === 404;
    return <LinkError kind={notFound ? "notFound" : "network"} onRetry={() => refetch()} />;
  }

  const daysLeft = differenceInCalendarDays(parseISO(data.validTo), parseISO(today));
  const used = data.status === "USED";
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
          `${who}께 드리는 쿠폰이에요. 매장에서 계산할 때 직원에게 바코드를 보여 주세요.`,
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
        </dl>
        <div className="wb-coupon__act">
          {data.status === "USABLE" ? (
            <>
              <CouponBarcode code={data.code} />
              <p className="wb-coupon__help">
                {soon
                  ? daysLeft <= 0
                    ? "오늘까지 쓸 수 있어요. 화면 밝기를 올리면 더 잘 찍혀요."
                    : `사용 기한이 ${daysLeft}일 남았어요. 화면 밝기를 올리면 더 잘 찍혀요.`
                  : "직원이 바코드를 찍으면 사용 처리돼요. 화면 밝기를 올리면 더 잘 찍혀요."}
              </p>
            </>
          ) : used ? (
            <>
              {/* 바코드는 숨기고 번호만 남긴다 — 흰 글자라 눈에 잘 띄지 않게 (다시 찍히지 않도록) */}
              <p className="wb-barcode__used" aria-hidden>
                {formatCouponCode(data.code)}
              </p>
              <p className="wb-coupon__help">사용 처리된 쿠폰이에요</p>
            </>
          ) : (
            <p className="wb-coupon__help" style={{ marginTop: 0 }}>
              {expired
                ? "새 쿠폰은 메일 또는 문자로 안내해 드려요."
                : `${formatPeriod(data.validFrom, data.validTo)}에 쓸 수 있어요. 기간이 되면 바코드가 열려요.`}
            </p>
          )}
        </div>
      </article>
    </>
  );
}
