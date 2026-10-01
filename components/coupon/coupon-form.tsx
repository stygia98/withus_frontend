"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, api } from "@/lib/api-client";
import { type Coupon, type CouponRequest, type DiscountType, formatDiscount } from "@/lib/coupon";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const positiveInt = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^[1-9]\d*$/, `${label}은(는) 1 이상의 정수로 입력하세요.`);

// 서버 검증(API_SPEC 7장)과 같은 규칙을 먼저 화면에서 알려 준다. 최종 판단은 서버
const schema = z
  .object({
    name: z.string().trim().min(1, "쿠폰명을 입력하세요.").max(100, "쿠폰명은 100자 이하입니다."),
    discountType: z.enum(["AMOUNT", "RATE"]),
    discountValue: positiveInt("할인 값"),
    maxDiscountAmount: z.string().trim(),
    validFrom: z.string().min(1, "시작일을 입력하세요."),
    validTo: z.string().min(1, "종료일을 입력하세요."),
  })
  .superRefine((v, ctx) => {
    if (v.discountType === "RATE") {
      if (Number(v.discountValue) > 100) {
        ctx.addIssue({
          code: "custom",
          path: ["discountValue"],
          message: "정률은 100% 이하입니다.",
        });
      }
      if (!/^[1-9]\d*$/.test(v.maxDiscountAmount)) {
        ctx.addIssue({
          code: "custom",
          path: ["maxDiscountAmount"],
          message: "정률 쿠폰은 최대 할인액(1원 이상)이 필요합니다.",
        });
      }
    }
    if (v.validFrom && v.validTo && v.validTo < v.validFrom) {
      ctx.addIssue({
        code: "custom",
        path: ["validTo"],
        message: "종료일은 시작일보다 빠를 수 없습니다.",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

const TYPE_OPTIONS: { value: DiscountType; label: string; hint: string }[] = [
  { value: "AMOUNT", label: "정액", hint: "원 단위 할인" },
  { value: "RATE", label: "정률", hint: "% 할인, 최대 할인액 필수" },
];

/** 쿠폰 생성 (PRD 4장 /coupons/new, F-10) */
export function CouponForm() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      discountType: "AMOUNT",
      discountValue: "",
      maxDiscountAmount: "",
      validFrom: "",
      validTo: "",
    },
  });

  const create = useMutation({
    mutationFn: (body: CouponRequest) =>
      api<Coupon>("/api/v1/coupons", { method: "POST", body: JSON.stringify(body) }),
    onSuccess: (coupon) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.coupons.all });
      toast.success(`"${coupon.name}" 쿠폰을 만들었습니다.`);
      router.push("/coupons");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "저장하지 못했습니다."),
  });

  const discountType = watch("discountType");
  const value = watch("discountValue");
  const cap = watch("maxDiscountAmount");
  const preview = /^[1-9]\d*$/.test(value)
    ? formatDiscount({
        discountType,
        discountValue: Number(value),
        maxDiscountAmount: /^[1-9]\d*$/.test(cap) ? Number(cap) : null,
      })
    : null;

  function onSubmit(v: FormValues) {
    create.mutate({
      name: v.name,
      discountType: v.discountType,
      discountValue: Number(v.discountValue),
      maxDiscountAmount: v.discountType === "RATE" ? Number(v.maxDiscountAmount) : null,
      validFrom: v.validFrom,
      validTo: v.validTo,
    });
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">새 쿠폰</h1>
        <p className="text-muted-foreground text-sm">
          발급이 시작되면 할인 내용은 바꿀 수 없고 유효기간 연장만 할 수 있습니다.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>쿠폰 정의</CardTitle>
          <CardDescription>
            유효기간은 발급 시점과 관계없이 모든 고객에게 같게 적용됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <Field label="쿠폰명" htmlFor="name" error={errors.name?.message}>
              <Input id="name" placeholder="예: 가을 감사 쿠폰" {...register("name")} />
            </Field>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">할인 유형</legend>
              <div role="radiogroup" aria-label="할인 유형" className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((o) => {
                  const selected = discountType === o.value;
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setValue("discountType", o.value, { shouldValidate: false })}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        "focus-visible:ring-ring/50 outline-none focus-visible:ring-3",
                        selected ? "border-primary bg-primary/5" : "hover:bg-muted",
                      )}
                    >
                      <span className="block text-sm font-medium">{o.label}</span>
                      <span className="text-muted-foreground block text-xs">{o.hint}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={discountType === "AMOUNT" ? "할인 금액 (원)" : "할인율 (%)"}
                htmlFor="discountValue"
                error={errors.discountValue?.message}
              >
                <Input id="discountValue" inputMode="numeric" {...register("discountValue")} />
              </Field>
              {discountType === "RATE" && (
                <Field
                  label="최대 할인액 (원)"
                  htmlFor="maxDiscountAmount"
                  error={errors.maxDiscountAmount?.message}
                >
                  <Input
                    id="maxDiscountAmount"
                    inputMode="numeric"
                    {...register("maxDiscountAmount")}
                  />
                </Field>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="시작일" htmlFor="validFrom" error={errors.validFrom?.message}>
                <Input id="validFrom" type="date" {...register("validFrom")} />
              </Field>
              <Field label="종료일 (당일 포함)" htmlFor="validTo" error={errors.validTo?.message}>
                <Input id="validTo" type="date" {...register("validTo")} />
              </Field>
            </div>

            <p className="text-muted-foreground text-sm" aria-live="polite">
              고객에게 보이는 할인 문구:{" "}
              <span className="text-foreground font-medium">{preview ?? "–"}</span>
            </p>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => router.push("/coupons")}>
                취소
              </Button>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? "저장 중..." : "쿠폰 만들기"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
