# 口播台设计系统

本文件是口播台所有页面与组件的长期视觉规范。新增或修改 UI 前必须完整阅读本文件，并优先使用 `src/app/globals.css` 中的语义 token、语义类和 `src/components/ui/` 中的基础组件。

## 1. 设计方向

口播台采用温暖、克制、带编辑纸张感的创作工作台风格。全站颜色继续沿用当前的暖米白画布、纸张白卡片和低饱和品牌红。AI 文案优化区域是结构、密度、边框、控件和交互层级的参考，但它的浅粉色背景是 AI 场景专属强调色，不得扩散到普通页面或普通卡片。

设计原则：

1. 内容优先：控件为创作流程服务，不使用高噪声装饰。
2. 层级明确：一个区域只保留一个主操作；后续流程使用次级按钮或文字操作。
3. 暖色克制：品牌红只用于主操作、当前状态和关键提示。
4. 纸张质感：卡片依靠浅色表面、细边框和极轻阴影区分，不使用重阴影。
5. 移动优先：430px 宽度下不得出现文字挤压、按钮换行或底部导航遮挡。

## 2. Token 来源

所有实现 token 位于 `src/app/globals.css`：

- CSS 变量：`--ds-*`
- Tailwind 主题别名：`canvas`、`surface`、`surface-muted`、`brand`、`ink`、`ink-muted`、`line` 等
- 语义类：`.type-*`、`.ui-*`

不得在页面组件中新写十六进制颜色、任意字号（如 `text-[13px]`）、任意圆角或任意阴影。确需新增时，先补充 token 与本文档。

## 3. 色彩

| 语义 | Token | 用途 |
| --- | --- | --- |
| 页面画布 | `--ds-color-canvas` | 全局背景 |
| 主表面 | `--ds-color-surface` | 卡片、弹层、输入框 |
| 次表面 | `--ds-color-surface-muted` | 分组背景、摘要块 |
| AI 表面 | `--ds-color-surface-ai` | AI 文案优化区域 |
| AI 强表面 | `--ds-color-surface-ai-raised` | AI 区域内选择卡片 |
| AI 边框 | `--ds-color-ai-line*` | AI 区域边框、分隔和选择状态 |
| AI 文字 | `--ds-color-ai-ink*` | AI 区域标题、说明和弱文字 |
| 主文字 | `--ds-color-ink` | 标题、正文 |
| 反色文字 | `--ds-color-ink-inverse` | 品牌色深底上的文字和图标 |
| 次文字 | `--ds-color-ink-muted` | 描述、说明 |
| 弱文字 | `--ds-color-ink-subtle` | 时间、计数、辅助提示 |
| 默认边框 | `--ds-color-line` | 卡片、控件 |
| 强边框 | `--ds-color-line-strong` | hover、强调边界 |
| 品牌色 | `--ds-color-brand` | 主按钮、当前状态 |
| 品牌 hover | `--ds-color-brand-strong` | 主按钮 hover |
| 品牌浅底 | `--ds-color-brand-soft` | 选中项、标签 |
| 成功色 | `--ds-color-success` | 成功与完成状态 |
| 危险色 | `--ds-color-danger` | 删除与不可逆提示 |

禁止使用纯黑作为大面积底色；禁止新增高饱和蓝紫色。浏览器焦点环可使用系统蓝，但组件自身选中态使用品牌色。

## 4. 字体与排版

正文统一使用 Noto Sans SC / PingFang SC。编辑型大标题使用宋体回退栈 `.editorial-title`。

只允许以下层级：

| 层级 | 语义类 | 字号 / 行高 | 字重 |
| --- | --- | --- | --- |
| 页面主标题 | `.type-page-title` | 移动 30/38，桌面 38/46 | 700 |
| 模块标题 | `.type-section-title` | 20/28 | 600 |
| 卡片标题 | `.type-card-title` | 16/24 | 600 |
| 正文 | `.type-body` | 14/22 | 400 |
| 紧凑正文 | `.type-body-sm` | 13/20 | 400 |
| 辅助文字 | `.type-caption` | 12/18 | 400 |
| 标签文字 | `.type-label` | 12/16 | 600 |
| 眉题/微文案 | `.type-eyebrow` | 10/16 | 600，增加字距 |

规则：

- 页面组件不得新增字号。
- 按钮、输入框、下拉框默认使用 14px；紧凑控件使用 12px。
- 中文正文不使用 500 以上字重；标题和按钮最多 600，主页面标题可用 700。
- 正文避免 `leading-tight`；只允许表格中的既定行高。

## 5. 间距与布局

基础间距单位为 4px，仅使用：4、8、12、16、20、24、32、40、48。

- 移动端页面左右边距：12px（`.workspace-main`）。
- 桌面端页面左右边距：32px，超宽屏 48px。
- 卡片内边距：移动 16px，桌面 20px。
- 同一模块内部间距：8–12px。
- 模块之间：16px；页面区块之间：24–32px。
- 移动端底部安全区：`5.5rem + env(safe-area-inset-bottom)`。

不要通过负 margin 修正布局。内容密集区域优先换行或改为两层结构。

## 6. 圆角、边框和阴影

| 类型 | Token | 值 |
| --- | --- | --- |
| 小元素 | `--ds-radius-sm` | 6px |
| 控件 | `--ds-radius-control` | 8px |
| 卡片 | `--ds-radius-card` | 12px |
| 大卡片 | `--ds-radius-large` | 18px |
| 胶囊 | `--ds-radius-pill` | 999px |

- 默认边框为 1px `--ds-color-line`。
- hover 边框使用 `--ds-color-line-strong`。
- 卡片只使用 `--ds-shadow-card`；弹层使用 `--ds-shadow-popover`。
- 禁止新增页面级自定义 box-shadow。

## 7. 按钮

使用 `Button` 或 `buttonStyles`（`src/components/ui/button.tsx`）。

- 标准高度：42px；紧凑高度：36px；轻量内嵌图标按钮：32px，常规图标按钮：36px。
- 圆角：8px。
- 默认字号：14px；紧凑按钮：12px。
- 图标：标准 16px；紧凑 14px；图标与文字间距 8px。
- 每个模块最多一个 `primary` 主按钮。
- `secondary` 用于可逆操作；`ghost` 用于返回、收起等低层级操作；`danger` 仅用于删除。
- loading 文案必须保持按钮宽度尽量稳定。

## 8. 表单与选择控件

使用 `Input`、`Textarea`、`Select`、`FieldLabel`、`FieldHelp`。

- 标准高度：46px；紧凑高度：36px。
- 输入文字：14px；辅助输入和标签编辑：12px。
- 背景使用主表面，边框使用默认边框。
- focus 使用品牌边框与 3px 低透明度品牌色焦点环。
- textarea 最小高度按内容场景选择 80、128、192px，不随意新增。
- 正文与 AI 版本编辑器统一使用 `.ui-script-editor`：移动端 128px，桌面端 192px。
- 文本框内的单一轻量操作使用右下角图标按钮；编辑框增加操作安全留白，不再在外部重复显示同一操作。
- 原生 select 仅用于简单筛选；需要品牌化展开层时使用项目内 listbox。
- checkbox/radio 的卡片态使用 `.ui-choice-card`；胶囊态使用 `.ui-choice-chip`。

## 9. 卡片、标签和状态

- 标准卡片使用 `Card` / `.ui-card`。
- AI 区域使用 `tone="ai"` / `.ui-card--ai`。该 tone 只用于 AI 生成、AI 分析等明确的智能功能区域。
- 次级摘要使用 `.ui-card--muted`。
- 标签使用 `Badge`，只允许 `neutral`、`brand`、`success`、`warning` 四种 tone。
- 状态颜色必须同时配合文字，不以颜色作为唯一信息。

## 10. 导航

- 桌面侧栏宽 240px，固定在左侧。
- 移动底部导航左右 12px、底部 12px，使用主表面、1px 边框和轻阴影。
- 导航图标 16–18px；移动标签 10px，桌面标签 13px。
- 当前项使用品牌浅底、品牌色图标和文字，不使用纯黑底。

## 11. 响应式规则

- 以移动端为默认，`sm` 用于 640px 以上增强，`md` 用于桌面导航切换，`xl` 用于内容库双栏。
- 两个以上操作在移动端优先使用等宽网格；信息摘要与操作按钮不得强塞同一行。
- 重要文本不得依赖 `truncate` 隐藏关键设置；可将摘要独立成块。
- 固定底部导航上方必须保留 `.mobile-safe-bottom`。
- 交互目标最小 32px；主要按钮最小 42px。

## 12. 可复用组件

基础组件位于 `src/components/ui/`：

- `Button` / `buttonStyles`
- `Input`、`Textarea`、`Select`、`FieldLabel`、`FieldHelp`
- `Card`
- `Badge`

页面级通用组件继续使用 `PageHeader`、`EmptyState`。新增页面先组合这些组件，不能复制一组新的 className 重新设计。

## 13. AI 文案优化区域

AI 区域是全站密度和控件状态的参考实现，但不是全站颜色模板：

- 浅暖粉表面与品牌浅边框。
- 浅暖粉只用于 AI 区域；其他卡片继续使用纸张白或暖米白。
- 区域标题 14px/600；字段标题 12px/600；说明文字 12px/18。
- 选择卡片之间 8px；模块之间 16px。
- 时长、目标与 CTA 选项统一 12px。
- AI 生成是区域唯一主按钮。
- “本次优化基于”属于 AI 参数，放在 AI 文案优化面板内部并位于改写程度之前。
- AI 版本摘要在移动端独立成行；版本切换按钮等宽排列。
- AI 版本统一命名为“AI 优化稿 · 第 N 版”，不混用 `V3`、`AI V3` 等写法。

## 14. 开发与评审清单

提交 UI 修改前检查：

- [ ] 已完整阅读本文件。
- [ ] 未新增任意字号、十六进制颜色、圆角或阴影。
- [ ] 使用语义 token 或基础组件。
- [ ] 模块中只有一个主按钮。
- [ ] 430px 移动端无挤压、遮挡和关键文本截断。
- [ ] 桌面端内容宽度与侧栏关系正常。
- [ ] hover、focus、disabled、selected 状态齐全。
- [ ] `npm run lint`、`npm run typecheck`、相关测试通过。
