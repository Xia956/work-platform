"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  ExternalLink,
  FileText,
  Lightbulb,
  Rocket,
  Search,
  Sparkles,
} from "lucide-react";
import { contentStages } from "@/lib/content-projects";
import type { ContentProject, ContentStage, ScriptVersion } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { LoginRequiredDialog } from "@/components/login-required-dialog";
import {
  GUEST_CONTENT_CHANGED_EVENT,
  guestContentToProject,
  readGuestContents,
  updateGuestContent,
} from "@/lib/guest-content";

const stageMeta: Record<ContentStage, { label: string; tone: string; icon: typeof Lightbulb }> = {
  idea: { label: "新灵感", tone: "bg-[#eee8dc] text-[#786443]", icon: Lightbulb },
  rough_draft: { label: "添加粗稿", tone: "bg-[#e9e6df] text-[#625d55]", icon: FileText },
  ai_optimized: { label: "AI 文案优化", tone: "bg-[#efe2dc] text-[#98513c]", icon: Sparkles },
  ready: { label: "待发布", tone: "bg-[#e1e9e1] text-[#526957]", icon: Rocket },
  published: { label: "已发布", tone: "bg-[#dde8e4] text-[#40655a]", icon: Check },
};

type LibraryFilter = "all" | "active" | ContentStage;

export function ContentLibrary({
  initialProjects,
  initialFilter = "all",
  guestMode = false,
}: {
  initialProjects: ContentProject[];
  initialFilter?: LibraryFilter;
  guestMode?: boolean;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialProjects[0]?.id ?? "");
  const [filter, setFilter] = useState<LibraryFilter>(initialFilter);
  const [query, setQuery] = useState("");
  const [mobileView, setMobileView] = useState<"library" | "project">("library");
  const [projects, setProjects] = useState(initialProjects);

  useEffect(() => {
    if (!guestMode) return;
    const sync = () => setProjects(readGuestContents().map(guestContentToProject));
    const frame = window.requestAnimationFrame(sync);
    window.addEventListener(GUEST_CONTENT_CHANGED_EVENT, sync);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener(GUEST_CONTENT_CHANGED_EVENT, sync);
    };
  }, [guestMode]);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStage =
        filter === "all" ||
        project.stage === filter ||
        (filter === "active" && (project.stage === "rough_draft" || project.stage === "ai_optimized"));
      const haystack = [
        project.title,
        project.inspiration?.content,
        project.topic?.angle,
        ...(project.inspiration?.tags ?? []),
        ...(project.topic?.keywords ?? []),
      ].join(" ").toLowerCase();
      return matchesStage && (!keyword || haystack.includes(keyword));
    });
  }, [projects, filter, query]);

  const selected = filtered.find((project) => project.id === selectedId) ?? filtered[0] ?? null;

  function refresh() {
    if (guestMode) {
      setProjects(readGuestContents().map(guestContentToProject));
    } else {
      router.refresh();
    }
  }

  function changeFilter(nextFilter: LibraryFilter) {
    setFilter(nextFilter);
    setMobileView("library");
    router.replace(nextFilter === "all" ? "/content" : `/content?stage=${nextFilter}`, { scroll: false });
  }

  return (
    <>
      {guestMode ? (
        <div className="mb-3 rounded-lg border border-[#dfcda7] bg-[#faf4e7] px-3 py-2.5 text-xs leading-5 text-[#6f5a35]">
          访客内容仅保存在当前设备。登录后可同步，并继续使用 AI、发布和复盘。
        </div>
      ) : null}
      <div className={cn("mb-3 flex flex-col gap-2 sm:mb-5 lg:flex-row lg:items-center lg:justify-between", mobileView === "project" && "hidden xl:flex")}>
        <div className="grid min-w-0 flex-1 grid-cols-[1fr_112px] gap-2">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="absolute left-3 top-3.5 size-4 text-[#91887d]" />
            <input
              className="field field-with-icon"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、正文或标签"
              aria-label="搜索内容"
            />
          </div>
          <div className="relative">
            <select
              className="field filter-select min-w-0 text-[13px]"
              value={filter}
              onChange={(event) => changeFilter(event.target.value as LibraryFilter)}
              aria-label="筛选内容状态"
            >
              <option value="all">全部</option>
              <option value="idea">新灵感</option>
              <option value="active">推进中</option>
              <option value="ready">待发布</option>
              <option value="published">已完成</option>
            </select>
            <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-[#81796e]" />
          </div>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_390px] xl:gap-5">
        <section className={cn(mobileView === "project" && "hidden xl:block")}>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold tracking-[0.12em] text-[#81796e] uppercase">
              {filtered.length} 个内容项目
            </p>
            <p className="text-xs text-[#91887d]">每条内容独立推进</p>
          </div>
          {filtered.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((project) => (
                <ContentCard
                  key={project.id}
                  project={project}
                  selected={selected?.id === project.id}
                  onSelect={() => {
                    setSelectedId(project.id);
                    setMobileView("project");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="paper rounded-lg px-5 py-7 text-center sm:px-6 sm:py-16">
              <div className="mx-auto grid size-11 place-items-center rounded-full bg-[#eee8df] text-[#9b654e]">
                <Lightbulb className="size-5" />
              </div>
              <h2 className="mt-4 font-semibold">这里还没有匹配的内容</h2>
              <p className="mt-2 text-sm text-[#7d756a]">新建一条内容，从选题灵感开始推进。</p>
            </div>
          )}
        </section>
        {selected ? (
          <aside className={cn("xl:sticky xl:top-8", mobileView === "library" && "hidden xl:block")}>
            <button
              type="button"
              className="btn-ghost mb-2 min-h-9 px-1 text-xs xl:hidden"
              onClick={() => setMobileView("library")}
            >
              ← 返回内容列表
            </button>
            <ProjectPanel
              key={`${selected.id}-${selected.updatedAt}`}
              project={selected}
              onChanged={refresh}
            />
          </aside>
        ) : null}
      </div>
    </>
  );
}

function ContentCard({
  project,
  selected,
  onSelect,
}: {
  project: ContentProject;
  selected: boolean;
  onSelect: () => void;
}) {
  const meta = stageMeta[project.stage];
  const Icon = meta.icon;
  const stageLabel =
    project.stage === "ai_optimized" &&
    !project.versions.some((version) => version.version_type === "ai_optimized")
      ? "文案打磨"
      : meta.label;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "paper group w-full rounded-lg p-4 text-left transition sm:p-5",
        selected ? "border-[#b9573a] shadow-[0_0_0_2px_rgb(185_87_58/10%)]" : "hover:border-[#bdb3a5] hover:bg-[#fffefa]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", meta.tone)}>
          <Icon className="size-3.5" /> {stageLabel}
        </span>
        <ChevronRight className="size-4 text-[#aaa196] transition group-hover:translate-x-0.5 group-hover:text-[#b9573a]" />
      </div>
      <h2 className="mt-3 line-clamp-2 text-[16px] font-semibold leading-5 sm:mt-4 sm:text-[17px] sm:leading-6">{project.title}</h2>
      <p className="mt-1.5 line-clamp-2 text-xs leading-5 text-[#756e64] sm:mt-2 sm:min-h-10">
        {project.topic?.angle ?? project.inspiration?.content ?? project.script?.autosave_content ?? "打开内容项目继续完善"}
      </p>
      <div className="mt-3 sm:mt-5">
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="text-[#827a70]">单条内容进度</span>
          <span className="font-semibold text-[#9d5038]">{project.progress}%</span>
        </div>
        <div className="progress-track">
          <div className="progress-value" style={{ width: `${project.progress}%` }} />
        </div>
      </div>
      <p className="mt-2 hidden items-center gap-1 text-[10px] text-[#938b80] sm:flex">
        <Clock3 className="size-3" /> 最近更新 {formatDate(project.updatedAt)}
      </p>
    </button>
  );
}

function ProjectPanel({
  project,
  onChanged,
}: {
  project: ContentProject;
  onChanged: () => void;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const currentVersion =
    project.versions.find((version) => version.id === project.script?.current_version_id) ??
    project.versions[0] ??
    null;
  const [editor, setEditor] = useState(project.script?.autosave_content || currentVersion?.content || "");
  const [draft, setDraft] = useState("");
  const [ideaDetail, setIdeaDetail] = useState(project.inspiration?.content ?? "");
  const [optimizeType, setOptimizeType] = useState("hook");
  const [loginReason, setLoginReason] = useState("");
  const guestId = project.guestId;

  async function request(url: string, init: RequestInit) {
    setBusy(true);
    setMessage("");
    const response = await fetch(url, init);
    const result = await response.json();
    setBusy(false);
    if (!response.ok) {
      setMessage(result.error ?? "操作失败，请稍后重试");
      return null;
    }
    onChanged();
    return result;
  }

  async function convert() {
    if (!project.inspiration) return;
    if (project.isGuest && guestId) {
      updateGuestContent(guestId, {
        idea: ideaDetail.trim() || project.inspiration.content,
        direction: ideaDetail.trim() || project.inspiration.content || project.title,
      });
      setMessage("已开始推进，可以继续补充粗稿");
      onChanged();
      return;
    }
    if (ideaDetail.trim() !== project.inspiration.content) {
      const updated = await request("/api/data/inspirations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: project.inspiration.id,
          data: { content: ideaDetail.trim(), status: "developing" },
        }),
      });
      if (!updated) return;
    }
    const result = await request(`/api/inspirations/${project.inspiration.id}/convert`, { method: "POST" });
    if (result) setMessage("已开始推进，现在可以继续补充粗稿");
  }

  async function createDraft(event: FormEvent) {
    event.preventDefault();
    if (project.isGuest && guestId) {
      updateGuestContent(guestId, { draft: draft.trim(), stage: "rough_draft" });
      setMessage("粗稿已保存在当前设备");
      onChanged();
      return;
    }
    const result = await request("/api/scripts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        title: project.title,
        topicId: project.topic?.id ?? null,
        content: draft,
        targetDuration: 60,
      }),
    });
    if (result) setMessage("粗稿已加入当前内容");
  }

  async function saveVersion() {
    if (!project.script) return;
    if (project.isGuest && guestId) {
      updateGuestContent(guestId, { draft: editor.trim(), stage: "ai_optimized" });
      setMessage("修改已保存在当前设备");
      onChanged();
      return;
    }
    const result = await request("/api/scripts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "append",
        scriptId: project.script.id,
        sourceVersionId: currentVersion?.id ?? null,
        content: editor,
        versionType: "manual_edit",
      }),
    });
    if (result) setMessage("已保存为新版本");
  }

  async function optimize() {
    if (project.isGuest) {
      setLoginReason("AI 文案优化需要登录，用于保护调用额度并保存不同版本。");
      return;
    }
    if (!project.script || !currentVersion) return;
    let sourceVersion: ScriptVersion = currentVersion;
    if (editor.trim() && editor !== currentVersion.content) {
      const saved = await request("/api/scripts", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "append",
          scriptId: project.script.id,
          sourceVersionId: currentVersion.id,
          content: editor,
          versionType: "manual_edit",
        }),
      });
      if (!saved) return;
      sourceVersion = saved.data;
    }
    const result = await request("/api/ai/scripts/optimize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scriptId: project.script.id,
        sourceVersionId: sourceVersion.id,
        optimizationType: optimizeType,
        instruction: "",
      }),
    });
    if (result) {
      setEditor(result.data.content);
      setMessage("AI 优化版本已保存，原稿仍然保留");
    }
  }

  async function updateStatus(status: "ready" | "drafting") {
    if (!project.script) return;
    if (project.isGuest && guestId) {
      updateGuestContent(guestId, {
        draft: editor.trim(),
        stage: status === "ready" ? "ready" : "ai_optimized",
      });
      setMessage(status === "ready" ? "已移入待发布" : "已退回继续打磨");
      onChanged();
      return;
    }
    const result = await request("/api/scripts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "updateStatus", scriptId: project.script.id, status }),
    });
    if (result) setMessage(status === "ready" ? "已移入待发布" : "已退回继续打磨");
  }

  return (
    <div className="paper overflow-hidden rounded-lg">
      <div className="border-b border-[#ddd5c9] bg-[#f8f4ed] p-4 sm:p-5">
        <p className="text-[10px] font-semibold tracking-[.16em] text-[#a84f35] uppercase">Current project</p>
        <h2 className="mt-1.5 text-lg font-semibold leading-6 sm:mt-2 sm:text-xl sm:leading-7">{project.title}</h2>
        <div className="mt-3 grid grid-cols-5 gap-1 sm:mt-5" aria-label={`当前进度 ${project.progress}%`}>
          {contentStages.map((stage, index) => (
            <div key={stage.value} className="min-w-0">
              <div className={cn("h-1 rounded-full", index <= project.stageIndex ? "bg-[#b9573a]" : "bg-[#ddd5c9]")} />
              <p className={cn("mt-2 truncate text-[9px]", index === project.stageIndex ? "font-semibold text-[#8f432f]" : "text-[#92897e]")}>
                {stage.label.replace("AI ", "AI")}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
        <StageSummary project={project} />

        {!project.topic && project.inspiration ? (
          <div className="rounded-lg border border-[#e4d8cb] bg-[#faf6ef] p-3.5">
            <label htmlFor="content-idea-detail" className="text-sm font-semibold">准备推进时，再补充一点</label>
            <p className="mt-1 text-[11px] leading-5 text-[#81796e]">可以写下想表达的方向，也可以先留空，进入下一步后再慢慢完善。</p>
            <textarea
              id="content-idea-detail"
              className="field mt-3 min-h-24 resize-y leading-6"
              value={ideaDetail}
              onChange={(event) => setIdeaDetail(event.target.value)}
              placeholder="这条内容具体想表达什么？"
              maxLength={5000}
            />
            <button type="button" className="btn-primary mt-3 w-full" disabled={busy} onClick={() => void convert()}>
              开始推进 <ArrowRight className="size-4" />
            </button>
          </div>
        ) : null}

        {project.topic && !project.script ? (
          <form onSubmit={createDraft}>
            <label htmlFor="content-rough-draft" className="mb-2 block text-sm font-semibold">添加粗稿</label>
            <textarea
              id="content-rough-draft"
              className="field min-h-32 resize-y leading-7 sm:min-h-40"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="像对着镜头说话一样，先写下真实表达……"
              required
            />
            <button className="btn-primary mt-3 w-full" disabled={busy || draft.trim().length < 10}>
              <FileText className="size-4" /> 保存粗稿并进入文案阶段
            </button>
          </form>
        ) : null}

        {project.script && project.stage !== "published" ? (
          <>
            <div>
              <label htmlFor="content-editor" className="mb-2 block text-sm font-semibold">当前文案</label>
              <textarea
                id="content-editor"
                className="field min-h-48 resize-y leading-7 sm:min-h-64"
                value={editor}
                onChange={(event) => setEditor(event.target.value)}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#8a8277]">{editor.length} 字 · {project.versions.length} 个版本</span>
                <button type="button" className="btn-secondary min-h-9 py-1 text-xs" disabled={busy} onClick={() => void saveVersion()}>
                  保存版本
                </button>
              </div>
            </div>

            <div className="rounded-lg border border-[#ead2c8] bg-[#fff8f4] p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><Bot className="size-4 text-[#b9573a]" /> AI 文案优化</p>
              <select className="field mt-3" value={optimizeType} onChange={(event) => setOptimizeType(event.target.value)}>
                <option value="hook">增强开头钩子</option>
                <option value="concise">精简表达</option>
                <option value="conversational">增强口语感</option>
                <option value="rhythm">调整节奏</option>
                <option value="cta">重写结尾 CTA</option>
              </select>
              <button type="button" className="btn-primary mt-3 w-full" disabled={busy || !currentVersion} onClick={() => void optimize()}>
                <Sparkles className="size-4" /> 生成独立优化版本
              </button>
            </div>

            {project.stage === "ready" && project.script?.current_version_id ? (
              project.isGuest ? (
                <button
                  type="button"
                  className="btn-primary w-full"
                  onClick={() => setLoginReason("正式发布和数据复盘需要登录，以便关联文案版本并持续保存数据。")}
                >
                  标记为已发布 <ArrowRight className="size-4" />
                </button>
              ) : (
                <Link
                  href={`/publications?script=${project.script.id}&version=${project.script.current_version_id}`}
                  className="btn-primary w-full"
                >
                  标记为已发布 <ArrowRight className="size-4" />
                </Link>
              )
            ) : (
              project.stage !== "ready" ? (
                <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void updateStatus("ready")}>
                  <Rocket className="size-4" /> 文案已定稿，移入待发布
                </button>
              ) : null
            )}
            {project.stage === "ready" ? (
              <button type="button" className="btn-ghost w-full text-xs" disabled={busy} onClick={() => void updateStatus("drafting")}>
                退回继续打磨
              </button>
            ) : null}
          </>
        ) : null}

        {project.stage === "published" ? (
          <div className="rounded-lg bg-[#e7eee9] p-4 text-sm text-[#4c6456]">
            <p className="font-semibold">这条内容已发布</p>
            {project.publication ? (
              <div className="mt-2 space-y-1.5 text-xs">
                <p className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" /> {formatDate(project.publication.published_at)}
                </p>
                {project.publication.video_url ? (
                  <a
                    href={project.publication.video_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 font-semibold underline underline-offset-2"
                  >
                    查看发布视频 <ExternalLink className="size-3.5" />
                  </a>
                ) : null}
              </div>
            ) : null}
            <p className="mt-2 leading-6">
              {project.snapshots.length ? `已有 ${project.snapshots.length} 次数据快照，可前往复盘查看表现。` : "还没有数据快照，建议发布后及时记录表现。"}
            </p>
          </div>
        ) : null}

        {message ? <p className="text-sm leading-6 text-[#9a4d38]">{message}</p> : null}
      </div>
      <LoginRequiredDialog
        open={Boolean(loginReason)}
        reason={loginReason}
        nextPath="/content"
        onClose={() => setLoginReason("")}
      />
    </div>
  );
}

function StageSummary({ project }: { project: ContentProject }) {
  return (
    <div className="space-y-3 text-sm">
      {project.inspiration ? (
        <div className="rounded-lg bg-[#f3efe7] p-3">
          <p className="text-[10px] font-semibold tracking-[.12em] text-[#8e8274] uppercase">灵感原点</p>
          <p className="mt-1 line-clamp-3 leading-6">{project.inspiration.content || project.inspiration.title}</p>
        </div>
      ) : null}
      {project.topic ? (
        <div>
          <p className="text-[10px] font-semibold tracking-[.12em] text-[#8e8274] uppercase">选题切口</p>
          <p className="mt-1 leading-6">{project.topic.angle || "选题已确认，可继续补充粗稿。"}</p>
        </div>
      ) : null}
    </div>
  );
}
