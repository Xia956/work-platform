import { PageHeader } from "@/components/page-header";
import { SetupBanner } from "@/components/setup-banner";
import { PublicationsManager } from "@/components/publications-manager";
import { loadRelated, loadRows } from "@/lib/load-data";
import type { MetricSnapshot, Publication, Script, ScriptVersion } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ script?: string | string[]; version?: string | string[] }>;
}) {
  const requested = await searchParams;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const initialScriptId = Array.isArray(requested.script) ? requested.script[0] : requested.script;
  const initialVersionId = Array.isArray(requested.version) ? requested.version[0] : requested.version;
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
        description="发布时确认实际使用版本，发布后再持续补充数据，让下一条内容建立在证据上。"
      />
      <SetupBanner />
      <PublicationsManager
        initialPublications={publications}
        initialSnapshots={snapshots}
        scripts={scripts}
        versions={versions}
        initialScriptId={initialScriptId}
        initialVersionId={initialVersionId}
        authenticated={Boolean(user)}
      />
    </>
  );
}
