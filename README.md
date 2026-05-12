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
- AI 接入：DeepSeek Provider 起步，并保留 Provider 抽象，Phase 4 开始接入
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

根目录原始 spec 已归位到 `docs/specs/geo-marketing-platform-spec.md`，该路径是正式 spec 路径。

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

启动后端：

```bash
pnpm dev:api
```

后端健康检查：`http://localhost:3000/health`

## 检查命令

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
pnpm test:api
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

`pnpm smoke:api` 需要 API 服务已经启动；默认请求 `http://localhost:3000`，可通过 `API_BASE_URL` 覆盖。

Prisma 命令：

```bash
pnpm prisma:validate
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

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
- 新增 `pnpm smoke:api`，默认请求 `http://localhost:3000`，支持 `API_BASE_URL` 覆盖。
- 当前 Mock 能力：GEO 分析、AI 拓词、GEO 内容生成。
- 当前真实入库能力：提示词、知识库、txt/md/csv 文件上传解析、指令库、内容任务和内容项、模型覆盖记录、报表统计。
- 不修改 Prisma schema，不新增业务模块、不做前端页面、不接真实 AI、不做外部检测、爬虫、定时任务、登录注册、权限守卫、多租户或外部媒体发布。

## Phase 3A 下一步

Phase 3A 建议进入前端基础布局与后台框架。
