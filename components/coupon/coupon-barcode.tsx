import { code128cWidths } from "@/lib/code128";

const QUIET = 10; // 바코드 양옆 조용한 영역(모듈) — 스캐너가 시작·끝을 찾는 여백

/** 12자리 쿠폰 번호를 "1234 5678 9012" 처럼 4자리씩 띄워 읽기 쉽게 */
export function formatCouponCode(code: string): string {
  return code.replace(/(\d{4})(?=\d)/g, "$1 ");
}

/**
 * 매장 바코드 (Code128C, SVG). 스캐너가 잘 읽도록 막대는 검정, 바탕은 흰색으로 고정하고
 * 모듈을 정수 비율로 늘려 흐려지지 않게(crispEdges) 그린다. 아래에 사람이 읽는 번호를 함께 둔다.
 */
export function CouponBarcode({ code }: { code: string }) {
  const widths = code128cWidths(code);
  const total = widths.reduce((a, b) => a + b, 0) + QUIET * 2;
  let x = QUIET;
  const bars: { x: number; w: number }[] = [];
  widths.forEach((w, i) => {
    if (i % 2 === 0) bars.push({ x, w });
    x += w;
  });

  return (
    <figure className="wb-barcode">
      <svg
        viewBox={`0 0 ${total} 60`}
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        role="img"
        aria-label={`쿠폰 바코드 ${formatCouponCode(code)}`}
      >
        <rect width={total} height={60} fill="#fff" />
        {bars.map((b) => (
          <rect key={b.x} x={b.x} width={b.w} height={60} fill="#000" />
        ))}
      </svg>
      <figcaption>{formatCouponCode(code)}</figcaption>
    </figure>
  );
}
