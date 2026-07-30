import { PageHeader } from "@/components/page-header";
import { SetupBanner } from "@/components/setup-banner";
import { InspirationsManager } from "@/components/inspirations-manager";
import { loadRows } from "@/lib/load-data";
import { supabaseConfigured } from "@/lib/config";
import type { Inspiration } from "@/lib/types";

export default async function InspirationsPage() {
  const inspirations = await loadRows<Inspiration>("inspirations");
  return (
    <>
      <PageHeader
        eyebrow="Capture"
        title="灵感收集箱"
        description="先捕捉，再判断。碎片、问题、评论区洞察，都可以成为下一条视频。"
      />
      <SetupBanner />
      <InspirationsManager initialItems={inspirations} configured={supabaseConfigured} />
    </>
  );
}
