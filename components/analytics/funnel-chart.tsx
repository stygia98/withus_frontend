"use client";

import { Bar, BarChart, LabelList, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { FUNNEL_LABEL, type FunnelStage, formatCount, formatRate } from "@/lib/dashboard";

const config = {
  count: { label: "고객·건수", theme: { light: "#2a78d6", dark: "#3987e5" } },
} satisfies ChartConfig;

/** 전환 흐름: 순서 있는 단계의 크기 비교 → 가로 막대 한 계열. 각 막대 끝에 값과 시도 대비 비율을 적는다 */
export function FunnelChart({
  funnel,
  caption = "캠페인 전환 흐름",
}: {
  funnel: FunnelStage[];
  caption?: string;
}) {
  const attempted = funnel.find((s) => s.stage === "ATTEMPTED")?.count ?? 0;
  const data = funnel.map((s) => {
    const share = attempted > 0 ? s.count / attempted : 0;
    // 막대 끝 글자를 미리 만든다(값이 같은 단계가 있어도 각자 자기 비율을 쓴다)
    return {
      stage: FUNNEL_LABEL[s.stage],
      count: s.count,
      share,
      display: `${formatCount(s.count)} (${formatRate(share)})`,
    };
  });

  return (
    <>
      {/* 행 수에 맞춰 높이를 정한다 (단계가 적은 문자 흐름도 막대 간격이 같게) */}
      <ChartContainer
        config={config}
        className="aspect-auto w-full"
        style={{ height: data.length * 48 + 16 }}
      >
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 112, left: 8, bottom: 4 }}
          barCategoryGap={8}
        >
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} width={72} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.3 }}
            content={<ChartTooltipContent hideLabel={false} />}
          />
          {/* 0 인 단계도 막대 끝 값("0 (0.0%)")이 보이도록 최소 2px 로 그린다 */}
          <Bar
            dataKey="count"
            fill="var(--color-count)"
            radius={[0, 4, 4, 0]}
            maxBarSize={28}
            minPointSize={2}
          >
            {/* 값 글자는 계열 색이 아니라 본문 색으로 쓴다 */}
            <LabelList
              dataKey="display"
              position="right"
              className="fill-foreground"
              fontSize={12}
            />
          </Bar>
        </BarChart>
      </ChartContainer>
      <table className="sr-only">
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">단계</th>
            <th scope="col">수</th>
            <th scope="col">발송 시도 대비</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.stage}>
              <td>{row.stage}</td>
              <td>{formatCount(row.count)}</td>
              <td>{formatRate(row.share)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
