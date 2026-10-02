// 백엔드 workflow.dto 와 1:1 대응 (API_SPEC 6장, DB_SCHEMA 5.2)
export type NodeType = "TRIGGER" | "WAIT" | "CONDITION" | "SEND_EMAIL" | "SEND_SMS" | "END";

/** GET /campaigns/{id}/workflow 응답의 노드 한 개. next·yes·no 는 다른 노드의 stepId */
export type WorkflowStepResponse = {
  stepId: number;
  nodeType: NodeType;
  config: Record<string, unknown>;
  next: number | null;
  yes: number | null;
  no: number | null;
  depth: number;
};

export type WorkflowResponse = { steps: WorkflowStepResponse[] };

/** PUT /workflow·POST /workflow/validate 요청 노드. key 는 요청 안에서만 쓰는 임시 식별자 */
export type WorkflowStepRequest = {
  key: string;
  nodeType: NodeType;
  config: Record<string, unknown>;
  next?: string;
  yes?: string;
  no?: string;
};

/** 화면에서 편집하는 노드. 요청 노드와 같은 모양이라 그대로 PUT 할 수 있다 */
export type BuilderNode = WorkflowStepRequest;

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
  TRIGGER: "시작",
  WAIT: "대기",
  CONDITION: "조건 분기",
  SEND_EMAIL: "메일 발송",
  SEND_SMS: "SMS 발송",
  END: "종료",
};

/** 사용자가 직접 추가할 수 있는 노드 (TRIGGER 는 하나만 있고 END 는 경로 끝에 자동으로 붙는다) */
export const ADDABLE_NODE_TYPES: NodeType[] = ["WAIT", "CONDITION", "SEND_EMAIL", "SEND_SMS"];
