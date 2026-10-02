"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { Segment } from "@/components/segment/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  CAMPAIGN_TYPE_LABEL,
  TRIGGER_TYPE_LABEL,
  type Campaign,
  type CampaignType,
  type TriggerType,
} from "@/lib/types/campaign";
import type { Template } from "@/lib/types/template";

const NONE = "NONE"; // 쿠폰 "연결 안 함" 선택값

const formSchema = z
  .object({
    type: z.enum(["ONE_TIME", "WORKFLOW"]),
    name: z.string().min(1, "이름을 입력하세요."),
    segmentId: z.string().min(1, "세그먼트를 선택하세요."),
    templateId: z.string().optional(),
    couponId: z.string().optional(),
    triggerType: z.enum(["SEGMENT_SCHEDULED", "CUSTOMER_REGISTERED"]).optional(),
  })
  .refine((v) => v.type !== "ONE_TIME" || !!v.templateId, {
    message: "템플릿을 선택하세요.",
    path: ["templateId"],
  })
  .refine((v) => v.type !== "WORKFLOW" || !!v.triggerType, {
    message: "트리거를 선택하세요.",
    path: ["triggerType"],
  });

type FormValues = z.infer<typeof formSchema>;

type CampaignFormProps = { mode: "create" } | { mode: "edit"; campaign: Campaign };

// 옵션 목록은 한 번에 받는다(백엔드 최대 페이지 크기 100). 그보다 많아지면 검색형 선택으로 바꾼다
const OPTION_SIZE = 100;

export function CampaignForm(props: CampaignFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const editing = props.mode === "edit" ? props.campaign : null;

  const { data: segments } = useQuery({
    queryKey: queryKeys.segments.list({ page: 0, size: OPTION_SIZE }),
    queryFn: () => api<Page<Segment>>(`/api/v1/segments?page=0&size=${OPTION_SIZE}`),
  });
  const { data: templates } = useQuery({
    queryKey: queryKeys.templates.list({ page: 0, size: OPTION_SIZE }),
    queryFn: () => api<Page<Template>>(`/api/v1/templates?page=0&size=${OPTION_SIZE}`),
  });
  const { data: coupons } = useQuery({
    queryKey: queryKeys.coupons.options,
    queryFn: () => api<Page<Coupon>>(`/api/v1/coupons?page=0&size=${OPTION_SIZE}`),
  });

  const defaults: FormValues = editing
    ? {
        type: editing.type,
        name: editing.name,
        segmentId: String(editing.segmentId),
        templateId: editing.templateId ? String(editing.templateId) : undefined,
        couponId: editing.couponId ? String(editing.couponId) : NONE,
        triggerType: editing.triggerType ?? undefined,
      }
    : { type: "ONE_TIME", name: "", segmentId: "", couponId: NONE };

  const {
    control,
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });
  const type = watch("type");

  // 수정은 DRAFT 만 가능하다(백엔드 CAMPAIGN_INVALID_STATUS). 그 외 상태는 폼을 잠근다
  const locked = editing !== null && editing.status !== "DRAFT";

  const segmentItems = (segments?.content ?? []).map((s) => ({
    value: String(s.segmentId),
    label: s.name,
  }));
  const templateItems = (templates?.content ?? []).map((t) => ({
    value: String(t.templateId),
    label: `[${t.channel}] ${t.name}`,
  }));
  const couponItems = [
    { value: NONE, label: "연결 안 함" },
    ...(coupons?.content ?? []).map((c) => ({ value: String(c.couponId), label: c.name })),
  ];
  const typeItems = (Object.keys(CAMPAIGN_TYPE_LABEL) as CampaignType[]).map((v) => ({
    value: v,
    label: CAMPAIGN_TYPE_LABEL[v],
  }));
  const triggerItems = (Object.keys(TRIGGER_TYPE_LABEL) as TriggerType[]).map((v) => ({
    value: v,
    label: TRIGGER_TYPE_LABEL[v],
  }));

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const body = {
        name: values.name,
        segmentId: Number(values.segmentId),
        templateId: values.type === "ONE_TIME" ? Number(values.templateId) : null,
        couponId:
          values.type === "ONE_TIME" && values.couponId && values.couponId !== NONE
            ? Number(values.couponId)
            : null,
        triggerType: values.type === "WORKFLOW" ? values.triggerType : null,
      };
      return editing
        ? api<Campaign>(`/api/v1/campaigns/${editing.campaignId}`, {
            method: "PUT",
            body: JSON.stringify(body),
          })
        : api<Campaign>("/api/v1/campaigns", {
            method: "POST",
            body: JSON.stringify({ ...body, type: values.type }),
          });
    },
    onSuccess: (saved) => {
      toast.success(editing ? "캠페인을 수정했습니다." : "캠페인을 만들었습니다.");
      queryClient.invalidateQueries({ queryKey: queryKeys.campaigns.all });
      // 생성 직후에는 예약·시작을 이어서 설정할 수 있게 편집 화면으로 보낸다
      router.push(`/campaigns/${saved.campaignId}/edit`);
    },
    onError: (err) => {
      // CAMPAIGN_COUPON_REQUIRED(템플릿에 {{couponUrl}} 이 있는데 쿠폰 없음) 등은 백엔드 메시지를 그대로 보여준다
      toast.error(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    },
  });

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? "캠페인 수정" : "새 캠페인"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {locked && (
            <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              작성 중(DRAFT) 상태에서만 수정할 수 있습니다.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="type">유형</Label>
            {editing ? (
              <Input id="type" value={CAMPAIGN_TYPE_LABEL[editing.type]} disabled />
            ) : (
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    items={typeItems}
                    value={field.value}
                    onValueChange={(next) => field.onChange(next)}
                  >
                    <SelectTrigger id="type" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {typeItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" disabled={locked} {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="segmentId">대상 세그먼트</Label>
            <Controller
              control={control}
              name="segmentId"
              render={({ field }) => (
                <Select
                  items={segmentItems}
                  value={field.value}
                  onValueChange={(next) => field.onChange(next)}
                  disabled={locked}
                >
                  <SelectTrigger id="segmentId" className="w-full">
                    <SelectValue placeholder="세그먼트 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {segmentItems.map((i) => (
                      <SelectItem key={i.value} value={i.value}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.segmentId && (
              <p className="text-sm text-destructive">{errors.segmentId.message}</p>
            )}
          </div>

          {type === "ONE_TIME" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="templateId">템플릿</Label>
                <Controller
                  control={control}
                  name="templateId"
                  render={({ field }) => (
                    <Select
                      items={templateItems}
                      value={field.value ?? null}
                      onValueChange={(next) => field.onChange(next)}
                      disabled={locked}
                    >
                      <SelectTrigger id="templateId" className="w-full">
                        <SelectValue placeholder="템플릿 선택" />
                      </SelectTrigger>
                      <SelectContent>
                        {templateItems.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.templateId && (
                  <p className="text-sm text-destructive">{errors.templateId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="couponId">쿠폰 (선택)</Label>
                <Controller
                  control={control}
                  name="couponId"
                  render={({ field }) => (
                    <Select
                      items={couponItems}
                      value={field.value ?? NONE}
                      onValueChange={(next) => field.onChange(next)}
                      disabled={locked}
                    >
                      <SelectTrigger id="couponId" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {couponItems.map((i) => (
                          <SelectItem key={i.value} value={i.value}>
                            {i.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  템플릿 본문에 {"{{couponUrl}}"}이 있으면 쿠폰을 반드시 연결해야 합니다.
                </p>
              </div>
            </>
          )}

          {type === "WORKFLOW" && (
            <div className="space-y-2">
              <Label htmlFor="triggerType">트리거</Label>
              <Controller
                control={control}
                name="triggerType"
                render={({ field }) => (
                  <Select
                    items={triggerItems}
                    value={field.value ?? null}
                    onValueChange={(next) => field.onChange(next)}
                    disabled={locked}
                  >
                    <SelectTrigger id="triggerType" className="w-full">
                      <SelectValue placeholder="트리거 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {triggerItems.map((i) => (
                        <SelectItem key={i.value} value={i.value}>
                          {i.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.triggerType && (
                <p className="text-sm text-destructive">{errors.triggerType.message}</p>
              )}
              <p className="text-xs text-muted-foreground">
                워크플로우 단계 구성(노드 편집)은 저장 후 편집 화면에서 추가됩니다.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/campaigns")}>
          목록
        </Button>
        {!locked && (
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "저장 중..." : "저장"}
          </Button>
        )}
      </div>
    </form>
  );
}
