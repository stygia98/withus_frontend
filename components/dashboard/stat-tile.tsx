import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** KPI 숫자 카드. 숫자 몇 개는 차트가 아니라 카드로 보여 준다 */
export function StatTile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent className="text-muted-foreground -mt-2 text-xs">{hint}</CardContent>
      ) : null}
    </Card>
  );
}
