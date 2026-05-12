# GEO 营销运营系统 Spec

日期：2026-05-12

## 1. 产品定位

本项目是一套 **GEO 营销运营系统**，用于提升企业品牌、产品、服务和内容在生成式 AI 搜索/问答场景中的曝光、推荐、引用和转化机会。

这里的 GEO 指 Generative Engine Optimization。系统要解决的问题不是普通内容管理，也不是单纯内部知识库，而是围绕 AI 搜索时代的营销闭环：

1. 用户向 AI 提问时，会不会问到我们的产品或服务。
2. AI 回答时，会不会提到我们的品牌。
3. AI 是否把我们作为推荐对象、对比对象或解决方案来源。
4. AI 引用的信息是否准确、完整、可信。
5. 我们应该补哪些知识库、内容、提示词和发布素材，才能提高 AI 推荐概率。

公司自用只是部署方式。产品主线必须始终围绕 GEO。

## 2. 参考产品拆解

参考网站 `geo.marketingforce.com` 的主要能力包括：

- 工作台：快捷入口、数据概览、最新发布内容。
- GEO 分析：品牌分析、网站分析、网站分析报告。
- 知识库管理：企业知识库、资源库、提示词库、指令库。
- 内容创作：创作文章、文章管理。
- 内容发布：账号管理、发布管理。
- 统计报表：上词统计、月报管理。
- 内贸/海外 GEO 双模式。

本项目第一版不复制完整平台，而是提炼 GEO 核心闭环。

## 3. 核心闭环

MVP 要形成这条业务链：

`GEO 诊断 -> 提示词策略 -> 企业知识库 -> GEO 内容生成 -> 效果记录 -> 优化建议`

每个模块都必须能回答一个 GEO 问题：

- 诊断：我们现在在 AI 里表现如何？
- 提示词：用户会怎么问 AI？
- 知识库：AI 应该从哪里获得准确资料？
- 内容：我们要生产什么内容来影响 AI 回答？
- 记录：哪些词、内容、模型已经有结果？
- 优化：下一步应该补哪些词、资料和内容？

## 4. 产品目标

第一版目标：

1. 建立企业自己的 GEO 提示词资产。
2. 建立可服务 AI 生成和 AI 引用的企业知识库。
3. 生成面向 AI 搜索优化的文章、问答、选型指南、对比内容、解决方案。
4. 记录品牌在不同 AI 模型、不同提示词下的覆盖情况。
5. 输出 GEO 优化建议，指导下一轮内容建设。

衡量成功：

- 能导入至少 1000 条 GEO 提示词，并完成去重和分类。
- 能为一个核心产品线生成蒸馏词、品牌词、场景词。
- 能把企业资料整理成结构化知识库。
- 能基于知识库生成可编辑、可发布的 GEO 内容。
- 能记录某个提示词在某个 AI 模型中的品牌提及/未提及状态。
- 能导出 GEO 提示词、内容任务和模型覆盖记录。

## 5. 用户角色

### GEO 运营

- 维护训练词、蒸馏词、品牌词、场景词。
- 创建 GEO 分析任务。
- 查看模型覆盖和上词记录。
- 提出内容优化方向。

### 内容策略/编辑

- 维护知识库资料。
- 使用提示词和指令生成内容。
- 编辑文章、问答、解决方案。
- 根据 GEO 建议补充内容。

### 市场负责人

- 查看 GEO 工作台和报表。
- 关注品牌覆盖、内容产出、提示词建设进度。
- 决定重点产品线和优化优先级。

### 管理员

- 管理用户、权限、AI Provider、模型配置。
- 查看所有任务和日志。

## 6. MVP 功能范围

### 6.1 GEO 工作台

工作台不是普通内部统计，而是 GEO 作战看板。

功能：

- GEO 资产概览：
  - 训练词数量。
  - 蒸馏词数量。
  - 品牌词数量。
  - 场景词数量。
  - 知识库数量。
  - 已生成 GEO 内容数量。
- GEO 任务概览：
  - 进行中的诊断任务。
  - 最近 AI 拓词任务。
  - 最近内容生成任务。
  - 失败任务。
- GEO 效果概览：
  - 已记录的模型覆盖次数。
  - 品牌被提及次数。
  - 品牌未被提及次数。
  - 待补内容提示词数量。
- 快捷入口：
  - 新建 GEO 分析。
  - 导入提示词。
  - 上传知识库资料。
  - AI 拓词。
  - 生成 GEO 内容。
  - 查看 GEO 报表。

### 6.2 GEO 分析

用于诊断品牌/网站/产品在 AI 搜索中的表现。

输入：

- 品牌名称。
- 官网 URL。
- 产品线。
- 核心训练词。
- 目标 AI 模型。
- 目标地区/语言，第一版默认中国市场和中文。

输出：

- 品牌基础识别结果。
- AI 回答中是否提到品牌。
- 是否推荐品牌。
- 推荐位置。
- 是否引用官网或企业资料。
- 竞品提及情况。
- 用户常见问题簇。
- 内容缺口。
- 知识库缺口。
- 建议补充的提示词。
- 建议生成的内容类型。

第一版实现方式：

- 可以先用 AI API 做半自动分析。
- 模型覆盖结果允许人工补录。
- 不要求一开始就全自动模拟所有外部 AI 平台。

任务状态：

- pending
- running
- succeeded
- failed

### 6.3 提示词策略库

提示词库是 GEO 的核心资产，不只是关键词表。

词类型：

- 训练词：核心产品/服务词，例如 `工业传感器`。
- 蒸馏词：用户会向 AI 提出的具体需求，例如 `工业传感器国产替代方案`。
- 品牌词：围绕品牌可信度、官网、电话、地址、厂家实力的问题。
- 场景词：行业、应用、痛点、解决方案场景。

字段：

- 词类型。
- 训练词。
- 派生词。
- 产品线。
- 应用场景。
- 用户意图。
- 目标模型。
- 优先级。
- 来源。
- 是否需要追踪。
- 最新模型覆盖状态。
- 创建人。
- 创建时间。

用户意图建议值：

- 选型。
- 采购。
- 厂家推荐。
- 国产替代。
- 对比。
- 故障排查。
- 应用方案。
- 品牌验证。

功能：

- 查询和筛选。
- 单条添加。
- 批量粘贴导入。
- Excel/CSV 导入。
- 自动去重。
- 批量设置产品线、标签、优先级。
- 删除。
- 导出。

后端 API 第一版要求：

- `GET /api/geo-prompts`：分页查询 GEO 提示词，默认排除软删除数据，支持按提示词文本、训练词、场景、来源搜索，并按词类型、产品线、用户意图、优先级、追踪开关、覆盖状态、创建人筛选。
- `POST /api/geo-prompts`：新增单条 GEO 提示词。新增前必须检查未软删除数据中的 `promptText` 重复项，重复时拒绝创建。
- `PATCH /api/geo-prompts/:id`：更新单条 GEO 提示词。已软删除数据不可更新；更新 `promptText` 时继续检查未软删除数据中的重复项。
- `DELETE /api/geo-prompts/:id`：软删除 GEO 提示词，只设置 `deletedAt`，不物理删除。
- `POST /api/geo-prompts/bulk-import`：批量导入提示词，单批最多 1000 行；逐行校验，标记批次内重复和数据库重复，合法且不重复的数据才入库。
- `GET /api/geo-prompts/export`：按列表筛选条件导出 CSV 文本。

### 6.4 AI 拓词

用于扩展 GEO 提示词资产。

#### 手动组合

输入：

- 前缀。
- 训练词。
- 品牌/服务后缀。
- 应用后缀。

组合规则：

- 前缀 + 训练词。
- 训练词 + 应用后缀。
- 前缀 + 训练词 + 应用后缀。
- 训练词 + 品牌/服务后缀。
- 前缀 + 训练词 + 品牌/服务后缀。
- 训练词 + 品牌/服务后缀 + 应用后缀。
- 前缀 + 训练词 + 品牌/服务后缀 + 应用后缀。

输出：

- 候选蒸馏词。
- 重复标记。
- 可勾选保存。

#### AI 拓词

输入：

- 训练词。
- 关联知识库。
- 生成类型：蒸馏词、品牌词、场景词。
- 用户意图。
- 生成数量。
- 限制条件。

输出：

- 候选词列表。
- 推荐意图。
- 推荐优先级。
- 推荐内容类型。

要求：

- AI 生成结果不能直接入库。
- 用户必须勾选保存。
- 保存前去重。
- 记录 Provider、模型、Prompt、生成时间。

后端 API 第一版要求：

- `POST /api/expansion/rule-generate`：根据前缀、训练词、品牌/服务后缀、应用后缀生成七类组合候选词，创建 `expansion_job` 和 `expansion_candidates`，并标记批次内重复和数据库重复。
- `POST /api/expansion/ai-generate`：使用 Mock AI Provider 生成偏 GEO 场景的候选词，创建 `expansion_job`、`expansion_candidates` 和 `ai_call_logs`；第一版不接入真实 DeepSeek，不写真实 API Key。
- `GET /api/expansion/jobs/:id`：查看拓词任务、候选词、重复标记、保存状态和 `savedPromptId`。
- `POST /api/expansion/jobs/:id/save-candidates`：仅保存当前任务下用户勾选的候选词到 `geo_prompts`，保存前检查未软删除提示词重复，已保存或重复候选词跳过，单个失败不影响其他候选词。
- 规则拓词和 Mock AI 拓词都不能直接写入提示词策略库，必须先进入候选词，再由用户选择保存。

### 6.5 企业 GEO 知识库

知识库是影响 AI 回答质量的事实底座。

资料类型：

- 企业介绍。
- 品牌资质。
- 产品系列。
- 技术参数。
- 应用场景。
- 客户案例。
- 解决方案。
- 常见问题。
- 售后服务。
- 国产替代说明。
- 竞品对比。

导入方式：

- 上传 docx、pdf、xlsx、csv、txt、md。
- 粘贴文本。
- 输入 URL 抓取单页。
- 批量 URL 导入，后续阶段做整站导入。

功能：

- 创建知识库。
- 上传资料。
- 查看解析状态。
- 查看知识片段。
- 编辑知识片段。
- 删除资料。
- 重新解析失败资料。
- 按产品线、场景、资料类型打标签。

知识片段应尽量结构化，方便内容生成和后续 RAG：

- 标题。
- 正文。
- 来源。
- 产品线。
- 资料类型。
- 标签。
- 更新时间。

后端 API 第一版要求：

- `GET /api/knowledge-bases`：分页查询企业 GEO 知识库，默认排除软删除数据，支持搜索名称、产品线、描述，并按产品线、状态、创建人筛选。
- `POST /api/knowledge-bases`：创建知识库，同一产品线下的未删除同名知识库应拒绝重复创建。
- `GET /api/knowledge-bases/:id`：查看知识库详情，返回文件数量、知识片段数量和最近 5 条知识片段。
- `PATCH /api/knowledge-bases/:id`：更新知识库基础信息，已软删除知识库不可更新。
- `DELETE /api/knowledge-bases/:id`：软删除知识库，并软删除关联文件和知识片段。
- `POST /api/knowledge-bases/:id/text-import`：通过粘贴文本创建一条知识片段，`fileId` 为空，默认继承知识库产品线，不处理真实文件解析。
- `GET /api/knowledge-bases/:id/chunks`：分页查询知识片段，默认排除软删除数据，支持搜索标题/正文，并按来源、产品线、资料类型、标签筛选。
- `PATCH /api/knowledge-chunks/:id`：编辑知识片段标题、正文、来源、产品线、资料类型和标签。
- `DELETE /api/knowledge-chunks/:id`：软删除知识片段。
- 第一版 `sourceType` 和 `materialType` 先按字符串处理，后续可以按 GEO 资料类型枚举化。

文件上传与基础解析 API 第一版要求：

- `POST /api/knowledge-bases/:id/files`：使用 `multipart/form-data` 的 `file` 字段上传 `.txt`、`.md`、`.csv` 文件，保存到本地 `LOCAL_STORAGE_ROOT/uploads/knowledge-bases/{knowledgeBaseId}/`，创建 `knowledge_file` 后同步解析为 `knowledge_chunks`。
- `GET /api/knowledge-bases/:id/files`：分页查询知识库文件，默认排除软删除数据，支持 `parseStatus`、`fileType` 和文件名搜索。
- `GET /api/knowledge-files/:id`：查看文件详情，返回文件记录、片段数量和最近知识片段。
- `POST /api/knowledge-files/:id/reparse`：重新解析未删除文件；解析成功时软删除旧片段并创建新片段，解析失败时保留文件记录并写入 `failed` 状态和错误信息。
- `DELETE /api/knowledge-files/:id`：软删除文件，并同步软删除关联知识片段；第一版不物理删除本地文件。
- 第一版只支持 txt、md、csv 基础解析，不支持 PDF、Word/docx、Excel/xlsx、URL 抓取、RAG 或向量数据库。

### 6.6 指令库

指令库用于沉淀 GEO 内容生产方法。

指令类型：

- AI 问答优化。
- 选型指南。
- 厂家推荐。
- 国产替代。
- 应用方案。
- 产品对比。
- 故障排查。
- 技术科普。
- FAQ。
- 官网落地页。

字段：

- 指令名称。
- 适用内容类型。
- 适用提示词类型。
- 适用模型。
- 指令正文。
- 输出结构。
- 质量要求。
- 禁止事项。

功能：

- 新建指令。
- 编辑指令。
- 删除指令。
- 复制指令。
- 按类型筛选。

后续阶段可以支持从高收录文章中反向生成指令。

### 6.7 GEO 内容生成

内容生成必须服务于 GEO 目标，不是泛文章生成。

创建任务时选择：

- 任务名称。
- 目标产品线。
- 关联知识库。
- 提示词列表。
- 指令模板。
- 生成类型。
- 生成数量。
- 目标模型。
- 内容用途。

生成类型：

- AI 问答素材。
- 文章。
- 选型指南。
- 应用方案。
- 国产替代内容。
- 品牌实力内容。
- 对比内容。
- FAQ。
- 销售问答。

生成结果字段：

- 标题。
- 正文。
- 目标提示词。
- 关联知识库。
- 内容类型。
- GEO 优化点。
- 建议发布位置。
- 模型。
- 状态。
- 失败原因。

任务状态：

- pending
- running
- succeeded
- failed
- cancelled

功能：

- 创建生成任务。
- 查看任务列表。
- 查看生成结果。
- 编辑生成内容。
- 失败重试。
- 导出 Markdown/Word。

### 6.8 模型覆盖与上词记录

第一版不要求全自动检测，但必须保留 GEO 效果记录模块。

记录字段：

- 提示词。
- AI 模型。
- 查询时间。
- 是否提及品牌。
- 是否推荐品牌。
- 推荐位置。
- 是否引用官网。
- 回答摘要。
- 竞品提及。
- 记录方式：manual、api、import。

功能：

- 手动新增记录。
- Excel 导入记录。
- 按提示词、模型、日期筛选。
- 查看品牌提及率。
- 查看未覆盖提示词。
- 标记需要补内容。

后续阶段再做自动化检测。

### 6.9 GEO 报表

报表要围绕 GEO 优化，而不是普通内容统计。

报表指标：

- 提示词总量。
- 各类型提示词数量。
- 高优先级提示词数量。
- 已生成内容数量。
- 每个产品线的内容覆盖量。
- 模型覆盖记录数量。
- 品牌提及率。
- 未提及提示词数量。
- 需要补知识库的提示词数量。
- 需要补内容的提示词数量。

功能：

- 日期筛选。
- 产品线筛选。
- 模型筛选。
- 导出 Excel。

## 7. 非目标

MVP 不做：

- 外部媒体自动发布。
- 权益点/计费。
- 多租户销售版 SaaS。
- 自动爬全网媒体。
- 自动监控所有 AI 平台。
- 复杂审批。
- 复杂月报排版。
- 海外多语言完整版本。

但数据模型要为这些后续能力留扩展空间。

## 8. 核心业务流程

### 8.1 GEO 诊断流程

1. 用户输入品牌、官网、产品线和目标模型。
2. 系统生成或执行分析问题。
3. 系统记录 AI 回答和品牌表现。
4. 输出内容缺口、知识库缺口、提示词建议。
5. 用户将建议转入提示词库或内容任务。

### 8.2 提示词建设流程

1. 用户导入训练词。
2. 系统去重并分类。
3. 用户使用规则生成蒸馏词。
4. 用户使用 AI 拓展品牌词、场景词。
5. 用户勾选保存候选词。
6. 用户设置优先级和是否追踪。

### 8.3 知识库建设流程

1. 用户创建产品线知识库。
2. 上传企业资料或导入 URL。
3. 系统解析成知识片段。
4. 用户校对和打标签。
5. 知识库成为 GEO 内容生成依据。

### 8.4 内容生成流程

1. 用户选择目标提示词。
2. 选择知识库。
3. 选择指令模板。
4. 生成 GEO 内容。
5. 编辑并导出。
6. 后续人工发布到官网、公众号、B2B 平台等渠道。
7. 记录模型覆盖变化。

### 8.5 GEO 复盘流程

1. 用户查看报表。
2. 找到未被 AI 提及的高优先级提示词。
3. 查看是否缺少知识库资料。
4. 创建补充内容任务。
5. 下一轮检测中记录效果变化。

## 9. 数据模型草案

### users

- id
- name
- email
- role
- status
- created_at
- updated_at

### geo_analysis_tasks

- id
- name
- brand_name
- website_url
- product_line
- target_models
- status
- summary
- content_gaps
- knowledge_gaps
- prompt_suggestions
- created_by
- created_at
- updated_at

### geo_model_results

- id
- analysis_task_id
- prompt_text
- model
- brand_mentioned
- brand_recommended
- ranking_position
- cited_official_site
- answer_summary
- competitors
- raw_answer
- created_at

### knowledge_bases

- id
- name
- product_line
- description
- status
- created_by
- created_at
- updated_at
- deleted_at

### knowledge_files

- id
- knowledge_base_id
- file_name
- file_type
- file_size
- storage_path
- parse_status
- error_message
- created_by
- created_at
- updated_at
- deleted_at

### knowledge_chunks

- id
- knowledge_base_id
- file_id
- title
- content
- source_type
- product_line
- material_type
- tags
- created_at
- updated_at
- deleted_at

### geo_prompts

- id
- type
- base_word
- prompt_text
- product_line
- scenario
- user_intent
- priority
- target_models
- source
- track_enabled
- latest_coverage_status
- created_by
- created_at
- updated_at
- deleted_at

`type` 可选值：

- base
- distilled
- brand
- scene

### expansion_jobs

- id
- mode
- prompt_type
- input_payload
- provider
- model
- status
- created_by
- created_at
- updated_at

`mode` 可选值：

- rule
- ai

### expansion_candidates

- id
- job_id
- base_word
- prompt_text
- user_intent
- priority
- recommended_content_type
- selected
- saved_prompt_id
- created_at

### instruction_templates

- id
- name
- instruction_type
- content_type
- target_prompt_type
- target_model
- instruction
- output_format
- quality_rules
- forbidden_rules
- created_by
- created_at
- updated_at
- deleted_at

### content_tasks

- id
- name
- product_line
- knowledge_base_id
- instruction_template_id
- generation_type
- target_model
- status
- provider
- model
- created_by
- created_at
- updated_at

### content_items

- id
- task_id
- geo_prompt_id
- title
- body
- geo_optimization_points
- suggested_publish_channel
- status
- error_message
- created_at
- updated_at
- deleted_at

### model_inclusion_records

- id
- geo_prompt_id
- model
- checked_at
- brand_mentioned
- brand_recommended
- ranking_position
- cited_official_site
- answer_summary
- competitors
- record_method
- created_by
- created_at

### ai_call_logs

- id
- provider
- model
- purpose
- related_type
- related_id
- token_input
- token_output
- cost_estimate
- status
- created_at

## 10. 页面结构

### GEO 工作台

- GEO 资产卡片。
- GEO 效果卡片。
- 待优化提示词。
- 最近分析任务。
- 最近内容任务。
- 快捷入口。

### GEO 分析

- 新建分析任务。
- 分析任务列表。
- 分析详情。
- 内容缺口和提示词建议。
- 转入提示词库/内容任务。

### 提示词策略库

- Tab：训练词、蒸馏词、品牌词、场景词。
- 搜索和筛选。
- 表格。
- 手动添加。
- 批量导入。
- AI 拓词入口。
- 覆盖记录入口。

### AI 拓词

- 生成方式：手动组合 / AI 生成。
- 输入区。
- 组合规则区。
- 候选结果区。
- 勾选保存。

### 企业 GEO 知识库

- 知识库列表。
- 知识库详情。
- 上传资料。
- URL 导入。
- 知识片段管理。

### 指令库

- 指令列表。
- 新建/编辑指令。
- 按内容类型筛选。

### GEO 内容生成

- 任务列表。
- 创建任务。
- 结果列表。
- 内容编辑器。
- 导出。

### 模型覆盖记录

- 覆盖记录列表。
- 手动新增记录。
- Excel 导入记录。
- 未覆盖提示词视图。

### GEO 报表

- 筛选条件。
- 数据卡片。
- 模型覆盖表。
- 产品线覆盖表。
- Excel 导出。

## 11. 接口草案

### GEO Analysis

- `GET /api/geo-analysis-tasks`
- `POST /api/geo-analysis-tasks`
- `GET /api/geo-analysis-tasks/:id`
- `POST /api/geo-analysis-tasks/:id/run`
- `POST /api/geo-analysis-tasks/:id/convert-prompts`
- `POST /api/geo-analysis-tasks/:id/create-content-task`

### Knowledge

- `GET /api/knowledge-bases`
- `POST /api/knowledge-bases`
- `GET /api/knowledge-bases/:id`
- `PATCH /api/knowledge-bases/:id`
- `DELETE /api/knowledge-bases/:id`
- `POST /api/knowledge-bases/:id/files`
- `POST /api/knowledge-bases/:id/text-import`
- `POST /api/knowledge-bases/:id/url-import`
- `GET /api/knowledge-bases/:id/chunks`
- `PATCH /api/knowledge-chunks/:id`
- `DELETE /api/knowledge-chunks/:id`

### GEO Prompts

- `GET /api/geo-prompts`
- `POST /api/geo-prompts`
- `POST /api/geo-prompts/bulk-import`
- `PATCH /api/geo-prompts/:id`
- `DELETE /api/geo-prompts/:id`
- `GET /api/geo-prompts/export`

### Expansion

- `POST /api/expansion/rule-generate`
- `POST /api/expansion/ai-generate`
- `GET /api/expansion/jobs/:id`
- `POST /api/expansion/jobs/:id/save-candidates`

### Instructions

- `GET /api/instruction-templates`
- `POST /api/instruction-templates`
- `PATCH /api/instruction-templates/:id`
- `DELETE /api/instruction-templates/:id`

### Content

- `GET /api/content-tasks`
- `POST /api/content-tasks`
- `GET /api/content-tasks/:id`
- `POST /api/content-tasks/:id/retry`
- `GET /api/content-items`
- `PATCH /api/content-items/:id`
- `DELETE /api/content-items/:id`
- `GET /api/content-items/:id/export`

### Model Inclusion

- `GET /api/model-inclusion-records`
- `POST /api/model-inclusion-records`
- `POST /api/model-inclusion-records/import`
- `GET /api/model-inclusion-records/export`

### Reports

- `GET /api/reports/geo-overview`
- `GET /api/reports/prompt-coverage`
- `GET /api/reports/model-coverage`
- `GET /api/reports/content-coverage`
- `GET /api/reports/export`

## 12. AI Provider 设计

AI 接入使用统一接口：

```ts
interface AiProvider {
  generateText(input: GenerateTextInput): Promise<GenerateTextResult>;
}
```

第一版实现：

- DeepSeek Provider。

后续可扩展：

- OpenAI Provider。
- 通义 Provider。
- 豆包 Provider。
- Kimi Provider。

AI 调用用途：

- GEO 分析。
- AI 拓词。
- 知识库结构化。
- 内容生成。
- 指令优化。

所有 AI 调用必须记录：

- provider
- model
- purpose
- related_type
- related_id
- status
- token_input
- token_output

## 13. 错误处理

文件解析失败：

- 标记为 failed。
- 展示错误原因。
- 支持重新解析。

AI 生成失败：

- 任务标记为 failed。
- 保存错误信息。
- 支持重试。

批量导入失败：

- 返回成功数量、重复数量、失败行。
- 不因个别失败中断全部导入。

模型覆盖记录导入失败：

- 返回失败行。
- 标记缺失字段。
- 支持重新导入。

删除：

- 默认软删除。
- 删除前二次确认。

## 14. 权限

第一版使用简单角色权限：

- admin：全部功能。
- geo_operator：GEO 分析、提示词、模型覆盖、报表。
- content_editor：知识库、内容生成、内容编辑。
- viewer：只读查看和导出。

## 15. 验收标准

### GEO 分析

- 可以创建品牌/网站分析任务。
- 可以保存分析结果。
- 可以生成提示词建议和内容建议。

### 提示词策略库

- 可以维护训练词、蒸馏词、品牌词、场景词。
- 可以批量导入并去重。
- 可以设置优先级、用户意图和是否追踪。
- 可以导出 Excel。

### AI 拓词

- 可以通过组合规则生成候选词。
- 可以通过 AI 生成候选词。
- 可以勾选候选词保存到提示词库。

### 企业 GEO 知识库

- 可以创建知识库。
- 可以上传至少一种文档并解析。
- 可以编辑知识片段。
- 可以按产品线和资料类型管理资料。

### 指令库

- 可以新建、编辑、删除指令模板。
- 内容生成时可以选择指令模板。

### GEO 内容生成

- 可以创建内容生成任务。
- 任务状态会流转。
- 可以查看、编辑、导出生成内容。
- 生成结果能关联目标提示词和知识库。

### 模型覆盖记录

- 可以手动新增覆盖记录。
- 可以按提示词、模型、日期筛选。
- 可以看到品牌是否被提及和推荐。

### GEO 报表

- 可以看到基础 GEO 指标。
- 可以按日期、产品线、模型筛选。
- 可以导出 Excel。

## 16. 阶段规划

### Phase 1：GEO MVP

- GEO 工作台。
- GEO 分析。
- 提示词策略库。
- AI 拓词。
- 企业 GEO 知识库。
- 指令库。
- GEO 内容生成。
- 手动模型覆盖记录。
- 基础 GEO 报表。

### Phase 2：自动化检测

- 多模型自动检测。
- 品牌提及率自动统计。
- 竞品可见度对比。
- 提示词优先级自动推荐。

### Phase 3：内容发布与分发

- 发布计划。
- 官网/B2B/公众号发布记录。
- 发布状态追踪。
- 内容复用和改写。

### Phase 4：海外 GEO

- 多语言知识库。
- 海外模型检测。
- 国家/地区维度统计。
- 本地化内容生成。
