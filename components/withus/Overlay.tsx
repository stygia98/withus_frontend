"use client";
import { useEffect, useRef, type ReactNode } from "react";

/* 오른쪽에서 나오는 서랍(Drawer)과 가운데 창(Modal). .wu-admin 안에 그대로 두면 돼요. Esc · 바깥 클릭으로 닫혀요. */

function useEsc(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const f = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", f);
    return () => removeEventListener("keydown", f);
  }, [open, onClose]);
}

const X = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

export function Drawer({
  open,
  onClose,
  eyebrow,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  eyebrow?: string;
  title: ReactNode;
  children: ReactNode;
}) {
  useEsc(open, onClose);
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) setTimeout(() => ref.current?.focus(), 60);
  }, [open]);
  return (
    <>
      <div className={`scrim2 ${open ? "on" : ""}`} onClick={onClose} />
      <aside
        className={`drawer ${open ? "on" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <header>
          <div>
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            <h2>{title}</h2>
          </div>
          <button ref={ref} className="x" aria-label="닫기" onClick={onClose}>
            {X}
          </button>
        </header>
        <div className="body">{children}</div>
      </aside>
    </>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEsc(open, onClose);
  return (
    <>
      <div className={`scrim2 ${open ? "on" : ""}`} onClick={onClose} />
      <div
        className={`modal ${open ? "on" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <header>
          <h2>{title}</h2>
          <button className="x" aria-label="닫기" onClick={onClose}>
            {X}
          </button>
        </header>
        <div className="body">{children}</div>
        {footer ? <footer>{footer}</footer> : null}
      </div>
    </>
  );
}
