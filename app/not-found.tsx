import Link from "next/link";

import { LinkError, PublicShell } from "@/components/withus-b";

// 없는 주소: 잘린 쿠폰·수신거부 링크(고객)와 잘못 친 주소(관리자)가 모두 여기로 온다 (디자인 키트 B)
export default function NotFound() {
  return (
    <PublicShell>
      <LinkError kind="page" />
      <p className="wb-public__foot" style={{ justifyContent: "flex-start" }}>
        <Link href="/dashboard">관리자 화면으로 가기</Link>
      </p>
    </PublicShell>
  );
}
