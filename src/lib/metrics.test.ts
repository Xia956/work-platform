import { describe, expect, it } from "vitest";
import { calculateDelta, calculateRates } from "@/lib/metrics";

describe("metrics", () => {
  it("calculates rates from views", () => {
    expect(calculateRates({
      views: 1000,
      likes: 50,
      comments: 10,
      shares: 5,
      favorites: 20,
    })).toEqual({
      engagementRate: 6.5,
      favoriteRate: 2,
      shareRate: 0.5,
    });
  });

  it("does not divide by zero", () => {
    expect(calculateRates({ views: 0, likes: 0, comments: 0, shares: 0, favorites: 0 }).engagementRate).toBe(0);
  });

  it("calculates deltas and preserves missing baselines", () => {
    expect(calculateDelta(120, 100)).toBe(20);
    expect(calculateDelta(120, null)).toBeNull();
  });
});
