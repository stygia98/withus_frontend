"use client";
/**
 * withus 시안 B — 로그인 화면
 * 사용: app/(auth)/login/page.tsx 에서 <LoginView onSubmit={...} />
 * onSubmit 은 성공하면 아무것도 돌려주지 않고, 실패하면 오류 문장을 돌려준다.
 * 시안의 '로그인 상태 유지'·'비밀번호 찾기'·시안용 계정 버튼은 넣지 않았다 (계정·재설정은 OWNER 가 관리)
 * 장식(떠 있는 숫자 카드 · 연필 · 낙서 · 원 · 가짜 창 막대)은 덜어내고, 제목 · 카드 하나 · 옅은 블러 하나만 둔다
 */
import Link from "next/link";
import { useState } from "react";

import { Button, Logo } from "./ui";

export default function LoginView({
  onSubmit,
}: {
  onSubmit: (v: { email: string; password: string }) => Promise<string | void>;
}) {
  const [email, setEmail] = useState(""),
    [pw, setPw] = useState("");
  const [show, setShow] = useState(false),
    [busy, setBusy] = useState(false);
  const [err, setErr] = useState<{ email?: string; pw?: string }>({});
  const submit = async () => {
    const e: typeof err = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = "이메일 형식을 확인해 주세요.";
    if (!pw) e.pw = "비밀번호를 입력해 주세요.";
    setErr(e);
    if (e.email || e.pw) return;
    setBusy(true);
    try {
      const msg = await onSubmit({ email: email.trim(), password: pw });
      if (msg) setErr({ pw: msg });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wb wb-login">
      <header className="wb-login__top">
        <Link href="/" aria-label="withus 홈">
          <Logo size={24} />
        </Link>
        <span className="wb-login__hint">
          처음이신가요? <b>계정은 조직의 OWNER가 발급해요</b>
        </span>
      </header>
      <section className="wb-login__hero">
        <h1 className="wb-anim">
          오늘의 캠페인,
          <br />
          여기서 시작해요
        </h1>
        <p>withus 관리자 계정으로 로그인해 주세요.</p>
      </section>

      <section className="wb-login__stage">
        <div className="wb-login__window wb-anim">
          <form
            className="wb-login__body"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <div className="wb-field" style={{ marginTop: 0 }}>
              <label htmlFor="wb-em">이메일</label>
              <input
                id="wb-em"
                className="wb-input"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!err.email}
              />
              {err.email && <span className="wb-field__error">{err.email}</span>}
            </div>
            <div className="wb-field">
              <label htmlFor="wb-pw">비밀번호</label>
              <div className="wb-login__pw">
                <input
                  id="wb-pw"
                  className="wb-input"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="비밀번호"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  aria-invalid={!!err.pw}
                />
                <button type="button" onClick={() => setShow((s) => !s)}>
                  {show ? "숨기기" : "보기"}
                </button>
              </div>
              {err.pw && <span className="wb-field__error">{err.pw}</span>}
            </div>
            <p className="wb-login__row" style={{ color: "var(--wb-mute)" }}>
              계정 관련 문의사항은 관리자에게 문의해 주세요.
            </p>
            <Button type="submit" size="lg" block loading={busy} className="wb-login__submit">
              {busy ? "확인 중" : "로그인"}
            </Button>
          </form>
        </div>
      </section>
      <footer className="wb-login__foot">
        <span>© 2026 withus</span>
        <span>광고 발송 08:00–20:50 · 수신 거부 자동 삽입 · 쿠폰 1회 사용</span>
      </footer>
    </div>
  );
}
