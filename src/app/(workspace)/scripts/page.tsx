import { PageHeader } from "@/components/page-header";
import { SetupBanner } from "@/components/setup-banner";
import { ScriptStudio } from "@/components/script-studio";
import { loadRelated, loadRows } from "@/lib/load-data";
import type { Script, ScriptVersion, Topic } from "@/lib/types";

export default async function ScriptsPage() {
  const [scripts, topics] = await Promise.all([
    loadRows<Script>("scripts"),
    loadRows<Topic>("topics"),
  ]);
  const versions = await loadRelated<ScriptVersion>(
    "script_versions",
    "script_id",
    scripts.map((script) => script.id),
  );
  return (
    <>
      <PageHeader
        eyebrow="Write"
        title="文案工作室"
        description="从你的粗稿开始。每一次手动修改和 AI 优化都会成为独立版本，原始表达永远保留。"
      />
      <SetupBanner />
      <ScriptStudio initialScripts={scripts} initialVersions={versions} topics={topics} />
    </>
  );
}
