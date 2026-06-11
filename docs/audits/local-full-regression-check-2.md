# LOCAL-FULL-REGRESSION-CHECK-2 UI 重构后全站最终回归报告

## 1. 阶段目标

本阶段是 UI 重构后的本地 smoke 全站最终回归检查，用于确认首页、登录页、Dashboard、主流程页、复盘分析页、帮助页和设置页都能正常打开和查看。

本阶段不新增功能，不改业务逻辑，不触发真实 AI，不触碰 official 数据库。

## 2. 当前项目状态

- 当前分支：feat/local-full-regression-check-2
- 当前提交：2ba80a1
- `.env` 数据库：geo_workstation_aqa_chat_local_smoke
- official 数据库：未触碰 geo_workstation_official
- migration / seed / 真实 AI：均未执行
- Provider / 权限 / 登录 API / 认证逻辑：均未修改
- 本地服务：复用已有 Web `http://localhost:5173` 和 API `http://localhost:3000`

## 3. 已完成 UI 重构范围

- 全局视觉系统：冷灰 / 白底 / 克制蓝、小圆角、浅边框、去阴影、紧凑表格和克制标签。
- Dashboard：已重排为左侧趋势、右侧待办、次级数据下沉的高密度工作台。
- 主流程页：提示词库、知识库、发布文章工作台、AI 模型覆盖记录已调整为工具型列表页。
- 复盘页：引用证据中心、竞品占位原因、GEO 分析已调整为概览、分布、明细、展开详情的结构。
- 首页 / 登录页：已统一为企业级 SaaS 入口页和登录页风格。

## 4. 走查页面

| 页面 | 路由 | 结果 |
| --- | --- | --- |
| 首页 | `/` | 正常打开，首屏和完整页截图正常 |
| 登录页 | `/login` | 正常打开，表单可输入，空表单错误态正常 |
| Dashboard | `/dashboard` | 正常打开，KPI、趋势、待办和下方辅助模块正常 |
| Geo Prompts | `/geo-prompts` | 正常打开，问法类型、业务价值和购买阶段标签正常 |
| Knowledge Bases | `/knowledge-bases` | 正常打开，资料列表、证据标签和管理入口正常 |
| Geo Content | `/geo-content` | 正常打开，文章任务列表和操作入口正常 |
| Model Inclusion Records | `/model-inclusion-records` | 正常打开，模型覆盖记录、品牌状态和原因标签正常 |
| Evidence Citations | `/evidence-citations` | 正常打开，证据链概览、分布和明细列表正常 |
| Competitor Occupancy | `/competitor-occupancy` | 正常打开，竞品占位概览、原因分布和复盘列表正常 |
| Geo Analysis | `/geo-analysis` | 正常打开，诊断页布局正常 |
| Expansion | `/expansion` | 正常打开，仅查看页面，未触发 AI 拓词 |
| Help | `/help` | 正常打开，帮助内容以目录、卡片和折叠分组呈现 |
| Settings | `/settings` | 正常打开，公司列表、低频配置、Provider 状态和系统信息正常 |

## 5. 导航检查

- 左侧导航未发现重复入口。
- 未发现“售后问答”重复。
- 未发现“AI 拓词”重复。
- 未发现分组重复或入口循环渲染。
- Dashboard、主流程、复盘分析、辅助工具、帮助与交接入口均可见。
- 导航在 1440 和抽样 1280 宽视口下未挤压到底部用户信息。

## 6. 页面级结果

| 页面 | 横向溢出 | undefined/null/NaN | 控制台红错 | 明显 UI 问题 | 修复 |
| --- | --- | --- | --- | --- | --- |
| `/` | 无 | 无 | 无 | 未发现 | 无 |
| `/login` | 无 | 无 | 无 | 空表单错误态正常 | 无 |
| `/dashboard` | 无 | 无 | 无 | 下方辅助模块正常下沉 | 无 |
| `/geo-prompts` | 无 | 无 | 无 | 标签未挤压 | 无 |
| `/knowledge-bases` | 无 | 无 | 无 | 未发现 | 无 |
| `/geo-content` | 无 | 无 | 无 | 未发现 | 无 |
| `/model-inclusion-records` | 无 | 无 | 无 | 长文本未撑破页面 | 无 |
| `/evidence-citations` | 无 | 无 | 无 | 详情信息保持折叠 | 无 |
| `/competitor-occupancy` | 无 | 无 | 无 | 标签和原因分布未挤压 | 无 |
| `/geo-analysis` | 无 | 无 | 无 | 未发现 | 无 |
| `/expansion` | 无 | 无 | 无 | 页面较长但完整截图正常 | 无 |
| `/help` | 无 | 无 | 无 | 页面较长，但不是首屏大百科 | 无 |
| `/settings` | 无 | 无 | 无 | 页面最长，但分区和底部正常 | 无 |

## 7. 登录与认证回归

- `/login` 在隔离浏览上下文中正常打开。
- 邮箱和密码输入框可输入。
- 空表单点击登录只触发前端本地校验“请输入邮箱和密码”，未提交真实账号密码。
- 未修改登录 API、auth store、token/session、权限判断或后台路由守卫。
- 未发现登录页控制台红色错误。

## 8. 核心流程检查

本地 smoke 下可顺畅查看以下链路：

首页 → 登录页 → Dashboard → Geo Prompts → Knowledge Bases → Geo Content → Model Inclusion Records → Evidence Citations → Competitor Occupancy → Geo Analysis

本次只做查看、错误态校验和截图，没有点击新增、删除、导入、导出、发布、AI 生成、联网检测或真实 AI 相关动作。

## 9. 完整页面截图检查

本阶段已同时保存首屏截图和 full page 完整页面截图。

截图目录：

- `tmp/local-full-regression-check-2/`

已完成首屏和完整页截图：

- `home-first-screen-1440.png`
- `home-full-1440.png`
- `login-first-screen-1440.png`
- `login-full-1440.png`
- `dashboard-first-screen-1440.png`
- `dashboard-full-1440.png`
- `geo-prompts-first-screen-1440.png`
- `geo-prompts-full-1440.png`
- `knowledge-bases-first-screen-1440.png`
- `knowledge-bases-full-1440.png`
- `geo-content-first-screen-1440.png`
- `geo-content-full-1440.png`
- `model-inclusion-records-first-screen-1440.png`
- `model-inclusion-records-full-1440.png`
- `evidence-citations-first-screen-1440.png`
- `evidence-citations-full-1440.png`
- `competitor-occupancy-first-screen-1440.png`
- `competitor-occupancy-full-1440.png`
- `geo-analysis-first-screen-1440.png`
- `geo-analysis-full-1440.png`
- `expansion-first-screen-1440.png`
- `expansion-full-1440.png`
- `help-first-screen-1440.png`
- `help-full-1440.png`
- `settings-first-screen-1440.png`
- `settings-full-1440.png`
- `navigation-full-1440.png`

补充 1280 抽样截图：

- `dashboard-1280.png`
- `login-1280.png`
- `geo-prompts-1280.png`
- `evidence-citations-1280.png`
- `competitor-occupancy-1280.png`

完整页面观察结果：

- Dashboard：下方辅助信息、辅助统计和处理入口位于第二屏后，不抢首屏主线。
- Evidence Citations：证据链字段分组清楚，展开详情未默认堆满页面。
- Competitor Occupancy：竞品分布、原因分布和复盘列表密度正常，标签未挤压。
- Help：页面较长，但目录、卡片和折叠分组正常，不再是首屏大百科。
- Settings：页面最长，包含公司列表、低频配置、Provider 状态和系统信息，底部布局正常。
- 未发现 full page 截图失败，不需要分段截图。
- 未发现下方模块混乱、重复说明、底部空白过大、表格撑破页面或旧 UI 风格明显突兀。

## 10. 本阶段修复清单

本阶段未做代码小修，仅新增本回归检查报告。

## 11. 暂缓项

- 真实 AI 验收准备。
- 真实 AI 端到端验收。
- 正式部署。
- official 数据库相关操作。
- 需要业务逻辑、API、权限、认证或数据库结构修改的问题。
- 后续如人工验收发现轻微 UI 问题，可单独进入 `UI-REDESIGN-FINAL-POLISH-1`。

## 12. 验证结果

- `git diff --check`：通过
- `pnpm --filter @geo-workstation/web typecheck`：通过
- `pnpm --filter @geo-workstation/web lint`：通过
- `pnpm --filter @geo-workstation/api lint`：通过

## 13. 下一步建议

1. `REAL-AI-END-TO-END-VALIDATION-PREP-1`：推荐优先，准备真实 AI 验收授权边界、测试问题集和停止条件。
2. `UI-REDESIGN-FINAL-POLISH-1`：如用户人工看图后发现轻微 UI 问题，再做定点 polish。
3. `REAL-AI-END-TO-END-VALIDATION-1`：在授权真实 AI 调用后，单独跑完整链路验收。

最终真实 AI 端到端验收仍需另开 `REAL-AI-END-TO-END-VALIDATION-1` 阶段，本阶段未执行真实 AI 请求。
