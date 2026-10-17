import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

// 관리자 화면 안에서 notFound() 가 불렸을 때 (예: 없는 캠페인 성과 번호) — 메뉴는 그대로 두고 본문만 안내
export default function AdminNotFound() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="wb-title">페이지를 찾을 수 없어요</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          삭제됐거나 주소가 잘못된 페이지예요. 목록에서 다시 골라 주세요.
        </p>
      </div>
      <Link href="/dashboard" className={buttonVariants()}>
        대시보드로 가기
      </Link>
    </div>
  );
}
