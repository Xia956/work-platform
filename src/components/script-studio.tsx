"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  Copy,
  FilePlus2,
  History,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { ScriptOptimizationPanel } from "@/components/script-optimization-panel";
import type { ScriptOptimizationOptions } from "@/lib/script-ai";
import type { Script, ScriptVersion, Topic } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

const versionLabels: Record<ScriptVersion["version_type"], string> = {
  rough_draft: "原始粗稿",
  manual_edit: "手动修改",
  ai_generated: "AI 生成",
  ai_optimized: "AI 优化",
  restored: "恢复版本",
};

export function ScriptStudio({
  initialScripts,
  initialVersions,
  topics,
  defaultDuration = 60,
}: {
  initialScripts: Script[];
  initialVersions: ScriptVersion[];
  topics: Topic[];
  defaultDuration?: number;
}) {
  const initialSelectedId = initialScripts[0]?.id ?? "";
  const initialSelectedVersion =
    initialVersions.find((version) => version.id === initialScripts[0]?.current_version_id) ??
    initialVersions
      .filter((version) => version.script_id === initialSelectedId)
      .sort((a, b) => b.version_number - a.version_number)[0];
  const [scripts, setScripts] = useState(initialScripts);
  const [versions, setVersions] = useState(initialVersions);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [showCreate, setShowCreate] = useState(!initialScripts.length);
  const [editor, setEditor] = useState(
    initialScripts[0]?.autosave_content || initialSelectedVersion?.content || "",
  );
  const [sourceVersionId, setSourceVersionId] = useState<string | null>(initialSelectedVersion?.id ?? null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [draft, setDraft] = useState({ title: "", topicId: "", content: "", targetDuration: defaultDuration });

  const selected = scripts.find((script) => script.id === selectedId) ?? null;
  const selectedVersions = useMemo(
    () => versions.filter((version) => version.script_id === selectedId).sort((a, b) => b.version_number - a.version_number),
    [versions, selectedId],
  );

  useEffect(() => {
    if (!selected || !editor) return;
    const timer = window.setTimeout(() => {
      void fetch("/api/scripts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "autosave", scriptId: selected.id, content: editor }),
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [editor, selected]);

  function selectScript(script: Script) {
    const scriptVersions = versions
      .filter((version) => version.script_id === script.id)
      .sort((a, b) => b.version_number - a.version_number);
    const current = scriptVersions.find((version) => version.id === script.current_version_id) ?? scriptVersions[0];
    setSelectedId(script.id);
    setEditor(script.autosave_content || current?.content || "");
    setSourceVersionId(current?.id ?? null);
    setShowCreate(false);
  }

  async function createDraft(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    const response = await fetch("/api/scripts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: draft.title,
        topicId: draft.topicId || null,
        content: draft.content,
        targetDuration: draft.targetDuration,
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error);
    setScripts((current) => [result.data.script, ...current]);
    setVersions((current) => [...result.data.versions, ...current]);
    setSelectedId(result.data.script.id);
    setEditor(result.data.versions[0]?.content ?? draft.content);
    setSourceVersionId(result.data.versions[0]?.id ?? null);
    setShowCreate(false);
    setDraft({ title: "", topicId: "", content: "", targetDuration: defaultDuration });
    setMessage("原始粗稿已保存");
  }

  async function appendVersion(
    versionType: "manual_edit" | "restored",
    content = editor,
  ): Promise<ScriptVersion | null> {
    if (!selected) return null;
    setBusy(true);
    const response = await fetch("/api/scripts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "append",
        scriptId: selected.id,
        sourceVersionId,
        content,
        versionType,
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error);
      return null;
    }
    setVersions((current) => [result.data, ...current]);
    setScripts((current) => current.map((script) => script.id === selected.id ? { ...script, current_version_id: result.data.id } : script));
    setSourceVersionId(result.data.id);
    setEditor(result.data.content);
    setMessage(versionType === "restored" ? "已创建恢复版本" : "已保存为新版本");
    return result.data;
  }

  async function optimize(options: ScriptOptimizationOptions) {
    if (!selected || !sourceVersionId) return;
    let optimizeSourceId = sourceVersionId;
    const sourceVersion = versions.find((version) => version.id === sourceVersionId);
    if (sourceVersion && sourceVersion.content !== editor) {
      const saved = await appendVersion("manual_edit", editor);
      if (!saved) return;
      optimizeSourceId = saved.id;
    }
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/ai/scripts/optimize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scriptId: selected.id,
        sourceVersionId: optimizeSourceId,
        applyResult: true,
        ...options,
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error);
    setVersions((current) => [result.data, ...current]);
    setScripts((current) => current.map((script) => script.id === selected.id ? { ...script, current_version_id: result.data.id } : script));
    setEditor(result.data.content);
    setSourceVersionId(result.data.id);
    setMessage("AI 优化完成，原版本保持不变");
  }

  async function generateFromTopic() {
    if (!draft.topicId) return;
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/ai/scripts/generate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        topicId: draft.topicId,
        targetDuration: draft.targetDuration,
        instruction: draft.content,
      }),
    });
    const result = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(result.error);
    setScripts((current) => [result.data.script, ...current]);
    setVersions((current) => [result.data.version, ...current]);
    setSelectedId(result.data.script.id);
    setEditor(result.data.version.content);
    setSourceVersionId(result.data.version.id);
    setShowCreate(false);
    setMessage("已从选题生成文案，可继续手动修改");
  }

  async function removeScript() {
    if (!selected) return;
    const response = await fetch(`/api/scripts?id=${selected.id}`, { method: "DELETE" });
    if (response.ok) {
      const next = scripts.filter((script) => script.id !== selected.id);
      setScripts(next);
      setVersions((current) => current.filter((version) => version.script_id !== selected.id));
      if (next[0]) selectScript(next[0]);
      else {
        setSelectedId("");
        setEditor("");
        setSourceVersionId(null);
        setShowCreate(true);
      }
    }
  }

  return (
    <div className="grid min-h-[650px] gap-5 xl:grid-cols-[260px_1fr_300px]">
      <aside className="paper rounded-3xl p-3">
        <button type="button" className="btn-primary mb-3 w-full" onClick={() => setShowCreate(true)}>
          <FilePlus2 className="size-4" /> 新建粗稿
        </button>
        <div className="max-h-[560px] space-y-2 overflow-y-auto scrollbar-thin">
          {scripts.map((script) => (
            <button
              key={script.id}
              type="button"
              onClick={() => selectScript(script)}
              className={cn(
                "w-full rounded-2xl p-3 text-left transition",
                script.id === selectedId ? "bg-[#211f1b] text-white" : "hover:bg-[#f2ede4]",
              )}
            >
              <p className="line-clamp-2 text-sm font-bold leading-5">{script.title}</p>
              <p className={cn("mt-2 flex items-center gap-1 text-[11px]", script.id === selectedId ? "text-white/55" : "text-[#958c80]")}>
                <Clock3 className="size-3" /> {script.target_duration} 秒 · {versions.filter((version) => version.script_id === script.id).length} 个版本
              </p>
            </button>
          ))}
        </div>
      </aside>

      {showCreate ? (
        <form onSubmit={createDraft} className="paper rounded-3xl p-5 sm:p-7">
          <div className="mb-6">
            <p className="text-xs font-bold tracking-[.16em] text-[#f46f4c] uppercase">Rough Draft</p>
            <h2 className="mt-2 text-2xl font-black">先写下你自己的版本</h2>
            <p className="mt-2 text-sm leading-6 text-[#706b62]">不必完整，也不必漂亮。保存后它会成为不可覆盖的原始粗稿。</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px]">
            <div>
              <label htmlFor="script-title" className="mb-2 block text-sm font-bold">文案标题</label>
              <input id="script-title" className="field" value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} required />
            </div>
            <div>
              <label htmlFor="script-duration" className="mb-2 block text-sm font-bold">目标时长</label>
              <select id="script-duration" className="field" value={draft.targetDuration} onChange={(event) => setDraft({ ...draft, targetDuration: Number(event.target.value) })}>
                {[30, 45, 60, 90, 120, 180].map((value) => <option key={value} value={value}>{value} 秒</option>)}
              </select>
            </div>
          </div>
          <label htmlFor="script-topic" className="mb-2 mt-4 block text-sm font-bold">关联选题（可选）</label>
          <select id="script-topic" className="field" value={draft.topicId} onChange={(event) => setDraft({ ...draft, topicId: event.target.value })}>
            <option value="">不关联选题</option>
            {topics.map((topic) => <option key={topic.id} value={topic.id}>{topic.title}</option>)}
          </select>
          <label htmlFor="rough-draft" className="mb-2 mt-4 block text-sm font-bold">你的粗稿</label>
          <textarea
            id="rough-draft"
            className="field min-h-72 resize-y text-base leading-8"
            value={draft.content}
            onChange={(event) => setDraft({ ...draft, content: event.target.value })}
            placeholder={"不用追求完美，像真的在对镜头说话一样写下来……\n\n至少输入 10 个字。"}
            required
          />
          <div className="mt-2 text-right text-xs text-[#938a7f]">{draft.content.length} 字</div>
          {message ? <p className="mt-3 text-sm text-[#a44834]">{message}</p> : null}
          <button className="btn-primary mt-5" disabled={busy || draft.content.trim().length < 10}>
            <Save className="size-4" /> {busy ? "保存中…" : "保存原始粗稿"}
          </button>
          <button
            type="button"
            className="btn-secondary mt-5 ml-2"
            disabled={busy || !draft.topicId}
            onClick={() => void generateFromTopic()}
          >
            <Sparkles className="size-4" /> 从选题 AI 生成
          </button>
        </form>
      ) : selected ? (
        <section className="paper flex min-w-0 flex-col rounded-3xl p-5 sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-[#f46f4c]">当前编辑</p>
              <h2 className="mt-1 text-xl font-black">{selected.title}</h2>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                className="btn-secondary"
                onClick={async () => {
                  await navigator.clipboard.writeText(editor);
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 1200);
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? "已复制" : "复制"}
              </button>
              <button type="button" className="btn-danger" aria-label="删除文案" onClick={() => void removeScript()}><Trash2 className="size-4" /></button>
            </div>
          </div>
          <textarea
            className="mt-5 min-h-[410px] flex-1 resize-y rounded-2xl border border-[#e7e0d5] bg-white p-5 text-base leading-8 outline-none focus:border-[#ef8c72]"
            value={editor}
            onChange={(event) => setEditor(event.target.value)}
            aria-label="文案编辑器"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#92897e]">已自动保存工作区 · {editor.length} 字 · 约 {Math.max(1, Math.ceil(editor.length / 4))} 秒</p>
            <button type="button" className="btn-secondary" disabled={busy} onClick={() => void appendVersion("manual_edit")}>
              <Save className="size-4" /> 保存为新版本
            </button>
          </div>
          <ScriptOptimizationPanel
            className="mt-6"
            defaultDuration={defaultDuration}
            busy={busy}
            disabled={!sourceVersionId}
            onSubmit={optimize}
          />
          {message ? <p className="mt-4 text-sm text-[#9b503c]">{message}</p> : null}
        </section>
      ) : (
        <EmptyState title="还没有文案" description="点击“新建粗稿”，从你自己的表达开始。" />
      )}

      <aside className="paper rounded-3xl p-4">
        <div className="mb-4 flex items-center gap-2"><History className="size-4 text-[#f46f4c]" /><h2 className="font-black">版本历史</h2></div>
        {selectedVersions.length ? (
          <div className="max-h-[590px] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
            {selectedVersions.map((version) => (
              <article key={version.id} className={cn("rounded-2xl border p-4", sourceVersionId === version.id ? "border-[#f3a18c] bg-[#fff8f5]" : "border-[#e7e0d5] bg-white")}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => {
                    setEditor(version.content);
                    setSourceVersionId(version.id);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="rounded-full bg-[#f2ede4] px-2 py-1 text-[10px] font-black">{versionLabels[version.version_type]}</span>
                    <span className="text-[10px] text-[#998f83]">V{version.version_number}</span>
                  </div>
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-[#706b62]">{version.content}</p>
                  <p className="mt-3 text-[10px] text-[#a1988d]">{formatDate(version.created_at)}</p>
                </button>
                <button type="button" className="mt-3 flex items-center gap-1 text-[11px] font-bold text-[#e35f3f]" onClick={() => void appendVersion("restored", version.content)}>
                  <RotateCcw className="size-3" /> 恢复为新版本
                </button>
              </article>
            ))}
          </div>
        ) : <p className="text-sm text-[#8f867b]">选择文案后查看版本。</p>}
      </aside>
    </div>
  );
}
