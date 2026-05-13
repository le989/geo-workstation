# 前端 MVP 使用指南

本文档用于 Phase 3J 前端整体联调和内部演示交接。当前前端已经可以作为 GEO 营销运营系统的内部工作台使用，核心仍然围绕：

`GEO 诊断 -> 提示词策略 -> 企业知识库 -> GEO 内容生成 -> 效果记录 -> 优化建议`

它不是普通 CMS、文件柜或内容管理后台。

## 前端页面总览

| 路由                       | 页面            | 用途                                                                                    |
| -------------------------- | --------------- | --------------------------------------------------------------------------------------- |
| `/dashboard`               | GEO 工作台      | 查看提示词、知识库、内容、模型覆盖和优化建议的总览，并进入主要操作路径。                |
| `/geo-analysis`            | GEO 分析        | 当前为待前端实现占位页；后端已有 Mock 分析 API，后续补齐任务页面。                      |
| `/geo-prompts`             | 提示词策略库    | 维护训练词、蒸馏词、品牌词、场景词，支持筛选、新增、编辑、软删除、批量导入、CSV 导出。  |
| `/expansion`               | AI 拓词         | 使用手动组合或 Mock AI 生成候选 GEO 提示词，人工勾选后保存到提示词策略库。              |
| `/knowledge-bases`         | 企业 GEO 知识库 | 创建知识库，文本导入知识片段，上传 txt/md/csv 并查看解析状态、片段和 reparse。          |
| `/instruction-templates`   | 指令库          | 管理 GEO 内容生成指令模板，支持创建、编辑、查看详情、复制和软删除。                     |
| `/content-tasks`           | GEO 内容生成    | 选择提示词、知识库和指令模板创建 Mock 内容任务，查看、编辑、删除内容项，导出 Markdown。 |
| `/model-inclusion-records` | 模型覆盖记录    | 手动录入或批量导入提示词在 AI 模型中的提及、推荐、官网引用和竞品情况。                  |
| `/reports`                 | GEO 报表        | 查看总览、提示词覆盖、模型覆盖、内容覆盖、知识库覆盖和优化建议，并导出 CSV。            |
| `/settings`                | 系统设置        | 当前为本地联调配置占位页，不包含登录权限或 Provider Key 管理。                          |

## 完整 GEO MVP 使用流程

1. 打开 `/dashboard`，查看当前 GEO 资产、模型覆盖效果和优化建议。后端未启动时页面仍可访问，并显示清晰错误提示。
2. 进入 `/geo-prompts`，新增或批量导入 GEO 提示词。提示词是后续拓词、内容生成、模型覆盖和报表复盘的核心资产。
3. 进入 `/expansion`，用手动组合或 Mock AI 生成候选提示词。候选词不会自动入库，必须人工勾选保存。
4. 进入 `/knowledge-bases`，创建企业 GEO 知识库，通过文本导入或 txt/md/csv 上传沉淀知识片段。
5. 进入 `/instruction-templates`，创建选型指南、FAQ、AI 问答素材、应用方案等 GEO 内容生成指令。
6. 进入 `/content-tasks`，选择 GEO 提示词、知识库和指令模板创建内容任务。当前内容正文由 Mock 生成器生成，生成结果真实入库并可编辑、删除和导出 Markdown。
7. 进入 `/model-inclusion-records`，人工录入或导入模型覆盖记录，记录品牌是否被提及、推荐、引用官网，以及竞品出现情况。
8. 进入 `/reports`，复盘提示词覆盖、模型表现、内容覆盖、知识库覆盖和优化建议。
9. 回到 `/dashboard`，刷新总览，观察提示词、知识库、内容、覆盖记录和优化建议变化。

## 真实入库能力

- 提示词策略库：新增、编辑、软删除、批量导入、CSV 导出。
- AI 拓词候选保存：规则或 Mock AI 生成候选，勾选后保存为 GEO 提示词。
- 企业 GEO 知识库：知识库、知识片段、txt/md/csv 文件记录、解析状态和片段入库。
- 指令库：指令模板创建、编辑、复制、软删除。
- GEO 内容任务与内容项：任务、内容项、编辑、软删除、Markdown 导出。
- 模型覆盖记录：手动新增、批量导入、summary、未覆盖提示词、CSV 导出。
- GEO 报表：总览、覆盖报表、知识库覆盖、优化建议、CSV 导出。

## Mock 能力

- GEO 分析：后端已有 Mock 分析 API，前端页面仍为待实现占位。
- AI 拓词生成：`/expansion` 的 AI 模式使用 Mock Provider，不调用真实 DeepSeek、豆包、Kimi 或通义。
- GEO 内容生成：`/content-tasks` 使用 Mock 内容生成器，结果仅用于流程测试和内部演示。

## 未实现能力

- 登录注册和权限系统。
- 多租户、计费、审批流。
- 真实 DeepSeek / 豆包 / Kimi / 通义 Provider 接入。
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
pnpm test:web-geo-prompts
pnpm test:web-expansion
pnpm test:web-knowledge
pnpm test:web-instructions
pnpm test:web-content
pnpm test:web-model-inclusion
pnpm test:web-reports
```

前端 MVP 路由与断网态冒烟：

```bash
pnpm test:web-mvp
```

该脚本会启动一个临时 Vite 服务，用无头 Chrome 检查主要路由标题，并把 API 地址指向不可用端口，确认后端未启动时页面不白屏。

## 常见问题

### 后端未启动

页面会显示“后端未连接”或“加载失败”，但前端路由不应白屏。先确认：

```bash
docker compose up -d postgres
pnpm dev:api
curl http://localhost:3000/health
```

### CSV 导出

提示词、模型覆盖记录和 GEO 报表均支持 CSV 导出。导出失败时通常是后端未启动、筛选参数不合法或 API 地址配置错误。

### 文件上传格式限制

企业 GEO 知识库第一版只支持：

- `.txt`
- `.md`
- `.csv`

暂不支持 PDF、Word、Excel、URL 抓取或整站采集。

### Mock 能力提示

看到 Mock 提示是正常的。当前阶段的 GEO 分析、AI 拓词生成和内容生成均不调用真实 AI Provider；真实 Provider 接入应在 Phase 4 后单独推进。
