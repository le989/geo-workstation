# Backend API

本文档整理 Phase 2K 时后端已实现的 MVP API，用于前端联调、后端验收和运营演示。项目定位是 GEO 营销运营系统，所有接口都围绕 `GEO 诊断 -> 提示词策略 -> 企业知识库 -> GEO 内容生成 -> 效果记录 -> 优化建议`。

## 统一响应

成功响应统一为：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

异常响应同样使用统一结构：

```json
{
  "code": 400,
  "message": "Validation failed",
  "data": {
    "errors": ["targetModels must contain at least 1 elements"]
  }
}
```

常见错误码：

- `400`：参数校验失败、业务输入不合法、重复数据。
- `404`：资源不存在或已不可访问。
- `500`：未捕获的服务端异常。

## 环境与启动

关键环境变量：

| 变量                 | 用途                      | 默认/示例                                                                                   |
| -------------------- | ------------------------- | ------------------------------------------------------------------------------------------- |
| `API_PORT`           | NestJS API 端口           | `3000`                                                                                      |
| `DATABASE_URL`       | PostgreSQL 连接           | `postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public` |
| `REDIS_URL`          | 后续队列预留              | `redis://localhost:6379`                                                                    |
| `LOCAL_STORAGE_ROOT` | 本地上传文件根目录        | `./storage`                                                                                 |
| `DEEPSEEK_API_KEY`   | 后续真实 AI Provider 预留 | 空，Phase 2 不需要                                                                          |

本地启动：

```bash
cp .env.example .env
docker compose up -d postgres
pnpm install
pnpm prisma:migrate
pnpm prisma:seed
pnpm dev:api
```

健康检查：

```bash
curl http://localhost:3000/health
```

## API 清单

### Health

| Method | Path          | 用途             | 主要入参 | 主要返回                             | 备注                     |
| ------ | ------------- | ---------------- | -------- | ------------------------------------ | ------------------------ |
| GET    | `/health`     | API 健康检查     | 无       | 服务名、状态、GEO 闭环、基础设施状态 | 统一响应包装             |
| GET    | `/api/health` | API 健康检查别名 | 无       | 同上                                 | 便于统一 `/api` 前缀联调 |

### GEO Analysis

| Method | Path                                              | 用途                     | 主要入参                                                                                                         | 主要返回                                                        | 备注                                                           |
| ------ | ------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| GET    | `/api/geo-analysis-tasks`                         | 分页查询 GEO 分析任务    | `page`、`pageSize`、`search`、`status`、`productLine`、`createdBy`、`targetModel`、`createdFrom`、`createdTo`    | `items`、`total`、`page`、`pageSize`                            | `targetModel` 在 `targetModels` JSON 中匹配                    |
| POST   | `/api/geo-analysis-tasks`                         | 创建分析任务             | `name`、`brandName`、`websiteUrl`、`productLine`、`baseWords`、`targetModels`、`createdBy`                       | 分析任务                                                        | 初始 `pending`，不自动运行                                     |
| GET    | `/api/geo-analysis-tasks/:id`                     | 查看分析详情             | `id`                                                                                                             | `task`、`modelResults`、`relatedPrompts`、`relatedContentTasks` | 当前无分析任务到内容任务关系，`relatedContentTasks` 第一版为空 |
| PATCH  | `/api/geo-analysis-tasks/:id`                     | 编辑任务基础信息         | `name`、`brandName`、`websiteUrl`、`productLine`、`targetModels`                                                 | 分析任务                                                        | `running` 状态不可编辑                                         |
| POST   | `/api/geo-analysis-tasks/:id/run`                 | 执行 Mock GEO 分析       | `id`                                                                                                             | 分析详情和模型结果                                              | 不调用真实 AI，不访问真实网站                                  |
| POST   | `/api/geo-analysis-tasks/:id/convert-prompts`     | 将分析建议转入提示词库   | `selectedPromptTexts`、`promptType`、`productLine`、`userIntent`、`priority`、`trackEnabled`、`createdBy`        | `createdItems`、`skippedItems`                                  | 按未软删除 `promptText` 去重                                   |
| POST   | `/api/geo-analysis-tasks/:id/create-content-task` | 基于分析建议创建内容任务 | `name`、`knowledgeBaseId`、`instructionTemplateId`、`generationType`、`targetModel`、`geoPromptIds`、`createdBy` | 内容任务详情                                                    | 复用 GEO 内容生成 Mock 逻辑                                    |

### GEO Prompts

| Method | Path                           | 用途                | 主要入参                                                                                                                                     | 主要返回                             | 备注                               |
| ------ | ------------------------------ | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------------------------- |
| GET    | `/api/geo-prompts`             | 分页查询 GEO 提示词 | `page`、`pageSize`、`search`、`type`、`productLine`、`userIntent`、`priority`、`trackEnabled`、`latestCoverageStatus`、`createdBy`           | `items`、`total`、`page`、`pageSize` | 默认排除软删除                     |
| POST   | `/api/geo-prompts`             | 新增提示词          | `type`、`baseWord`、`promptText`、`productLine`、`scenario`、`userIntent`、`priority`、`targetModels`、`source`、`trackEnabled`、`createdBy` | 提示词                               | 创建前按未软删除 `promptText` 去重 |
| POST   | `/api/geo-prompts/bulk-import` | 批量导入提示词      | `rows[]`                                                                                                                                     | 成功/重复/失败行汇总                 | 单批最多 1000 行                   |
| PATCH  | `/api/geo-prompts/:id`         | 更新提示词          | 同创建字段的子集                                                                                                                             | 提示词                               | 已软删除不可更新                   |
| DELETE | `/api/geo-prompts/:id`         | 软删除提示词        | `id`                                                                                                                                         | 删除状态                             | 不物理删除                         |
| GET    | `/api/geo-prompts/export`      | 导出 CSV            | 同列表筛选                                                                                                                                   | CSV 文本                             | `data` 为 CSV 字符串               |

### GEO Expansion

| Method | Path                                      | 用途               | 主要入参                                                                                                    | 主要返回              | 备注                               |
| ------ | ----------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------- | ---------------------------------- |
| POST   | `/api/expansion/rule-generate`            | 规则组合拓词       | `baseWord`、`prefixes`、`serviceSuffixes`、`applicationSuffixes`、`promptType`、`productLine`、`userIntent` | `jobId`、`candidates` | 生成候选，不直接入库               |
| POST   | `/api/expansion/ai-generate`              | Mock AI 拓词       | `baseWord`、`promptType`、`count`、`constraints`、`targetModels`                                            | `jobId`、`candidates` | 使用 Mock Provider，不需要 API Key |
| GET    | `/api/expansion/jobs/:id`                 | 查看拓词任务       | `id`                                                                                                        | `job`、`candidates`   | 返回重复标记和保存状态             |
| POST   | `/api/expansion/jobs/:id/save-candidates` | 保存候选到提示词库 | `candidateIds`、`createdBy`、`defaultProductLine`、`defaultPriority`、`defaultTrackEnabled`                 | 保存/跳过/失败汇总    | 保存前继续去重                     |

### GEO Knowledge Bases

| Method | Path                                   | 用途                 | 主要入参                                                                             | 主要返回                                                     | 备注                   |
| ------ | -------------------------------------- | -------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------- |
| GET    | `/api/knowledge-bases`                 | 分页查询知识库       | `page`、`pageSize`、`search`、`productLine`、`status`、`createdBy`                   | `items`、`total`、`page`、`pageSize`                         | 默认排除软删除         |
| POST   | `/api/knowledge-bases`                 | 创建知识库           | `name`、`productLine`、`description`、`status`、`createdBy`                          | 知识库                                                       | 同产品线同名去重       |
| GET    | `/api/knowledge-bases/:id`             | 查看知识库详情       | `id`                                                                                 | `knowledgeBase`、`filesCount`、`chunksCount`、`latestChunks` | 已软删除不可访问       |
| PATCH  | `/api/knowledge-bases/:id`             | 更新知识库           | `name`、`productLine`、`description`、`status`                                       | 知识库                                                       | 已软删除不可更新       |
| DELETE | `/api/knowledge-bases/:id`             | 软删除知识库         | `id`                                                                                 | 删除状态                                                     | 同步软删除文件和片段   |
| POST   | `/api/knowledge-bases/:id/text-import` | 粘贴文本导入知识片段 | `title`、`content`、`sourceType`、`productLine`、`materialType`、`tags`、`createdBy` | 知识片段                                                     | `fileId` 为空          |
| GET    | `/api/knowledge-bases/:id/chunks`      | 查询知识片段         | `page`、`pageSize`、`search`、`sourceType`、`productLine`、`materialType`、`tags`    | `items`、`total`、`page`、`pageSize`                         | 默认排除软删除         |
| PATCH  | `/api/knowledge-chunks/:id`            | 编辑知识片段         | `title`、`content`、`sourceType`、`productLine`、`materialType`、`tags`              | 知识片段                                                     | `content` 至少 10 字符 |
| DELETE | `/api/knowledge-chunks/:id`            | 软删除知识片段       | `id`                                                                                 | 删除状态                                                     | 不物理删除             |

### GEO Knowledge Files

| Method | Path                               | 用途           | 主要入参                                                        | 主要返回                                                             | 备注                               |
| ------ | ---------------------------------- | -------------- | --------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- |
| POST   | `/api/knowledge-bases/:id/files`   | 上传并解析文件 | `multipart/form-data`，字段 `file`，可选 `materialType`、`tags` | `knowledgeFile`、`parseStatus`、`createdChunksCount`、`errorMessage` | 支持 txt/md/csv，10MB 限制         |
| GET    | `/api/knowledge-bases/:id/files`   | 查询文件列表   | `page`、`pageSize`、`parseStatus`、`fileType`、`search`         | `items`、`total`、`page`、`pageSize`                                 | 默认排除软删除                     |
| GET    | `/api/knowledge-files/:id`         | 查看文件详情   | `id`                                                            | `knowledgeFile`、`chunksCount`、`latestChunks`                       | 已软删除不可访问                   |
| POST   | `/api/knowledge-files/:id/reparse` | 重新解析文件   | `id`                                                            | 解析状态和片段数量                                                   | 成功时软删除旧片段并创建新片段     |
| DELETE | `/api/knowledge-files/:id`         | 软删除文件     | `id`                                                            | 删除状态                                                             | 同步软删除关联片段，文件不物理删除 |

### GEO Instructions

| Method | Path                                       | 用途           | 主要入参                                                                                                                                     | 主要返回                             | 备注                             |
| ------ | ------------------------------------------ | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | -------------------------------- |
| GET    | `/api/instruction-templates`               | 查询指令模板   | `page`、`pageSize`、`search`、`instructionType`、`contentType`、`targetPromptType`、`targetModel`、`createdBy`                               | `items`、`total`、`page`、`pageSize` | 默认排除软删除                   |
| POST   | `/api/instruction-templates`               | 创建指令模板   | `name`、`instructionType`、`contentType`、`targetPromptType`、`targetModel`、`instruction`、`outputFormat`、`qualityRules`、`forbiddenRules` | 指令模板                             | 同 `instructionType + name` 去重 |
| GET    | `/api/instruction-templates/:id`           | 查看指令详情   | `id`                                                                                                                                         | 指令模板                             | 已软删除不可访问                 |
| PATCH  | `/api/instruction-templates/:id`           | 编辑指令模板   | 创建字段的子集                                                                                                                               | 指令模板                             | 已软删除不可编辑                 |
| POST   | `/api/instruction-templates/:id/duplicate` | 复制指令模板   | `name`、`createdBy`                                                                                                                          | 新指令模板                           | 名称冲突自动追加序号             |
| DELETE | `/api/instruction-templates/:id`           | 软删除指令模板 | `id`                                                                                                                                         | 删除状态                             | 幂等返回                         |

### GEO Content

| Method | Path                            | 用途                         | 主要入参                                                                                                                        | 主要返回                                                                         | 备注                      |
| ------ | ------------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------- |
| GET    | `/api/content-tasks`            | 查询内容任务                 | `page`、`pageSize`、`search`、`productLine`、`status`、`generationType`、`targetModel`、`createdBy`                             | `items`、`total`、`page`、`pageSize`                                             | 按创建时间倒序            |
| POST   | `/api/content-tasks`            | 创建内容任务并同步 Mock 生成 | `name`、`productLine`、`knowledgeBaseId`、`instructionTemplateId`、`generationType`、`targetModel`、`geoPromptIds`、`createdBy` | `task`、`items`、关联信息                                                        | 不接真实 AI               |
| GET    | `/api/content-tasks/:id`        | 查看内容任务详情             | `id`                                                                                                                            | `task`、`items`、`knowledgeBase`、`instructionTemplate`、`prompts`、`aiCallLogs` | 返回最近 Mock 调用日志    |
| POST   | `/api/content-tasks/:id/retry`  | 重试失败内容项               | `id`                                                                                                                            | 内容任务详情                                                                     | 已成功项不重复生成        |
| GET    | `/api/content-items`            | 查询内容项                   | `page`、`pageSize`、`search`、`taskId`、`geoPromptId`、`status`                                                                 | `items`、`total`、`page`、`pageSize`                                             | 默认排除软删除            |
| PATCH  | `/api/content-items/:id`        | 编辑内容项                   | `title`、`body`、`geoOptimizationPoints`、`suggestedPublishChannel`、`status`                                                   | 内容项                                                                           | `body` 至少 20 字符       |
| DELETE | `/api/content-items/:id`        | 软删除内容项                 | `id`                                                                                                                            | 删除状态                                                                         | 不物理删除                |
| GET    | `/api/content-items/:id/export` | 导出 Markdown                | `id`                                                                                                                            | Markdown 文本                                                                    | `data` 为 Markdown 字符串 |

### Model Inclusion Records

| Method | Path                                             | 用途             | 主要入参                                                                                                                                                                                               | 主要返回                             | 备注                                    |
| ------ | ------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------ | --------------------------------------- |
| GET    | `/api/model-inclusion-records`                   | 查询模型覆盖记录 | `page`、`pageSize`、`search`、`geoPromptId`、`model`、`brandMentioned`、`brandRecommended`、`citedOfficialSite`、`recordMethod`、`productLine`、`promptType`、`userIntent`、`checkedFrom`、`checkedTo` | `items`、`total`、`page`、`pageSize` | 返回关联提示词信息                      |
| POST   | `/api/model-inclusion-records`                   | 手动新增覆盖记录 | `geoPromptId`、`model`、`checkedAt`、`brandMentioned`、`brandRecommended`、`rankingPosition`、`citedOfficialSite`、`answerSummary`、`competitors`、`recordMethod`                                      | 覆盖记录                             | 更新提示词最新覆盖状态                  |
| POST   | `/api/model-inclusion-records/import`            | 批量导入覆盖记录 | `rows[]`                                                                                                                                                                                               | 成功/失败行汇总                      | 可用 `geoPromptId` 或 `promptText` 匹配 |
| GET    | `/api/model-inclusion-records/export`            | 导出 CSV         | 同列表筛选                                                                                                                                                                                             | CSV 文本                             | `data` 为 CSV 字符串                    |
| GET    | `/api/model-inclusion-records/uncovered-prompts` | 查询未覆盖提示词 | `model`、`productLine`、`promptType`、`userIntent`、`trackEnabled`、`checkedFrom`、`checkedTo`                                                                                                         | `items`、`total`、`page`、`pageSize` | 默认关注追踪提示词                      |
| GET    | `/api/model-inclusion-records/summary`           | 模型覆盖统计     | `model`、`productLine`、`checkedFrom`、`checkedTo`                                                                                                                                                     | 记录数、提及率、推荐率、引用率、分布 | 用于报表和复盘                          |

### GEO Reports

| Method | Path                                    | 用途           | 主要入参                                                                                     | 主要返回                                     | 备注                                 |
| ------ | --------------------------------------- | -------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------- | ------------------------------------ |
| GET    | `/api/reports/geo-overview`             | GEO 总览       | `productLine`、`model`、`from`、`to`                                                         | 提示词、知识库、内容、覆盖记录和比率         | 用于工作台总览                       |
| GET    | `/api/reports/prompt-coverage`          | 提示词覆盖报表 | `productLine`、`promptType`、`userIntent`、`trackEnabled`、`priority`、`model`、`from`、`to` | 覆盖率、分布、高优先级未覆盖提示词           | 回答“哪些词还没覆盖”                 |
| GET    | `/api/reports/model-coverage`           | 模型覆盖报表   | `model`、`productLine`、`promptType`、`from`、`to`                                           | 模型分布、提及率、推荐率、未提及提示词       | 回答“哪个模型表现弱”                 |
| GET    | `/api/reports/content-coverage`         | 内容覆盖报表   | `productLine`、`generationType`、`status`、`from`、`to`                                      | 内容任务/内容项统计、无内容提示词            | 回答“哪些词缺内容”                   |
| GET    | `/api/reports/knowledge-coverage`       | 知识库覆盖报表 | `productLine`、`materialType`、`from`、`to`                                                  | 知识库、文件、片段、解析状态、缺知识库产品线 | 第一版轻量统计                       |
| GET    | `/api/reports/optimization-suggestions` | 待优化建议     | `productLine`、`model`、`priority`、`limit`                                                  | 建议列表                                     | 规则生成，不接 AI                    |
| GET    | `/api/reports/export`                   | 导出报表 CSV   | `reportType` 及对应筛选参数                                                                  | CSV 文本                                     | 支持 overview、coverage、suggestions |

## Mock 与真实入库边界

Mock 能力：

- GEO 分析任务执行。
- AI 拓词。
- GEO 内容生成。

真实入库能力：

- GEO 提示词增删改查、批量导入、CSV 导出。
- 企业知识库、文本导入、txt/md/csv 文件上传解析。
- 指令模板管理。
- 内容任务、内容项、Markdown 导出。
- 模型覆盖记录手动录入、导入、CSV 导出。
- GEO 报表统计和优化建议规则生成。
