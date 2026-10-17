"use client";

import { Input } from "@/components/ui/input";
import { PERIOD_LABEL, type Period, type PeriodPreset, customRangeError } from "@/lib/period";

/**
 * 기간 필터 (PRD F-09). 프리셋은 한 줄 버튼, "직접 지정"을 고르면 시작·종료 날짜 입력이 한 줄 위에 나온다.
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
  // 시작 > 종료, 366일 초과는 요청을 보내지 않고 여기서 안내한다 (lib/period.ts isComplete 와 같은 검사)
  const customError = customRangeError(value);

  return (
    <div className="relative">
      {/* 선택 상태는 aria-pressed 로 알린다 (radio 역할은 화살표 키 이동까지 구현해야 해서 쓰지 않음) */}
      <div role="group" aria-label="조회 기간" className="wb wb-seg">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={value.preset === p}
            onClick={() => onChange({ ...value, preset: p })}
          >
            {PERIOD_LABEL[p]}
          </button>
        ))}
      </div>
      {value.preset === "CUSTOM" && (
        // 버튼 줄은 제자리에 두고 날짜 입력은 그 위에 띄워 레이아웃이 밀리지 않게 한다
        <div className="absolute bottom-full right-0 z-10 mb-2 flex items-center gap-2 whitespace-nowrap">
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
          {customError && (
            <span role="alert" className="text-destructive text-sm">
              {customError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
