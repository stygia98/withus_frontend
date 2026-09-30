# withus_frontend

위드어스 관리자 화면·고객 공개 페이지 (Next.js 15, React 19, Tailwind 4, shadcn/ui, TanStack Query v5).
규칙은 메인 저장소의 `CLAUDE.md` 5장, 협업 절차는 `docs/workflow-git.md` 를 따른다.

## 실행
```bash
npm install
npm run dev          # http://localhost:3000 — /api/* 는 백엔드(기본 http://localhost:8080)로 프록시
npm run format                  # Prettier 포맷 (저장 전후 자유롭게)
npm run lint && npm run build   # PR 전 필수
```
백엔드 주소를 바꾸려면 서버 환경변수 `BACKEND_URL` 을 설정한다. 로그인(`/login`)하려면 백엔드가 떠 있어야 한다. 관리자 레이아웃·GNB·인증 가드는 PL이 목업 반영 시 추가한다.

## API 호출
```tsx
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, type Page } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

// 조회 — 쿼리 키는 lib/query-keys.ts 에만 추가한다
const { data } = useQuery({
  queryKey: queryKeys.customers.all,
  queryFn: () => api<Page<Customer>>("/api/v1/customers?page=0&size=20"),
});

// 변경 — CSRF 헤더·쿠키·401 재발급은 api() 가 처리한다
const create = useMutation({
  mutationFn: (body: CustomerForm) =>
    api<Customer>("/api/v1/customers", { method: "POST", body: JSON.stringify(body) }),
});
```
- 경로는 항상 `/api/...` 상대 경로. 백엔드 주소를 코드에 쓰지 않는다.
- 오류는 `ApiError`(`code`, `message`, `details`)로 던져진다. 사용자 안내는 `toast.error(err.message)` (sonner).

## UI 컴포넌트 (shadcn/ui)
- 추가: `npx shadcn@latest add <컴포넌트>` (예: `table dialog select`)
- 이 프로젝트의 shadcn 은 **Base UI**(`@base-ui/react`) 기반이다. 인터넷의 Radix 기반 예제에 나오는 `asChild` 는 없고, Base UI 는 `render` prop 으로 요소를 바꾼다. 생성된 `components/ui/*` 코드를 기준으로 쓴다.

## 폼
- react-hook-form + zod (`@hookform/resolvers/zod`)로 작성한다 (TECH_STACK 6장)

## 공통 파일 (변경 시 PL 리뷰)
- `lib/api-client.ts` — 모든 API 호출용 fetch 래퍼 (쿠키 인증, CSRF 헤더)
- `lib/query-keys.ts` — TanStack Query 키
- `app/providers.tsx` — QueryClient, sonner Toaster
