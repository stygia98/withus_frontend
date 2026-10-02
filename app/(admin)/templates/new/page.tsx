import { TemplateForm } from "@/components/template/TemplateForm";

export default function NewTemplatePage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <TemplateForm mode="create" />
    </main>
  );
}
