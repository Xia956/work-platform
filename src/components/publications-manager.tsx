"use client";

import { FormEvent, useMemo, useState } from "react";
import { BarChart3, Bot, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, FileText, Pencil, Trash2, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { calculateDelta, calculateRates } from "@/lib/metrics";
import type { MetricSnapshot, Publication, PublicationReview, Script, ScriptVersion } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { LoginRequiredDialog } from "@/components/login-required-dialog";
import { FieldHelp, Input } from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getPublicationUrlError,
  normalizePublicationUrlInput,
  PUBLICATION_URL_INPUT_MAX_LENGTH,
} from "@/lib/publication-url";

const versionTypeLabels: Record<ScriptVersion["version_type"], string> = {
  rough_draft: "粗稿",
  manual_edit: "手动修改",
  ai_generated: "AI 生成",
  ai_optimized: "AI 优化",
  restored: "恢复版本",
};

export function PublicationsManager({
  initialPublications,
  initialSnapshots,
  scripts,
  versions,
  initialScriptId,
  initialVersionId,
  authenticated,
}: {
  initialPublications: Publication[];
  initialSnapshots: MetricSnapshot[];
  scripts: Script[];
  versions: ScriptVersion[];
  initialScriptId?: string;
  initialVersionId?: string;
  authenticated: boolean;
}) {
  const requestedScript = scripts.find((script) => script.id === initialScriptId) ?? null;
  const requestedScriptVersions = versions
    .filter((version) => version.script_id === requestedScript?.id)
    .sort((a, b) => b.version_number - a.version_number);
  const requestedVersion =
    requestedScriptVersions[0] ??
    versions.find((version) => version.id === initialVersionId && version.script_id === requestedScript?.id) ??
    null;
  const [publications, setPublications] = useState(initialPublications);
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [selectedId, setSelectedId] = useState("");
  const [showCreate, setShowCreate] = useState(Boolean(requestedScript && requestedVersion));
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [videoUrlError, setVideoUrlError] = useState("");
  const [busy, setBusy] = useState(false);
  const [versionMenuOpen, setVersionMenuOpen] = useState(false);
  const [review, setReview] = useState<PublicationReview | null>(null);
  const [reviewRange, setReviewRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [form, setForm] = useState({
    title: requestedScript?.title ?? "",
    scriptId: requestedScript?.id ?? "",
    versionId: requestedVersion?.id ?? "",
    videoUrl: "",
    publishedAt: new Date().toISOString().slice(0, 10),
    notes: "",
  });
  const [metric, setMetric] = useState({
    views: 0, likes: 0, comments: 0, shares: 0, favorites: 0,
    followers_gained: 0, bounce_rate: "", completion_rate: "", avg_watch_time: "",
  });
  const [loginReason, setLoginReason] = useState("");

  const selected = publications.find((item) => item.id === selectedId) ?? null;
  const publishedVersion = selected
    ? versions.find((version) => version.id === selected.script_version_id) ?? null
    : null;
  const publishedCopyParagraphs = publishedVersion?.content
    ? formatPublishedCopyParagraphs(publishedVersion.content)
    : [];
  const displayedReview = review ?? selected?.review ?? null;
  const selectedSnapshots = useMemo(
    () => snapshots.filter((snapshot) => snapshot.publication_id === selectedId).sort((a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at)),
    [snapshots, selectedId],
  );
  const latest = selectedSnapshots[0];
  const previous = selectedSnapshots[1];
  const rates = latest ? calculateRates(latest) : null;
  const scriptVersions = versions.filter((version) => version.script_id === form.scriptId);
  const selectedVersion = scriptVersions.find((version) => version.id === form.versionId) ?? null;

  async function createPublication(event: FormEvent) {
    event.preventDefault();
    const trimmedVideoUrl = form.videoUrl.trim();
    const nextVideoUrlError = getPublicationUrlError(trimmedVideoUrl);
    setVideoUrlError(nextVideoUrlError);
    if (nextVideoUrlError) return;
    setBusy(true);
    setMessage("");
    const data = {
      title: form.title,
      script_id: form.scriptId || null,
      script_version_id: form.versionId || null,
      video_url: trimmedVideoUrl ? normalizePublicationUrlInput(trimmedVideoUrl) : null,
      published_at: new Date(`${form.publishedAt}T12:00:00`).toISOString(),
      notes: form.notes || null,
    };
    const response = await fetch(editingId ? "/api/data/publications" : "/api/publications", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, data } : data),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error);
    setPublications((current) => editingId
      ? current.map((item) => item.id === editingId ? result.data : item)
      : [result.data, ...current]);
    setSelectedId(result.data.id);
    setEditingId("");
    setShowCreate(false);
    setMessage(editingId ? "发布记录已更新" : "已标记为发布，可以继续录入数据");
  }

  function startEdit(item: Publication) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      scriptId: item.script_id ?? "",
      versionId: item.script_version_id ?? "",
      videoUrl: item.video_url ?? "",
      publishedAt: new Date(item.published_at).toISOString().slice(0, 10),
      notes: item.notes ?? "",
    });
    setVideoUrlError("");
    setShowCreate(true);
    setMessage("");
  }

  async function addMetric(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    if (selected.is_demo) {
      const snapshot: MetricSnapshot = {
        id: crypto.randomUUID(),
        publication_id: selected.id,
        recorded_at: new Date().toISOString(),
        views: metric.views,
        likes: metric.likes,
        comments: metric.comments,
        shares: metric.shares,
        favorites: metric.favorites,
        followers_gained: metric.followers_gained,
        bounce_rate: metric.bounce_rate === "" ? null : Number(metric.bounce_rate),
        completion_rate: metric.completion_rate === "" ? null : Number(metric.completion_rate),
        avg_watch_time: metric.avg_watch_time === "" ? null : Number(metric.avg_watch_time),
      };
      setSnapshots((current) => [snapshot, ...current]);
      setMessage("本地数据快照已保存");
      return;
    }
    const response = await fetch(`/api/publications/${selected.id}/metrics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recorded_at: new Date().toISOString(),
        ...metric,
        bounce_rate: metric.bounce_rate === "" ? null : Number(metric.bounce_rate),
        completion_rate: metric.completion_rate === "" ? null : Number(metric.completion_rate),
        avg_watch_time: metric.avg_watch_time === "" ? null : Number(metric.avg_watch_time),
      }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error);
    setSnapshots((current) => [result.data, ...current]);
    setMessage("数据快照已保存");
  }

  async function analyze(
    days: 7 | 30,
    publicationId?: string,
    range?: { startDate: string; endDate: string },
  ) {
    if (!authenticated) {
      setLoginReason("发布、数据记录和 AI 复盘需要登录，以便持续关联内容与真实表现。");
      return;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/ai/reviews/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days, publicationId, ...range }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error);
    setReview(result.data);
  }

  async function remove(id: string) {
    const response = await fetch(`/api/data/publications?id=${id}`, { method: "DELETE" });
    if (response.ok) {
      const next = publications.filter((item) => item.id !== id);
      setPublications(next);
      setSelectedId("");
    }
  }

  async function removeMetric(id: string) {
    if (selected?.is_demo) {
      setSnapshots((current) => current.filter((snapshot) => snapshot.id !== id));
      setMessage("本地数据快照已删除");
      return;
    }
    const response = await fetch(`/api/metrics/${id}`, { method: "DELETE" });
    if (response.ok) {
      setSnapshots((current) => current.filter((snapshot) => snapshot.id !== id));
      setMessage("数据快照已删除");
    } else {
      setMessage((await response.json()).error);
    }
  }

  return (
    <>
    {!authenticated ? (
      <div className="mb-3 rounded-lg border border-[#dfcda7] bg-[#faf4e7] px-3 py-2.5 text-xs leading-5 text-[#6f5a35]">
        登录后可以标记发布、记录数据并进行 AI 复盘；访客灵感和草稿仍保留在当前设备。
      </div>
    ) : null}
    <div>
      <section className={showCreate || selected ? "hidden" : ""}>
        <div className="mb-3 flex gap-2">
          <button type="button" className="btn-secondary flex-1 px-3" disabled={busy} onClick={() => void analyze(7)}><Bot className="size-4" /> 复盘近 7 天</button>
          <button type="button" className="btn-secondary px-3" disabled={busy} onClick={() => void analyze(30)}>30 天</button>
        </div>
        <details className="mb-3 rounded-lg border border-[#d9d1c5] bg-[#f8f4ed] p-3 xl:hidden">
          <summary className="cursor-pointer text-xs font-semibold text-[#716b62]">自定义复盘区间</summary>
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] gap-1.5">
            <input
              className="field min-w-0 px-2 text-[11px]"
              type="date"
              aria-label="手机端复盘开始日期"
              value={reviewRange.startDate}
              onChange={(event) => setReviewRange({ ...reviewRange, startDate: event.target.value })}
            />
            <input
              className="field min-w-0 px-2 text-[11px]"
              type="date"
              aria-label="手机端复盘结束日期"
              value={reviewRange.endDate}
              onChange={(event) => setReviewRange({ ...reviewRange, endDate: event.target.value })}
            />
            <button
              type="button"
              className="btn-secondary px-2 text-xs"
              disabled={busy || !reviewRange.startDate || !reviewRange.endDate}
              onClick={() => void analyze(30, undefined, reviewRange)}
            >
              复盘
            </button>
          </div>
        </details>
        <div className="mb-4 hidden grid-cols-[1fr_1fr_auto] gap-1.5 xl:grid">
          <input
            className="field min-w-0 px-2 text-[11px]"
            type="date"
            aria-label="复盘开始日期"
            value={reviewRange.startDate}
            onChange={(event) => setReviewRange({ ...reviewRange, startDate: event.target.value })}
          />
          <input
            className="field min-w-0 px-2 text-[11px]"
            type="date"
            aria-label="复盘结束日期"
            value={reviewRange.endDate}
            onChange={(event) => setReviewRange({ ...reviewRange, endDate: event.target.value })}
          />
          <button
            type="button"
            className="btn-secondary px-2 text-xs"
            disabled={busy || !reviewRange.startDate || !reviewRange.endDate}
            onClick={() => void analyze(30, undefined, reviewRange)}
          >
            复盘
          </button>
        </div>
        <div className="mb-3 flex items-end justify-between gap-4">
          <div>
            <p className="type-eyebrow text-brand uppercase">Published records</p>
            <h2 className="type-section-title mt-1 text-ink">发布记录</h2>
          </div>
          <p className="type-caption text-ink-subtle">共 {publications.length} 条</p>
        </div>
        <div className="space-y-2">
          {publications.map((item) => {
            const itemSnapshots = snapshots
              .filter((snapshot) => snapshot.publication_id === item.id)
              .sort((a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at));
            const itemLatest = itemSnapshots[0];
            return (
              <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setReview(null); setShowCreate(false); }} className="ui-card flex w-full items-center justify-between gap-4 p-4 text-left transition hover:border-line-strong sm:p-5">
                <div className="min-w-0">
                  <p className="type-card-title text-ink">{item.title}</p>
                  <p className="type-caption mt-2 flex items-center gap-1 text-ink-subtle"><CalendarDays className="size-3" /> {formatDate(item.published_at)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="type-label text-brand">{itemLatest ? `${itemLatest.views.toLocaleString()} 播放` : "待录数据"}</p>
                    <p className="type-caption mt-1 text-ink-subtle">{itemSnapshots.length} 次快照</p>
                  </div>
                  <ChevronRight className="size-4 text-ink-subtle" />
                </div>
              </button>
            );
          })}
        </div>
        {review ? <div className="mt-5"><ReviewCard review={review} /></div> : null}
      </section>

      {showCreate ? (
        <form onSubmit={createPublication} className="paper h-fit rounded-lg p-4 sm:rounded-3xl sm:p-7">
          <p className="text-[10px] font-semibold tracking-[0.16em] text-[#a84f35] uppercase">
            {editingId ? "Edit publication" : "Ready to publish"}
          </p>
          <h2 className="mt-1.5 text-lg font-black sm:text-xl">{editingId ? "编辑发布信息" : "标记为已发布"}</h2>
          <div className="mt-4 rounded-lg bg-[#f3eee6] p-3.5 sm:mt-5 sm:p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold text-[#81796e]">
              <FileText className="size-3.5" /> 关联内容
            </p>
            <p className="mt-1.5 font-semibold leading-6">{form.title || "关联内容已删除"}</p>
          </div>
          <div className="mt-3 grid gap-3 sm:mt-4 sm:grid-cols-2 sm:gap-4">
            <Field label="发布时间">
              <input className="field" type="date" value={form.publishedAt} onChange={(event) => setForm({ ...form, publishedAt: event.target.value })} required />
            </Field>
            <div className="relative min-w-0">
              <p className="mb-2 text-xs font-bold">实际使用版本</p>
              <button
                type="button"
                className="field publication-version-trigger flex h-[46px] items-center justify-between gap-3 text-left"
                aria-haspopup="listbox"
                aria-expanded={versionMenuOpen}
                onClick={() => setVersionMenuOpen((open) => !open)}
              >
                <span>
                  {selectedVersion
                    ? `V${selectedVersion.version_number} · ${versionTypeLabels[selectedVersion.version_type]}`
                    : "请选择版本"}
                </span>
                <ChevronDown className={`size-4 shrink-0 text-[#81796e] transition ${versionMenuOpen ? "rotate-180" : ""}`} />
              </button>
              {versionMenuOpen ? (
                <div
                  role="listbox"
                  aria-label="实际使用版本"
                  className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-lg border border-[#d2c9bc] bg-[#fffefa] p-1.5 shadow-[0_12px_30px_rgb(55_46_35/16%)]"
                >
                  {scriptVersions.sort((a, b) => b.version_number - a.version_number).map((version) => {
                    const selectedVersionId = form.versionId === version.id;
                    return (
                      <button
                        key={version.id}
                        type="button"
                        role="option"
                        aria-selected={selectedVersionId}
                        className={`publication-version-option flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left ${
                          selectedVersionId ? "bg-[#f3e6df] font-semibold text-[#91452f]" : "text-[#5f5951] hover:bg-[#f5f0e8]"
                        }`}
                        onClick={() => {
                          setForm({ ...form, versionId: version.id });
                          setVersionMenuOpen(false);
                        }}
                      >
                        <span>V{version.version_number} · {versionTypeLabels[version.version_type]}</span>
                        {selectedVersionId ? <Check className="size-3.5" /> : null}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
            <Field label="视频链接">
              <Input
                type="text"
                inputMode="url"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                maxLength={PUBLICATION_URL_INPUT_MAX_LENGTH}
                value={form.videoUrl}
                onChange={(event) => {
                  const videoUrl = event.target.value;
                  setForm({ ...form, videoUrl });
                  setVideoUrlError(getPublicationUrlError(videoUrl));
                }}
                placeholder="粘贴 URL 或抖音整段分享文案"
                aria-invalid={Boolean(videoUrlError)}
                aria-describedby="video-url-help"
              />
              <FieldHelp id="video-url-help" className={`mt-2 ${videoUrlError ? "text-danger" : ""}`} aria-live="polite">
                {videoUrlError || "支持长链接、短链接和包含 URL 的整段分享文案，保存时会自动提取链接。"}
              </FieldHelp>
            </Field>
            <label className="block sm:col-span-2">
              <span className="mb-2 block text-xs font-bold">发布备注</span>
              <textarea className="field min-h-20 resize-y leading-6" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} placeholder="可选：记录发布时间选择、封面或其他情况" />
            </label>
          </div>
          {message ? <p className="mt-4 text-sm text-[#a44834]">{message}</p> : null}
          <div className="mt-4 flex gap-2 sm:mt-5">
            <button className="btn-primary flex-1 sm:flex-none" disabled={busy || !form.scriptId || !form.versionId}>
              {busy ? "保存中…" : editingId ? "保存修改" : "确认已发布"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => { setEditingId(""); setShowCreate(false); }}>取消</button>
          </div>
        </form>
      ) : selected ? (
        <section className="space-y-3 sm:space-y-5">
          <button type="button" className="btn-ghost" onClick={() => { setSelectedId(""); setReview(null); setMessage(""); }}>
            <ChevronLeft className="size-4" />返回复盘列表
          </button>
          <div className="paper rounded-lg p-4 sm:rounded-3xl sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#f46f4c]">发布详情</p>
                <h2 className="mt-1 text-xl font-black sm:text-2xl">{selected.title}</h2>
                <p className="mt-1 text-xs text-[#7c746a] sm:mt-2 sm:text-sm">{formatDate(selected.published_at)}</p>
              </div>
              {selected.is_demo ? <Badge tone="warning">本地预览</Badge> : <div className="flex gap-2">
                <button type="button" className="btn-secondary min-h-9 px-2.5 text-xs sm:min-h-[42px] sm:px-3 sm:text-sm" onClick={() => startEdit(selected)}><Pencil className="size-4" /> 编辑</button>
                <button type="button" className="btn-danger" aria-label="删除发布记录" onClick={() => void remove(selected.id)}><Trash2 className="size-4" /></button>
              </div>}
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 sm:mt-6 sm:gap-3">
              <Stat
                label="播放"
                value={latest?.views ?? "—"}
                detail={latest ? calculateDelta(latest.views, previous?.views) : null}
              />
              <Stat label="互动率" value={rates ? `${rates.engagementRate.toFixed(2)}%` : "—"} />
              <Stat label="收藏率" value={rates ? `${rates.favoriteRate.toFixed(2)}%` : "—"} />
            </div>
            <button type="button" className="btn-secondary mt-3 w-full sm:mt-5 sm:w-auto" disabled={busy || (!latest && !publishedVersion?.content) || selected.is_demo} onClick={() => void analyze(7, selected.id)}>
              <Bot className="size-4" /> AI 复盘这条视频
            </button>
          </div>
          <form onSubmit={addMetric} className="paper rounded-lg p-4 sm:rounded-3xl sm:p-7">
            <div className="flex items-center gap-2"><BarChart3 className="size-5 text-[#f46f4c]" /><h3 className="font-black">录入数据快照</h3></div>
            <div className="mt-4 grid grid-cols-2 gap-2.5 sm:mt-5 sm:grid-cols-3 sm:gap-3">
              {[
                ["views", "播放"],
                ["likes", "点赞"],
                ["comments", "评论"],
                ["shares", "分享"],
                ["favorites", "收藏"],
                ["followers_gained", "涨粉"],
              ].map(([key, label]) => (
                <Field key={key} label={label}>
                  <input className="field" type="number" min={key === "followers_gained" ? undefined : 0} value={metric[key as keyof typeof metric]} onChange={(event) => setMetric({ ...metric, [key]: Number(event.target.value) })} />
                </Field>
              ))}
              <Field label="完播率 %">
                <input className="field" type="number" min="0" max="100" step="0.01" value={metric.completion_rate} onChange={(event) => setMetric({ ...metric, completion_rate: event.target.value })} />
              </Field>
              <Field label="跳出率 %">
                <input className="field" type="number" min="0" max="100" step="0.01" value={metric.bounce_rate} onChange={(event) => setMetric({ ...metric, bounce_rate: event.target.value })} />
              </Field>
              <Field label="平均观看秒数">
                <input className="field" type="number" min="0" step="0.1" value={metric.avg_watch_time} onChange={(event) => setMetric({ ...metric, avg_watch_time: event.target.value })} />
              </Field>
            </div>
            <button className="btn-primary mt-4 w-full sm:mt-5 sm:w-auto"><TrendingUp className="size-4" /> 保存快照</button>
            {selectedSnapshots.length ? (
              <div className="mt-6 border-t border-[#e7e0d5] pt-5">
                <h4 className="text-sm font-bold">历史快照</h4>
                <div className="mt-3 space-y-2">
                  {selectedSnapshots.map((snapshot, index) => {
                    const older = selectedSnapshots[index + 1];
                    const delta = calculateDelta(snapshot.views, older?.views);
                    return (
                      <div key={snapshot.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#e7e0d5] bg-white px-3 py-2.5">
                        <div>
                          <p className="text-xs font-semibold">{snapshot.views.toLocaleString()} 播放</p>
                          <p className="mt-1 text-[10px] text-[#8f867b]">
                            {formatDate(snapshot.recorded_at)}
                            {delta != null ? ` · 较上次 ${delta >= 0 ? "+" : ""}${delta.toLocaleString()}` : ""}
                          </p>
                        </div>
                        <button type="button" className="btn-ghost min-h-8 p-2" aria-label="删除数据快照" onClick={() => void removeMetric(snapshot.id)}>
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </form>
          {displayedReview ? <ReviewCard review={displayedReview} /> : null}
          <section className="py-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="type-eyebrow text-brand uppercase">Published script</p>
                <h3 className="type-section-title mt-1 flex items-center gap-2 text-ink">
                  <FileText className="size-5 text-brand" />实际发布文案
                </h3>
              </div>
              {publishedVersion ? (
                <p className="type-caption shrink-0 text-ink-subtle">
                  第 {publishedVersion.version_number} 版
                  {publishedVersion.estimated_duration ? ` · 约 ${publishedVersion.estimated_duration} 秒` : ""}
                </p>
              ) : null}
            </div>
            {publishedCopyParagraphs.length ? (
              <div className="mt-5 max-w-3xl space-y-4 border-l-2 border-brand-soft pl-4 sm:pl-5">
                {publishedCopyParagraphs.map((paragraph, index) => (
                  <p key={`${index}-${paragraph.slice(0, 16)}`} className="type-body text-ink-muted">
                    {paragraph}
                  </p>
                ))}
              </div>
            ) : (
              <p className="type-body-sm mt-5 border-l-2 border-brand-soft pl-4 text-ink-muted">
                尚未找到实际发布文案。请前往内容库补充文案，并在发布信息中关联实际使用版本。
              </p>
            )}
          </section>
        </section>
      ) : publications.length ? null : (
        <EmptyState title="还没有发布记录" description="请从内容库中的待发布内容进入，确认实际使用版本和发布时间。" />
      )}
    </div>
    <LoginRequiredDialog
      open={Boolean(loginReason)}
      reason={loginReason}
      nextPath="/publications"
      onClose={() => setLoginReason("")}
    />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold">{label}</span>{children}</label>;
}

function formatPublishedCopyParagraphs(content: string) {
  const sentences = content.trim().split(/(?<=[。！？!?])\s*/u).filter(Boolean);
  if (sentences.length < 2) return content.trim() ? [content.trim()] : [];

  const paragraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) {
    paragraphs.push(sentences.slice(index, index + 2).join(""));
  }
  return paragraphs;
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: number | null;
}) {
  return (
    <div className="rounded-lg bg-[#f3eee6] p-2.5 sm:rounded-2xl sm:p-4">
      <p className="text-xs text-[#82796e]">{label}</p>
      <p className="mt-1 text-lg font-black sm:mt-2 sm:text-2xl">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {detail != null ? <p className="mt-1 text-[11px] text-[#607465]">较上次 {detail >= 0 ? "+" : ""}{detail.toLocaleString()}</p> : null}
    </div>
  );
}

function ReviewCard({ review }: { review: PublicationReview }) {
  return (
    <Card tone="ai" className="p-4 sm:p-5">
      <div className="flex items-center gap-2 text-brand"><Bot className="size-5" /><h3 className="type-card-title">AI 综合复盘</h3></div>
      <p className="type-body mt-3 text-ai-ink">{review.summary}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <ReviewList title="表现与文案亮点" items={review.wins} />
        <ReviewList title="需要关注" items={review.issues} />
        <ReviewList title="数据与文案关联假设" items={review.hypotheses} />
        <ReviewList title="下一步动作" items={review.nextActions} />
        <ReviewList title="后续选题" items={review.nextTopics} />
      </div>
    </Card>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return <div><p className="type-label text-ai-ink-muted">{title}</p><ul className="type-body-sm mt-2 space-y-2 text-ai-ink">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>;
}
