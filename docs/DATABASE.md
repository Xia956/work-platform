# 数据库结构

数据库定义以 `supabase/migrations/` 中的 SQL 为唯一事实来源。本文件用于帮助阅读，不替代迁移文件。

## 表关系

```text
auth.users
  ├─ creator_profiles
  ├─ inspirations ──► topics ──► scripts ──► script_versions
  │                                      └─► publications ──► metric_snapshots
  ├─ benchmark_sources ──► benchmark_accounts
  │                    └─► benchmark_videos
  └─ ai_runs
```

所有业务表都包含 `user_id`，并通过 RLS 约束为当前登录用户的数据。

## 表说明

| 表 | 用途 | 关键关系 |
| --- | --- | --- |
| `creator_profiles` | 单用户创作者定位与默认偏好 | `user_id` 唯一 |
| `inspirations` | 灵感、标签与流转状态 | 可转换为 `topics` |
| `topics` | 选题、受众、痛点、关键词和优先级 | 可关联一个灵感 |
| `scripts` | 文案容器、自动保存内容和当前版本 | 关联选题与当前版本 |
| `script_versions` | 不可原地覆盖的文案版本历史 | 关联父版本和文案 |
| `benchmark_sources` | 用户提交的原始抖音链接与解析状态 | 账号/视频解析入口 |
| `benchmark_accounts` | 对标账号结构化信息 | 一对一关联来源 |
| `benchmark_videos` | 对标视频信息、补充文本和 AI 拆解 | 一对一关联来源 |
| `publications` | 发布记录与实际使用的文案版本 | 关联文案及版本 |
| `metric_snapshots` | 不同时间点的视频数据快照 | 多对一关联发布记录 |
| `ai_runs` | AI 任务、结果、错误和 Token 使用记录 | 可关联任意业务实体 |

## 文案版本类型

| 值 | 含义 |
| --- | --- |
| `rough_draft` | 用户首次保存的原始粗稿 |
| `manual_edit` | 用户手动保存的新版本 |
| `ai_generated` | AI 从选题生成的全新文案 |
| `ai_optimized` | AI 基于指定历史版本优化 |
| `restored` | 从历史版本恢复后创建的新版本 |

## 主要数据库函数

| 函数 | 作用 |
| --- | --- |
| `create_script_with_draft` | 原子创建文案和原始粗稿 |
| `append_script_version` | 串行分配版本号并更新当前版本 |
| `create_script_from_ai` | 原子创建 AI 生成文案及首版本 |
| `convert_inspiration_to_topic` | 幂等地将灵感转换为选题 |
| `assert_owned_references` | 验证跨表引用属于同一用户 |

## 迁移顺序

迁移必须按文件名排序执行：

1. `202607280001_initial.sql`：表、索引、RLS、基础版本函数。
2. `202607280002_hardening.sql`：跨表所有权、追加式版本与事务函数加固。
3. `202607290003_fix_owned_references_trigger.sql`：修正通用触发器对不同表字段的安全读取。
4. `202607300004_demo_content.sql`：清理早期数据库演示数据。
5. `202607310005_content_workflow_stage.sql`：补充内容工作流阶段与兼容迁移。
6. `202607310006_ai_preview_versions.sql`：增加 AI 预览版本相关数据库能力。
7. `202607310007_mutable_primary_and_ai_versions.sql`：完善主文案及 AI 版本写入函数。
8. `202608040008_add_metric_bounce_rate.sql`：为发布数据快照增加跳出率。

不要修改已经应用的迁移。后续版本应新增时间戳递增的迁移文件。

## 数据约束

- 删除用户时，业务数据随 `auth.users` 级联删除。
- 文案版本号在同一文案内唯一。
- 同一用户的规范化对标链接保持唯一。
- 指标计数不得为负数。
- 跳出率与完播率限定为 `0–100`。
- `script_versions` 不向客户端开放更新和直接删除策略。
