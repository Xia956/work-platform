# 部署与运维

## 环境变量

| 名称 | 范围 | 说明 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 浏览器与服务端 | Supabase 项目 URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | 浏览器与服务端 | Supabase publishable key |
| `OPENAI_API_KEY` | 仅服务端 | OpenAI API Key |
| `OPENAI_MODEL` | 仅服务端 | 当前 AI 模型 |

真实值只放在 `.env.local` 或 Vercel 环境变量中，禁止提交到 Git。

## Supabase

1. 按 `supabase/migrations/` 文件名顺序应用迁移。
2. Authentication → URL Configuration：
   - Site URL 设置为生产域名。
   - Redirect URLs 加入本地与生产 `/auth/callback`。
3. 正式使用建议配置自定义 SMTP。

Supabase 默认 SMTP 有严格额度，并且不允许编辑邮件模板。部分邮箱安全扫描器会预先访问 Magic Link，导致 `otp_expired`。项目包含 `/auth/confirm` 二次确认页；配置自定义 SMTP 后，可将 Magic Link 模板改为基于 `TokenHash` 的用户主动确认流程。

## Vercel

当前生产域名：

```text
https://work-platform-eight.vercel.app
```

部署前检查：

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

部署：

```bash
vercel deploy --prod
```

## PWA

- `public/sw.js` 只缓存静态外壳和离线页。
- 不缓存 `/api/`、认证页面或用户业务数据。
- 更新 Service Worker 后应验证离线页和版本更新提示。

## 故障定位

| 问题 | 首要检查 |
| --- | --- |
| 邮件发送失败 | Supabase Auth Logs、SMTP 配额 |
| `otp_expired` | 是否使用最新邮件、邮件安全预取、自定义 SMTP |
| 数据保存失败 | Supabase Postgres Logs、迁移是否全部应用 |
| AI 返回 401 | 登录会话是否有效 |
| AI 返回配置错误 | Vercel 的 `OPENAI_API_KEY` 与 `OPENAI_MODEL` |
| 构建失败 | 本地依次运行四项质量检查 |
