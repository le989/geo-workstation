# 自用 GEO 工作台 SOP

本文档用于把 GEO 工作站作为本地自用工具跑通真实 AI 拓词和真实 GEO 内容生成。它仍然围绕：

`GEO 诊断 -> 提示词策略 -> 企业知识库 -> GEO 内容生成 -> 效果记录 -> 优化建议`

本 SOP 不包含真实 API Key，不要求部署上线，不做外部 AI 自动检测。

## 1. 本地启动顺序

1. 准备私有环境变量文件：

```bash
cp .env.example .env
```

2. 在 `.env` 中配置数据库、管理员和 AI Provider。真实 key 只写入本机 `.env`，不要写入 README、docs、脚本或前端文件。
3. 启动 PostgreSQL：

```bash
docker compose up -d postgres
```

4. 初始化数据库：

```bash
pnpm install
pnpm prisma:migrate
pnpm prisma:seed
```

5. 分别启动后端和前端：

```bash
pnpm dev:api
pnpm dev:web
```

6. 访问：

```text
http://localhost:5173/login
```

## 2. 配置真实 AI Provider

`.env` 中建议保留默认 Mock，再在页面中按任务选择 `openai_compatible`；如果希望后端默认真实 AI，可将 `AI_PROVIDER` 改为 `openai_compatible`，也就是 `AI_PROVIDER=openai_compatible`。

```env
AI_PROVIDER=mock
AI_OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1
AI_OPENAI_COMPATIBLE_API_KEY=change_me_private_key
AI_OPENAI_COMPATIBLE_MODEL=deepseek-chat
AI_REQUEST_TIMEOUT_MS=60000
AI_MAX_TOKENS=3000
AI_TEMPERATURE=0.7
```

说明：

- DeepSeek 示例：`AI_OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1`，模型可用服务端支持的兼容模型名。
- 硅基流动或其他兼容服务：替换 base URL 和模型名即可。
- 前端只选择 provider 和 model，不提供 API Key 输入框。
- 修改 `.env` 后需要重启后端 API。
- 真实 AI 会消耗接口额度，建议先用少量提示词试跑。

## 3. 确认当前使用 Mock 还是真实 AI

在页面创建任务时：

- `/expansion` 的 AI 拓词表单中查看 `provider` 字段。
- `/content-tasks` 的创建任务弹窗中查看 `provider` 字段。
- `mock` 表示走本地 Mock。
- `openai_compatible` 表示调用后端 `.env` 中配置的真实 AI Provider。

在后端数据中：

- `expansion_job.provider` 会记录 `mock` 或 `openai_compatible`。
- `content_task.provider` 会记录 `mock` 或 `openai_compatible`。
- `ai_call_logs.provider`、`model`、`status` 会记录调用结果。

## 4. 登录系统

1. 打开 `/login`。
2. 使用 seed 创建的默认管理员或本地管理员登录。
3. 登录成功后进入 `/dashboard`。
4. 如果登录失败，先确认 `pnpm prisma:seed` 已执行，并检查 `.env` 中的 `DEFAULT_ADMIN_EMAIL` 和 `DEFAULT_ADMIN_PASSWORD`。

## 5. 导入真实 GEO 提示词

推荐产品线先统一使用：

```text
激光测距传感器
```

建议第一批提示词控制在 20-50 条，覆盖四类：

| 类型             | 示例                         |
| ---------------- | ---------------------------- |
| 训练词 base      | 激光测距传感器               |
| 蒸馏词 distilled | 激光测距传感器怎么选         |
| 品牌词 brand     | 凯基特激光测距传感器怎么样   |
| 场景词 scene     | 行车防撞用什么激光测距传感器 |

操作：

1. 进入 `/geo-prompts`。
2. 使用“新增提示词”单条录入，或用“批量导入”粘贴多行。
3. 设置产品线、用户意图、优先级和是否追踪。
4. 导入后查看重复行和失败行，确认未污染提示词策略库。

建议优先追踪：

- 高采购意图词。
- 厂家推荐类词。
- 国产替代类词。
- 应用方案类词。

## 6. 使用真实 AI 拓词

1. 进入 `/expansion`。
2. 切换到 AI 拓词表单。
3. 设置：
   - `provider = openai_compatible`
   - `model = deepseek-chat` 或当前 `.env` 支持的模型
   - `baseWord = 激光测距传感器`，也可测试 `光电传感器`、`接近开关`
   - `promptType = distilled / brand / scene`
   - `count = 10` 起步
4. 点击生成候选词。
5. 检查候选词质量和重复标记。
6. 勾选少量高价值候选词保存到提示词策略库。

关键边界：候选词不会自动入库，必须由用户人工勾选保存。

判断标准：

- 候选词是否像真实用户会问 AI 的问题。
- 是否能引出品牌、厂家、选型、国产替代、应用场景或故障排查。
- 是否避免无意义关键词堆砌。
- 是否没有自动入库，必须人工勾选保存。

## 7. 导入企业 GEO 知识库资料

第一轮只需要少量真实资料，先跑通闭环，不追求一次导入全部文档。

建议资料类型：

- 产品简介。
- 关键参数。
- 典型应用场景。
- 选型注意事项。
- FAQ。
- 客户案例或资质说明。

操作：

1. 进入 `/knowledge-bases`。
2. 创建“激光测距传感器知识库”。
3. 使用“文本导入”录入一段产品资料。
4. 可上传 `.txt`、`.md`、`.csv` 文件。
5. 查看知识片段是否生成。
6. 编辑明显不准确或过短的片段。

注意：

- 当前不支持 PDF、Word、Excel、URL 抓取、RAG 或向量数据库。
- 上传文件会保存在 `storage/uploads`，该目录不提交 git。

## 8. 创建真实 GEO 指令模板

进入 `/instruction-templates`，至少准备：

| 模板        | 用途                             |
| ----------- | -------------------------------- |
| 选型指南    | 让内容回答“怎么选”和“选型标准”   |
| FAQ         | 让内容形成 AI 容易摘取的问答结构 |
| AI 问答素材 | 面向 AI 搜索回答重写企业事实     |
| 应用方案    | 连接产品能力和具体场景           |

指令建议包含：

- 明确目标提示词。
- 强调只使用知识库可验证事实。
- 要求输出用户问题、判断逻辑、产品/方案说明、注意事项和问答式总结。
- 禁止编造参数、资质、客户案例或外部事实。

## 9. 使用真实 AI 生成 GEO 内容

1. 进入 `/content-tasks`。
2. 点击创建内容任务。
3. 选择：
   - `provider = openai_compatible`
   - `model = deepseek-chat` 或当前 `.env` 支持的模型
   - 至少 1 个真实 GEO 提示词
   - 真实知识库
   - 真实指令模板
   - 生成类型：`selection_guide`、`faq`、`application_solution` 或 `qa_material`
4. 提交任务。
5. 查看内容项：
   - 标题是否围绕目标提示词。
   - 正文是否引用知识库事实。
   - GEO 优化点是否明确。
   - 建议发布位置是否合理。
6. 编辑内容项，补充人工判断。
7. 导出 Markdown。

失败处理：

- 如果提示“AI Provider API Key 未配置”，检查 `.env` 是否配置 key，并重启 API。
- 如果提示“鉴权失败”，检查 key、base URL 和服务商额度。
- 如果提示“模型不可用或名称错误”，检查模型名。
- 如果提示“请求超时”，可提高 `AI_REQUEST_TIMEOUT_MS` 或减少输入知识片段数量。

## 10. 检查 AI 调用失败原因

页面侧：

- `/content-tasks` 详情抽屉中查看任务状态、内容项错误信息和最近 AI 调用日志。
- `/expansion` 生成失败时会显示后端返回的可读错误。

后端侧：

- `ai_call_logs.status = failed` 表示 Provider 调用失败。
- `provider` 和 `model` 可用于定位是哪种配置。
- 当前日志不保存完整 API Key，也不应在普通日志输出 key。

## 11. 录入模型覆盖记录

当前仍是人工录入或批量导入，不做外部 AI 自动检测。

1. 进入 `/model-inclusion-records`。
2. 选择提示词和模型。
3. 录入：
   - 是否提及品牌。
   - 是否推荐品牌。
   - 推荐位置。
   - 是否引用官网。
   - 回答摘要。
   - 竞品提及。
4. 保存后检查 summary 和提示词 `latestCoverageStatus`。

## 12. 查看 GEO 报表

进入 `/reports`，重点查看：

- Overview：整体资产量和提及率。
- Prompt Coverage：哪些追踪提示词还没覆盖。
- Content Coverage：哪些高优先级提示词缺内容。
- Model Coverage：不同模型下品牌提及和推荐情况。
- Knowledge Coverage：哪些产品线缺知识库。
- Optimization Suggestions：下一步补词、补资料、补内容或补检测的建议。

## 13. 常见问题

### 页面显示真实 AI 会消耗额度，是否正常

正常。只要 provider 选择 `openai_compatible`，后端就会调用真实兼容模型。演示或测试时建议保持 `mock`。

### 真实 AI 生成内容质量不稳定

先检查知识库资料是否充足，其次检查指令模板是否具体。不要只依赖训练词直接生成长文。

### 生成结果缺少企业事实

通常是知识库片段不足或指令没有强调“只使用可验证事实”。先补产品参数、场景、案例、FAQ，再重新生成。

### 候选词质量太泛

在 AI 拓词的 constraints 中加入场景、用户身份、采购意图或限制条件，例如“面向工业自动化采购、优先生成选型和厂家推荐类问题”。

### 不确定是否用了真实 AI

查看任务详情中的 provider/model，或查看数据库 `ai_call_logs`。页面不会显示 API Key。

## 14. 安全边界

- 不提交 `.env`。
- 不提交真实 API Key。
- 不在前端输入或保存 API Key。
- 不在文档、测试日志或 README 写真实 key。
- 不做外部 AI 自动检测。
- 不做自动发布。
- 真实 AI 输出必须人工复核后再用于对外内容。
