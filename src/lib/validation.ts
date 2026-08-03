import { z } from "zod";
import {
  ctaTypeValues,
  optimizationGoalValues,
  rewriteLevelValues,
} from "@/lib/script-ai";

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", {
  message: "只支持 HTTPS 链接",
});

export const inspirationSchema = z.object({
  title: z.string().trim().min(1, "请输入灵感标题").max(120),
  content: z.string().trim().max(5000).default(""),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).default([]),
  workflow_stage: z.enum(["idea", "rough_draft", "ai_optimized", "ready", "published"]).optional(),
  status: z.enum(["inbox", "developing", "converted", "archived"]).default("inbox"),
});

export const topicSchema = z.object({
  title: z.string().trim().min(1, "请输入选题标题").max(160),
  angle: z.string().trim().max(500).nullable().optional(),
  audience: z.string().trim().max(200).nullable().optional(),
  pain_point: z.string().trim().max(500).nullable().optional(),
  keywords: z.array(z.string().trim().min(1).max(24)).max(15).default([]),
  priority: z.number().int().min(1).max(5).default(3),
  status: z.enum(["backlog", "ready", "drafting", "completed", "published", "archived"]).default("backlog"),
  inspiration_id: z.string().uuid().nullable().optional(),
});

export const roughDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  topicId: z.string().uuid().nullable().optional(),
  content: z.string().trim().min(10, "粗稿至少需要 10 个字").max(20000),
  targetDuration: z.number().int().min(15).max(600).default(60),
});

export const optimizeSchema = z.object({
  scriptId: z.string().uuid(),
  sourceVersionId: z.string().uuid().nullable().default(null),
  rewriteLevel: z.enum(rewriteLevelValues).default("minimal"),
  targetDuration: z.union([z.literal(30), z.literal(60), z.literal(90), z.null()]).default(null),
  goals: z.array(z.enum(optimizationGoalValues)).max(optimizationGoalValues.length).default([]),
  ctaType: z.enum(ctaTypeValues).nullable().default(null),
  instruction: z.string().trim().max(1000).default(""),
  applyResult: z.boolean().default(false),
}).superRefine((value, context) => {
  if (value.goals.includes("cta") && !value.ctaType) {
    context.addIssue({
      code: "custom",
      path: ["ctaType"],
      message: "选择结尾 CTA 后需要指定 CTA 类型",
    });
  }
});

export const benchmarkUrlSchema = z.object({
  url: z.string().trim().min(1, "请粘贴抖音链接或分享文案").max(4096),
});

export const publicationSchema = z.object({
  title: z.string().trim().min(1).max(160),
  script_id: z.string().uuid().nullable().optional(),
  script_version_id: z.string().uuid().nullable().optional(),
  video_url: httpsUrl.nullable().optional().or(z.literal("")),
  published_at: z.string().datetime(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export function safeNextPath(value?: string) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/dashboard";
  }
  return value;
}

export function safeAuthTokenHash(value?: string) {
  if (!value || value.length < 32 || value.length > 512) return null;
  return /^[A-Za-z0-9_-]+$/.test(value) ? value : null;
}
