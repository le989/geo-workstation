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
- `401`：未登录、登录态无效或登录态过期。
- `404`：资源不存在或已不可访问。
- `500`：未捕获的服务端异常。

除 `/health`、`/api/health` 和 `/api/auth/login` 外，当前所有 `/api/*` 业务接口默认需要登录。前端使用 JWT Bearer 登录态，请在请求头中携带：

```http
Authorization: Bearer <token>
```

## 环境与启动

关键环境变量：

| 变量                                      | 用途                        | 默认/示例                                                                                   |
| ----------------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------- |
| `API_PORT`                                | NestJS API 端口             | `3000`                                                                                      |
| `DATABASE_URL`                            | PostgreSQL 连接             | `postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public` |
| `REDIS_URL`                               | 后续队列预留                | `redis://localhost:6379`                                                                    |
| `LOCAL_STORAGE_ROOT`                      | 本地上传文件根目录          | `./storage`                                                                                 |
| `JWT_SECRET`                              | JWT 签名密钥                | 本地示例可用占位值，生产必须替换为长随机值                                                  |
| `JWT_EXPIRES_IN`                          | JWT 有效期                  | `12h`                                                                                       |
| `DEFAULT_ADMIN_EMAIL`                     | seed 默认管理员邮箱         | `admin@geo-workstation.local`                                                               |
| `DEFAULT_ADMIN_PASSWORD`                  | seed 默认管理员密码         | 本地占位值，生产和共享部署必须修改                                                          |
| `BYPASS_AUTH_FOR_TESTS`                   | 测试环境绕过鉴权开关        | `false`，仅自动化测试脚本可设为 `true`                                                      |
| `AI_PROVIDER`                             | 默认 AI Provider            | `mock`                                                                                      |
| `AI_OPENAI_COMPATIBLE_BASE_URL`           | OpenAI-compatible 服务地址  | `https://api.deepseek.com/v1`                                                               |
| `AI_OPENAI_COMPATIBLE_API_KEY`            | OpenAI-compatible API Key   | `change_me`，真实 Key 只放后端私有 `.env`                                                   |
| `AI_OPENAI_COMPATIBLE_MODEL`              | 默认真实 AI 模型            | `deepseek-chat`                                                                             |
| `AI_REQUEST_TIMEOUT_MS`                   | AI 请求超时                 | `60000`                                                                                     |
| `AI_MAX_TOKENS`                           | 默认最大输出 token          | `3000`                                                                                      |
| `AI_TEMPERATURE`                          | 默认生成温度                | `0.7`                                                                                       |
| `KIMI_API_KEY`                            | Kimi Web Search API Key     | 真实 Key 只放后端私有 `.env`，不要提交或写入文档                                            |
| `KIMI_BASE_URL`                           | Kimi OpenAI-compatible URL  | `https://api.moonshot.cn/v1`                                                                |
| `KIMI_MODEL`                              | Kimi 联网检测模型           | `kimi-k2.6`                                                                                 |
| `KIMI_WEB_SEARCH_ENABLED`                 | Kimi 联网检测开关           | `true`                                                                                      |
| `KIMI_WEB_SEARCH_TOOL_NAME`               | Kimi 联网搜索工具名         | `$web_search`                                                                               |
| `KIMI_TIMEOUT_MS`                         | Kimi 联网检测超时           | `120000`                                                                                    |
| `VOLCENGINE_WEB_SEARCH_API_KEY`           | 火山方舟 Web Search Key     | 真实 Key 只放后端私有 `.env`，不要提交或写入文档                                            |
| `VOLCENGINE_WEB_SEARCH_BASE_URL`          | 火山方舟 API 基础地址       | `https://ark.cn-beijing.volces.com/api/v3`                                                  |
| `VOLCENGINE_WEB_SEARCH_RESPONSES_URL`     | 火山方舟 Responses API 地址 | `https://ark.cn-beijing.volces.com/api/v3/responses`                                        |
| `VOLCENGINE_WEB_SEARCH_MODEL`             | 火山方舟联网检测模型        | `doubao-seed-1-6-250615`                                                                    |
| `VOLCENGINE_WEB_SEARCH_FORCE_SEARCH`      | 火山方舟强制联网开关        | `true`                                                                                      |
| `VOLCENGINE_WEB_SEARCH_MAX_OUTPUT_TOKENS` | 火山方舟联网检测输出上限    | `1200`                                                                                      |
| `VOLCENGINE_WEB_SEARCH_TIMEOUT_MS`        | 火山方舟联网检测超时        | `180000`                                                                                    |
| `ALIYUN_BAILIAN_API_KEY`                  | 阿里云百炼 Web Search Key   | 真实 Key 只放后端私有 `.env`，不要提交或写入文档                                            |
| `ALIYUN_BAILIAN_BASE_URL`                 | 百炼 OpenAI-compatible URL  | `https://dashscope.aliyuncs.com/compatible-mode/v1`                                         |
| `ALIYUN_BAILIAN_MODEL`                    | 百炼联网检测模型            | `qwen3-max`                                                                                 |
| `ALIYUN_BAILIAN_WEB_SEARCH_ENABLED`       | 百炼联网检测开关            | `true`                                                                                      |
| `ALIYUN_BAILIAN_FORCE_SEARCH`             | 百炼强制联网开关            | `true`                                                                                      |
| `ALIYUN_BAILIAN_TIMEOUT_MS`               | 百炼联网检测超时            | `120000`                                                                                    |

AI Provider 错误说明：

- 缺少 `AI_OPENAI_COMPATIBLE_API_KEY`：返回“AI Provider API Key 未配置”，Mock 模式不受影响。
- 401/403：返回“AI Provider 鉴权失败，请检查后端环境变量”。
- 400/404：返回“模型不可用或名称错误”。
- 超时：返回“AI Provider 请求超时”。
- 错误消息和日志不会包含完整 API Key。

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

### Auth

| Method | Path               | 用途         | 主要入参            | 主要返回                                | 备注                                      |
| ------ | ------------------ | ------------ | ------------------- | --------------------------------------- | ----------------------------------------- |
| POST   | `/api/auth/login`  | 登录         | `email`、`password` | `token`、`user`                         | 校验 `active` 用户，不返回 `passwordHash` |
| GET    | `/api/auth/me`     | 获取当前用户 | Bearer token        | `id`、`name`、`email`、`role`、`status` | 需要登录                                  |
| POST   | `/api/auth/logout` | 退出登录     | Bearer token        | `loggedOut: true`                       | JWT Bearer 方案下由前端清理 token         |

登录失败统一返回账号或密码错误，避免暴露邮箱是否存在或用户状态等细节。

### Project Profile

项目档案用于描述当前 GEO 工作站代表的项目是谁、服务谁、应该怎么表达。它是单项目上下文，不是多租户或客户管理模块。

| Method | Path                   | 用途             | 主要入参                                                                                                                                                                  | 主要返回          | 备注                     |
| ------ | ---------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------ |
| GET    | `/api/project-profile` | 获取当前项目档案 | 无                                                                                                                                                                        | 项目档案或 `null` | 无档案时返回空状态       |
| POST   | `/api/project-profile` | 创建项目档案     | `projectName`、`companyName`、`brandName`、`websiteUrl`、`industry`、`mainProducts`、`targetCustomers`、`positioning`、`tone`、`forbiddenClaims`、`targetModels`、`notes` | 项目档案          | 第一版只允许创建一份档案 |
| PATCH  | `/api/project-profile` | 更新项目档案     | 创建字段的子集                                                                                                                                                            | 项目档案          | 不提供删除接口           |

字段说明：

- `industry` 是用户自由填写字段，不是固定行业枚举。
- `mainProducts` 兼容产品、服务、课程、门店、个人品牌方向、解决方案等表达。
- 项目档案会作为真实 AI 内容生成和 AI 拓词的品牌/语气/受众上下文。
- 项目档案不替代知识库事实；具体参数、承诺、案例、价格、资质等仍必须来自知识库、目标提示词或用户输入。

### GEO Analysis

| Method | Path                                              | 用途                     | 主要入参                                                                                                         | 主要返回                                                        | 备注                                                           |
| ------ | ------------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------- |
| GET    | `/api/geo-analysis-tasks`                         | 分页查询 GEO 分析任务    | `page`、`pageSize`、`search`、`status`、`productLine`、`createdBy`、`targetModel`、`createdFrom`、`createdTo`    | `items`、`total`、`page`、`pageSize`                            | `targetModel` 在 `targetModels` JSON 中匹配                    |
| POST   | `/api/geo-analysis-tasks`                         | 创建分析任务             | `name`、`brandName`、`websiteUrl`、`productLine`、`baseWords`、`targetModels`、`createdBy`                       | 分析任务                                                        | 初始 `pending`，不自动运行                                     |
| GET    | `/api/geo-analysis-tasks/:id`                     | 查看分析详情             | `id`                                                                                                             | `task`、`modelResults`、`relatedPrompts`、`relatedContentTasks` | 当前无分析任务到内容任务关系，`relatedContentTasks` 第一版为空 |
| PATCH  | `/api/geo-analysis-tasks/:id`                     | 编辑任务基础信息         | `name`、`brandName`、`websiteUrl`、`productLine`、`targetModels`                                                 | 分析任务                                                        | `running` 状态不可编辑                                         |
| POST   | `/api/geo-analysis-tasks/:id/run`                 | 执行 Mock GEO 分析       | `id`                                                                                                             | 分析详情和模型结果                                              | development / smoke 可用；`APP_ENV=production` 禁用 Mock 分析 |
| POST   | `/api/geo-analysis-tasks/:id/convert-prompts`     | 将分析建议转入提示词库   | `selectedPromptTexts`、`promptType`、`productLine`、`userIntent`、`priority`、`trackEnabled`、`createdBy`        | `createdItems`、`skippedItems`                                  | 按未软删除 `promptText` 去重                                   |
| POST   | `/api/geo-analysis-tasks/:id/create-content-task` | 基于分析建议创建内容任务 | `name`、`knowledgeBaseId`、`instructionTemplateId`、`generationType`、`targetModel`、`geoPromptIds`、`createdBy` | 内容任务详情                                                    | development / smoke 复用 Mock 内容生成；production 禁用 mock |

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

| Method | Path                                      | 用途               | 主要入参                                                                                                    | 主要返回              | 备注                                                                                                                        |
| ------ | ----------------------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------- | --------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/api/expansion/rule-generate`            | 规则组合拓词       | `baseWord`、`prefixes`、`serviceSuffixes`、`applicationSuffixes`、`promptType`、`productLine`、`userIntent` | `jobId`、`candidates` | 生成候选，不直接入库                                                                                                        |
| POST   | `/api/expansion/ai-generate`              | AI 拓词            | `baseWord`、`promptType`、`count`、`constraints`、`targetModels`、`provider`、`model`                       | `jobId`、`candidates` | development / smoke 可用 `provider=mock`；production 禁用 mock，`openai_compatible` 会调用后端配置的真实 AI，结果仍只进入候选词 |
| GET    | `/api/expansion/jobs/:id`                 | 查看拓词任务       | `id`                                                                                                        | `job`、`candidates`   | 返回重复标记和保存状态                                                                                                      |
| POST   | `/api/expansion/jobs/:id/save-candidates` | 保存候选到提示词库 | `candidateIds`、`createdBy`、`defaultProductLine`、`defaultPriority`、`defaultTrackEnabled`                 | 保存/跳过/失败汇总    | 保存前继续去重                                                                                                              |

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

| Method | Path                                          | 用途                       | 主要入参                                                                                                                                             | 主要返回                                                                         | 备注                                                                                                     |
| ------ | --------------------------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| GET    | `/api/content-tasks`                          | 查询内容任务               | `page`、`pageSize`、`search`、`productLine`、`status`、`generationType`、`targetModel`、`createdBy`                                                  | `items`、`total`、`page`、`pageSize`                                             | 按创建时间倒序                                                                                           |
| POST   | `/api/content-tasks`                          | 创建内容任务并同步生成内容 | `name`、`productLine`、`knowledgeBaseId`、`instructionTemplateId`、`generationType`、`targetModel`、`provider`、`model`、`geoPromptIds`、`createdBy` | `task`、`items`、关联信息                                                        | development / smoke 可用 `provider=mock`；production 禁用 mock，`openai_compatible` 使用后端真实 AI Provider |
| GET    | `/api/content-tasks/:id`                      | 查看内容任务详情           | `id`                                                                                                                                                 | `task`、`items`、`knowledgeBase`、`instructionTemplate`、`prompts`、`aiCallLogs` | 返回最近 AI 调用日志                                                                                     |
| POST   | `/api/content-tasks/:id/retry`                | 重试失败内容项             | `id`                                                                                                                                                 | 内容任务详情                                                                     | 已成功项不重复生成                                                                                       |
| GET    | `/api/content-items`                          | 查询内容项                 | `page`、`pageSize`、`search`、`taskId`、`geoPromptId`、`status`                                                                                      | `items`、`total`、`page`、`pageSize`                                             | 默认排除软删除                                                                                           |
| PATCH  | `/api/content-items/:id`                      | 编辑内容项                 | `title`、`body`、`geoOptimizationPoints`、`suggestedPublishChannel`、`status`                                                                        | 内容项                                                                           | `body` 至少 20 字符                                                                                      |
| DELETE | `/api/content-items/:id`                      | 软删除内容项               | `id`                                                                                                                                                 | 删除状态                                                                         | 不物理删除                                                                                               |
| POST   | `/api/content-items/:id/quality-check`        | 内容质量检查               | `provider`、`model`、`checkMode`                                                                                                                     | `score`、`level`、`riskItems`、`positiveItems`、`publishReadiness`               | 不修改原内容项；development / smoke 可用 `provider=mock`，production 禁用 mock                           |
| POST   | `/api/content-items/:id/optimize-for-publish` | 生成发布优化版             | `provider`、`model`、`targetChannel`、`optimizationGoal`                                                                                             | `title`、`body`、`changes`、`warnings`                                           | 返回优化稿，不自动覆盖原文、不做版本管理、不自动发布                                                     |
| POST   | `/api/content-items/:id/format-for-publish`   | 生成富文本发布稿           | `sourceType`、`optimizedTitle`、`optimizedBody`、`formatStyle`、`includeGeoNotes`、`includeWarnings`                                                 | `title`、`html`、`markdown`、`plainText`、`style`、`copyTips`                    | 返回排版稿，不保存数据库、不覆盖原文、不接平台账号、不自动发布                                           |
| GET    | `/api/content-items/:id/export`               | 导出 Markdown              | `id`                                                                                                                                                 | Markdown 文本                                                                    | `data` 为 Markdown 字符串                                                                                |

### Model Inclusion Records

| Method | Path                                             | 用途                  | 主要入参                                                                                                                                                                                                                                                                                                                                                                                              | 主要返回                                                                                                         | 备注                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------ | ------------------------------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/model-inclusion-records`                   | 查询 GEO 命中记录     | `page`、`pageSize`、`search`、`geoPromptId`、`model`、`platform`、`entryPoint`、`detectionMethod`、`deviceType`、`isWebSearchEnabled`、`isLoggedIn`、`brandMentioned`、`brandRecommended`、`citedOfficialSite`、`citedContentAsset`、`competitorMentioned`、`hitLevel`、`recordMethod`、`productLine`、`promptType`、`userIntent`、`checkedFrom`、`checkedTo`                                         | `items`、`total`、`page`、`pageSize`，items 包含新增多入口字段                                                   | 返回关联提示词信息                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| POST   | `/api/model-inclusion-records`                   | 手动新增 GEO 命中记录 | `geoPromptId`、`model`、`platform`、`entryPoint`、`detectionMethod`、`deviceType`、`isWebSearchEnabled`、`isLoggedIn`、`checkedAt`、`brandMentioned`、`brandRecommended`、`rankingPosition`、`citedOfficialSite`、`citedContentAsset`、`competitorMentioned`、`hitLevel`、`answerSummary`、`rawAnswer`、`citations`、`searchResults`、`screenshotPath`、`errorMessage`、`competitors`、`recordMethod` | 覆盖记录                                                                                                         | 未传 `hitLevel` 时自动推导；更新提示词最新覆盖状态                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| POST   | `/api/model-inclusion-records/web-search-check`  | 联网 GEO 检测         | `geoPromptIds[]`、`provider = kimi_web_search \| volcengine_web_search \| aliyun_bailian_web_search`、`model?`、`brandName?`、`companyName?`、`websiteUrl?`、`entryPoint = web_search_api`、`isLoggedIn = false`、`limit <= 20`                                                                                                                                                                       | `successCount`、`failedCount`、`createdItems`、`failedItems`；联网检测返回项可包含 `retryCount`、`errorCategory` | Kimi 使用 `$web_search` tool-call loop；火山方舟使用 Responses API + `tools: [{ type: "web_search" }]`，默认要求 300 字以内短回答；阿里云百炼使用 OpenAI-compatible Chat Completions，并启用 `enable_search=true` 与 `search_options.forced_search=true`。百炼结果写入 `platform = 通义千问 / 阿里云百炼`，不等同于通义千问 App 或网页端真实用户结果，当前可能不返回结构化 references/citations/searchResults/URL，第一版主要从回答正文判断官网引用，不伪造来源。网络类失败最多重试 1 次，单条失败不影响其他提示词。火山仅返回 `web_search_call` 但无最终回答时会返回 `provider_incomplete_output` 并保存搜索证据；响应无法解析时返回 `provider_response_parse_error` |
| POST   | `/api/model-inclusion-records/import`            | 批量导入 GEO 命中记录 | `rows[]`，支持新增字段；布尔字段支持 `true/false`、`1/0`、`是/否`、`yes/no`；`citations` / `searchResults` 支持 JSON 字符串或数组                                                                                                                                                                                                                                                                     | 成功/失败行汇总                                                                                                  | 可用 `geoPromptId` 或 `promptText` 匹配，单行失败不影响其他行                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| GET    | `/api/model-inclusion-records/export`            | 导出 CSV              | 同列表筛选                                                                                                                                                                                                                                                                                                                                                                                            | CSV 文本，包含 `platform`、`entryPoint`、`hitLevel`、`rawAnswer`、`citations`、`searchResults` 等新增字段        | `data` 为 CSV 字符串                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| GET    | `/api/model-inclusion-records/uncovered-prompts` | 查询未覆盖提示词      | `model`、`productLine`、`promptType`、`userIntent`、`trackEnabled`、`checkedFrom`、`checkedTo`                                                                                                                                                                                                                                                                                                        | `items`、`total`、`page`、`pageSize`                                                                             | 默认关注追踪提示词，保持旧口径兼容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| GET    | `/api/model-inclusion-records/summary`           | GEO 命中统计          | `model`、`productLine`、`checkedFrom`、`checkedTo`                                                                                                                                                                                                                                                                                                                                                    | 记录数、提及率、推荐率、官网/内容引用率、竞品出现率、`hitLevelDistribution`、平台/入口/产品线/模型分布等统计     | 用于报表和复盘                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

### GEO Reports

| Method | Path                                    | 用途           | 主要入参                                                                                             | 主要返回                                                                                            | 备注                                                                                                          |
| ------ | --------------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/reports/geo-overview`             | GEO 总览       | `productLine`、`model`、`from`、`to`                                                                 | 提示词、知识库、内容、覆盖记录和比率                                                                | 用于工作台总览                                                                                                |
| GET    | `/api/reports/prompt-coverage`          | 提示词覆盖报表 | `productLine`、`promptType`、`userIntent`、`trackEnabled`、`priority`、`model`、`from`、`to`         | 覆盖率、分布、高优先级未覆盖提示词                                                                  | 回答“哪些词还没覆盖”                                                                                          |
| GET    | `/api/reports/model-coverage`           | 模型覆盖报表   | `model`、`platform`、`entryPoint`、`productLine`、`promptType`、`from`、`to`                         | 模型/平台/入口/命中等级分布、提及率、推荐率、引用与竞品统计、推荐和未提及提示词                     | 回答“哪个模型或入口表现弱”                                                                                    |
| GET    | `/api/reports/geo-hit-summary`          | GEO 命中汇总   | `productLine`、`platform`、`entryPoint`、`from`、`to`、`latestOnly=true`、`priority`、`trackEnabled` | `overview`、`platformComparison`、`entryPointComparison`、`promptMatrix`、`optimizationSuggestions` | 默认按 `geoPromptId + platform + entryPoint` 只统计最新一条，避免重复测试记录影响命中率；官网引用率是辅助指标 |
| GET    | `/api/reports/content-coverage`         | 内容覆盖报表   | `productLine`、`generationType`、`status`、`from`、`to`                                              | 内容任务/内容项统计、无内容提示词                                                                   | 回答“哪些词缺内容”                                                                                            |
| GET    | `/api/reports/knowledge-coverage`       | 知识库覆盖报表 | `productLine`、`materialType`、`from`、`to`                                                          | 知识库、文件、片段、解析状态、缺知识库产品线                                                        | 第一版轻量统计                                                                                                |
| GET    | `/api/reports/optimization-suggestions` | 待优化建议     | `productLine`、`model`、`priority`、`limit`                                                          | 建议列表                                                                                            | 规则生成，不接 AI                                                                                             |
| GET    | `/api/reports/export`                   | 导出报表 CSV   | `reportType` 及对应筛选参数                                                                          | CSV 文本                                                                                            | 支持 overview、coverage、suggestions                                                                          |

`/api/reports/geo-hit-summary` 的 `latestOnly` 默认值为 `true`。开启时，后端会先按 `geoPromptId + platform + entryPoint` 选出最新检测记录，再计算品牌提及率、品牌推荐率、未命中率、竞品占位率和官网引用率，并生成平台对比、入口对比、提示词矩阵和待优化建议。`latestOnly=false` 可用于审计历史检测样本，但不建议作为日常 GEO 效果口径。

## Mock 与真实入库边界

Mock 能力：

- GEO 分析任务执行。
- AI 拓词默认 Mock，可选 `openai_compatible`。
- GEO 内容生成默认 Mock，可选 `openai_compatible`。

真实入库能力：

- 登录和当前用户查询。
- GEO 提示词增删改查、批量导入、CSV 导出。
- 企业知识库、文本导入、txt/md/csv 文件上传解析。
- 指令模板管理。
- 内容任务、内容项、Markdown 导出。
- 模型覆盖记录手动录入、导入、CSV 导出。
- GEO 报表统计和优化建议规则生成。
