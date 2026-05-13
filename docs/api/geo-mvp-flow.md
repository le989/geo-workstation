# GEO MVP Flow

这条流程用于运营、前端和后端一起验证 MVP 是否真的围绕 GEO 闭环工作，而不是只验证单个 CRUD。当前默认使用 Mock 跑通 GEO 分析、AI 拓词和内容生成；AI 拓词和内容生成也可在自用场景切换为 `openai_compatible`。登录、提示词、知识库、指令、内容任务、覆盖记录和报表都是真实写入数据库的能力。

## 0. 登录内部系统

接口：`POST /api/auth/login`

运营先使用 seed 创建的默认管理员或内部账号登录。后续 API 请求携带 `Authorization: Bearer <token>`。

意义：内部 MVP 已具备基础访问控制，不再是完全开放后台。

第一版状态：真实鉴权；不做开放注册、忘记密码、OAuth、多租户或复杂菜单级权限。

## 1. 创建 GEO 分析任务

运营先输入品牌、官网、产品线、核心训练词和目标模型，告诉系统要诊断哪个 GEO 场景。

接口：`POST /api/geo-analysis-tasks`

意义：这是闭环的起点，用来回答“品牌在 AI 问答里表现如何，需要补什么”。

第一版状态：真实入库，初始状态为 `pending`；`baseWords` 因当前 schema 没有独立字段，暂存在 `summary.inputBaseWords`。

## 1.1 配置项目档案

接口：`GET /api/project-profile`、`POST /api/project-profile`、`PATCH /api/project-profile`

运营配置当前 GEO 工作站代表的项目是谁、服务谁、如何表达。项目档案适用于企业品牌、产品、服务、课程、门店、本地生活、个人品牌或其他项目，不固定行业。

意义：项目档案为真实 AI 拓词和内容生成提供品牌语气、目标客户、定位和禁止表达等上下文，但不替代知识库事实。

第一版状态：单项目档案真实入库；不做多租户、不做客户管理、不做删除。

## 2. 运行 Mock GEO 分析

接口：`POST /api/geo-analysis-tasks/:id/run`

系统生成 Mock 分析结果，包括：

- `summary`：整体诊断摘要。
- `contentGaps`：缺少哪些内容资产。
- `knowledgeGaps`：缺少哪些企业事实资料。
- `promptSuggestions`：建议补充哪些 GEO 提示词。
- `geo_model_results`：每个模型下是否提及品牌、是否推荐、是否引用官网、竞品提及等。

意义：把“感觉需要做 GEO”变成结构化缺口和下一步动作。

第一版状态：Mock，不调用真实 AI，不访问真实官网，不做爬取或 SEO 扫描。

## 3. 把 promptSuggestions 转入提示词库

接口：`POST /api/geo-analysis-tasks/:id/convert-prompts`

运营可以选择全部或部分建议，把它们沉淀为 `geo_prompts`。

意义：分析结果不能停在报告里，必须变成后续能追踪、能生成内容、能记录效果的 GEO 提示词资产。

第一版状态：真实入库；保存前按未软删除 `promptText` 去重；使用 `source = geo_analysis:{taskId}` 做来源追溯。

## 4. 创建企业 GEO 知识库

接口：`POST /api/knowledge-bases`

运营为产品线、服务线或项目方向创建知识库，例如“核心项目知识库”。

意义：知识库是 AI 可引用事实底座，不是普通文件柜。后续内容生成会从这里取产品能力、案例、FAQ、参数和资质。

第一版状态：真实入库。

## 5. 导入知识资料

可选路径一：粘贴文本。

接口：`POST /api/knowledge-bases/:id/text-import`

可选路径二：上传文件。

接口：`POST /api/knowledge-bases/:id/files`

第一版支持 txt、md、csv 基础解析；PDF、Word、Excel、URL 抓取和 RAG 不在 Phase 2 范围。

意义：把企业资料整理成 `knowledge_chunks`，让内容生成有事实依据。

第一版状态：文本导入和 txt/md/csv 解析都是真实入库。

## 6. 创建 GEO 指令模板

接口：`POST /api/instruction-templates`

指令模板定义内容生产方法，例如需求决策指南、AI 问答素材、FAQ、对比与替代、场景方案。

意义：指令不是普通 prompt 收藏夹，而是让内容更容易被生成式 AI 识别、摘取和引用的方法库。

第一版状态：真实入库。

## 7. 创建 GEO 内容生成任务

接口：`POST /api/content-tasks`

输入提示词、知识库和指令模板后，系统同步生成 `content_items`。

意义：把 GEO 策略和企业资料转成可编辑、可发布的内容资产，用于补齐某个提示词下的品牌可见度。

第一版状态：内容任务和内容项真实入库；默认由 Mock 内容生成器生成。自用真实流程可传 `provider = openai_compatible`，由后端环境变量配置真实 AI，不在前端暴露 API Key。

## 8. 新增模型覆盖记录

接口：`POST /api/model-inclusion-records`

运营手动记录某个提示词在某个模型里的表现：

- 是否提及品牌。
- 是否推荐品牌。
- 推荐位置。
- 是否引用官网。
- 回答摘要。
- 竞品提及。

意义：这是 GEO 效果记录，不是普通日志。它为后续报表和优化建议提供依据。

第一版状态：真实入库；新增后会更新提示词的 `latestCoverageStatus`。

## 9. 查看 GEO 报表

接口：

- `GET /api/reports/geo-overview`
- `GET /api/reports/prompt-coverage`
- `GET /api/reports/model-coverage`
- `GET /api/reports/content-coverage`
- `GET /api/reports/knowledge-coverage`

意义：复盘当前提示词资产、知识库资产、内容产出和模型覆盖结果，回答“哪些产品线还缺内容/知识库/检测记录”。

第一版状态：真实统计，基于数据库现有业务表聚合。

## 10. 查看待优化建议

接口：`GET /api/reports/optimization-suggestions`

第一版使用规则生成建议，例如：

- 高优先级提示词暂无模型覆盖记录。
- 已检测但品牌未被提及。
- 高优先级提示词暂无内容资产。
- 产品线有提示词但知识库资料不足。
- 存在失败内容任务。

意义：让运营知道下一步应该补检测记录、补知识库、补内容，还是重试失败任务。

第一版状态：规则生成，不接 AI。

## 推荐联调顺序

1. 运行 `docker compose up -d postgres`。
2. 运行 `pnpm prisma:migrate && pnpm prisma:seed`。
3. 运行 `pnpm dev:api`。
4. 另一个终端运行 `pnpm smoke:api`。

`pnpm smoke:api` 会先登录默认管理员。如果使用自定义管理员账号，可以设置 `SMOKE_AUTH_EMAIL` 和 `SMOKE_AUTH_PASSWORD`。

成功时会看到：

```text
GEO MVP smoke test passed
```

如果 smoke 失败，先看失败步骤、HTTP 状态和响应摘要，再检查数据库是否已启动、迁移是否完成、API 服务是否运行。
