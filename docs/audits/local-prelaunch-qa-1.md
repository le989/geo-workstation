# LOCAL-PRELAUNCH-QA-1 本地测试版全站查缺补漏报告

## 1. 阶段目标

本阶段是本地测试版全站 QA，不是新增大功能。目标是在 smoke 数据库和本地服务下走查核心页面，确认页面能正常打开、页面目的清楚、空状态和提示文案专业，并用小范围低风险文案修复帮助运营人员顺着 GEO 闭环使用系统。

本阶段不做 Dashboard 大重构，不新增数据库字段，不接真实 AI，不做 official 操作，不做正式部署。

## 2. 当前项目状态

- 当前分支：`feat/local-prelaunch-qa-1`
- 当前提交基点：`b5e6564`
- `.env` 当前数据库：`geo_workstation_aqa_chat_local_smoke`
- 是否触碰 official：否
- 是否连接 / 读取 / 导出 / 修改 `geo_workstation_official`：否
- 是否跑 migration：否
- 是否 seed：否
- 是否触发真实 AI：否
- 是否改 Provider：否
- 是否改权限：否

本地服务状态：

- API：已在 `127.0.0.1:3000` 运行，`/api/health` 正常。
- Web：已在 `127.0.0.1:5173` 运行。
- 本阶段复用已有本地服务，没有新启动服务，也没有停止服务。

## 3. 走查范围

本阶段走查页面：

- `/dashboard`
- `/geo-prompts`
- `/knowledge-bases`
- `/geo-content`
- `/model-inclusion-records`
- `/geo-analysis`
- `/expansion`
- `/settings`
- `/help`

走查方式：

- 静态检查关键页面文件和帮助配置。
- 使用本地 Web 页面只读导航检查页面文本、关键标签、常用入口和控制台错误。
- 未点击保存、生成、导入、导出、删除、复测、发布、Provider 测试等写入或外部调用按钮。

## 4. 页面级检查结果

### `/dashboard`

- 页面是否正常：正常打开。
- 当前问题：上一阶段发现 Dashboard 仍有示例趋势 / 示例分布，容易被误解为正式结果；首屏“下一步动作”说明还可以更靠近 GEO 闭环。
- 已修复项：
  - 标题调整为“AI 可见度驾驶舱：查看品牌表现与下一步动作”。
  - 增加“本地测试版使用 smoke 数据”提示。
  - 将示例趋势 / 示例分布标签统一降噪为“测试示例”。
  - 今日待处理说明改为引导判断补问法、补证据、补文章或复盘模型覆盖。
- 暂缓项：不做 Dashboard 指标重排，不接真实周期趋势，不新增引用来源大盘。
- 后续建议：进入 `GEO-DASHBOARD-VISIBILITY-POLISH-1` 时再系统收口驾驶舱。

### `/geo-prompts`

- 页面是否正常：正常打开。
- 当前问题：已有问法类型，但列表说明对“问法类型”和后续动作的关系不够直观。
- 已修复项：提示词列表说明改为“问法类型用于识别用户会怎么问 AI；再结合追踪状态和覆盖结果判断补词、补内容还是补检测。”
- 暂缓项：不做业务价值分级，不做购买阶段字段。
- 后续建议：单独进入 `GEO-PROMPT-BUSINESS-VALUE-LITE-1`。

### `/knowledge-bases`

- 页面是否正常：正常打开。
- 当前问题：证据类型已经存在，但页面顶部说明还可以更明确它与 AI 可引用内容的关系。
- 已修复项：顶部摘要改为“管理企业资料、证据类型和 AI 可引用内容。”
- 暂缓项：不做引用证据中心，不改资料选择流程，不改审核逻辑。
- 后续建议：后续可做 `GEO-EVIDENCE-CITATION-CENTER-LITE-1`。

### `/geo-content`

- 页面是否正常：正常打开。
- 当前问题：发布文章页已有 `AI 引用友好检查`，但页面主提示没有明确引导发布前先看该检查。
- 已修复项：页面内联提示改为“发布前请查看 AI 引用友好检查，并人工核对事实、参数、引用和排版。”
- 暂缓项：不改复制逻辑，不改发布包结构，不接自动发布。
- 后续建议：保持现有发布工作台稳定，后续通过模型覆盖结果回看文章表现。

### `/model-inclusion-records`

- 页面是否正常：正常打开。
- 当前问题：`未推荐原因复盘` 在展开记录里可见，但页面顶部没有提示“展开记录查看”。
- 已修复项：顶部摘要增加“展开记录查看未推荐原因和建议补充方向”。
- 暂缓项：不做竞品占位集中视图，不做自动复测，不做诊断持久化字段。
- 后续建议：后续可做 `GEO-COMPETITOR-OCCUPANCY-REASON-LITE-1`。

### `/geo-analysis`

- 页面是否正常：正常打开。
- 当前问题：页面定位清楚，能引导到提示词、知识库、内容和模型覆盖记录；趋势、模型差异和竞品占位仍是后续增强。
- 已修复项：本阶段未改。
- 暂缓项：不做诊断大改，不新增模型差异视图。
- 后续建议：等 Dashboard 和引用证据中心稳定后再增强诊断页。

### `/expansion`

- 页面是否正常：正常打开。
- 当前问题：页面已经能体现规则拓词 / AI 拓词边界，候选结果区可展示问法类型；当前 smoke 页面无异常。
- 已修复项：本阶段未改。
- 暂缓项：不做真实 AI 调用，不保存候选，不做业务价值分级。
- 后续建议：和提示词业务价值分级阶段一起处理。

### `/settings`

- 页面是否正常：正常打开。
- 当前问题：页面作为低频配置页已收口，不应继续承担 GEO 运营主流程。
- 已修复项：本阶段未改。
- 暂缓项：不改公司、产品线、项目档案、Provider、权限或保存逻辑。
- 后续建议：保持稳定，不继续做零散设置页小修。

### `/help`

- 页面是否正常：正常打开。
- 当前问题：帮助页已有快速开始和 SOP，但缺少一条面向本地测试版的闭环走查提醒。
- 已修复项：FAQ 增加“本地测试版推荐怎么走一遍闭环？”，说明按问法库、知识库、发布文章、模型覆盖、未推荐原因复盘、补充内容的顺序走查。
- 暂缓项：不扩写成教程长文，不加入未完成模块说明。
- 后续建议：后续阶段完成后同步更新帮助页。

## 5. GEO 闭环检查

当前主链路已经能串起来：

```text
问法 → 证据 → 文章 → 模型覆盖 → 未推荐原因 → 补救动作
```

链路状态：

- 问法：`/geo-prompts` 和 `/expansion` 已有问法类型展示。
- 证据：`/knowledge-bases` 已有证据类型和 AI 可引用状态。
- 文章：`/geo-content` 已有 AI 引用友好检查和发布稿复制流程。
- 模型覆盖：`/model-inclusion-records` 已有品牌提及、品牌推荐、官网引用和竞品占位记录。
- 未推荐原因：模型覆盖记录展开区已有未推荐原因复盘。
- 补救动作：目前仍是提示级，主要通过页面文案和操作入口引导回补问法、补证据、补文章或复盘模型。

当前仍未做到：

- 不会自动生成补救任务。
- 不会自动创建知识库补证据任务。
- 不会自动创建下一篇文章。
- 不会自动复测模型覆盖。

这些限制符合本地测试版边界，后续应分阶段推进，不应在本阶段一次性做大功能。

## 6. 本阶段修复清单

修改文件：

- `apps/web/src/views/DashboardView.vue`
- `apps/web/src/views/GeoPromptsView.vue`
- `apps/web/src/views/KnowledgeBasesView.vue`
- `apps/web/src/views/ContentTasksView.vue`
- `apps/web/src/views/ModelInclusionRecordsView.vue`
- `apps/web/src/config/help-content.ts`
- `docs/audits/local-prelaunch-qa-1.md`

修复点：

- Dashboard：强化 AI 可见度驾驶舱定位。
- Dashboard：增加本地测试版 / smoke 数据提示。
- Dashboard：把示例趋势和示例分布降噪为测试示例。
- Dashboard：强化下一步应该补问法、补证据、补文章或复盘模型。
- GeoPrompts：强化问法类型和补救动作关系。
- KnowledgeBases：强化证据类型与 AI 可引用内容关系。
- GeoContent：提示发布前先看 AI 引用友好检查。
- ModelInclusionRecords：提示展开记录查看未推荐原因和建议补充方向。
- Help：增加本地测试版推荐闭环走查 FAQ。

## 7. 暂缓项

本阶段发现但不做：

- Dashboard AI 可见度指标重排。
- Prompt 业务价值分级。
- Prompt 购买阶段。
- 引用证据中心。
- 竞品占位原因集中视图。
- Brand Sentiment。
- Bing AI Performance / Search Console 接入。
- 官网 URL 引用记录结构化。
- 发布渠道效果回填。
- 自动监测。
- 自动发布。
- 后台备份按钮。
- 定时任务。
- 恢复工具。

## 8. 验证结果

页面只读走查结果：

- `/dashboard`：正常打开，新测试阶段提示可见，无 `undefined` / `null` / `NaN`，无红色控制台错误。
- `/geo-prompts`：正常打开，问法类型说明可见，无 `undefined` / `null` / `NaN`，无红色控制台错误。
- `/knowledge-bases`：正常打开，证据类型和 AI 可引用内容可见，无 `undefined` / `null` / `NaN`，无红色控制台错误。
- `/geo-content`：正常打开，AI 引用友好检查入口可见，无 `undefined` / `null` / `NaN`，无红色控制台错误。
- `/model-inclusion-records`：正常打开，未推荐原因提示可见，无 `undefined` / `null` / `NaN`，无红色控制台错误。
- `/geo-analysis`：正常打开，无 `undefined` / `null` / `NaN`，无红色控制台错误。
- `/expansion`：正常打开，无 `undefined` / `null` / `NaN`，无红色控制台错误。
- `/settings`：正常打开，无 `undefined` / `null` / `NaN`，无红色控制台错误。
- `/help`：正常打开，本地测试版闭环 FAQ 可见，无 `undefined` / `null` / `NaN`，无红色控制台错误。

命令验证结果：

- `git diff --check`：通过。
- `pnpm --filter @geo-workstation/web typecheck`：通过。
- `pnpm --filter @geo-workstation/web lint`：通过。
- `pnpm --filter @geo-workstation/api lint`：通过。

## 9. 下一步建议

### 1. `GEO-DASHBOARD-VISIBILITY-POLISH-1`

推荐优先级最高。Dashboard 是运营第一屏，建议下一阶段继续收口 AI 可见度驾驶舱，但仍不要做报表大改。

### 2. `GEO-PROMPT-BUSINESS-VALUE-LITE-1`

在已有问法类型基础上，轻量增加业务价值 / 购买阶段展示，帮助运营决定优先处理哪些问题。

### 3. `GEO-EVIDENCE-CITATION-CENTER-LITE-1`

做只读轻量引用证据中心，把问题、模型回答、引用来源和缺少证据类型串起来。该阶段不应改数据库，先做前端聚合或现有字段映射。
