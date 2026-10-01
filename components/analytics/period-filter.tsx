"use client";

import { Input } from "@/components/ui/input";
import { PERIOD_LABEL, type Period, type PeriodPreset } from "@/lib/period";
import { cn } from "@/lib/utils";

/**
 * 기간 필터 (PRD F-09). 프리셋은 한 줄 버튼, "직접 지정"을 고르면 시작·종료 날짜 입력이 옆에 나온다.
 * 날짜가 비었거나 시작이 종료보다 늦으면 안내만 하고, 조회는 호출하는 쪽이 이전 결과를 유지한다.
 */
export function PeriodFilter({
  value,
  onChange,
  presets,
}: {
  value: Period;
  onChange: (next: Period) => void;
  presets: PeriodPreset[];
}) {
  const invalidCustom =
    value.preset === "CUSTOM" &&
    value.customFrom !== "" &&
    value.customTo !== "" &&
    value.customFrom > value.customTo;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div
        role="radiogroup"
        aria-label="조회 기간"
        className="bg-muted inline-flex rounded-lg p-0.5"
      >
        {presets.map((p) => {
          const selected = value.preset === p;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange({ ...value, preset: p })}
              className={cn(
                "rounded-md px-3 py-1 text-sm transition-colors",
                "focus-visible:ring-ring/50 outline-none focus-visible:ring-3",
                selected
                  ? "bg-background text-foreground font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {PERIOD_LABEL[p]}
            </button>
          );
        })}
      </div>
      {value.preset === "CUSTOM" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="date"
            aria-label="시작일"
            className="h-8 w-auto"
            value={value.customFrom}
            max={value.customTo || undefined}
            onChange={(e) => onChange({ ...value, customFrom: e.target.value })}
          />
          <span className="text-muted-foreground text-sm">~</span>
          <Input
            type="date"
            aria-label="종료일"
            className="h-8 w-auto"
            value={value.customTo}
            min={value.customFrom || undefined}
            onChange={(e) => onChange({ ...value, customTo: e.target.value })}
          />
          {invalidCustom && (
            <span role="alert" className="text-destructive text-sm">
              종료일은 시작일보다 빠를 수 없습니다.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
