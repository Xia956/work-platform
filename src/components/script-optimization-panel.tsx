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
  onSubmit,
  onOptionsChange,
  className,
}: {
  defaultDuration: number;
  busy: boolean;
  disabled?: boolean;
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
    <div className={cn("rounded-lg border border-[#ead2c8] bg-[#fff8f4]", className)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="min-w-0">
          <span className="flex items-center gap-2 text-sm font-semibold">
            <Bot className="size-4 text-[#b9573a]" />
            AI 文案优化
          </span>
          {!expanded ? (
            <span className="mt-1 block truncate text-xs text-[#8a756c]">
              {buildOptimizationSummary(options)}
            </span>
          ) : null}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-[#8d746b] transition-transform", expanded && "rotate-180")}
        />
      </button>

      {expanded ? (
        <div className="space-y-4 border-t border-[#efdcd5] p-4">
          <fieldset>
            <legend className="text-xs font-semibold text-[#5c514b]">改写程度</legend>
            <div className="mt-2 grid gap-2">
              {rewriteLevelValues.map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rewriteLevel === value}
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-left transition-colors",
                    rewriteLevel === value
                      ? "border-[#c77a62] bg-white shadow-[0_0_0_1px_rgb(185_87_58/8%)]"
                      : "border-[#e4d8d0] bg-[#fffdfb] hover:border-[#cfa08f]",
                  )}
                  onClick={() => setRewriteLevel(value)}
                >
                  <span className="flex items-center justify-between gap-2 text-xs font-semibold text-[#554a44]">
                    {rewriteLevelLabels[value]}
                    {rewriteLevel === value ? <Check className="size-3.5 text-[#b9573a]" /> : null}
                  </span>
                  <span className="mt-1 block text-xs leading-5 text-[#8b7e76]">
                    {rewriteDescriptions[value]}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold text-[#5c514b]">目标时长</legend>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {durationOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  role="radio"
                  aria-checked={targetDuration === option.value}
                  className={cn(
                    "script-optimization-duration-option min-h-9 rounded-md border px-2 py-2 font-semibold transition-colors",
                    targetDuration === option.value
                      ? "border-[#c77a62] bg-[#b9573a] text-white"
                      : "border-[#e2d5cd] bg-white text-[#6e615a] hover:border-[#cfa08f]",
                  )}
                  onClick={() => setTargetDuration(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-xs font-semibold text-[#5c514b]">本次需要（可多选）</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {optimizationGoalValues.map((goal) => {
                const selected = goals.includes(goal);
                return (
                  <button
                    key={goal}
                    type="button"
                    role="checkbox"
                    aria-checked={selected}
                    className={cn(
                      "script-optimization-goal-option inline-flex min-h-8 items-center gap-1 rounded-full border px-2.5 py-1.5 font-semibold transition-colors",
                      selected
                        ? "border-[#c77a62] bg-[#ead9d1] text-[#804533]"
                        : "border-[#dfd3cb] bg-white text-[#6f645d] hover:border-[#cfa08f]",
                    )}
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
              <legend className="text-xs font-semibold text-[#5c514b]">CTA 类型</legend>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ctaTypeValues.map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={ctaType === value}
                    className={cn(
                      "script-optimization-cta-option rounded-full border px-2.5 py-1.5 transition-colors",
                      ctaType === value
                        ? "border-[#c77a62] bg-[#b9573a] font-medium text-white"
                        : "border-[#dfd3cb] bg-white text-[#6f645d]",
                    )}
                    onClick={() => setCtaType(value)}
                  >
                    {ctaTypeLabels[value]}
                  </button>
                ))}
              </div>
            </fieldset>
          ) : null}

          <label className="block">
            <span className="text-xs font-semibold text-[#5c514b]">补充要求（可选）</span>
            <textarea
              className="field script-optimization-instruction mt-2 min-h-20 resize-y leading-5"
              value={instruction}
              onChange={(event) => setInstruction(event.target.value)}
              placeholder="例如：不要太煽情；保留第一段；语气更克制；不要强行升华"
              maxLength={1000}
            />
          </label>

          <button
            type="button"
            className="btn-primary w-full"
            disabled={busy || disabled}
            onClick={() => void onSubmit(options)}
          >
            <Sparkles className="size-4" />
            {busy ? "AI生成中…" : "AI生成"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
