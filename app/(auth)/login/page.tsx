"use client";

import { useRouter } from "next/navigation";

import { LoginView } from "@/components/withus-b";
import { ApiError, api } from "@/lib/api-client";

// 디자인 키트 B 로그인 (components/withus-b/LoginView.tsx)
export default function LoginPage() {
  const router = useRouter();
  return (
    <LoginView
      onSubmit={async ({ email, password }) => {
        try {
          await api("/api/v1/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });
        } catch (err) {
          return err instanceof ApiError ? err.message : "로그인에 실패했어요.";
        }
        // 인증 가드가 넘겨준 원래 화면으로 돌아간다. 다른 사이트로 보내지 않도록 내부 경로만 허용
        const next = new URLSearchParams(window.location.search).get("next");
        router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
      }}
    />
  );
}
