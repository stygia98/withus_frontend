import { Button } from "@/components/ui/button";

/** 조회 실패 안내와 다시 시도 버튼 — 무한 "불러오는 중..." 대신 쓴다 */
export function QueryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex items-center gap-3 text-sm text-destructive">
      <span>{message}</span>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        다시 시도
      </Button>
    </div>
  );
}
