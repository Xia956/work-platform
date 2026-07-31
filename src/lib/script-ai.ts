export const rewriteLevelValues = ["minimal", "natural", "expanded"] as const;
export type RewriteLevel = (typeof rewriteLevelValues)[number];

export const optimizationGoalValues = ["hook", "rhythm", "expand", "concise", "cta"] as const;
export type OptimizationGoal = (typeof optimizationGoalValues)[number];

export const ctaTypeValues = ["comment", "follow", "save", "question", "auto"] as const;
export type CtaType = (typeof ctaTypeValues)[number];

export type OptimizationDuration = 30 | 60 | 90 | null;

export interface ScriptOptimizationOptions {
  rewriteLevel: RewriteLevel;
  targetDuration: OptimizationDuration;
  goals: OptimizationGoal[];
  ctaType: CtaType | null;
  instruction: string;
}

export function createDefaultOptimizationOptions(defaultDuration: number): ScriptOptimizationOptions {
  return {
    rewriteLevel: "minimal",
    targetDuration: normalizeOptimizationDuration(defaultDuration),
    goals: [],
    ctaType: null,
    instruction: "",
  };
}

export const rewriteLevelLabels: Record<RewriteLevel, string> = {
  minimal: "最少修改",
  natural: "自然优化",
  expanded: "扩充重写",
};

export const optimizationGoalLabels: Record<OptimizationGoal, string> = {
  hook: "优化开头钩子",
  rhythm: "调整表达节奏",
  expand: "适当扩充内容",
  concise: "精简重复内容",
  cta: "加入结尾 CTA",
};

export const ctaTypeLabels: Record<CtaType, string> = {
  comment: "引导评论",
  follow: "引导关注",
  save: "引导收藏",
  question: "自然提问",
  auto: "由 AI 判断",
};

export const naturalSpokenFoundation = `全站自然口播底座（必须始终遵守）：
1. 输出必须像真人面对镜头说话，不像文章、演讲稿、公众号或营销文案。
2. 优先保留用户原本的观点、词汇和表达顺序，不随意添加用户没有说过的经历、立场、事实或情绪。
3. 允许自然的停顿、转折、轻微重复和不完全工整的句式，不要把每句话都改得过度顺滑。
4. 避免工整排比、强行金句、刻意升华、过度总结、口号和固定结尾。
5. 用户提供了粗稿时，以整理和优化为主，不擅自重新创作。
6. 不代替用户补充新的观点、结论、建议或价值判断；只有用户明确选择扩充时，才可在原观点范围内补充解释。
7. 不为了吸引注意而夸大冲突、制造焦虑或使用空洞营销话术。`;

const rewriteInstructions: Record<RewriteLevel, string> = {
  minimal: "严格保留原句、观点和顺序，只修正语病、无意义重复和明显不顺；能不改的地方不要改。不得新增原文没有表达的论点、建议、因果解释、例子或总结句。",
  natural: "可以调整顺序、衔接和口播节奏，但不得改变核心观点、立场与事实。",
  expanded: "可以补充必要解释、非个人化例子和自然过渡，但不得编造用户的个人经历、身份、数据或情绪。",
};

const goalInstructions: Record<OptimizationGoal, string> = {
  hook: "检查开头是否能让人愿意继续听；优先从原文观点中提炼，不用夸张悬念或套路句。",
  rhythm: "调整长短句、停顿和信息密度，让真人说起来顺口，保留适度口语重复。",
  expand: "只在原观点需要解释时适当扩充，用一般性说明或假设性例子，不新增个人经历。",
  concise: "删掉无意义重复、空话和同义反复，但不要把自然口语压缩成提纲。",
  cta: "在内容确实适合时加入一个简短自然的结尾引导，不要生硬转场、命令观众或固定套话。",
};

export function normalizeOptimizationDuration(defaultDuration: number): OptimizationDuration {
  if (defaultDuration <= 30) return 30;
  if (defaultDuration <= 60) return 60;
  return 90;
}

export function estimateSpokenDuration(content: string) {
  const spokenCharacters = content.replace(/\s/g, "").length;
  return Math.max(10, Math.min(900, Math.round(spokenCharacters / 3.5)));
}

export function buildOptimizationInstructions(
  options: ScriptOptimizationOptions,
  sourceLength?: number,
) {
  const durationInstruction = options.targetDuration
    ? `目标时长约 ${options.targetDuration} 秒。以自然完整为先，在接近目标时长的范围内调整，不要机械凑字数。`
    : "本次不限制时长，以完整、自然、不过度加工为先。";
  const selectedGoals = options.goals.length
    ? options.goals.map((goal) => `- ${goalInstructions[goal]}`).join("\n")
    : "- 不额外强化单项技巧，只按自然口播底座和改写程度整理。";
  const ctaInstruction = options.goals.includes("cta")
    ? `CTA 类型：${ctaTypeLabels[options.ctaType ?? "auto"]}。`
    : "不要新增 CTA；如果原文已有结尾引导，可按原意保留或轻微整理。";
  const minimalLengthGuard =
    options.rewriteLevel === "minimal" && sourceLength
      ? `原文约 ${sourceLength} 字；成稿应保持在约 ${Math.max(20, Math.floor(sourceLength * 0.85))}—${Math.ceil(sourceLength * 1.15)} 字。即使目标时长更长，也不要为了凑时长扩写。`
      : "";

  return `改写程度：${rewriteLevelLabels[options.rewriteLevel]}
${rewriteInstructions[options.rewriteLevel]}
${minimalLengthGuard}

${durationInstruction}

本次需要：
${selectedGoals}

${ctaInstruction}

补充要求：${options.instruction.trim() || "无"}

发生冲突时，优先级依次为：不编造事实与经历 > 保留用户核心观点 > 用户补充要求 > 改写程度 > 单项优化目标 > 时长。`;
}

export function buildOptimizationSummary(options: ScriptOptimizationOptions) {
  const duration = options.targetDuration ? `${options.targetDuration}秒` : "不限时长";
  const goals = options.goals.length
    ? options.goals.map((goal) => optimizationGoalLabels[goal]).join("、")
    : "自然口播";
  return `${rewriteLevelLabels[options.rewriteLevel]} · ${duration} · ${goals}`;
}

export function serializeOptimizationSettings(options: ScriptOptimizationOptions) {
  return JSON.stringify({
    rewriteLevel: options.rewriteLevel,
    targetDuration: options.targetDuration,
    goals: options.goals,
    ctaType: options.goals.includes("cta") ? options.ctaType ?? "auto" : null,
    instruction: options.instruction.trim(),
  });
}

export function readOptimizationSummary(prompt: string | null, fallbackDuration?: number | null) {
  if (prompt) {
    try {
      const value = JSON.parse(prompt) as Partial<ScriptOptimizationOptions>;
      if (
        value.rewriteLevel &&
        rewriteLevelValues.includes(value.rewriteLevel) &&
        (value.targetDuration === null || [30, 60, 90].includes(value.targetDuration as number)) &&
        Array.isArray(value.goals) &&
        value.goals.every((goal) => optimizationGoalValues.includes(goal))
      ) {
        return buildOptimizationSummary({
          rewriteLevel: value.rewriteLevel,
          targetDuration: value.targetDuration ?? null,
          goals: value.goals,
          ctaType: value.ctaType ?? null,
          instruction: value.instruction ?? "",
        });
      }
    } catch {
      // Older versions stored a plain-text prompt.
    }
  }

  return `AI 优化 · ${fallbackDuration ? `${fallbackDuration}秒` : "未记录时长"}`;
}
