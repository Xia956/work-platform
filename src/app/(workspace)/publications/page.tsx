import { PageHeader } from "@/components/page-header";
import { SetupBanner } from "@/components/setup-banner";
import { PublicationsManager } from "@/components/publications-manager";
import { loadRelated, loadRows } from "@/lib/load-data";
import { demoSharePublication, demoShareScript, demoShareVersion } from "@/lib/demo-content";
import type { MetricSnapshot, Publication, Script, ScriptVersion } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function PublicationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    script?: string | string[];
    version?: string | string[];
    publication?: string | string[];
    guest?: string | string[];
  }>;
}) {
  const requested = await searchParams;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const initialScriptId = Array.isArray(requested.script) ? requested.script[0] : requested.script;
  const initialVersionId = Array.isArray(requested.version) ? requested.version[0] : requested.version;
  const initialPublicationId = Array.isArray(requested.publication) ? requested.publication[0] : requested.publication;
  const initialGuestId = Array.isArray(requested.guest) ? requested.guest[0] : requested.guest;
  const [publications, scripts] = await Promise.all([
    loadRows<Publication>("publications", "published_at"),
    loadRows<Script>("scripts"),
  ]);
  const [snapshots, versions] = await Promise.all([
    loadRelated<MetricSnapshot>("metric_snapshots", "publication_id", publications.map((item) => item.id)),
    loadRelated<ScriptVersion>("script_versions", "script_id", scripts.map((item) => item.id)),
  ]);
  const displayedPublications = process.env.NODE_ENV === "development" &&
    !publications.some((item) => item.video_url === demoSharePublication.video_url)
    ? [demoSharePublication, ...publications]
    : publications;
  const displayedScripts = process.env.NODE_ENV === "development" &&
    !scripts.some((item) => item.id === demoShareScript.id)
    ? [demoShareScript, ...scripts]
    : scripts;
  const displayedVersions = process.env.NODE_ENV === "development" &&
    !versions.some((item) => item.id === demoShareVersion.id)
    ? [demoShareVersion, ...versions]
    : versions;
  return (
    <>
      <PageHeader
        eyebrow="Review"
        title="发布与数据复盘"
        description="发布时确认实际使用版本，发布后再持续补充数据，让下一条内容建立在证据上。"
      />
      <SetupBanner />
      <PublicationsManager
        initialPublications={displayedPublications}
        initialSnapshots={snapshots}
        scripts={displayedScripts}
        versions={displayedVersions}
        initialScriptId={initialScriptId}
        initialVersionId={initialVersionId}
        initialPublicationId={initialPublicationId}
        initialGuestId={initialGuestId}
        authenticated={Boolean(user)}
      />
    </>
  );
}
