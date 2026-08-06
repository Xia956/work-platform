import { describe, expect, it } from "vitest";
import { mergeVoiceTranscript } from "./voice-input-control";

describe("mergeVoiceTranscript", () => {
  it("replaces interim recognition with the browser's latest full result", () => {
    const results = [
      { isFinal: true, 0: { transcript: "今天想" } },
      { isFinal: false, 0: { transcript: "聊聊星座" } },
    ];

    expect(mergeVoiceTranscript("开场", results, 120)).toBe("开场\n今天想，聊聊星座");
  });

  it("adds a sentence ending after the final segment without replacing recognized punctuation", () => {
    expect(mergeVoiceTranscript("", [
      { isFinal: true, 0: { transcript: "你觉得呢？" } },
      { isFinal: true, 0: { transcript: "我觉得可以" } },
    ], 120)).toBe("你觉得呢？我觉得可以。");
  });
});
