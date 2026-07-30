type AuthErrorLike = {
  code?: string;
  status?: number;
};

export function getAuthErrorMessage(error: AuthErrorLike) {
  if (error.code === "over_email_send_rate_limit" || error.status === 429) {
    return "发送过于频繁，请至少等待 60 秒后再试；默认邮件服务还可能已达到每小时额度。";
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
  return "登录邮件发送失败，请稍后重试。";
}
