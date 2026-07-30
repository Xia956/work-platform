import { PageHeader } from "@/components/page-header";
import { SetupBanner } from "@/components/setup-banner";
import { BenchmarksManager, type BenchmarkVideoView } from "@/components/benchmarks-manager";
import { loadRelated, loadRows } from "@/lib/load-data";
import type { BenchmarkAccount, BenchmarkSource } from "@/lib/types";

export default async function BenchmarksPage() {
  const sources = await loadRows<BenchmarkSource>("benchmark_sources");
  const [videos, accounts] = await Promise.all([
    loadRelated<BenchmarkVideoView>(
      "benchmark_videos",
      "source_id",
      sources.map((source) => source.id),
    ),
    loadRelated<BenchmarkAccount>(
      "benchmark_accounts",
      "source_id",
      sources.map((source) => source.id),
    ),
  ]);
  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="对标资料库"
        description="只需粘贴抖音账号或视频链接。系统会尝试读取公开信息，并明确告诉你分析依据和缺失内容。"
      />
      <SetupBanner />
      <BenchmarksManager
        initialSources={sources}
        initialVideos={videos}
        initialAccounts={accounts}
      />
    </>
  );
}
