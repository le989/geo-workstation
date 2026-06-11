# GEO-MVP-SIMPLIFY-VISUAL-REWORK-1 页面简洁化可见效果返工报告

## 1. 阶段目标

本阶段不新增功能，只解决 `GEO-MVP-SIMPLIFY-1` 视觉变化不明显的问题。重点让 Dashboard、问法库、引用证据中心、竞品占位原因和帮助页在 1280 宽视口下更干净、更轻、更容易扫读。

## 2. 当前项目状态

- 当前分支：`feat/geo-mvp-simplify-visual-rework-1`
- 当前基点提交：`dd40160 Merge branch 'feat/geo-mvp-simplify-1'`
- `.env` 数据库：`geo_workstation_aqa_chat_local_smoke`
- 是否触碰 official：否
- 是否跑 migration / seed / AI：否

## 3. 改前问题

- 不是缓存或旧前端问题，页面已加载最新代码。
- 上一阶段改动存在，但主要是文案、入口和提示降噪，肉眼变化不够明显。
- Dashboard 首屏仍有较多卡片和辅助信息，主结论不够聚焦。
- 引用证据中心和竞品占位原因页面概览卡偏多，列表默认展示字段偏重。
- Help 首屏内容仍偏大百科，快速路径不够轻。

## 4. 返工策略

- Dashboard 首屏压缩为紧凑 KPI、本轮结论、下一步动作和一个主趋势图。
- KPI 降低卡片高度，移除重复的模块内提示。
- 下一步动作轻量化，减少大段说明。
- 模型对比、原因分布、标签云、TOP5、最近动态和辅助统计继续下沉。
- 引用证据中心与竞品占位原因概览从 5 项压缩到 3 项。
- 复盘页长文本和次级字段默认下沉到展开区。
- Help 将 SOP 细节默认折叠，快速开始改为紧凑网格。
- 用全局轻提示保留 smoke / 轻量推断边界，不在每个模块重复强调。

## 5. 修改清单

### Dashboard

- KPI 卡片改为更低高度的紧凑指标卡。
- 移除 KPI 卡片内重复的 `查看详情`。
- 本轮结论文案收短，下一步动作去掉长说明。
- 下一步动作改成两列轻量行动条。
- 首屏主图表只保留 AI 可见度趋势，其他分析继续下沉。

### Geo Prompts

- 页面间距和顶部区域压缩。
- 业务价值摘要卡降为更轻的统计条。
- 问法类型、业务价值、购买阶段标签去掉重复前缀，只保留关键信息。
- 标签尺寸和间距降低，避免列表挤压。

### Evidence Citations

- 顶部说明压缩为一句核心用途和一条轻量边界提示。
- 概览卡从 5 项压缩到 3 项：有证据支撑、缺证据、待人工确认。
- 默认列表优先展示问法、证据状态、文章状态、模型覆盖、主要缺口和下一步动作。
- 相关知识库、相关文章、模型记录、匹配关键词和轻量匹配说明下沉到展开区。
- 长标题和标签做截断 / 折行处理。

### Competitor Occupancy

- 顶部说明压缩为一句核心用途和一条轻量边界提示。
- 概览卡从 5 项压缩到 3 项：竞品占位问题、我方缺席问题、需补证据问题。
- 默认列表优先展示用户问法、竞品品牌、我方状态、占位原因和下一步动作。
- 回答摘要、证据缺口和检测时间下沉到展开区。
- 竞品标签和原因标签降低密度，避免一行堆满。

### Help

- 首屏保留快速查找、快速开始和常用边界。
- 快速开始从纵向步骤改为紧凑网格。
- SOP 细节默认折叠，避免首屏像大百科。
- 保留最终真实 AI 端到端验收说明，但不在本阶段展开执行。

### Navigation / Layout / Style

- 保留现有页面名称和导航分组，不新增页面入口。
- 统一重点页面的卡片 padding、间距、标签尺寸和长文本截断。
- 新增内联 SVG favicon，避免本地开发页出现 `/favicon.ico` 404 红色资源错误。

## 6. 截图与人工观察

- 改前截图目录：`tmp/geo-mvp-simplify-visual-check/`
- 改后截图目录：`tmp/geo-mvp-simplify-visual-rework/`
- Dashboard：肉眼可见 KPI 更矮、动作区更轻，辅助模块不再抢首屏。
- Geo Prompts：肉眼可见摘要区更矮、标签更短，整体变化中等但可见。
- Evidence Citations：肉眼可见从 5 概览卡降到 3 概览卡，细节默认折叠。
- Competitor Occupancy：肉眼可见从 5 概览卡降到 3 概览卡，默认列表更轻。
- Help：肉眼可见 SOP 细节折叠，快速开始更紧凑，不再像大百科。

## 7. 页面走查结果

- 走查页面：`/dashboard`、`/geo-prompts`、`/evidence-citations`、`/competitor-occupancy`、`/help`
- 1280 宽视口：未发现横向溢出。
- `undefined/null/NaN`：未发现直接显示。
- 控制台：业务页面未发现红色脚本错误；已补充 favicon，避免默认资源 404。
- 标签挤压：重点页面标签已降低密度并允许自然换行。
- 长文本：证据链和竞品复盘长内容已截断或下沉到展开区。

## 8. 暂缓项

- 新功能、筛选排序和人工确认。
- 真实 AI 端到端验收。
- 数据库存储业务价值 / 证据链 / 竞品占位。
- 外部平台接入。
- 自动发布。

## 9. 验证结果

- `git diff --check`：通过。
- `pnpm --filter @geo-workstation/web typecheck`：通过。
- `pnpm --filter @geo-workstation/web lint`：通过。
- `pnpm --filter @geo-workstation/api lint`：通过。

## 10. 下一步建议

1. `LOCAL-FULL-REGRESSION-CHECK-1`：做全站本地回归和页面操作核查。
2. `REAL-AI-END-TO-END-VALIDATION-PREP-1`：准备真实 AI 端到端验收清单和安全边界。
3. `GEO-PROMPT-VALUE-FILTER-SORT-1`：在需要时再做问法价值筛选排序，不建议现在继续堆复杂功能。

最终仍必须另开 `REAL-AI-END-TO-END-VALIDATION-1` 使用真实 AI 跑完整链路；本阶段未触发真实 AI。
