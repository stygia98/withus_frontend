"use client";
import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

/*
  화면 전환 막 — 남색 막 5줄이 닫혔다가 열리면서 다음 화면으로 넘어가요.
  - CurtainProvider로 화면을 감싸고
  - 메뉴 링크에서 const go = useCurtainNavigate(); go('/campaigns', 'Campaigns') 처럼 쓰세요.
  - 움직임 줄이기 설정을 켠 사용자에게는 막 없이 바로 넘어가요.
*/
type Go = (href: string, label?: string) => void;
const Ctx = createContext<Go>(() => {});
export const useCurtainNavigate = () => useContext(Ctx);

export function CurtainProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"" | "on" | "on out">("");
  const [label, setLabel] = useState("");
  const busy = useRef(false);
  const go = useCallback<Go>(
    (href, l = "withus") => {
      if (busy.current) return;
      if (typeof window !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
        return;
      }
      busy.current = true;
      setLabel(l);
      setState("on");
      router.prefetch?.(href);
      setTimeout(() => {
        router.push(href);
        setState("on out");
        setTimeout(() => {
          setState("");
          busy.current = false;
        }, 560);
      }, 520);
    },
    [router],
  );
  return (
    <Ctx.Provider value={go}>
      {children}
      <div className={`wcur ${state}`} aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
        <i />
        <b>{label}</b>
      </div>
    </Ctx.Provider>
  );
}
