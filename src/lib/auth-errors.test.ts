import { describe, expect, it } from "vitest";
import { getAuthErrorMessage } from "@/lib/auth-errors";

describe("getAuthErrorMessage", () => {
  it("explains email rate limits", () => {
    expect(getAuthErrorMessage({ code: "over_email_send_rate_limit", status: 429 }))
      .toContain("至少等待 60 秒");
  });

  it("explains unauthorized default-SMTP recipients", () => {
    expect(getAuthErrorMessage({ code: "email_address_not_authorized", status: 400 }))
      .toContain("默认邮件服务不允许");
  });

  it("keeps unknown failures generic", () => {
    expect(getAuthErrorMessage({ code: "unexpected_failure", status: 500 }))
      .toBe("登录邮件发送失败，请稍后重试。");
  });
});
