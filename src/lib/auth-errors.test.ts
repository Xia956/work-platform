import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "@/lib/auth-errors";

describe("getAuthErrorMessage", () => {
  it("explains email rate limits", () => {
    expect(getAuthErrorMessage({ code: "over_email_send_rate_limit", status: 429 }))
      .toContain("发送过于频繁");
  });

  it("explains unauthorized default-SMTP recipients", () => {
    expect(getAuthErrorMessage({ code: "email_address_not_authorized", status: 400 }))
      .toContain("默认邮件服务不允许");
  });

  it("keeps unknown failures generic", () => {
    expect(getAuthErrorMessage({ code: "unexpected_failure", status: 500 }))
      .toBe("登录邮件发送失败，请稍后重试。");
  });

  it("guides existing magic-link users when password login fails", () => {
    expect(getAuthErrorMessage({ code: "invalid_credentials" }, "password"))
      .toContain("首次设置密码");
  });

  it("does not send password recovery errors back into the same loop", () => {
    expect(getAuthErrorMessage({ code: "invalid_credentials" }, "update"))
      .toContain("重置的登录状态已失效");
  });

  it("uses action-specific fallback messages", () => {
    expect(getAuthErrorMessage({ code: "unexpected_failure" }, "register"))
      .toBe("注册失败，请稍后重试。");
  });
});
