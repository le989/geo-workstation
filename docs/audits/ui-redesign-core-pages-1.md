# UI-REDESIGN-CORE-PAGES-1 主流程页面重排报告

## 1. 阶段目标

本阶段按 Gemini 方案统一主流程页面的 UI 和信息层级，只做前端视觉、排版和 Vue 模板结构收口，不改业务逻辑、不改 API、不改数据库。

覆盖页面：

- Geo Prompts
- Knowledge Bases
- Geo Content
- Model Inclusion Records

## 2. 当前项目状态

- 当前分支：feat/ui-redesign-core-pages-1
- 当前提交：227f993
- .env 数据库：geo_workstation_aqa_chat_local_smoke
- 是否触碰 official：否，未连接、未读取、未导出、未修改 geo_workstation_official
- 是否跑 migration / seed / AI：否，未跑 migration、未 seed、未触发真实 AI

## 3. Gemini 方案采纳范围

本阶段采纳：

- 极简页头：压低主流程页页头高度，减少说明文字。
- 单行筛选：保留已有筛选逻辑，调整为更紧凑的工具栏视觉。
- 紧凑 Tab / 摘要：将提示词资产、业务价值等信息压缩为摘要条。
- 数据区前移：让表格、资料工作区、文章队列和模型记录更早出现在首屏。
- 表格 / 列表高密度：降低列表行、标签、卡片的视觉厚度。
- 次要说明下沉：流程说明、统计分布、未覆盖辅助信息继续放在下方或折叠区。

未采纳：

- 不新增筛选排序功能。
- 不改页面名称。
- 不改接口、权限、Provider 或数据结构。
- 不重写主流程页面，只在现有模板上做外科式重排。

## 4. 页面修改清单

### Geo Prompts

- 将页面挂入统一主流程页样式。
- 页头说明压缩为一句短说明。
- 筛选区前移到摘要前方。
- 将提示词资产概览和业务价值概览合并为一行紧凑摘要。
- 表格面板改为主数据区，列表更早进入首屏。
- 保留问法类型、业务价值、购买阶段、追踪状态和导入 / 导出 / AI 拓词入口。

### Knowledge Bases

- 将知识库页挂入统一主流程页样式。
- 页头从说明型工作台压缩为资料管理头部。
- 当前知识库摘要改为更轻量的横向信息。
- 嵌入式资料工作区作为主数据区保留。
- 管理知识库弹窗中的资产概览改为紧凑摘要，说明文案收短。
- 保留知识库切换、资料管理、上传、手动录入、目录和资料审核能力。

### Geo Content

- 将发布文章工作台挂入统一主流程页样式。
- 页头和发布边界提示压缩。
- 筛选区使用紧凑工具栏样式。
- 文章任务列表作为主数据区突出。
- 状态 Tab、下一步动作和主要按钮保持可见。
- 保留文章生成、复制富文本、打开文章、自动修复、更多操作和流程说明折叠区。

### Model Inclusion Records

- 将模型覆盖记录页挂入统一主流程页样式。
- 页头说明压缩，启用模型标签更克制。
- 筛选区使用紧凑工具栏样式。
- 当前匹配记录表作为主数据区突出。
- 未覆盖提示词和统计分布继续下沉。
- 保留新增、导入、导出、联网检测入口和记录展开详情。

## 5. 保留的业务能力

- 问法类型、业务价值、购买阶段。
- 知识库资料管理、目录、上传、手动录入和审核状态。
- 发布文章任务操作、复制、打开、修复和流程说明。
- 模型覆盖记录查看、新增、导入、导出、作废、恢复和联网检测入口。
- 原有筛选、分页、展开详情和权限控制逻辑。

## 6. 截图与走查

截图目录：

- tmp/ui-redesign-core-pages-1/

已保存截图：

- geo-prompts-1440.png
- knowledge-bases-1440.png
- geo-content-1440.png
- model-inclusion-records-1440.png
- geo-prompts-1280.png
- knowledge-bases-1280.png
- geo-content-1280.png
- model-inclusion-records-1280.png

走查页面：

- /geo-prompts
- /knowledge-bases
- /geo-content
- /model-inclusion-records
- /dashboard
- /evidence-citations
- /competitor-occupancy
- /help

结果：

- 1280 / 1440 宽视口无横向溢出。
- 页面没有白屏、登录页误跳或加载遮挡。
- 未发现 undefined / null / NaN 直接显示。
- 控制台未发现红色错误。
- Dashboard 和复盘页面未被本阶段样式破坏。
- 主流程页面的数据区更靠上，筛选和摘要更紧凑。

## 7. 暂缓项

- 复盘页面重排。
- 首页 / 登录页重设计。
- 新增筛选排序功能。
- 人工确认 / 覆盖编辑新能力。
- 真实 AI 端到端验收。

## 8. 验证结果

- `git diff --check`：通过。
- `pnpm --filter @geo-workstation/web typecheck`：通过。
- `pnpm --filter @geo-workstation/web lint`：通过。
- `pnpm --filter @geo-workstation/api lint`：通过。

未执行：

- migration：本阶段禁止且不需要。
- seed：本阶段禁止且不需要。
- 真实 AI：本阶段禁止且不需要。
- official 数据库操作：本阶段禁止且不需要。

## 9. 下一步建议

1. UI-REDESIGN-REVIEW-PAGES-1：继续重排引用证据中心、竞品占位原因、GEO 分析等复盘页。
2. UI-REDESIGN-HOME-LOGIN-1：统一登录页和首页入口的视觉语言。
3. LOCAL-FULL-REGRESSION-CHECK-1：在 UI 重设计阶段后做一次全站本地回归。

继续记录：最终必须另开 REAL-AI-END-TO-END-VALIDATION-1，用真实 AI 跑完整链路验收。本阶段未触发真实 AI。
