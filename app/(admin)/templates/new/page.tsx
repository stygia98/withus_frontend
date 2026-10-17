import Link from "next/link";

import { TemplateForm } from "@/components/template/TemplateForm";

export default function NewTemplatePage() {
  return (
    <main className="max-w-3xl space-y-4">
      <div>
        <Link href="/templates" className="text-sm text-muted-foreground hover:underline">
          ← 메시지 템플릿
        </Link>
        <h1 className="wb-title">새 템플릿</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {"{{name}}"} 같은 치환자는 발송할 때 고객 값으로 바뀌어요.
        </p>
      </div>
      <TemplateForm mode="create" />
    </main>
  );
}
