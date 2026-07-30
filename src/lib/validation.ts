import { z } from "zod";

const httpsUrl = z.string().url().refine((value) => new URL(value).protocol === "https:", {
  message: "只支持 HTTPS 链接",
});

export const inspirationSchema = z.object({
  title: z.string().trim().min(1, "请输入灵感标题").max(120),
  content: z.string().trim().max(5000).default(""),
  tags: z.array(z.string().trim().min(1).max(24)).max(12).default([]),
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
  sourceVersionId: z.string().uuid(),
  optimizationType: z.enum(["hook", "concise", "conversational", "rhythm", "cta", "custom"]),
  instruction: z.string().trim().max(1000).default(""),
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
