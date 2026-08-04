"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bot,
  CheckCircle2,
  ExternalLink,
  FileText,
  LoaderCircle,
  RefreshCw,
  Trash2,
  UserRound,
  Video,
} from "lucide-react";
import { LoginRequiredDialog } from "@/components/login-required-dialog";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldLabel, Input, Textarea } from "@/components/ui/field";
import type { BenchmarkAnalysis, BenchmarkVideoView } from "@/components/benchmarks-manager";
import type { BenchmarkAccount, BenchmarkSource } from "@/lib/types";
import { formatDate } from "@/lib/utils";

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

export function BenchmarkDetail({
  initialSource,
  initialVideo,
  initialAccount,
  authenticated,
}: {
  initialSource: BenchmarkSource;
  initialVideo: BenchmarkVideoView | null;
  initialAccount: BenchmarkAccount | null;
  authenticated: boolean;
}) {
  const router = useRouter();
  const [source, setSource] = useState(initialSource);
  const [video, setVideo] = useState(initialVideo);
  const [account, setAccount] = useState(initialAccount);
  const [supplement, setSupplement] = useState("");
  const [corrections, setCorrections] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [loginReason, setLoginReason] = useState("");

  const metadata = source.parsed_metadata ?? {};
  const title = account?.nickname || video?.title || String(metadata.title || (source.source_type === "account" ? "待补充的对标账号" : "对标视频"));
  const author = video?.author_name || String(metadata.authorName || "");
  const keywords = Array.isArray(metadata.keywords) ? metadata.keywords.map(String).slice(0, 4) : [];
  const analysis = video?.ai_analysis as BenchmarkAnalysis | null;
  const status = statusInfo[source.parse_status];
  const StatusIcon = status.icon;
  const isAccount = source.source_type === "account";

  function requireLogin(reason: string) {
    if (authenticated) return false;
    setLoginReason(reason);
    return true;
  }

  async function saveSupplement() {
    if (requireLogin("保存补充原文需要登录。")) return;
    setBusy("save");
    setMessage("");
    const response = await fetch(`/api/benchmarks/${source.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ transcript: supplement }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error);
    setVideo(result.data);
    setSource((current) => ({ ...current, parse_status: "parsed", error_message: null }));
    setSupplement("");
    setMessage("口播原文已保存，可以开始完整拆解");
  }

  async function saveCorrections() {
    if (requireLogin("保存修正信息需要登录。")) return;
    if (!Object.keys(corrections).length) return;
    setBusy("correct");
    setMessage("");
    const response = await fetch(`/api/benchmarks/${source.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corrections),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error);
    if (isAccount) setAccount(result.data);
    else setVideo(result.data);
    setCorrections({});
    setSource((current) => ({ ...current, parse_status: "parsed", error_message: null }));
    setMessage("修正信息已保存");
  }

  async function analyze() {
    if (requireLogin("生成 AI 拆解需要登录。")) return;
    setBusy("analyze");
    setMessage("");
    const response = await fetch("/api/ai/benchmarks/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sourceId: source.id }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error);
    setVideo(result.data);
    setMessage("AI 拆解已更新");
  }

  async function retry() {
    if (requireLogin("重新整理链接需要登录。")) return;
    setBusy("retry");
    setMessage("");
    const response = await fetch("/api/benchmarks/import", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: source.original_url, force: true }),
    });
    const result = await response.json();
    setBusy("");
    if (!response.ok) return setMessage(result.error);
    setSource(result.data);
    if (result.entity) {
      if (result.data.source_type === "account") setAccount(result.entity);
      else setVideo(result.entity);
    }
    setMessage(result.warning || "链接已重新整理");
  }

  async function remove() {
    if (requireLogin("删除对标资料需要登录。")) return;
    setBusy("delete");
    const response = await fetch(`/api/benchmarks/${source.id}`, { method: "DELETE" });
    setBusy("");
    if (!response.ok) return setMessage("删除失败，请稍后重试");
    router.push("/benchmarks");
    router.refresh();
  }

  return (
    <>
      {message ? (
        <Card tone="muted" className="mb-4 p-3">
          <p className="type-body-sm text-ink-muted" role="status">{message}</p>
        </Card>
      ) : null}

      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
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
            <h2 className="type-section-title mt-3">{title}</h2>
            {author ? <p className="type-body-sm mt-1 text-ink-muted">作者：{author}</p> : null}
            {account?.douyin_id ? <p className="type-body-sm mt-1 text-ink-muted">抖音号：{account.douyin_id}</p> : null}
            <div className="mt-3 flex flex-wrap gap-2">
              {keywords.map((keyword) => <Badge key={keyword} tone="neutral">{keyword}</Badge>)}
            </div>
            <p className="type-caption mt-3 text-ink-subtle">收录于 {formatDate(source.created_at)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={source.normalized_url || source.original_url}
              target="_blank"
              rel="noreferrer"
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              查看来源 <ExternalLink />
            </a>
            <Button variant="danger" size="sm" disabled={busy === "delete"} onClick={() => void remove()}>
              <Trash2 />删除
            </Button>
          </div>
        </div>
        {source.error_message ? (
          <Card tone="muted" className="mt-4 p-3 shadow-none">
            <p className="type-body-sm text-ink-muted">{source.error_message}</p>
            {source.parse_status === "failed" ? (
              <Button className="mt-3" size="sm" disabled={busy === "retry"} onClick={() => void retry()}>
                <RefreshCw className={busy === "retry" ? "animate-spin" : ""} />重新整理链接
              </Button>
            ) : null}
          </Card>
        ) : null}
      </Card>

      {isAccount ? (
        <Card className="mt-4 p-4 sm:p-5">
          <h2 className="type-card-title">账号资料</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <DetailField label="账号昵称" value={account?.nickname} />
            <DetailField label="抖音号" value={account?.douyin_id} />
            <DetailField label="粉丝数" value={account?.follower_count?.toLocaleString("zh-CN")} />
            <DetailField label="账号简介" value={account?.bio} wide />
          </dl>
        </Card>
      ) : (
        <>
          <Card tone="ai" className="mt-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="type-eyebrow">Analysis</p>
                <h2 className="type-card-title mt-1">内容拆解</h2>
                <p className="type-caption mt-1 text-ai-ink-muted">从原文中提炼表达方法，不照搬原作者内容。</p>
              </div>
              <Button variant="primary" size="sm" disabled={busy === "analyze" || !video} onClick={() => void analyze()}>
                {busy === "analyze" ? <LoaderCircle className="animate-spin" /> : <Bot />}
                {analysis ? "更新拆解" : "生成拆解"}
              </Button>
            </div>

            {analysis ? (
              <div className="mt-4 space-y-4">
                <Card className="bg-surface-ai-raised p-4 shadow-none">
                  <p className="type-label text-ai-ink-muted">拆解摘要</p>
                  <p className="type-body mt-2">{analysis.summary}</p>
                  {analysis.hook ? (
                    <div className="mt-3 border-l-2 border-brand pl-3">
                      <p className="type-caption text-ai-ink-subtle">核心钩子</p>
                      <p className="type-body-sm mt-1">{analysis.hook}</p>
                    </div>
                  ) : null}
                </Card>
                <div className="grid gap-4 lg:grid-cols-2">
                  {analysis.reusablePatterns?.length ? <AnalysisList title="可复用的表达方法" items={analysis.reusablePatterns} /> : null}
                  {analysis.topicIdeas?.length ? <AnalysisList title="可延展选题" items={analysis.topicIdeas} /> : null}
                </div>
                {analysis.missingInformation?.length ? <AnalysisList title="分析边界" items={analysis.missingInformation} muted /> : null}
              </div>
            ) : (
              <Card className="mt-4 bg-surface-ai-raised p-4 shadow-none">
                <p className="type-body-sm text-ai-ink-muted">{video?.transcript ? "原文已就绪，可以生成完整拆解。" : "先补充口播原文，可以获得更完整的拆解结果。"}</p>
              </Card>
            )}
          </Card>

          <Card className="mt-4 p-4 sm:p-5">
            <h2 className="type-card-title">口播原文</h2>
            {video?.transcript ? (
              <div className="mt-3 max-h-96 overflow-y-auto rounded-card border border-line bg-surface-raised p-4 scrollbar-thin">
                <p className="type-body whitespace-pre-wrap">{video.transcript}</p>
              </div>
            ) : (
              <div className="mt-3">
                <FieldLabel htmlFor="benchmark-transcript">补充口播原文或内容摘要</FieldLabel>
                <Textarea
                  id="benchmark-transcript"
                  className="mt-2 min-h-32 resize-y"
                  value={supplement}
                  onChange={(event) => setSupplement(event.target.value)}
                  placeholder="粘贴原文后，AI 会进行完整拆解"
                />
                <Button className="mt-2" disabled={!supplement.trim() || busy === "save"} onClick={() => void saveSupplement()}>
                  {busy === "save" ? <LoaderCircle className="animate-spin" /> : null}
                  保存原文
                </Button>
              </div>
            )}
          </Card>
        </>
      )}

      <Card className="mt-4 overflow-hidden">
        <details>
          <summary className="type-label cursor-pointer px-4 py-4 text-ink-muted hover:bg-surface-muted sm:px-5">
            修正资料信息
          </summary>
          <div className="border-t border-line p-4 sm:p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {isAccount ? (
                <>
                  <div>
                    <FieldLabel htmlFor="benchmark-account-nickname">账号昵称</FieldLabel>
                    <Input
                      id="benchmark-account-nickname"
                      className="mt-2"
                      placeholder="填写账号昵称"
                      value={corrections.nickname ?? account?.nickname ?? ""}
                      onChange={(event) => setCorrections((current) => ({ ...current, nickname: event.target.value }))}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="benchmark-account-douyin-id">抖音号</FieldLabel>
                    <Input
                      id="benchmark-account-douyin-id"
                      className="mt-2"
                      placeholder="填写抖音号"
                      value={corrections.douyin_id ?? account?.douyin_id ?? ""}
                      onChange={(event) => setCorrections((current) => ({ ...current, douyin_id: event.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="benchmark-account-bio">账号简介</FieldLabel>
                    <Textarea
                      id="benchmark-account-bio"
                      className="mt-2 min-h-32"
                      placeholder="填写账号简介或定位"
                      value={corrections.bio ?? account?.bio ?? ""}
                      onChange={(event) => setCorrections((current) => ({ ...current, bio: event.target.value }))}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <FieldLabel htmlFor="benchmark-video-title">视频标题</FieldLabel>
                    <Input
                      id="benchmark-video-title"
                      className="mt-2"
                      placeholder="填写视频标题"
                      value={corrections.title ?? video?.title ?? ""}
                      onChange={(event) => setCorrections((current) => ({ ...current, title: event.target.value }))}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="benchmark-video-author">作者名称</FieldLabel>
                    <Input
                      id="benchmark-video-author"
                      className="mt-2"
                      placeholder="填写作者名称"
                      value={corrections.author_name ?? video?.author_name ?? ""}
                      onChange={(event) => setCorrections((current) => ({ ...current, author_name: event.target.value }))}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <FieldLabel htmlFor="benchmark-video-description">内容摘要</FieldLabel>
                    <Textarea
                      id="benchmark-video-description"
                      className="mt-2 min-h-32"
                      placeholder="填写内容摘要"
                      value={corrections.description ?? video?.description ?? ""}
                      onChange={(event) => setCorrections((current) => ({ ...current, description: event.target.value }))}
                    />
                  </div>
                </>
              )}
            </div>
            <Button className="mt-3" disabled={!Object.keys(corrections).length || busy === "correct"} onClick={() => void saveCorrections()}>
              {busy === "correct" ? <LoaderCircle className="animate-spin" /> : null}
              保存修正
            </Button>
          </div>
        </details>
      </Card>

      <LoginRequiredDialog
        open={Boolean(loginReason)}
        reason={loginReason}
        nextPath={`/benchmarks/${source.id}`}
        onClose={() => setLoginReason("")}
      />
    </>
  );
}

function DetailField({ label, value, wide = false }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="type-label text-ink-muted">{label}</dt>
      <dd className="type-body mt-1">{value || "待补充"}</dd>
    </div>
  );
}

function AnalysisList({ title, items, muted = false }: { title: string; items: string[]; muted?: boolean }) {
  return (
    <div>
      <p className="type-label text-ai-ink-muted">{title}</p>
      <ul className={muted ? "mt-2 space-y-2 text-ai-ink-subtle" : "mt-2 space-y-2 text-ai-ink"}>
        {items.map((item) => (
          <li key={item} className="type-body-sm flex gap-2">
            <span className="text-brand" aria-hidden="true">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
