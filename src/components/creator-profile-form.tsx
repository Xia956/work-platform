"use client";

import { FormEvent, useState } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { splitTags } from "@/lib/utils";

export interface CreatorProfileView {
  id: string;
  display_name: string;
  positioning: string;
  audience: string;
  persona: string;
  speaking_style: string;
  content_pillars: string[];
  banned_phrases: string[];
  default_duration: number;
}

export function CreatorProfileForm({ initialProfile }: { initialProfile: CreatorProfileView | null }) {
  const [form, setForm] = useState({
    display_name: initialProfile?.display_name ?? "",
    positioning: initialProfile?.positioning ?? "",
    audience: initialProfile?.audience ?? "",
    persona: initialProfile?.persona ?? "",
    speaking_style: initialProfile?.speaking_style ?? "",
    content_pillars: initialProfile?.content_pillars.join(", ") ?? "",
    banned_phrases: initialProfile?.banned_phrases.join(", ") ?? "",
    default_duration: initialProfile?.default_duration ?? 60,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/profile", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        ...form,
        content_pillars: splitTags(form.content_pillars),
        banned_phrases: splitTags(form.banned_phrases),
      }),
    });
    const result = await response.json();
    setBusy(false);
    setMessage(response.ok ? "档案已保存，后续 AI 任务会使用这些信息" : result.error);
  }

  return (
    <form onSubmit={submit} className="paper max-w-4xl rounded-3xl p-5 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="创作者名称" hint="用于界面显示">
          <input className="field" value={form.display_name} onChange={(event) => setForm({ ...form, display_name: event.target.value })} placeholder="例如：小夏聊职场" />
        </Field>
        <Field label="默认口播时长" hint="每次新建文案的默认值">
          <select className="field" value={form.default_duration} onChange={(event) => setForm({ ...form, default_duration: Number(event.target.value) })}>
            {[30, 45, 60, 90, 120, 180].map((value) => <option key={value} value={value}>{value} 秒</option>)}
          </select>
        </Field>
        <Field label="账号定位" hint="你长期讲什么、提供什么价值">
          <textarea className="field min-h-28" value={form.positioning} onChange={(event) => setForm({ ...form, positioning: event.target.value })} placeholder="帮助刚进入职场的年轻人建立更清晰的工作方法" />
        </Field>
        <Field label="目标受众" hint="越具体，文案越贴近真实场景">
          <textarea className="field min-h-28" value={form.audience} onChange={(event) => setForm({ ...form, audience: event.target.value })} placeholder="工作 1—3 年、容易内耗的互联网从业者" />
        </Field>
        <Field label="人设与可信度" hint="你的经历、立场和边界">
          <textarea className="field min-h-28" value={form.persona} onChange={(event) => setForm({ ...form, persona: event.target.value })} />
        </Field>
        <Field label="表达风格" hint="描述真实说话方式">
          <textarea className="field min-h-28" value={form.speaking_style} onChange={(event) => setForm({ ...form, speaking_style: event.target.value })} placeholder="直接但不攻击，短句，有具体例子，不端着" />
        </Field>
        <Field label="内容支柱" hint="使用逗号分隔">
          <input className="field" value={form.content_pillars} onChange={(event) => setForm({ ...form, content_pillars: event.target.value })} placeholder="职场沟通, 自我成长, 内容创作" />
        </Field>
        <Field label="禁用表达" hint="AI 文案中不要出现的词">
          <input className="field" value={form.banned_phrases} onChange={(event) => setForm({ ...form, banned_phrases: event.target.value })} placeholder="家人们, 绝绝子, 必须" />
        </Field>
      </div>
      <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[#eef2eb] p-4 text-sm leading-6 text-[#526451]">
        <ShieldCheck className="mt-0.5 size-5 shrink-0" />
        这些信息只保存在你的 Supabase 账号数据中，并通过行级权限与其他用户隔离。
      </div>
      {message ? <p className="mt-4 text-sm font-semibold text-[#9b503c]">{message}</p> : null}
      <button className="btn-primary mt-5" disabled={busy}><Save className="size-4" /> {busy ? "保存中…" : "保存创作者档案"}</button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm font-black">{label}</span>
      <span className="mb-2 mt-0.5 block text-xs text-[#8d8479]">{hint}</span>
      {children}
    </label>
  );
}
