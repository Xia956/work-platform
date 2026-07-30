# Supabase 数据目录

```text
supabase/
  migrations/
    202607280001_initial.sql
    202607280002_hardening.sql
    202607290003_fix_owned_references_trigger.sql
  seed.sql
```

## 使用规则

- `migrations/` 是数据库结构的唯一事实来源。
- 已上线的迁移只读；任何结构变更都新增迁移文件。
- 文件名使用 `YYYYMMDDHHMM_说明.sql`，保证执行顺序明确。
- `seed.sql` 当前刻意留空，生产数据只由认证用户创建。
- 不在 SQL 文件中写项目 URL、API Key、邮箱或其他环境专属值。

## 应用迁移

已连接 Supabase CLI 时：

```bash
supabase db push
```

没有 CLI 登录状态时，可以在 Supabase SQL Editor 中按文件名顺序逐个执行。

详细表结构见 [`docs/DATABASE.md`](../docs/DATABASE.md)。
