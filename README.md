# 口播台

面向抖音口播创作者的中文网页工作台。支持灵感、选题、粗稿与版本化文案、对标链接解析、AI 拆解、发布记录、数据快照和 AI 复盘。

生产环境：[https://work-platform-eight.vercel.app](https://work-platform-eight.vercel.app)

## 技术栈

- Next.js App Router、TypeScript、Tailwind CSS
- Supabase Auth、Postgres、Row Level Security
- OpenAI Responses API + Zod 结构化输出
- PWA Service Worker + IndexedDB 离线灵感
- Vitest、ESLint、TypeScript

## 本地启动

1. 安装依赖：

   ```bash
   npm install
   ```

2. 复制环境变量：

   ```bash
   cp .env.example .env.local
   ```

3. 创建 Supabase 项目，将 `NEXT_PUBLIC_SUPABASE_URL` 与项目的 publishable key 写入 `.env.local`。

4. 在 Supabase SQL Editor 按文件名顺序执行：

   - `supabase/migrations/202607280001_initial.sql`
   - `supabase/migrations/202607280002_hardening.sql`
   - `supabase/migrations/202607290003_fix_owned_references_trigger.sql`

   或使用已连接项目的 Supabase CLI：

   ```bash
   supabase db push
   ```

5. 登录默认使用 Supabase 邮箱登录链接。把本地与生产域名加入 Auth URL Configuration；部署后将 Site URL 更新为生产域名。

6. 设置 `OPENAI_API_KEY`。`OPENAI_MODEL` 默认使用 `gpt-5.6-sol`，可按账号可用模型修改。

7. 启动：

   ```bash
   npm run dev
   ```

未配置 Supabase 时，项目仍能构建并展示安全的待配置状态，不会使用浏览器假数据代替真实持久化。

## 核心数据规则

- 每张业务表都包含 `user_id` 并启用 RLS，认证用户只能访问自己的记录。
- 用户首次保存的粗稿写入 `script_versions`，类型为 `rough_draft`，后续优化只追加新版本。
- 文案版本号通过事务函数分配；恢复旧稿也会创建新的 `restored` 版本。
- 对标链接只允许已知抖音 HTTPS 域名，逐次校验重定向目标和 DNS 地址，并限制响应大小、跳转次数与超时。
- 对标解析只读取公开网页，不携带 Cookie，不模拟登录，不下载视频。
- 离线灵感使用客户端 UUID 幂等同步，服务端重复提交不会创建副本。

## 质量检查

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

## 部署到 Vercel

1. 将仓库导入 Vercel。
2. 为 Development、Preview 和 Production 配置：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `OPENAI_API_KEY`
   - `OPENAI_MODEL`
3. 在 Supabase Auth URL Configuration 中加入 Vercel 生产域名。
4. 重新部署。Vercel 会按标准 Next.js 项目自动构建。

PWA 安装需要 HTTPS；Vercel 生产与预览地址默认满足该条件。

## 目录说明

```text
src/app/                  Next.js 页面与服务端 API
src/components/           业务界面组件
src/lib/                  AI、Supabase、校验、解析和指标逻辑
supabase/migrations/      按时间顺序执行的数据库迁移
supabase/seed.sql         本地种子数据（当前刻意留空）
public/                   PWA 图标与 Service Worker
docs/                     架构、数据库和运维说明
```

进一步阅读：

- [系统架构](docs/ARCHITECTURE.md)
- [数据库结构](docs/DATABASE.md)
- [部署与运维](docs/OPERATIONS.md)
- [Supabase 目录说明](supabase/README.md)
