// withus 로고 — 'us'만 레몬 상자 안에. 세 화면 모두 이 로고 하나만 써요.
type Props = { compact?: boolean; className?: string };

export function Logo({ compact, className = "logo" }: Props) {
  if (compact) return <span className="us">w</span>;
  return (
    <span className={className} aria-label="withus">
      with<span className="us">us</span>
    </span>
  );
}
