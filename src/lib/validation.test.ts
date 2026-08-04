import { describe, expect, it } from "vitest";
import {
  inspirationSchema,
  optimizeSchema,
  publicationSchema,
  roughDraftSchema,
  safeAuthTokenHash,
  safeNextPath,
} from "@/lib/validation";

describe("validation", () => {
  it("requires a meaningful rough draft", () => {
    expect(roughDraftSchema.safeParse({
      title: "测试",
      topicId: null,
      content: "太短",
      targetDuration: 60,
    }).success).toBe(false);
  });

  it("normalizes inspiration defaults", () => {
    const parsed = inspirationSchema.parse({ title: " 一个想法 ", content: "", tags: [] });
    expect(parsed.title).toBe("一个想法");
    expect(parsed.status).toBe("inbox");
  });

  it("rejects invalid script version relationships at the API boundary", () => {
    expect(optimizeSchema.safeParse({
      scriptId: "not-a-uuid",
      sourceVersionId: crypto.randomUUID(),
      rewriteLevel: "minimal",
      targetDuration: 60,
      goals: ["hook"],
      ctaType: null,
      instruction: "",
    }).success).toBe(false);
  });

  it("requires a CTA type only when CTA is selected", () => {
    const identifiers = {
      scriptId: crypto.randomUUID(),
      sourceVersionId: crypto.randomUUID(),
    };
    expect(optimizeSchema.safeParse({
      ...identifiers,
      rewriteLevel: "natural",
      targetDuration: 90,
      goals: ["rhythm", "cta"],
      ctaType: "comment",
      instruction: "语气更克制",
    }).success).toBe(true);
    expect(optimizeSchema.safeParse({
      ...identifiers,
      rewriteLevel: "minimal",
      targetDuration: null,
      goals: ["cta"],
      ctaType: null,
      instruction: "",
    }).success).toBe(false);
    expect(optimizeSchema.safeParse({
      ...identifiers,
      rewriteLevel: "minimal",
      targetDuration: 30,
      goals: ["concise"],
      ctaType: null,
      instruction: "",
    }).success).toBe(true);
  });

  it("does not apply AI output to the main script unless explicitly requested", () => {
    const parsed = optimizeSchema.parse({
      scriptId: crypto.randomUUID(),
      sourceVersionId: crypto.randomUUID(),
    });
    expect(parsed.applyResult).toBe(false);
  });

  it("accepts the current primary draft as an AI optimization source", () => {
    const parsed = optimizeSchema.parse({
      scriptId: crypto.randomUUID(),
      sourceVersionId: null,
    });
    expect(parsed.sourceVersionId).toBeNull();
  });

  it("validates publication links and timestamps", () => {
    expect(publicationSchema.safeParse({
      title: "发布记录",
      video_url: "javascript:alert(1)",
      published_at: new Date().toISOString(),
    }).success).toBe(false);

    expect(publicationSchema.safeParse({
      title: "发布记录",
      video_url: "复制打开抖音，查看作品 https://v.douyin.com/example/",
      published_at: new Date().toISOString(),
    }).data?.video_url).toBe("https://v.douyin.com/example/");

    expect(publicationSchema.safeParse({
      title: "发布记录",
      video_url: " https://v.douyin.com/example/ ",
      published_at: new Date().toISOString(),
    }).data?.video_url).toBe("https://v.douyin.com/example/");

    const longUrl = `https://www.douyin.com/video/1234567890?${"source=publication-review&".repeat(100)}`;
    expect(longUrl.length).toBeGreaterThan(2048);
    expect(publicationSchema.safeParse({
      title: "发布记录",
      video_url: longUrl,
      published_at: new Date().toISOString(),
    }).success).toBe(true);

    expect(publicationSchema.safeParse({
      title: "发布记录",
      video_url: "https://v.douyin.com/a1B2c3/",
      published_at: new Date().toISOString(),
    }).success).toBe(true);

    expect(publicationSchema.safeParse({
      title: "发布记录",
      video_url: "4.10 复制打开抖音，看看【玖伍陆的作品】同时拥有青春和对青春的感受 # 青春一去不复返我们... https://v.douyin.com/QygLlpR7D7I/ o@d.At vse:/ :2pm 06/18",
      published_at: new Date().toISOString(),
    }).data?.video_url).toBe("https://v.douyin.com/QygLlpR7D7I/");
  });

  it("prevents protocol-relative login redirects", () => {
    expect(safeNextPath("/scripts")).toBe("/scripts");
    expect(safeNextPath("//evil.example")).toBe("/dashboard");
    expect(safeNextPath("/\\evil.example")).toBe("/dashboard");
  });

  it("only accepts bounded URL-safe authentication token hashes", () => {
    const tokenHash = "a".repeat(64);
    expect(safeAuthTokenHash(tokenHash)).toBe(tokenHash);
    expect(safeAuthTokenHash("too-short")).toBeNull();
    expect(safeAuthTokenHash(`${tokenHash}?redirect=https://evil.example`)).toBeNull();
  });
});
