import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// 시안 B 파스텔 면. 색은 의미 없이 카드를 구분하는 장식이다
const TONE = {
  lav: "bg-[var(--wu-lemon)]",
  mint: "bg-[var(--wu-mint)]",
  cream: "bg-[var(--wu-cream)]",
  pink: "bg-[var(--wu-pink)]",
};

/** KPI 숫자 카드. 숫자 몇 개는 차트가 아니라 카드로 보여 준다 */
export function StatTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof TONE;
}) {
  return (
    <Card className={cn(tone && TONE[tone], tone && "ring-0")}>
      <CardHeader className="flex flex-col gap-1">
        <CardDescription className={tone ? "text-foreground/70" : undefined}>
          {label}
        </CardDescription>
        <CardTitle className="text-3xl font-semibold tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint ? (
        <CardContent
          className={cn("-mt-2 text-xs", tone ? "text-foreground/70" : "text-muted-foreground")}
        >
          {hint}
        </CardContent>
      ) : null}
    </Card>
  );
}
