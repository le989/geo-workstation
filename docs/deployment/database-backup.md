# 数据库备份与恢复

本文档说明 `internal-mvp-v0.2` 的 PostgreSQL 数据和本地上传文件如何备份、恢复和重置。

## 备份 PostgreSQL

本地 Docker PostgreSQL 示例：

```bash
mkdir -p backups
docker compose exec -T postgres pg_dump -U geo_workstation -d geo_workstation > backups/geo_workstation_$(date +%Y%m%d_%H%M%S).sql
```

服务器 PostgreSQL 示例：

```bash
pg_dump "$DATABASE_URL" > backups/geo_workstation_$(date +%Y%m%d_%H%M%S).sql
```

建议：

- 发布前备份一次。
- 演示前备份一次稳定数据。
- 正式试用后按天或按周备份。
- 备份文件不要提交到 git。

## 恢复 PostgreSQL

恢复到本地 Docker PostgreSQL：

```bash
cat backups/geo_workstation_20260513_120000.sql | docker compose exec -T postgres psql -U geo_workstation -d geo_workstation
```

恢复到服务器 PostgreSQL：

```bash
psql "$DATABASE_URL" < backups/geo_workstation_20260513_120000.sql
```

恢复前建议：

- 先确认目标库是否需要清空。
- 先在测试环境恢复验证。
- 恢复完成后运行 `pnpm smoke:api` 做业务链路确认。

## 本地开发数据库重置

如果只是本地开发或演示数据混乱，可以重置数据库：

```bash
docker compose down
docker volume rm geo-workstation_geo_postgres_data
docker compose up -d postgres
pnpm prisma:migrate
pnpm prisma:seed
```

如果 Docker Compose 项目名不同，volume 名称可能不同。可以先查看：

```bash
docker volume ls | grep geo
```

## 重新 migrate / seed

常规迁移：

```bash
pnpm prisma:migrate:deploy
```

`pnpm prisma:migrate` 是开发迁移命令，生产发布使用 `pnpm prisma:migrate:deploy`。

重新生成 Prisma Client：

```bash
pnpm prisma:generate
```

写入示例数据：

```bash
ALLOW_PRODUCTION_SEED=true pnpm prisma:seed
```

Seed 数据用于演示和本地开发，不等同于正式业务数据。生产环境只有首次初始化且已确认备份/影响范围时才允许显式开启 `ALLOW_PRODUCTION_SEED=true`。

## 演示数据与正式数据

演示数据：

- 可以来自 `pnpm prisma:seed`。
- 可以来自 `pnpm smoke:api`。
- 可以来自前端手动演示流程。
- 允许包含 Mock 分析、Mock AI 拓词、Mock 内容生成结果。

正式数据：

- 应由实际运营人员录入、导入或确认。
- 不应混入无法解释的测试数据。
- 建议上线前使用干净数据库重新 seed，再导入真实资料。

## `storage/uploads` 与数据库备份的关系

知识库文件上传会同时产生：

- 数据库记录：`knowledge_files`、`knowledge_chunks`。
- 本地文件：`LOCAL_STORAGE_ROOT` 下的上传文件。

只备份数据库不等于完整备份知识库资料。必须同时备份：

- PostgreSQL 数据库。
- `LOCAL_STORAGE_ROOT` 目录。

示例：

```bash
tar -czf backups/geo_storage_$(date +%Y%m%d_%H%M%S).tar.gz -C /var/www/geo-workstation storage
```

恢复时也需要同时恢复上传目录：

```bash
tar -xzf backups/geo_storage_20260513_120000.tar.gz -C /var/www/geo-workstation
```

## 文件上传资料备份注意事项

- `storage/` 和 `uploads/` 已被 `.gitignore` 排除。
- 上传资料可能包含企业内部信息，不要放入公开仓库。
- 如果使用对象存储或 MinIO，需要额外备份 bucket 或配置生命周期策略。
- 文件记录和数据库记录要保持一致，避免只有文件无记录或只有记录无文件。
