"use client";

import { format, parseISO } from "date-fns";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { type DailySend, formatCount } from "@/lib/dashboard";

// 한 계열 → 색 하나, 범례 없음(제목이 계열을 말한다). 색은 밝은·어두운 카드 배경에서 검증한 값
const config = {
  sent: { label: "발송 성공", theme: { light: "#2a78d6", dark: "#3987e5" } },
} satisfies ChartConfig;

export function DailySendsChart({ data }: { data: DailySend[] }) {
  return (
    <>
      <ChartContainer config={config} className="aspect-auto h-56 w-full">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={16}
            tickFormatter={(d: string) => format(parseISO(d), "M/d")}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
          <ChartTooltip
            cursor={{ fillOpacity: 0.3 }}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  const d = payload?.[0]?.payload?.date as string | undefined;
                  return d ? format(parseISO(d), "yyyy-MM-dd") : "";
                }}
              />
            }
          />
          <Bar dataKey="sent" fill="var(--color-sent)" radius={[4, 4, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ChartContainer>
      {/* 색·모양 없이도 읽을 수 있는 표 (화면 낭독기용) */}
      <table className="sr-only">
        <caption>일별 발송 성공 건수</caption>
        <thead>
          <tr>
            <th scope="col">날짜</th>
            <th scope="col">발송 성공</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={row.date}>
              <td>{row.date}</td>
              <td>{formatCount(row.sent)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
