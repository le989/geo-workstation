# AFTERSALES-QA-1 售后问答与引用来源

## 第一版做什么

AFTERSALES-QA-1 新增内部售后问答模块，入口为 `/aftersales-qa`，moduleKey 为 `aftersales-qa`。第一版只面向公司内部登录用户，基于企业知识库中已通过审核的资料回答售后问题，并保存问答记录、引用来源、AI 使用统计和操作日志。

每次提问会生成 `AftersalesQuestionRecord`，记录问题、回答、回答状态、引用来源、使用资料类型、是否有可靠依据、mock 标记、可关联的 AI 使用记录以及反馈状态预留字段。

## 检索范围

第一版不做向量检索，使用关键词和简单相关性召回知识片段，最多引用 5 条片段。

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

不会作为售后问答依据的资料类型：

- `company_trust_material`
- `content_reference_material`
- `internal_process_material`
- `customer_case_material`
- `pending` 或 `disabled` 资料
- 当前用户无权访问的售后资料
- 跨公司资料

## 无依据回答策略

没有命中可靠片段时，回答状态为 `no_reliable_source`，固定提示：

“知识库中未找到可靠依据，建议补充售后资料或转人工确认。”

页面会把无依据回答作为正常结果展示，不按系统错误处理。允许展示一般排查方向，但必须明确标注当前知识库未找到直接依据。

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

## 权限策略

- 需要登录并拥有 `aftersales-qa` 模块访问权限。
- `platform_admin` / `company_admin` 不被部门模块权限锁死，可查看本公司全部问答记录。
- `operator` / `viewer` 可使用售后问答，但只能查看自己的问答记录。
- 售后资料访问限制只作用于 `aftersales_material`。
- 部门停用或未被允许的普通用户不能通过售后问答读取受限售后资料。
- `companyId` 隔离必须在资料检索和问答记录查询中同时生效。

## Usage 与操作日志

每次 `/api/aftersales-qa/ask` 都会写入 `AiUsageRecord`：

- `moduleKey = aftersales-qa`
- `action = ask`
- `provider = mock`
- `model = internal-rule-based`
- `isMock = true`
- `promptTokens = 0`
- `completionTokens = 0`
- `totalTokens = 0`
- `requestCount = 1`

每次提问也会写入 `OperationLog`：

- `moduleKey = aftersales-qa`
- `action = ai_question`
- `targetType = aftersales_question_record`
- `targetId = recordId`

metadata 只保存问题短摘要、状态、引用数量、引用 ID 摘要、mock/provider/model 等低风险字段，不保存完整资料正文或大段 AI 原始回答。日志写入失败不应拖垮主问答流程。

## 第一版不做什么

- 不接真实 AI Provider
- 不做客户开放版
- 不做自动纠错写入知识库
- 不做 PDF / OCR
- 不做复杂工单系统
- 不做自由聊天机器人
- 不做向量库和复杂语义检索
