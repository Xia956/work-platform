"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FilePenLine, Lightbulb, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createGuestContent,
  createGuestIdea,
  guestStats,
  readGuestContents,
} from "@/lib/guest-content";

type CreateMode = "idea" | "content" | null;

interface DashboardStats {
  ideas: number;
  active: number;
  ready: number;
  completed: number;
}

async function postJson(url: string, body?: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "保存失败，请稍后重试");
  return result;
}

export function DashboardWorkbench({
  stats,
  canWrite,
  guestMode,
}: {
  stats: DashboardStats;
  canWrite: boolean;
  guestMode: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<CreateMode>(null);
  const [idea, setIdea] = useState("");
  const [contentForm, setContentForm] = useState({ title: "", direction: "", draft: "" });
  const [contentProgress, setContentProgress] = useState<{ inspirationId?: string; topicId?: string }>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [visibleStats, setVisibleStats] = useState(stats);

  const statCards = [
    { label: "新灵感", value: visibleStats.ideas, href: "/content?stage=idea" },
    { label: "推进中", value: visibleStats.active, href: "/content?stage=active" },
    { label: "待发布", value: visibleStats.ready, href: "/content?stage=ready" },
    { label: "已完成", value: visibleStats.completed, href: "/content?stage=published" },
  ];

  useEffect(() => {
    if (!guestMode) return;
    const frame = window.requestAnimationFrame(() => {
      setVisibleStats(guestStats(readGuestContents()));
    });
    return () => window.cancelAnimationFrame(frame);
  }, [guestMode]);

  function open(nextMode: Exclude<CreateMode, null>) {
    setMode(nextMode);
    setMessage("");
  }

  async function saveIdea(event: FormEvent) {
    event.preventDefault();
    if (guestMode) {
      createGuestIdea(idea);
      setIdea("");
      setVisibleStats(guestStats(readGuestContents()));
      setMessage("灵感已保存在当前设备，可以去内容库开始推进。");
      return;
    }
    if (!canWrite) {
      setMessage("当前是本地预览模式，不会写入真实数据；恢复登录后即可保存。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await postJson("/api/data/inspirations", {
        title: idea.trim(),
        content: "",
        tags: [],
        status: "inbox",
      });
      setIdea("");
      setMessage("灵感已记下，可以去内容库开始推进。");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存失败，请稍后重试");
    } finally {
      setBusy(false);
    }
  }

  async function createContent(event: FormEvent) {
    event.preventDefault();
    if (guestMode) {
      createGuestContent(contentForm);
      setContentForm({ title: "", direction: "", draft: "" });
      setVisibleStats(guestStats(readGuestContents()));
      setMessage("内容和粗稿已保存在当前设备，登录后可以同步到云端。");
      return;
    }
    if (!canWrite) {
      setMessage("当前是本地预览模式，不会写入真实数据；恢复登录后即可保存。");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      let inspirationId = contentProgress.inspirationId;
      let topicId = contentProgress.topicId;

      if (!inspirationId) {
        const inspiration = await postJson("/api/data/inspirations", {
          title: contentForm.title,
          content: contentForm.direction,
          tags: [],
          status: "inbox",
        });
        inspirationId = inspiration.data.id;
        setContentProgress({ inspirationId });
      }

      if (!topicId) {
        const topic = await postJson(`/api/inspirations/${inspirationId}/convert`);
        topicId = topic.data.id;
        setContentProgress({ inspirationId, topicId });
      }

      await postJson("/api/scripts", {
        title: contentForm.title,
        topicId,
        content: contentForm.draft,
        targetDuration: 60,
      });
      setContentForm({ title: "", direction: "", draft: "" });
      setContentProgress({});
      setMessage("内容项目已建立，粗稿也保存好了。");
      router.refresh();
    } catch (error) {
      setMessage(
        `${error instanceof Error ? error.message : "保存失败，请稍后重试"}。已经完成的步骤已保留，再次提交会从这里继续。`,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5 sm:mb-8">
        <p className="text-[10px] font-semibold tracking-[0.2em] text-[#9c4b35] uppercase">Creator desk</p>
        <h1 className="editorial-title mt-1.5 text-[30px] leading-tight sm:text-[42px]">今天想创作什么？</h1>
        <p className="mt-1.5 text-[13px] text-[#746e65] sm:text-[15px]">先抓住一闪而过的念头，或者坐下来认真写一条。</p>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:gap-4" aria-label="新建入口">
        <button
          type="button"
          onClick={() => open("idea")}
          className="group min-h-32 rounded-[18px] bg-[#a6533b] p-4 text-left text-white shadow-[0_10px_26px_rgb(112_57_41/16%)] transition hover:-translate-y-0.5 sm:min-h-40 sm:p-5"
        >
          <span className="grid size-9 place-items-center rounded-full bg-white/15">
            <Lightbulb className="size-[18px]" strokeWidth={1.8} />
          </span>
          <p className="mt-4 text-[15px] font-semibold sm:text-lg">灵感来了</p>
          <p className="mt-1 text-[11px] leading-4 text-[#f2d8cf] sm:text-xs">速速记下，之后再展开</p>
        </button>
        <button
          type="button"
          onClick={() => open("content")}
          className="paper group min-h-32 rounded-[18px] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#bcae9f] sm:min-h-40 sm:p-5"
        >
          <span className="grid size-9 place-items-center rounded-full bg-[#e9e2d8] text-[#5e584f]">
            <FilePenLine className="size-[18px]" strokeWidth={1.8} />
          </span>
          <p className="mt-4 text-[15px] font-semibold sm:text-lg">新建内容</p>
          <p className="mt-1 text-[11px] leading-4 text-[#7d756a] sm:text-xs">整理方向，写下具体粗稿</p>
        </button>
      </section>

      {mode ? (
        <section className="paper mt-3 rounded-[18px] p-4 sm:mt-4 sm:p-5" aria-label={mode === "idea" ? "速记灵感" : "新建内容"}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold">{mode === "idea" ? "先记下一句话" : "建立一条完整内容"}</p>
              <p className="mt-1 text-[11px] leading-4 text-[#81796e]">
                {mode === "idea" ? "不用想标题，也不用现在展开。" : "写下标题、表达方向和第一版粗稿。"}
              </p>
            </div>
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-full text-[#81796e] hover:bg-[#eee8df]"
              onClick={() => setMode(null)}
              aria-label="关闭"
            >
              <X className="size-4" />
            </button>
          </div>

          {mode === "idea" ? (
            <form onSubmit={saveIdea} className="mt-4">
              <textarea
                className="field min-h-24 resize-none text-[15px] leading-6"
                value={idea}
                onChange={(event) => setIdea(event.target.value)}
                maxLength={120}
                placeholder="刚刚想到……"
                autoFocus
                required
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-[11px] text-[#91887d]">{idea.length}/120</span>
                <button className="btn-primary" disabled={busy || !idea.trim()}>
                  <Plus className="size-4" /> {busy ? "保存中…" : "记下灵感"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={createContent} className="mt-4 space-y-3">
              <input
                className="field"
                value={contentForm.title}
                onChange={(event) => setContentForm({ ...contentForm, title: event.target.value })}
                placeholder="内容标题"
                maxLength={120}
                required
              />
              <textarea
                className="field min-h-20 resize-y leading-6"
                value={contentForm.direction}
                onChange={(event) => setContentForm({ ...contentForm, direction: event.target.value })}
                placeholder="这条内容具体想表达什么？"
                maxLength={500}
                required
              />
              <textarea
                className="field min-h-36 resize-y leading-7"
                value={contentForm.draft}
                onChange={(event) => setContentForm({ ...contentForm, draft: event.target.value })}
                placeholder="先写下第一版粗稿，不用追求完美……"
                maxLength={20000}
                required
              />
              <button className="btn-primary w-full" disabled={busy || contentForm.draft.trim().length < 10}>
                <FilePenLine className="size-4" /> {busy ? "创建中…" : "保存内容和粗稿"}
              </button>
            </form>
          )}

          {message ? (
            <div className={cn("mt-3 rounded-lg px-3 py-2.5 text-xs leading-5", message.includes("已") ? "bg-[#e8eee8] text-[#526458]" : "bg-[#f8eee8] text-[#93503b]")}>
              {message}
              {message.includes("可以去内容库") ? (
                <Link href="/content" className="ml-1 inline-flex items-center gap-0.5 font-semibold">
                  去推进 <ArrowRight className="size-3" />
                </Link>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="mt-5 sm:mt-8">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="text-sm font-semibold">内容进度</h2>
          <Link href="/content" className="flex items-center gap-1 text-xs text-[#8f4b37]">
            查看内容库 <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="paper grid grid-cols-2 overflow-hidden rounded-[18px]">
          {statCards.map((card, index) => (
            <Link
              key={card.label}
              href={card.href}
              className={cn(
                "flex min-h-24 items-end justify-between p-4 transition hover:bg-[#f7f2ea] sm:min-h-32 sm:p-5",
                index % 2 === 0 && "border-r border-[#d9d1c5]",
                index < 2 && "border-b border-[#d9d1c5]",
              )}
            >
              <span className="text-xs font-medium text-[#756e64] sm:text-sm">{card.label}</span>
              <span className="editorial-title text-[36px] leading-none text-[#302d28] sm:text-5xl">{card.value}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
