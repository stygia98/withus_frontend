/** KPI 카드 안의 작은 선 그래프 (남색 선 + 옅은 면 + 마지막 점) */
export function Sparkline({ values }: { values: number[] }) {
  const w = 200,
    h = 36;
  const mn = Math.min(...values),
    mx = Math.max(...values),
    sx = w / Math.max(1, values.length - 1);
  const y = (v: number) => h - 3 - ((v - mn) / (mx - mn || 1)) * (h - 8);
  const d = values
    .map((v, i) => `${i ? "L" : "M"}${(i * sx).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="a" d={`${d} L${w} ${h} L0 ${h}Z`} opacity=".7" />
      <path className="l" d={d} vectorEffect="non-scaling-stroke" />
      <circle cx={w} cy={y(values[values.length - 1]).toFixed(1)} r="2.5" />
    </svg>
  );
}

type Kpi = {
  label: string;
  value: string;
  delta: string;
  dir: "up" | "down" | "flat";
  series: number[];
};

/** 대시보드 KPI 4칸 */
export function KpiRow({ items }: { items: Kpi[] }) {
  return (
    <div className="kpis">
      {items.map((k) => (
        <div className="kpi" key={k.label}>
          <span className="lb">{k.label}</span>
          <b>{k.value}</b>
          <span className={`dl ${k.dir}`}>
            {k.dir === "up" ? "▲" : k.dir === "down" ? "▼" : "—"} {k.delta}{" "}
            <span className="mute vs" style={{ fontWeight: 400 }}>
              지난 기간 대비
            </span>
          </span>
          <Sparkline values={k.series} />
        </div>
      ))}
    </div>
  );
}
