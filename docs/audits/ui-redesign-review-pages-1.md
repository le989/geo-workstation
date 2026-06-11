# UI-REDESIGN-REVIEW-PAGES-1 复盘页面重排报告

## 1. 阶段目标

本阶段按 Gemini UI 重设计方向统一复盘分析页面，只调整前端 UI、CSS 和 Vue 模板信息层级，不改业务逻辑、不改 API、不改数据库。

目标页面：

- Evidence Citations：`/evidence-citations`
- Competitor Occupancy：`/competitor-occupancy`
- Geo Analysis：`/geo-analysis`

## 2. 当前项目状态

- 当前分支：`feat/ui-redesign-review-pages-1`
- 当前提交：`12ab3f8`
- `.env` 数据库：`geo_workstation_aqa_chat_local_smoke`
- official 数据库：未触碰
- migration / seed / 真实 AI：未执行
- Provider / 权限：未修改

## 3. Gemini 方案采纳范围

已采纳：

- 极简页头：压缩页面顶部说明，保留必要 smoke / 轻量判断边界。
- 3 项核心概览：Evidence 和 Competitor 继续只保留 3 个关键概览项。
- 图表横向化 / 分布条化：分布图保留轻量横向条，不使用大饼图或大图表。
- 明细列表前置：复盘明细与分布区并排展示，让用户更早看到具体问题。
- 长文本下沉：关联证据、回答摘要、匹配说明继续放在展开区。
- 标签降密度：减少默认卡片中的标签拥挤和说明堆叠。
- 说明降噪：Geo Analysis 的闭环说明下沉到任务列表之后。

未采纳：

- 未新增人工确认功能。
- 未新增筛选、排序或后端计算。
- 未改数据库字段或 API。
- 未接真实 AI 或外部平台。

## 4. 页面修改清单

### Evidence Citations

- 页面改为 `review-page` 结构，保持原页面名称。
- 顶部说明压缩为短句和一条轻提示。
- 概览保持 3 项：有证据支撑、缺证据、待人工确认。
- 证据缺口分布与问题证据链并排展示。
- 问题证据链列表提前到主工作区左侧。
- 默认卡片只突出用户问法、证据状态、文章状态、模型覆盖、主要缺口和下一步动作。
- 可能来源、匹配关键词、关联证据、相关文章和模型记录放入展开区。
- 未改证据链轻量关联逻辑。

### Competitor Occupancy

- 页面改为 `review-page` 结构，保持原页面名称。
- 顶部说明压缩为短句和一条轻提示。
- 概览保持 3 项：竞品占位问题、我方缺席问题、需补证据问题。
- 竞品分布、原因分布与复盘列表并排展示。
- 复盘列表提前到主工作区左侧。
- 默认卡片只突出用户问法、竞品品牌、我方状态、占位原因和下一步动作。
- 回答摘要、证据链缺口和检测时间保留在展开区。
- 未改竞品词识别、占位类型和原因推断逻辑。

### Geo Analysis

- 页面改为 `review-page` 结构，保持原页面名称。
- 顶部说明压缩，保留刷新和新建诊断任务操作。
- 提示 alert 降为轻提示。
- 概览指标压缩为低高度摘要条。
- 筛选栏隐藏说明标题，直接展示筛选项和查询按钮。
- 任务表前移到闭环说明之前。
- GEO 诊断闭环说明下沉为底部折叠区。
- 未改创建、编辑、运行诊断、归档、详情抽屉和转入提示词等业务逻辑。

## 5. 保留的业务能力

- 引用证据中心的轻量证据链。
- 竞品占位识别和原因推断。
- GEO 分析现有任务列表、筛选、详情、运行、归档和转入能力。
- 原有筛选、展开、跳转、操作逻辑。
- Dashboard 和主流程页面入口。

## 6. 截图与走查

截图目录：`tmp/ui-redesign-review-pages-1/`

已保存截图：

- `evidence-citations-1440.png`
- `evidence-citations-1280.png`
- `competitor-occupancy-1440.png`
- `competitor-occupancy-1280.png`
- `geo-analysis-1440.png`
- `geo-analysis-1280.png`

页面走查：

- `/evidence-citations`：正常打开，无横向溢出，无 console error，无 `undefined/null/NaN`。
- `/competitor-occupancy`：正常打开，无横向溢出，无 console error，无 `undefined/null/NaN`。
- `/geo-analysis`：正常打开，视觉顺序为头部、轻提示、指标、筛选、任务表、闭环说明，无横向溢出。
- `/dashboard`：正常打开，未受本阶段影响。
- `/geo-prompts`：正常打开，未受本阶段影响。
- `/knowledge-bases`：正常打开，未受本阶段影响。
- `/geo-content`：正常打开，未触发生成、复制或发布。
- `/model-inclusion-records`：正常打开，未触发联网检测。
- `/help`：正常打开，未受本阶段影响。

## 7. 暂缓项

- 首页 / 登录页重设计。
- 人工确认和覆盖编辑。
- 真实 AI 自动采集。
- Bing / Search Console 等外部平台接入。
- Dashboard 正式联动统计。
- 真实 AI 端到端验收。

## 8. 验证结果

- `git diff --check`：通过。
- `pnpm --filter @geo-workstation/web typecheck`：通过。
- `pnpm --filter @geo-workstation/web lint`：通过。
- `pnpm --filter @geo-workstation/api lint`：通过。

## 9. 下一步建议

1. `UI-REDESIGN-HOME-LOGIN-1`：继续处理首页 / 登录页视觉统一。
2. `LOCAL-FULL-REGRESSION-CHECK-1`：对全站关键流程做一次本地回归。
3. `REAL-AI-END-TO-END-VALIDATION-PREP-1`：为最终真实 AI 端到端验收做准备。

最终仍必须另开 `REAL-AI-END-TO-END-VALIDATION-1` 阶段执行真实 AI 端到端验收；本阶段没有触发真实 AI。
