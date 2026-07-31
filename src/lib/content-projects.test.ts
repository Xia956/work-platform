import { describe, expect, it } from "vitest";
import { advanceProjectToDraft, buildContentProjects } from "@/lib/content-projects";
import {
  demoInspirations,
  demoScripts,
  demoTopics,
  demoVersions,
} from "@/lib/demo-content";

describe("buildContentProjects", () => {
  it("keeps linked legacy rows in one project and derives progress", () => {
    const projects = buildContentProjects({
      inspirations: [{ id: "i", title: "灵感", content: "", tags: [], status: "converted", created_at: "2026-01-01" }],
      topics: [{ id: "t", title: "选题", angle: null, audience: null, pain_point: null, keywords: [], priority: 3, status: "drafting", inspiration_id: "i", created_at: "2026-01-02" }],
      scripts: [{ id: "s", title: "文案", topic_id: "t", status: "drafting", target_duration: 60, current_version_id: "v", autosave_content: "", autosaved_at: null, created_at: "2026-01-03" }],
      versions: [{ id: "v", script_id: "s", parent_version_id: null, version_number: 1, version_type: "ai_optimized", content: "内容", optimization_type: "hook", optimization_prompt: null, change_summary: null, estimated_duration: 60, created_at: "2026-01-04" }],
      publications: [],
    });

    expect(projects).toHaveLength(1);
    expect(projects[0]).toMatchObject({ title: "文案", stage: "ai_optimized", progress: 60 });
  });

  it("preserves orphaned historical rows as independent projects", () => {
    const projects = buildContentProjects({
      inspirations: [],
      topics: [],
      scripts: [{ id: "s", title: "旧文案", topic_id: null, status: "ready", target_duration: 60, current_version_id: null, autosave_content: "", autosaved_at: null, created_at: "2026-01-01" }],
      versions: [],
      publications: [],
    });

    expect(projects[0]).toMatchObject({ stage: "ready", progress: 80 });
  });

  it("maps the six demo projects to the requested stages without duplicates", () => {
    const projects = buildContentProjects({
      inspirations: demoInspirations,
      topics: demoTopics,
      scripts: demoScripts,
      versions: demoVersions,
      publications: [],
    });

    expect(projects).toHaveLength(6);
    expect(new Set(projects.map((project) => project.title)).size).toBe(6);
    expect(projects.map((project) => project.progress)).toEqual([80, 60, 40, 40, 20, 20]);
    expect(projects.map((project) => project.stage)).toEqual([
      "ready",
      "ai_optimized",
      "rough_draft",
      "rough_draft",
      "idea",
      "idea",
    ]);
  });
});

describe("advanceProjectToDraft", () => {
  it("moves the selected inspiration directly to the rough draft step", () => {
    const project = buildContentProjects({
      inspirations: [{
        id: "inspiration-id",
        title: "灵感",
        content: "原始方向",
        tags: [],
        status: "inbox",
        created_at: "2026-01-01",
      }],
      topics: [],
      scripts: [],
      versions: [],
      publications: [],
    })[0];
    const topic = {
      id: "topic-id",
      title: "灵感",
      angle: "补充后的方向",
      audience: null,
      pain_point: null,
      keywords: [],
      priority: 3,
      status: "backlog" as const,
      inspiration_id: "inspiration-id",
      created_at: "2026-01-02",
    };

    const advanced = advanceProjectToDraft(project, topic, "补充后的方向");

    expect(advanced.stage).toBe("rough_draft");
    expect(advanced.stageIndex).toBe(1);
    expect(advanced.progress).toBe(40);
    expect(advanced.topic).toEqual(topic);
    expect(advanced.inspiration).toMatchObject({
      content: "补充后的方向",
      status: "converted",
    });
  });
});
