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
  Pencil,
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/field";
import {
  readOptimizationSource,
  readOptimizationSummary,
  type ScriptOptimizationOptions,
} from "@/lib/script-ai";
import {
  GUEST_CONTENT_CHANGED_EVENT,
  guestContentToProject,
  readGuestContents,
  updateGuestAiVersion,
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

function formatAiVersionName(versionNumber: number) {
  return `AI 优化稿 · 第 ${versionNumber} 版`;
}

function LibraryFilterMenu<T extends string>({
  value,
  options,
  label,
  showHash = false,
  className,
  onChange,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  label: string;
  showHash?: boolean;
  className?: string;
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
    <div className={cn("relative min-w-0", className)} ref={root}>
      <button
        type="button"
        className="field content-library-filter-control flex min-w-0 items-center justify-between gap-1 px-1 text-left sm:gap-2 sm:px-3"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-1 sm:gap-2">
          {showHash ? <Hash className="hidden size-3.5 shrink-0 text-[#91887d] sm:block" /> : null}
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
          访客内容仅保存在当前设备。无需登录即可测试发布状态；登录后可同步并使用云端功能。
        </div>
      ) : null}
      <div className={cn("mb-3 flex flex-col gap-2 sm:mb-5 lg:flex-row lg:items-center lg:justify-between", mobileView === "project" && "hidden xl:flex")}>
        <div className="grid min-w-0 flex-1 grid-cols-4 gap-2 lg:grid-cols-[minmax(0,1fr)_112px_140px]">
          <div className="relative col-span-2 min-w-0 flex-1 lg:col-span-1 lg:max-w-md">
            <Search className="absolute left-3 top-3.5 size-4 text-[#91887d]" />
            <input
              className="field field-with-icon content-library-filter-control"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索标题、正文或标签"
              aria-label="搜索内容"
            />
          </div>
          <LibraryFilterMenu
            className="col-span-1 lg:col-span-1"
            value={filter}
            label="筛选内容状态"
            options={[
              { value: "all", label: "全部进度" },
              { value: "idea", label: "新灵感" },
              { value: "active", label: "推进中" },
              { value: "ready", label: "待发布" },
              { value: "published", label: "已完成" },
            ]}
            onChange={changeFilter}
          />
          <LibraryFilterMenu
            className="col-span-1 lg:col-span-1"
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
              key={selected.id}
              project={selected}
              historyTags={availableTags}
              onChanged={refresh}
              onAdvanced={showDraftStep}
              onTitleChanged={(title) => setProjects((current) => current.map((item) =>
                item.id === selected.id ? { ...item, title } : item
              ))}
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
  historyTags,
  onChanged,
  onAdvanced,
  onTitleChanged,
  defaultDuration,
}: {
  project: ContentProject;
  historyTags: string[];
  onChanged: () => void;
  onAdvanced: (project: ContentProject) => void;
  onTitleChanged: (title: string) => void;
  defaultDuration: number;
}) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [title, setTitle] = useState(project.title);
  const [savedTitle, setSavedTitle] = useState(project.title);
  const [editingTitle, setEditingTitle] = useState(false);
  const [savingPrimary, setSavingPrimary] = useState(false);
  const [savingAiVersion, setSavingAiVersion] = useState(false);
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
  const initialPrimaryContent = project.script?.autosave_content || currentVersion?.content || "";
  const [editor, setEditor] = useState(initialPrimaryContent);
  const [savedPrimaryContent, setSavedPrimaryContent] = useState(initialPrimaryContent);
  const [aiEditor, setAiEditor] = useState(selectedAiVersion?.content ?? "");
  const [savedAiContent, setSavedAiContent] = useState(selectedAiVersion?.content ?? "");
  const [optimizationSource, setOptimizationSource] = useState<"primary" | "ai">("primary");
  const [draft, setDraft] = useState("");
  const [aiVersionMenuOpen, setAiVersionMenuOpen] = useState(false);
  const [copiedTarget, setCopiedTarget] = useState<"primary" | "ai" | "final" | null>(null);
  const [tags, setTags] = useState(project.inspiration?.tags ?? []);
  const [workflowStage, setWorkflowStage] = useState<ContentStage>(project.stage);
  const [loginReason, setLoginReason] = useState("");
  const guestId = project.guestId;
  const workflowStageIndex = contentStages.findIndex((stage) => stage.value === workflowStage);
  const previousStage = workflowStageIndex > 0 ? contentStages[workflowStageIndex - 1] : null;
  const selectedAiSource = readOptimizationSource(selectedAiVersion?.optimization_prompt ?? null);
  const selectedAiSourceLabel = selectedAiSource?.type === "ai"
    ? formatAiVersionName(selectedAiSource.versionNumber)
    : selectedAiVersion?.parent_version_id && aiVersions.some((version) => version.id === selectedAiVersion.parent_version_id)
      ? formatAiVersionName(aiVersions.find((version) => version.id === selectedAiVersion.parent_version_id)!.version_number)
      : "我的文案";

  function canMoveToStage(stage: ContentStage) {
    if (!project.inspiration) return false;
    if (stage === "idea") return true;
    if (stage === "rough_draft") return Boolean(project.topic || project.script);
    if (stage === "ai_optimized") return Boolean(project.script);
    if (stage === "ready") return Boolean(project.script && currentVersionId);
    return project.isGuest ? Boolean(project.script && currentVersionId) : Boolean(project.publication);
  }

  async function request(
    url: string,
    init: RequestInit,
    options: { activity?: "global" | "primary" | "ai" | "optimization"; refresh?: boolean } = {},
  ) {
    const activity = options.activity ?? "global";
    if (activity === "global") setBusy(true);
    if (activity === "optimization") {
      setBusy(true);
      setOptimizing(true);
    }
    if (activity === "primary") setSavingPrimary(true);
    if (activity === "ai") setSavingAiVersion(true);
    setMessage("");
    try {
      const response = await fetch(url, init);
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "操作失败，请稍后重试");
        return null;
      }
      if (options.refresh !== false) onChanged();
      return result;
    } catch {
      setMessage("网络请求失败，请稍后重试");
      return null;
    } finally {
      if (activity === "global") setBusy(false);
      if (activity === "optimization") {
        setBusy(false);
        setOptimizing(false);
      }
      if (activity === "primary") setSavingPrimary(false);
      if (activity === "ai") setSavingAiVersion(false);
    }
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

  async function saveTitle(event: FormEvent) {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) {
      setMessage("标题不能为空");
      return;
    }
    if (nextTitle === savedTitle) {
      setEditingTitle(false);
      return;
    }

    if (project.isGuest && guestId) {
      updateGuestContent(guestId, { title: nextTitle });
    } else {
      const target = project.publication
        ? { url: "/api/data/publications", body: { id: project.publication.id, data: { title: nextTitle } } }
        : project.script
          ? { url: "/api/scripts", body: { action: "updateTitle", scriptId: project.script.id, title: nextTitle } }
          : project.topic
            ? { url: "/api/data/topics", body: { id: project.topic.id, data: { title: nextTitle } } }
            : project.inspiration
              ? { url: "/api/data/inspirations", body: { id: project.inspiration.id, data: { title: nextTitle } } }
              : null;
      if (!target) return;
      const result = await request(target.url, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(target.body),
      }, { refresh: false });
      if (!result) return;
    }

    setTitle(nextTitle);
    setSavedTitle(nextTitle);
    setEditingTitle(false);
    onTitleChanged(nextTitle);
    setMessage("标题已保存");
  }

  async function savePrimary(showMessage = true) {
    if (!project.script) return;
    const content = editor.trim();
    if (!content) {
      setMessage("我的文案不能为空");
      return;
    }
    if (project.isGuest && guestId) {
      updateGuestContent(guestId, { draft: content });
      setSavedPrimaryContent(content);
      setEditor(content);
      setVersions((current) => current.map((version) =>
        version.id === currentVersionId ? { ...version, content } : version
      ));
      if (showMessage) setMessage("我的文案已保存到当前设备");
      return currentVersion;
    }
    const result = await request("/api/scripts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        action: "savePrimary",
        scriptId: project.script.id,
        content,
      }),
    }, { activity: "primary", refresh: false });
    if (result?.data) {
      setVersions((current) => current.some((version) => version.id === result.data.id)
        ? current.map((version) => version.id === result.data.id ? result.data : version)
        : [result.data, ...current]);
      setCurrentVersionId(result.data.id);
      setSavedPrimaryContent(result.data.content);
      setEditor((current) => current.trim() === content ? result.data!.content : current);
      if (showMessage) setMessage("我的文案已保存");
      return result.data as ScriptVersion;
    }
  }

  async function saveAiVersion(showMessage = true) {
    if (!selectedAiVersion) return;
    const content = aiEditor.trim();
    if (!content) {
      setMessage("AI 优化稿不能为空");
      return;
    }
    if (project.isGuest && guestId) {
      updateGuestAiVersion(guestId, selectedAiVersion.id, content);
      const updated = { ...selectedAiVersion, content };
      setVersions((current) => current.map((version) => version.id === updated.id ? updated : version));
      setAiEditor(content);
      setSavedAiContent(content);
      if (showMessage) setMessage(`${formatAiVersionName(selectedAiVersion.version_number)}已保存到当前设备`);
      return updated;
    }
    const result = await request("/api/scripts", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "updateAiVersion", versionId: selectedAiVersion.id, content }),
    }, { activity: "ai", refresh: false });
    if (result?.data) {
      setVersions((current) => current.map((version) => version.id === result.data.id ? result.data : version));
      setSavedAiContent(result.data.content);
      setAiEditor((current) => current.trim() === content ? result.data!.content : current);
      if (showMessage) setMessage(`${formatAiVersionName(result.data.version_number)}已保存`);
      return result.data as ScriptVersion;
    }
  }

  async function switchAiVersion(versionId: string) {
    if (selectedAiVersion && aiEditor !== savedAiContent) {
      const saved = await saveAiVersion(false);
      if (!saved) return;
    }
    const target = aiVersions.find((version) => version.id === versionId);
    if (!target) return;
    setSelectedAiVersionId(target.id);
    setAiEditor(target.content);
    setSavedAiContent(target.content);
    setAiVersionMenuOpen(false);
  }

  async function optimize(options: ScriptOptimizationOptions) {
    if (project.isGuest) {
      setLoginReason("AI 文案优化需要登录，用于保护调用额度并保存不同版本。");
      return;
    }
    if (!project.script) return;
    if (optimizationSource === "primary" && editor !== savedPrimaryContent) {
      const saved = await savePrimary(false);
      if (!saved) return;
    }
    if (optimizationSource === "ai") {
      if (!selectedAiVersion) {
        setMessage("请先选择一个 AI 优化版本");
        return;
      }
      if (aiEditor !== savedAiContent) {
        const saved = await saveAiVersion(false);
        if (!saved) return;
      }
    }
    const result = await request("/api/ai/scripts/optimize", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        scriptId: project.script.id,
        sourceVersionId: optimizationSource === "ai" ? selectedAiVersion?.id ?? null : null,
        applyResult: false,
        ...options,
      }),
    }, { activity: "optimization" });
    if (result) {
      setVersions((current) => [result.data, ...current]);
      setSelectedAiVersionId(result.data.id);
      setAiEditor(result.data.content);
      setSavedAiContent(result.data.content);
      setWorkflowStage("ai_optimized");
      setMessage(`AI 优化稿已生成，来源：${optimizationSource === "ai" && selectedAiVersion ? formatAiVersionName(selectedAiVersion.version_number) : "我的文案"}`);
    }
  }

  async function applyAiVersion() {
    if (!project.script || !selectedAiVersion) return;
    if (aiEditor !== savedAiContent) {
      const saved = await saveAiVersion(false);
      if (!saved) return;
    }
    if (project.isGuest && guestId) {
      updateGuestContent(guestId, { draft: aiEditor.trim(), stage: "ai_optimized" });
      setEditor(aiEditor.trim());
      setSavedPrimaryContent(aiEditor.trim());
      setVersions((current) => current.map((version) =>
        version.id === currentVersionId ? { ...version, content: aiEditor.trim() } : version
      ));
      setMessage(`已将${formatAiVersionName(selectedAiVersion.version_number)}应用到“我的文案”`);
      onChanged();
      return;
    }
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
      setVersions((current) => current.some((version) => version.id === result.data.id)
        ? current.map((version) => version.id === result.data.id ? result.data : version)
        : [result.data, ...current]);
      setCurrentVersionId(result.data.id);
      setEditor(result.data.content);
      setSavedPrimaryContent(result.data.content);
      setWorkflowStage("ai_optimized");
      setMessage(`已将${formatAiVersionName(selectedAiVersion.version_number)}应用到“我的文案”，历史版本仍保留`);
    }
  }

  async function copyAiVersion() {
    if (!selectedAiVersion) return;
    await navigator.clipboard.writeText(aiEditor);
    setCopiedTarget("ai");
    setMessage("AI 优化稿已复制");
    window.setTimeout(() => setCopiedTarget((current) => current === "ai" ? null : current), 1500);
  }

  async function copyPrimaryContent() {
    if (!editor.trim()) return;
    await navigator.clipboard.writeText(editor);
    setCopiedTarget("primary");
    setMessage("我的文案已复制");
    window.setTimeout(() => setCopiedTarget((current) => current === "primary" ? null : current), 1500);
  }

  async function copyFinalVersion() {
    if (!editor.trim()) return;
    await navigator.clipboard.writeText(editor);
    setCopiedTarget("final");
    setMessage("待发布文案已复制");
    window.setTimeout(() => setCopiedTarget((current) => current === "final" ? null : current), 1500);
  }

  async function deleteAiVersion() {
    if (!selectedAiVersion || project.isGuest) return;
    const deletedIndex = selectedAiIndex;
    const result = await request(`/api/scripts?versionId=${selectedAiVersion.id}`, { method: "DELETE" });
    if (!result) return;
    const remaining = aiVersions.filter((version) => version.id !== selectedAiVersion.id);
    setVersions((current) => current.filter((version) => version.id !== selectedAiVersion.id));
    if (result.data) {
      setVersions((current) => current.some((version) => version.id === result.data.id)
        ? current.map((version) => version.id === result.data.id ? result.data : version)
        : [result.data, ...current]);
      setCurrentVersionId(result.data.id);
      setEditor(result.data.content);
      setSavedPrimaryContent(result.data.content);
    }
    const nextVersion = remaining[Math.min(deletedIndex, remaining.length - 1)] ?? null;
    setSelectedAiVersionId(nextVersion?.id ?? null);
    setAiEditor(nextVersion?.content ?? "");
    setSavedAiContent(nextVersion?.content ?? "");
    if (!nextVersion) setOptimizationSource("primary");
    setMessage("当前 AI 优化稿已删除，其他版本和“我的文案”未受影响");
  }

  async function changeWorkflowStage(nextStage: ContentStage) {
    if (!project.inspiration || !canMoveToStage(nextStage) || nextStage === workflowStage) return;

    if (project.isGuest && guestId) {
      if (nextStage === "ready" && !editor.trim()) {
        setMessage("最终文案不能为空");
        return;
      }
      updateGuestContent(guestId, {
        draft: editor.trim(),
        stage: nextStage,
      });
      setWorkflowStage(nextStage);
      setMessage("");
      onChanged();
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      if (
        nextStage === "ready" &&
        project.script &&
        editor.trim() &&
        editor !== savedPrimaryContent
      ) {
        const saveResponse = await fetch("/api/scripts", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "savePrimary",
            scriptId: project.script.id,
            content: editor,
          }),
        });
        const saveResult = await saveResponse.json();
        if (!saveResponse.ok) throw new Error(saveResult.error ?? "最终文案保存失败");
        setVersions((current) => current.some((version) => version.id === saveResult.data.id)
          ? current.map((version) => version.id === saveResult.data.id ? saveResult.data : version)
          : [saveResult.data, ...current]);
        setCurrentVersionId(saveResult.data.id);
        setEditor(saveResult.data.content);
        setSavedPrimaryContent(saveResult.data.content);
      } else if (nextStage === "ready" && !editor.trim()) {
        throw new Error("最终文案不能为空");
      }

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
      setMessage("");
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
        {editingTitle ? (
          <form className="mt-2 flex items-center gap-2" onSubmit={saveTitle}>
            <label className="sr-only" htmlFor={`project-title-${project.id}`}>内容标题</label>
            <Input
              id={`project-title-${project.id}`}
              className="min-w-0 flex-1 font-semibold"
              value={title}
              maxLength={!project.publication && !project.script && !project.topic ? 120 : 160}
              disabled={busy}
              autoFocus
              onChange={(event) => setTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Escape") return;
                setTitle(savedTitle);
                setEditingTitle(false);
              }}
            />
            <Button type="submit" size="sm" disabled={busy || !title.trim()}>
              保存
            </Button>
          </form>
        ) : (
          <div className="mt-2 flex items-start justify-between gap-2">
            <h2 className="type-section-title min-w-0">{savedTitle}</h2>
            <Button
              variant="ghost"
              size="icon"
              aria-label="修改标题"
              title="修改标题"
              onClick={() => setEditingTitle(true)}
            >
              <Pencil />
            </Button>
          </div>
        )}
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

      <div className={cn(
        "p-4 sm:p-5",
        workflowStage === "published" ? "space-y-3" : "space-y-4 sm:space-y-5",
      )}>
        {project.inspiration && workflowStage !== "published" && (tags.length > 0 || workflowStage !== "ready") ? (
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
            {workflowStage !== "ready" ? (
              <ContentTagPicker
                value={tags}
                onChange={(nextTags) => void saveTags(nextTags)}
                historyTags={historyTags}
                collapsedLabel={tags.length ? "编辑标签" : "+ 添加标签"}
                defaultExpanded={false}
                disabled={busy}
              />
            ) : null}
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
            {workflowStage === "ready" ? (
              <section className="rounded-lg border border-[#ded5c9] bg-[#fbf8f2] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold tracking-[.14em] text-[#9a503b] uppercase">Final version</p>
                    <h3 className="mt-1 text-base font-semibold">待发布文案</h3>
                  </div>
                  {currentVersion ? (
                    <span className="shrink-0 rounded-full bg-[#eee5dc] px-2.5 py-1 text-[10px] font-semibold text-[#755f52]">
                      我的文案 · 最终确认
                    </span>
                  ) : null}
                </div>
                <p className="type-caption mt-1 text-ink-muted">这里只保留已经确认的最终版本，返回上一步后仍可继续修改。</p>

                <textarea
                  className="field ui-ready-editor mt-3 resize-y leading-7"
                  value={editor}
                  readOnly
                  aria-label="待发布文案"
                />

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] text-[#8a8277]">
                    {editor.length} 字 · 预计 {currentVersion?.estimated_duration ?? project.script.target_duration} 秒
                  </span>
                  <button type="button" className="btn-secondary min-h-9 px-3 py-1 text-xs" onClick={() => void copyFinalVersion()}>
                    <Copy className="size-3.5" /> {copiedTarget === "final" ? "已复制" : "复制文案"}
                  </button>
                </div>
              </section>
            ) : (
              <>
            <div>
              <label htmlFor="content-editor" className="mb-2 block text-sm font-semibold">我的文案</label>
              <div className="relative">
                <textarea
                  id="content-editor"
                  className="field ui-script-editor ui-script-editor--with-action resize-y leading-7"
                  value={editor}
                  onChange={(event) => setEditor(event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ui-script-copy-button"
                  disabled={!editor.trim()}
                  aria-label={copiedTarget === "primary" ? "我的文案已复制" : "复制我的文案"}
                  title={copiedTarget === "primary" ? "已复制" : "复制"}
                  onClick={() => void copyPrimaryContent()}
                >
                  {copiedTarget === "primary" ? <Check /> : <Copy />}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] text-[#8a8277]">{editor.length} 字 · 保存时直接更新当前文案</span>
                <button
                  type="button"
                  className="btn-secondary content-save-draft min-h-9 py-1"
                  disabled={busy || savingPrimary || !editor.trim() || editor === savedPrimaryContent}
                  onClick={() => void savePrimary()}
                >
                  {savingPrimary ? "保存中…" : editor === savedPrimaryContent ? "已保存" : "保存"}
                </button>
              </div>
            </div>

            {aiVersions.length ? (
              <Card className="p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold">AI 优化稿</h3>
                  <p className="mt-1 text-[11px] text-[#8a8277]">
                    每次生成自动新增版本；手动编辑只更新当前版本
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
                      ? formatAiVersionName(selectedAiVersion.version_number)
                      : "暂无 AI 优化稿"}
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
                          void switchAiVersion(version.id);
                        }}
                      >
                        <span>{formatAiVersionName(version.version_number)}</span>
                        <span className="text-[10px] text-[#92897e]">{formatDate(version.created_at)}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center">
                <Button
                  type="button"
                  size="sm"
                  className="content-version-nav-button order-2 w-full sm:order-1 sm:w-auto"
                  disabled={busy || savingAiVersion || selectedAiIndex <= 0}
                  onClick={() => {
                    const target = aiVersions[selectedAiIndex - 1];
                    if (target) void switchAiVersion(target.id);
                  }}
                >
                  <ChevronLeft className="size-3.5" /> 上一版
                </Button>
                <div className="order-1 col-span-2 min-w-0 rounded-md bg-[#f1ece4] px-3 py-2 text-center sm:order-2 sm:col-span-1 sm:bg-transparent sm:px-2 sm:py-0">
                  <span className="block text-[10px] leading-4 text-[#7f766d]">
                    {selectedAiVersion
                      ? readOptimizationSummary(
                          selectedAiVersion.optimization_prompt,
                          selectedAiVersion.estimated_duration,
                        )
                      : "生成后可在这里查看设置摘要"}
                  </span>
                  {selectedAiVersion ? (
                    <span className="mt-0.5 block text-[9px] leading-4 text-[#9a9085]">
                      {formatDate(selectedAiVersion.created_at)} · 来源：{selectedAiSourceLabel}
                    </span>
                  ) : null}
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="content-version-nav-button order-3 w-full sm:w-auto"
                  disabled={busy || savingAiVersion || selectedAiIndex < 0 || selectedAiIndex >= aiVersions.length - 1}
                  onClick={() => {
                    const target = aiVersions[selectedAiIndex + 1];
                    if (target) void switchAiVersion(target.id);
                  }}
                >
                  下一版 <ChevronRight className="size-3.5" />
                </Button>
              </div>

              <div className="relative mt-3">
                <Textarea
                  className="ui-script-editor ui-script-editor--with-action resize-y leading-7"
                  value={aiEditor}
                  onChange={(event) => setAiEditor(event.target.value)}
                  placeholder="AI 生成完成后，优化稿会固定显示在这里……"
                  aria-label="AI 优化稿"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="ui-script-copy-button"
                  disabled={!selectedAiVersion}
                  aria-label={copiedTarget === "ai" ? "AI 优化稿已复制" : "复制 AI 优化稿"}
                  title={copiedTarget === "ai" ? "已复制" : "复制"}
                  onClick={() => void copyAiVersion()}
                >
                  {copiedTarget === "ai" ? <Check /> : <Copy />}
                </Button>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <Button type="button" variant="primary" size="sm" className="content-ai-version-action" disabled={busy || savingAiVersion || !selectedAiVersion} onClick={() => void applyAiVersion()}>
                  <Check className="size-3.5" /> 应用为我的文案
                </Button>
                <Button type="button" size="sm" className="content-ai-version-action" disabled={busy || savingAiVersion || !selectedAiVersion || !aiEditor.trim() || aiEditor === savedAiContent} onClick={() => void saveAiVersion()}>
                  <FileText className="size-3.5" /> {savingAiVersion ? "保存中…" : aiEditor === savedAiContent ? "已保存" : "保存 AI 稿"}
                </Button>
                <Button type="button" variant="ghost" size="sm" className="content-ai-version-action col-span-2 text-danger sm:col-span-1" disabled={busy || savingAiVersion || !selectedAiVersion} onClick={() => void deleteAiVersion()}>
                  <Trash2 className="size-3.5" /> 删除当前版本
                </Button>
              </div>
              </Card>
            ) : null}

            <ScriptOptimizationPanel
              defaultDuration={defaultDuration}
              busy={optimizing}
              disabled={busy || savingPrimary || savingAiVersion || !editor.trim() || (optimizationSource === "ai" && !selectedAiVersion)}
              optimizationSource={optimizationSource}
              aiSourceLabel={selectedAiVersion ? formatAiVersionName(selectedAiVersion.version_number) : "AI 优化稿"}
              aiSourceAvailable={Boolean(selectedAiVersion)}
              onOptimizationSourceChange={setOptimizationSource}
              onSubmit={optimize}
            />

            <div className="border-t border-[#e1d9ce] pt-4">
              <p className="text-[10px] font-semibold tracking-[.14em] text-[#8d8377] uppercase">下一步</p>
              <button type="button" className="btn-secondary content-next-step mt-2 w-full" disabled={busy} onClick={() => void changeWorkflowStage("ready")}>
                <span>移入待发布</span>
                <ArrowRight className="size-4" />
              </button>
            </div>
              </>
            )}

            {workflowStage === "ready" && currentVersionId ? (
              project.isGuest ? (
                <button
                  type="button"
                  className="btn-primary w-full"
                  disabled={busy}
                  onClick={() => void changeWorkflowStage("published")}
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
            ) : null}
          </>
        ) : null}

        {workflowStage === "published" ? (
          <>
            <section>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="type-eyebrow text-brand uppercase">Published script</p>
                  <h3 className="type-body mt-1 flex items-center gap-2 text-ink">
                    <FileText className="size-4 text-brand" />文案
                  </h3>
                </div>
                {project.inspiration ? (
                  <ContentTagPicker
                    value={tags}
                    onChange={(nextTags) => void saveTags(nextTags)}
                    historyTags={historyTags}
                    collapsedLabel={tags.length ? "编辑标签" : "+ 添加标签"}
                    className="ml-auto w-fit max-w-full"
                    defaultExpanded={false}
                    disabled={busy}
                  />
                ) : null}
              </div>
              <p className="type-body mt-3 whitespace-pre-wrap border-l-2 border-brand-soft pl-4 text-ink-muted sm:pl-5">
                {editor.trim() || "暂无发布文案"}
              </p>
            </section>

            <div className={cn(
              "rounded-lg bg-[#e7eee9] px-4 text-sm text-[#4c6456]",
              project.publication?.video_url || project.snapshots.length ? "py-4" : "flex h-10 items-center",
            )}>
              <div className="flex items-center gap-3">
                <p className="flex items-center gap-1.5 font-semibold"><Check className="size-4" /> 已发布</p>
                {project.publication ? (
                  <p className="flex items-center gap-1.5 text-xs">
                    <CalendarDays className="size-3.5" /> {formatDate(project.publication.published_at)}
                  </p>
                ) : null}
              </div>
              {project.publication?.video_url ? (
                <a
                  href={project.publication.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-2"
                >
                  查看发布视频 <ExternalLink className="size-3.5" />
                </a>
              ) : null}
              {project.snapshots.length ? <p className="mt-2">已记录 {project.snapshots.length} 次数据快照</p> : null}
            </div>

            <Link
              href={project.isGuest && project.guestId
                ? `/publications?guest=${project.guestId}`
                : project.publication
                  ? `/publications?publication=${project.publication.id}`
                  : "/publications"}
              className="btn-primary w-full"
            >
              开始复盘 <ArrowRight className="size-4" />
            </Link>
          </>
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
