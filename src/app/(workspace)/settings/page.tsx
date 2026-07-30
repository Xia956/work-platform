import { PageHeader } from "@/components/page-header";
import { SetupBanner } from "@/components/setup-banner";
import { CreatorProfileForm, type CreatorProfileView } from "@/components/creator-profile-form";
import { PasswordSettings } from "@/components/password-settings";
import { loadRows } from "@/lib/load-data";

export default async function SettingsPage() {
  const profiles = await loadRows<CreatorProfileView>("creator_profiles");
  return (
    <>
      <PageHeader
        eyebrow="Voice"
        title="创作者档案"
        description="告诉 AI 你是谁、对谁说、如何表达。这里的设置会成为生成与优化文案的长期上下文。"
      />
      <SetupBanner />
      <PasswordSettings />
      <CreatorProfileForm initialProfile={profiles[0] ?? null} />
    </>
  );
}
