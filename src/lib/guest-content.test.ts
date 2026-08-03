import { describe, expect, it } from "vitest";
import { guestContentToProject, guestStats, type GuestContent } from "@/lib/guest-content";

const base: GuestContent = {
  id: "58e5ee7d-2f0f-4278-a7bd-9e778d9bf71a",
  title: "晚风吹过来的时候",
  idea: "想写一条关于慢下来的内容",
  direction: "",
  draft: "",
  stage: "idea",
  createdAt: "2026-07-30T10:00:00.000Z",
  updatedAt: "2026-07-30T10:00:00.000Z",
};

describe("guest content", () => {
  it("maps a local idea to a content project", () => {
    const project = guestContentToProject({ ...base, tags: ["女性成长", "MBTI"] });
    expect(project.isGuest).toBe(true);
    expect(project.stage).toBe("idea");
    expect(project.progress).toBe(20);
    expect(project.inspiration?.content).toBe(base.idea);
    expect(project.inspiration?.tags).toEqual(["女性成长", "MBTI"]);
    expect(project.script).toBeNull();
  });

  it("keeps a local draft ready for the regular content UI", () => {
    const project = guestContentToProject({
      ...base,
      direction: "成年人也需要允许自己慢下来",
      draft: "我们总以为停下来就是浪费时间，其实有时候慢一点，才能重新听见自己。",
      stage: "ready",
    });
    expect(project.stage).toBe("ready");
    expect(project.progress).toBe(80);
    expect(project.script?.status).toBe("ready");
    expect(project.versions).toHaveLength(1);
  });

  it("maps stored AI drafts into selectable history versions", () => {
    const project = guestContentToProject({
      ...base,
      draft: "这是原始粗稿。",
      stage: "ai_optimized",
      aiVersions: [{
        id: "ai-test-version",
        content: "这是更自然的 AI 优化稿。",
        optimizationPrompt: JSON.stringify({
          rewriteLevel: "minimal",
          targetDuration: 60,
          goals: ["rhythm"],
          ctaType: null,
          instruction: "",
        }),
        changeSummary: "调整了口播节奏",
        estimatedDuration: 60,
        createdAt: "2026-07-30T11:00:00.000Z",
      }],
    });

    expect(project.versions).toHaveLength(2);
    expect(project.versions[1]).toMatchObject({
      id: "ai-test-version",
      version_number: 2,
      version_type: "ai_optimized",
      content: "这是更自然的 AI 优化稿。",
    });
  });

  it("counts guest stages for the workbench", () => {
    expect(guestStats([
      base,
      { ...base, id: "2", stage: "rough_draft" },
      { ...base, id: "3", stage: "ai_optimized" },
      { ...base, id: "4", stage: "ready" },
    ])).toEqual({ ideas: 1, active: 2, ready: 1, completed: 0 });
  });
});
