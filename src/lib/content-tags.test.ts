import { describe, expect, it } from "vitest";
import { normalizeContentTags } from "@/lib/content-tags";

describe("normalizeContentTags", () => {
  it("trims, de-duplicates and removes leading hashes", () => {
    expect(normalizeContentTags([" 女性成长 ", "#MBTI", "mbti", ""])).toEqual([
      "女性成长",
      "MBTI",
    ]);
  });

  it("enforces the storage limits", () => {
    const tags = normalizeContentTags(
      Array.from({ length: 15 }, (_, index) => `${index}-${"很长".repeat(20)}`),
    );

    expect(tags).toHaveLength(12);
    expect(tags.every((tag) => tag.length <= 24)).toBe(true);
  });
});
