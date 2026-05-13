# 部署准备指南

本文档用于 `internal-mvp-v0.2` 的部署上线准备。当前阶段只提供部署方案、环境变量、示例配置和检查清单，不连接真实服务器，不配置真实域名，不写真实密码，也不接入真实 AI Provider。

## 当前推荐部署方式

推荐先采用方案 A：单 VPS 或内网测试服务器部署。

- PostgreSQL：使用 Docker Compose 启动和持久化。
- API：NestJS 构建后使用 PM2 运行。
- Web：Vite 构建后由 Nginx 托管静态文件。
- Nginx：反向代理 `/api` 和 `/health` 到本机 API。

方案 B：Docker Compose 一体化部署作为后续选项，示例见 `deploy/docker-compose.production.example.yml`。该示例用于说明结构，不替换当前本地开发 `docker-compose.yml`。

## 部署前准备

服务器建议：

- 2 核 CPU，4GB 内存起步。
- 40GB 以上磁盘，上传资料较多时需要单独规划存储。
- Linux 服务器，适合 VPS、内网服务器或测试服务器。
- 出站网络可访问 npm/pnpm 镜像源。

版本建议：

| 组件           | 建议版本                      |
| -------------- | ----------------------------- |
| Node.js        | 22 LTS 或项目 CI 已验证的 20+ |
| pnpm           | 11.x                          |
| Docker         | 25+                           |
| Docker Compose | v2                            |
| PM2            | 5+                            |
| Nginx          | 1.24+                         |
| PostgreSQL     | 17-alpine 镜像                |

## 目录约定

文档中的示例默认把项目放在：

```text
/var/www/geo-workstation
```

可以替换为实际路径，但需要同步修改：

- `.env.production`
- `deploy/ecosystem.config.cjs`
- `deploy/nginx.geo-workstation.example.conf`
- Nginx `root`
- `LOCAL_STORAGE_ROOT`

## 环境变量

生产环境变量示例：

- 根目录：`.env.production.example`
- 前端：`apps/web/.env.production.example`

首次准备时复制为私有文件：

```bash
cp .env.production.example .env.production
cp apps/web/.env.production.example apps/web/.env.production
```

注意：

- `.env.production` 和 `apps/web/.env.production` 不要提交到 git。
- 示例文件只能保留占位密码和占位域名。
- 当前 API 代码读取 `API_PORT`，示例中同时保留 `PORT` 方便 PM2 或平台约定。
- `JWT_SECRET`、`DEFAULT_ADMIN_EMAIL`、`DEFAULT_ADMIN_PASSWORD` 必须在共享部署前替换。
- `DEEPSEEK_API_KEY` 仍是后续真实 Provider 预留，当前 MVP 不需要真实 Key。

## 数据库准备

方案 A 推荐只用 Docker Compose 启动 PostgreSQL：

```bash
docker compose up -d postgres
```

确认数据库可连接后执行：

```bash
pnpm prisma:migrate
pnpm prisma:seed
```

`pnpm prisma:seed` 会创建或更新默认管理员，并把 `DEFAULT_ADMIN_PASSWORD` 以 hash 写入数据库。生产或共享部署前必须先修改私有环境变量中的默认管理员密码。

如果服务器使用独立 PostgreSQL，也可以只配置 `DATABASE_URL`，不启动本地 Docker PostgreSQL。

## 后端构建与启动

安装依赖并构建：

```bash
pnpm install
pnpm --filter @geo-workstation/api build
```

PM2 示例配置：

```bash
pm2 start deploy/ecosystem.config.cjs --env production
pm2 save
pm2 status
```

查看日志：

```bash
pm2 logs geo-workstation-api
```

确认登录接口可用：

```bash
curl -X POST http://127.0.0.1:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@geo-workstation.local","password":"replace_with_private_password"}'
```

不要在命令历史或团队文档中保留真实密码。

重启 API：

```bash
pm2 restart geo-workstation-api
```

健康检查：

```bash
curl http://127.0.0.1:3000/health
```

## 前端构建与托管

构建前端：

```bash
pnpm --filter @geo-workstation/web build
```

构建产物在：

```text
apps/web/dist
```

方案 A 中由 Nginx 直接托管该目录。示例配置见：

```text
deploy/nginx.geo-workstation.example.conf
```

## Nginx 反向代理

示例配置包含：

- `root /var/www/geo-workstation/apps/web/dist;`
- `/api/` 代理到 `http://127.0.0.1:3000/api/`
- `/health` 代理到 `http://127.0.0.1:3000/health`
- `client_max_body_size 20m`
- `server_name your-domain.example.com`

启用配置后检查：

```bash
nginx -t
sudo systemctl reload nginx
```

前端同域反代时，`apps/web/.env.production` 可以保持：

```env
VITE_API_BASE_URL=
```

如果前端和 API 不同域，则设置完整 API Origin：

```env
VITE_API_BASE_URL=http://your-domain.example.com
```

## 方案 B：Docker Compose 一体化部署

示例文件：

```text
deploy/docker-compose.production.example.yml
```

包含：

- `postgres`
- `api`
- `web`
- 数据卷和上传文件卷
- `env_file` 占位

当前示例不包含正式 Dockerfile，也不要求生产可运行。等进入正式部署执行阶段，可以补充 API/Web 镜像构建、私有镜像仓库、健康检查和日志采集。

## 回滚

建议每次发布前记录：

- git commit hash
- 前端构建产物时间
- API 构建产物时间
- 数据库备份文件路径

回滚 API：

```bash
git checkout <previous-commit>
pnpm install
pnpm --filter @geo-workstation/api build
pm2 restart geo-workstation-api
```

回滚 Web：

```bash
git checkout <previous-commit>
pnpm --filter @geo-workstation/web build
sudo systemctl reload nginx
```

数据库回滚必须谨慎。优先通过备份恢复到测试环境确认，再恢复正式库。

## 常见问题

### 502 Bad Gateway

- 检查 PM2 API 是否运行：`pm2 status`
- 检查 API 健康：`curl http://127.0.0.1:3000/health`
- 检查 Nginx 代理地址是否与 API 端口一致。

### 前端页面能打开但 API 失败

- 检查 `VITE_API_BASE_URL` 是否符合部署方式。
- 同域反代时建议留空，让请求走 `/api`。
- 跨域部署时检查 `CORS_ORIGIN`。

### 文件上传失败

- 检查 Nginx `client_max_body_size`。
- 检查 `LOCAL_STORAGE_ROOT` 是否存在且 API 进程可写。
- 当前 MVP 仅支持 txt/md/csv，不支持 PDF/Word/Excel。

### Prisma 连接失败

- 检查 `DATABASE_URL`。
- 检查 PostgreSQL 容器或数据库服务状态。
- 确认已执行 `pnpm prisma:migrate`。

## 日志与重启

API 日志：

```bash
pm2 logs geo-workstation-api
```

Nginx 日志：

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

PostgreSQL 容器日志：

```bash
docker compose logs -f postgres
```

重启：

```bash
pm2 restart geo-workstation-api
sudo systemctl reload nginx
docker compose restart postgres
```
