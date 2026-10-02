import { redirect } from "next/navigation";

// 첫 화면은 대시보드. 로그인하지 않았으면 (admin) 레이아웃의 인증 가드가 /login 으로 보낸다
export default function Home() {
  redirect("/dashboard");
}
