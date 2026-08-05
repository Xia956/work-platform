import { describe, expect, it } from "vitest";
import { mergeVoiceTranscript } from "./voice-input-control";

describe("mergeVoiceTranscript", () => {
  it("replaces interim recognition with the browser's latest full result", () => {
    const results = [
      { isFinal: true, 0: { transcript: "今天想" } },
      { isFinal: false, 0: { transcript: "聊聊星座" } },
    ];

    expect(mergeVoiceTranscript("开场", results, 120)).toBe("开场\n今天想聊聊星座");
  });
});
