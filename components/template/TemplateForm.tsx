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
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema), defaultValues: defaults });

  const channel = watch("channel");
  const body = watch("body");
  const adYn = watch("adYn");
  const bodyField = register("body");

  const mutation = useMutation({
    mutationFn: (values: FormValues) =>
      props.mode === "create"
        ? api<Template>("/api/v1/templates", { method: "POST", body: JSON.stringify(values) })
        : api<Template>(`/api/v1/templates/${props.templateId}`, {
            method: "PUT",
            body: JSON.stringify({
              name: values.name,
              subject: values.subject,
              body: values.body,
              adYn: values.adYn,
            }),
          }),
    onSuccess: (saved) => {
      toast.success(props.mode === "create" ? "템플릿을 만들었습니다." : "템플릿을 수정했습니다.");
      queryClient.invalidateQueries({ queryKey: queryKeys.templates.all });
      router.push(`/templates/${saved.templateId}`);
    },
    onError: (err) => {
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
    if (el && document.activeElement === el) {
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
                  {smsBytes} / {SMS_BYTE_LIMIT} 바이트{adYn === "Y" && " ((광고)·발신자·수신거부 문구 포함)"}
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
