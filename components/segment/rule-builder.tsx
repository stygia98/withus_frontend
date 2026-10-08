"use client";

import { Plus, X } from "lucide-react";

import { REGIONS } from "@/components/customer/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  type Condition,
  countConditions,
  defaultValue,
  FIELD_LABEL,
  type FieldDef,
  type FieldKey,
  type Group,
  LOGICAL_LABEL,
  type LogicalOp,
  MAX_CONDITIONS,
  newCondition,
  type Op,
  OP_LABEL,
  type Rule,
} from "./types";

/**
 * AND/OR 조건 빌더 (PRD F-03): 그룹 1단계, 조건 합계 10개까지.
 * 고를 수 있는 필드·연산자는 서버 화이트리스트(GET /segments/fields) 그대로 쓴다
 */
export function RuleBuilder({
  rule,
  fields,
  onChange,
  error,
}: {
  rule: Rule;
  fields: FieldDef[];
  onChange: (rule: Rule) => void;
  /** 서버가 알려준 오류 위치와 사유 */
  error?: { group?: number; condition?: number; message: string };
}) {
  const full = countConditions(rule) >= MAX_CONDITIONS;

  function setGroup(gi: number, group: Group) {
    onChange({ ...rule, groups: rule.groups.map((g, i) => (i === gi ? group : g)) });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-sm">
        <span>그룹끼리는</span>
        <LogicalSelect
          value={rule.operator}
          onChange={(operator) => onChange({ ...rule, operator })}
        />
        <span className="ml-auto text-muted-foreground">
          조건 {countConditions(rule)} / {MAX_CONDITIONS}
        </span>
      </div>

      {rule.groups.map((group, gi) => (
        <div
          key={gi}
          className={`space-y-2 rounded-lg border p-3 ${error?.group === gi && error.condition == null ? "border-destructive" : ""}`}
        >
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">그룹 {gi + 1}</span>
            <span className="text-muted-foreground">안의 조건은</span>
            <LogicalSelect
              value={group.operator}
              onChange={(operator) => setGroup(gi, { ...group, operator })}
            />
            {rule.groups.length > 1 && (
              <Button
                variant="ghost"
                size="icon-sm"
                className="ml-auto"
                aria-label={`그룹 ${gi + 1} 삭제`}
                onClick={() =>
                  onChange({ ...rule, groups: rule.groups.filter((_, i) => i !== gi) })
                }
              >
                <X />
              </Button>
            )}
          </div>

          {group.conditions.map((c, ci) => {
            const invalid = error?.group === gi && error.condition === ci;
            return (
              <div key={ci} className="space-y-1">
                <ConditionRow
                  condition={c}
                  fields={fields}
                  invalid={invalid}
                  onChange={(next) =>
                    setGroup(gi, {
                      ...group,
                      conditions: group.conditions.map((x, i) => (i === ci ? next : x)),
                    })
                  }
                  onRemove={
                    group.conditions.length > 1
                      ? () =>
                          setGroup(gi, {
                            ...group,
                            conditions: group.conditions.filter((_, i) => i !== ci),
                          })
                      : undefined
                  }
                />
                {invalid && <p className="text-xs text-destructive">{error.message}</p>}
              </div>
            );
          })}
          {error?.group === gi && error.condition == null && (
            <p className="text-xs text-destructive">{error.message}</p>
          )}

          <Button
            variant="outline"
            size="sm"
            disabled={full}
            onClick={() =>
              setGroup(gi, { ...group, conditions: [...group.conditions, newCondition()] })
            }
          >
            <Plus /> 조건 추가
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        disabled={full}
        onClick={() =>
          onChange({
            ...rule,
            groups: [...rule.groups, { operator: "AND", conditions: [newCondition()] }],
          })
        }
      >
        <Plus /> 그룹 추가
      </Button>
      {full && (
        <p className="text-xs text-muted-foreground">조건은 최대 {MAX_CONDITIONS}개입니다.</p>
      )}
    </div>
  );
}

function ConditionRow({
  condition: c,
  fields,
  invalid,
  onChange,
  onRemove,
}: {
  condition: Condition;
  fields: FieldDef[];
  invalid: boolean;
  onChange: (c: Condition) => void;
  onRemove?: () => void;
}) {
  const ops = fields.find((f) => f.field === c.field)?.operators ?? [c.op];
  const fieldItems = fields.map((f) => ({ value: f.field, label: FIELD_LABEL[f.field] }));
  const opItems = ops.map((op) => ({ value: op, label: OP_LABEL[op] }));

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded-md p-1 ${invalid ? "ring-2 ring-destructive" : ""}`}
    >
      <SimpleSelect
        items={fieldItems}
        value={c.field}
        onChange={(v) => {
          const field = v as FieldKey;
          const op = fields.find((f) => f.field === field)?.operators[0] ?? "EQ";
          onChange({ field, op, value: defaultValue(field, op) });
        }}
      />
      <SimpleSelect
        items={opItems}
        value={c.op}
        onChange={(v) => onChange({ ...c, op: v as Op, value: defaultValue(c.field, v as Op) })}
      />
      <ValueEditor condition={c} onChange={(value) => onChange({ ...c, value })} />
      {onRemove && (
        <Button variant="ghost" size="icon-sm" aria-label="조건 삭제" onClick={onRemove}>
          <X />
        </Button>
      )}
    </div>
  );
}

function ValueEditor({
  condition: c,
  onChange,
}: {
  condition: Condition;
  onChange: (value: Condition["value"]) => void;
}) {
  const v = c.value;

  if (c.field === "region" && c.op === "IN") {
    const selected = Array.isArray(v) ? (v as string[]) : [];
    return (
      <div className="flex flex-wrap gap-1">
        {REGIONS.map((r) => {
          const on = selected.includes(r.code);
          return (
            <Button
              key={r.code}
              size="xs"
              variant={on ? "default" : "outline"}
              aria-pressed={on}
              onClick={() =>
                onChange(on ? selected.filter((x) => x !== r.code) : [...selected, r.code])
              }
            >
              {r.name}
            </Button>
          );
        })}
      </div>
    );
  }
  if (c.field === "region") {
    return (
      <SimpleSelect
        items={REGIONS.map((r) => ({ value: r.code, label: r.name }))}
        value={String(v)}
        onChange={onChange}
      />
    );
  }
  if (c.field === "emailConsent" || c.field === "smsConsent" || c.field === "dormant") {
    const labels = c.field === "dormant" ? ["휴면", "휴면 아님"] : ["동의", "거부"];
    return (
      <SimpleSelect
        items={[
          { value: "Y", label: labels[0] },
          { value: "N", label: labels[1] },
        ]}
        value={String(v)}
        onChange={onChange}
      />
    );
  }

  const type = c.field === "joinedAt" && c.op === "BETWEEN" ? "date" : "number";
  const unit =
    c.field === "age"
      ? "세"
      : c.field === "totalPurchase"
        ? "원"
        : c.op === "IN_LAST_DAYS"
          ? "일"
          : "";
  const parse = (s: string) => (type === "number" ? (s === "" ? "" : Number(s)) : s);

  if (c.op === "BETWEEN" && Array.isArray(v)) {
    return (
      <div className="flex items-center gap-1">
        <Input
          className="w-36"
          type={type}
          aria-label="최소"
          value={String(v[0])}
          onChange={(e) => onChange([parse(e.target.value), v[1]] as Condition["value"])}
        />
        <span>~</span>
        <Input
          className="w-36"
          type={type}
          aria-label="최대"
          value={String(v[1])}
          onChange={(e) => onChange([v[0], parse(e.target.value)] as Condition["value"])}
        />
        {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <Input
        className="w-36"
        type="number"
        min={0}
        aria-label="값"
        value={String(v)}
        onChange={(e) => onChange(parse(e.target.value) as Condition["value"])}
      />
      {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
    </div>
  );
}

function LogicalSelect({
  value,
  onChange,
}: {
  value: LogicalOp;
  onChange: (v: LogicalOp) => void;
}) {
  return (
    <SimpleSelect
      items={(["AND", "OR"] as const).map((op) => ({
        value: op,
        label: `${op} (${LOGICAL_LABEL[op]})`,
      }))}
      value={value}
      onChange={(v) => onChange(v as LogicalOp)}
    />
  );
}

function SimpleSelect({
  items,
  value,
  onChange,
}: {
  items: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => v != null && onChange(v)}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
