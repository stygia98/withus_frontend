"use client";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BuilderNode } from "@/lib/types/workflow";

export type Option = { value: string; label: string };

const UNIT_ITEMS: Option[] = [
  { value: "MINUTE", label: "분" },
  { value: "HOUR", label: "시간" },
  { value: "DAY", label: "일" },
];
const CONDITION_ITEMS: Option[] = [
  { value: "EMAIL_OPENED", label: "메일 열람" },
  { value: "EMAIL_CLICKED", label: "메일 링크 클릭" },
  { value: "PURCHASE_GTE", label: "누적 구매액 이상" },
];
const NO_COUPON = "NONE";

function Pick({
  items,
  value,
  placeholder,
  onChange,
  label,
}: {
  items: Option[];
  value: string | null;
  placeholder: string;
  onChange: (next: string) => void;
  label: string;
}) {
  return (
    <Select items={items} value={value} onValueChange={(next) => next && onChange(next as string)}>
      <SelectTrigger size="sm" className="w-52" aria-label={label}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/** 노드 종류별 설정 입력 (DB_SCHEMA 5.2). TRIGGER·END 는 설정이 없다 */
export function NodeConfigEditor({
  node,
  emailTemplates,
  smsTemplates,
  coupons,
  onChange,
}: {
  node: BuilderNode;
  emailTemplates: Option[];
  smsTemplates: Option[];
  coupons: Option[];
  onChange: (patch: Record<string, unknown>) => void;
}) {
  const c = node.config;

  if (node.nodeType === "WAIT") {
    return (
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={1}
          aria-label="대기 시간"
          className="h-8 w-24"
          value={c.amount === undefined ? "" : String(c.amount)}
          onChange={(e) =>
            onChange({ amount: e.target.value ? Number(e.target.value) : undefined })
          }
        />
        <Pick
          items={UNIT_ITEMS}
          value={typeof c.unit === "string" ? c.unit : null}
          placeholder="단위"
          label="대기 단위"
          onChange={(unit) => onChange({ unit })}
        />
        <span className="text-xs text-muted-foreground">
          직전 발송이 실제로 나간 시각부터 셉니다.
        </span>
      </div>
    );
  }

  if (node.nodeType === "CONDITION") {
    const condition = typeof c.condition === "string" ? c.condition : null;
    return (
      <div className="flex items-center gap-2">
        <Pick
          items={CONDITION_ITEMS}
          value={condition}
          placeholder="조건 선택"
          label="분기 조건"
          onChange={(next) =>
            onChange({ condition: next, amount: next === "PURCHASE_GTE" ? c.amount : undefined })
          }
        />
        {condition === "PURCHASE_GTE" && (
          <Input
            type="number"
            min={0}
            aria-label="기준 금액"
            className="h-8 w-32"
            value={c.amount === undefined ? "" : String(c.amount)}
            onChange={(e) =>
              onChange({ amount: e.target.value ? Number(e.target.value) : undefined })
            }
          />
        )}
      </div>
    );
  }

  if (node.nodeType === "SEND_EMAIL" || node.nodeType === "SEND_SMS") {
    const templates = node.nodeType === "SEND_EMAIL" ? emailTemplates : smsTemplates;
    return (
      <div className="flex items-center gap-2">
        <Pick
          items={templates}
          value={c.templateId ? String(c.templateId) : null}
          placeholder="템플릿 선택"
          label="템플릿"
          onChange={(id) => onChange({ templateId: Number(id) })}
        />
        <Pick
          items={[{ value: NO_COUPON, label: "쿠폰 없음" }, ...coupons]}
          value={c.couponId ? String(c.couponId) : NO_COUPON}
          placeholder="쿠폰"
          label="쿠폰"
          onChange={(id) => onChange({ couponId: id === NO_COUPON ? undefined : Number(id) })}
        />
      </div>
    );
  }

  return null;
}
