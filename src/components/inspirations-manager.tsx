"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ArrowRight, CloudOff, Pencil, Plus, Search, Trash2, Wifi } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { Inspiration, InspirationStatus } from "@/lib/types";
import { formatDate, splitTags } from "@/lib/utils";
import {
  getQueuedInspirations,
  queueInspiration,
  removeQueuedInspirations,
  type OfflineInspiration,
} from "@/lib/offline-inspirations";
import { useOnlineStatus } from "@/lib/use-online-status";

const statusLabels: Record<InspirationStatus, string> = {
  inbox: "待整理",
  developing: "展开中",
  converted: "已转选题",
  archived: "已归档",
};

export function InspirationsManager({
  initialItems,
  configured,
}: {
  initialItems: Inspiration[];
  configured: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [editing, setEditing] = useState<Inspiration | null>(null);
  const [query, setQuery] = useState("");
  const online = useOnlineStatus();
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({ title: "", content: "", tags: "" });

  useEffect(() => {
    if (!online || !configured) return;
    void (async () => {
      const queued = await getQueuedInspirations();
      if (!queued.length) return;
      const response = await fetch("/api/inspirations/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ items: queued }),
      });
      if (response.ok) {
        const payload = await response.json();
        await removeQueuedInspirations(payload.syncedIds);
        setMessage(`已同步 ${payload.syncedIds.length} 条离线灵感`);
      }
    })();
  }, [online, configured]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter((item) =>
      [item.title, item.content, ...item.tags].join(" ").toLowerCase().includes(keyword),
    );
  }, [items, query]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      tags: splitTags(form.tags),
      status: editing?.status ?? ("inbox" as const),
    };

    if (editing) {
      const response = await fetch("/api/data/inspirations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id: editing.id, data: payload }),
      });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error);
      setItems((current) => current.map((item) => (item.id === editing.id ? result.data : item)));
    } else if (!online) {
      const queued: OfflineInspiration = {
        id: crypto.randomUUID(),
        title: payload.title,
        content: payload.content,
        tags: payload.tags,
        status: "inbox",
        created_at: new Date().toISOString(),
      };
      await queueInspiration(queued);
      setItems((current) => [queued, ...current]);
      setMessage("已保存在本机，联网后会自动同步");
    } else {
      const response = await fetch("/api/data/inspirations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) return setMessage(result.error);
      setItems((current) => [result.data, ...current]);
    }
    setForm({ title: "", content: "", tags: "" });
    setEditing(null);
  }

  async function remove(id: string) {
    const response = await fetch(`/api/data/inspirations?id=${id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((item) => item.id !== id));
    else setMessage((await response.json()).error);
  }

  async function convert(item: Inspiration) {
    const response = await fetch(`/api/inspirations/${item.id}/convert`, {
      method: "POST",
    });
    if (!response.ok) return setMessage((await response.json()).error);
    setItems((current) =>
      current.map((currentItem) =>
        currentItem.id === item.id ? { ...currentItem, status: "converted" } : currentItem,
      ),
    );
    setMessage("已转为选题，可在选题看板继续整理");
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <form onSubmit={submit} className="paper h-fit rounded-3xl p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black">{editing ? "编辑灵感" : "记下此刻的想法"}</h2>
          <span className={`flex items-center gap-1.5 text-xs font-bold ${online ? "text-[#668066]" : "text-[#a65a44]"}`}>
            {online ? <Wifi className="size-3.5" /> : <CloudOff className="size-3.5" />}
            {online ? "在线" : "离线可记录"}
          </span>
        </div>
        <label className="mb-2 mt-5 block text-sm font-bold" htmlFor="inspiration-title">一句话标题</label>
        <input
          id="inspiration-title"
          className="field"
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          placeholder="例如：为什么越努力做内容越焦虑？"
          required
        />
        <label className="mb-2 mt-4 block text-sm font-bold" htmlFor="inspiration-content">补充细节</label>
        <textarea
          id="inspiration-content"
          className="field min-h-32 resize-y"
          value={form.content}
          onChange={(event) => setForm({ ...form, content: event.target.value })}
          placeholder="场景、冲突、你当时的判断……"
        />
        <label className="mb-2 mt-4 block text-sm font-bold" htmlFor="inspiration-tags">标签</label>
        <input
          id="inspiration-tags"
          className="field"
          value={form.tags}
          onChange={(event) => setForm({ ...form, tags: event.target.value })}
          placeholder="成长, 职场, 评论区"
        />
        {message ? <p className="mt-4 text-sm leading-5 text-[#9b503c]">{message}</p> : null}
        <div className="mt-5 flex gap-2">
          <button className="btn-primary flex-1" disabled={!form.title.trim()}>
            <Plus className="size-4" /> {editing ? "保存修改" : "保存灵感"}
          </button>
          {editing ? (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditing(null);
                setForm({ title: "", content: "", tags: "" });
              }}
            >
              取消
            </button>
          ) : null}
        </div>
      </form>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 size-4 text-[#978e82]" />
            <input
              className="field pl-10"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、内容或标签"
              aria-label="搜索灵感"
            />
          </div>
          <span className="whitespace-nowrap text-sm font-bold text-[#746d64]">{filtered.length} 条</span>
        </div>
        {filtered.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((item) => (
              <article key={item.id} className="paper rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="rounded-full bg-[#f2ede4] px-2.5 py-1 text-[11px] font-bold text-[#746d64]">
                    {statusLabels[item.status]}
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      className="btn-ghost min-h-8 p-2"
                      aria-label="编辑灵感"
                      onClick={() => {
                        setEditing(item);
                        setForm({ title: item.title, content: item.content, tags: item.tags.join(", ") });
                      }}
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button type="button" className="btn-ghost min-h-8 p-2" aria-label="删除灵感" onClick={() => void remove(item.id)}>
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-black leading-snug">{item.title}</h3>
                {item.content ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#706b62]">{item.content}</p> : null}
                {item.tags.length ? (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {item.tags.map((tag) => <span key={tag} className="rounded-lg bg-[#fff0e9] px-2 py-1 text-[11px] font-semibold text-[#a94d34]">#{tag}</span>)}
                  </div>
                ) : null}
                <div className="mt-5 flex items-center justify-between border-t border-[#ece5db] pt-4">
                  <time className="text-xs text-[#9a9186]">{formatDate(item.created_at)}</time>
                  {item.status !== "converted" ? (
                    <button type="button" className="flex items-center gap-1 text-xs font-bold text-[#e35f3f]" onClick={() => void convert(item)}>
                      转为选题 <ArrowRight className="size-3.5" />
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="还没有灵感" description="先记下一句话。离线也可以保存，恢复网络后会自动同步。" />
        )}
      </section>
    </div>
  );
}
