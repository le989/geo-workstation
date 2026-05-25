# 数据库边界说明

本文档用于部署、验收和测试数据清理前确认数据库边界。任何写入、迁移、seed、测试或 cleanup 动作都必须先确认目标库名。

## 数据库用途

| 数据库名                               | 用途                          | 允许动作                                    | 禁止动作                                   |
| -------------------------------------- | ----------------------------- | ------------------------------------------- | ------------------------------------------ |
| `geo_workstation_clean`                | 干净库 / 基线库               | 只读确认                                    | 写入测试、migrate、seed、cleanup、写库测试 |
| `geo_workstation_crud_smoke`           | 写入验收库                    | 明确允许的专项写库测试、migrate deploy 验证 | 当作正式数据源、误删、无备份清理           |
| `geo_workstation_aqa_chat_local_smoke` | 本地联调 / 当前最终验收使用库 | 本地联调、只读验收、经确认的精确清理        | 当作 clean 基线、无 dry-run 清理           |
| `geo_workstation`                      | 旧测试库                      | 暂保留、只读排查                            | 误删、误作为当前 smoke 库                  |

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
