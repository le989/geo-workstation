# 部署前准备与交付说明

本文档用于 `DEPLOY-DOCS-1` 阶段的部署前交接。当前内容只整理启动、部署、回滚和正式使用前检查，不新增业务功能，不替代最终全链路验收报告。

## 当前稳定状态

- 最终验收结论：`FINAL-FULL-CHECK` 已通过。
- 当前稳定提交：`bac1a1c41b899ec37a08b83d6672ef661752b1e0`
- 当前稳定提交说明：`Merge branch 'feat/kb-auto-suggest-1'`
- 最终通过 tag：`backup/FINAL-FULL-CHECK_全链路验收通过_20260522`
- API 默认端口：`3000`
- Web 默认端口：`5173`

## 本地启动命令

本地开发一般按以下顺序启动：

```bash
pnpm install
docker compose up -d postgres
docker compose up -d redis
pnpm prisma:generate
pnpm prisma:migrate
pnpm dev:api
pnpm dev:web
```

说明：

- `pnpm prisma:migrate` 只用于本地开发库。
- 生产或共享部署使用 `pnpm prisma:migrate:deploy`。
- 不要在 `geo_workstation_clean` 上执行 migrate、seed、测试或 cleanup。

## 部署前命令

部署前建议至少完成：

```bash
pnpm install
pnpm prisma:generate
pnpm prisma:migrate:deploy
pnpm --filter @geo-workstation/api build
pnpm --filter @geo-workstation/web build
```

如果需要一次性执行仓库级构建：

```bash
pnpm build
```

生产 API 启动示例：

```bash
pnpm --filter @geo-workstation/api start
```

PM2 启动示例：

```bash
pm2 start deploy/ecosystem.config.cjs --env production
pm2 status
```

## Health Check

API 启动后确认：

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/api/health
```

前端由 Vite 本地服务或 Nginx 静态托管时，确认：

```bash
curl -I http://127.0.0.1:5173/
curl -I http://127.0.0.1:5173/login
```

生产同源反代时，按真实访问域名检查 `/`、`/login`、`/api/health`。

## 正式使用前 Checklist

- [ ] 登录页可访问，正式管理员可以登录。
- [ ] `BYPASS_AUTH_FOR_TESTS=false`。
- [ ] 正式用户账号已创建，不使用临时测试账号作为日常账号。
- [ ] 部门已设置，用户已绑定正确部门。
- [ ] 产品线已补充产品线说明。
- [ ] 企业知识库已有正式资料。
- [ ] 知识库资料的资料状态、可靠程度、可用场景已检查。
- [ ] 待审核和低可靠资料不会被 AI 正式引用。
- [ ] AI Provider Key 只配置在后端私有环境变量中。
- [ ] 真实 AI 调用额度已确认。
- [ ] 模型覆盖联网检测权限和二次确认已确认。
- [ ] AI Token 用量统计页面可打开。
- [ ] token unknown 能显示为未知，不被当成真实 0 token。
- [ ] Help 页面可打开，关键术语与页面一致。
- [ ] `LOCAL_STORAGE_ROOT` 已指向持久化目录。
- [ ] 数据库和 `LOCAL_STORAGE_ROOT` 已纳入同一批次备份策略。
- [ ] 正式库不执行 demo seed。

## 已知 P3 后置项

这些事项不阻断当前最终验收通过：

- Web build 存在 chunk size warning。
- 第三方依赖存在 PURE 注释 warning。
- `docker compose` 在未设置 `web_search` 变量时会输出 warning。

## 本轮不作为阻断的后置功能

以下能力不属于本轮最终验收阻断范围：

- PDF / OCR。
- Word 自动拆分章节。
- 复杂 AI 自动分类 / 自动学习。
- 成本金额计算 / 价格模型。
- 硬性 Token 额度限制。
- AI 拓词历史正式产品化归档 / 恢复。

## 回滚入口

当前可回滚 tag：

```bash
backup/FINAL-FULL-CHECK_全链路验收通过_20260522
```

查看 tag：

```bash
git tag --list "backup/FINAL-FULL-CHECK_全链路验收通过_20260522"
git show --stat "backup/FINAL-FULL-CHECK_全链路验收通过_20260522"
```

从 tag 创建恢复分支：

```bash
git checkout -b restore/final-full-check-20260522 "backup/FINAL-FULL-CHECK_全链路验收通过_20260522"
```

注意：代码回滚不等于数据库回滚。若数据库已执行更新版本 migration，切回旧代码前必须确认 schema 兼容；需要数据库回滚时，优先从备份恢复到测试环境验证。
