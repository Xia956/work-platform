# 系统架构

## 分层

```text
浏览器
  ├─ Next.js 页面与客户端组件
  ├─ Supabase 浏览器客户端（认证会话、RLS 数据访问）
  └─ PWA Service Worker / IndexedDB（仅离线灵感）
        │
        ▼
Next.js 服务端
  ├─ /api/data/*                 通用业务 CRUD
  ├─ /api/scripts               文案与版本事务
  ├─ /api/benchmarks/*          抖音公开链接导入与解析
  └─ /api/ai/*                  OpenAI 服务端调用
        │
        ├────────► OpenAI Responses API
        ▼
Supabase
  ├─ Auth                       邮箱登录与会话
  ├─ Postgres                   业务数据
  ├─ RLS                        用户级数据隔离
  └─ Database Functions         原子版本操作与灵感转选题
```

## 主要业务流

### 灵感到选题

1. 灵感写入 `inspirations`。
2. 用户触发转换后调用 `convert_inspiration_to_topic`。
3. 数据库事务创建 `topics` 记录并将灵感标记为 `converted`。
4. 相同灵感重复转换时返回已有选题，避免重复记录。

### 粗稿与版本

1. `create_script_with_draft` 同时创建 `scripts` 和第一个 `rough_draft` 版本。
2. 用户原始粗稿不会被原地覆盖。
3. 手动编辑、AI 生成、AI 优化和恢复操作均向 `script_versions` 追加版本。
4. `scripts.current_version_id` 指向当前版本，`parent_version_id` 保留版本来源关系。

### 对标资料

1. 用户只提交抖音账号或视频链接。
2. 服务端校验协议、域名、重定向与目标地址，防止 SSRF。
3. `benchmark_sources` 保存原始链接和解析状态。
4. 结构化结果分别进入 `benchmark_accounts` 或 `benchmark_videos`。
5. 文本不足时 AI 接口拒绝虚构完整拆解。

### 发布复盘

1. `publications` 绑定实际使用的文案和版本。
2. `metric_snapshots` 允许同一视频多次记录播放、互动、跳出率、完播率和观看时长。
3. 客户端计算互动率及区间增量。
4. AI 综合复盘同时读取数据快照与实际发布文案，数据与文案的关系只作为待验证假设。
5. AI 复盘结果与调用记录保存在 `ai_runs`。

## 安全边界

- OpenAI Key 仅存在于服务端环境变量。
- Supabase publishable key 可以进入浏览器，但所有业务表均依赖 RLS。
- 每条业务记录都带有 `user_id`。
- 外键所有权触发器防止跨用户关联记录。
- 文案版本对客户端保持追加式写入。
- 生产 CSP 不包含 `unsafe-eval`；该权限仅用于 Next.js 开发模式。
- PWA 不缓存认证页面、业务接口响应或用户数据。
