# AQA-CHAT-1 售后问答对话助手

## 第一阶段做什么

AQA-CHAT-1 保留 `/aftersales-qa` 入口，将售后问答升级为内部售后 AI 对话助手。页面左侧为历史会话，右侧为对话窗口，支持新建会话、第一条问题自动生成标题、会话重命名、连续追问和每条回答下方的引用来源折叠展示。

AQA-CHAT-1-UX 在此基础上补齐会话管理体验：会话搜索、进行中 / 已归档 / 全部筛选、管理员“我的会话 / 全部会话”切换、加载更多、会话归档和恢复。归档不做物理删除，已归档会话默认只读，恢复后可继续提问。

会话由 `AftersalesConversation` 保存，一轮“用户问题 + AI 回答”仍复用 `AftersalesQuestionRecord` 保存。旧记录可以没有 `conversationId`，旧 `/api/aftersales-qa/records` 和 `/records/:id` 继续保留兼容。

## 会话模型

`AftersalesConversation` 记录：

- `companyId`
- `userId`
- `departmentId`
- `title`
- `status`
- `lastMessageAt`
- `createdAt`
- `updatedAt`

`status` 使用现有枚举：

- `active`：进行中，默认列表显示
- `archived`：已归档，可筛选查看和恢复

`AftersalesQuestionRecord` 增加：

- `conversationId`：可为空，兼容旧记录
- `sequence`：用于会话内排序

## 会话 API

新增 API 均保持统一响应格式 `{ code, message, data }`：

- `GET /api/aftersales-qa/conversations`
- `POST /api/aftersales-qa/conversations`
- `GET /api/aftersales-qa/conversations/:id`
- `PATCH /api/aftersales-qa/conversations/:id`
- `PATCH /api/aftersales-qa/conversations/:id/status`
- `POST /api/aftersales-qa/conversations/:id/ask`

会话列表支持：

- `page` / `pageSize`
- `keyword`：第一版搜索会话标题
- `status`：`active` / `archived` / `all`
- `scope`：`mine` / `all`

默认只返回 `active` 会话，按 `lastMessageAt desc`、`updatedAt desc` 排序，并返回 `total` 与 `hasMore` 供左侧加载更多使用。

权限策略：

- `platform_admin` / `company_admin` 可查看本公司全部会话和记录。
- `operator` / `viewer` 只能查看自己的会话和记录。
- `operator` / `viewer` 即使传 `scope=all`，也只能查看自己的会话。
- 会话归档 / 恢复遵守同样的归属和 `companyId` 隔离。
- 所有查询和提问均受 `companyId` 隔离与 `aftersales-qa` 模块访问权限限制。

## 检索范围

第一阶段不做向量检索，使用关键词和简单相关性召回知识片段，一条回答最多引用 3 个片段。

优先检索：

- `materialType = aftersales_material`
- `reviewStatus = approved`
- `applicableModules` 包含 `aftersales-qa`，或为空时按旧数据兼容处理
- 必须属于当前 `companyId`
- 普通用户必须属于售后资料允许且启用中的部门

如果没有命中可靠售后资料，再检索：

- `materialType = product_material`
- `reviewStatus = approved`
- 非售后资料默认公司内部可见

不会作为售后问答依据：

- `company_trust_material`
- `content_reference_material`
- `internal_process_material`
- `customer_case_material`
- `pending` 或 `disabled` 资料
- 当前用户无权访问的售后资料
- 跨公司资料

## 连续追问

同一会话内继续提问时，只取上一轮问题和当前问题合并检索：

`上一轮 question + 当前 question`

第一阶段不把上一轮 AI 回答全文、历史引用来源或多轮上下文全部塞入检索，避免旧上下文带偏。

如果当前问题过于模糊，且上一轮问题也无法提供有效上下文，返回 `needs_clarification`，固定提示：

“需要补充信息后才能继续排查：请补充产品型号、输出方式、现场现象、接线情况或供电电压。”

## 无依据回答策略

没有命中可靠片段时，回答状态为 `no_reliable_source`，固定提示：

“未找到可引用资料，建议补充资料或转人工确认。”

无依据时不生成一般排查方向，不引用无关资料，不把它显示为系统错误。

系统使用说明类问题（例如怎么补充资料、人工确认是什么意思、售后问答怎么用）直接返回轻量使用引导，不进入售后资料检索，也不生成引用来源。

## 引用来源格式

`citedSources` 为 JSON 数组，每条引用包含：

- `knowledgeBaseId`
- `knowledgeBaseName`
- `fileId`
- `fileTitle`
- `chunkId`
- `materialType`
- `snippet`

`snippet` 只保存短摘录，不保存整篇资料，不返回或保存 `storagePath`、本地绝对路径、API Key、token、JWT、DATABASE_URL。

## Usage 与操作日志

每次会话提问继续写入 `AiUsageRecord`：

- `moduleKey = aftersales-qa`
- `action = ask`
- `provider = mock`
- `model = internal-rule-based`
- `isMock = true`
- `promptTokens = 0`
- `completionTokens = 0`
- `totalTokens = 0`
- `requestCount = 1`

每次提问也写入 `OperationLog`：

- `moduleKey = aftersales-qa`
- `action = ai_question`
- `targetType = aftersales_question_record`
- `targetId = recordId`
- metadata 可保存 `conversationId`、问题短摘要、状态、引用数量、引用 ID 摘要、mock/provider/model 等低风险字段

日志不保存完整资料正文、大段 AI 原始回答、`storagePath`、本地绝对路径、密码、JWT、API Key 或 `DATABASE_URL`。日志写入失败不应拖垮主问答流程。

会话归档 / 恢复也写入 `OperationLog`：

- `action = archive_conversation` 或 `restore_conversation`
- `targetType = aftersales_conversation`
- `targetId = conversationId`
- metadata 只保存状态变化摘要

## 第一阶段不做什么

- 不做回答有误按钮
- 不做反馈弹窗
- 不做反馈待处理列表
- 不做转知识库待审核草稿
- 不做 Markdown 导出
- 不做物理删除会话
- 不做图片或文件上传提问
- 不接真实 AI Provider
- 不做客户开放版
- 不做自由聊天机器人
- 不做流式输出
- 不做向量库和复杂语义检索
