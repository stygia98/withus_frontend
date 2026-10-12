/* 팬 쿠폰 화면의 주인공 카드 — 레몬 면 위 큰 할인 숫자. 사용 완료 · 만료면 회색으로 바뀌어요. (.wu-public 안에서) */
/* wait = 사용 기간 전(API 의 NOT_STARTED). 모양은 만료와 같은 회색 */
export type CouponState = "ok" | "soon" | "used" | "exp" | "wait";
export type Coupon = {
  name: string;
  type: "percent" | "fixed";
  value: number;
  cap?: number;
  min?: number; // API 가 주지 않으면 생략
  desc?: string; // 있으면 기본 설명 대신 보여 준다
  until: Date;
  state: CouponState;
  daysLeft?: number;
};

const won = (n: number) => n.toLocaleString("ko-KR") + "원";
const PILL: Record<CouponState, (c: Coupon) => string> = {
  ok: () => "사용 가능",
  soon: (c) => `곧 만료 · D-${c.daysLeft ?? 0}`,
  used: () => "사용 완료",
  exp: () => "기한 만료",
  wait: () => "사용 기간 전",
};

export function CouponHero({ coupon: c }: { coupon: Coupon }) {
  return (
    <section
      className="cp-hero"
      data-st={c.state === "wait" ? "exp" : c.state}
      aria-label="쿠폰 요약"
    >
      <div className="hv">
        <b>{c.type === "percent" ? c.value : c.value.toLocaleString("ko-KR")}</b>
        <span>{c.type === "percent" ? "%" : "원"}</span>
      </div>
      <div className="hm">
        <span className="hp">{PILL[c.state](c)}</span>
        <p className="hn">{c.name}</p>
        <p className="hd">
          {c.desc ??
            `${c.until.getMonth() + 1}월 ${c.until.getDate()}일까지${c.min ? ` · ${won(c.min)} 이상 구매 시` : ""}${c.type === "percent" && c.cap ? ` · 최대 ${won(c.cap)}` : ""}`}
        </p>
      </div>
    </section>
  );
}
