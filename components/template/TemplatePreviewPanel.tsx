"use client";

import { useMutation } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { useTemplatePreview } from "./useTemplatePreview";

import { QueryError } from "@/components/common/QueryError";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api-client";
import type { Template } from "@/lib/types/template";

/**
 * 저장된 템플릿의 렌더링 미리보기와 테스트 발송 (API_SPEC 5장, PRD F-04).
 * 서버가 저장된 내용을 고정 샘플 값으로 치환한 결과를 보여 주고, 테스트 발송은 입력한 수신처 1건을 발송 큐(kind=TEST)에 넣는다.
 * 쿠폰 발급·추적은 하지 않고 쿠폰·수신거부 링크는 예시 주소이며 통계에서 제외된다. STAFF 도 쓸 수 있다
 */
export function TemplatePreviewPanel({ template }: { template: Template }) {
  const preview = useTemplatePreview(template);
  const [recipient, setRecipient] = useState("");
  const isEmail = template.channel === "EMAIL";

  const testSend = useMutation({
    mutationFn: (to: string) =>
      api<null>(`/api/v1/templates/${template.templateId}/test-send`, {
        method: "POST",
        body: JSON.stringify({ recipient: to }),
      }),
    onSuccess: () => {
      // 적재만 한 것이다 — 실제 발송은 발송 큐가 곧바로 처리한다
      toast.success("테스트 발송을 요청했습니다. 잠시 후 도착합니다.");
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : "테스트 발송에 실패했습니다.");
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const to = recipient.trim();
    if (!to) {
      toast.error(isEmail ? "수신 이메일을 입력하세요." : "수신 휴대폰 번호를 입력하세요.");
      return;
    }
    testSend.mutate(to);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>미리보기 · 테스트 발송</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">
          저장된 내용 기준입니다. 수정한 내용은 저장한 뒤에 반영됩니다. 이름·지역 등은 고정 샘플
          값으로 채워지고, 쿠폰·수신거부 링크는 동작하지 않는 예시 주소입니다.
        </p>

        {preview.isLoading && <p className="text-sm text-muted-foreground">불러오는 중...</p>}
        {preview.isError && (
          <QueryError
            message={
              preview.error instanceof ApiError
                ? preview.error.message
                : "미리보기를 불러오지 못했습니다."
            }
            onRetry={() => preview.refetch()}
          />
        )}
        {preview.data && isEmail && (
          <div className="space-y-2">
            <p className="text-sm">
              <span className="text-muted-foreground">제목 </span>
              <span className="font-medium">{preview.data.subject}</span>
            </p>
            {/* 메일 HTML 은 sandbox 속성이 있는 iframe 으로만 렌더링한다(CLAUDE.md 5장). 빈 sandbox 는 스크립트·폼·이동을 모두 막는다 */}
            <iframe
              title="메일 미리보기"
              sandbox=""
              srcDoc={preview.data.html ?? ""}
              className="h-[360px] w-full rounded-lg border bg-white"
            />
          </div>
        )}
        {preview.data && !isEmail && (
          <div className="space-y-2">
            <pre className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
              {preview.data.text}
            </pre>
            <p
              className={
                preview.data.smsType === "LMS"
                  ? "text-sm text-destructive"
                  : "text-sm text-muted-foreground"
              }
            >
              {preview.data.smsBytes}바이트 · {preview.data.smsType}
              {preview.data.smsType === "LMS" && " (90바이트를 넘어 LMS로 발송됩니다)"}
            </p>
          </div>
        )}

        <form onSubmit={submit} className="space-y-2 border-t pt-4">
          <Label htmlFor="test-recipient">
            {isEmail ? "테스트 수신 이메일" : "테스트 수신 휴대폰"}
          </Label>
          <div className="flex gap-2">
            <Input
              id="test-recipient"
              type={isEmail ? "email" : "tel"}
              placeholder={isEmail ? "me@example.com" : "010-1234-5678"}
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
            />
            <Button type="submit" disabled={testSend.isPending}>
              <Send className="size-4" />
              테스트 발송
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            발송 시간 제한과 수신동의 확인 없이 바로 나가며 대시보드 통계에는 잡히지 않습니다.
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
