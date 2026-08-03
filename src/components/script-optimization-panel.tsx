"use client";

import { useEffect, useMemo, useState } from "react";
import { Bot, Check, ChevronDown, Sparkles } from "lucide-react";
import {
  buildOptimizationSummary,
  ctaTypeLabels,
  ctaTypeValues,
  normalizeOptimizationDuration,
  optimizationGoalLabels,
  optimizationGoalValues,
  rewriteLevelLabels,
  rewriteLevelValues,
  type CtaType,
  type OptimizationDuration,
  type OptimizationGoal,
  type RewriteLevel,
  type ScriptOptimizationOptions,
} from "@/lib/script-ai";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/field";
import { cn } from "@/lib/utils";

const rewriteDescriptions: Record<RewriteLevel, string> = {
  minimal: "保留原句、观点和顺序，只修明显问题",
  natural: "可调整顺序、衔接和节奏，不改核心观点",
  expanded: "可补解释和过渡，但不编造个人经历",
};

const durationOptions: Array<{ value: OptimizationDuration; label: string }> = [
  { value: null, label: "不限制" },
  { value: 30, label: "30 秒" },
  { value: 60, label: "60 秒" },
  { value: 90, label: "90 秒" },
];

export function ScriptOptimizationPanel({
  defaultDuration,
  busy,
  disabled,
  optimizationSource = "primary",
  aiSourceLabel = "AI 优化稿",
  aiSourceAvailable = false,
  onOptimizationSourceChange,
  onSubmit,
  onOptionsChange,
  className,
}: {
  defaultDuration: number;
  busy: boolean;
  disabled?: boolean;
  optimizationSource?: "primary" | "ai";
  aiSourceLabel?: string;
  aiSourceAvailable?: boolean;
  onOptimizationSourceChange?: (source: "primary" | "ai") => void;
  onSubmit: (options: ScriptOptimizationOptions) => void | Promise<void>;
  onOptionsChange?: (options: ScriptOptimizationOptions) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(true);
  const [rewriteLevel, setRewriteLevel] = useState<RewriteLevel>("minimal");
  const [targetDuration, setTargetDuration] = useState<OptimizationDuration>(
    normalizeOptimizationDuration(defaultDuration),
  );
  const [goals, setGoals] = useState<OptimizationGoal[]>([]);
  const [ctaType, setCtaType] = useState<CtaType>("auto");
  const [instruction, setInstruction] = useState("");
  const options = useMemo<ScriptOptimizationOptions>(() => ({
    rewriteLevel,
    targetDuration,
    goals,
    ctaType: goals.includes("cta") ? ctaType : null,
    instruction,
  }), [ctaType, goals, instruction, rewriteLevel, targetDuration]);

  useEffect(() => {
    onOptionsChange?.(options);
  }, [onOptionsChange, options]);

  function toggleGoal(goal: OptimizationGoal) {
    setGoals((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal],
    );
  }

  return (
    <Card tone="ai" className={className}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="min-w-0">
          <span className="type-body flex items-center gap-2 font-semibold">
            <Bot className="size-4 text-brand" />
            AI 文案优化
          </span>
          {!expanded ? (
            <span className="type-caption mt-1 block truncate text-ai-ink-muted">
              {buildOptimizationSummary(options)}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-ai-ink-muted transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-ai-line-soft p-4">
          {onOptimizationSourceChange ? (
          <fieldset>
            <legend className="type-label text-ai-ink">本次优化基于</legend>
            <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="AI 优化来源">
              <button
                type="button"
                role="radio"
                aria-checked={optimizationSource === "primary"}
                className="ui-source-option"
                onClick={() => onOptimizationSourceChange("primary")}
              >
                我的文案
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={optimizationSource === "ai"}
                className="ui-source-option"
                disabled={!aiSourceAvailable}
                onClick={() => onOptimizationSourceChange("ai")}
              >
                {aiSourceLabel}
              </button>
            </div>
          </fieldset>
          ) : null}

          <fieldset>
            <legend className="type-label text-ai-ink">改写程度</legend>
            <div className="mt-2 grid gap-2">
              {rewriteLevelValues.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rewriteLevel === value}
                  className="ui-choice-card"
                  onClick={() => setRewriteLevel(value)}
                >
                  <span className="type-label flex items-center justify-between gap-2 text-ai-ink">
                    {rewriteLevelLabels[value]}
                    {rewriteLevel === value ? <Check className="size-3.5 text-brand" /> : null}
                  </span>
                  <span className="type-caption mt-1 block text-ai-ink-subtle">
                    {rewriteDescriptions[value]}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="type-label text-ai-ink">目标时长</legend>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {durationOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={targetDuration === option.value}
                  className="ui-segment"
                  onClick={() => setTargetDuration(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="type-label text-ai-ink">本次需要（可多选）</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {optimizationGoalValues.map((goal) => {
                const selected = goals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    className="ui-choice-chip font-semibold"
                    onClick={() => toggleGoal(goal)}
                  >
                    {selected ? <Check className="size-3" /> : null}
                    {optimizationGoalLabels[goal]}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {goals.includes("cta") ? (
            <fieldset>
              <legend className="type-label text-ai-ink">CTA 类型</legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ctaTypeValues.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={ctaType === value}
                    className="ui-choice-chip ui-choice-chip--strong"
                    onClick={() => setCtaType(value)}
                  >
                    {ctaTypeLabels[value]}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className="block">
            <span className="type-label text-ai-ink">补充要求（可选）</span>
            <Textarea
              size="sm"
              className="mt-2 min-h-20 resize-y"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="例如：不要太煽情；保留第一段；语气更克制；不要强行升华"
              maxLength={1000}
            />
          </label>

          <Button
            variant="primary"
            className="w-full"
            disabled={busy || disabled}
            onClick={() => void onSubmit(options)}
          >
            <Sparkles className="size-4" />
            {busy ? "AI生成中…" : "AI生成"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
