import { LinkError, PublicShell } from "@/components/withus-b";

// 없는 주소(잘린 쿠폰·수신거부 링크 포함)는 팬 화면 모양의 오류로 보여 준다 (디자인 키트 B)
export default function NotFound() {
  return (
    <PublicShell>
      <LinkError kind="notFound" />
    </PublicShell>
  );
}
