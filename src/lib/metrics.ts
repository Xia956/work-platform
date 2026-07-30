import type { MetricSnapshot } from "@/lib/types";

export function calculateRates(
  snapshot: Pick<MetricSnapshot, "views" | "likes" | "comments" | "shares" | "favorites">,
) {
  const base = Math.max(snapshot.views, 1);
  return {
    engagementRate: ((snapshot.likes + snapshot.comments + snapshot.shares) / base) * 100,
    favoriteRate: (snapshot.favorites / base) * 100,
    shareRate: (snapshot.shares / base) * 100,
  };
}

export function calculateDelta(current: number, previous?: number | null) {
  return previous == null ? null : current - previous;
}
