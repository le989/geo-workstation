# LOCAL-FULL-REGRESSION-CHECK-1 本地全站回归检查报告

## 1. 阶段目标

本阶段用于 UI 重构后的本地 smoke 全站回归检查，只验证页面能否正常打开、导航是否重复、布局是否溢出、控制台和接口是否异常。

本阶段不新增功能，不触发真实 AI，不修改数据库，不做正式部署。

## 2. 当前项目状态

- 当前分支：feat/local-full-regression-check-1
- 当前提交：e9a2b6f
- `.env` 数据库：geo_workstation_aqa_chat_local_smoke
- official 数据库：未触碰 geo_workstation_official
- migration / seed / 真实 AI：均未执行
- Provider / 权限：未修改
- 本地服务：复用已有 Web `http://localhost:5173` 和 API `http://localhost:3000`

## 3. 走查页面

| 页面 | 路由 | 结果 |
| --- | --- | --- |
| 首页 | `/` | 正常打开，未白屏，未发现横向溢出 |
| 登录页 | `/login` | 登录态下自动回到 `/dashboard`，未误跳错误页 |
| Dashboard | `/dashboard` | 正常打开，首屏保留 KPI、趋势和待办 |
| Geo Prompts | `/geo-prompts` | 正常打开，问法列表和标签展示正常 |
| Knowledge Bases | `/knowledge-bases` | 正常打开，资料列表和知识库切换正常显示 |
| Geo Content | `/geo-content` | 正常打开，文章任务列表和状态操作入口正常 |
| Model Inclusion Records | `/model-inclusion-records` | 正常打开，模型覆盖记录表正常显示 |
| Evidence Citations | `/evidence-citations` | 正常打开，概览、分布和证据链列表正常 |
| Competitor Occupancy | `/competitor-occupancy` | 正常打开，竞品分布和复盘列表正常 |
| Geo Analysis | `/geo-analysis` | 正常打开，当前为空状态，提示清楚 |
| Expansion | `/expansion` | 正常打开，规则拓词表单和候选空状态正常 |
| Help | `/help` | 正常打开，帮助目录和折叠说明正常 |
| Settings | `/settings` | 正常打开，系统配置和只读 Provider 状态正常 |

## 4. 导航检查

- 左侧导航未发现重复入口。
- 未发现“售后问答”重复。
- 未发现“AI 拓词”重复。
- 未发现分组重复或入口循环渲染。
- 导航入口完整，Dashboard、主流程、复盘页、帮助和设置入口均可见。
- 行内“更多”菜单存在重复的菜单项文本，但不属于左侧导航重复。

## 5. 页面级结果

| 页面 | 横向溢出 | undefined/null/NaN | 控制台红错 | 明显 UI 问题 | 修复 |
| --- | --- | --- | --- | --- | --- |
| `/` | 无 | 无 | 无 | 未发现 | 无 |
| `/login` | 无 | 无 | 无 | 登录态重定向到 Dashboard，符合当前状态 | 无 |
| `/dashboard` | 无 | 无 | 无 | 未发现 | 无 |
| `/geo-prompts` | 无 | 无 | 无 | 未发现 | 无 |
| `/knowledge-bases` | 无 | 无 | 无 | 未发现 | 无 |
| `/geo-content` | 无 | 无 | 无 | 未发现 | 无 |
| `/model-inclusion-records` | 无 | 无 | 无 | 未发现 | 无 |
| `/evidence-citations` | 无 | 无 | 无 | 未发现 | 无 |
| `/competitor-occupancy` | 无 | 无 | 无 | 未发现 | 无 |
| `/geo-analysis` | 无 | 无 | 无 | 当前为空状态，正常 | 无 |
| `/expansion` | 无 | 无 | 无 | 未触发 AI 拓词，仅查看页面 | 无 |
| `/help` | 无 | 无 | 无 | 未发现 | 无 |
| `/settings` | 无 | 无 | 无 | 未发现 | 无 |

## 6. 核心流程检查

本地 smoke 下可顺畅查看以下链路：

Dashboard → Geo Prompts → Knowledge Bases → Geo Content → Model Inclusion Records → Evidence Citations → Competitor Occupancy → Geo Analysis

本次只做查看和截图，没有点击新增、删除、导入、导出、发布、联网检测或真实 AI 相关动作。

## 7. 本阶段修复清单

本阶段未做代码小修，仅新增本回归检查报告。

## 8. 截图路径

截图目录：

- `tmp/local-full-regression-check-1/`

关键截图：

- `dashboard-1440.png`
- `dashboard-1280.png`
- `geo-prompts-1440.png`
- `knowledge-bases-1440.png`
- `geo-content-1440.png`
- `model-inclusion-records-1440.png`
- `evidence-citations-1440.png`
- `competitor-occupancy-1440.png`
- `geo-analysis-1440.png`
- `expansion-1440.png`
- `help-1440.png`
- `settings-1440.png`
- `home-1440.png`
- `login-1440.png`
- `navigation-full.png`

截图目录位于 `tmp/`，已被 git 忽略。

## 9. 暂缓项

- 首页 / 登录页重设计
- 真实 AI 验收准备
- 人工确认功能
- 外部平台接入
- official 数据库相关操作
- 需要业务逻辑、API、权限或数据库结构调整的问题

## 10. 验证结果

- `git diff --check`：通过
- `pnpm --filter @geo-workstation/web typecheck`：通过
- `pnpm --filter @geo-workstation/web lint`：通过
- `pnpm --filter @geo-workstation/api lint`：通过

## 11. 下一步建议

1. `UI-REDESIGN-HOME-LOGIN-1`：继续按 Gemini 风格重设计首页和登录页。
2. `REAL-AI-END-TO-END-VALIDATION-PREP-1`：为最终真实 AI 端到端验收准备检查清单和授权边界。
3. `UI-REDESIGN-REGRESSION-FIX-1`：如用户在人工验收中发现具体 UI 回归，再做定点修复。

最终真实 AI 端到端验收仍需另开 `REAL-AI-END-TO-END-VALIDATION-1` 阶段，本阶段未执行真实 AI 请求。
