"use client";

import { FormEvent, useMemo, useState } from "react";
import { BarChart3, Bot, CalendarDays, Pencil, Plus, Trash2, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { calculateDelta, calculateRates } from "@/lib/metrics";
import type { MetricSnapshot, Publication, Script, ScriptVersion } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Review = {
  summary: string;
  wins: string[];
  issues: string[];
  hypotheses: string[];
  nextActions: string[];
  nextTopics: string[];
};

export function PublicationsManager({
  initialPublications,
  initialSnapshots,
  scripts,
  versions,
}: {
  initialPublications: Publication[];
  initialSnapshots: MetricSnapshot[];
  scripts: Script[];
  versions: ScriptVersion[];
}) {
  const [publications, setPublications] = useState(initialPublications);
  const [snapshots, setSnapshots] = useState(initialSnapshots);
  const [selectedId, setSelectedId] = useState(initialPublications[0]?.id ?? "");
  const [showCreate, setShowCreate] = useState(!initialPublications.length);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [reviewRange, setReviewRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [form, setForm] = useState({
    title: "",
    scriptId: "",
    versionId: "",
    videoUrl: "",
    publishedAt: new Date().toISOString().slice(0, 16),
    notes: "",
  });
  const [metric, setMetric] = useState({
    views: 0, likes: 0, comments: 0, shares: 0, favorites: 0,
    followers_gained: 0, completion_rate: "", avg_watch_time: "",
  });

  const selected = publications.find((item) => item.id === selectedId) ?? null;
  const selectedSnapshots = useMemo(
    () => snapshots.filter((snapshot) => snapshot.publication_id === selectedId).sort((a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at)),
    [snapshots, selectedId],
  );
  const latest = selectedSnapshots[0];
  const previous = selectedSnapshots[1];
  const rates = latest ? calculateRates(latest) : null;
  const scriptVersions = versions.filter((version) => version.script_id === form.scriptId);

  async function createPublication(event: FormEvent) {
    event.preventDefault();
    const data = {
      title: form.title,
      script_id: form.scriptId || null,
      script_version_id: form.versionId || null,
      video_url: form.videoUrl || null,
      published_at: new Date(form.publishedAt).toISOString(),
      notes: form.notes || null,
    };
    const response = await fetch("/api/data/publications", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, data } : data),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error);
    setPublications((current) => editingId
      ? current.map((item) => item.id === editingId ? result.data : item)
      : [result.data, ...current]);
    setSelectedId(result.data.id);
    setEditingId("");
    setShowCreate(false);
    setMessage(editingId ? "发布记录已更新" : "发布记录已保存");
  }

  function startCreate() {
    setEditingId("");
    setForm({
      title: "",
      scriptId: "",
      versionId: "",
      videoUrl: "",
      publishedAt: new Date().toISOString().slice(0, 16),
      notes: "",
    });
    setShowCreate(true);
    setMessage("");
  }

  function startEdit(item: Publication) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      scriptId: item.script_id ?? "",
      versionId: item.script_version_id ?? "",
      videoUrl: item.video_url ?? "",
      publishedAt: new Date(item.published_at).toISOString().slice(0, 16),
      notes: item.notes ?? "",
    });
    setShowCreate(true);
    setMessage("");
  }

  async function addMetric(event: FormEvent) {
    event.preventDefault();
    if (!selected) return;
    const response = await fetch(`/api/publications/${selected.id}/metrics`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        recorded_at: new Date().toISOString(),
        ...metric,
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
      setSelectedId(next[0]?.id ?? "");
    }
  }

  async function removeMetric(id: string) {
    const response = await fetch(`/api/metrics/${id}`, { method: "DELETE" });
    if (response.ok) {
      setSnapshots((current) => current.filter((snapshot) => snapshot.id !== id));
      setMessage("数据快照已删除");
    } else {
      setMessage((await response.json()).error);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
      <aside>
        <div className="mb-3 flex gap-2">
          <button type="button" className="btn-primary flex-1" onClick={startCreate}><Plus className="size-4" /> 登记发布</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void analyze(7)}><Bot className="size-4" /> 7 天</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => void analyze(30)}>30 天</button>
        </div>
        <div className="mb-4 grid grid-cols-[1fr_1fr_auto] gap-1.5">
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
        <div className="space-y-3">
          {publications.map((item) => {
            const itemLatest = snapshots.filter((snapshot) => snapshot.publication_id === item.id).sort((a, b) => +new Date(b.recorded_at) - +new Date(a.recorded_at))[0];
            return (
              <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setShowCreate(false); }} className={`paper w-full rounded-2xl p-4 text-left ${selectedId === item.id ? "ring-2 ring-[#f46f4c]" : ""}`}>
                <p className="font-black">{item.title}</p>
                <p className="mt-2 flex items-center gap-1 text-[11px] text-[#8f867b]"><CalendarDays className="size-3" /> {formatDate(item.published_at)}</p>
                <p className="mt-3 text-sm font-bold text-[#e35f3f]">{itemLatest ? `${itemLatest.views.toLocaleString()} 播放` : "等待录入数据"}</p>
              </button>
            );
          })}
        </div>
      </aside>

      {showCreate ? (
        <form onSubmit={createPublication} className="paper h-fit rounded-3xl p-5 sm:p-7">
          <h2 className="text-xl font-black">{editingId ? "编辑发布记录" : "登记一次发布"}</h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="视频标题">
              <input className="field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
            </Field>
            <Field label="发布时间">
              <input className="field" type="datetime-local" value={form.publishedAt} onChange={(event) => setForm({ ...form, publishedAt: event.target.value })} required />
            </Field>
            <Field label="关联文案">
              <select className="field" value={form.scriptId} onChange={(event) => setForm({ ...form, scriptId: event.target.value, versionId: "" })}>
                <option value="">不关联</option>
                {scripts.map((script) => <option key={script.id} value={script.id}>{script.title}</option>)}
              </select>
            </Field>
            <Field label="实际使用版本">
              <select className="field" value={form.versionId} onChange={(event) => setForm({ ...form, versionId: event.target.value })} disabled={!form.scriptId}>
                <option value="">请选择</option>
                {scriptVersions.sort((a, b) => b.version_number - a.version_number).map((version) => <option key={version.id} value={version.id}>V{version.version_number} · {version.version_type}</option>)}
              </select>
            </Field>
            <Field label="视频链接">
              <input className="field" type="url" value={form.videoUrl} onChange={(event) => setForm({ ...form, videoUrl: event.target.value })} placeholder="https://..." />
            </Field>
            <Field label="发布备注">
              <input className="field" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </Field>
          </div>
          {message ? <p className="mt-4 text-sm text-[#a44834]">{message}</p> : null}
          <div className="mt-5 flex gap-2">
            <button className="btn-primary">{editingId ? "保存修改" : "保存发布记录"}</button>
            <button type="button" className="btn-secondary" onClick={() => { setEditingId(""); setShowCreate(false); }}>取消</button>
          </div>
        </form>
      ) : selected ? (
        <section className="space-y-5">
          <div className="paper rounded-3xl p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#f46f4c]">发布详情</p>
                <h2 className="mt-1 text-2xl font-black">{selected.title}</h2>
                <p className="mt-2 text-sm text-[#7c746a]">{formatDate(selected.published_at)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" className="btn-secondary" onClick={() => startEdit(selected)}><Pencil className="size-4" /> 编辑</button>
                <button type="button" className="btn-danger" aria-label="删除发布记录" onClick={() => void remove(selected.id)}><Trash2 className="size-4" /></button>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <Stat
                label="播放"
                value={latest?.views ?? 0}
                detail={latest ? calculateDelta(latest.views, previous?.views) : null}
              />
              <Stat label="互动率" value={rates ? `${rates.engagementRate.toFixed(2)}%` : "—"} />
              <Stat label="收藏率" value={rates ? `${rates.favoriteRate.toFixed(2)}%` : "—"} />
            </div>
            <button type="button" className="btn-secondary mt-5" disabled={busy || !latest} onClick={() => void analyze(7, selected.id)}>
              <Bot className="size-4" /> AI 复盘这条视频
            </button>
          </div>
          <form onSubmit={addMetric} className="paper rounded-3xl p-5 sm:p-7">
            <div className="flex items-center gap-2"><BarChart3 className="size-5 text-[#f46f4c]" /><h3 className="font-black">录入数据快照</h3></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
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
              <Field label="平均观看秒数">
                <input className="field" type="number" min="0" step="0.1" value={metric.avg_watch_time} onChange={(event) => setMetric({ ...metric, avg_watch_time: event.target.value })} />
              </Field>
            </div>
            <button className="btn-primary mt-5"><TrendingUp className="size-4" /> 保存快照</button>
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
          {review ? <ReviewCard review={review} /> : null}
        </section>
      ) : (
        <EmptyState title="还没有发布记录" description="发布后登记实际使用的文案版本，再持续补充数据快照。" />
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-bold">{label}</span>{children}</label>;
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
    <div className="rounded-2xl bg-[#f3eee6] p-4">
      <p className="text-xs text-[#82796e]">{label}</p>
      <p className="mt-2 text-2xl font-black">{typeof value === "number" ? value.toLocaleString() : value}</p>
      {detail != null ? <p className="mt-1 text-[11px] text-[#607465]">较上次 {detail >= 0 ? "+" : ""}{detail.toLocaleString()}</p> : null}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rounded-3xl bg-[#211f1b] p-5 text-white sm:p-7">
      <div className="flex items-center gap-2 text-[#ff9b80]"><Bot className="size-5" /><h3 className="font-black">AI 数据复盘</h3></div>
      <p className="mt-4 leading-7 text-white/80">{review.summary}</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <ReviewList title="做得好的" items={review.wins} />
        <ReviewList title="需要关注" items={review.issues} />
        <ReviewList title="下一步动作" items={review.nextActions} />
        <ReviewList title="后续选题" items={review.nextTopics} />
      </div>
    </article>
  );
}

function ReviewList({ title, items }: { title: string; items: string[] }) {
  return <div><p className="text-xs font-black text-[#ff9b80]">{title}</p><ul className="mt-2 space-y-2 text-sm leading-6 text-white/70">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>;
}
