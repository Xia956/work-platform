import { describe, expect, it } from "vitest";
import {
  benchmarkAnalysisSchema,
  generatedScriptSchema,
  reviewAnalysisSchema,
  scriptResultSchema,
} from "@/lib/ai-schemas";

describe("AI structured results", () => {
  it("accepts a valid optimized script and rejects empty content", () => {
    expect(scriptResultSchema.safeParse({
      content: "这是一段足够长、可以直接口播的测试文案内容。",
      changeSummary: "精简开场",
      estimatedDuration: 45,
    }).success).toBe(true);
    expect(scriptResultSchema.safeParse({
      content: "",
      changeSummary: "",
      estimatedDuration: 45,
    }).success).toBe(false);
  });

  it("requires benchmark analysis basis and a declared depth", () => {
    const result = benchmarkAnalysisSchema.safeParse({
      depth: "basic",
      basis: [],
      summary: "摘要",
      hook: "钩子",
      structure: [],
      emotionalTriggers: [],
      trustElements: [],
      interactionDesign: [],
      cta: "",
      reusablePatterns: [],
      risks: [],
      topicIdeas: [],
      missingInformation: ["缺少口播原文"],
    });
    expect(result.success).toBe(false);
  });

  it("validates generated scripts and review sections", () => {
    expect(generatedScriptSchema.safeParse({
      title: "测试文案",
      content: "这是一段足够长、可以直接口播的测试文案内容。",
      changeSummary: "从选题生成",
      estimatedDuration: 60,
    }).success).toBe(true);
    expect(reviewAnalysisSchema.safeParse({
      summary: "表现稳定",
      wins: [],
      issues: [],
      hypotheses: [],
      nextActions: [],
      nextTopics: [],
    }).success).toBe(true);
  });
});
