"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { RuleBuilder } from "./rule-builder";
import { errorPosition, type FieldDef, type Preview, type Rule } from "./types";

export type SegmentForm = { name: string; description: string; rule: Rule };

/**
 * 세그먼트 생성·수정 화면 본문 (PRD 4장 /segments/new, /segments/[id]).
 * 조건을 바꾸면 500ms 뒤 대상 수를 미리 센다 (F-03). 저장 오류의 details.path 로 문제 조건을 표시한다
 */
export function SegmentEditor({
  initial,
  saving,
  saveError,
  onSave,
  actions,
}: {
  initial: SegmentForm;
  saving: boolean;
  saveError: unknown;
  onSave: (form: SegmentForm) => void;
  actions?: React.ReactNode;
}) {
  const [form, setForm] = useState(initial);
  const rule = useDebounced(form.rule, 500);

  const fields = useQuery({
    queryKey: queryKeys.segments.fields,
    queryFn: () => api<FieldDef[]>("/api/v1/segments/fields"),
    staleTime: Infinity,
  });
  const preview = useQuery({
    queryKey: queryKeys.segments.preview(rule),
    queryFn: () =>
      api<Preview>("/api/v1/segments/preview", { method: "POST", body: JSON.stringify({ rule }) }),
    retry: false,
  });

  // 저장 오류가 있으면 그것을, 없으면 미리보기 오류를 조건 위치에 표시한다
  const err = [saveError, preview.error].find((e): e is ApiError => e instanceof ApiError);
  const ruleError =
    err && err.code.startsWith("SEGMENT_")
      ? {
          ...errorPosition((err.details as { path?: unknown } | undefined)?.path),
          message: err.message,
        }
      : undefined;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <Card>
          <CardContent className="grid gap-4 pt-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">이름 *</Label>
              <Input
                id="name"
                maxLength={100}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">설명</Label>
              <Input
                id="description"
                maxLength={500}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>조건</CardTitle>
          </CardHeader>
          <CardContent>
            {fields.data ? (
              <RuleBuilder
                rule={form.rule}
                fields={fields.data}
                onChange={(next) => setForm({ ...form, rule: next })}
                error={ruleError}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {fields.isError ? "조건 필드를 불러오지 못했습니다." : "불러오는 중..."}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>대상 고객</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {preview.data ? (
              <>
                <p className="text-3xl font-semibold">{preview.data.total.toLocaleString()}명</p>
                <Count label="메일 수신동의" value={preview.data.emailConsent} />
                <Count label="SMS 수신동의" value={preview.data.smsConsent} />
                <Count label="휴면" value={preview.data.dormant} />
                <p className="pt-2 text-xs text-muted-foreground">
                  발송할 때 조건으로 다시 계산합니다. 수신거부 여부는 발송 직전에 확인합니다.
                </p>
              </>
            ) : (
              <p className="text-muted-foreground">
                {preview.isError ? "조건을 확인하세요." : "계산 중..."}
              </p>
            )}
          </CardContent>
        </Card>
        <Button
          className="w-full"
          disabled={saving || form.name.trim() === ""}
          onClick={() => onSave(form)}
        >
          {saving ? "저장 중..." : "저장"}
        </Button>
        {actions}
      </div>
    </div>
  );
}

function Count({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span>{value.toLocaleString()}명</span>
    </div>
  );
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
