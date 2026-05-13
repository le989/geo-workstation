# 演示数据说明

本文档说明内部演示版 MVP 的 seed 数据、冒烟脚本数据、前端演示数据建议、无法物理删除的数据，以及如何重置本地数据库。

## seed 数据说明

执行：

```bash
pnpm prisma:seed
```

会写入少量基础演示数据，主要包括：

- 默认 admin 用户。
- 示例 GEO 提示词：
  - 训练词：激光测距传感器
  - 蒸馏词：激光测距传感器怎么选
  - 品牌词：凯基特激光测距传感器怎么样
  - 场景词：行车防撞用什么激光测距传感器
- 示例指令模板：
  - 选型指南
  - AI 问答素材
  - FAQ
- 示例知识库：
  - 激光测距传感器知识库

seed 只提供少量起步数据，不会塞大量假数据。

## smoke:api 会创建哪些数据

执行：

```bash
pnpm smoke:api
```

会通过 HTTP API 跑一条完整 GEO MVP 流程，并创建演示数据：

- GEO 分析任务。
- Mock GEO 分析结果和 `geo_model_results`。
- 由分析建议转入的 GEO 提示词。
- 企业 GEO 知识库。
- 文本导入生成的知识片段。
- 指令模板。
- GEO 内容任务和 content_items。
- 模型覆盖记录。
- 报表查询结果不会额外写入报表表，因为报表由现有数据统计生成。

`pnpm smoke:api` 默认请求 `http://localhost:3000`。如果后端端口不同，可以使用：

```bash
API_BASE_URL=http://localhost:3001 pnpm smoke:api
```

## 前端演示建议使用哪些测试数据

推荐使用同一条产品线贯穿演示，例如：

- 品牌名称：凯基特
- 产品线：激光测距传感器
- 官网：`https://example.com`
- 核心训练词：激光测距传感器、行车防撞传感器
- 目标模型：deepseek-chat、doubao、kimi

推荐演示数据结构：

1. 在 `/geo-analysis` 创建分析任务并运行 Mock 分析。
2. 将分析任务的 promptSuggestions 转入提示词库。
3. 在 `/knowledge-bases` 创建“激光测距传感器知识库”，文本导入产品参数、场景、FAQ。
4. 在 `/instruction-templates` 创建“选型指南”或“AI 问答素材”指令。
5. 在 `/content-tasks` 创建内容任务，选择刚刚转入的提示词、知识库和指令模板。
6. 在 `/model-inclusion-records` 手动录入一条模型覆盖记录。
7. 在 `/reports` 查看提示词覆盖、模型覆盖、内容覆盖、知识库覆盖和优化建议。

## 哪些数据无法物理删除

当前内部演示版优先采用软删除和审计保留策略：

- 提示词、知识库、知识文件、知识片段、指令模板、内容项支持软删除。
- GEO 分析任务当前没有前端删除入口，也没有删除 API。
- 模型覆盖记录当前没有删除接口。
- content_task 当前没有删除接口，content_item 支持软删除。
- smoke:api 和前端演示创建的部分数据会保留在本地数据库中。

如果需要彻底清理演示数据，建议重置本地数据库，而不是手动删除单表数据。

## 如何重置本地数据库

如果只是重新执行迁移和 seed：

```bash
docker compose up -d postgres
pnpm prisma:migrate
pnpm prisma:seed
```

如果希望清空本地数据库并重新开始，可以删除本地 PostgreSQL volume 后重建。执行前请确认没有需要保留的数据：

```bash
docker compose down -v
docker compose up -d postgres
pnpm prisma:migrate
pnpm prisma:seed
```

如果 Prisma migration 状态异常，也可以在本地开发库使用：

```bash
pnpm --filter @geo-workstation/api prisma migrate reset
pnpm prisma:seed
```

该命令会清空数据库并重新执行 migration。不要在生产数据库上执行。

## 如何重新 migrate / seed

常规流程：

```bash
cp .env.example .env
docker compose up -d postgres
pnpm prisma:generate
pnpm prisma:migrate
pnpm prisma:seed
```

校验 Prisma：

```bash
pnpm prisma:validate
pnpm prisma:generate
```

## 本地上传文件说明

企业知识库文件上传会写入本地 `storage/uploads`。该目录不进入 git。

如果要清理上传文件：

```bash
rm -rf storage/uploads
```

清理文件不会自动清理数据库中的 `knowledge_files` 记录。演示环境需要完整重置时，建议同时重置数据库。
