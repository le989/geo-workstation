# 数据库边界说明

本文档用于部署、验收和测试数据清理前确认数据库边界。任何写入、迁移、seed、测试或 cleanup 动作都必须先确认目标库名。

## 数据库用途

| 数据库名                               | 用途                          | 允许动作                                    | 禁止动作                                   |
| -------------------------------------- | ----------------------------- | ------------------------------------------- | ------------------------------------------ |
| `geo_workstation_official`             | 正式资料库 / 正式运营库       | 正式资料管理、备份后受控初始化、正式部署使用 | smoke 测试、demo seed、mock 生成正式内容、批量清理 |
| `geo_workstation_clean`                | 干净库 / 基线库               | 只读确认                                    | 写入测试、migrate、seed、cleanup、写库测试 |
| `geo_workstation_crud_smoke`           | 写入验收库                    | 明确允许的专项写库测试、migrate deploy 验证 | 当作正式数据源、误删、无备份清理           |
| `geo_workstation_aqa_chat_local_smoke` | 本地联调 / 当前最终验收使用库 | 本地联调、只读验收、经确认的精确清理        | 当作 clean 基线、无 dry-run 清理           |
| `geo_workstation`                      | 旧测试库                      | 暂保留、只读排查                            | 误删、误作为当前 smoke 库                  |

## official / smoke / clean 边界

- `geo_workstation_official` 是正式资料库，只用于正式资料、正式公司上下文和正式部署。正式内容生成必须使用真实登录、真实 API、真实数据库和真实 company membership。
- `geo_workstation_aqa_chat_local_smoke` 是开发 / 测试 / smoke 库，可以保留测试数据和 mock provider，用于页面联调和本地验收，不能代表正式资料库。
- `geo_workstation_clean` 是干净基线库，默认不触碰，不用于写库验收、mock 导入、seed、migrate 或 cleanup。

## 正式环境禁用项

正式环境必须保持：

- 禁止随意执行 seed；基础 seed 仅首次初始化且备份确认后临时开启。
- 禁止随意执行开发 migrate；发布只使用受控的 deploy 流程。
- 禁止运行测试脚本、mock import、demo seed 或 smoke 清理脚本。
- 禁止模拟登录、auth bypass、mock company context。
- 禁止 `mock` provider 生成正式内容、拓词或质检。
- 禁止 API 失败后展示 mock 知识库、mock 产品线、mock 指令模板或 mock 提示词。
- 禁止批量清理正式库，所有删除必须单独审批、备份和 dry-run。

正式部署必须确认：

- 后端 `APP_ENV=production`。
- 前端 `VITE_APP_ENV=production`。
- 数据库名为 `geo_workstation_official`。
- 页面顶部显示 `正式环境 / API`。
- API 启动日志只输出数据库名、安全摘要和 mock 开关状态，不输出完整连接串或密钥。

## clean 库禁区

`geo_workstation_clean` 是干净基线库。除非任务明确要求维护 clean 基线，否则默认禁止对它执行：

- `prisma:migrate`
- `prisma:migrate:deploy`
- `prisma:seed`
- `prisma:seed:demo`
- 任何 API 写库测试
- 任何测试数据清理
- 任何 delete / update / truncate

如果发现当前 `.env` 指向 `geo_workstation_clean`，需要立即停止写入动作，只输出库名并报告。

## 写库验收边界

写库验收优先使用：

- `geo_workstation_crud_smoke`
- 明确说明的一次性临时库

写库验收前需要确认：

- 当前库不是 `geo_workstation_clean`。
- 当前库不是旧测试库 `geo_workstation`，除非任务明确要求只读检查。
- 不运行禁用测试套件。
- 不输出完整连接串、密码、JWT、API Key 或 Bearer Token。

## 测试数据清理边界

删除测试数据前必须：

1. 确认数据库名，只输出库名。
2. 确认不是 `geo_workstation_clean`。
3. 先备份。
4. 先 dry-run。
5. 使用精确 ID 或可审计条件。
6. 在事务中执行。
7. 执行后核对主公司、主知识库、日志和审计记录。

禁止：

- 无 where 条件 delete。
- truncate。
- 为了绕过外键而删除 `operation_logs`、`ai_usage_records`、`ai_call_logs`。
- 按模糊关键词删除主公司正式数据。
- 清理无法确认来源的数据。

## 推荐检查命令

只输出库名，不输出完整连接串：

```bash
node <<'NODE'
const fs = require("fs");
const line = fs
  .readFileSync(".env", "utf8")
  .split(/\r?\n/)
  .find((item) => item.startsWith("DATABASE_URL="));
const raw = line.replace(/^DATABASE_URL=/, "").trim().replace(/^["']|["']$/g, "");
const url = new URL(raw);
console.log(url.pathname.replace(/^\//, ""));
NODE
```

检查迁移状态：

```bash
pnpm --filter @geo-workstation/api exec prisma migrate status --schema prisma/schema.prisma
```

生产或 smoke 库迁移使用：

```bash
pnpm prisma:migrate:deploy
```

本地开发迁移才使用：

```bash
pnpm prisma:migrate
```
