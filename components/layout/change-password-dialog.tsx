"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
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
import { ApiError, api } from "@/lib/api-client";

const schema = z
  .object({
    currentPassword: z.string().min(1, "현재 비밀번호를 입력하세요."),
    newPassword: z.string().min(8, "8자 이상 입력하세요.").max(72, "72자까지 입력할 수 있어요."),
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    message: "새 비밀번호가 서로 달라요.",
    path: ["confirm"],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: "현재 비밀번호와 다른 비밀번호를 입력하세요.",
    path: ["newPassword"],
  });
type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = { currentPassword: "", newPassword: "", confirm: "" };

/** 내 비밀번호 변경 (API_SPEC 2장 POST /auth/password). 로그인한 모든 역할이 쓴다 */
export function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  const change = useMutation({
    mutationFn: (v: FormValues) =>
      api<null>("/api/v1/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword: v.currentPassword, newPassword: v.newPassword }),
      }),
    onSuccess: () => {
      toast.success("비밀번호를 변경했어요. 다른 기기의 로그인은 해제돼요.");
      close(false);
    },
    onError: (err) =>
      toast.error(err instanceof ApiError ? err.message : "비밀번호를 변경하지 못했어요."),
  });

  // 닫을 때마다 입력값을 비운다 (비밀번호가 폼 상태에 남지 않게)
  function close(next: boolean) {
    if (!next) form.reset(EMPTY);
    onOpenChange(next);
  }

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>비밀번호 변경</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => change.mutate(v))} className="flex flex-col gap-4">
          <PasswordField
            label="현재 비밀번호"
            id="currentPassword"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...form.register("currentPassword")}
          />
          <PasswordField
            label="새 비밀번호 (8자 이상)"
            id="newPassword"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...form.register("newPassword")}
          />
          <PasswordField
            label="새 비밀번호 확인"
            id="confirm"
            autoComplete="new-password"
            error={errors.confirm?.message}
            {...form.register("confirm")}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              취소
            </Button>
            <Button type="submit" disabled={change.isPending}>
              변경
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordField({
  label,
  id,
  error,
  ...input
}: { label: string; id: string; error?: string } & React.ComponentProps<typeof Input>) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="password" {...input} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
