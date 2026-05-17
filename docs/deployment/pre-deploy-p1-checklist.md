# 部署前 P1 修复清单

本文档记录 LAN-1A 与 AUDIT-1A 至 AUDIT-6A 后归并出的部署前 P1 问题，以及 FIX-1 批次的处理状态。清单只记录问题、状态和部署确认点，不保存真实密码、token、API Key、数据库连接串或服务器地址。

## 已处理 P1

| 编号 | 问题 | 状态 | 相关提交 / 说明 |
| --- | --- | --- | --- |
| P1-01 | viewer 创建 GEO 诊断任务需要后端显式拒绝 | 已处理 | `a9afbf1 fix: 加固viewer写权限与文件路径脱敏` |
| P1-02 | viewer 创建内容任务需要后端显式拒绝 | 已处理 | `a9afbf1 fix: 加固viewer写权限与文件路径脱敏` |
| P1-03 | 知识库文件响应 / 解析错误可能暴露 storagePath / 本地路径 | 已处理 | `a9afbf1 fix: 加固viewer写权限与文件路径脱敏` |
| P1-04 | 前端默认 localhost API 地址存在局域网误连风险 | 已处理 | `c643f11 chore: 完善部署迁移与环境配置`；生产同源反代走 `/api`，分离端口需显式配置可访问 API Origin |
| P1-05 | CORS_ORIGIN 未配置时生产默认过宽 | 已处理 | `c643f11 chore: 完善部署迁移与环境配置`；生产必须显式配置 `CORS_ORIGIN` |
| P1-06 | 生产发布流程需要 migrate deploy | 已处理 | `c643f11 chore: 完善部署迁移与环境配置`；生产使用 `pnpm prisma:migrate:deploy` |
| P1-07 | 生产缺失 DATABASE_URL 时存在回退本地默认库风险 | 已处理 | `c643f11 chore: 完善部署迁移与环境配置`；生产必须显式配置 `DATABASE_URL` |
| P1-08 | seed 重跑可能覆盖默认管理员密码和默认公司信息 | 已处理 | `c643f11 chore: 完善部署迁移与环境配置`；生产 seed 需要显式确认 |
| P1-09 | PM2 生产环境变量注入方式需要明确 | 已处理 | `c643f11 chore: 完善部署迁移与环境配置`；PM2 示例从进程环境读取关键变量 |
| P1-10 | 部署文档仍可能误导生产使用开发迁移脚本 | 已处理 | FIX-1D；部署文档和检查清单统一为 `pnpm prisma:migrate:deploy` |
| P1-11 | 正式路由说明需要更新 | 已处理 | FIX-1D；`/geo-content`、`/geo-reports` 是正式入口，`/content-tasks`、`/reports` 是兼容入口 |
| P1-12 | 管理员 / 权限 / 公司上下文角色矩阵缺失 | 已处理 | FIX-1D；新增 `docs/deployment/roles-and-company-context.md` |
| P1-13 | seed 仅首次执行说明不足 | 已处理 | FIX-1D；部署、环境变量、备份文档均补充生产 seed 边界 |
| P1-14 | smoke / 验收文档未完整覆盖新旧路由、上传和导出 | 已处理 | FIX-1D；发布清单覆盖核心页面、新旧路由、上传小文件和导出小样本 |

## 部署时人工确认项

| 编号 | 确认项 | 状态 | 说明 |
| --- | --- | --- | --- |
| M-01 | 生产环境变量已配置 | 待部署确认 | 必须包含 `DATABASE_URL`、`JWT_SECRET`、`CORS_ORIGIN`、`LOCAL_STORAGE_ROOT` 等关键变量 |
| M-02 | Nginx 同源反代已配置 | 待部署确认 | 推荐 Nginx 托管前端并反代 `/api`、`/health` 到后端 |
| M-03 | `VITE_API_BASE_URL` 已按部署方式配置 | 待部署确认 | 同源反代留空走 `/api`；分离端口必须使用可访问 API Origin |
| M-04 | `LOCAL_STORAGE_ROOT` 已持久化并纳入备份 | 待部署确认 | 数据库和上传目录必须同批次备份 |
| M-05 | smoke 账号已通过环境变量注入 | 待部署确认 | 使用 `SMOKE_AUTH_EMAIL` / `SMOKE_AUTH_PASSWORD`，不要在日志和文档中写真实值 |
| M-06 | 首次 seed 策略已确认 | 待部署确认 | 已有真实数据后不要常规重跑 seed |
| M-07 | 部署后 smoke 验收已完成 | 待部署确认 | 覆盖登录、`/api/auth/me`、核心页面、新旧路由、小样本上传和导出 |

## 后置优化项

这些事项不阻断当前继续部署前修复，但建议进入后续版本排期：

- CSV 公式注入防护进一步收口。
- Prisma 错误码映射进一步细化。
- AI Provider 第三方错误进一步泛化。
- 浏览器自动化 smoke 覆盖部署后真实入口。
- 数据库和上传目录恢复演练脚本。
- 更细粒度的公司管理员用户管理边界。
