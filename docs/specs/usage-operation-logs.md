# USAGE-1 AI 使用统计与操作日志底座

## 第一版做了什么

USAGE-1 新增两类独立记录：

- `AiUsageRecord`：统一记录 AI / mock / stub 调用统计，用于 `/usage-analytics` 页面聚合查看。
- `OperationLog`：记录关键业务动作摘要，用于 `/operation-logs` 页面查询。

旧 `AiCallLog` / `ai_call_logs` 继续保留，用于原 GEO 内容生成详情展示。本次不迁移、不删除、不替换旧日志。

## AI 使用统计范围

第一版只接入明确调用点：

| moduleKey | action | 说明 |
| --- | --- | --- |
| `geo-analysis` | `run_analysis` | GEO 诊断模拟运行 |
| `expansion` | `ai_generate` | AI / mock 拓词 |
| `geo-content` | `content_generate` | GEO 内容任务生成 |
| `geo-content` | `content_retry` | GEO 内容任务重试 |
| `geo-content` | `quality_check` | 内容质量检查 |
| `geo-content` | `optimize_for_publish` | 发布稿优化 |
| `model-inclusion-records` | `web_search_check` | 模型覆盖 Web Search 检测 |

知识库和报表第一版不写 `AiUsageRecord`，只记录关键 `OperationLog`。

## Token 规则

- mock / stub：`requestCount=1`，`promptTokens=0`，`completionTokens=0`，`totalTokens=0`。
- 当前接入点写入的 `AiUsageRecord.requestCount` 第一版固定为 `1`。
- 真实 Provider：预留 `provider`、`model`、token 字段；本阶段不新增真实 Provider 接入。
- 调用失败也记录，`success=false`，`errorMessage` 只保留简短错误摘要。
- 不记录完整 prompt 原文，也不记录大段 AI 原始回答。

## 操作日志范围

第一版最小闭环记录：

- 登录成功 / 失败：`dashboard / login`
- 部门新增、编辑、启停、保存权限：`departments / create|update|status|save_permissions`
- 知识库上传、手动录入、元信息更新、片段编辑：`knowledge-bases / upload|manual_create|metadata_update|chunk_update`
- GEO 内容创建、重试、导出：`geo-content / create|retry|export`
- AI 拓词生成、保存候选词：`expansion / ai_generate|save_candidates`
- 模型覆盖检测、导出：`model-inclusion-records / web_search_check|export`
- GEO 报表导出：`geo-reports / export`

用户、公司、产品线、指令库等操作可作为后续 P1 小批补入。

## 敏感信息约束

`metadata`、错误摘要和页面返回不得包含：

- 密码、`passwordHash`
- JWT、token、secret
- API Key
- `DATABASE_URL`
- 完整 prompt 原文
- 本地 `storagePath` 或绝对上传路径
- 大段 AI 原始回答

日志写入封装在服务层，普通业务场景写日志失败只记录服务端 warning，不拖垮主业务。

## API 与权限

新增接口：

- `GET /api/usage/summary`
- `GET /api/usage/trends`
- `GET /api/usage/by-user`
- `GET /api/usage/by-department`
- `GET /api/usage/by-module`
- `GET /api/operation-logs`

权限：

- `platform_admin` 可查看全部或按公司筛选。
- `company_admin` 只查看当前公司。
- `operator` / `viewer` 不允许查看全局统计和操作日志。
- `/api/usage` 映射 `usage-analytics`，`/api/operation-logs` 映射 `operation-logs`；管理员不受部门权限锁死。

## 前端页面

新增：

- `/usage-analytics`：展示今日、本周、本月、总 token、mock / 真实调用、模块 / 用户 / 部门 / 趋势聚合。
- `/operation-logs`：展示时间、用户、部门、模块、动作、对象、结果、错误摘要和安全元信息。

页面入口纳入 `accessibleModules`，同时保留角色限制，仅 `platform_admin` / `company_admin` 可见。

## 第一版不做什么

- 不做额度限制。
- 不做成本扣费。
- 不接真实 AI Provider。
- 不做售后问答聊天框。
- 不做客户开放版。
- 不记录完整 prompt、AI 原始回答或本地文件路径。

## 验收说明

写入验收只使用 `geo_workstation_crud_smoke`。禁止使用或写入 `geo_workstation_clean`，禁止运行：

- `api test:auth`
- `api test:users`
- `api test:api`
