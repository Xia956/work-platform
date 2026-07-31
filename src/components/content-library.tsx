"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Hash,
  Lightbulb,
  Rocket,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { advanceProjectToDraft, contentStages } from "@/lib/content-projects";
import type { ContentProject, ContentStage, ScriptVersion, Topic } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";
import { ContentTagPicker } from "@/components/content-tag-picker";
import { LoginRequiredDialog } from "@/components/login-required-dialog";
import { ScriptOptimizationPanel } from "@/components/script-optimization-panel";
import {
  createDefaultOptimizationOptions,
  readOptimizationSummary,
  type ScriptOptimizationOptions,
} from "@/lib/script-ai";
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

const versionLabels: Record<ScriptVersion["version_type"], string> = {
  rough_draft: "原始粗稿",
  manual_edit: "手动修改",
  ai_generated: "AI 生成",
  ai_optimized: "AI 优化",
  restored: "恢复版本",
};

function LibraryFilterMenu<T extends string>({
  value,
  options,
  label,
  showHash = false,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  label: string;
  showHash?: boolean;
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function closeOnPointerDown(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnPointerDown);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnPointerDown);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <div className="relative min-w-0" ref={root}>
      <button
        type="button"
        className="field flex min-w-0 items-center justify-between gap-2 text-left text-[13px]"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-2">
          {showHash ? <Hash className="size-3.5 shrink-0 text-[#91887d]" /> : null}
          <span className="truncate">{selected.label}</span>
        </span>
        <ChevronDown
          className={cn("size-3.5 shrink-0 text-[#81796e] transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className="absolute z-30 mt-1.5 max-h-64 w-full min-w-max overflow-y-auto rounded-lg border border-[#d2c9bc] bg-[#fffefa] p-1.5 shadow-[0_12px_30px_rgb(55_46_35/16%)]"
        >
          {options.map((option) => {
            const isSelected = option.value === value;
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-[12px] transition-colors",
                  isSelected
                    ? "bg-[#f3e6df] font-semibold text-[#91452f]"
                    : "text-[#5f5951] hover:bg-[#f5f0e8]",
                )}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                <span>{option.label}</span>
                {isSelected ? <Check className="size-3.5" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function ContentLibrary({
  initialProjects,
  initialFilter = "all",
  guestMode = false,
  defaultDuration = 60,
}: {
  initialProjects: ContentProject[];
  initialFilter?: LibraryFilter;
  guestMode?: boolean;
  defaultDuration?: number;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(initialProjects[0]?.id ?? "");
  const [filter, setFilter] = useState<LibraryFilter>(initialFilter);
  const [selectedTag, setSelectedTag] = useState("all");
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

  const availableTags = useMemo(
    () => [...new Set(
      projects.flatMap((project) => project.inspiration?.tags ?? []),
    )].sort((a, b) => a.localeCompare(b, "zh-CN")),
    [projects],
  );

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesStage =
        filter === "all" ||
        project.stage === filter ||
        (filter === "active" && (project.stage === "rough_draft" || project.stage === "ai_optimized"));
      const matchesTag =
        selectedTag === "all" ||
        project.inspiration?.tags.some((tag) => tag === selectedTag);
      const haystack = [
        project.title,
        project.inspiration?.content,
        project.topic?.angle,
        ...(project.inspiration?.tags ?? []),
        ...(project.topic?.keywords ?? []),
      ].join(" ").toLowerCase();
      return matchesStage && matchesTag && (!keyword || haystack.includes(keyword));
    });
  }, [projects, filter, query, selectedTag]);

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

  function showDraftStep(nextProject: ContentProject) {
    setProjects((current) =>
      current.map((project) => project.id === nextProject.id ? nextProject : project),
    );
    setSelectedId(nextProject.id);
    setFilter("all");
    setMobileView("project");
    router.replace("/content", { scroll: false });
  }

  return (
    <>
      {guestMode ? (
        <div className="mb-3 rounded-lg border border-[#dfcda7] bg-[#faf4e7] px-3 py-2.5 text-xs leading-5 text-[#6f5a35]">
          访客内容仅保存在当前设备。登录后可同步，并继续使用 AI、发布和复盘。
        </div>
      ) : null}
      <div className={cn("mb-3 flex flex-col gap-2 sm:mb-5 lg:flex-row lg:items-center lg:justify-between", mobileView === "project" && "hidden xl:flex")}>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 lg:grid-cols-[minmax(0,1fr)_112px_140px]">
          <div className="relative col-span-2 min-w-0 flex-1 lg:col-span-1 lg:max-w-md">
            <Search className="absolute left-3 top-3.5 size-4 text-[#91887d]" />
            <input
              className="field field-with-icon"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、正文或标签"
              aria-label="搜索内容"
            />
          </div>
          <LibraryFilterMenu
            value={filter}
            label="筛选内容状态"
            options={[
              { value: "all", label: "全部" },
              { value: "idea", label: "新灵感" },
              { value: "active", label: "推进中" },
              { value: "ready", label: "待发布" },
              { value: "published", label: "已完成" },
            ]}
            onChange={changeFilter}
          />
          <LibraryFilterMenu
            value={selectedTag}
            label="按标签筛选内容"
            showHash
            options={[
              { value: "all", label: "全部标签" },
              ...availableTags.map((tag) => ({ value: tag, label: tag })),
            ]}
            onChange={(nextTag) => {
              setSelectedTag(nextTag);
              setMobileView("library");
            }}
          />
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
              onAdvanced={showDraftStep}
              defaultDuration={defaultDuration}
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
  const tags = project.inspiration?.tags ?? [];
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
      {tags.length ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded-full bg-[#f0e9df] px-2 py-1 text-[10px] font-medium text-[#796557]">
              #{tag}
            </span>
          ))}
          {tags.length > 3 ? (
            <span className="px-1 py-1 text-[10px] text-[#938b80]">+{tags.length - 3}</span>
          ) : null}
        </div>
      ) : null}
      <div className="mt-3 sm:mt-5">
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="text-[#827a70]">内容进度</span>
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
  onAdvanced,
  defaultDuration,
}: {
  project: ContentProject;
  onChanged: () => void;
  onAdvanced: (project: ContentProject) => void;
  defaultDuration: number;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState(project.versions);
  const [currentVersionId, setCurrentVersionId] = useState(project.script?.current_version_id ?? null);
  const currentVersion =
    versions.find((version) => version.id === currentVersionId) ??
    versions[0] ??
    null;
  const aiVersions = useMemo(
    () => versions
      .filter((version) => version.version_type === "ai_optimized")
      .sort((a, b) => a.version_number - b.version_number),
    [versions],
  );
  const [selectedAiVersionId, setSelectedAiVersionId] = useState(
    () => [...project.versions]
      .filter((version) => version.version_type === "ai_optimized")
      .sort((a, b) => b.version_number - a.version_number)[0]?.id ?? null,
  );
  const selectedAiVersion =
    aiVersions.find((version) => version.id === selectedAiVersionId) ??
    aiVersions.at(-1) ??
    null;
  const selectedAiIndex = selectedAiVersion
    ? aiVersions.findIndex((version) => version.id === selectedAiVersion.id)
    : -1;
  const [editor, setEditor] = useState(project.script?.autosave_content || currentVersion?.content || "");
  const [draft, setDraft] = useState("");
  const [aiVersionMenuOpen, setAiVersionMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [optimizationOptions, setOptimizationOptions] = useState<ScriptOptimizationOptions>(
    () => createDefaultOptimizationOptions(defaultDuration),
  );
  const [tags, setTags] = useState(project.inspiration?.tags ?? []);
  const [workflowStage, setWorkflowStage] = useState<ContentStage>(project.stage);
  const [loginReason, setLoginReason] = useState("");
  const guestId = project.guestId;
  const workflowStageIndex = contentStages.findIndex((stage) => stage.value === workflowStage);
  const previousStage = workflowStageIndex > 0 ? contentStages[workflowStageIndex - 1] : null;

  function canMoveToStage(stage: ContentStage) {
    if (!project.inspiration) return false;
    if (stage === "idea") return true;
    if (stage === "rough_draft") return Boolean(project.topic || project.script);
    if (stage === "ai_optimized") return Boolean(project.script);
    if (stage === "ready") return Boolean(project.script && currentVersionId);
    return Boolean(project.publication);
  }

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
      const updated = updateGuestContent(guestId, {
        direction: project.inspiration.content || project.title,
        stage: "rough_draft",
      });
      if (updated) onAdvanced(guestContentToProject(updated));
      return;
    }
    const result = await request(`/api/inspirations/${project.inspiration.id}/convert`, { method: "POST" });
    if (result) {
      onAdvanced(advanceProjectToDraft(
        project,
        result.data as Topic,
      ));
    }
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

  async function saveTags(nextTags: string[]) {
    if (!project.inspiration) return;
    const previousTags = tags;
    setTags(nextTags);

    if (project.isGuest && guestId) {
      updateGuestContent(guestId, { tags: nextTags });
      setMessage("标签已保存在当前设备");
      onChanged();
      return;
    }

    const result = await request("/api/data/inspirations", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: project.inspiration.id,
        data: { tags: nextTags },
      }),
    });
    if (result) {
      setMessage("标签已保存");
    } else {
      setTags(previousTags);
    }
  }

  async function saveVersion() {
    if (!project.script) return;
    if (project.isGuest && guestId) {
      updateGuestContent(guestId, { draft: editor.trim(), stage: "ai_optimized" });
      setWorkflowStage("ai_optimized");
      setMessage("粗稿已保存在当前设备");
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
    if (result) {
      setVersions((current) => [result.data, ...current]);
      setCurrentVersionId(result.data.id);
      setEditor(result.data.content);
      setWorkflowStage("ai_optimized");
      setMessage("粗稿已保存");
    }
  }

  async function optimize(options: ScriptOptimizationOptions, sourceOverride?: ScriptVersion) {
    if (project.isGuest) {
      setLoginReason("AI 文案优化需要登录，用于保护调用额度并保存不同版本。");
      return;
    }
    if (!project.script || (!currentVersion && !sourceOverride)) return;
    let sourceVersion = sourceOverride ?? currentVersion!;
    if (!sourceOverride && editor.trim() && editor !== currentVersion?.content) {
      const saved = await request("/api/scripts", {
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
      if (!saved) return;
      sourceVersion = saved.data;
      setVersions((current) => [saved.data, ...current]);
      setCurrentVersionId(saved.data.id);
      setEditor(saved.data.content);
    }
    const result = await request("/api/ai/scripts/optimize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scriptId: project.script.id,
        sourceVersionId: sourceVersion.id,
        applyResult: false,
        ...options,
      }),
    });
    if (result) {
      setVersions((current) => [result.data, ...current]);
      setSelectedAiVersionId(result.data.id);
      setWorkflowStage("ai_optimized");
      setMessage("AI 优化稿已生成，原始粗稿未改动");
    }
  }

  async function applyAiVersion() {
    if (!project.script || !selectedAiVersion || project.isGuest) return;
    const result = await request("/api/scripts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "applyVersion",
        scriptId: project.script.id,
        versionId: selectedAiVersion.id,
      }),
    });
    if (result) {
      setCurrentVersionId(selectedAiVersion.id);
      setEditor(selectedAiVersion.content);
      setWorkflowStage("ai_optimized");
      setMessage(`已将 V${selectedAiVersion.version_number} 应用为当前文案，原始粗稿和历史版本仍保留`);
    }
  }

  async function copyAiVersion() {
    if (!selectedAiVersion) return;
    await navigator.clipboard.writeText(selectedAiVersion.content);
    setCopied(true);
    setMessage("AI 优化稿已复制");
    window.setTimeout(() => setCopied(false), 1500);
  }

  async function deleteAiVersion() {
    if (!selectedAiVersion || project.isGuest) return;
    const deletedIndex = selectedAiIndex;
    const result = await request(`/api/scripts?versionId=${selectedAiVersion.id}`, { method: "DELETE" });
    if (!result) return;
    const remaining = aiVersions.filter((version) => version.id !== selectedAiVersion.id);
    setVersions((current) => current.filter((version) => version.id !== selectedAiVersion.id));
    if (result.data) {
      setVersions((current) => [result.data, ...current]);
      setCurrentVersionId(result.data.id);
      setEditor(result.data.content);
    }
    setSelectedAiVersionId(remaining[Math.min(deletedIndex, remaining.length - 1)]?.id ?? null);
    setMessage("当前 AI 版本已删除，其他版本和原始粗稿未受影响");
  }

  async function changeWorkflowStage(nextStage: ContentStage) {
    if (!project.inspiration || !canMoveToStage(nextStage) || nextStage === workflowStage) return;

    if (project.isGuest && guestId) {
      if (nextStage === "published") return;
      updateGuestContent(guestId, {
        draft: editor.trim(),
        stage: nextStage,
      });
      setWorkflowStage(nextStage);
      setMessage(`已切换到“${contentStages.find((stage) => stage.value === nextStage)?.label}”，已有内容仍然保留`);
      onChanged();
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      if (project.script) {
        const scriptStatus =
          nextStage === "ready"
            ? "ready"
            : nextStage === "published"
              ? "published"
              : "drafting";
        if (project.script.status !== scriptStatus) {
          const scriptResponse = await fetch("/api/scripts", {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              action: "updateStatus",
              scriptId: project.script.id,
              status: scriptStatus,
            }),
          });
          const scriptResult = await scriptResponse.json();
          if (!scriptResponse.ok) throw new Error(scriptResult.error ?? "内容状态更新失败");
        }
      }

      const response = await fetch("/api/data/inspirations", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: project.inspiration.id,
          data: { workflow_stage: nextStage },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "内容阶段更新失败");

      setWorkflowStage(nextStage);
      setMessage(`已切换到“${contentStages.find((stage) => stage.value === nextStage)?.label}”，已有内容仍然保留`);
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "内容阶段更新失败");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="paper overflow-hidden rounded-lg">
      <div className="border-b border-[#ddd5c9] bg-[#f8f4ed] p-4 sm:p-5">
        <p className="text-[10px] font-semibold tracking-[.16em] text-[#a84f35] uppercase">Current project</p>
        <h2 className="mt-1.5 text-lg font-semibold leading-6 sm:mt-2 sm:text-xl sm:leading-7">{project.title}</h2>
        <div className="mt-3 grid grid-cols-5 gap-1 sm:mt-5" aria-label={`当前进度 ${(workflowStageIndex + 1) * 20}%`}>
          {contentStages.map((stage, index) => (
            <button
              key={stage.value}
              type="button"
              className="group min-w-0 text-left disabled:cursor-not-allowed"
              disabled={busy || !canMoveToStage(stage.value)}
              aria-label={`切换到${stage.label}`}
              aria-current={index === workflowStageIndex ? "step" : undefined}
              onClick={() => void changeWorkflowStage(stage.value)}
            >
              <span
                className={cn(
                  "block h-1 rounded-full transition-colors",
                  index <= workflowStageIndex ? "bg-[#b9573a]" : "bg-[#ddd5c9]",
                  canMoveToStage(stage.value) && index !== workflowStageIndex && "group-hover:bg-[#c99a88]",
                )}
              />
              <span className={cn("mt-2 block truncate text-[9px]", index === workflowStageIndex ? "font-semibold text-[#8f432f]" : "text-[#92897e]")}>
                {stage.label.replace("AI ", "AI")}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 p-4 sm:space-y-5 sm:p-5">
        {project.inspiration ? (
          <div>
            {tags.length ? (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#f0e9df] px-2.5 py-1 text-[11px] font-medium text-[#796557]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}
            <ContentTagPicker
              value={tags}
              onChange={(nextTags) => void saveTags(nextTags)}
              collapsedLabel={tags.length ? "编辑标签" : "+ 添加标签"}
              defaultExpanded={false}
              disabled={busy}
            />
          </div>
        ) : null}

        {workflowStage === "idea" && project.inspiration ? (
          project.topic ? (
            <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void changeWorkflowStage("rough_draft")}>
              继续到添加粗稿 <ArrowRight className="size-4" />
            </button>
          ) : (
            <button type="button" className="btn-primary w-full" disabled={busy} onClick={() => void convert()}>
              开始推进 <ArrowRight className="size-4" />
            </button>
          )
        ) : null}

        {workflowStage === "rough_draft" && project.topic && !project.script ? (
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

        {project.script && workflowStage !== "idea" && workflowStage !== "published" ? (
          <>
            <div>
              <label htmlFor="content-editor" className="mb-2 block text-sm font-semibold">原始粗稿</label>
              <textarea
                id="content-editor"
                className="field min-h-48 resize-y leading-7 sm:min-h-64"
                value={editor}
                onChange={(event) => setEditor(event.target.value)}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#8a8277]">{editor.length} 字 · 可继续手动编辑</span>
                <button type="button" className="btn-secondary content-save-draft min-h-9 py-1" disabled={busy} onClick={() => void saveVersion()}>
                  保存粗稿
                </button>
              </div>
            </div>

            {aiVersions.length ? (
              <section className="rounded-lg border border-[#e1d9ce] bg-[#fbf8f2] p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">AI 优化稿</h3>
                  <p className="mt-1 text-[11px] text-[#8a8277]">
                    每次生成都会保存，切换版本不会修改原始粗稿
                  </p>
                </div>
                <span className="shrink-0 text-[11px] text-[#8a8277]">{aiVersions.length} 个版本</span>
              </div>

              <div className="relative mt-3">
                <button
                  type="button"
                  className="field flex w-full items-center justify-between gap-3 text-left text-xs"
                  aria-haspopup="listbox"
                  aria-expanded={aiVersionMenuOpen}
                  disabled={!aiVersions.length}
                  onClick={() => setAiVersionMenuOpen((current) => !current)}
                >
                  <span className="truncate">
                    {selectedAiVersion
                      ? `V${selectedAiVersion.version_number} · ${versionLabels[selectedAiVersion.version_type]}`
                      : "暂无 AI 优化版本"}
                  </span>
                  <ChevronDown className={cn("size-3.5 shrink-0 transition-transform", aiVersionMenuOpen && "rotate-180")} />
                </button>
                {aiVersionMenuOpen ? (
                  <div
                    role="listbox"
                    className="absolute inset-x-0 top-[calc(100%+6px)] z-20 max-h-56 overflow-y-auto rounded-lg border border-[#dcd2c6] bg-[#fffdf9] p-1.5 shadow-lg"
                  >
                    {[...aiVersions].reverse().map((version) => (
                      <button
                        key={version.id}
                        type="button"
                        role="option"
                        aria-selected={selectedAiVersion?.id === version.id}
                        className={cn(
                          "flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left text-xs",
                          selectedAiVersion?.id === version.id ? "bg-[#efe2dc] text-[#8f432f]" : "hover:bg-[#f3ede5]",
                        )}
                        onClick={() => {
                          setSelectedAiVersionId(version.id);
                          setAiVersionMenuOpen(false);
                        }}
                      >
                        <span>V{version.version_number} · AI 优化</span>
                        <span className="text-[10px] text-[#92897e]">{formatDate(version.created_at)}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <button
                  type="button"
                  className="btn-secondary min-h-8 px-3 py-1 text-[11px]"
                  disabled={busy || selectedAiIndex <= 0}
                  onClick={() => setSelectedAiVersionId(aiVersions[selectedAiIndex - 1]?.id ?? null)}
                >
                  <ChevronLeft className="size-3.5" /> 上一版
                </button>
                <span className="min-w-0 truncate text-center text-[10px] text-[#8a8277]">
                  {selectedAiVersion
                    ? readOptimizationSummary(
                        selectedAiVersion.optimization_prompt,
                        selectedAiVersion.estimated_duration,
                      )
                    : "生成后可在这里查看设置摘要"}
                </span>
                <button
                  type="button"
                  className="btn-secondary min-h-8 px-3 py-1 text-[11px]"
                  disabled={busy || selectedAiIndex < 0 || selectedAiIndex >= aiVersions.length - 1}
                  onClick={() => setSelectedAiVersionId(aiVersions[selectedAiIndex + 1]?.id ?? null)}
                >
                  下一版 <ChevronRight className="size-3.5" />
                </button>
              </div>

              <textarea
                className="field mt-3 min-h-48 resize-y leading-7 sm:min-h-64"
                value={selectedAiVersion?.content ?? ""}
                readOnly
                placeholder="AI 生成完成后，优化稿会固定显示在这里……"
                aria-label="AI 优化稿"
              />

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <button type="button" className="btn-primary min-h-9 px-2 py-2 text-xs" disabled={busy || !selectedAiVersion} onClick={() => void applyAiVersion()}>
                  <Check className="size-3.5" /> 应用为当前文案
                </button>
                <button type="button" className="btn-secondary min-h-9 px-2 py-2 text-xs" disabled={busy || !selectedAiVersion} onClick={() => selectedAiVersion && void optimize(optimizationOptions, selectedAiVersion)}>
                  <Sparkles className="size-3.5" /> 继续优化
                </button>
                <button type="button" className="btn-secondary min-h-9 px-2 py-2 text-xs" disabled={!selectedAiVersion} onClick={() => void copyAiVersion()}>
                  <Copy className="size-3.5" /> {copied ? "已复制" : "复制"}
                </button>
                <button type="button" className="btn-ghost min-h-9 px-2 py-2 text-xs text-[#9a4d38]" disabled={busy || !selectedAiVersion} onClick={() => void deleteAiVersion()}>
                  <Trash2 className="size-3.5" /> 删除当前版本
                </button>
              </div>
              </section>
            ) : null}

            <ScriptOptimizationPanel
              defaultDuration={defaultDuration}
              busy={busy}
              disabled={!currentVersion}
              onSubmit={optimize}
              onOptionsChange={setOptimizationOptions}
            />

            {workflowStage === "ready" && currentVersionId ? (
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
                  href={`/publications?script=${project.script.id}&version=${currentVersionId}`}
                  className="btn-primary w-full"
                >
                  标记为已发布 <ArrowRight className="size-4" />
                </Link>
              )
            ) : (
              workflowStage !== "ready" ? (
                <div className="border-t border-[#e1d9ce] pt-4">
                  <p className="text-[10px] font-semibold tracking-[.14em] text-[#8d8377] uppercase">下一步</p>
                  <button type="button" className="btn-secondary content-next-step mt-2 w-full" disabled={busy} onClick={() => void changeWorkflowStage("ready")}>
                    <span>移入待发布</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              ) : null
            )}
          </>
        ) : null}

        {workflowStage === "published" ? (
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

        {previousStage && canMoveToStage(previousStage.value) ? (
          <button
            type="button"
            className="btn-ghost content-previous-step"
            disabled={busy}
            onClick={() => void changeWorkflowStage(previousStage.value)}
          >
            返回上一步
          </button>
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
