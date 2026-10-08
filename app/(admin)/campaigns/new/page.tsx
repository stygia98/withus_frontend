import { CampaignForm } from "@/components/campaign/CampaignForm";

export default function NewCampaignPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <CampaignForm mode="create" />
    </main>
  );
}
