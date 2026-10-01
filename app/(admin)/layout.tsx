import { AdminShell } from "@/components/layout/admin-shell";

// 관리자 화면 공통 레이아웃: GNB + 인증 가드. 공개 페이지(/c, /unsubscribe)와 로그인은 이 그룹 밖이다
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
