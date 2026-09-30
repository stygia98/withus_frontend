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
백엔드 주소를 바꾸려면 서버 환경변수 `BACKEND_URL` 을 설정한다.

## 폼
- react-hook-form + zod (`@hookform/resolvers/zod`)로 작성한다 (TECH_STACK 6장)

## 공통 파일 (변경 시 PL 리뷰)
- `lib/api-client.ts` — 모든 API 호출용 fetch 래퍼 (쿠키 인증, CSRF 헤더)
- `lib/query-keys.ts` — TanStack Query 키
- `app/providers.tsx` — QueryClient, sonner Toaster
