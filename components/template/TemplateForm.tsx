"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { Editor as TinyMceEditorInstance } from "tinymce";
import { z } from "zod";

import type { UploadBlobInfo } from "./TinyMceEditor";

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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, api } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { SMS_BYTE_LIMIT, TEMPLATE_PLACEHOLDERS, smsTotalBytes } from "@/lib/template-placeholders";
import type { Template } from "@/lib/types/template";

// TinyMCE 는 SSR 되면 hydration mismatch 가 나므로 클라이언트에서만 불러온다 (W1-FE 1/4)
const TinyMceEditor = dynamic(() => import("./TinyMceEditor").then((m) => m.TinyMceEditor), {
  ssr: false,
  loading: () => <div className="h-[420px] rounded-lg border bg-muted/30" />,
});

const formSchema = z
  .object({
    channel: z.enum(["EMAIL", "SMS"]),
    name: z.string().min(1, "이름을 입력하세요."),
    subject: z.string().optional(),
    body: z.string().min(1, "본문을 입력하세요."),
    adYn: z.enum(["Y", "N"]),
  })
  .refine((data) => data.channel !== "EMAIL" || !!data.subject?.trim(), {
    message: "메일 템플릿은 제목이 필요합니다.",
    path: ["subject"],
  });

type FormValues = z.infer<typeof formSchema>;

type TemplateFormProps =
  { mode: "create" } | { mode: "edit"; templateId: number; template: Template };

export function TemplateForm(props: TemplateFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const editorRef = useRef<TinyMceEditorInstance | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const defaults: FormValues =
    props.mode === "edit"
      ? {
          channel: props.template.channel,
          name: props.template.name,
          subject: props.template.subject ?? "",
          body: props.template.body,
          adYn: props.template.adYn,
        }
      : { channel: "EMAIL", name: "", subject: "", body: "", adYn: "Y" };

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });

  const channel = watch("channel");
  const body = watch("body");
  const adYn = watch("adYn");
  const bodyField = register("body");

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      // SMS 에는 제목이 없다 — 채널을 바꾸기 전에 입력한 값이 숨은 채로 저장되지 않게 항상 null 로 보낸다
      const subject = values.channel === "EMAIL" ? values.subject : null;
      return props.mode === "create"
        ? api<Template>("/api/v1/templates", {
            method: "POST",
            body: JSON.stringify({ ...values, subject }),
          })
        : api<Template>(`/api/v1/templates/${props.templateId}`, {
            method: "PUT",
            body: JSON.stringify({
              name: values.name,
              subject,
              body: values.body,
              adYn: values.adYn,
            }),
          });
    },
    onSuccess: (saved) => {
      toast.success(props.mode === "create" ? "템플릿을 만들었습니다." : "템플릿을 수정했습니다.");
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
      router.push(`/templates/${saved.templateId}`);
    },
    onError: (err) => {
      // 시스템이 자동으로 넣는 (광고)·수신거부 문구를 직접 쓴 경우 — 어느 입력칸인지 서버가 알려 준다
      if (err instanceof ApiError && err.code === "TEMPLATE_AD_COPY_NOT_ALLOWED") {
        const d = err.details as { field?: string; found?: string } | undefined;
        const field = d?.field === "subject" ? "subject" : "body";
        setError(field, { message: `${err.message}${d?.found ? ` (${d.found})` : ""}` });
        return;
      }
      toast.error(err instanceof ApiError ? err.message : "저장에 실패했습니다.");
    },
  });

  // 치환자 버튼은 본문에만 넣는다. EMAIL 은 TinyMCE 커서 위치, SMS 는 textarea 커서 위치
  function insertPlaceholder(token: string) {
    if (channel === "EMAIL") {
      editorRef.current?.insertContent(token);
      return;
    }
    const el = textareaRef.current;
    // 버튼을 누르는 순간 포커스가 버튼으로 옮겨가 activeElement 는 textarea 가 아니지만, selectionStart 는 blur 뒤에도
    // 마지막 커서 위치를 유지한다 — 포커스를 조건으로 걸면 항상 본문 끝에 붙는다
    if (el) {
      const start = el.selectionStart ?? body.length;
      const end = el.selectionEnd ?? body.length;
      const next = body.slice(0, start) + token + body.slice(end);
      setValue("body", next, { shouldDirty: true });
      requestAnimationFrame(() => {
        el.focus();
        el.setSelectionRange(start + token.length, start + token.length);
      });
    } else {
      setValue("body", body + token, { shouldDirty: true });
    }
  }

  async function handleImageUpload(blobInfo: UploadBlobInfo): Promise<string> {
    // 서버 규칙(API_SPEC 5장: 5MB, jpg/png/gif)을 먼저 확인하고, 실패하면 TinyMCE 가 본문에 남긴 blob: 이미지를 지우게
    // { remove: true } 로 거절한다 — 그대로 두면 깨진 이미지가 본문에 저장된다
    const blob = blobInfo.blob();
    if (!["image/jpeg", "image/png", "image/gif"].includes(blob.type)) {
      return Promise.reject({ message: "jpg, png, gif 이미지만 올릴 수 있습니다.", remove: true });
    }
    if (blob.size > 5 * 1024 * 1024) {
      return Promise.reject({ message: "이미지는 5MB 이하만 올릴 수 있습니다.", remove: true });
    }
    const formData = new FormData();
    formData.append("file", blobInfo.blob(), blobInfo.filename());
    const result = await api<{ url: string }>("/api/v1/files/images", {
      method: "POST",
      body: formData,
    });
    return result.url;
  }

  const smsBytes = channel === "SMS" ? smsTotalBytes(body, adYn) : 0;
  const smsOverLimit = smsBytes > SMS_BYTE_LIMIT;
  // 수정 차단 기준(백엔드 TemplateService.existsInUseByStatus)과 같다: 예약·활성·일시정지 캠페인이 쓰는 중
  const locked = props.mode === "edit" && props.template.inUse === true;

  return (
    <form onSubmit={handleSubmit((values) => mutation.mutate(values))} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{props.mode === "create" ? "새 템플릿" : "템플릿 수정"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {locked && (
            <p className="rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground">
              예약·진행 중인 캠페인이 사용 중이라 수정할 수 없습니다. 바꾸려면 복제해서 새 템플릿을
              만드세요.
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="channel">채널</Label>
              {props.mode === "create" ? (
                <Controller
                  control={control}
                  name="channel"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(next) => {
                        field.onChange(next);
                        // EMAIL 은 HTML, SMS 는 평문이라 채널을 바꾸면 본문이 섞이지 않게 비운다
                        setValue("body", "", { shouldDirty: true });
                        // 채널을 바꾸면 이전 채널 전용 입력(메일 제목)도 함께 비운다
                        setValue("subject", "", { shouldDirty: true });
                      }}
                    >
                      <SelectTrigger id="channel" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="EMAIL">EMAIL</SelectItem>
                        <SelectItem value="SMS">SMS</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              ) : (
                <Input id="channel" value={props.template.channel} disabled />
              )}
            </div>
            <div className="flex items-end gap-2 pb-2.5">
              <Controller
                control={control}
                name="adYn"
                render={({ field }) => (
                  <>
                    <Switch
                      id="adYn"
                      checked={field.value === "Y"}
                      onCheckedChange={(checked) => field.onChange(checked ? "Y" : "N")}
                      disabled={locked}
                    />
                    <Label htmlFor="adYn">광고성</Label>
                  </>
                )}
              />
            </div>
          </div>
          {adYn === "Y" && (
            <p className="text-sm text-muted-foreground">
              (광고) 표기·발신자·수신거부 문구는 발송 시 자동으로 들어갑니다. 직접 입력하지 마세요.
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" disabled={locked} {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>

          {channel === "EMAIL" && (
            <div className="space-y-2">
              <Label htmlFor="subject">제목</Label>
              <Input id="subject" disabled={locked} {...register("subject")} />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>본문</Label>
              <div className="flex flex-wrap gap-1">
                {TEMPLATE_PLACEHOLDERS.map((p) => (
                  <Button
                    key={p.token}
                    type="button"
                    variant="outline"
                    size="xs"
                    disabled={locked}
                    onClick={() => insertPlaceholder(p.token)}
                  >
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>

            {channel === "EMAIL" ? (
              <TinyMceEditor
                value={body}
                onChange={(html) => setValue("body", html, { shouldDirty: true })}
                onImageUpload={handleImageUpload}
                disabled={locked}
                onReady={(editor) => {
                  editorRef.current = editor;
                }}
              />
            ) : (
              <>
                <Textarea
                  rows={6}
                  disabled={locked}
                  {...bodyField}
                  ref={(el) => {
                    bodyField.ref(el);
                    textareaRef.current = el;
                  }}
                />
                <p
                  className={
                    smsOverLimit ? "text-sm text-destructive" : "text-sm text-muted-foreground"
                  }
                >
                  {smsBytes} / {SMS_BYTE_LIMIT} 바이트
                  {adYn === "Y" && " ((광고)·발신자·수신거부 문구 포함)"}
                  {smsOverLimit && " — 초과 시 LMS로 발송됩니다"}
                </p>
              </>
            )}
            {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.push("/templates")}>
          취소
        </Button>
        <Button type="submit" disabled={locked || isSubmitting || mutation.isPending}>
          저장
        </Button>
      </div>
    </form>
  );
}
