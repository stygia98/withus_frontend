"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import type { Me, Role } from "@/components/layout/admin-shell";
import { Badge } from "@/components/ui/badge";
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
import { queryKeys } from "@/lib/query-keys";

type Member = { memberId: number; email: string; name: string; role: Role; active: boolean };

const ROLE_ITEMS: { value: Role; label: string }[] = [
  { value: "OWNER", label: "OWNER · 전체 권한" },
  { value: "MANAGER", label: "MANAGER · 운영" },
  { value: "STAFF", label: "STAFF · 템플릿·조회" },
];

/** 시스템 설정 > 사용자 관리 (PRD 4장 /settings/users, 3장 OWNER 전용, API_SPEC 2장) */
export default function UsersPage() {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);
  // 로그인 정보는 레이아웃(AdminShell)이 이미 불러와 캐시에 있다
  const me = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: () => api<Me>("/api/v1/auth/me"),
  });
  const members = useQuery({
    queryKey: queryKeys.members.all,
    queryFn: () => api<Member[]>("/api/v1/members"),
  });

  const update = useMutation({
    mutationFn: ({
      memberId,
      body,
    }: {
      memberId: number;
      body: Partial<Pick<Member, "role" | "active">>;
    }) =>
      api<Member>(`/api/v1/members/${memberId}`, { method: "PATCH", body: JSON.stringify(body) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all });
      toast.success("변경했습니다. 그 사용자는 늦어도 30분 안에 다시 로그인하게 됩니다.");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "변경하지 못했습니다."),
  });

  const forbidden = members.error instanceof ApiError && members.error.status === 403;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 p-6">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-xs text-muted-foreground">시스템 설정</p>
          <h1 className="text-2xl font-semibold">사용자 관리</h1>
        </div>
        {!forbidden && <Button onClick={() => setCreating(true)}>사용자 추가</Button>}
      </header>

      <div className="rounded-xl border bg-card p-4">
        {forbidden ? (
          <p className="text-sm text-muted-foreground">사용자 관리는 OWNER 만 할 수 있습니다.</p>
        ) : members.isError ? (
          <p className="text-sm text-destructive">사용자 목록을 불러오지 못했습니다.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>이름</TableHead>
                <TableHead>이메일</TableHead>
                <TableHead className="w-56">역할</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.data?.map((m) => {
                // 자기 계정은 바꿀 수 없다 (MEMBER_SELF_CHANGE)
                const self = m.memberId === me.data?.memberId;
                return (
                  <TableRow key={m.memberId}>
                    <TableCell className="font-medium">
                      {m.name}
                      {self && <span className="ml-1 text-xs text-muted-foreground">(나)</span>}
                    </TableCell>
                    <TableCell>{m.email}</TableCell>
                    <TableCell>
                      <Select
                        items={ROLE_ITEMS}
                        value={m.role}
                        disabled={self || update.isPending}
                        onValueChange={(v) =>
                          v &&
                          v !== m.role &&
                          update.mutate({ memberId: m.memberId, body: { role: v as Role } })
                        }
                      >
                        <SelectTrigger aria-label={`${m.name} 역할`} className="w-full">
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
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          m.active
                            ? "bg-accent text-accent-foreground"
                            : "bg-warning text-warning-foreground"
                        }
                      >
                        {m.active ? "활성" : "비활성"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={self || update.isPending}
                        onClick={() =>
                          update.mutate({ memberId: m.memberId, body: { active: !m.active } })
                        }
                      >
                        {m.active ? "비활성화" : "활성화"}
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
    </div>
  );
}

const schema = z.object({
  email: z.string().trim().min(1, "이메일을 입력하세요.").email("이메일 형식이 아닙니다."),
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
      toast.success("사용자를 추가했습니다. 초기 비밀번호를 직접 전달해 주세요.");
      form.reset();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "추가하지 못했습니다."),
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
