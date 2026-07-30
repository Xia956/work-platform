import { indexedDB } from "fake-indexeddb";
import { beforeAll, describe, expect, it } from "vitest";
import {
  getQueuedInspirations,
  queueInspiration,
  removeQueuedInspirations,
} from "@/lib/offline-inspirations";

describe("offline inspiration queue", () => {
  beforeAll(() => {
    Object.defineProperty(globalThis, "indexedDB", {
      configurable: true,
      value: indexedDB,
    });
  });

  it("stores idempotently and removes synced records", async () => {
    const item = {
      id: crypto.randomUUID(),
      title: "离线灵感",
      content: "没有网络时也先记下来",
      tags: ["测试"],
      status: "inbox" as const,
      created_at: new Date().toISOString(),
    };
    await queueInspiration(item);
    await queueInspiration({ ...item, content: "更新后的本机内容" });

    const queued = await getQueuedInspirations();
    expect(queued.filter((entry) => entry.id === item.id)).toHaveLength(1);
    expect(queued.find((entry) => entry.id === item.id)?.content).toBe("更新后的本机内容");

    await removeQueuedInspirations([item.id]);
    expect((await getQueuedInspirations()).some((entry) => entry.id === item.id)).toBe(false);
  });
});
