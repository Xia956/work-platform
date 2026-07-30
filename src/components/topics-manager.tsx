"use client";

import { FormEvent, useMemo, useState } from "react";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import type { Topic, TopicStatus } from "@/lib/types";
import { splitTags } from "@/lib/utils";

const columns: Array<{ value: TopicStatus; label: string; hint: string }> = [
  { value: "backlog", label: "想法池", hint: "等待判断" },
  { value: "ready", label: "待写稿", hint: "已经值得讲" },
  { value: "drafting", label: "写作中", hint: "正在形成表达" },
  { value: "completed", label: "已完成", hint: "准备发布" },
];

export function TopicsManager({ initialItems }: { initialItems: Topic[] }) {
  const [items, setItems] = useState(initialItems);
  const [query, setQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    title: "",
    angle: "",
    audience: "",
    pain_point: "",
    keywords: "",
    priority: 3,
  });

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return keyword
      ? items.filter((item) => [item.title, item.angle, item.audience, ...item.keywords].join(" ").toLowerCase().includes(keyword))
      : items;
  }, [items, query]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const response = await fetch("/api/data/topics", {
      method: editingId ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(editingId ? {
        id: editingId,
        data: {
          title: form.title,
          angle: form.angle || null,
          audience: form.audience || null,
          pain_point: form.pain_point || null,
          keywords: splitTags(form.keywords),
          priority: form.priority,
        },
      } : {
        title: form.title,
        angle: form.angle || null,
        audience: form.audience || null,
        pain_point: form.pain_point || null,
        keywords: splitTags(form.keywords),
        priority: form.priority,
        status: "backlog",
        inspiration_id: null,
      }),
    });
    const result = await response.json();
    if (!response.ok) return setMessage(result.error);
    setItems((current) => editingId
      ? current.map((item) => item.id === editingId ? result.data : item)
      : [result.data, ...current]);
    setForm({ title: "", angle: "", audience: "", pain_point: "", keywords: "", priority: 3 });
    setEditingId("");
    setShowForm(false);
    setMessage(editingId ? "选题已更新" : "");
  }

  function edit(item: Topic) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      angle: item.angle ?? "",
      audience: item.audience ?? "",
      pain_point: item.pain_point ?? "",
      keywords: item.keywords.join(", "),
      priority: item.priority,
    });
    setShowForm(true);
    setMessage("");
  }

  function closeForm() {
    setEditingId("");
    setForm({ title: "", angle: "", audience: "", pain_point: "", keywords: "", priority: 3 });
    setShowForm(false);
  }

  async function move(item: Topic, status: TopicStatus) {
    const response = await fetch("/api/data/topics", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: item.id, data: { status } }),
    });
    if (response.ok) setItems((current) => current.map((topic) => topic.id === item.id ? { ...topic, status } : topic));
    else setMessage((await response.json()).error);
  }

  async function remove(id: string) {
    const response = await fetch(`/api/data/topics?id=${id}`, { method: "DELETE" });
    if (response.ok) setItems((current) => current.filter((topic) => topic.id !== id));
  }

  return (
    <>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3.5 size-4 text-[#978e82]" />
          <input className="field pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索选题" aria-label="搜索选题" />
        </div>
        <button type="button" className="btn-primary" onClick={() => showForm ? closeForm() : setShowForm(true)}>
          <Plus className="size-4" /> 新建选题
        </button>
      </div>
      {showForm ? (
        <form onSubmit={submit} className="paper mb-6 grid gap-4 rounded-3xl p-5 sm:grid-cols-2 xl:grid-cols-3">
          <div className="sm:col-span-2 xl:col-span-1">
            <label className="mb-2 block text-sm font-bold" htmlFor="topic-title">选题标题</label>
            <input id="topic-title" className="field" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold" htmlFor="topic-audience">目标受众</label>
            <input id="topic-audience" className="field" value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold" htmlFor="topic-angle">切入角度</label>
            <input id="topic-angle" className="field" value={form.angle} onChange={(event) => setForm({ ...form, angle: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold" htmlFor="topic-pain">核心痛点</label>
            <input id="topic-pain" className="field" value={form.pain_point} onChange={(event) => setForm({ ...form, pain_point: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold" htmlFor="topic-keywords">关键词</label>
            <input id="topic-keywords" className="field" value={form.keywords} onChange={(event) => setForm({ ...form, keywords: event.target.value })} placeholder="口播, 成长" />
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold" htmlFor="topic-priority">优先级</label>
            <select id="topic-priority" className="field" value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })}>
              {[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} · {"★".repeat(value)}</option>)}
            </select>
          </div>
          {message ? <p className="text-sm text-[#a44834] sm:col-span-2">{message}</p> : null}
          <div className="flex gap-2 sm:col-span-2 xl:col-span-3">
            <button className="btn-primary">{editingId ? "保存修改" : "保存选题"}</button>
            <button type="button" className="btn-secondary" onClick={closeForm}>取消</button>
          </div>
        </form>
      ) : null}
      {filtered.length ? (
        <div className="grid gap-4 xl:grid-cols-4">
          {columns.map((column) => {
            const columnItems = filtered.filter((item) => item.status === column.value);
            return (
              <section key={column.value} className="rounded-3xl bg-[#eee9e0]/65 p-3">
                <div className="mb-3 flex items-center justify-between px-2 py-1">
                  <div>
                    <h2 className="font-black">{column.label} <span className="ml-1 text-xs text-[#948b80]">{columnItems.length}</span></h2>
                    <p className="mt-0.5 text-[11px] text-[#948b80]">{column.hint}</p>
                  </div>
                  <MoreHorizontal className="size-4 text-[#9c9388]" />
                </div>
                <div className="space-y-3">
                  {columnItems.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-[#e7e0d5] bg-[#fffdf9] p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[10px] font-black tracking-wider text-[#f46f4c]">P{item.priority}</span>
                        <div className="flex items-center gap-2">
                          <button type="button" aria-label="编辑选题" className="text-[#aaa196] hover:text-[#a84f35]" onClick={() => edit(item)}><Pencil className="size-3.5" /></button>
                          <button type="button" aria-label="删除选题" className="text-[#aaa196] hover:text-[#b83b28]" onClick={() => void remove(item.id)}><Trash2 className="size-3.5" /></button>
                        </div>
                      </div>
                      <h3 className="mt-3 font-black leading-snug">{item.title}</h3>
                      {item.angle ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-[#746d64]">{item.angle}</p> : null}
                      {item.keywords.length ? <p className="mt-3 text-[11px] text-[#a15b45]">{item.keywords.map((tag) => `#${tag}`).join(" ")}</p> : null}
                      <select
                        className="mt-4 w-full rounded-xl border border-[#e7e0d5] bg-white px-2 py-2 text-xs font-semibold"
                        value={item.status}
                        onChange={(event) => void move(item, event.target.value as TopicStatus)}
                        aria-label={`移动选题 ${item.title}`}
                      >
                        {columns.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                        <option value="published">已发布</option>
                        <option value="archived">归档</option>
                      </select>
                    </article>
                  ))}
                  {!columnItems.length ? <div className="rounded-2xl border border-dashed border-[#d9d0c4] p-5 text-center text-xs text-[#9c9388]">暂无选题</div> : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <EmptyState title="还没有选题" description="从灵感库转入，或直接创建一个值得讲的主题。" />
      )}
    </>
  );
}
