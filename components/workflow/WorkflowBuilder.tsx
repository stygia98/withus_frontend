"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { NodeConfigEditor, type Option } from "./NodeConfigEditor";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, api, type Page } from "@/lib/api-client";
import type { Coupon } from "@/lib/coupon";
import { queryKeys } from "@/lib/query-keys";
import { useCanManageCampaign } from "@/lib/use-can-manage-campaign";
import type { Campaign } from "@/lib/types/campaign";
import type { Template } from "@/lib/types/template";
import {
  ADDABLE_NODE_TYPES,
  NODE_TYPE_LABEL,
  type BuilderNode,
  type NodeType,
  type WorkflowResponse,
} from "@/lib/types/workflow";
import {
  NODE_LIMIT,
  validateNodes,
  flatten,
  fromResponse,
  initialNodes,
  canInsert,
  insertNode,
  removeNode,
  updateConfig,
  type Slot,
} from "@/lib/workflow-builder";

const ADD_ITEMS = ADDABLE_NODE_TYPES.map((t) => ({ value: t, label: NODE_TYPE_LABEL[t] }));
const OPTION_SIZE = 100;

// POST /workflow/validate 응답 (API_SPEC 6장)
type ValidationResult = {
  valid: boolean;
  checks: { code: string; passed: boolean; message: string }[];
  warnings: { code: string; message: string }[];
};

function AddControl({
  disabled,
  label,
  onAdd,
}: {
  disabled: boolean;
  label: string;
  onAdd: (nodeType: NodeType) => void;
}) {
  return (
    <Select
      items={ADD_ITEMS}
      value={null}
      disabled={disabled}
      onValueChange={(next) => next && onAdd(next as NodeType)}
    >
      <SelectTrigger size="sm" className="w-40" aria-label={label}>
        <SelectValue placeholder={label} />
      </SelectTrigger>
      <SelectContent>
        {ADD_ITEMS.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function BuilderEditor({ campaign, initial }: { campaign: Campaign; initial: BuilderNode[] }) {
  const queryClient = useQueryClient();
  const canManage = useCanManageCampaign();
  const editable = campaign.status === "DRAFT" && canManage;
  const [nodes, setNodes] = useState(initial);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const rows = flatten(nodes);
  const full = nodes.length >= NODE_LIMIT;

  const { data: templates } = useQuery({
    queryKey: queryKeys.templates.list({ page: 0, size: OPTION_SIZE }),
    queryFn: () => api<Page<Template>>(`/api/v1/templates?page=0&size=${OPTION_SIZE}`),
  });
  const { data: coupons } = useQuery({
    queryKey: queryKeys.coupons.options,
    queryFn: () => api<Page<Coupon>>(`/api/v1/coupons?page=0&size=${OPTION_SIZE}`),
  });
  const toOptions = (channel: "EMAIL" | "SMS"): Option[] =>
    (templates?.content ?? [])
      .filter((t) => t.channel === channel)
      .map((t) => ({ value: String(t.templateId), label: t.name }));
  const emailTemplates = toOptions("EMAIL");
  const smsTemplates = toOptions("SMS");
  const couponOptions: Option[] = (coupons?.content ?? []).map((c) => ({
    value: String(c.couponId),
    label: c.name,
  }));

  const path = `/api/v1/campaigns/${campaign.campaignId}/workflow` as const;
  const body = JSON.stringify({ steps: nodes });

  const validate = useMutation({
    mutationFn: () => api<ValidationResult>(`${path}/validate`, { method: "POST", body }),
    onSuccess: (data) => {
      setResult(data);
      setViolations([]);
      if (data.valid) toast.success("구조 검사를 통과했습니다.");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "검사에 실패했습니다."),
  });

  const save = useMutation({
    mutationFn: () => api<WorkflowResponse>(path, { method: "PUT", body }),
    onSuccess: () => {
      toast.success("워크플로우를 저장했습니다.");
      setResult(null);
      setViolations([]);
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.workflow(campaign.campaignId),
      });
    },
    onError: (err) => {
      // WORKFLOW_INVALID_STRUCTURE 는 details 에 위반 목록(문자열 배열)이 온다
      if (err instanceof ApiError && Array.isArray(err.details)) {
        setViolations(err.details as string[]);
      }
      toast.error(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    },
  });

  /** 서버로 보내기 전에 필수값을 확인한다 */
  function submit(run: () => void) {
    const errors = validateNodes(nodes);
    setViolations(errors);
    if (errors.length > 0) {
      toast.error("필수 설정이 비어 있습니다.");
      return;
    }
    run();
  }

  function add(parentKey: string, slot: Slot, nodeType: NodeType) {
    const check = canInsert(nodes, parentKey, slot, nodeType);
    if (!check.ok) {
      toast.error(check.reason);
      return;
    }
    setNodes((prev) => insertNode(prev, parentKey, slot, nodeType));
    setResult(null);
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>
            워크플로우 단계{" "}
            <span className="text-sm font-normal text-muted-foreground">
              {nodes.length} / {NODE_LIMIT}개
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!editable && (
            <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              작성 중(DRAFT) 상태에서만 단계를 바꿀 수 있습니다.
            </p>
          )}
          {full && editable && (
            <p className="text-sm text-muted-foreground">
              노드는 최대 {NODE_LIMIT}개까지 만들 수 있습니다.
            </p>
          )}
          {rows.map(({ node, depth, from }) => (
            <div key={node.key} style={{ marginLeft: depth * 28 }} className="space-y-1">
              {from?.slot === "yes" && <p className="text-xs font-medium text-emerald-600">예</p>}
              {from?.slot === "no" && <p className="text-xs font-medium text-rose-600">아니오</p>}
              <div className="space-y-2 rounded-md border px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={node.nodeType === "END" ? "outline" : "secondary"}>
                    {NODE_TYPE_LABEL[node.nodeType]}
                  </Badge>
                  <div className="flex items-center gap-1">
                    {editable && node.nodeType === "CONDITION" && (
                      <>
                        <AddControl
                          disabled={full}
                          label="예 분기에 추가"
                          onAdd={(t) => add(node.key, "yes", t)}
                        />
                        <AddControl
                          disabled={full}
                          label="아니오 분기에 추가"
                          onAdd={(t) => add(node.key, "no", t)}
                        />
                      </>
                    )}
                    {editable && node.nodeType !== "CONDITION" && node.nodeType !== "END" && (
                      <AddControl
                        disabled={full}
                        label="다음에 추가"
                        onAdd={(t) => add(node.key, "next", t)}
                      />
                    )}
                    {editable && node.nodeType !== "TRIGGER" && node.nodeType !== "END" && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="삭제"
                        onClick={() => {
                          setNodes((prev) => removeNode(prev, node.key));
                          setResult(null);
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>
                {editable && (
                  <NodeConfigEditor
                    node={node}
                    emailTemplates={emailTemplates}
                    smsTemplates={smsTemplates}
                    coupons={couponOptions}
                    onChange={(patch) => {
                      setNodes((prev) => updateConfig(prev, node.key, patch));
                      setResult(null);
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {violations.length > 0 && (
        <Card>
          <CardContent className="space-y-1 pt-4">
            <p className="text-sm font-medium text-destructive">
              저장하지 못했습니다. 구조를 고쳐 주세요.
            </p>
            <ul className="list-disc pl-5 text-sm text-destructive">
              {violations.map((v) => (
                <li key={v}>{v}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>구조 검사 결과</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <ul className="space-y-1">
              {result.checks.map((c) => (
                <li
                  key={c.code}
                  className={c.passed ? "text-muted-foreground" : "text-destructive"}
                >
                  {c.passed ? "✔" : "✘"} {c.message}
                </li>
              ))}
            </ul>
            {result.warnings.length > 0 && (
              <ul className="space-y-1 rounded-md border border-amber-300 bg-amber-50 p-3 text-amber-900">
                {result.warnings.map((w) => (
                  <li key={w.code}>⚠ {w.message}</li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      {editable && (
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={validate.isPending}
            onClick={() => submit(() => validate.mutate())}
          >
            구조 검사
          </Button>
          <Button
            type="button"
            disabled={save.isPending}
            onClick={() => submit(() => save.mutate())}
          >
            {save.isPending ? "저장 중..." : "워크플로우 저장"}
          </Button>
        </div>
      )}
    </div>
  );
}

/** 워크플로우 캠페인의 단계 편집 (폼 기반, PRD 6.4). 서버 구조를 불러와 편집 상태로 옮긴다 */
export function WorkflowBuilder({ campaign }: { campaign: Campaign }) {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.campaigns.workflow(campaign.campaignId),
    queryFn: () => api<WorkflowResponse>(`/api/v1/campaigns/${campaign.campaignId}/workflow`),
  });

  if (isLoading || !data) return <p className="text-muted-foreground">단계를 불러오는 중...</p>;

  const initial =
    data.steps.length > 0 ? fromResponse(data.steps) : initialNodes(campaign.triggerType);
  return <BuilderEditor campaign={campaign} initial={initial} />;
}
