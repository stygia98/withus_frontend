"use client";

import { useQuery } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useState } from "react";

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
import { api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Campaign } from "@/lib/types/campaign";
import {
  ADDABLE_NODE_TYPES,
  NODE_TYPE_LABEL,
  type BuilderNode,
  type NodeType,
  type WorkflowResponse,
} from "@/lib/types/workflow";
import {
  NODE_LIMIT,
  flatten,
  fromResponse,
  initialNodes,
  insertNode,
  removeNode,
  type Slot,
} from "@/lib/workflow-builder";

const ADD_ITEMS = ADDABLE_NODE_TYPES.map((t) => ({ value: t, label: NODE_TYPE_LABEL[t] }));
const UNIT_LABEL: Record<string, string> = { MINUTE: "분", HOUR: "시간", DAY: "일" };
const CONDITION_LABEL: Record<string, string> = {
  EMAIL_OPENED: "메일 열람",
  EMAIL_CLICKED: "메일 링크 클릭",
  PURCHASE_GTE: "누적 구매액 이상",
};

/** 노드 한 줄에 보여 줄 설정 요약 (설정 편집은 다음 단계에서 붙는다) */
function summarize(node: BuilderNode): string {
  const c = node.config;
  switch (node.nodeType) {
    case "WAIT":
      return `${c.amount ?? "?"}${UNIT_LABEL[String(c.unit)] ?? ""} 대기`;
    case "CONDITION": {
      const label = CONDITION_LABEL[String(c.condition)] ?? "조건 미선택";
      return c.condition === "PURCHASE_GTE" ? `${label} ${c.amount ?? "?"}원` : label;
    }
    case "SEND_EMAIL":
    case "SEND_SMS":
      return c.templateId ? `템플릿 #${c.templateId}` : "템플릿 미선택";
    default:
      return "";
  }
}

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

function BuilderEditor({ initial, editable }: { initial: BuilderNode[]; editable: boolean }) {
  const [nodes, setNodes] = useState(initial);
  const rows = flatten(nodes);
  const full = nodes.length >= NODE_LIMIT;

  function add(parentKey: string, slot: Slot, nodeType: NodeType) {
    setNodes((prev) => insertNode(prev, parentKey, slot, nodeType));
  }

  return (
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
            <div className="flex items-center justify-between gap-2 rounded-md border px-3 py-2">
              <div className="flex items-center gap-2">
                <Badge variant={node.nodeType === "END" ? "outline" : "secondary"}>
                  {NODE_TYPE_LABEL[node.nodeType]}
                </Badge>
                <span className="text-sm text-muted-foreground">{summarize(node)}</span>
              </div>
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
                    onClick={() => setNodes((prev) => removeNode(prev, node.key))}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
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
  return <BuilderEditor initial={initial} editable={campaign.status === "DRAFT"} />;
}
