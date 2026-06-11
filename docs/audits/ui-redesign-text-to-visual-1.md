# UI-REDESIGN-TEXT-TO-VISUAL-1 文字说明型转数据操作型报告

## 1. 阶段目标

本阶段根据 Gemini 最终复审意见，将 GEO 工作站 UI 从“文字说明型页面”进一步转为“数据 / 状态 / 任务 / 操作型页面”。本阶段只调整前端视觉表达、CSS 和 Vue 模板排版，不新增功能，不改业务逻辑，不改接口，不改数据库。

## 2. 当前项目状态

- 当前分支：feat/ui-redesign-text-to-visual-1
- 阶段基线提交：b57941a
- `.env` 数据库：geo_workstation_aqa_chat_local_smoke
- official 数据库：未触碰
- migration / seed / 真实 AI：均未执行
- Provider / 权限 / 登录 API / 认证逻辑：均未修改

## 3. Gemini 复审采纳内容

- 左侧导航浅色化：从深色后台侧栏改为白底 / 浅灰 / 细边框。
- 删除副标题综合症：Dashboard、主流程页、复盘页继续删除或下沉解释性短句。
- Dashboard 任务化：KPI 只保留指标名、数字和短状态，本轮结论改为待处理任务列表。
- 列表去 label 化：发布文章和模型覆盖记录减少“资料：/ 更新：/ 下一步：/ 竞品：”等字段前缀。
- 复盘页状态灯化：引用证据中心、竞品占位原因使用状态点、短标签和动作入口表达状态。
- 首页 / 登录页精修：加入极轻网格背景、状态点和登录卡片轻阴影，避免线框稿感。

## 4. 页面修改清单

### AppLayout / Navigation

- 将左侧导航改为浅色侧栏。
- Active 状态改为浅灰底、深色文字和蓝色细线。
- 分组标题、用户信息卡、Logo 区整体降权。
- 未改路由、权限、折叠逻辑、用户信息和退出登录逻辑。

### Dashboard

- KPI 删除解释性短句，仅保留指标名、核心数字和短状态。
- 图表卡删除副标题和模块级测试标签。
- “本轮结论”改为“待处理”任务列表，保留补问法、补证据、补文章、复盘模型入口。
- 下方 TOP5、辅助统计和处理入口继续去说明化。
- 保留 KPI、趋势图、模型对比、原因分布、场景词、TOP5、最近动态和处理入口。

### Geo Prompts

- 删除摘要卡 hint 文案。
- 删除业务价值面板和表格标题区的解释性短句。
- 保留问法类型、业务价值、购买阶段、筛选、批量导入、编辑、删除和导出能力。

### Geo Content

- 删除页头流程说明。
- 发布文章列表行删除“资料：/ 更新：/ 下一步：”前缀。
- 下一步状态改为状态点 + 短动作。
- 保留生成文章、复制富文本、打开文章、自动修复、更多菜单和归档入口。

### Model Inclusion Records

- 删除表格标题区解释性短句。
- 覆盖结论中的“已提及 / 已推荐”缩短为“提及 / 推荐”。
- 竞品状态改为状态点 + 竞品名称，不再重复“竞品：”前缀。
- 保留新增、导入、导出、联网检测按钮和记录展开详情；本阶段未点击联网检测。

### Evidence Citations

- 删除顶部和列表头部的重复说明。
- 概览卡保留核心数字，不再展示 helper 句。
- 证据、文章、模型覆盖状态增加状态点。
- “下一步建议”缩短为“动作”。
- 关联证据、文章、模型记录和匹配说明仍放在展开区。

### Competitor Occupancy

- 删除顶部和图表区说明短句。
- 概览卡保留核心数字。
- 模型、我方状态、占位类型使用状态点 + 短标签。
- “轻量原因 / 下一步动作”缩短为“原因 / 动作”。
- 回答摘要、证据缺口和检测时间仍放在展开区。

### Home

- 首页加入极轻网格和径向背景。
- 能力卡增加小状态点，降低线框感。
- 未新增营销文案，未改页面名称和入口。

### Login

- 登录页加入极轻背景层次和登录卡片轻阴影。
- 未改表单字段、登录请求、token、权限或认证流程。

### Help

- 删除首屏和分组头部的重复说明短句。
- 保留快速开始、目录、SOP 详情、风险提醒和最终真实 AI 验收边界说明。

## 5. 保留的业务能力

- 路由未改。
- 权限未改。
- 登录 API、认证逻辑、token / session 逻辑未改。
- API 调用结构未改。
- 数据库字段和 schema 未改。
- 后端逻辑未改。
- 真实 AI 未触发。
- official 数据库未访问。

## 6. 截图与走查

- 截图目录：`tmp/ui-redesign-text-to-visual-1/`
- 已保存首屏截图和 full page 截图：
  - `dashboard-first-screen-1440.png`
  - `dashboard-full-1440.png`
  - `geo-prompts-first-screen-1440.png`
  - `geo-prompts-full-1440.png`
  - `geo-content-first-screen-1440.png`
  - `geo-content-full-1440.png`
  - `model-inclusion-records-first-screen-1440.png`
  - `model-inclusion-records-full-1440.png`
  - `evidence-citations-first-screen-1440.png`
  - `evidence-citations-full-1440.png`
  - `competitor-occupancy-first-screen-1440.png`
  - `competitor-occupancy-full-1440.png`
  - `home-first-screen-1440.png`
  - `home-full-1440.png`
  - `login-first-screen-1440.png`
  - `login-full-1440.png`
  - `navigation-full-1440.png`
- 走查页面：
  - `/`
  - `/login`
  - `/dashboard`
  - `/geo-prompts`
  - `/knowledge-bases`
  - `/geo-content`
  - `/model-inclusion-records`
  - `/evidence-citations`
  - `/competitor-occupancy`
  - `/geo-analysis`
  - `/expansion`
  - `/help`
  - `/settings`
- 走查结果：
  - 页面均能正常打开。
  - 1440 视口无横向溢出。
  - 未发现 `undefined` / `null` / `NaN`。
  - Console 红色错误：0。
  - 网络 4xx / 5xx：0。
  - 未触发真实 AI、发布、导入、导出、删除或联网检测动作。

## 7. 暂缓项

- 真实 AI 验收准备。
- 真实 AI 端到端验收。
- 业务逻辑重构。
- 人工确认能力。
- 外部平台接入。
- 更深层的详情抽屉文字去除。
- Settings 页面进一步视觉重排。

## 8. 验证结果

- `git diff --check`：通过。
- `pnpm --filter @geo-workstation/web typecheck`：通过。
- `pnpm --filter @geo-workstation/web lint`：通过。
- `pnpm --filter @geo-workstation/api lint`：通过。

## 9. 下一步建议

1. LOCAL-FULL-REGRESSION-CHECK-3：优先，确认本轮更大胆 UI 收口后全站仍稳定。
2. REAL-AI-END-TO-END-VALIDATION-PREP-1：准备真实 AI 验收数据、账号、模型和费用边界。
3. UI-REDESIGN-FINAL-POLISH-1：如用户看图后仍觉得文字多，再针对详情抽屉、Settings 和 Help 做最后收口。

最终仍必须另开 REAL-AI-END-TO-END-VALIDATION-1 阶段做真实 AI 端到端验收；本阶段未提前执行。
