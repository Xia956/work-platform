"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileText,
  Link2,
  LoaderCircle,
  Search,
  UserRound,
  Video,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LoginRequiredDialog } from "@/components/login-required-dialog";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldHelp, FieldLabel, Input } from "@/components/ui/field";
import type { BenchmarkAccount, BenchmarkSource } from "@/lib/types";

export interface BenchmarkVideoView {
  id: string;
  source_id: string;
  title: string | null;
  description: string | null;
  transcript: string | null;
  author_name: string | null;
  cover_url: string | null;
  ai_analysis: Record<string, unknown> | null;
  analysis_depth: "basic" | "full" | null;
}

export type BenchmarkAnalysis = {
  summary?: string;
  hook?: string;
  reusablePatterns?: string[];
  topicIdeas?: string[];
  missingInformation?: string[];
};

type Library = "video" | "account";

const statusInfo: Record<BenchmarkSource["parse_status"], {
  label: string;
  icon: typeof LoaderCircle;
  tone: BadgeTone;
}> = {
  pending: { label: "等待整理", icon: LoaderCircle, tone: "neutral" },
  parsing: { label: "正在整理", icon: LoaderCircle, tone: "neutral" },
  parsed: { label: "资料完整", icon: CheckCircle2, tone: "success" },
  needs_input: { label: "待补充", icon: AlertCircle, tone: "warning" },
  failed: { label: "整理失败", icon: AlertCircle, tone: "warning" },
};

const libraryInfo: Record<Library, {
  label: string;
  heading: string;
  description: string;
  searchPlaceholder: string;
  emptyTitle: string;
  emptyDescription: string;
  icon: typeof Video;
}> = {
  video: {
    label: "对标视频",
    heading: "对标视频库",
    description: "快速浏览标题和拆解重点，点击卡片进入完整内容。",
    searchPlaceholder: "搜索标题、作者或关键词",
    emptyTitle: "对标视频库还是空的",
    emptyDescription: "收录一条视频分享内容，再补充原文进行完整拆解。",
    icon: Video,
  },
  account: {
    label: "对标账号",
    heading: "对标账号库",
    description: "快速浏览账号定位，点击卡片进入完整账号资料。",
    searchPlaceholder: "搜索账号、抖音号或定位",
    emptyTitle: "对标账号库还是空的",
    emptyDescription: "收录一个账号主页，逐步补充定位和观察笔记。",
    icon: UserRound,
  },
};

export function BenchmarksManager({
  initialSources,
  initialVideos,
  initialAccounts,
  authenticated,
}: {
  initialSources: BenchmarkSource[];
  initialVideos: BenchmarkVideoView[];
  initialAccounts: BenchmarkAccount[];
  authenticated: boolean;
}) {
  const [sources, setSources] = useState(initialSources);
  const [videos, setVideos] = useState(initialVideos);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [url, setUrl] = useState("");
  const [library, setLibrary] = useState<Library>("video");
  const [queries, setQueries] = useState<Record<Library, string>>({ video: "", account: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [loginReason, setLoginReason] = useState("");

  const counts = useMemo(() => ({
    video: sources.filter((source) => source.source_type !== "account").length,
    account: sources.filter((source) => source.source_type === "account").length,
  }), [sources]);

  const filteredSources = useMemo(() => {
    const normalizedQuery = queries[library].trim().toLocaleLowerCase("zh-CN");
    return sources.filter((source) => {
      const belongsToLibrary = library === "account"
        ? source.source_type === "account"
        : source.source_type !== "account";
      if (!belongsToLibrary) return false;
      if (!normalizedQuery) return true;
      const video = videos.find((item) => item.source_id === source.id);
      const account = accounts.find((item) => item.source_id === source.id);
      const metadata = source.parsed_metadata ?? {};
      return [
        video?.title,
        video?.author_name,
        video?.description,
        account?.nickname,
        account?.douyin_id,
        account?.bio,
        metadata.title,
        metadata.authorName,
      ].some((value) => String(value ?? "").toLocaleLowerCase("zh-CN").includes(normalizedQuery));
    });
  }, [accounts, library, queries, sources, videos]);

  async function importLink(event: FormEvent) {
    event.preventDefault();
    if (!authenticated) {
      setLoginReason("保存新的对标资料需要登录，当前示例数据仍可浏览。 ");
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/benchmarks/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error);
    setSources((current) => [result.data, ...current.filter((source) => source.id !== result.data.id)]);
    if (result.entity) {
      if (result.data.source_type === "account") {
        setAccounts((current) => [result.entity, ...current.filter((item) => item.source_id !== result.data.id)]);
      } else {
        setVideos((current) => [result.entity, ...current.filter((item) => item.source_id !== result.data.id)]);
      }
    }
    const destination: Library = result.data.source_type === "account" ? "account" : "video";
    setLibrary(destination);
    setQueries((current) => ({ ...current, [destination]: "" }));
    setUrl("");
    setMessage(result.duplicate ? "该链接已经在资料库中" : result.warning || "链接已保存并完成整理");
  }

  return (
    <>
      <Card className="p-4 sm:p-5">
        <form onSubmit={importLink}>
          <div className="flex items-start gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-soft text-brand">
              <Link2 className="size-4" />
            </span>
            <div>
              <h2 className="type-card-title">收录新的对标资料</h2>
              <p className="type-caption mt-1 text-ink-muted">粘贴完整分享文案或公开链接，保存后进入详情页补充和拆解。</p>
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="粘贴链接或“复制打开抖音”的整段文字"
              type="text"
              required
              aria-label="抖音链接"
            />
            <Button type="submit" variant="primary" disabled={busy}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Link2 />}
              {busy ? "保存中…" : "保存资料"}
            </Button>
          </div>
          <FieldHelp className="mt-2">不会下载视频，也不会绕过访问限制。</FieldHelp>
          {message ? <p className="type-body-sm mt-3 text-brand-strong" role="status">{message}</p> : null}
        </form>
      </Card>

      <section className="mt-6" aria-labelledby="benchmark-list-heading">
        <p className="type-label text-ink-muted">资料库</p>
        <div className="mt-2 grid grid-cols-2 gap-2" role="tablist" aria-label="切换对标资料库">
          {(Object.keys(libraryInfo) as Library[]).map((value) => {
            const item = libraryInfo[value];
            const LibraryIcon = item.icon;
            return (
              <Button
                key={value}
                variant={library === value ? "primary" : "secondary"}
                className="w-full"
                role="tab"
                aria-selected={library === value}
                aria-controls="benchmark-library-panel"
                onClick={() => setLibrary(value)}
              >
                <LibraryIcon />
                {item.label}
                <span className="type-caption">{counts[value]}</span>
              </Button>
            );
          })}
        </div>

        <div
          id="benchmark-library-panel"
          role="tabpanel"
          className="mt-6 flex flex-col gap-4 border-b border-line pb-4 lg:flex-row lg:items-end lg:justify-between"
        >
          <div>
            <h2 id="benchmark-list-heading" className="type-section-title">{libraryInfo[library].heading}</h2>
            <p className="type-caption mt-1 text-ink-muted">{libraryInfo[library].description}</p>
          </div>
          <div className="w-full lg:max-w-sm">
            <FieldLabel htmlFor="benchmark-search">搜索{libraryInfo[library].label}</FieldLabel>
            <div className="relative mt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
              <Input
                id="benchmark-search"
                size="sm"
                className="field-with-icon"
                value={queries[library]}
                onChange={(event) => setQueries((current) => ({ ...current, [library]: event.target.value }))}
                placeholder={libraryInfo[library].searchPlaceholder}
              />
            </div>
          </div>
        </div>

        {filteredSources.length ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {filteredSources.map((source) => {
              const status = statusInfo[source.parse_status];
              const StatusIcon = status.icon;
              const video = videos.find((item) => item.source_id === source.id);
              const account = accounts.find((item) => item.source_id === source.id);
              const metadata = source.parsed_metadata ?? {};
              const title = account?.nickname || video?.title || String(metadata.title || (source.source_type === "account" ? "待补充的对标账号" : "对标视频"));
              const author = video?.author_name || String(metadata.authorName || "");
              const keywords = Array.isArray(metadata.keywords) ? metadata.keywords.map(String).slice(0, 3) : [];
              const analysis = video?.ai_analysis as BenchmarkAnalysis | null;
              const preview = analysis?.summary || video?.description || account?.bio || source.error_message;
              const isAccount = source.source_type === "account";

              return (
                <article key={source.id}>
                  <Link href={`/benchmarks/${source.id}`} className="group block h-full rounded-card">
                    <Card className="flex h-full flex-col p-4 transition-colors group-hover:border-line-strong sm:p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">
                          {isAccount ? <UserRound className="size-3" /> : <Video className="size-3" />}
                          {isAccount ? "账号" : "视频"}
                        </Badge>
                        <Badge tone={status.tone}>
                          <StatusIcon className={source.parse_status === "parsing" ? "size-3 animate-spin" : "size-3"} />
                          {status.label}
                        </Badge>
                        {analysis ? <Badge tone="brand"><FileText className="size-3" />已拆解</Badge> : null}
                      </div>

                      <h3 className="type-card-title mt-3 group-hover:text-brand-strong">{title}</h3>
                      {author ? <p className="type-caption mt-1 text-ink-muted">作者：{author}</p> : null}
                      {account?.douyin_id ? <p className="type-caption mt-1 text-ink-muted">抖音号：{account.douyin_id}</p> : null}

                      {keywords.length ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {keywords.map((keyword) => <Badge key={keyword} tone="neutral">{keyword}</Badge>)}
                        </div>
                      ) : null}

                      {preview ? <p className="type-body-sm mt-3 line-clamp-2 text-ink-muted">{preview}</p> : null}

                      <div className="type-label mt-auto flex items-center justify-between border-t border-line pt-4 text-brand">
                        <span>{isAccount ? "查看账号资料" : "查看详细拆解"}</span>
                        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Card>
                  </Link>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="mt-4">
            {queries[library] ? (
              <EmptyState title="没有匹配的资料" description={`换一个关键词，或切换到${library === "video" ? "对标账号库" : "对标视频库"}。`} />
            ) : (
              <EmptyState title={libraryInfo[library].emptyTitle} description={libraryInfo[library].emptyDescription} />
            )}
          </div>
        )}
      </section>

      <LoginRequiredDialog
        open={Boolean(loginReason)}
        reason={loginReason}
        nextPath="/benchmarks"
        onClose={() => setLoginReason("")}
      />
    </>
  );
}
