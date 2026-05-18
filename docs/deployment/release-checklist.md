# 上线前检查清单

本文档用于 `internal-mvp-v0.2` 后续部署到 VPS、内网服务器或测试服务器前的人工检查。

## 上线边界

- [ ] 本次只是内部演示版或内部试用部署。
- [ ] 已确认已启用最小登录保护，但仍需要内网、VPN 或服务器访问控制配合。
- [ ] 已确认 mock Provider 只用于演示、测试或无 Key 环境，不作为正式外部 AI 效果承诺。
- [ ] 未承诺真实外部 AI 检测结果。

## 构建检查

- [ ] `pnpm install` 完成。
- [ ] `pnpm lint` 通过。
- [ ] `pnpm typecheck` 通过。
- [ ] `pnpm build` 通过。
- [ ] `pnpm test:web-mvp` 通过。
- [ ] `pnpm test:auth` 通过。
- [ ] `pnpm test:web-auth` 通过。
- [ ] `DATABASE_URL=... pnpm test:api` 通过。
- [ ] `pnpm smoke:api` 通过。
- [ ] `pnpm check:internal-mvp` 通过。
- [ ] `pnpm check:deployment` 通过。
- [ ] `pnpm format:check` 通过。
- [ ] `git diff --check` 通过。

## 环境变量检查

- [ ] `.env.production` 已从 `.env.production.example` 复制。
- [ ] `apps/web/.env.production` 已从 `apps/web/.env.production.example` 复制。
- [ ] `DATABASE_URL` 使用真实私有密码，不是 `change_me`。
- [ ] `JWT_SECRET` 使用长随机值，不是示例占位值。
- [ ] `DEFAULT_ADMIN_EMAIL` 已确认。
- [ ] `DEFAULT_ADMIN_PASSWORD` 已替换为私有强密码；首次初始化如需基础 seed，使用 `ALLOW_PRODUCTION_SEED=true pnpm prisma:seed`。
- [ ] `INCLUDE_DEMO_SEED=false`，正式库不执行演示 seed。
- [ ] `BYPASS_AUTH_FOR_TESTS=false`。
- [ ] `LOCAL_STORAGE_ROOT` 指向服务器持久化目录。
- [ ] `CORS_ORIGIN` 与访问域名一致。
- [ ] `VITE_API_BASE_URL` 与 Nginx 反代方案一致。
- [ ] 没有把 `.env` 或 `.env.production` 提交到 git。
- [ ] 没有把真实 API Key 写进 README 或 docs。

## 数据库检查

- [ ] PostgreSQL 服务已启动。
- [ ] 数据库用户、库名和密码已创建。
- [ ] `pnpm prisma:migrate:deploy` 已执行。
- [ ] `pnpm prisma:seed` 仅在首次初始化时按需执行基础 seed，并已临时设置生产 seed 确认变量。
- [ ] 未在正式库执行 `INCLUDE_DEMO_SEED=true pnpm prisma:seed:demo`。
- [ ] 发布前已执行 `pg_dump` 备份。
- [ ] 已备份 `LOCAL_STORAGE_ROOT`，并确认数据库和上传目录属于同一批次。
- [ ] 已确认恢复命令、备份文件路径和恢复演练步骤。

## PM2 检查

- [ ] `deploy/ecosystem.config.cjs` 的 `cwd` 已改成真实部署目录。
- [ ] `apps/api/dist/main.js` 已存在。
- [ ] `pm2 start deploy/ecosystem.config.cjs --env production` 成功。
- [ ] `pm2 status` 显示 `geo-workstation-api` online。
- [ ] `pm2 logs geo-workstation-api` 无启动错误。
- [ ] `curl http://127.0.0.1:3000/health` 通过。

## Nginx 检查

- [ ] `server_name` 已替换为实际域名或内网主机名。
- [ ] `root` 指向 `apps/web/dist`。
- [ ] `/api/` 代理到 API。
- [ ] `/health` 代理到 API。
- [ ] `client_max_body_size` 满足文件上传需求。
- [ ] `nginx -t` 通过。
- [ ] `sudo systemctl reload nginx` 已执行。
- [ ] 浏览器访问 `/dashboard` 正常。

## Smoke Test 检查

- [ ] smoke 账号通过 `SMOKE_AUTH_EMAIL` / `SMOKE_AUTH_PASSWORD` 注入。
- [ ] smoke 数据使用小样本，不使用真实敏感资料。
- [ ] smoke 日志不输出 token、密码或 API Key。
- [ ] 后端健康检查通过。
- [ ] `/api/auth/me` 返回当前用户和公司上下文。
- [ ] `pnpm smoke:api` 跑通完整 MVP API 链路。
- [ ] 浏览器访问 `/login` 正常。
- [ ] 默认管理员可以登录。
- [ ] 未登录访问 `/dashboard` 会跳转 `/login`。
- [ ] 前端 `/dashboard` 可访问。
- [ ] `/geo-analysis` 可创建并运行 Mock 分析任务。
- [ ] `/geo-prompts` 可查询提示词。
- [ ] `/expansion` 可生成候选提示词并保存小样本。
- [ ] `/knowledge-bases` 可查看知识库。
- [ ] 上传一个小 txt/md/csv 文件，文件列表和片段状态正常。
- [ ] `/instruction-templates` 可查看或创建指令模板。
- [ ] `/geo-content` 可创建小样本内容任务。
- [ ] `/content-tasks` 兼容入口可访问同一内容页面。
- [ ] `/model-inclusion-records` 可录入或查看小样本模型覆盖记录。
- [ ] `/geo-reports` 可加载总览、GEO 命中汇总和优化建议。
- [ ] `/reports` 兼容入口可访问同一报表页面。
- [ ] 用户管理页面只对有权限角色开放。
- [ ] `/settings` 可查看或维护项目档案。
- [ ] 提示词、模型覆盖记录或 GEO 报表导出小样本成功。

## 权限与公司上下文检查

- [ ] 已确认当前角色矩阵：`platform_admin`、`company_admin`、`operator`、`viewer`。
- [ ] `viewer` 只能查看，不能创建 GEO 诊断任务。
- [ ] `viewer` 只能查看，不能创建 GEO 内容任务。
- [ ] 用户管理当前主要由 `platform_admin` 管理。
- [ ] 切换公司上下文后，业务列表、详情、导入、导出和报表只使用当前公司范围。

## 回滚检查

- [ ] 已记录当前发布 commit hash。
- [ ] 已记录上一版可用 commit hash。
- [ ] 已备份数据库。
- [ ] 已备份 `LOCAL_STORAGE_ROOT`。
- [ ] 已确认 PM2 回滚命令。
- [ ] 已确认 Nginx 配置可恢复。

## 安全边界检查

- [ ] 未提交真实数据库密码。
- [ ] 未提交真实 JWT 密钥、管理员密码或登录 token。
- [ ] 未提交真实 API Key。
- [ ] 未提交 `.env`。
- [ ] 未提交 `storage/` 或 `storage/uploads/`。
- [ ] 未提交数据库数据目录。
- [ ] Nginx 没有暴露不必要目录。
- [ ] 服务器防火墙只开放必要端口。
- [ ] 登录保护已启用，但没有开放注册、忘记密码、OAuth、多租户或复杂菜单级权限。

## 发布后观察

- [ ] 观察 PM2 日志 10 分钟。
- [ ] 观察 Nginx error log。
- [ ] 上传一个小 txt 文件验证知识库文件解析。
- [ ] 创建一条模型覆盖记录验证写库。
- [ ] 导出一次 CSV 验证下载。
