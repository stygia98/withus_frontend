"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { useToast } from "@/components/withus/Toast";
import { LinkError } from "@/components/withus/public/LinkError";
import { PublicShell } from "@/components/withus/public/PublicShell";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import {
  CHANNEL_LABEL,
  type Channel,
  formatDateTime,
  type UnsubscribeInfo,
  type UnsubscribeResult,
} from "./types";

type Target = Channel | "ALL";

/**
 * 수신거부 화면 (PRD F-08, 8.3) — 디자인 키트의 팬 화면. 로그인 없이 메일 속 HMAC 서명 링크로 연다.
 * 링크를 여는 것(GET)으로는 아무것도 바뀌지 않고, 채널을 골라 버튼을 눌러야(POST) 처리된다.
 * API 가 받지 않는 '거부 이유'와 주지 않는 이메일·휴대폰 전체 값은 쓰지 않는다.
 */
export function UnsubscribeCard({ token }: { token: string }) {
  return (
    <PublicShell tag="Unsubscribe" homeHref="/">
      <UnsubscribeBody token={token} />
    </PublicShell>
  );
}

function UnsubscribeBody({ token }: { token: string }) {
  const toast = useToast();
  const path = `/api/v1/public/unsubscribe/${encodeURIComponent(token)}` as const;
  const [step, setStep] = useState<1 | 2>(1);
  const [picked, setPicked] = useState<Target | null>(null);
  const [kept, setKept] = useState(false);

  const { data, isPending, error, refetch } = useQuery({
    queryKey: queryKeys.customers.unsubscribe(token),
    queryFn: () => api<UnsubscribeInfo>(path),
    retry: (count, err) => !(err instanceof ApiError && err.status === 400) && count < 2,
  });

  const submit = useMutation({
    mutationFn: (channel: Target) =>
      api<UnsubscribeResult>(path, { method: "POST", body: JSON.stringify({ channel }) }),
    onSuccess: () => {
      window.scrollTo(0, 0);
      toast("처리되었습니다");
    },
  });

  if (isPending) return <p className="cp-from">불러오는 중...</p>;
  if (error) {
    const invalid = error instanceof ApiError && error.status === 400;
    return <LinkError kind={invalid ? "nf" : "net"} onRetry={() => refetch()} />;
  }

  const options: Target[] = data.channels.length > 1 ? [...data.channels, "ALL"] : data.channels;
  const alreadyAll = data.channels.every((c) => data.unsubscribedChannels.includes(c));
  // 아직 거부하지 않은 채널을 먼저 고른다
  const target =
    picked ??
    options.find((o) => o !== "ALL" && !data.unsubscribedChannels.includes(o)) ??
    options[0];
  const done = !!submit.data;
  const screen = done || alreadyAll ? 3 : step;
  const labels = (cs: Channel[]) => cs.map((c) => CHANNEL_LABEL[c]).join(", ");

  return (
    <div className="cp">
      <span className="eyebrow">Unsubscribe</span>
      <h1 className="cp-title rise">
        수신 <em>설정</em>
      </h1>
      <p className="cp-from" style={{ marginBottom: 0 }}>
        광고성 소식 수신 설정입니다.
      </p>
      <div className="steps" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <i key={i} className={i <= screen ? "on" : ""} />
        ))}
      </div>
      <p className="u-step">
        {alreadyAll && !done
          ? "처리된 링크"
          : ["1 / 3 확인", "2 / 3 채널 선택", "3 / 3 완료"][screen - 1]}
      </p>

      {screen === 1 ? (
        <section>
          <h2 className="u-h">받는 사람 확인</h2>
          <p className="u-lead">아래 정보로 보내는 광고성 소식을 그만 받으시겠습니까?</p>
          <dl className="who">
            <div>
              <dt>받는 사람</dt>
              <dd>{data.customerName ? `${data.customerName}님` : "고객님"}</dd>
            </div>
            <div>
              <dt>수신 채널</dt>
              <dd>{labels(data.channels)}</dd>
            </div>
          </dl>
          <p className="u-lead" style={{ fontSize: 12 }}>
            본인이 아니라면 이 화면을 닫아 주세요.
          </p>
          <div className="u-act">
            <button className="btn pri" type="button" onClick={() => setStep(2)}>
              수신 거부 진행
            </button>
            <button className="btn sec" type="button" onClick={() => setKept(true)}>
              계속 받기
            </button>
          </div>
          {kept ? <p className="kept">변경 사항 없이 계속 받습니다.</p> : null}
        </section>
      ) : null}

      {screen === 2 ? (
        <section>
          <h2 className="u-h">수신 거부할 채널</h2>
          <div className="ch" role="radiogroup" aria-label="그만 받을 채널">
            {options.map((o) => {
              const already = o !== "ALL" && data.unsubscribedChannels.includes(o);
              return (
                <label key={o}>
                  <input
                    type="radio"
                    name="uch"
                    value={o}
                    checked={target === o}
                    onChange={() => setPicked(o)}
                  />
                  <span className="dot" />
                  <span>
                    <b>{o === "ALL" ? "전체" : CHANNEL_LABEL[o]}</b>
                    <small>
                      {o === "ALL" ? "이메일 · SMS 모두" : already ? "이미 수신 거부됨" : "수신 중"}
                    </small>
                  </span>
                </label>
              );
            })}
          </div>
          {submit.isError ? (
            <p className="err-line">
              {submit.error instanceof ApiError
                ? submit.error.message
                : "연결이 끊겨 처리되지 않았습니다. 다시 시도해 주세요."}
            </p>
          ) : null}
          <div className="u-act">
            <button
              className="btn pri"
              type="button"
              disabled={submit.isPending || !target}
              onClick={() => target && submit.mutate(target)}
            >
              {submit.isPending ? (
                <>
                  <span className="spin" />
                  처리 중
                </>
              ) : (
                "수신 거부하기"
              )}
            </button>
            <button className="btn sec" type="button" onClick={() => setStep(1)}>
              이전
            </button>
          </div>
          <div className="info">
            <b>유의사항</b>· 쿠폰 만료 · 주문 · 예약 등 광고가 아닌 안내는 계속 발송됩니다.
          </div>
        </section>
      ) : null}

      {screen === 3 ? (
        <section>
          <h2 className="done-h">{done ? "수신 거부 완료" : "이미 수신 거부된 상태"}</h2>
          <p className="u-lead">
            {done
              ? "요청하신 채널의 광고성 소식 발송을 중단했습니다."
              : "모든 채널이 이미 수신 거부 처리되어 있습니다."}
          </p>
          <dl className="rcpt">
            <div>
              <dt>처리한 채널</dt>
              <dd className="big">{labels(submit.data?.channels ?? data.channels)}</dd>
            </div>
            {submit.data ? (
              <div>
                <dt>처리 일시</dt>
                <dd>{formatDateTime(submit.data.processedAt)}</dd>
              </div>
            ) : null}
          </dl>
          <div className="info">
            <b>유의사항</b>· 쿠폰 만료 · 주문 · 예약 등 광고가 아닌 안내는 계속 발송됩니다.
          </div>
        </section>
      ) : null}
    </div>
  );
}
