import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
const CLS: Record<Variant, string> = { primary: "b p", secondary: "b s", ghost: "b g" };

/** 관리자 화면 버튼 (.wu-admin 안에서). 모두 알약 모양, 주 버튼은 마우스를 올리면 레몬. */
export function Button({
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button type={type} className={`${CLS[variant]} ${className}`.trim()} {...rest} />;
}

/** 팬 화면 버튼 (.wu-public 안에서). primary = 레몬 '지금 눌러야 할 것', line = 보조 */
export function PublicButton({
  variant = "primary",
  className = "",
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "line" }) {
  return (
    <button
      type={type}
      className={`cp-btn ${variant === "line" ? "line" : ""} ${className}`.trim()}
      {...rest}
    />
  );
}
