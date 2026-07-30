"use client";

import type { ContentProject, ContentStage } from "@/lib/types";

export const GUEST_CONTENT_STORAGE_KEY = "koubotai:guest-content:v1";
export const GUEST_CONTENT_CHANGED_EVENT = "koubotai:guest-content-changed";

export interface GuestContent {
  id: string;
  title: string;
  idea: string;
  direction: string;
  draft: string;
  stage: Exclude<ContentStage, "published">;
  createdAt: string;
  updatedAt: string;
}

function isGuestContent(value: unknown): value is GuestContent {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<GuestContent>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.idea === "string" &&
    typeof item.direction === "string" &&
    typeof item.draft === "string" &&
    ["idea", "rough_draft", "ai_optimized", "ready"].includes(item.stage ?? "") &&
    typeof item.createdAt === "string" &&
    typeof item.updatedAt === "string"
  );
}

export function readGuestContents(): GuestContent[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_CONTENT_STORAGE_KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isGuestContent).sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
    );
  } catch {
    return [];
  }
}

function writeGuestContents(items: GuestContent[]) {
  window.localStorage.setItem(GUEST_CONTENT_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(GUEST_CONTENT_CHANGED_EVENT));
}

export function createGuestIdea(idea: string) {
  const now = new Date().toISOString();
  const item: GuestContent = {
    id: crypto.randomUUID(),
    title: idea.trim(),
    idea: idea.trim(),
    direction: "",
    draft: "",
    stage: "idea",
    createdAt: now,
    updatedAt: now,
  };
  writeGuestContents([item, ...readGuestContents()]);
  return item;
}

export function createGuestContent(input: {
  title: string;
  direction: string;
  draft: string;
}) {
  const now = new Date().toISOString();
  const item: GuestContent = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    idea: input.direction.trim(),
    direction: input.direction.trim(),
    draft: input.draft.trim(),
    stage: "rough_draft",
    createdAt: now,
    updatedAt: now,
  };
  writeGuestContents([item, ...readGuestContents()]);
  return item;
}

export function updateGuestContent(
  id: string,
  updates: Partial<Pick<GuestContent, "title" | "idea" | "direction" | "draft" | "stage">>,
) {
  let updated: GuestContent | null = null;
  const items = readGuestContents().map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...updates, updatedAt: new Date().toISOString() };
    return updated;
  });
  writeGuestContents(items);
  return updated;
}

export function clearGuestContents() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(GUEST_CONTENT_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(GUEST_CONTENT_CHANGED_EVENT));
}

export function guestContentToProject(item: GuestContent): ContentProject {
  const stageIndex = {
    idea: 0,
    rough_draft: 1,
    ai_optimized: 2,
    ready: 3,
  }[item.stage];
  const inspirationId = `guest-inspiration-${item.id}`;
  const topicId = `guest-topic-${item.id}`;
  const scriptId = `guest-script-${item.id}`;
  const versionId = `guest-version-${item.id}`;

  return {
    id: `guest-${item.id}`,
    guestId: item.id,
    isGuest: true,
    title: item.title,
    stage: item.stage,
    stageIndex,
    progress: (stageIndex + 1) * 20,
    updatedAt: item.updatedAt,
    inspiration: {
      id: inspirationId,
      title: item.title,
      content: item.idea,
      tags: [],
      status: item.stage === "idea" ? "inbox" : "converted",
      created_at: item.createdAt,
      updated_at: item.updatedAt,
    },
    topic: item.direction
      ? {
          id: topicId,
          title: item.title,
          angle: item.direction,
          audience: null,
          pain_point: null,
          keywords: [],
          priority: 3,
          status: item.stage === "idea" ? "backlog" : "drafting",
          inspiration_id: inspirationId,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
        }
      : null,
    script: item.draft
      ? {
          id: scriptId,
          title: item.title,
          topic_id: item.direction ? topicId : null,
          status: item.stage === "ready" ? "ready" : "drafting",
          target_duration: 60,
          current_version_id: versionId,
          autosave_content: item.draft,
          autosaved_at: item.updatedAt,
          created_at: item.createdAt,
          updated_at: item.updatedAt,
        }
      : null,
    versions: item.draft
      ? [{
          id: versionId,
          script_id: scriptId,
          parent_version_id: null,
          version_number: 1,
          version_type: item.stage === "ai_optimized" ? "manual_edit" : "rough_draft",
          content: item.draft,
          optimization_type: null,
          optimization_prompt: null,
          change_summary: null,
          estimated_duration: 60,
          created_at: item.updatedAt,
        }]
      : [],
    publication: null,
    snapshots: [],
  };
}

export function guestStats(items: GuestContent[]) {
  return {
    ideas: items.filter((item) => item.stage === "idea").length,
    active: items.filter(
      (item) => item.stage === "rough_draft" || item.stage === "ai_optimized",
    ).length,
    ready: items.filter((item) => item.stage === "ready").length,
    completed: 0,
  };
}
