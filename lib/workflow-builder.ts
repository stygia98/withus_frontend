// 폼 기반 워크플로우 빌더의 순수 편집 로직 (React 와 무관). 노드는 평평한 배열이고 next·yes·no 로 이어진다.
// 모든 경로는 END 로 끝나야 하므로(PRD 6.4) 경로 끝에는 항상 END 가 붙어 있게 유지한다.
import type { BuilderNode, NodeType, WorkflowStepResponse } from "@/lib/types/workflow";

export type Slot = "next" | "yes" | "no";

const NODE_LIMIT = 15; // PRD 6.4 — 서버 검증과 같은 값. 화면에서도 미리 막는다
export { NODE_LIMIT };

export function newKey(): string {
  return `n${crypto.randomUUID().slice(0, 8)}`;
}

export function defaultConfig(nodeType: NodeType): Record<string, unknown> {
  switch (nodeType) {
    case "WAIT":
      return { amount: 1, unit: "DAY" };
    case "CONDITION":
      return { condition: "EMAIL_CLICKED" };
    default:
      return {};
  }
}

/** 새 워크플로우의 기본 모양: TRIGGER → END */
export function initialNodes(triggerType: string | null): BuilderNode[] {
  const endKey = newKey();
  return [
    {
      key: "trigger",
      nodeType: "TRIGGER",
      config: triggerType ? { triggerType } : {},
      next: endKey,
    },
    { key: endKey, nodeType: "END", config: {} },
  ];
}

/** 서버가 준 stepId 기반 응답을 편집용 key 기반 노드로 바꾼다 */
export function fromResponse(steps: WorkflowStepResponse[]): BuilderNode[] {
  const keyOf = (id: number | null) => (id == null ? undefined : `s${id}`);
  return steps.map((s) => ({
    key: `s${s.stepId}`,
    nodeType: s.nodeType,
    config: s.config,
    next: keyOf(s.next),
    yes: keyOf(s.yes),
    no: keyOf(s.no),
  }));
}

/** slot 이 가리키는 노드 앞에 새 노드를 끼워 넣는다. 한도(15개)를 넘으면 그대로 돌려준다 */
export function insertNode(
  nodes: BuilderNode[],
  parentKey: string,
  slot: Slot,
  nodeType: NodeType,
): BuilderNode[] {
  if (nodes.length >= NODE_LIMIT) return nodes;
  const parent = nodes.find((n) => n.key === parentKey);
  if (!parent) return nodes;
  const oldTarget = parent[slot];
  const created: BuilderNode = { key: newKey(), nodeType, config: defaultConfig(nodeType) };
  const added: BuilderNode[] = [created];

  if (nodeType === "CONDITION") {
    // 기존 뒤쪽 경로는 예(yes) 쪽으로 이어 주고, 아니오(no)는 새 END 로 마무리한다
    const noEnd: BuilderNode = { key: newKey(), nodeType: "END", config: {} };
    added.push(noEnd);
    created.no = noEnd.key;
    if (oldTarget) {
      created.yes = oldTarget;
    } else {
      const yesEnd: BuilderNode = { key: newKey(), nodeType: "END", config: {} };
      added.push(yesEnd);
      created.yes = yesEnd.key;
    }
  } else {
    created.next = oldTarget;
  }
  // CONDITION 은 노드를 최대 3개(분기 + END 2개) 늘리므로 한도를 넘으면 취소한다
  if (nodes.length + added.length > NODE_LIMIT) return nodes;

  return [...nodes.map((n) => (n.key === parentKey ? { ...n, [slot]: created.key } : n)), ...added];
}

/** key 에서 도달할 수 있는 모든 노드 key (자기 자신 포함) */
function reachable(nodes: BuilderNode[], key: string, seen = new Set<string>()): Set<string> {
  if (seen.has(key)) return seen;
  seen.add(key);
  const node = nodes.find((n) => n.key === key);
  for (const next of [node?.next, node?.yes, node?.no]) {
    if (next) reachable(nodes, next, seen);
  }
  return seen;
}

/**
 * 노드를 지우고 앞 노드를 뒤 노드에 다시 잇는다. CONDITION 을 지우면 두 분기 전체가 함께 사라지고
 * 그 자리는 새 END 로 마무리한다. TRIGGER·END 는 지우지 않는다.
 */
export function removeNode(nodes: BuilderNode[], key: string): BuilderNode[] {
  const target = nodes.find((n) => n.key === key);
  if (!target || target.nodeType === "TRIGGER" || target.nodeType === "END") return nodes;

  if (target.nodeType === "CONDITION") {
    const doomed = reachable(nodes, key);
    const endNode: BuilderNode = { key: newKey(), nodeType: "END", config: {} };
    return [
      ...nodes.filter((n) => !doomed.has(n.key)).map((n) => relink(n, key, endNode.key)),
      endNode,
    ];
  }
  return nodes.filter((n) => n.key !== key).map((n) => relink(n, key, target.next));
}

/** 노드 설정 일부를 바꾼다. 값이 undefined 인 키는 지운다(예: 쿠폰 연결 해제) */
export function updateConfig(
  nodes: BuilderNode[],
  key: string,
  patch: Record<string, unknown>,
): BuilderNode[] {
  return nodes.map((n) => {
    if (n.key !== key) return n;
    const config = { ...n.config, ...patch };
    for (const k of Object.keys(config)) {
      if (config[k] === undefined) delete config[k];
    }
    return { ...n, config };
  });
}

function relink(node: BuilderNode, from: string, to: string | undefined): BuilderNode {
  const copy = { ...node };
  for (const slot of ["next", "yes", "no"] as const) {
    if (copy[slot] === from) copy[slot] = to;
  }
  return copy;
}

export type Row = {
  node: BuilderNode;
  depth: number;
  /** 이 노드로 들어오는 연결 (부모 key 와 slot). TRIGGER 는 null */
  from: { parentKey: string; slot: Slot } | null;
};

/** TRIGGER 부터 연결을 따라 들여쓰기 깊이와 함께 펼친다 (순환이 있어도 한 번씩만 방문) */
export function flatten(nodes: BuilderNode[]): Row[] {
  const byKey = new Map(nodes.map((n) => [n.key, n]));
  const rows: Row[] = [];
  const seen = new Set<string>();

  function visit(key: string | undefined, depth: number, from: Row["from"]) {
    if (!key || seen.has(key)) return;
    const node = byKey.get(key);
    if (!node) return;
    seen.add(key);
    rows.push({ node, depth, from });
    if (node.nodeType === "CONDITION") {
      visit(node.yes, depth + 1, { parentKey: key, slot: "yes" });
      visit(node.no, depth + 1, { parentKey: key, slot: "no" });
    } else {
      visit(node.next, depth, { parentKey: key, slot: "next" });
    }
  }

  const trigger = nodes.find((n) => n.nodeType === "TRIGGER");
  visit(trigger?.key, 0, null);
  return rows;
}
