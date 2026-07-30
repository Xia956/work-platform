import { describe, expect, it } from "vitest";
import { completeEmailAuth, parseEmailAuthHash } from "@/lib/email-auth";

describe("email auth redirect", () => {
  it("routes a recovery session to the password form", () => {
    expect(
      parseEmailAuthHash(
        "https://example.com/login?next=%2Fcontent#access_token=access&refresh_token=refresh&type=recovery",
      ),
    ).toEqual({
      kind: "session",
      accessToken: "access",
      refreshToken: "refresh",
      authType: "recovery",
      destination: "/update-password?next=%2Fcontent",
    });
  });

  it("routes signup confirmation to its intended page", () => {
    const parsed = parseEmailAuthHash(
      "https://example.com/auth/complete?next=%2Fcontent#access_token=access&refresh_token=refresh&type=signup",
    );
    expect(parsed.kind).toBe("session");
    if (parsed.kind === "session") expect(parsed.destination).toBe("/content");
  });

  it("rejects unsafe next paths", () => {
    const parsed = parseEmailAuthHash(
      "https://example.com/login?next=%2F%2Fevil.example#access_token=access&refresh_token=refresh&type=recovery",
    );
    expect(parsed.kind).toBe("session");
    if (parsed.kind === "session") {
      expect(parsed.destination).toBe("/update-password?next=%2Fdashboard");
    }
  });

  it("recognizes expired email links", () => {
    expect(
      parseEmailAuthHash(
        "https://example.com/login#error=access_denied&error_description=Link+expired",
      ),
    ).toEqual({
      kind: "error",
      message: "邮件链接无效或已过期，请使用最新一封邮件。",
    });
  });

  it("completes a recovery redirect without relying on the requesting browser", async () => {
    const received: Array<{ access_token: string; refresh_token: string }> = [];
    const result = await completeEmailAuth(
      "https://example.com/login?next=%2Fcontent#access_token=access&refresh_token=refresh&type=recovery",
      async (tokens) => {
        received.push(tokens);
        return { error: null };
      },
    );
    expect(received).toEqual([
      { access_token: "access", refresh_token: "refresh" },
    ]);
    expect(result).toEqual({
      kind: "complete",
      destination: "/update-password?next=%2Fcontent",
    });
  });

  it("surfaces a rejected recovery token without showing password errors", async () => {
    const result = await completeEmailAuth(
      "https://example.com/login#access_token=bad&refresh_token=bad&type=recovery",
      async () => ({ error: new Error("invalid token") }),
    );
    expect(result).toEqual({
      kind: "error",
      message: "邮件链接无效或已过期，请使用最新一封邮件。",
    });
  });
});
