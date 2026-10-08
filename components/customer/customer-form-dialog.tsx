"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

import { type Customer, REGIONS } from "./types";

// 이메일·휴대폰·지역 정규화는 서버가 한다 (PRD F-01). 여기서는 필수·기본 형식만 본다
const schema = z.object({
  name: z.string().max(50),
  email: z.string().trim().min(1, "이메일을 입력하세요.").email("이메일 형식이 아닙니다."),
  phone: z.string(),
  region: z.string(),
  birthDate: z.string(),
  joinedAt: z.string().min(1, "가입일을 입력하세요."),
  emailConsent: z.enum(["Y", "N"]),
  smsConsent: z.enum(["Y", "N"]),
});
type FormValues = z.infer<typeof schema>;

const REGION_ITEMS = [
  { value: "", label: "선택 안 함" },
  ...REGIONS.map((r) => ({ value: r.code, label: r.name })),
];
const YN_ITEMS = [
  { value: "Y", label: "동의" },
  { value: "N", label: "거부" },
];

/** 고객 등록·수정. customer 가 있으면 수정 (수신동의는 수정에서 바꾸지 않는다 — 동의 변경은 별도) */
export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: Customer;
  onSaved?: (saved: Customer) => void;
}) {
  const queryClient = useQueryClient();
  const editing = customer != null;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      name: customer?.name ?? "",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      region: customer?.region ?? "",
      birthDate: customer?.birthDate ?? "",
      joinedAt: customer?.joinedAt ?? "",
      emailConsent: customer?.emailConsent ?? "N",
      smsConsent: customer?.smsConsent ?? "N",
    },
  });

  const save = useMutation({
    mutationFn: (v: FormValues) => {
      const body = {
        name: v.name,
        email: v.email,
        phone: v.phone,
        region: v.region,
        birthDate: v.birthDate,
        joinedAt: v.joinedAt,
        ...(editing ? {} : { emailConsent: v.emailConsent, smsConsent: v.smsConsent }),
      };
      return editing
        ? api<Customer>(`/api/v1/customers/${customer.customerId}`, {
            method: "PATCH",
            body: JSON.stringify(body),
          })
        : api<Customer>("/api/v1/customers", { method: "POST", body: JSON.stringify(body) });
    },
    onSuccess: (saved) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.customers.all });
      if (!editing && saved.suppressedChannels.length > 0) {
        toast.warning("과거 수신거부 이력이 있어 해당 채널은 수신거부로 등록했습니다.");
      } else {
        toast.success(editing ? "수정했습니다." : "등록했습니다.");
      }
      onOpenChange(false);
      onSaved?.(saved);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "저장하지 못했습니다."),
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "고객 수정" : "고객 등록"}</DialogTitle>
        </DialogHeader>
        <form
          id="customer-form"
          onSubmit={form.handleSubmit((v) => save.mutate(v))}
          className="grid grid-cols-2 gap-4"
        >
          <Field label="이름" htmlFor="name">
            <Input id="name" {...form.register("name")} />
          </Field>
          <Field label="이메일 *" htmlFor="email" error={errors.email?.message}>
            <Input
              id="email"
              type="email"
              {...form.register("email")}
              aria-invalid={!!errors.email}
            />
          </Field>
          <Field label="휴대폰" htmlFor="phone">
            <Input id="phone" placeholder="010-1234-5678" {...form.register("phone")} />
          </Field>
          <Field label="지역" htmlFor="region">
            <Controller
              control={form.control}
              name="region"
              render={({ field }) => (
                <Select
                  items={REGION_ITEMS}
                  value={field.value}
                  onValueChange={(v) => field.onChange(v ?? "")}
                >
                  <SelectTrigger id="region" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REGION_ITEMS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="생년월일" htmlFor="birthDate">
            <Input id="birthDate" type="date" {...form.register("birthDate")} />
          </Field>
          <Field label="가입일 *" htmlFor="joinedAt" error={errors.joinedAt?.message}>
            <Input
              id="joinedAt"
              type="date"
              {...form.register("joinedAt")}
              aria-invalid={!!errors.joinedAt}
            />
          </Field>
          {!editing &&
            (["emailConsent", "smsConsent"] as const).map((name) => (
              <Field
                key={name}
                label={name === "emailConsent" ? "이메일 수신동의" : "SMS 수신동의"}
                htmlFor={name}
              >
                <Controller
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <Select
                      items={YN_ITEMS}
                      value={field.value}
                      onValueChange={(v) => field.onChange(v ?? "N")}
                    >
                      <SelectTrigger id={name} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {YN_ITEMS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            ))}
        </form>
        {editing && (
          <p className="text-xs text-muted-foreground">
            누적구매액은 구매 등록으로만, 수신동의는 상세 화면의 동의 변경으로만 바뀝니다.
          </p>
        )}
        <DialogFooter>
          <Button type="submit" form="customer-form" disabled={save.isPending}>
            {save.isPending ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
