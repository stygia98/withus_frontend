"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Status } from "@/components/withus-b";
import type { Me, Role } from "@/components/layout/admin-shell";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, api } from "@/lib/api-client";
import { formatSeoul } from "@/lib/datetime";
import { queryKeys } from "@/lib/query-keys";

type Member = {
  memberId: number;
  email: string;
  name: string;
  role: Role;
  active: boolean;
  deletedAt: string | null;
};

const ROLE_ITEMS: { value: Role; label: string }[] = [
  { value: "OWNER", label: "OWNER · 전체 권한" },
  { value: "MANAGER", label: "MANAGER · 운영" },
  { value: "STAFF", label: "STAFF · 템플릿·조회·쿠폰 사용 처리" },
];
const ROLE_LABEL: Record<Role, string> = { OWNER: "OWNER", MANAGER: "MANAGER", STAFF: "STAFF" };

/**
 * 시스템 설정 > 사용자 관리 (PRD 4장 /settings/users, 3장 OWNER 전용, API_SPEC 2장).
 * 계정마다 '수정' 하나로 이름·이메일·역할·상태·비밀번호 재설정·삭제를 한 창에서 처리한다. 삭제한 계정은 '삭제된 계정'에서 복구한다
 */
export default function UsersPage() {
  const [creating, setCreating] = useState(false);
  const [editTarget, setEditTarget] = useState<Member | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);
  // 로그인 정보는 레이아웃(AdminShell)이 이미 불러와 캐시에 있다
  const me = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api<Me>("/api/v1/auth/me"),
  });
  const members = useQuery({
    queryKey: queryKeys.members.all,
    queryFn: () => api<Member[]>("/api/v1/members"),
  });

  const forbidden = members.error instanceof ApiError && members.error.status === 403;

  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="wb-title">사용자 관리</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            관리자 계정을 만들고 역할(OWNER · MANAGER · STAFF)을 정해요.
          </p>
        </div>
        {!forbidden && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowDeleted(true)}>
              삭제된 계정
            </Button>
            <Button onClick={() => setCreating(true)}>사용자 추가</Button>
          </div>
        )}
      </header>

      <div>
        {forbidden ? (
          <p className="text-sm text-muted-foreground">사용자 관리는 OWNER 만 할 수 있어요.</p>
        ) : members.isError ? (
          <p className="text-sm text-destructive">사용자 목록을 불러오지 못했어요.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.data?.map((m) => {
                const self = m.memberId === me.data?.memberId;
                return (
                  <TableRow key={m.memberId}>
                    <TableCell className="font-medium">
                      {m.name}
                      {self && <span className="ml-1 text-xs text-muted-foreground">(나)</span>}
                    </TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>{ROLE_LABEL[m.role]}</TableCell>
                    <TableCell>
                      <Status tone={m.active ? "ok" : "warn"}>
                        {m.active ? "활성" : "비활성"}
                      </Status>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => setEditTarget(m)}>
                        수정
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <CreateMemberDialog open={creating} onOpenChange={setCreating} />
      {editTarget && (
        <EditMemberDialog
          key={editTarget.memberId}
          target={editTarget}
          self={editTarget.memberId === me.data?.memberId}
          onClose={() => setEditTarget(null)}
        />
      )}
      <DeletedMembersDialog open={showDeleted} onOpenChange={setShowDeleted} />
    </div>
  );
}

const editSchema = z.object({
  name: z.string().trim().min(1, "이름을 입력하세요.").max(50, "이름은 50자까지예요."),
  email: z.string().trim().min(1, "이메일을 입력하세요.").email("이메일 형식이 아니에요."),
  role: z.enum(["OWNER", "MANAGER", "STAFF"]),
  active: z.enum(["Y", "N"]),
  // 비우면 비밀번호를 바꾸지 않는다
  newPassword: z
    .string()
    .refine(
      (v) => v === "" || (v.length >= 8 && v.length <= 72),
      "8~72자로 입력하거나 비워 두세요.",
    ),
});
type EditValues = z.infer<typeof editSchema>;

/**
 * 계정 수정 (API_SPEC 2장). 저장 한 번으로 바뀐 값만 PATCH 하고, 새 비밀번호가 있으면 재설정(POST /password)도 한다.
 * 자기 계정은 이름·이메일만 바꾼다 — 역할·상태는 MEMBER_SELF_CHANGE, 비밀번호는 '내 비밀번호 변경', 삭제는 MEMBER_SELF_DELETE
 */
function EditMemberDialog({
  target,
  self,
  onClose,
}: {
  target: Member;
  self: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const form = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: target.name,
      email: target.email,
      role: target.role,
      active: target.active ? "Y" : "N",
      newPassword: "",
    },
  });

  const save = useMutation({
    mutationFn: async (v: EditValues) => {
      const body: Record<string, unknown> = {};
      if (v.name.trim() !== target.name) body.name = v.name.trim();
      if (v.email.trim().toLowerCase() !== target.email) body.email = v.email.trim();
      if (!self && v.role !== target.role) body.role = v.role;
      if (!self && (v.active === "Y") !== target.active) body.active = v.active === "Y";
      if (Object.keys(body).length > 0) {
        await api<Member>(`/api/v1/members/${target.memberId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      }
      if (!self && v.newPassword) {
        await api<null>(`/api/v1/members/${target.memberId}/password`, {
          method: "POST",
          body: JSON.stringify({ newPassword: v.newPassword }),
        });
      }
      return { changed: Object.keys(body).length > 0, password: !self && !!v.newPassword, body };
    },
    onSuccess: ({ changed, password, body }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      // 내 이름·이메일을 바꿨으면 사이드바의 내 정보도 새로 읽는다
      if (self) queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
      if (!changed && !password) toast.message("바뀐 내용이 없어요.");
      else if (password)
        toast.success("저장했어요. 새 비밀번호를 그 사용자에게 직접 전달해 주세요.");
      else if ("role" in body || "active" in body)
        toast.success("저장했어요. 그 사용자는 늦어도 30분 안에 다시 로그인하게 돼요.");
      else toast.success("저장했어요.");
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "저장하지 못했어요."),
  });

  const remove = useMutation({
    mutationFn: () => api<null>(`/api/v1/members/${target.memberId}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      toast.success("계정을 삭제했어요. '삭제된 계정'에서 복구할 수 있어요.");
      onClose();
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "삭제하지 못했어요."),
  });

  const errors = form.formState.errors;
  const busy = save.isPending || remove.isPending;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>계정 수정{self && " (내 계정)"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => save.mutate(v))} className="flex flex-col gap-4">
          <Field label="이름" htmlFor="editName" error={errors.name?.message}>
            <Input id="editName" {...form.register("name")} />
          </Field>
          <Field label="이메일" htmlFor="editEmail" error={errors.email?.message}>
            <Input id="editEmail" type="email" autoComplete="off" {...form.register("email")} />
          </Field>
          <Field label="역할" htmlFor="editRole">
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Select
                  items={ROLE_ITEMS}
                  value={field.value}
                  disabled={self}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <SelectTrigger id="editRole" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_ITEMS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field label="상태" htmlFor="editActive">
            <Controller
              control={form.control}
              name="active"
              render={({ field }) => (
                <Select
                  items={ACTIVE_ITEMS}
                  value={field.value}
                  disabled={self}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <SelectTrigger id="editActive" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVE_ITEMS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          {self ? (
            <p className="text-xs text-muted-foreground">
              내 계정은 이름·이메일만 바꿀 수 있어요. 비밀번호는 &lsquo;비밀번호 변경&rsquo;에서
              바꿔 주세요.
            </p>
          ) : (
            <Field
              label="비밀번호 재설정 (비우면 그대로)"
              htmlFor="editPassword"
              error={errors.newPassword?.message}
            >
              <Input
                id="editPassword"
                type="password"
                autoComplete="new-password"
                placeholder="새 비밀번호 8자 이상"
                {...form.register("newPassword")}
              />
            </Field>
          )}

          {!self &&
            (confirmDelete ? (
              <div className="flex flex-col gap-2 rounded-md border border-destructive/40 p-3">
                <p className="text-sm">
                  {target.name} 계정을 삭제할까요? 목록과 로그인에서 빠지고, 만든 캠페인 등은 그대로
                  남아요. &lsquo;삭제된 계정&rsquo;에서 복구할 수 있어요.
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    닫기
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={busy}
                    onClick={() => remove.mutate()}
                  >
                    삭제 확정
                  </Button>
                </div>
              </div>
            ) : null)}

          <DialogFooter className="sm:justify-between">
            {!self && !confirmDelete ? (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                계정 삭제
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                취소
              </Button>
              <Button type="submit" disabled={busy}>
                저장
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ACTIVE_ITEMS: { value: "Y" | "N"; label: string }[] = [
  { value: "Y", label: "활성" },
  { value: "N", label: "비활성 (로그인 불가)" },
];

/** 삭제한 계정 목록과 복구 (API_SPEC 2장 GET /members/deleted, POST /members/{id}/restore) */
function DeletedMembersDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const deleted = useQuery({
    queryKey: queryKeys.members.deleted,
    queryFn: () => api<Member[]>("/api/v1/members/deleted"),
    enabled: open,
  });
  const restore = useMutation({
    mutationFn: (memberId: number) =>
      api<Member>(`/api/v1/members/${memberId}/restore`, { method: "POST" }),
    onSuccess: (m) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      toast.success(`${m.name} 계정을 복구했어요. 예전 비밀번호로 로그인할 수 있어요.`);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "복구하지 못했어요."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>삭제된 계정</DialogTitle>
        </DialogHeader>
        {deleted.isError ? (
          <p className="text-sm text-destructive">삭제된 계정을 불러오지 못했어요.</p>
        ) : deleted.data && deleted.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">삭제된 계정이 없어요.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead>역할</TableHead>
                <TableHead>삭제일</TableHead>
                <TableHead>관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deleted.data?.map((m) => (
                <TableRow key={m.memberId}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.email}</TableCell>
                  <TableCell>{ROLE_LABEL[m.role]}</TableCell>
                  <TableCell>
                    {m.deletedAt ? formatSeoul(m.deletedAt, "yyyy.MM.dd HH:mm") : "-"}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={restore.isPending}
                      onClick={() => restore.mutate(m.memberId)}
                    >
                      복구
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

const schema = z.object({
  email: z.string().trim().min(1, "이메일을 입력하세요.").email("이메일 형식이 아니에요."),
  name: z.string().trim().min(1, "이름을 입력하세요.").max(50),
  role: z.enum(["OWNER", "MANAGER", "STAFF"]),
  password: z.string().min(8, "8자 이상 입력하세요.").max(72),
});
type FormValues = z.infer<typeof schema>;

function CreateMemberDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", name: "", role: "STAFF", password: "" },
  });

  const create = useMutation({
    mutationFn: (v: FormValues) =>
      api<Member>("/api/v1/members", { method: "POST", body: JSON.stringify(v) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      toast.success("사용자를 추가했어요. 초기 비밀번호를 직접 전달해 주세요.");
      form.reset();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "추가하지 못했어요."),
  });

  const errors = form.formState.errors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>사용자 추가</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="flex flex-col gap-4">
          <Field label="이메일" htmlFor="email" error={errors.email?.message}>
            <Input id="email" type="email" autoComplete="off" {...form.register("email")} />
          </Field>
          <Field label="이름" htmlFor="name" error={errors.name?.message}>
            <Input id="name" {...form.register("name")} />
          </Field>
          <Field label="역할" htmlFor="role">
            <Controller
              control={form.control}
              name="role"
              render={({ field }) => (
                <Select
                  items={ROLE_ITEMS}
                  value={field.value}
                  onValueChange={(v) => v && field.onChange(v)}
                >
                  <SelectTrigger id="role" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_ITEMS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
          <Field
            label="초기 비밀번호 (8자 이상)"
            htmlFor="password"
            error={errors.password?.message}
          >
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              {...form.register("password")}
            />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={create.isPending}>
              추가
            </Button>
          </DialogFooter>
        </form>
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
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
