# UI-REDESIGN-DASHBOARD-1 Dashboard 重排报告

## 1. 阶段目标

本阶段按 Gemini 方案重排 `/dashboard`，把 Dashboard 从卡片和图表集合收口为更高信息密度、更扁平的 SaaS 工作台首页。

本阶段只调整 Dashboard 的前端 UI、排版和信息层级，不改业务逻辑、接口、路由、权限、数据结构和页面名称。

## 2. 当前项目状态

* 当前分支：`feat/ui-redesign-dashboard-1`
* 当前基点提交：`032e0d7 Merge branch 'feat/ui-redesign-system-1'`
* `.env` 数据库：`geo_workstation_aqa_chat_local_smoke`
* 是否触碰 official：否
* 是否跑 migration / seed / AI：否

## 3. Gemini 方案采纳范围

已采纳：

* 顶部极简化，只保留页面标题、统计范围、全局 smoke 提示和刷新状态。
* KPI 低高度化，去掉进度条和重复测试标识。
* 核心执行区改为左侧趋势、右侧本轮结论和高优待办。
* 次级数据下沉到第二屏，包括模型对比、未推荐原因、场景词、TOP5、动态和辅助统计。
* QuickActionGrid 继续降级为底部轻量处理入口。
* 面板保持小圆角、浅边框、无阴影和克制蓝灰色。

未采纳或暂缓：

* 不重写 Dashboard 全部数据逻辑，避免破坏现有接口和计算口径。
* 不新增真实 AI Visibility 指标重算。
* 不新增图表依赖。
* 不改其他页面的大结构，主流程和复盘页面重排留到后续阶段。

## 4. Dashboard 结构调整

### 顶部区

* 标题区压缩为 `工作台 / AI 可见度驾驶舱 / 统计范围`。
* 全局只保留一条 `本地 smoke 数据 · 非正式线上结论` 提示。
* 刷新按钮和最近刷新时间保留在右侧。

### KPI 区

* 保留 5 个核心指标：品牌推荐率、品牌提及率、官网引用率、竞品占位率、待补救问题。
* KPI 从厚重卡片改为低高度数据面板。
* 每项只显示指标名、核心数值和一句短状态。

### 核心执行区

* 左侧展示 AI 可见度趋势，趋势图横向拉长并降低高度。
* 右侧展示本轮结论和高优待办。
* 待办改为一行式操作列表，包含补问法、补证据、补文章、复盘模型。

### 次级数据区

* 模型推荐对比、未推荐原因分布、高频问法 / 场景词下沉到首屏之后。
* 未覆盖问题 TOP5、知识库缺口 TOP5、最近动态继续作为辅助信息。
* 辅助统计和处理入口保留在底部，不抢首屏主线。

## 5. 保留的业务能力

以下原有能力均保留：

* KPI 指标入口。
* AI 可见度趋势图。
* 模型推荐对比。
* 未推荐原因分布。
* 高频问法 / 场景词。
* 未覆盖问题 TOP5。
* 知识库缺口 TOP5。
* 最近动态。
* 辅助统计。
* 处理入口。

## 6. 截图与走查

截图路径：

* `tmp/ui-redesign-dashboard-1/dashboard-1440.png`
* `tmp/ui-redesign-dashboard-1/dashboard-1280.png`
* `tmp/ui-redesign-dashboard-1/dashboard-first-screen-1440.png`
* `tmp/ui-redesign-dashboard-1/dashboard-first-screen-1280.png`

对比参考图：

* `tmp/gemini-ui-redesign-10-image-pack-1/images/01-dashboard.png`
* `tmp/geo-mvp-simplify-visual-rework/dashboard-1280.png`

走查页面：

* `/dashboard`
* `/geo-prompts`
* `/evidence-citations`
* `/competitor-occupancy`
* `/help`

走查结果：

* `/dashboard` 能正常打开。
* 1280 / 1440 宽视口未发现横向溢出。
* 页面未发现 `undefined/null/NaN`。
* 控制台未发现红色错误。
* Dashboard 首屏肉眼可见更像生产力工具：KPI 更紧凑，左侧主趋势更明确，右侧待办更像操作指令。
* 次级模块已下沉，QuickActionGrid 未抢占首屏主线。
* 其他走查页面可正常打开，未发现本阶段改动造成的布局异常。

## 7. 暂缓项

* 主流程页面重排。
* 复盘页面重排。
* 首页 / 登录页重设计。
* Dashboard 与真实 AI Visibility 口径正式联动。
* 真实 AI 端到端验收。

## 8. 验证结果

已执行：

```bash
git diff --check
pnpm --filter @geo-workstation/web typecheck
pnpm --filter @geo-workstation/web lint
pnpm --filter @geo-workstation/api lint
```

结果：全部通过。

## 9. 下一步建议

1. `UI-REDESIGN-CORE-PAGES-1`：统一提示词库、知识库、发布文章和模型覆盖记录的主流程页面结构。
2. `UI-REDESIGN-REVIEW-PAGES-1`：统一引用证据中心和竞品占位原因的复盘页结构。
3. `UI-REDESIGN-HOME-LOGIN-1`：如后续需要对外演示，再单独重做首页 / 登录页。

最终仍必须另开 `REAL-AI-END-TO-END-VALIDATION-1` 使用真实 AI 跑完整链路；本阶段未触发真实 AI。
