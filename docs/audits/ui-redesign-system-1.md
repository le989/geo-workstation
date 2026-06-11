# UI-REDESIGN-SYSTEM-1 全局视觉系统去脂报告

## 1. 阶段目标

本阶段按 Gemini 给出的整体方向建立全局视觉底座，让 GEO 工作站从厚重后台模板感转向更扁平、更克制的 SaaS 工具感。

本阶段只调整前端视觉 token、基础控件样式和少量页面样式，不改业务逻辑、接口、路由、权限、数据结构和页面名称。

## 2. 当前项目状态

* 当前分支：feat/ui-redesign-system-1
* 当前提交：80794d5
* `.env` 数据库：geo_workstation_aqa_chat_local_smoke
* 是否触碰 official：否
* 是否跑 migration / seed / AI：否

## 3. Gemini 方案采纳范围

已采纳：

* 冷灰 / 白底 / 克制蓝作为主视觉。
* 小圆角和 1px 浅边框作为主要层级。
* 主卡片去阴影，减少浮层感。
* 表格和列表更紧凑，降低行高和字重。
* 标签、按钮、页面头和空状态视觉更克制。
* Dashboard、引用证据中心、竞品占位原因、提示词库、帮助页做少量可见样式触碰。

暂不采纳：

* 不做全局正则替换所有圆角、阴影和说明文字，避免误伤旧页面和弹层。
* 不删除所有顶部说明，保留 smoke、轻量推断、待人工确认等必要边界。
* 不重写所有页面结构，Dashboard 全量重排留到后续阶段。
* 不删除核心业务能力，不改接口和数据模型。

## 4. Design Token 修改

在 `apps/web/src/style.css` 中新增或调整：

* 背景：`--bg-app`、`--bg-surface`、`--bg-hover`、`--bg-element`
* 文字：`--text-primary`、`--text-regular`、`--text-muted`
* 品牌色：`--brand-primary`
* 边框：`--border-light`、`--border-focus`
* 圆角：`--radius-sm`、`--radius-md`、`--radius-lg`
* 间距：`--space-xs`、`--space-sm`、`--space-md`、`--space-lg`
* 阴影：`--shadow-none`、`--shadow-sm`、`--shadow-dropdown`

同时将现有 `--geo-*` 变量逐步映射到新的冷灰、白底、克制蓝体系。

## 5. 通用组件样式修改

* 页面容器：新增 `.page-container`，统一浅冷灰背景。
* 扁平面板：新增 `.surface-panel` 和 `.surface-panel--compact`。
* 表格：新增 `.data-table`，并收紧 Element Plus 表格行高和表头字重。
* 标签：新增 `.status-tag`，并降低 `el-tag` 的圆角和字重。
* 按钮：新增 `.btn-primary` / `.btn-secondary`，并统一 `el-button` 基础圆角和主按钮蓝色。
* 空状态：降低图标尺寸、面板 padding 和圆角。
* 页面头：压缩 padding、去阴影、去渐变，保留必要说明。
* 应用壳：侧边栏和顶部 header 去浮层阴影，内容区改为纯浅灰背景。

## 6. 页面轻触碰清单

* Dashboard：降低 header、KPI、面板、动作条、辅助统计、处理入口的圆角和阴影。
* Geo Prompts：资产卡和业务价值摘要条去阴影，标签样式更克制。
* Evidence Citations：英雄区、概览卡、证据链卡、状态行和动作链接改为浅边框扁平样式。
* Competitor Occupancy：英雄区、概览卡、分布条、复盘卡和动作链接改为浅边框扁平样式。
* Help：去除渐变顶条和厚重卡片阴影，目录和帮助卡改为轻量边框。
* Knowledge Bases / Geo Content / Model Inclusion Records：通过末层明确选择器覆盖旧的页面壳、筛选面板和表格容器样式，但不改页面结构和业务操作。

## 7. 截图与走查

截图路径：

* `tmp/ui-redesign-system-1/dashboard-1440.png`
* `tmp/ui-redesign-system-1/geo-prompts-1440.png`
* `tmp/ui-redesign-system-1/evidence-citations-1440.png`
* `tmp/ui-redesign-system-1/competitor-occupancy-1440.png`
* `tmp/ui-redesign-system-1/help-1440.png`

走查页面：

* `/dashboard`
* `/geo-prompts`
* `/evidence-citations`
* `/competitor-occupancy`
* `/help`
* `/knowledge-bases`
* `/geo-content`
* `/model-inclusion-records`

走查结果：

* 页面均能正常打开。
* 1440 宽视口未发现横向溢出。
* 未发现 `undefined/null/NaN`。
* 当前选中走查页未发现红色控制台错误。
* 页面功能入口仍可见，未触发新增、生成、联网检测、发布、AI 调用或保存动作。

## 8. 暂缓项

* Dashboard 全量重排。
* 主流程列表页结构重排。
* 复盘页横向条形图和列表密度进一步重做。
* 登录页 / 首页完整重设计。
* 真实 AI 端到端验收。

## 9. 验证结果

已执行：

```bash
git diff --check
# 通过

pnpm --filter @geo-workstation/web typecheck
# 通过

pnpm --filter @geo-workstation/web lint
# 通过

pnpm --filter @geo-workstation/api lint
# 通过
```

## 10. 下一步建议

1. UI-REDESIGN-DASHBOARD-1：优先继续重排 Dashboard 信息架构。
2. UI-REDESIGN-CORE-PAGES-1：统一提示词库、知识库、发布文章、模型覆盖记录的列表页结构。
3. UI-REDESIGN-REVIEW-PAGES-1：统一引用证据中心和竞品占位原因的复盘页结构。
