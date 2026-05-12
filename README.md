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
pnpm test:prisma
```

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

## Phase 2C 下一步

Phase 2C 建议继续后端手工录入类 API：

- GEO 分析任务基础 API。
- 企业 GEO 知识库基础 API。
- 指令库、内容任务、模型覆盖记录的非 AI、非自动化 API。
