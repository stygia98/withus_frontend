"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button, CheckRow, Icon, LinkError, PublicShell } from "@/components/withus-b";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import {
  CHANNEL_LABEL,
  type Channel,
  formatDateTime,
  type UnsubscribeInfo,
  type UnsubscribeResult,
} from "./types";

const CHANNEL_DESC: Record<Channel, [string, string]> = {
  EMAIL: ["이메일 광고 그만 받기", "신상품 · 쿠폰 · 이벤트 메일"],
  SMS: ["문자(SMS) 광고 그만 받기", "(광고) 표시가 붙은 문자"],
};

/**
 * 수신거부 화면 (PRD F-08, 8.3) — 디자인 키트 B의 팬 화면. 로그인 없이 메일 속 HMAC 서명 링크로 연다.
 * 링크를 여는 것(GET)으로는 아무것도 바뀌지 않고, 채널을 골라 버튼을 눌러야(POST) 처리된다.
 * API 가 받지 않는 '거부 이유'와 주지 않는 이메일·휴대폰 값은 쓰지 않는다.
 * 시안의 '다시 받기'는 넣지 않는다 — 수신거부(suppression)는 관리자가 증빙과 함께만 해제한다 (CLAUDE.md 6장 10번)
 */
export function UnsubscribeCard({ token }: { token: string }) {
  return (
    <PublicShell>
      <UnsubscribeBody token={token} />
    </PublicShell>
  );
}

function UnsubscribeBody({ token }: { token: string }) {
  const path = `/api/v1/public/unsubscribe/${encodeURIComponent(token)}` as const;
  const [picked, setPicked] = useState<Channel[]>([]);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.customers.unsubscribe(token),
    queryFn: () => api<UnsubscribeInfo>(path),
    retry: (count, err) => !(err instanceof ApiError && err.status === 400) && count < 2,
  });

  const submit = useMutation({
    // 두 채널을 모두 고르면 ALL 로 보낸다 (API 는 채널 하나 또는 ALL 을 받는다)
    mutationFn: (channel: Channel | "ALL") =>
      api<UnsubscribeResult>(path, { method: "POST", body: JSON.stringify({ channel }) }),
    onSuccess: () => {
      window.scrollTo(0, 0);
      toast.success("처리됐어요");
    },
  });

  if (isPending) return <p className="wb-public__lead">불러오는 중...</p>;
  if (error) {
    const invalid = error instanceof ApiError && error.status === 400;
    return <LinkError kind={invalid ? "notFound" : "network"} onRetry={() => refetch()} />;
  }

  const labels = (cs: Channel[]) => cs.map((c) => CHANNEL_LABEL[c]).join(" · ");
  const name = data.customerName ? `${data.customerName}님` : "고객님";
  const open = data.channels.filter((c) => !data.unsubscribedChannels.includes(c));
  const result = submit.data;

  if (result || open.length === 0) {
    return (
      <>
        <span className="wb-eyebrow">수신 설정</span>
        <h1 className="wb-public__title wb-anim">
          {result ? "수신 거부가 끝났어요" : "이미 수신 거부한 상태예요"}
        </h1>
        <article className="wb-public__card">
          <div className="wb-done">
            <span className="wb-icon">
              <Icon name="check" />
            </span>
            <h3>더 이상 광고를 보내지 않아요</h3>
            <p>쿠폰 만료 · 주문 · 예약 같은 광고가 아닌 안내는 계속 받아요.</p>
          </div>
          <dl className="wb-dl" style={{ borderTop: "1px solid var(--wb-line)" }}>
            <div>
              <dt>받는 사람</dt>
              <dd>{name}</dd>
            </div>
            <div>
              <dt>처리 채널</dt>
              <dd>{labels(result?.channels ?? data.unsubscribedChannels)}</dd>
            </div>
            {result && (
              <div>
                <dt>처리 일시</dt>
                <dd>{formatDateTime(result.processedAt)}</dd>
              </div>
            )}
          </dl>
        </article>
      </>
    );
  }

  // 채널은 이메일 · SMS 두 개뿐이라 둘 다 고르면 ALL 이다
  const target: Channel | "ALL" | null =
    picked.length === 0 ? null : picked.length > 1 ? "ALL" : picked[0];
  const toggle = (c: Channel, on: boolean) =>
    setPicked((p) => (on ? [...p.filter((x) => x !== c), c] : p.filter((x) => x !== c)));

  return (
    <>
      <span className="wb-eyebrow">수신 설정</span>
      <h1 className="wb-public__title wb-anim">어떤 광고를 그만 받을까요?</h1>
      <p className="wb-public__lead">
        고른 채널만 바로 멈춰요. 본인이 아니라면 이 화면을 닫아 주세요.
      </p>
      <article className="wb-public__card">
        <div className="wb-who">
          <span
            className="wb-avatar"
            style={{ background: "var(--wb-grey)", color: "var(--wb-ink)" }}
          >
            {(data.customerName ?? "고").slice(0, 1)}
          </span>
          <div>
            <b>{name}</b>
            <small>수신 채널 · {labels(data.channels)}</small>
          </div>
        </div>
        {data.channels.map((c) => {
          const already = data.unsubscribedChannels.includes(c);
          return (
            <CheckRow
              key={c}
              checked={already || picked.includes(c)}
              disabled={already}
              onChange={(on) => toggle(c, on)}
              title={CHANNEL_DESC[c][0]}
              desc={already ? "이미 수신 거부됨" : CHANNEL_DESC[c][1]}
            />
          );
        })}
        {submit.isError ? (
          <p role="alert" style={{ margin: "14px 22px 0", color: "var(--wb-err)", fontSize: 13 }}>
            {submit.error instanceof ApiError
              ? submit.error.message
              : "연결이 끊겨 처리되지 않았어요. 다시 시도해 주세요."}
          </p>
        ) : null}
        <div className="wb-coupon__act" style={{ paddingTop: 18 }}>
          <Button
            size="lg"
            block
            disabled={!target}
            loading={submit.isPending}
            onClick={() => target && submit.mutate(target)}
          >
            {submit.isPending
              ? "처리 중"
              : target === "ALL"
                ? "모든 광고 그만 받기"
                : target
                  ? "선택한 광고 그만 받기"
                  : "그만 받을 광고를 골라 주세요"}
          </Button>
        </div>
      </article>
    </>
  );
}
