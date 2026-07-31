import { describe, expect, it } from "vitest";
import {
  buildOptimizationInstructions,
  buildOptimizationSummary,
  createDefaultOptimizationOptions,
  estimateSpokenDuration,
  naturalSpokenFoundation,
  normalizeOptimizationDuration,
  readOptimizationSummary,
  serializeOptimizationSettings,
  type ScriptOptimizationOptions,
} from "@/lib/script-ai";

const baseOptions: ScriptOptimizationOptions = {
  rewriteLevel: "minimal",
  targetDuration: 60,
  goals: [],
  ctaType: null,
  instruction: "",
};

describe("natural spoken script prompts", () => {
  it("applies the natural spoken foundation to every AI script task", () => {
    expect(naturalSpokenFoundation).toContain("真人面对镜头说话");
    expect(naturalSpokenFoundation).toContain("不随意添加用户没有说过的经历");
    expect(naturalSpokenFoundation).toContain("轻微重复");
    expect(naturalSpokenFoundation).toContain("避免工整排比");
    expect(naturalSpokenFoundation).toContain("以整理和优化为主");
  });

  it("changes the prompt when rewrite level and duration change", () => {
    const minimal = buildOptimizationInstructions(baseOptions, 100);
    const expanded = buildOptimizationInstructions({
      ...baseOptions,
      rewriteLevel: "expanded",
      targetDuration: null,
    });

    expect(minimal).toContain("能不改的地方不要改");
    expect(minimal).toContain("成稿应保持在约 85—115 字");
    expect(minimal).toContain("不得新增原文没有表达的论点");
    expect(minimal).toContain("目标时长约 60 秒");
    expect(expanded).toContain("可以补充必要解释");
    expect(expanded).toContain("本次不限制时长");
    expect(expanded).not.toBe(minimal);
  });

  it("only adds the selected goals and CTA type", () => {
    const concise = buildOptimizationInstructions({
      ...baseOptions,
      goals: ["concise"],
      instruction: "保留第一段",
    });
    const withCta = buildOptimizationInstructions({
      ...baseOptions,
      goals: ["hook", "cta"],
      ctaType: "question",
    });

    expect(concise).toContain("删掉无意义重复");
    expect(concise).toContain("保留第一段");
    expect(concise).toContain("不要新增 CTA");
    expect(withCta).toContain("开头是否能让人愿意继续听");
    expect(withCta).toContain("CTA 类型：自然提问");
  });

  it("uses the profile duration only as the initial temporary selection", () => {
    expect(normalizeOptimizationDuration(30)).toBe(30);
    expect(normalizeOptimizationDuration(45)).toBe(60);
    expect(normalizeOptimizationDuration(60)).toBe(60);
    expect(normalizeOptimizationDuration(120)).toBe(90);
    expect(buildOptimizationSummary(baseOptions)).toBe("最少修改 · 60秒 · 自然口播");
    expect(estimateSpokenDuration("这是一段大约十四个字的口播内容")).toBeGreaterThanOrEqual(10);
    expect(estimateSpokenDuration("字".repeat(210))).toBe(60);
  });

  it("restores the settings summary saved with each AI version", () => {
    const options = {
      ...baseOptions,
      rewriteLevel: "natural" as const,
      goals: ["rhythm", "concise"] as const,
    };
    expect(readOptimizationSummary(serializeOptimizationSettings({
      ...options,
      goals: [...options.goals],
    }))).toBe("自然优化 · 60秒 · 调整表达节奏、精简重复内容");
    expect(readOptimizationSummary("legacy prompt", 45)).toBe("AI 优化 · 45秒");
    expect(createDefaultOptimizationOptions(45)).toEqual({
      rewriteLevel: "minimal",
      targetDuration: 60,
      goals: [],
      ctaType: null,
      instruction: "",
    });
  });
});
