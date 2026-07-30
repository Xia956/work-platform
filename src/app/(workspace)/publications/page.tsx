import { PageHeader } from "@/components/page-header";
import { SetupBanner } from "@/components/setup-banner";
import { PublicationsManager } from "@/components/publications-manager";
import { loadRelated, loadRows } from "@/lib/load-data";
import type { MetricSnapshot, Publication, Script, ScriptVersion } from "@/lib/types";

export default async function PublicationsPage() {
  const [publications, scripts] = await Promise.all([
    loadRows<Publication>("publications", "published_at"),
    loadRows<Script>("scripts"),
  ]);
  const [snapshots, versions] = await Promise.all([
    loadRelated<MetricSnapshot>("metric_snapshots", "publication_id", publications.map((item) => item.id)),
    loadRelated<ScriptVersion>("script_versions", "script_id", scripts.map((item) => item.id)),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Review"
        title="发布与数据复盘"
        description="记录真实发布结果和多次数据快照，让下一条内容建立在证据上。"
      />
      <SetupBanner />
      <PublicationsManager
        initialPublications={publications}
        initialSnapshots={snapshots}
        scripts={scripts}
        versions={versions}
      />
    </>
  );
}
