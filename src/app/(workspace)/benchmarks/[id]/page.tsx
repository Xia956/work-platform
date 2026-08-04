import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BenchmarkDetail } from "@/components/benchmark-detail";
import { type BenchmarkVideoView } from "@/components/benchmarks-manager";
import { PageHeader } from "@/components/page-header";
import { buttonStyles } from "@/components/ui/button";
import { demoBenchmarkAccounts, demoBenchmarkSources, demoBenchmarkVideos } from "@/lib/demo-content";
import { loadRelated, loadRows } from "@/lib/load-data";
import type { BenchmarkAccount, BenchmarkSource } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export default async function BenchmarkDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = supabase ? (await supabase.auth.getUser()).data.user : null;
  const sources = user
    ? await loadRows<BenchmarkSource>("benchmark_sources")
    : demoBenchmarkSources;
  const source = sources.find((item) => item.id === id);
  if (!source) notFound();

  const [videos, accounts] = user
    ? await Promise.all([
        loadRelated<BenchmarkVideoView>("benchmark_videos", "source_id", [source.id]),
        loadRelated<BenchmarkAccount>("benchmark_accounts", "source_id", [source.id]),
      ])
    : [
        demoBenchmarkVideos.filter((item) => item.source_id === source.id),
        demoBenchmarkAccounts.filter((item) => item.source_id === source.id),
      ];

  const video = videos[0] ?? null;
  const account = accounts[0] ?? null;
  const metadata = source.parsed_metadata ?? {};
  const title = account?.nickname || video?.title || String(metadata.title || (source.source_type === "account" ? "待补充的对标账号" : "对标视频"));
  const description = source.source_type === "account"
    ? "查看账号资料、定位信息与来源，并补充需要长期观察的内容。"
    : "查看完整口播原文、内容拆解、可复用表达方法和延展选题。";

  return (
    <>
      <PageHeader
        eyebrow={source.source_type === "account" ? "Account Reference" : "Video Reference"}
        title={title}
        description={description}
        action={(
          <Link href="/benchmarks" className={buttonStyles({ variant: "secondary" })}>
            <ArrowLeft />返回资料库
          </Link>
        )}
      />
      <BenchmarkDetail
        initialSource={source}
        initialVideo={video}
        initialAccount={account}
        authenticated={Boolean(user)}
      />
    </>
  );
}
