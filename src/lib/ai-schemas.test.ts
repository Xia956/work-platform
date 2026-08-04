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

  const validBenchmarkAnalysis = {
      depth: "basic",
      basis: ["用户补充的口播原文"],
      summary: "内容以具体处境切入，通过递进表达完成观点转折，并在结尾给出清晰的价值落点。",
      hook: "先给出一个具体结果，再用反预期转折留下悬念。",
      structure: [
        { section: "开场", purpose: "建立期待", observation: "用具体结果吸引注意" },
        { section: "结尾", purpose: "收束主题", observation: "回扣开场并给出价值判断" },
      ],
      emotionalTriggers: [],
      trustElements: [],
      interactionDesign: [],
      cta: "",
      reusablePatterns: [
        "先给出具体结果建立可信度，再用转折制造信息缺口，让观众愿意继续听。",
        "用贯穿全文的统一隐喻组织长内容，使抽象的成长过程变得更容易理解。",
        "结尾回扣开场提出的问题，并用一句明确价值判断完成情绪收束。",
      ],
      risks: [],
      topicIdeas: ["坚持创作后真正发生的变化", "模仿爆款为什么只能带来短期结果", "如何面对创作中的自我怀疑"],
      missingInformation: ["缺少口播原文"],
    } as const;

  it("requires benchmark analysis basis and a declared depth", () => {
    expect(benchmarkAnalysisSchema.safeParse(validBenchmarkAnalysis).success).toBe(true);
    expect(benchmarkAnalysisSchema.safeParse({
      ...validBenchmarkAnalysis,
      basis: [],
    }).success).toBe(false);
  });

  it("requires enough reusable patterns and follow-up topics", () => {
    expect(benchmarkAnalysisSchema.safeParse({
      ...validBenchmarkAnalysis,
      reusablePatterns: validBenchmarkAnalysis.reusablePatterns.slice(0, 2),
    }).success).toBe(false);
    expect(benchmarkAnalysisSchema.safeParse({
      ...validBenchmarkAnalysis,
      topicIdeas: [],
    }).success).toBe(false);
  });

  it("validates generated scripts and review sections", () => {
    expect(generatedScriptSchema.safeParse({
      title: "测试文案",
      content: "这是一段足够长、可以直接口播的测试文案内容。",
      changeSummary: "从选题生成",
      estimatedDuration: 60,
    }).success).toBe(true);
    expect(reviewAnalysisSchema.safeParse({
      summary: "跳出率尚未录入，暂不判断钩子表现；文案核心观点清晰，下一步应补齐数据再验证。",
      wins: ["核心观点集中，没有分散成多个主题。"],
      issues: ["结尾缺少互动问题，需要结合评论率验证。"],
      hypotheses: ["跳出率偏高 → 核心观点出现较晚 → 前置观点后对比跳出率。"],
      nextActions: ["测试观点前置的开头，唯一观察指标为跳出率。"],
      nextTopics: ["长大以后为什么害怕浪费时间"],
    }).success).toBe(true);
  });
});
