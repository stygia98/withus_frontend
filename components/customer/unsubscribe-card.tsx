"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, LinkIcon, MailX } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
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
 * 수신거부 페이지 (PRD F-08, 8.3). 로그인 없이 메일 속 HMAC 서명 링크로 연다.
 * 링크를 여는 것(GET)으로는 아무것도 바뀌지 않고, 채널을 골라 버튼을 눌러야(POST) 처리된다.
 */
export function UnsubscribeCard({ token }: { token: string }) {
  const path = `/api/v1/public/unsubscribe/${encodeURIComponent(token)}` as const;
  const [picked, setPicked] = useState<Target | null>(null);

  const { data, isPending, error } = useQuery({
    queryKey: queryKeys.customers.unsubscribe(token),
    queryFn: () => api<UnsubscribeInfo>(path),
    retry: (count, err) => !(err instanceof ApiError && err.status === 400) && count < 2,
  });

  const submit = useMutation({
    mutationFn: (channel: Target) =>
      api<UnsubscribeResult>(path, { method: "POST", body: JSON.stringify({ channel }) }),
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "잠시 후 다시 시도해 주세요."),
  });

  const options: Target[] = data
    ? data.channels.length > 1
      ? [...data.channels, "ALL"]
      : data.channels
    : [];
  const alreadyAll = !!data && data.channels.every((c) => data.unsubscribedChannels.includes(c));
  // 아직 거부하지 않은 채널을 먼저 고른다
  const target =
    picked ??
    options.find((o) => o !== "ALL" && !data?.unsubscribedChannels.includes(o)) ??
    options[0];

  return (
    <main className="bg-muted/40 flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <section className="bg-card rounded-2xl border p-6 shadow-sm">
          {isPending ? (
            <p className="text-muted-foreground py-16 text-center text-sm">불러오는 중...</p>
          ) : error ? (
            <Notice
              icon={<LinkIcon className="text-muted-foreground size-10" aria-hidden />}
              title={
                error instanceof ApiError && error.status === 400
                  ? "유효하지 않은 링크입니다."
                  : "정보를 불러오지 못했습니다."
              }
              detail="받으신 메일·문자의 링크를 다시 확인해 주세요."
            />
          ) : submit.data ? (
            <Notice
              icon={<CheckCircle2 className="size-10 text-emerald-600" aria-hidden />}
              title="수신거부가 처리되었습니다."
              detail={
                <>
                  {submit.data.channels.map((c) => CHANNEL_LABEL[c]).join(", ")} 광고성 정보를 더
                  이상 보내지 않습니다.
                  <br />
                  처리 일시 {formatDateTime(submit.data.processedAt)}
                </>
              }
            />
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (target) submit.mutate(target);
              }}
              className="space-y-6"
            >
              <div className="space-y-1 text-center">
                <MailX className="text-muted-foreground mx-auto mb-2 size-10" aria-hidden />
                <h1 className="text-lg font-semibold">광고성 정보 수신거부</h1>
                <p className="text-muted-foreground text-sm break-keep">
                  {data.customerName ? `${data.customerName}님,` : "고객님,"} 더 이상 받지 않을
                  채널을 고른 뒤 버튼을 눌러 주세요.
                </p>
              </div>

              <fieldset className="space-y-2">
                <legend className="sr-only">수신거부할 채널</legend>
                {options.map((o) => {
                  const done = o !== "ALL" && data.unsubscribedChannels.includes(o);
                  return (
                    <label
                      key={o}
                      className="has-checked:border-primary has-checked:bg-primary/5 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border px-4 text-sm"
                    >
                      <input
                        type="radio"
                        name="channel"
                        value={o}
                        checked={target === o}
                        onChange={() => setPicked(o)}
                        className="accent-primary size-4"
                      />
                      <span className="flex-1">
                        {o === "ALL" ? "전체 (이메일 + SMS)" : CHANNEL_LABEL[o]}
                      </span>
                      {done && <span className="text-muted-foreground text-xs">수신거부됨</span>}
                    </label>
                  );
                })}
              </fieldset>

              {alreadyAll && (
                <p role="status" className="text-muted-foreground text-center text-sm">
                  이미 모든 채널이 수신거부되어 있습니다.
                </p>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={submit.isPending}>
                {submit.isPending ? "처리 중..." : "수신거부"}
              </Button>
            </form>
          )}
        </section>
        <p className="text-muted-foreground mt-4 text-center text-xs">위드어스</p>
      </div>
    </main>
  );
}

function Notice({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: React.ReactNode;
}) {
  return (
    <div role="status" className="flex flex-col items-center gap-3 py-12 text-center">
      {icon}
      <p className="font-medium">{title}</p>
      <p className="text-muted-foreground text-sm break-keep">{detail}</p>
    </div>
  );
}
