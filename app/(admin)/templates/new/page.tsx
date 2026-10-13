import { TemplateForm } from "@/components/template/TemplateForm";

export default function NewTemplatePage() {
  return (
    <main className="max-w-3xl">
      <TemplateForm mode="create" />
    </main>
  );
}
