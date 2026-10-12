"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, api } from "@/lib/api-client";

// 디자인 키트 로그인 (preview/withus-admin.html 의 login). '로그인 유지'·시안용 계정 안내는 넣지 않았다
export default function LoginPage() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
      });
      // 인증 가드가 넘겨준 원래 화면으로 돌아간다. 다른 사이트로 보내지 않도록 내부 경로만 허용
      const next = new URLSearchParams(window.location.search).get("next");
      router.replace(next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "로그인에 실패했습니다.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="wu-admin" style={{ minHeight: "100vh" }}>
      <div className="login">
        <div className="login-card">
          <Link href="/" className="logo" aria-label="withus 홈">
            with<span className="us">us</span>
          </Link>
          <p className="sub">관리자 로그인</p>
          {error ? (
            <div className="alert a-err" role="alert">
              <span>{error}</span>
            </div>
          ) : null}
          <form onSubmit={onSubmit}>
            <label className="in">
              이메일
              <span className="box">
                <input
                  name="email"
                  type="email"
                  autoComplete="username"
                  placeholder="name@company.com"
                  required
                />
              </span>
            </label>
            <label className="in">
              비밀번호
              <span className="box">
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="비밀번호"
                  required
                />
              </span>
            </label>
            <div className="alert a-info">
              <span>
                계정은 조직의 <b>OWNER</b>가 관리해요. 비밀번호를 잊었다면 OWNER에게 재설정을 요청해
                주세요.
              </span>
            </div>
            <button
              className="b p"
              type="submit"
              disabled={pending}
              style={{ height: 48, fontSize: 15 }}
            >
              {pending ? "로그인 중..." : "로그인"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
