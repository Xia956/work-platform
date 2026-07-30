"use client";

import { FormEvent, useState } from "react";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  Link2,
  LoaderCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { BenchmarkAccount, BenchmarkSource } from "@/lib/types";
import { formatDate } from "@/lib/utils";

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

const statusInfo = {
  pending: { label: "等待解析", icon: LoaderCircle, color: "text-[#8d7962]" },
  parsing: { label: "正在解析", icon: LoaderCircle, color: "text-[#8d7962]" },
  parsed: { label: "解析完成", icon: CheckCircle2, color: "text-[#5d7b5c]" },
  needs_input: { label: "需要补充", icon: AlertCircle, color: "text-[#b66549]" },
  failed: { label: "解析失败", icon: AlertCircle, color: "text-[#b54c3b]" },
} as const;

export function BenchmarksManager({
  initialSources,
  initialVideos,
  initialAccounts,
}: {
  initialSources: BenchmarkSource[];
  initialVideos: BenchmarkVideoView[];
  initialAccounts: BenchmarkAccount[];
}) {
  const [sources, setSources] = useState(initialSources);
  const [videos, setVideos] = useState(initialVideos);
  const [accounts, setAccounts] = useState(initialAccounts);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [supplements, setSupplements] = useState<Record<string, string>>({});
  const [corrections, setCorrections] = useState<Record<string, Record<string, string>>>({});

  function mergeEntity(source: BenchmarkSource, entity?: BenchmarkVideoView | BenchmarkAccount | null) {
    if (!entity) return;
    if (source.source_type === "account") {
      setAccounts((current) => [entity as BenchmarkAccount, ...current.filter((item) => item.source_id !== source.id)]);
    } else {
      setVideos((current) => [entity as BenchmarkVideoView, ...current.filter((item) => item.source_id !== source.id)]);
    }
  }

  async function importLink(event: FormEvent) {
    event.preventDefault();
    setBusy("import");
    setMessage("");
    const response = await fetch("/api/benchmarks/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error);
    setSources((current) => {
      const without = current.filter((source) => source.id !== result.data.id);
      return [result.data, ...without];
    });
    mergeEntity(result.data, result.entity);
    setUrl("");
    setMessage(result.duplicate ? "该链接已经在资料库中" : result.warning || "链接已保存并完成解析");
  }

  async function retry(source: BenchmarkSource) {
    setBusy(source.id);
    setMessage("");
    const response = await fetch("/api/benchmarks/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: source.original_url, force: true }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error);
    setSources((current) => current.map((item) => item.id === source.id ? result.data : item));
    mergeEntity(result.data, result.entity);
    setMessage(result.warning || "已重新解析");
  }

  async function saveSupplement(sourceId: string) {
    setBusy(sourceId);
    const response = await fetch(`/api/benchmarks/${sourceId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript: supplements[sourceId] || "" }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error);
    setVideos((current) => {
      const without = current.filter((video) => video.source_id !== sourceId);
      return [result.data, ...without];
    });
    setSources((current) => current.map((source) => source.id === sourceId ? { ...source, parse_status: "parsed", error_message: null } : source));
    setMessage("补充内容已保存");
  }

  async function saveCorrections(source: BenchmarkSource) {
    const payload = corrections[source.id];
    if (!payload) return;
    setBusy(source.id);
    const response = await fetch(`/api/benchmarks/${source.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error);
    mergeEntity(source, result.data);
    setSources((current) => current.map((item) => item.id === source.id ? { ...item, parse_status: "parsed", error_message: null } : item));
    setMessage("修正信息已保存，之后优先使用你的版本");
  }

  async function analyze(sourceId: string) {
    setBusy(sourceId);
    const response = await fetch("/api/ai/benchmarks/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceId }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error);
    setVideos((current) => {
      const without = current.filter((video) => video.source_id !== sourceId);
      return [result.data, ...without];
    });
    setMessage("AI 拆解完成");
  }

  async function remove(id: string) {
    const response = await fetch(`/api/benchmarks/${id}`, { method: "DELETE" });
    if (response.ok) {
      setSources((current) => current.filter((source) => source.id !== id));
      setVideos((current) => current.filter((video) => video.source_id !== id));
      setAccounts((current) => current.filter((account) => account.source_id !== id));
    }
  }

  return (
    <>
      <form onSubmit={importLink} className="paper rounded-3xl p-5 sm:p-7">
        <div className="flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-2xl bg-[#fff0e9] text-[#e35f3f]"><Link2 className="size-5" /></span>
          <div>
            <h2 className="font-black">粘贴一个抖音链接</h2>
            <p className="text-xs text-[#82796f]">支持账号主页、视频长链和分享短链</p>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <input
            className="field flex-1"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://v.douyin.com/..."
            type="url"
            required
            aria-label="抖音链接"
          />
          <button className="btn-primary sm:min-w-32" disabled={busy === "import"}>
            {busy === "import" ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            {busy === "import" ? "解析中…" : "保存并解析"}
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-[#8b8277]">只读取无需登录即可访问的公开网页，不下载视频，也不会绕过验证码或访问限制。</p>
        {message ? <p className="mt-3 text-sm font-semibold text-[#9b503c]">{message}</p> : null}
      </form>

      <section className="mt-6">
        {sources.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {sources.map((source) => {
              const status = statusInfo[source.parse_status];
              const StatusIcon = status.icon;
              const video = videos.find((item) => item.source_id === source.id);
              const account = accounts.find((item) => item.source_id === source.id);
              const metadata = source.parsed_metadata ?? {};
              const title = account?.nickname || video?.title || String(metadata.title || (source.source_type === "account" ? "对标账号" : "对标视频"));
              const analysis = video?.ai_analysis as {
                summary?: string;
                hook?: string;
                reusablePatterns?: string[];
                topicIdeas?: string[];
                missingInformation?: string[];
              } | null;

              return (
                <article key={source.id} className="paper overflow-hidden rounded-3xl">
                  <div className="p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${status.color}`}>
                          <StatusIcon className={`size-3.5 ${source.parse_status === "parsing" ? "animate-spin" : ""}`} />
                          {status.label} · {source.source_type === "account" ? "账号" : source.source_type === "video" ? "视频" : "待识别"}
                        </span>
                        <h3 className="mt-3 line-clamp-2 text-lg font-black">{title}</h3>
                        {video?.author_name ? <p className="mt-1 text-xs text-[#877e73]">作者：{video.author_name}</p> : null}
                        {account?.douyin_id ? <p className="mt-1 text-xs text-[#877e73]">抖音号：{account.douyin_id}</p> : null}
                      </div>
                      <button type="button" className="btn-ghost min-h-8 p-2" aria-label="删除对标资料" onClick={() => void remove(source.id)}>
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                    <a href={source.normalized_url || source.original_url} target="_blank" rel="noreferrer" className="mt-4 flex items-center gap-1.5 truncate text-xs font-semibold text-[#e35f3f]">
                      查看原链接 <ExternalLink className="size-3" />
                    </a>
                    {video?.description ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#706b62]">{video.description}</p> : null}
                    {account?.bio ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-[#706b62]">{account.bio}</p> : null}
                    {source.error_message ? (
                      <div className="mt-4 rounded-2xl bg-[#fff3ee] p-3 text-xs leading-5 text-[#9a4e39]">{source.error_message}</div>
                    ) : null}
                    {source.parse_status === "failed" || source.parse_status === "needs_input" ? (
                      <button type="button" className="btn-secondary mt-4" disabled={busy === source.id} onClick={() => void retry(source)}>
                        <RefreshCw className={`size-4 ${busy === source.id ? "animate-spin" : ""}`} /> 重新解析
                      </button>
                    ) : null}
                    {source.source_type === "video" && !video?.transcript ? (
                      <div className="mt-4">
                        <label className="mb-2 block text-xs font-bold" htmlFor={`supplement-${source.id}`}>补充口播原文或内容摘要（可选）</label>
                        <textarea
                          id={`supplement-${source.id}`}
                          className="field min-h-24 resize-y text-sm"
                          value={supplements[source.id] || ""}
                          onChange={(event) => setSupplements({ ...supplements, [source.id]: event.target.value })}
                          placeholder="公开页面没有正文时，粘贴在这里可获得完整拆解"
                        />
                        <button type="button" className="btn-secondary mt-2" disabled={!supplements[source.id] || busy === source.id} onClick={() => void saveSupplement(source.id)}>
                          保存补充内容
                        </button>
                      </div>
                    ) : null}
                    {source.source_type !== "unknown" ? (
                      <details className="mt-4 border-t border-[#e7e0d5] pt-4">
                        <summary className="cursor-pointer text-xs font-bold text-[#746d64]">修正自动识别信息</summary>
                        <div className="mt-3 grid gap-2">
                          {source.source_type === "account" ? (
                            <>
                              <input
                                className="field text-sm"
                                aria-label="修正账号昵称"
                                placeholder="账号昵称"
                                value={corrections[source.id]?.nickname ?? account?.nickname ?? ""}
                                onChange={(event) => setCorrections((current) => ({ ...current, [source.id]: { ...current[source.id], nickname: event.target.value } }))}
                              />
                              <input
                                className="field text-sm"
                                aria-label="修正抖音号"
                                placeholder="抖音号"
                                value={corrections[source.id]?.douyin_id ?? account?.douyin_id ?? ""}
                                onChange={(event) => setCorrections((current) => ({ ...current, [source.id]: { ...current[source.id], douyin_id: event.target.value } }))}
                              />
                              <textarea
                                className="field min-h-20 text-sm"
                                aria-label="修正账号简介"
                                placeholder="账号简介"
                                value={corrections[source.id]?.bio ?? account?.bio ?? ""}
                                onChange={(event) => setCorrections((current) => ({ ...current, [source.id]: { ...current[source.id], bio: event.target.value } }))}
                              />
                            </>
                          ) : (
                            <>
                              <input
                                className="field text-sm"
                                aria-label="修正视频标题"
                                placeholder="视频标题"
                                value={corrections[source.id]?.title ?? video?.title ?? ""}
                                onChange={(event) => setCorrections((current) => ({ ...current, [source.id]: { ...current[source.id], title: event.target.value } }))}
                              />
                              <input
                                className="field text-sm"
                                aria-label="修正作者名称"
                                placeholder="作者名称"
                                value={corrections[source.id]?.author_name ?? video?.author_name ?? ""}
                                onChange={(event) => setCorrections((current) => ({ ...current, [source.id]: { ...current[source.id], author_name: event.target.value } }))}
                              />
                              <textarea
                                className="field min-h-20 text-sm"
                                aria-label="修正视频描述"
                                placeholder="视频描述"
                                value={corrections[source.id]?.description ?? video?.description ?? ""}
                                onChange={(event) => setCorrections((current) => ({ ...current, [source.id]: { ...current[source.id], description: event.target.value } }))}
                              />
                            </>
                          )}
                          <button type="button" className="btn-secondary w-fit" disabled={busy === source.id} onClick={() => void saveCorrections(source)}>
                            保存修正
                          </button>
                        </div>
                      </details>
                    ) : null}
                    {source.source_type === "video" && (video?.title || video?.description || video?.transcript) ? (
                      <button type="button" className="btn-primary mt-4" disabled={busy === source.id} onClick={() => void analyze(source.id)}>
                        {busy === source.id ? <LoaderCircle className="size-4 animate-spin" /> : <Bot className="size-4" />}
                        {video?.ai_analysis ? "重新拆解" : "AI 拆解"}
                      </button>
                    ) : null}
                    <p className="mt-4 text-[10px] text-[#a1988d]">保存于 {formatDate(source.created_at)}</p>
                  </div>
                  {analysis ? (
                    <div className="border-t border-[#e7e0d5] bg-[#f4f0e8] p-5 sm:p-6">
                      <div className="flex items-center justify-between">
                        <h4 className="font-black">拆解结果</h4>
                        <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold">{video?.analysis_depth === "full" ? "完整分析" : "基础分析"}</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#5f5a52]">{analysis.summary}</p>
                      {analysis.hook ? <div className="mt-4 rounded-2xl bg-white p-3"><p className="text-[10px] font-black text-[#f46f4c]">开场钩子</p><p className="mt-1 text-sm font-semibold">{analysis.hook}</p></div> : null}
                      {analysis.reusablePatterns?.length ? <List title="可复用套路" items={analysis.reusablePatterns} /> : null}
                      {analysis.topicIdeas?.length ? <List title="衍生选题" items={analysis.topicIdeas} /> : null}
                      {analysis.missingInformation?.length ? <List title="信息缺口" items={analysis.missingInformation} /> : null}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState title="还没有对标资料" description="粘贴一个公开抖音链接，系统会先保存，再尝试解析。" />
        )}
      </section>
    </>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <p className="text-xs font-black">{title}</p>
      <ul className="mt-2 space-y-1.5 text-xs leading-5 text-[#706b62]">
        {items.map((item) => <li key={item} className="flex gap-2"><span className="text-[#f46f4c]">•</span>{item}</li>)}
      </ul>
    </div>
  );
}
