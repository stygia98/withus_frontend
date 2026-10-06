"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type DeleteTemplateDialogProps = {
  /** 삭제 대상 템플릿 이름. null 이면 닫힌 상태 */
  templateName: string | null;
  pending: boolean;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
};

export function DeleteTemplateDialog({
  templateName,
  pending,
  onConfirm,
  onOpenChange,
}: DeleteTemplateDialogProps) {
  return (
    <AlertDialog open={templateName !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>템플릿을 삭제할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            &ldquo;{templateName}&rdquo; 템플릿을 삭제합니다. 되돌릴 수 없고, 캠페인·워크플로우가
            참조 중이면 삭제되지 않습니다.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={pending}>
            삭제
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
