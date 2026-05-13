# MVP 功能清单

本文档用于内部演示版验收和交接，记录 `internal-mvp-v0.2` 已完成能力、Mock 边界、当前已知限制和下一阶段建议。

## 已完成页面清单

| 页面            | 路由                       | 状态       |
| --------------- | -------------------------- | ---------- |
| 登录页          | `/login`                   | 已完成     |
| GEO 工作台      | `/dashboard`               | 已完成     |
| GEO 分析        | `/geo-analysis`            | 已完成     |
| 提示词策略库    | `/geo-prompts`             | 已完成     |
| AI 拓词         | `/expansion`               | 已完成     |
| 企业 GEO 知识库 | `/knowledge-bases`         | 已完成     |
| 指令库          | `/instruction-templates`   | 已完成     |
| GEO 内容生成    | `/content-tasks`           | 已完成     |
| 模型覆盖记录    | `/model-inclusion-records` | 已完成     |
| GEO 报表        | `/reports`                 | 已完成     |
| 系统设置        | `/settings`                | 占位说明页 |

## 已完成后端 API 清单

- Health：`GET /health`、`GET /api/health`
- Auth：登录、当前用户、退出登录。
- GEO Analysis：分析任务列表、创建、详情、编辑、Mock 运行、建议转提示词、创建内容任务。
- GEO Prompts：列表、新增、编辑、软删除、批量导入、CSV 导出。
- GEO Expansion：规则拓词、默认 Mock / 可选 `openai_compatible` AI 拓词、任务详情、候选词保存到提示词库。
- GEO Knowledge Bases：知识库 CRUD、文本导入、知识片段查询/编辑/软删除。
- GEO Knowledge Files：txt/md/csv 上传、本地存储、解析、reparse、文件列表、文件软删除。
- GEO Instructions：指令模板 CRUD、复制、软删除、筛选。
- GEO Content：内容任务列表、创建、详情、retry、内容项查询/编辑/软删除、Markdown 导出。
- Model Inclusion Records：手动新增、批量导入、列表、未覆盖提示词、summary、CSV 导出。
- GEO Reports：overview、prompt coverage、model coverage、content coverage、knowledge coverage、optimization suggestions、CSV 导出。

## 已完成真实能力

- 用户、提示词、知识库、知识文件、知识片段、指令模板、内容任务、内容项、模型覆盖记录等核心数据真实写入 PostgreSQL。
- Prisma schema、migration 和 seed 已建立。
- 后端统一响应、异常处理、DTO 校验已接入。
- 后端已启用最小 JWT 鉴权，除健康检查和登录外的 `/api/*` 默认需要登录。
- seed 默认管理员会写入密码 hash，不保存明文密码。
- 前端已接入登录页、路由保护、当前用户展示和退出登录。
- 前端所有核心页面已接入真实 API。
- 批量导入类能力有失败行、重复行或跳过项说明。
- 删除类能力采用软删除。
- 文本导入和 txt/md/csv 文件解析会生成知识片段。
- 报表基于数据库统计，不是静态假数据。

## Mock 能力

- GEO 分析任务执行是 Mock，不调用真实外部 AI，不访问真实网站。
- AI 拓词生成默认是 Mock Provider，也可选择 `openai_compatible`。
- GEO 内容生成默认是 Mock 内容生成器，也可选择 `openai_compatible`。
- Mock 能力用于打通 GEO 闭环和内部演示；真实 AI 能力用于自用生成，仍需要人工审核。

## 未实现能力

- 真实外部 AI 自动检测。
- 外部 AI 平台自动检测和定时任务。
- 开放注册、忘记密码、短信/邮箱验证码、OAuth、多租户和复杂菜单级权限。
- 多用户协作、审批流和操作审计页面。
- 自动发布到官网、公众号、B2B 页面或外部媒体。
- 真实服务器部署执行和生产环境安全加固。
- PDF/Word/Excel 报告导出。
- URL 抓取、整站采集、RAG、向量数据库。
- 复杂图表大屏和月报自动生成。

## 当前已知限制

- 当前是最小登录保护，适合内部演示或受控环境试用；没有团队管理、开放注册或菜单级权限配置。
- GEO 分析结果是 Mock，不能用于对外承诺真实模型表现。
- `openai_compatible` 只用于 AI 拓词和 GEO 内容生成，不代表外部 AI 平台覆盖检测。
- 分析任务没有删除接口，演示数据会保留在本地数据库中。
- 部分数据采用软删除，列表默认隐藏，但数据库仍保留记录。
- 本地上传文件位于 `storage/uploads`，该目录被 `.gitignore` 排除。
- 知识库文件解析第一版只支持 txt/md/csv。
- 报表以卡片、表格和进度信息为主，没有复杂图表库。
- 队列 Redis + BullMQ 仍是后续异步任务扩展点，当前解析和 Mock 生成多为同步流程。

## 验收命令

```bash
pnpm lint
pnpm typecheck
pnpm build
DATABASE_URL=postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public pnpm test:api
pnpm test:auth
pnpm test:web-auth
pnpm smoke:api
pnpm test:web-mvp
pnpm check:internal-mvp
pnpm format:check
git diff --check
```

`pnpm smoke:api` 需要后端已启动。

## 下一阶段建议

1. Phase 4F：外部 AI 检测自动化

   在真实内容生成链路稳定后，再做多模型自动检测、定时任务和更复杂的模型覆盖分析。

2. Phase 4G：正式部署执行

   在部署准备文档和示例配置稳定后，再连接真实服务器、配置真实域名、真实数据库密码和生产访问控制。

3. 后续权限增强

   当前只做最小登录保护。多人协作阶段再补用户管理、角色分配、操作审计和更细的菜单/接口权限。

4. 多 Provider 扩展

   当前统一走 OpenAI-compatible Provider；后续再按需要接入专属 SDK 或更多模型平台。
