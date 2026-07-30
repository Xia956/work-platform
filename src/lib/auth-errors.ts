type AuthErrorLike = {
  code?: string;
  status?: number;
  message?: string;
};

type AuthContext = "email" | "password" | "register" | "recovery" | "update";

export function getAuthErrorMessage(error: AuthErrorLike, context: AuthContext = "email") {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "邮件发送过于频繁，请稍后再试。";
  }
  if (error.code === "email_address_invalid") {
    return "邮箱地址格式无效，请检查后重试。";
  }
  if (error.code === "email_address_not_authorized") {
    return "Supabase 默认邮件服务不允许向此地址发送，请改用项目成员邮箱或配置自定义 SMTP。";
  }
  if (error.code === "email_provider_disabled") {
    return "邮箱登录尚未启用，请检查 Supabase Auth 配置。";
  }
  if (error.code === "captcha_failed") {
    return "安全验证失败，请刷新页面后重试。";
  }
  if (
    error.code === "invalid_credentials" ||
    error.message?.toLowerCase().includes("invalid login credentials")
  ) {
    return "邮箱或密码不正确。若以前使用邮件链接登录，请点击“首次设置密码或忘记密码”。";
  }
  if (error.code === "email_not_confirmed") {
    return "邮箱还未验证，请先打开注册确认邮件。";
  }
  if (error.code === "user_already_exists" || error.message?.toLowerCase().includes("already registered")) {
    return "这个邮箱已经注册，请直接登录或找回密码。";
  }
  if (error.code === "weak_password") {
    return "密码强度不足，请设置至少 8 位且不易猜测的密码。";
  }
  if (error.code === "same_password") {
    return "新密码不能与当前密码相同。";
  }
  const fallback: Record<AuthContext, string> = {
    email: "登录邮件发送失败，请稍后重试。",
    password: "登录失败，请稍后重试。",
    register: "注册失败，请稍后重试。",
    recovery: "重置邮件发送失败，请稍后重试。",
    update: "密码保存失败，请稍后重试。",
  };
  return fallback[context];
}
