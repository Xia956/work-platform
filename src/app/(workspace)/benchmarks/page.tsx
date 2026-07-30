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
        description="粘贴完整抖音分享文案或链接，系统会提取短链、识别内容类型，并明确标出仍需补充的信息。"
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
