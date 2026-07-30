import { PageHeader } from "@/components/page-header";
import { SetupBanner } from "@/components/setup-banner";
import { TopicsManager } from "@/components/topics-manager";
import { loadRows } from "@/lib/load-data";
import type { Topic } from "@/lib/types";

export default async function TopicsPage() {
  const topics = await loadRows<Topic>("topics");
  return (
    <>
      <PageHeader
        eyebrow="Plan"
        title="选题看板"
        description="把值得讲的想法排进创作节奏，明确受众、痛点和最有力量的切口。"
      />
      <SetupBanner />
      <TopicsManager initialItems={topics} />
    </>
  );
}
