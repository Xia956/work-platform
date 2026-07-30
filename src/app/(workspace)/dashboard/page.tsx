import { DashboardWorkbench } from "@/components/dashboard-workbench";
import { buildContentProjects } from "@/lib/content-projects";
import { localPreviewBypass, supabaseConfigured } from "@/lib/config";
import { loadRelated, loadRows } from "@/lib/load-data";
import { createClient } from "@/lib/supabase/server";
import type {
  Inspiration,
  MetricSnapshot,
  Publication,
  Script,
  ScriptVersion,
  Topic,
} from "@/lib/types";

export default async function DashboardPage() {
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
    <DashboardWorkbench
      canWrite={Boolean(user) && supabaseConfigured && !localPreviewBypass}
      guestMode={!user && supabaseConfigured && !localPreviewBypass}
      stats={{
        ideas: projects.filter((item) => item.stage === "idea").length,
        active: projects.filter((item) => item.stage === "rough_draft" || item.stage === "ai_optimized").length,
        ready: projects.filter((item) => item.stage === "ready").length,
        completed: projects.filter((item) => item.stage === "published").length,
      }}
    />
  );
}
