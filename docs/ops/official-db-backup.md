# official 正式库备份工具准备

## 工具目的

`OFFICIAL-DB-BACKUP-PREP-1` 的目标是先准备一个可验证的数据库备份入口。后续如果必须检查、修复或迁移 official 正式库，必须先具备可执行、可确认、不会误触库的备份能力。

本阶段只准备工具，不执行 official 真实备份。

## 当前阶段边界

- 不连接、不导出、不修改 `geo_workstation_official`。
- 不跑 migration。
- 不 seed。
- 不触发真实 AI。
- 不修改 Provider 配置。
- 不修改用户、部门或权限。
- 不做恢复工具、后台按钮或定时备份。

## 什么时候必须先备份

- official 数据检查前。
- official 数据修复前。
- official migration 前。
- official 导入、清理、批量更新前。
- 发布涉及正式库结构或数据变更前。

## 备份前检查项

执行任何数据库备份前，先确认：

- 当前分支。
- 当前提交。
- 工作区是否干净。
- `.env` 指向哪个数据库。
- 是否明确知道目标库名。
- 是否确认没有把 smoke 和 official 混淆。
- 是否确认当前阶段允许执行对应数据库操作。

## 命令

dry-run 只做安全检查，不生成备份文件：

```bash
pnpm db:backup:dry-run
```

smoke 验证只允许当前 `.env` 指向 `geo_workstation_aqa_chat_local_smoke`：

```bash
pnpm db:backup:smoke
```

如果当前机器没有 `pg_dump`，smoke 命令会给出清晰提示并安全停止，不会改库。安装 PostgreSQL client tools 后可重新执行。

## macOS PostgreSQL client tools 准备

macOS 首次执行真实 smoke 备份前，先确认 Homebrew 可用：

```bash
brew --version
```

如果缺少 PostgreSQL 客户端工具，优先安装 `libpq`：

```bash
brew install libpq
```

Apple Silicon 常见 Homebrew 路径为：

```text
/opt/homebrew/bin/brew
```

`libpq` 是 keg-only，安装后可能需要临时加入当前终端 PATH：

```bash
export PATH="/opt/homebrew/opt/libpq/bin:$PATH"
```

执行备份前确认三个客户端命令都能输出版本：

```bash
pg_dump --version
pg_restore --version
psql --version
```

如果官方 GitHub 源下载不稳定，可以使用稳定网络或镜像源重试。本阶段只允许验证 smoke 真实备份，不允许连接、导出或修改 official。smoke 验证通过后，下一阶段才考虑 official 首次人工备份。

## official 本阶段禁止执行

当前阶段禁止对 `geo_workstation_official` 执行真实备份。脚本检测到 official 库名时会直接阻断，避免误操作正式库。

## official 首次人工备份前检查

official 首次人工备份必须另开阶段，并在执行前完成以下检查：

- 已完成 smoke 真实备份验证。
- `pg_dump`、`pg_restore`、`psql` 均可用。
- 当前分支、当前提交、`origin/main` 对齐状态、工作区干净状态已确认。
- 已确认当前 `.env` 指向哪个数据库，本阶段不得把 `.env` 改成 official。
- 本阶段不得使用真实 official `DATABASE_URL`。
- 可使用假 official 连接串验证阻断逻辑，例如只指向本机不可用端口的 dry-run 命令：

```bash
DATABASE_URL="postgresql://blocked_user:blocked_password@127.0.0.1:1/geo_workstation_official" \
  node scripts/backup-database.mjs --dry-run
```

该命令只用于验证库名识别和 official 阻断，不应尝试连接数据库。

真实 official 备份前必须记录：

- 当前分支。
- 当前提交。
- 当前 `.env` 目标库。
- 备份输出路径。
- 备份文件大小。
- 是否已确认备份文件未进入 git。

明确禁止：

- migration。
- seed。
- 真实 AI。
- Provider 修改。
- 权限修改。
- 后台按钮。
- 定时备份。
- 恢复操作。

## 备份文件输出目录

脚本默认输出到：

```text
backups/database/
```

备份文件命名格式：

```text
{dbName}_{yyyyMMdd_HHmmss}.dump
```

## 备份成功确认方式

如果 smoke 备份实际执行成功，需要确认：

- `backups/database/` 下存在备份文件。
- 文件大小大于 0。
- 控制台输出成功信息。
- 备份文件没有进入 git 跟踪。

## 安全提醒

- 不要把数据库备份文件提交到 git。
- 不要在未确认环境时执行备份。
- 不要在没有回滚方案时操作 official。
- 不要把完整数据库连接串复制到聊天、日志或提交信息里。
