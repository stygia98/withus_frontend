"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { summarize } from "@/components/segment/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api-client";
import {
  type CampaignPlan,
  type CampaignPlanApplyResponse,
  type CampaignPlanResponse,
  GOAL_EXAMPLES,
} from "@/lib/campaign-plan";
import { queryKeys } from "@/lib/query-keys";
import { useCanManageCampaign } from "@/lib/use-can-manage-campaign";

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback;
}

/**
 * AI-04 캠페인 기획 도우미. 목표 한 줄 → 초안(저장 안 함) → 필요한 곳만 고쳐 저장.
 * 저장하면 타겟팅·쿠폰·템플릿·일회성 캠페인(DRAFT)이 한 번에 생기고, 발송은 캠페인 화면에서 직접 시작·예약한다
 */
export function CampaignPlanner() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canManage = useCanManageCampaign();
  const [goal, setGoal] = useState("");
  const [draft, setDraft] = useState<CampaignPlanResponse | null>(null);
  // 처음엔 고정 예시, "예시 새로 만들기"를 누를 때마다 AI 가 만든 4개로 바꾼다 (저장하지 않음)
  const [examples, setExamples] = useState<string[]>([...GOAL_EXAMPLES]);

  const examplesMutation = useMutation({
    mutationFn: () =>
      api<{ examples: string[] }>("/api/v1/ai/campaign-plans/examples", {
        method: "POST",
        body: JSON.stringify({ current: examples }),
      }),
    onSuccess: (res) => setExamples(res.examples),
    onError: (err) => toast.error(errorText(err, "예시를 새로 만들지 못했어요.")),
  });

  const planMutation = useMutation({
    mutationFn: (text: string) =>
      api<CampaignPlanResponse>("/api/v1/ai/campaign-plans", {
        method: "POST",
        body: JSON.stringify({ goal: text }),
      }),
    onSuccess: (res) => setDraft(res),
    onError: (err) => toast.error(errorText(err, "초안을 만들지 못했어요. 다시 시도해 주세요.")),
  });

  const applyMutation = useMutation({
    mutationFn: (plan: CampaignPlan) =>
      api<CampaignPlanApplyResponse>("/api/v1/ai/campaign-plans/apply", {
        method: "POST",
        body: JSON.stringify(plan),
      }),
    onSuccess: (res) => {
      // 네 도메인에 새 행이 생겼으니 목록 캐시를 모두 비운다
      for (const key of [
        queryKeys.campaigns.all,
        queryKeys.segments.all,
        queryKeys.templates.all,
        queryKeys.coupons.all,
      ]) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      toast.success("초안을 저장했어요. 확인한 뒤 시작하거나 예약하세요.");
      router.push(`/campaigns/${res.campaignId}/edit`);
    },
    onError: (err) => toast.error(errorText(err, "저장하지 못했어요.")),
  });

  const plan = draft?.plan;
  const update = (next: Partial<CampaignPlan>) =>
    setDraft((d) => (d ? { ...d, plan: { ...d.plan, ...next } } : d));
  const busy = planMutation.isPending || applyMutation.isPending;
  const submit = () => goal.trim() && planMutation.mutate(goal.trim());

  if (!canManage) {
    return (
      <p className="text-sm text-muted-foreground">캠페인 기획은 OWNER·MANAGER만 할 수 있어요.</p>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="size-4" aria-hidden />
            무엇을 보내고 싶나요?
          </CardTitle>
          <CardDescription>
            목표를 한 줄로 쓰면 타겟팅·쿠폰·메시지·캠페인 초안을 만들어요. 고객 개인정보는 AI에
            보내지 않아요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input
            aria-label="캠페인 목표"
            value={goal}
            maxLength={300}
            placeholder="예: 부산 고객에게 이번 주말 10% 할인 쿠폰"
            onChange={(e) => setGoal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) submit();
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            {examples.map((ex) => (
              <Button
                key={ex}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setGoal(ex)}
              >
                {ex}
              </Button>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => examplesMutation.mutate()}
              disabled={examplesMutation.isPending}
            >
              <RefreshCw
                className={examplesMutation.isPending ? "animate-spin" : undefined}
                aria-hidden
              />
              {examplesMutation.isPending ? "만드는 중..." : "예시 새로 만들기"}
            </Button>
          </div>
          <Button onClick={submit} disabled={busy || !goal.trim()}>
            <Sparkles aria-hidden />
            {planMutation.isPending ? "만드는 중..." : plan ? "새로 만들기" : "초안 만들기"}
          </Button>
        </CardContent>
      </Card>

      {plan && draft && (
        <Card>
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <CardTitle>초안</CardTitle>
              <CardDescription>
                필요한 곳만 고쳐 저장하세요. 저장해도 바로 발송되지 않아요(작성 중 상태).
              </CardDescription>
            </div>
            <Button variant="outline" onClick={submit} disabled={busy || !goal.trim()}>
              <RefreshCw
                className={planMutation.isPending ? "animate-spin" : undefined}
                aria-hidden
              />
              다시 만들기
            </Button>
          </CardHeader>
          <CardContent className="space-y-6">
            <section className="space-y-2">
              <Label htmlFor="plan-name">캠페인 이름</Label>
              <Input
                id="plan-name"
                value={plan.campaignName}
                maxLength={100}
                onChange={(e) => update({ campaignName: e.target.value })}
              />
              <p className="text-sm text-muted-foreground">
                일회성 · {plan.channel === "EMAIL" ? "메일" : "SMS"}
              </p>
            </section>

            <section className="space-y-2">
              <Label htmlFor="plan-segment">타겟팅</Label>
              <Input
                id="plan-segment"
                value={plan.segment.name}
                maxLength={100}
                onChange={(e) => update({ segment: { ...plan.segment, name: e.target.value } })}
              />
              <p className="text-sm">{summarize(plan.segment.rule)}</p>
              <p className="text-sm text-muted-foreground">
                대상 {draft.target.total.toLocaleString()}명 · 조건은 저장한 뒤 타겟팅 화면에서 바꿀
                수 있어요.
              </p>
            </section>

            {plan.coupon ? (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="plan-coupon">
                    쿠폰 · {plan.coupon.discountType === "RATE" ? "정률(%)" : "정액(원)"}
                  </Label>
                  <Button variant="ghost" size="sm" onClick={() => update({ coupon: null })}>
                    쿠폰 빼기
                  </Button>
                </div>
                <Input
                  id="plan-coupon"
                  value={plan.coupon.name}
                  maxLength={100}
                  onChange={(e) => update({ coupon: { ...plan.coupon!, name: e.target.value } })}
                />
                {/* 칸마다 보이는 이름표를 둔다 (숫자만 있으면 무엇인지 알기 어렵다) */}
                <div className="grid gap-2 sm:grid-cols-4">
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span>
                      {plan.coupon.discountType === "RATE" ? "할인율(%)" : "할인 금액(원)"}
                    </span>
                    <Input
                      type="number"
                      min={1}
                      value={plan.coupon.discountValue}
                      onChange={(e) =>
                        update({
                          coupon: { ...plan.coupon!, discountValue: Number(e.target.value) },
                        })
                      }
                    />
                  </label>
                  {plan.coupon.discountType === "RATE" && (
                    <label className="space-y-1 text-xs text-muted-foreground">
                      <span>최대 할인액(원)</span>
                      <Input
                        type="number"
                        min={1}
                        value={plan.coupon.maxDiscountAmount ?? ""}
                        onChange={(e) =>
                          update({
                            coupon: {
                              ...plan.coupon!,
                              maxDiscountAmount: Number(e.target.value) || null,
                            },
                          })
                        }
                      />
                    </label>
                  )}
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span>시작일</span>
                    <Input
                      type="date"
                      value={plan.coupon.validFrom}
                      onChange={(e) =>
                        update({ coupon: { ...plan.coupon!, validFrom: e.target.value } })
                      }
                    />
                  </label>
                  <label className="space-y-1 text-xs text-muted-foreground">
                    <span>종료일</span>
                    <Input
                      type="date"
                      value={plan.coupon.validTo}
                      onChange={(e) =>
                        update({ coupon: { ...plan.coupon!, validTo: e.target.value } })
                      }
                    />
                  </label>
                </div>
              </section>
            ) : (
              <p className="text-sm text-muted-foreground">쿠폰 없이 보내요.</p>
            )}

            <section className="space-y-2">
              <Label htmlFor="plan-template">메시지 템플릿</Label>
              <Input
                id="plan-template"
                value={plan.template.name}
                maxLength={100}
                onChange={(e) => update({ template: { ...plan.template, name: e.target.value } })}
              />
              {plan.channel === "EMAIL" && (
                <Input
                  aria-label="메일 제목"
                  value={plan.template.subject ?? ""}
                  maxLength={200}
                  onChange={(e) =>
                    update({ template: { ...plan.template, subject: e.target.value } })
                  }
                />
              )}
              <Textarea
                aria-label="본문"
                rows={8}
                value={plan.template.body}
                onChange={(e) => update({ template: { ...plan.template, body: e.target.value } })}
              />
              <p className="text-sm text-muted-foreground">
                (광고) 표기·수신거부 문구{plan.coupon ? "와 쿠폰 링크" : ""}는 시스템이 자동으로
                넣어요.
              </p>
            </section>

            <Button onClick={() => applyMutation.mutate(plan)} disabled={busy}>
              {applyMutation.isPending ? "저장 중..." : "초안으로 저장"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
