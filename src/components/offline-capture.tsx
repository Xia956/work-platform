"use client";

import { FormEvent, useState } from "react";
import { CloudOff, Lightbulb, Save } from "lucide-react";
import { queueInspiration } from "@/lib/offline-inspirations";
import { splitTags } from "@/lib/utils";

export function OfflineCapture() {
  const [form, setForm] = useState({ title: "", content: "", tags: "" });
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    await queueInspiration({
      id: crypto.randomUUID(),
      title: form.title.trim(),
      content: form.content.trim(),
      tags: splitTags(form.tags),
      status: "inbox",
      created_at: new Date().toISOString(),
    });
    setForm({ title: "", content: "", tags: "" });
    setMessage("已保存在本机。联网并登录后会自动同步。");
  }

  return (
    <form onSubmit={submit} className="paper rounded-3xl p-6">
      <div className="flex items-center gap-2 text-[#a55c43]"><CloudOff className="size-4" /><span className="text-xs font-bold">离线灵感收集</span></div>
      <label htmlFor="offline-title" className="mb-2 mt-5 block text-sm font-bold">一句话标题</label>
      <div className="relative">
        <Lightbulb className="absolute left-3.5 top-3.5 size-4 text-[#998f83]" />
        <input id="offline-title" className="field pl-10" value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} required />
      </div>
      <label htmlFor="offline-content" className="mb-2 mt-4 block text-sm font-bold">补充细节</label>
      <textarea id="offline-content" className="field min-h-32" value={form.content} onChange={(event) => setForm({ ...form, content: event.target.value })} />
      <label htmlFor="offline-tags" className="mb-2 mt-4 block text-sm font-bold">标签</label>
      <input id="offline-tags" className="field" value={form.tags} onChange={(event) => setForm({ ...form, tags: event.target.value })} placeholder="成长, 职场" />
      {message ? <p className="mt-4 text-sm font-semibold text-[#5f775f]">{message}</p> : null}
      <button className="btn-primary mt-5 w-full"><Save className="size-4" /> 保存在本机</button>
    </form>
  );
}
