import { ContentLibrary } from "@/components/content-library";
import { PageHeader } from "@/components/page-header";
import { SetupBanner } from "@/components/setup-banner";
import { buildContentProjects } from "@/lib/content-projects";
import { loadRelated, loadRows } from "@/lib/load-data";
import { localPreviewBypass, supabaseConfigured } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type {
  Inspiration,
  MetricSnapshot,
  Publication,
  Script,
  ScriptVersion,
  Topic,
} from "@/lib/types";

const validFilters = ["all", "idea", "active", "ready", "published"] as const;
type ContentFilter = (typeof validFilters)[number];

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string | string[] }>;
}) {
  const rawStage = (await searchParams).stage;
  const requestedStage = Array.isArray(rawStage) ? rawStage[0] : rawStage;
  const initialFilter: ContentFilter = validFilters.includes(requestedStage as ContentFilter)
    ? requestedStage as ContentFilter
    : "all";
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const [inspirations, topics, scripts, publications] = await Promise.all([
    loadRows<Inspiration>("inspirations"),
    loadRows<Topic>("topics"),
    loadRows<Script>("scripts"),
    loadRows<Publication>("publications", "published_at"),
  ]);
  const [versions, snapshots] = await Promise.all([
    loadRelated<ScriptVersion>("script_versions", "script_id", scripts.map((item) => item.id)),
    loadRelated<MetricSnapshot>("metric_snapshots", "publication_id", publications.map((item) => item.id)),
  ]);
  const projects = buildContentProjects({
    inspirations,
    topics,
    scripts,
    versions,
    publications,
    snapshots,
  });

  return (
    <>
      <PageHeader
        eyebrow="Content Library"
        title="内容库"
        description="集中查看和推进已有内容，从灵感、粗稿和 AI 优化，一路走到发布与复盘。"
      />
      <SetupBanner />
      <ContentLibrary
        key={projects.map((project) => `${project.id}:${project.stage}:${project.updatedAt}`).join("|")}
        initialProjects={projects}
        initialFilter={initialFilter}
        guestMode={!user && supabaseConfigured && !localPreviewBypass}
      />
    </>
  );
}
