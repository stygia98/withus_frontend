import { CampaignForm } from "@/components/campaign/CampaignForm";

export default function NewCampaignPage() {
  return (
    <main className="max-w-3xl">
      <CampaignForm mode="create" />
    </main>
  );
}
