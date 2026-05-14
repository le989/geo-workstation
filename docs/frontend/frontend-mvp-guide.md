# 前端 MVP 使用指南

本文档用于 Phase 3J 前端整体联调和内部演示交接。当前前端已经可以作为 GEO 营销运营系统的内部工作台使用，核心仍然围绕：

`GEO 诊断 -> 提示词策略 -> 企业知识库 -> GEO 内容生成 -> 效果记录 -> 优化建议`

它不是普通 CMS、文件柜或内容管理后台。

## 前端页面总览

| 路由                       | 页面            | 用途                                                                                                                         |
| -------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `/login`                   | 登录页          | 内部系统登录入口，使用默认管理员或内部账号获取 JWT 登录态。                                                                  |
| `/dashboard`               | GEO 工作台      | 查看提示词、知识库、内容、模型覆盖和优化建议的总览，并进入主要操作路径。                                                     |
| `/geo-analysis`            | GEO 分析        | 创建 GEO 分析任务，运行 Mock 分析，查看模型结果、缺口和建议，并转提示词或创建内容任务。                                      |
| `/geo-prompts`             | 提示词策略库    | 维护训练词、蒸馏词、品牌词、场景词，支持筛选、新增、编辑、软删除、批量导入、CSV 导出。                                       |
| `/expansion`               | AI 拓词         | 使用手动组合、默认 Mock 或 `openai_compatible` 按用户决策场景生成候选问题，人工勾选后保存。                                  |
| `/knowledge-bases`         | 企业 GEO 知识库 | 创建知识库，文本导入知识片段，上传 txt/md/csv 并查看解析状态、片段和 reparse。                                               |
| `/instruction-templates`   | 指令库          | 管理 GEO 内容生成指令模板，支持创建、编辑、查看详情、复制和软删除。                                                          |
| `/content-tasks`           | GEO 内容生成    | 选择提示词、知识库和指令模板创建内容任务，编辑、质量检查、发布优化、富文本排版和导出。                                       |
| `/model-inclusion-records` | 模型覆盖记录    | 手动录入、批量导入或使用 Kimi Web Search API 检测提示词在 AI 模型、多入口检测中的提及、推荐、官网/内容引用、竞品和命中等级。 |
| `/reports`                 | GEO 报表        | 查看总览、提示词覆盖、模型覆盖、内容覆盖、知识库覆盖和优化建议，并导出 CSV。                                                 |
| `/settings`                | 系统设置        | 维护单项目档案、品牌上下文、内容语气、禁止表达和 AI 接口配置边界说明。                                                       |

## 完整 GEO MVP 使用流程

1. 打开 `/login`，使用 seed 创建的默认管理员或内部账号登录。登录成功后进入 `/dashboard`。
2. 进入 `/settings` 配置项目档案。项目可以是企业品牌、产品、服务、课程、门店、本地生活、个人品牌或其他需要做 GEO 运营的对象，不绑定固定行业。
3. 打开 `/dashboard`，查看当前 GEO 资产、模型覆盖效果和优化建议。后端未启动或登录态过期时页面会给出提示并引导重新登录。
4. 进入 `/geo-analysis`，创建品牌或产品线分析任务，运行 Mock GEO 分析，查看品牌提及、推荐、官网引用、竞品出现、内容缺口、知识库缺口和提示词建议。
5. 在分析详情中将 promptSuggestions 转入提示词策略库，也可以直接基于分析任务创建内容任务。
6. 进入 `/geo-prompts`，新增或批量导入 GEO 提示词。提示词是后续拓词、内容生成、模型覆盖和报表复盘的核心资产。
7. 进入 `/expansion`，用手动组合、默认 Mock 或 `openai_compatible` 生成用户可能会向 AI 提出的候选问题。候选词不会自动入库，必须人工勾选保存。
8. 进入 `/knowledge-bases`，创建企业 GEO 知识库，通过文本导入或 txt/md/csv 上传沉淀知识片段。
9. 进入 `/instruction-templates`，创建按用户决策场景设计的 GEO 内容生成指令。
10. 进入 `/content-tasks`，选择 GEO 提示词、知识库和指令模板创建内容任务。默认使用 Mock 生成器；自用真实流程可选择 `openai_compatible`，生成结果真实入库并可编辑、删除和导出 Markdown。
    内容详情支持“质量检查”和“生成发布优化版”，用于识别知识库外参数、协议、认证、品牌表达和 GEO 结构风险；优化稿只返回给人工复核，不会自动覆盖原内容项。
    发布前还可以在“发布稿排版”中选择通用发布稿、官网文章、知乎 / 百家号或公众号草稿风格，生成富文本预览，并复制富文本、Markdown、纯文本或下载 HTML / Markdown。
11. 进入 `/model-inclusion-records`，人工录入、导入 GEO 命中记录，或点击“联网检测”选择少量高优先级提示词做 Kimi Web Search API 检测或豆包 / 火山方舟联网搜索检测。页面会记录平台、入口、检测方式、设备、联网/登录状态、品牌是否被提及或推荐、是否引用官网/内容资产、是否出现竞品、命中等级、原始回答和引用来源。Kimi 检测不等同于 Kimi App 端真实用户结果；豆包 / 火山方舟检测是火山方舟 Web Search API 检测，不等同于豆包 App 端真实用户结果，且可能不返回结构化引用来源。每次检测会消耗后端 API 额度；如果出现 timeout、fetch failed 或连接重置，页面会展示失败原因分类、是否已重试，以及“网络或联网搜索超时，可稍后重试。”等提示。
12. 进入 `/reports`，复盘提示词覆盖、模型表现、内容覆盖、知识库覆盖和优化建议。
13. 回到 `/dashboard`，刷新总览，观察提示词、知识库、内容、覆盖记录和优化建议变化。演示结束可以从顶部栏退出登录。

## 真实入库能力

- 提示词策略库：新增、编辑、软删除、批量导入、CSV 导出。
- GEO 分析任务：创建、编辑 pending 任务、运行 Mock 分析、保存模型结果、转提示词、创建内容任务。
- AI 拓词候选保存：规则、Mock 或 `openai_compatible` 按用户决策场景生成候选问题，勾选后保存为 GEO 提示词。
- 企业 GEO 知识库：知识库、知识片段、txt/md/csv 文件记录、解析状态和片段入库。
- 指令库：指令模板创建、编辑、复制、软删除。
- GEO 内容任务与内容项：任务、内容项、编辑、软删除、Markdown 导出、富文本发布稿预览与 HTML 下载。
- 内容质量检查：内容项可做发布前质量检查，并生成不自动覆盖原文的发布优化版。
- 模型覆盖记录：手动新增、批量导入、Kimi Web Search API 联网检测、豆包 / 火山方舟联网搜索检测、summary、未覆盖提示词、CSV 导出；已支持平台、入口、检测方式、设备类型、联网/登录状态、内容资产引用、竞品出现、命中等级、原始回答、引用来源、搜索结果、截图路径、失败原因分类和重试次数展示。选择火山 Provider 时，弹窗会提示“当前为火山方舟 Web Search API 检测”“不等同于豆包 App 端真实用户结果”和“可能不返回结构化引用来源”。
- GEO 报表：总览、覆盖报表、知识库覆盖、优化建议、CSV 导出。
- 登录和简单权限：JWT Bearer 登录态、路由保护、当前用户展示和退出登录。
- 项目档案：维护当前工作站的品牌上下文、目标客户、内容语气、禁止表达和目标 AI 平台。

## 项目档案

`/settings` 中的项目档案是当前 GEO 工作站的基础上下文，会用于真实 AI 内容生成和 AI 拓词。

项目档案适用于：

- 企业品牌
- 产品
- 服务
- 课程
- 门店
- 本地生活
- 个人品牌
- 其他项目

项目档案不替代知识库事实。它定义“这个项目是谁、服务谁、怎么表达”，而知识库定义“有哪些可验证事实”。真实 AI 生成时，具体参数、案例、认证、价格、效果承诺、课程结果或服务细节仍必须来自知识库、目标提示词或任务输入。

## Mock 能力

- GEO 分析：`/geo-analysis` 使用 Mock 分析器，不调用真实外部 AI 平台，也不访问真实网站。
- AI 拓词生成：`/expansion` 默认使用 Mock Provider，也可选择 `openai_compatible`；真实 AI 会消耗接口额度。
- GEO 内容生成：`/content-tasks` 默认使用 Mock 内容生成器，也可选择 `openai_compatible` 生成真实 AI 内容。
- API Key 管理：真实 AI Key 只在后端 `.env` / `.env.production` 配置，前端不会读取、输入、保存或展示。

## 未实现能力

- 开放注册、忘记密码、短信/邮箱验证码、OAuth、多租户和复杂菜单级权限。
- 多租户、计费、审批流。
- 外部 AI 平台自动检测和定时任务。
- 自动发布到外部媒体。
- PDF / Word / Excel 报告导出。
- 复杂图表大屏和月报排版。
- URL 抓取、整站采集、RAG 和向量数据库。

## 本地启动方式

安装依赖：

```bash
pnpm install
```

启动 PostgreSQL 并准备数据：

```bash
cp .env.example .env
docker compose up -d postgres
pnpm prisma:migrate
pnpm prisma:seed
```

`pnpm prisma:seed` 会创建默认管理员并写入密码 hash。开发环境可使用 `.env.example` 的占位账号密码；共享部署前必须修改 `JWT_SECRET`、`DEFAULT_ADMIN_EMAIL` 和 `DEFAULT_ADMIN_PASSWORD`。

启动后端：

```bash
pnpm dev:api
```

启动前端：

```bash
pnpm dev:web
```

默认访问：

- 前端：`http://localhost:5173`
- 登录页：`http://localhost:5173/login`
- 后端：`http://localhost:3000`

前端默认使用 `VITE_API_BASE_URL`，未设置时指向 `http://localhost:3000`。

## 前端检查与 MVP 验收

常用检查：

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
```

分阶段前端检查：

```bash
pnpm test:web-framework
pnpm test:web-dashboard
pnpm test:web-geo-analysis
pnpm test:web-geo-prompts
pnpm test:web-expansion
pnpm test:web-knowledge
pnpm test:web-instructions
pnpm test:web-content
pnpm test:web-model-inclusion
pnpm test:web-reports
pnpm test:web-auth
```

前端 MVP 路由与断网态冒烟：

```bash
pnpm test:web-mvp
```

该脚本会启动一个临时 Vite 服务，用无头 Chrome 检查主要路由标题，并把 API 地址指向不可用端口，确认后端未启动时页面不白屏。

内部演示版交付检查：

```bash
pnpm check:internal-mvp
```

演示交接文档：

- `docs/demo/internal-demo-guide.md`
- `docs/demo/mvp-feature-checklist.md`
- `docs/demo/demo-data-notes.md`

## 常见问题

### 后端未启动

登录页或业务页面会显示“后端未连接”“登录失败”或“加载失败”，但前端路由不应白屏。先确认：

```bash
docker compose up -d postgres
pnpm dev:api
curl http://localhost:3000/health
```

### 登录失败或登录态过期

先确认已经执行 migration 和 seed：

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

如果是共享部署，确认私有环境变量中的 `DEFAULT_ADMIN_PASSWORD` 已在 seed 前设置，并且 `JWT_SECRET` 没有在 API 重启后被意外改动。登录态过期或 API 返回 401 时，前端会清理本地 token 并跳转 `/login`。

### CSV 导出

提示词、模型覆盖记录和 GEO 报表均支持 CSV 导出。导出失败时通常是后端未启动、筛选参数不合法或 API 地址配置错误。

### 文件上传格式限制

企业 GEO 知识库第一版只支持：

- `.txt`
- `.md`
- `.csv`

暂不支持 PDF、Word、Excel、URL 抓取或整站采集。

### Mock 与真实 AI Provider 提示

看到 Mock 提示是正常的。GEO 分析仍使用 Mock 分析器；AI 拓词和 GEO 内容生成默认使用 Mock，也可以在表单中选择 `openai_compatible`。真实 AI 会消耗接口额度，API Key 只允许在后端环境变量中配置，前端不提供密钥配置入口。
