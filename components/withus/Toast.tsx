"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";

/* 화면 아래에 잠깐 뜨는 알림. 관리자는 'admin', 팬 화면은 'public' 모양. */
const Ctx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({
  children,
  kind = "admin",
}: {
  children: ReactNode;
  kind?: "admin" | "public";
}) {
  const [msg, setMsg] = useState("");
  const [on, setOn] = useState(false);
  const t = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = useCallback((m: string) => {
    setMsg(m);
    setOn(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => setOn(false), 2400);
  }, []);
  return (
    <Ctx.Provider value={show}>
      {children}
      <div className={`toast ${on ? (kind === "admin" ? "show" : "on") : ""}`} role="status">
        {msg}
      </div>
    </Ctx.Provider>
  );
}
