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
      optimizationType: "hook",
      instruction: "",
    }).success).toBe(false);
  });

  it("validates publication links and timestamps", () => {
    expect(publicationSchema.safeParse({
      title: "发布记录",
      video_url: "javascript:alert(1)",
      published_at: new Date().toISOString(),
    }).success).toBe(false);
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
