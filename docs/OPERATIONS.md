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
   - Redirect URLs 加入本地与生产 `/auth/callback` 和 `/auth/complete`。
3. 正式使用建议配置自定义 SMTP。

Supabase 默认 SMTP 有严格额度。项目的日常登录使用邮箱 + 密码，只有注册确认和找回密码需要发送邮件。生产环境建议配置自定义 SMTP，避免默认邮件额度影响新用户注册和密码找回。

为了让用户长期保持登录，请在 Auth 的 Sessions 设置中关闭不必要的固定时长、闲置超时和单会话限制，或按产品需要设置足够长的时间。客户端会通过 Proxy 自动刷新 Supabase 会话，认证 Cookie 使用 Supabase SSR 的长期有效期；用户主动退出、清除浏览器网站数据或 Supabase 侧会话限制仍会结束登录。

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
| 注册/重置邮件过期 | 是否使用最新邮件、Redirect URL 是否已加入允许列表、自定义 SMTP 是否正常 |
| 数据保存失败 | Supabase Postgres Logs、迁移是否全部应用 |
| AI 返回 401 | 登录会话是否有效 |
| AI 返回配置错误 | Vercel 的 `OPENAI_API_KEY` 与 `OPENAI_MODEL` |
| 构建失败 | 本地依次运行四项质量检查 |
