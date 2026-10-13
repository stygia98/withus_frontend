"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { CONSENT_TONE } from "@/lib/status-tone";
import { Status } from "@/components/withus-b";
import { CustomerFormDialog } from "@/components/customer/customer-form-dialog";
import { type CustomerListItem, REGIONS, regionName } from "@/components/customer/types";
import { UploadDialog } from "@/components/customer/upload-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { api, type Page } from "@/lib/api-client";
import { CustomerTabs } from "@/components/layout/section-tabs";
import { queryKeys } from "@/lib/query-keys";

// 고객 목록 (PRD 4장 /customers)
const PAGE_SIZE = 20;

type Filters = {
  keyword: string;
  region: string;
  emailConsent: string;
  smsConsent: string;
  dormant: string;
};
const EMPTY: Filters = { keyword: "", region: "", emailConsent: "", smsConsent: "", dormant: "" };

const REGION_ITEMS = [
  { value: "", label: "전체 지역" },
  ...REGIONS.map((r) => ({ value: r.code, label: r.name })),
];
const FILTER_SELECTS = [
  {
    key: "emailConsent",
    items: [
      { value: "", label: "메일 동의 전체" },
      { value: "Y", label: "메일 동의" },
      { value: "N", label: "메일 거부" },
    ],
  },
  {
    key: "smsConsent",
    items: [
      { value: "", label: "SMS 동의 전체" },
      { value: "Y", label: "SMS 동의" },
      { value: "N", label: "SMS 거부" },
    ],
  },
  {
    key: "dormant",
    items: [
      { value: "", label: "휴면 전체" },
      { value: "Y", label: "휴면" },
      { value: "N", label: "활성" },
    ],
  },
] as const;

export default function CustomersPage() {
  const router = useRouter();
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 빈 값은 보내지 않는다 (서버에서 조건 없음)
  const params: Record<string, string | number> = { page, size: PAGE_SIZE };
  for (const [k, v] of Object.entries(filters)) if (v) params[k] = v;

  const { data, isPending, isError } = useQuery({
    queryKey: queryKeys.customers.list(params),
    queryFn: () =>
      api<Page<CustomerListItem>>(
        `/api/v1/customers?${new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)]))}`,
      ),
    // 페이지를 넘기는 동안 이전 목록을 유지해, 표가 사라져 문서 높이가 줄며 스크롤이 맨 위로 튀는 것을 막는다
    placeholderData: keepPreviousData,
  });

  function apply(next: Filters) {
    setDraft(next);
    setFilters(next);
    setPage(0);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="wb-title">고객 목록</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            수신동의와 휴면 여부를 확인하고, 엑셀·CSV 파일로 한 번에 등록할 수 있어요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploading(true)}>
            업로드
          </Button>
          <Button onClick={() => setCreating(true)}>고객 등록</Button>
        </div>
      </div>

      <CustomerTabs />

      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          apply(draft);
        }}
      >
        <Input
          className="w-64"
          placeholder="이름·이메일·휴대폰 검색"
          value={draft.keyword}
          onChange={(e) => setDraft({ ...draft, keyword: e.target.value })}
        />
        <FilterSelect
          items={REGION_ITEMS}
          value={draft.region}
          onChange={(v) => apply({ ...draft, region: v })}
        />
        {FILTER_SELECTS.map((f) => (
          <FilterSelect
            key={f.key}
            items={f.items}
            value={draft[f.key]}
            onChange={(v) => apply({ ...draft, [f.key]: v })}
          />
        ))}
        <Button type="submit" variant="outline">
          검색
        </Button>
        <Button type="button" variant="ghost" onClick={() => apply(EMPTY)}>
          초기화
        </Button>
      </form>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>이름</TableHead>
            <TableHead>이메일</TableHead>
            <TableHead>휴대폰</TableHead>
            <TableHead>지역</TableHead>
            <TableHead>가입일</TableHead>
            <TableHead className="text-right">누적구매액</TableHead>
            <TableHead>메일</TableHead>
            <TableHead>SMS</TableHead>
            <TableHead>휴면</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending && <MessageRow text="불러오는 중..." />}
          {isError && <MessageRow text="목록을 불러오지 못했어요." />}
          {data?.content.length === 0 && <MessageRow text="고객이 없어요." />}
          {data?.content.map((c) => (
            <TableRow
              key={c.customerId}
              className="cursor-pointer"
              onClick={() => router.push(`/customers/${c.customerId}`)}
            >
              <TableCell>
                <Link href={`/customers/${c.customerId}`} className="hover:underline">
                  {c.name ?? "(이름 없음)"}
                </Link>
              </TableCell>
              <TableCell>{c.email}</TableCell>
              <TableCell>{c.phone ?? "-"}</TableCell>
              <TableCell>{regionName(c.region)}</TableCell>
              <TableCell>{c.joinedAt}</TableCell>
              <TableCell className="text-right">{c.totalPurchase.toLocaleString()}원</TableCell>
              <TableCell>
                <ConsentStatus value={c.emailConsent} />
              </TableCell>
              <TableCell>
                <ConsentStatus value={c.smsConsent} />
              </TableCell>
              <TableCell>{c.dormant === "Y" ? <Status tone="warn">휴면</Status> : "-"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {data && data.totalElements > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>총 {data.totalElements.toLocaleString()}명</span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
            >
              이전
            </Button>
            <span>
              {page + 1} / {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page + 1 >= data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              다음
            </Button>
          </div>
        </div>
      )}

      <UploadDialog open={uploading} onOpenChange={setUploading} />
      <CustomerFormDialog
        open={creating}
        onOpenChange={setCreating}
        onSaved={(c) => router.push(`/customers/${c.customerId}`)}
      />
    </div>
  );
}

function FilterSelect({
  items,
  value,
  onChange,
}: {
  items: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Select items={items} value={value} onValueChange={(v) => onChange(v ?? "")}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ConsentStatus({ value }: { value: "Y" | "N" }) {
  return <Status tone={CONSENT_TONE[value]}>{value === "Y" ? "동의" : "거부"}</Status>;
}

function MessageRow({ text }: { text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
        {text}
      </TableCell>
    </TableRow>
  );
}
