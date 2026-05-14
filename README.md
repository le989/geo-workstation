# GEO 工作站

GEO 工作站是一套 GEO 营销运营系统，用于围绕生成式 AI 搜索/问答场景建设品牌诊断、提示词策略、企业知识资产、GEO 内容生成、模型覆盖记录和优化复盘能力。

它不是普通 CMS、普通知识库，也不是员工效率工具。所有后续功能都必须服务于这条业务主线：

`GEO 诊断 -> 提示词策略 -> 企业知识库 -> GEO 内容生成 -> 效果记录 -> 优化建议`

## 技术栈

- 前端：Vue 3 + Vite + TypeScript + Element Plus
- 后端：NestJS + TypeScript
- 数据库：PostgreSQL，Phase 1 开始建模接入
- ORM：Prisma，Phase 1 开始接入
- 队列：Redis + BullMQ，后续 AI 和解析任务使用
- 文件存储：本地存储起步
- AI 接入：默认 Mock，支持 OpenAI-compatible Provider；可通过后端环境变量配置 DeepSeek、硅基流动或其他兼容服务
- 包管理：pnpm workspace

## 目录结构

```text
.
├── AGENTS.md
├── README.md
├── apps
│   ├── api
│   └── web
├── docs
│   ├── implementation-plan.md
│   └── specs
│       └── geo-marketing-platform-spec.md
├── packages
│   └── shared
├── scripts
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## 文档路径

- 项目约束：`AGENTS.md`
- 产品规格：`docs/specs/geo-marketing-platform-spec.md`
- 实施计划：`docs/implementation-plan.md`
- 后端 API 文档：`docs/api/backend-api.md`
- GEO MVP 联调流程：`docs/api/geo-mvp-flow.md`
- 前端 MVP 使用指南：`docs/frontend/frontend-mvp-guide.md`
- 内部演示指南：`docs/demo/internal-demo-guide.md`
- MVP 功能清单：`docs/demo/mvp-feature-checklist.md`
- 演示数据说明：`docs/demo/demo-data-notes.md`
- 部署准备指南：`docs/deployment/deployment-guide.md`
- 环境变量指南：`docs/deployment/env-guide.md`
- 数据库备份与恢复：`docs/deployment/database-backup.md`
- 上线前检查清单：`docs/deployment/release-checklist.md`
- 自用操作 SOP：`docs/operation/self-use-sop.md`
- 真实 AI 测试计划：`docs/operation/real-ai-test-plan.md`
- 真实 AI 质量记录：`docs/operation/quality-notes.md`
- 通用内容质量规则：`docs/operation/content-quality-rules.md`
- 内容质量检查与发布稿优化：`docs/operation/content-quality-check.md`
- 跨行业通用模板体系：`docs/operation/generic-template-system.md`
- 默认/示例指令模板备份：`docs/operation/default-instruction-templates.md`

根目录原始 spec 已归位到 `docs/specs/geo-marketing-platform-spec.md`，该路径是正式 spec 路径。

## 内部演示版 MVP

当前版本状态：`internal-mvp-v0.2`。

一键启动顺序：

```bash
cp .env.example .env # 如果本地还没有 .env
docker compose up -d postgres
pnpm install
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev:api
pnpm dev:web
```

默认管理员由 seed 创建。开发环境可使用 `.env.example` 中的占位账号和密码；共享部署或生产环境必须先在私有 `.env` / `.env.production` 中修改 `JWT_SECRET`、`DEFAULT_ADMIN_EMAIL` 和 `DEFAULT_ADMIN_PASSWORD`，再执行 seed。

演示入口：

```text
http://localhost:5173/login
```

演示指南：

- `docs/demo/internal-demo-guide.md`
- `docs/demo/mvp-feature-checklist.md`
- `docs/demo/demo-data-notes.md`

内部演示版验收命令：

```bash
pnpm lint
pnpm typecheck
pnpm build
DATABASE_URL=postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public pnpm test:api
pnpm smoke:api
pnpm test:web-mvp
pnpm test:auth
pnpm test:web-auth
pnpm check:internal-mvp
```

`pnpm smoke:api` 需要先启动后端 API，并会先使用默认管理员账号登录。可以通过 `SMOKE_AUTH_EMAIL` 和 `SMOKE_AUTH_PASSWORD` 覆盖冒烟测试使用的登录账号。

当前 Mock 能力：

- GEO 分析。
- AI 拓词默认 Mock，可切换 `openai_compatible`，并按用户决策场景生成“真实用户会向 AI 提问”的候选问题。
- GEO 内容生成默认 Mock，可切换 `openai_compatible`。

当前未实现能力：

- 真实外部 AI 检测。
- 多模型批量外部检测和定时检测。
- 开放注册、忘记密码、OAuth、多租户和复杂菜单级权限。
- 自动发布。
- 真实服务器部署执行。
- 多用户协作。

## 登录和简单权限

Phase 4D 已加入内部 MVP 所需的最小访问控制：

- 后端使用 JWT Bearer 登录态。
- `POST /api/auth/login` 校验邮箱、密码和用户状态。
- `GET /api/auth/me` 返回当前登录用户。
- `POST /api/auth/logout` 用于前端清理登录态。
- `/health` 和 `/api/auth/login` 可匿名访问，其他 `/api/*` 默认需要登录。
- 前端 `/login` 提供登录页，业务路由会在未登录时跳转登录页。
- 顶部栏显示当前用户、角色和退出登录入口。

本阶段不做开放注册、忘记密码、短信/邮箱验证码、OAuth、多租户、团队管理或复杂菜单级权限。

## AI Provider 配置

Phase 4E 已加入统一 AI Provider 抽象：

- 默认 `AI_PROVIDER=mock`，无需真实 API Key，适合演示、测试和离线开发。
- `AI_PROVIDER=openai_compatible` 时，后端通过 OpenAI-compatible Chat Completions 接口生成内容或拓词候选。
- 可以通过 `AI_OPENAI_COMPATIBLE_BASE_URL` 和 `AI_OPENAI_COMPATIBLE_MODEL` 配置 DeepSeek、硅基流动或其他兼容服务。
- `AI_OPENAI_COMPATIBLE_API_KEY` 只允许放在后端私有 `.env` / `.env.production` 中，前端不会读取、输入、保存或展示 API Key。
- 真实 AI 调用会消耗接口额度；缺少 key、鉴权失败、模型不可用或超时时，后端会返回可读错误并写入 `ai_call_logs`。

示例配置见 `.env.example`、`.env.production.example` 和 `docs/deployment/env-guide.md`。

## 项目档案与通用化

Phase General-1 增加了单项目“项目档案 / 品牌档案”能力。系统不绑定某个固定公司、产品线或行业；它适用于企业品牌、产品、服务、课程、门店、本地生活、个人品牌或其他项目在生成式 AI 搜索/问答场景中的可见度运营。

在 `/settings` 可以维护：

- 项目名称、企业名称、品牌名称、官网。
- 所属行业，用户自由填写，不作为固定枚举。
- 主营产品 / 服务 / 课程 / 门店 / 个人品牌方向。
- 目标客户、品牌定位、内容语气、禁止表达、目标 AI 平台和补充说明。

项目档案会作为真实 AI 内容生成和 AI 拓词的上下文，但不会替代知识库事实。具体参数、价格、认证、案例、效果承诺、课程结果、门店活动或服务细节仍必须来自知识库、目标提示词或任务输入。

## 自用真实流程

Phase 4F 面向本地自用，不部署上线、不提交真实 Key、不做外部 AI 自动检测。

推荐阅读：

- 自用 SOP：`docs/operation/self-use-sop.md`
- 真实 AI 测试计划：`docs/operation/real-ai-test-plan.md`
- 质量记录模板：`docs/operation/quality-notes.md`

自用流程建议：

1. 在私有 `.env` 中配置 `AI_OPENAI_COMPATIBLE_API_KEY`，不要提交该文件。
2. 启动 PostgreSQL、后端和前端。
3. 登录系统。
4. 先在 `/settings` 配置当前项目档案，再导入该项目的真实提示词和知识库资料。仓库中的“激光测距传感器”资料仅作为示例数据。
5. 在 `/expansion` 使用 `provider = openai_compatible` 生成候选词，人工勾选保存。
6. 在 `/content-tasks` 使用 `provider = openai_compatible` 生成内容，人工审核后导出 Markdown。
   内容生成后可在详情中执行“质量检查”和“生成发布优化版”，用于识别知识库外参数、品牌表达和 GEO 结构风险；优化稿不会自动覆盖原文。
7. 人工录入模型覆盖记录，并在 `/reports` 复盘。

自用就绪检查：

```bash
pnpm check:self-use
```

该脚本只检查文档、示例配置和脚本是否齐备，不读取或打印真实环境变量。

## 部署准备

Phase 4C 只完成 `internal-mvp-v0.2` 的部署上线准备：补充文档、环境变量示例、PM2 示例、Nginx 示例、Docker Compose 生产示例和部署检查脚本。当前阶段未实际上线，未连接真实服务器，未配置真实域名，未配置真实数据库密码，也不会提交真实 AI Provider Key。

部署准备和真实 AI 自用配置都必须坚持：不提交真实 AI Provider Key。

当前推荐部署方案：

- 单 VPS 或内网测试服务器。
- PostgreSQL 使用 Docker Compose。
- NestJS API 构建后使用 PM2 运行。
- Vite Web 构建后由 Nginx 托管静态文件。
- Nginx 将 `/api` 和 `/health` 反向代理到本机 API。

后续可选方案：

- `deploy/docker-compose.production.example.yml` 提供一体化 Docker Compose 结构示例。
- 该示例不替换当前本地开发 `docker-compose.yml`。

部署文档：

- `docs/deployment/deployment-guide.md`
- `docs/deployment/env-guide.md`
- `docs/deployment/database-backup.md`
- `docs/deployment/release-checklist.md`

生产环境变量示例：

- `.env.production.example`
- `apps/web/.env.production.example`

部署示例配置：

- `deploy/ecosystem.config.cjs`
- `deploy/nginx.geo-workstation.example.conf`
- `deploy/docker-compose.production.example.yml`

部署准备检查：

```bash
pnpm check:deployment
```

## 本地启动

安装依赖：

```bash
pnpm install
```

启动前端：

```bash
pnpm dev:web
```

前端默认地址：`http://localhost:5173`
前端 API 地址默认读取 `VITE_API_BASE_URL`，未配置时使用 `http://localhost:3000`。前端环境变量示例见 `apps/web/.env.example`。

登录页：`http://localhost:5173/login`

启动后端：

```bash
pnpm dev:api
```

后端健康检查：`http://localhost:3000/health`

## 前端已完成页面

- `/login`：内部登录页，使用邮箱和密码获取 JWT 登录态。
- `/dashboard`：GEO 工作台，展示总览指标、优化建议、快捷入口和能力边界。
- `/geo-analysis`：GEO 分析，支持创建任务、编辑 pending 任务、运行 Mock 分析、查看结果、转提示词和创建内容任务。
- `/geo-prompts`：提示词策略库，支持查询、筛选、新增、编辑、软删除、批量导入和 CSV 导出。
- `/expansion`：AI 拓词，支持手动组合、默认 Mock 或 `openai_compatible` 候选生成、重复标记、勾选保存到提示词库。
- `/knowledge-bases`：企业 GEO 知识库，支持知识库管理、文本导入、txt/md/csv 上传解析、文件 reparse 和知识片段管理。
- `/instruction-templates`：指令库，支持指令模板创建、编辑、查看详情、复制和软删除。
- `/content-tasks`：GEO 内容生成，支持创建默认 Mock 或 `openai_compatible` 内容任务、查看/编辑/删除内容项、Markdown 导出和失败重试入口。
- `/model-inclusion-records`：模型覆盖记录，支持手动录入、批量导入、summary、未覆盖提示词和 CSV 导出。
- `/reports`：GEO 报表，支持总览、提示词覆盖、模型覆盖、内容覆盖、知识库覆盖、优化建议和 CSV 导出。
- `/settings`：系统设置，维护单项目档案、AI 接口配置边界和事实来源说明；不包含团队管理、Provider Key 管理或复杂权限配置。

完整前端使用说明见 `docs/frontend/frontend-mvp-guide.md`。

## 检查命令

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
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
pnpm test:web-mvp
pnpm test:web-auth
pnpm test:auth
pnpm test:ai-provider
pnpm test:api
pnpm check:internal-mvp
pnpm check:deployment
pnpm check:self-use
pnpm test:geo-prompts
pnpm test:geo-expansion
pnpm test:geo-knowledge
pnpm test:geo-knowledge-files
pnpm test:geo-instructions
pnpm test:geo-content
pnpm test:model-inclusion
pnpm test:geo-reports
pnpm test:geo-analysis
pnpm test:prisma
pnpm smoke:api
```

`pnpm smoke:api` 需要 API 服务已经启动；默认请求 `http://localhost:3000`，可通过 `API_BASE_URL` 覆盖。脚本会先登录默认管理员，登录账号可通过 `SMOKE_AUTH_EMAIL` / `SMOKE_AUTH_PASSWORD` 覆盖。

Prisma 命令：

```bash
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

这些命令可以从项目根目录直接执行。`apps/api/prisma.config.ts` 会显式加载项目根目录 `.env`，不需要手动 `export DATABASE_URL`。

`pnpm prisma:seed` 会为默认管理员写入密码 hash。共享部署前请先修改私有环境变量中的 `DEFAULT_ADMIN_PASSWORD`，不要使用示例占位密码。

Phase 1 使用 `docker-compose.yml` 中的 PostgreSQL。首次本地执行前可复制环境变量文件：

```bash
cp .env.example .env
docker compose up -d postgres
pnpm prisma:migrate
pnpm prisma:seed
```

后端 MVP 冒烟测试：

```bash
# 终端 1
docker compose up -d postgres
pnpm dev:api

# 终端 2
pnpm smoke:api
```

如果 API 不在默认端口：

```bash
API_BASE_URL=http://localhost:3001 pnpm smoke:api
```

如果冒烟测试需要使用非默认管理员账号：

```bash
SMOKE_AUTH_EMAIL=admin@example.com SMOKE_AUTH_PASSWORD=replace_me pnpm smoke:api
```

前端 MVP 路由与后端断开态冒烟测试：

```bash
pnpm test:web-mvp
```

该脚本会启动临时 Vite 服务，用无头 Chrome 检查主要路由标题，并将 API 地址指向不可用端口，确认后端未启动时页面不白屏。

也可以单独检查某个工作区：

```bash
pnpm --filter @geo-workstation/web build
pnpm --filter @geo-workstation/api build
pnpm --filter @geo-workstation/shared build
```

## Phase 0 完成内容

- 初始化 git 仓库，不创建远程仓库，不推送代码。
- 建立 pnpm workspace monorepo 骨架。
- 创建 `apps/web` Vue 3 + Vite + TypeScript + Element Plus 最小前端。
- 创建 `apps/api` NestJS + TypeScript 最小后端。
- 创建 `packages/shared` 共享类型占位包。
- 创建 ESLint、Prettier、TypeScript 基础配置。
- 创建 `.env.example`，仅包含占位配置，不包含真实密钥。
- 将产品 spec 归位到 `docs/specs/geo-marketing-platform-spec.md`。
- 不连接数据库，不创建 Prisma 模型，不接入 DeepSeek，不实现业务 API 或业务页面。

## Phase 1 完成内容

- 创建 Prisma schema、迁移和 seed。
- 建立 GEO 业务数据表：`geo_analysis_tasks`、`geo_prompts`、`knowledge_bases`、`knowledge_chunks`、`instruction_templates`、`content_tasks`、`model_inclusion_records` 等。
- 添加 Prisma Client、`PrismaModule`、`PrismaService` 和基础模型验证。
- 继续保持所有命名优先表达 GEO 业务语义。

## Phase 2A 完成内容

- 增加统一 API 响应封装，接口返回 `{ code, message, data }`。
- 增加全局异常过滤器和全局 DTO 校验管道。
- 增加后端配置管理，支持根目录 `.env`。
- 将 `PrismaService` 接入配置管理。
- 升级 health 接口为 Phase 2A 基础设施检查。
- 增加 GEO 业务模块骨架：GEO 分析、提示词策略、AI 拓词、企业 GEO 知识库、指令库、GEO 内容、模型覆盖记录、GEO 报表。
- 不实现业务 CRUD、不接入真实 AI Provider、不新增前端业务页面。

## Phase 2B 完成内容

- 实现提示词策略库后端 API：列表查询、新增、更新、软删除、批量导入、CSV 导出。
- 查询默认排除软删除数据，支持 GEO 提示词搜索、分页和业务筛选。
- 新增和更新 `promptText` 时检查未软删除数据中的重复项。
- 批量导入按行校验，标记批次内重复、数据库重复和失败行，合法且不重复的数据才入库。
- 不实现前端页面、不做 AI 拓词、不接入 DeepSeek、不实现知识库或内容生成。

## Phase 2C 完成内容

- 实现 AI 拓词后端 API：规则拓词、Mock AI 拓词、任务详情、勾选候选词保存到 GEO 提示词库。
- 规则拓词覆盖七类组合规则，并在候选词阶段标记批次内重复和数据库重复。
- Mock AI Provider 只作为流程占位，不接入真实 DeepSeek，不使用真实 API Key。
- 候选词不会直接入库，必须通过 `save-candidates` 勾选保存，保存前继续按未软删除 `promptText` 去重。
- Mock AI 调用也写入 `ai_call_logs`，保留后续真实 Provider 替换空间。
- 不实现前端页面、不做知识库解析、不做内容生成、不做登录注册或权限守卫。

## Phase 2D 完成内容

- 实现企业 GEO 知识库后端 API：知识库列表、创建、详情、更新、软删除。
- 实现粘贴文本导入 `text-import`，创建可编辑的 GEO 知识片段，文本导入不关联文件，`fileId` 保持为空。
- 知识片段支持分页查询、标题/正文搜索、来源、产品线、资料类型和标签筛选。
- 知识片段支持编辑和软删除，知识库软删除会同步软删除关联文件和知识片段。
- `sourceType` 和 `materialType` 第一版先按字符串处理，后续可枚举化为 GEO 资料类型。
- 不做真实文件上传、PDF/Word/Excel 解析、URL 抓取、RAG、向量数据库、前端页面、内容生成或真实 AI Provider。

## Phase 2E 完成内容

- 实现企业 GEO 知识库文件 API：上传文件、文件列表、文件详情、重新解析、文件软删除。
- 文件上传使用 `multipart/form-data` 的 `file` 字段，第一版支持 `.txt`、`.md`、`.csv`，文件大小限制为 10MB。
- 本地文件存储路径为 `LOCAL_STORAGE_ROOT/uploads/knowledge-bases/{knowledgeBaseId}/`，默认落在 `.env.example` 的 `./storage` 下。
- 上传后创建 `knowledge_files` 记录，并同步解析为 `knowledge_chunks`；解析失败时保留文件记录，设置 `parseStatus = failed` 并写入 `errorMessage`。
- `reparse` 成功时软删除旧片段并创建新片段；失败时更新文件解析状态和错误信息，不让接口崩溃。
- 文件软删除会设置 `knowledge_files.deletedAt`，并同步软删除关联 `knowledge_chunks`；第一版不物理删除本地文件。
- 不做 PDF/Word/Excel 解析、URL 抓取、整站采集、RAG、向量数据库、前端页面、内容生成或真实 AI Provider。

## Phase 2F 完成内容

- 实现 GEO 指令库后端 API：指令模板列表、创建、详情、编辑、复制、软删除。
- 列表默认排除软删除数据，支持名称/正文/内容类型/指令类型搜索，以及指令类型、内容类型、目标提示词类型、目标模型、创建人筛选。
- 创建和编辑会按同一 `instructionType + name` 检查未软删除模板重名。
- 复制指令会保留 GEO 内容生产方法字段，默认生成“原名称 副本”，名称冲突时自动追加序号。
- `contentType` 在 API 中可选；第一版省略时默认写入 `geo_content`，以满足当前 Prisma 必填字段。
- 不做前端页面、不做内容生成、不接入 DeepSeek 或真实 AI Provider。

## Phase 2G 完成内容

- 实现 GEO 内容生成后端 API：内容任务列表、创建、详情、失败重试，以及内容项列表、编辑、软删除、Markdown 导出。
- 创建内容任务时校验 GEO 提示词、知识库和指令模板存在且未删除；任务状态从 `running` 流转到 `succeeded` 或 `failed`。
- 第一版使用 `mock-content-v1` 同步生成内容，不接入真实 DeepSeek，不使用真实 API Key。
- 每个目标 GEO 提示词生成一个 `content_item`，生成结果包含标题、正文、GEO 优化点和建议发布位置。
- `retry` 只重新生成失败内容项，已成功内容项不会重复生成；每次生成或重试都会写入 `ai_call_logs`。
- Markdown 导出只返回 Markdown 文本，不做 Word 导出、不做复杂排版、不做自动发布。
- 不做前端页面、不接真实 AI Provider、不做权限守卫、登录注册、多租户或外部媒体发布。

## Phase 2H 完成内容

- 实现模型覆盖与上词记录后端 API：手动新增、分页查询、批量导入、CSV 导出、未覆盖提示词查询和基础 summary。
- 新增记录前校验 GEO 提示词存在且未软删除；查询记录时返回关联提示词的 `promptText`、类型、产品线和用户意图。
- 批量导入按行独立校验，支持通过 `geoPromptId` 或 `promptText` 匹配提示词；导入成功行强制写入 `recordMethod = import`，不自动创建新提示词。
- 未覆盖提示词查询基于 `geo_prompts`，默认只查询 `trackEnabled = true` 且未软删除的提示词。
- 新增记录和导入成功后会刷新 `geoPrompt.latestCoverageStatus`：`recommended`、`mentioned`、`not_mentioned`。
- summary 返回品牌提及率、推荐率、官网引用率、模型分布和产品线分布。
- 不做自动 AI 检测、不接入真实 DeepSeek/豆包/Kimi/通义、不做定时任务、不做前端页面或复杂报表图表。

## Phase 2I 完成内容

- 实现 GEO 报表后端 API：GEO 总览、提示词覆盖、模型覆盖、内容覆盖、知识库覆盖、优化建议和 CSV 导出。
- GEO 总览聚合提示词资产、知识库资产、内容产出、模型覆盖记录、品牌提及/推荐率、官网引用率和失败内容任务。
- 提示词覆盖报表统计提示词类型、产品线、用户意图、最新覆盖状态和高优先级未覆盖提示词。
- 模型覆盖报表按模型统计品牌提及率、推荐率、官网引用率，并返回推荐提示词和未提及提示词。
- 内容覆盖报表统计内容任务、内容项、生成类型分布，以及高优先级无内容提示词。
- 知识库覆盖报表统计知识库、文件、片段、解析状态和缺知识库产品线。
- 优化建议第一版使用规则生成，不接入 AI，不做自动检测或前端图表。
- 不修改 Prisma schema，不做前端页面、不接真实 AI Provider、不做 Word/PDF 报告导出或复杂月报。

## Phase 2J 完成内容

- 实现 GEO 分析任务后端 API：列表、创建、详情、编辑、Mock 执行、提示词建议转入提示词库、基于分析建议创建内容任务。
- 创建任务时保存品牌、官网、产品线、目标模型和基础训练词输入；由于当前 schema 没有 `baseWords` 字段，第一版将其保存在 `summary.inputBaseWords`。
- Mock GEO 分析不调用真实 AI、不访问真实网站，生成 summary、内容缺口、知识库缺口、提示词建议和 `geo_model_results`。
- `convert-prompts` 将 `promptSuggestions` 转入 `geo_prompts`，使用 `source = geo_analysis:{taskId}` 作为轻量追溯标记，保存前按未软删除 `promptText` 去重。
- `create-content-task` 复用 Phase 2G 的 `ContentTasksService` 和 Mock 内容生成逻辑，不重复实现内容生成。
- 当前 schema 没有分析任务到内容任务的关系字段，详情接口第一版返回 `relatedContentTasks: []`，后续可在需要时补关系模型。
- 不修改 Prisma schema，不做真实 AI、外部检测、网页爬取、SEO 扫描、前端页面、定时任务或权限系统。

## Phase 2K 完成内容

- 补充后端 API 交接文档：统一响应、错误结构、环境变量、启动方式和全部后端模块接口清单。
- 补充 GEO MVP 端到端联调流程文档，说明从分析任务到报表建议的业务路径。
- 新增 `scripts/smoke-test-api.mjs`，用 HTTP 请求跑通本地后端 MVP 主链路。

## Phase 3A 完成内容

- 搭建 Vue Router 后台路由，`/` 默认跳转 `/dashboard`。
- 搭建 Element Plus 后台布局、左侧 GEO 菜单、顶部环境标识和后端健康状态入口。
- 创建 GEO 工作台、GEO 分析、提示词策略库、AI 拓词、企业 GEO 知识库、指令库、GEO 内容生成、模型覆盖记录、GEO 报表、系统设置占位页。
- 接入 Pinia，用于保存前端环境标识和 API Base URL。
- 新增 fetch API client 基础封装，统一处理后端 `{ code, message, data }` 响应结构。
- 新增空状态、加载状态、错误状态组件和 Phase 3A 前端骨架检查脚本。
- 不实现业务 CRUD 页面、不修改后端业务逻辑、不修改 Prisma schema、不接入真实 AI。

## Phase 3B 完成内容

- 将 `/dashboard` 从占位页升级为 GEO 工作台首页。
- 调用 `GET /api/reports/geo-overview` 展示提示词资产、知识库资产、内容资产和模型覆盖效果。
- 调用 `GET /api/reports/optimization-suggestions` 展示最多 8 条待优化建议。
- 增加手动刷新、加载中、错误、空状态处理；后端未启动时页面保持可访问。
- 增加快捷入口：GEO 分析、提示词导入、AI 拓词、知识库、指令库、内容生成、模型覆盖记录、GEO 报表。
- 展示真实入库能力、Mock 能力和未做能力边界。
- 不实现其他业务页面 CRUD、不新增图表库、不修改后端业务逻辑或 Prisma schema。
- 新增 `pnpm smoke:api`，默认请求 `http://localhost:3000`，支持 `API_BASE_URL` 覆盖。
- 当前 Mock 能力：GEO 分析、AI 拓词、GEO 内容生成。
- 当前真实入库能力：登录、提示词、知识库、txt/md/csv 文件上传解析、指令库、内容任务和内容项、模型覆盖记录、报表统计。
- 不修改 Prisma schema，不新增业务模块、不做前端页面、不接真实 AI、不做外部检测、爬虫、定时任务、登录注册、权限守卫、多租户或外部媒体发布。

## Phase 3A 下一步

Phase 3A 建议进入前端基础布局与后台框架。
