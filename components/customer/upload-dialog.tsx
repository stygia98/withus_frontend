"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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

// 고객 업로드 결과 (API_SPEC 3장 POST /customers/uploads)
type UploadResult = {
  total: number;
  created: number;
  updated: number;
  failed: number;
  suppressed: number;
  failures: { row: number; reason: string }[];
};

const MAX_BYTES = 10 * 1024 * 1024;

/** 행별 실패 사유 코드 → 안내 문구 (API_SPEC 12장) */
const REASON: Record<string, string> = {
  CUSTOMER_INVALID_EMAIL: "이메일 없음 또는 형식 오류",
  CUSTOMER_INVALID_NAME: "이름 50자 초과",
  CUSTOMER_INVALID_PHONE: "휴대폰 형식 오류 (01로 시작 10~11자리)",
  CUSTOMER_INVALID_REGION: "알 수 없는 지역",
  CUSTOMER_INVALID_DATE: "날짜 형식 오류 또는 가입일 없음 (YYYY-MM-DD)",
  CUSTOMER_INVALID_AMOUNT: "누적구매액 형식 오류",
  CUSTOMER_INVALID_CONSENT: "수신동의는 Y 또는 N",
  CUSTOMER_DUPLICATE_EMAIL: "같은 파일 안에 중복된 이메일",
};

/** 고객 CSV/xlsx 업로드 모달 (PRD 4장 /customers, F-01) */
export function UploadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);

  const upload = useMutation({
    mutationFn: (f: File) => {
      const body = new FormData();
      body.append("file", f);
      return api<UploadResult>("/api/v1/customers/uploads", { method: "POST", body });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.customers.all }),
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "업로드하지 못했습니다."),
  });
  const result = upload.data;
  const tooLarge = file != null && file.size > MAX_BYTES;

  function change(open: boolean) {
    if (!open) {
      setFile(null);
      upload.reset();
    }
    onOpenChange(open);
  }

  return (
    <Dialog open={open} onOpenChange={change}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>고객 업로드</DialogTitle>
          <DialogDescription>
            xlsx 또는 csv, 최대 10MB·10,000행. 이메일이 같은 고객은 갱신하고(누적구매액은 유지)
            없으면 새로 등록합니다. 수신거부 이력이 있는 채널은 파일 값과 관계없이 수신거부로
            저장합니다.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-3">
            <a
              href="/api/v1/customers/upload-template"
              download
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              양식 내려받기
            </a>
            <Input
              type="file"
              accept=".xlsx,.csv"
              aria-label="업로드할 파일"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {tooLarge && (
              <p className="text-xs text-destructive">10MB를 넘는 파일은 올릴 수 없습니다.</p>
            )}
          </div>
        ) : (
          <div className="space-y-3 text-sm">
            <p>
              전체 {result.total.toLocaleString()}행 중 신규{" "}
              <b>{result.created.toLocaleString()}</b> · 갱신{" "}
              <b>{result.updated.toLocaleString()}</b> · 실패{" "}
              <b className={result.failed > 0 ? "text-destructive" : ""}>
                {result.failed.toLocaleString()}
              </b>
            </p>
            {result.suppressed > 0 && (
              <p className="text-muted-foreground">
                과거 수신거부 이력 {result.suppressed.toLocaleString()}행은 해당 채널을 수신거부로
                저장했습니다.
              </p>
            )}
            {result.failures.length > 0 && (
              <div className="max-h-64 overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">행</TableHead>
                      <TableHead>사유</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {result.failures.map((f) => (
                      <TableRow key={f.row}>
                        <TableCell>{f.row}</TableCell>
                        <TableCell>{REASON[f.reason] ?? f.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {!result ? (
            <Button
              disabled={file == null || tooLarge || upload.isPending}
              onClick={() => file && upload.mutate(file)}
            >
              {upload.isPending ? "올리는 중..." : "업로드"}
            </Button>
          ) : (
            <Button onClick={() => change(false)}>닫기</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
