// 세그먼트 API 타입과 조건 표시 (백엔드 segment 패키지, DB_SCHEMA 5.1 rule_json)

import { format, subDays } from "date-fns";

import { REGIONS, regionName } from "@/components/customer/types";

export type LogicalOp = "AND" | "OR";
export type Op = "EQ" | "NE" | "GT" | "GTE" | "LT" | "LTE" | "BETWEEN" | "IN" | "IN_LAST_DAYS";
export type FieldKey =
  "region" | "age" | "joinedAt" | "totalPurchase" | "emailConsent" | "smsConsent" | "dormant";

export type ConditionValue = string | number | string[] | number[];
export type Condition = { field: FieldKey; op: Op; value: ConditionValue };
export type Group = { operator: LogicalOp; conditions: Condition[] };
export type Rule = { operator: LogicalOp; groups: Group[] };

/** GET /segments/fields — 서버 화이트리스트 */
export type FieldDef = { field: FieldKey; operators: Op[] };

export type Segment = {
  segmentId: number;
  name: string;
  description: string | null;
  rule: Rule;
  targetCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Preview = { total: number; emailConsent: number; smsConsent: number; dormant: number };

export const MAX_CONDITIONS = 10;

export const FIELD_LABEL: Record<FieldKey, string> = {
  region: "지역",
  age: "나이(만)",
  joinedAt: "가입일",
  totalPurchase: "누적구매액",
  emailConsent: "메일 수신동의",
  smsConsent: "SMS 수신동의",
  dormant: "휴면",
};

export const OP_LABEL: Record<Op, string> = {
  EQ: "=",
  NE: "≠",
  GT: ">",
  GTE: "≥",
  LT: "<",
  LTE: "≤",
  BETWEEN: "범위",
  IN: "중 하나",
  IN_LAST_DAYS: "최근 N일",
};

export const LOGICAL_LABEL: Record<LogicalOp, string> = { AND: "모두 만족", OR: "하나라도 만족" };

/** 필드·연산자를 바꿨을 때 넣을 기본값 */
export function defaultValue(field: FieldKey, op: Op): ConditionValue {
  if (field === "region") return op === "IN" ? [REGIONS[0].code] : REGIONS[0].code;
  if (field === "emailConsent" || field === "smsConsent") return "Y";
  if (field === "dormant") return "N";
  if (field === "joinedAt") {
    if (op === "IN_LAST_DAYS") return 30;
    return [format(subDays(new Date(), 30), "yyyy-MM-dd"), format(new Date(), "yyyy-MM-dd")];
  }
  if (field === "age") return op === "BETWEEN" ? [20, 39] : 20;
  return op === "BETWEEN" ? [0, 100000] : 100000;
}

export function newCondition(field: FieldKey = "region", op: Op = "IN"): Condition {
  return { field, op, value: defaultValue(field, op) };
}

export function emptyRule(): Rule {
  return { operator: "AND", groups: [{ operator: "AND", conditions: [newCondition()] }] };
}

export function countConditions(rule: Rule): number {
  return rule.groups.reduce((n, g) => n + g.conditions.length, 0);
}

/** 목록의 "조건 요약" (PRD 4장) */
export function summarize(rule: Rule): string {
  const groups = rule.groups.map((g) => {
    const text = g.conditions.map(conditionText).join(g.operator === "AND" ? " 그리고 " : " 또는 ");
    return rule.groups.length > 1 && g.conditions.length > 1 ? `(${text})` : text;
  });
  return groups.join(rule.operator === "AND" ? " 그리고 " : " 또는 ");
}

export function conditionText(c: Condition): string {
  const label = FIELD_LABEL[c.field];
  const v = c.value;
  if (c.field === "region") {
    const names = (Array.isArray(v) ? v : [v]).map((code) => regionName(String(code))).join("·");
    return c.op === "NE" ? `${label} ${names} 제외` : `${label} ${names}`;
  }
  if (c.field === "emailConsent" || c.field === "smsConsent")
    return `${label} ${v === "Y" ? "동의" : "거부"}`;
  if (c.field === "dormant") return v === "Y" ? "휴면" : "휴면 아님";
  if (c.op === "IN_LAST_DAYS") return `최근 ${v}일 ${label}`;
  const fmt = (x: unknown) =>
    c.field === "totalPurchase"
      ? `${Number(x).toLocaleString()}원`
      : c.field === "age"
        ? `${x}세`
        : String(x);
  if (c.op === "BETWEEN" && Array.isArray(v)) return `${label} ${fmt(v[0])}~${fmt(v[1])}`;
  return `${label} ${OP_LABEL[c.op]} ${fmt(v)}`;
}

/** 서버 오류 details.path("groups[1].conditions[0].value") → 그룹·조건 위치 */
export function errorPosition(path: unknown): { group?: number; condition?: number } {
  const m =
    typeof path === "string" ? /groups\[(\d+)\](?:\.conditions\[(\d+)\])?/.exec(path) : null;
  return m ? { group: Number(m[1]), condition: m[2] != null ? Number(m[2]) : undefined } : {};
}
