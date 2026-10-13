import { KpiCard } from "@/components/withus-b";

/** KPI 숫자 카드. 숫자 몇 개는 차트가 아니라 카드로 보여 준다 (디자인 키트 B의 회색 숫자 카드) */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return <KpiCard label={label} value={value} sub={hint} />;
}
