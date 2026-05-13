# 环境变量指南

本文档说明 `internal-mvp-v0.2` 部署准备阶段需要的环境变量。示例文件可以提交，真实环境变量文件不能提交。

## 示例文件

| 文件                               | 用途             | 是否提交 |
| ---------------------------------- | ---------------- | -------- |
| `.env.example`                     | 本地开发示例     | 可以提交 |
| `.env.production.example`          | 生产环境后端示例 | 可以提交 |
| `apps/web/.env.example`            | 前端本地开发示例 | 可以提交 |
| `apps/web/.env.production.example` | 前端生产构建示例 | 可以提交 |
| `.env`                             | 本地私有配置     | 不提交   |
| `.env.production`                  | 生产私有配置     | 不提交   |
| `apps/web/.env.production`         | 前端生产私有配置 | 不提交   |

## 根目录 `.env`

本地开发使用：

```env
NODE_ENV=development
API_PORT=3000
WEB_PORT=5173
CORS_ORIGIN=
DATABASE_URL=postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public
REDIS_URL=redis://localhost:6379
LOCAL_STORAGE_ROOT=./storage
JWT_SECRET=change_me_local_jwt_secret
JWT_EXPIRES_IN=12h
DEFAULT_ADMIN_EMAIL=admin@geo-workstation.local
DEFAULT_ADMIN_PASSWORD=change_me_admin_password
BYPASS_AUTH_FOR_TESTS=false
AI_PROVIDER=mock
AI_OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1
AI_OPENAI_COMPATIBLE_API_KEY=change_me
AI_OPENAI_COMPATIBLE_MODEL=deepseek-chat
AI_REQUEST_TIMEOUT_MS=60000
AI_MAX_TOKENS=3000
AI_TEMPERATURE=0.7
```

## 根目录 `.env.production`

生产或测试服务器使用，基于 `.env.production.example` 创建：

```env
NODE_ENV=production
PORT=3000
API_PORT=3000
DATABASE_URL=postgresql://geo_user:change_me@localhost:5432/geo_workstation
LOCAL_STORAGE_ROOT=/var/www/geo-workstation/storage
CORS_ORIGIN=http://your-domain.example.com
JWT_SECRET=change_me_to_a_long_random_secret
JWT_EXPIRES_IN=12h
DEFAULT_ADMIN_EMAIL=admin@geo-workstation.local
DEFAULT_ADMIN_PASSWORD=change_me_admin_password
BYPASS_AUTH_FOR_TESTS=false
AI_PROVIDER=mock
AI_OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1
AI_OPENAI_COMPATIBLE_API_KEY=change_me
AI_OPENAI_COMPATIBLE_MODEL=deepseek-chat
AI_REQUEST_TIMEOUT_MS=60000
AI_MAX_TOKENS=3000
AI_TEMPERATURE=0.7
```

说明：

- `PORT`：通用平台端口变量，便于 PM2 或后续容器平台识别。
- `API_PORT`：当前 NestJS API 实际读取的端口变量。
- 当前阶段建议两者保持一致。

## 登录与 JWT

Phase 4D 使用 JWT Bearer 作为内部 MVP 登录态。

```env
JWT_SECRET=change_me_to_a_long_random_secret
JWT_EXPIRES_IN=12h
DEFAULT_ADMIN_EMAIL=admin@geo-workstation.local
DEFAULT_ADMIN_PASSWORD=change_me_admin_password
BYPASS_AUTH_FOR_TESTS=false
```

说明：

- `JWT_SECRET`：JWT 签名密钥。生产或共享部署必须替换为长随机值，不允许使用示例值。
- `JWT_EXPIRES_IN`：登录 token 有效期，默认 `12h`。
- `DEFAULT_ADMIN_EMAIL`：`pnpm prisma:seed` 创建或更新默认管理员时使用的邮箱。
- `DEFAULT_ADMIN_PASSWORD`：`pnpm prisma:seed` 创建或更新默认管理员时使用的密码，会以 hash 写入数据库。
- `BYPASS_AUTH_FOR_TESTS`：仅自动化测试可设为 `true`。生产环境必须保持 `false`。

如果修改了默认管理员密码，需要重新执行：

```bash
pnpm prisma:seed
```

不要把真实管理员密码、真实 JWT 密钥或 token 写入 README、部署文档、日志或 git。

## `DATABASE_URL`

格式：

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

本地开发示例：

```text
postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public
```

部署示例：

```text
postgresql://geo_user:change_me@localhost:5432/geo_workstation
```

真实部署时必须替换：

- 用户名
- 密码
- 主机
- 数据库名

不要把真实连接串写入 README、文档或 git。

## `LOCAL_STORAGE_ROOT`

用于企业知识库文件上传的本地存储目录。

本地开发：

```env
LOCAL_STORAGE_ROOT=./storage
```

服务器示例：

```env
LOCAL_STORAGE_ROOT=/var/www/geo-workstation/storage
```

要求：

- API 运行用户必须有写权限。
- 该目录需要和数据库一起纳入备份策略。
- 不要提交 `storage/` 或 `storage/uploads/` 到 git。

## `CORS_ORIGIN`

用于限制前端访问 API 的来源。

同域反代时可以留空或设置为实际域名。

跨域部署时设置为前端 Origin：

```env
CORS_ORIGIN=http://your-domain.example.com
```

不要在生产环境使用随意放开的跨域策略。

## `VITE_API_BASE_URL`

前端生产构建时使用。

同域反代模式：

```env
VITE_API_BASE_URL=
```

前端会通过当前站点的 `/api` 和 `/health` 访问后端。

前后端不同域模式：

```env
VITE_API_BASE_URL=http://your-domain.example.com
```

该值会被打进前端静态构建产物。修改后需要重新构建：

```bash
pnpm --filter @geo-workstation/web build
```

## AI Provider

Phase 4E 已接入统一 AI Provider 抽象。默认使用 `mock`，不需要真实 Key；自用真实流程可以切换为 OpenAI-compatible Provider。

```env
AI_PROVIDER=mock
AI_OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1
AI_OPENAI_COMPATIBLE_API_KEY=change_me
AI_OPENAI_COMPATIBLE_MODEL=deepseek-chat
AI_REQUEST_TIMEOUT_MS=60000
AI_MAX_TOKENS=3000
AI_TEMPERATURE=0.7
```

说明：

- `AI_PROVIDER`：默认 `mock`。内容生成和 AI 拓词接口也可以按请求传入 `provider=mock` 或 `provider=openai_compatible`。
- `AI_OPENAI_COMPATIBLE_BASE_URL`：OpenAI-compatible 服务地址。DeepSeek 示例为 `https://api.deepseek.com/v1`；硅基流动或其他兼容服务可替换为对应 base URL。
- `AI_OPENAI_COMPATIBLE_API_KEY`：真实 API Key，只能放在后端私有环境变量文件中，示例文件只能使用 `change_me`。
- `AI_OPENAI_COMPATIBLE_MODEL`：默认模型，例如 `deepseek-chat` 或服务商提供的兼容模型名。
- `AI_REQUEST_TIMEOUT_MS`：真实 AI 请求超时时间。
- `AI_MAX_TOKENS`：默认最大输出 token。
- `AI_TEMPERATURE`：默认生成温度。

前端只传 `provider` 和 `model`，不会读取、输入、保存或展示 API Key。真实 AI 调用会消耗额度；缺少 Key、鉴权失败、模型不可用或请求超时时，后端会返回可读错误并写入 `ai_call_logs`。

兼容服务示例：

```env
AI_PROVIDER=openai_compatible
AI_OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1
AI_OPENAI_COMPATIBLE_API_KEY=change_me_private_key
AI_OPENAI_COMPATIBLE_MODEL=deepseek-chat
```

安全要求：

- 不要提交真实 API Key。
- 不要把真实 API Key 写入 README 或部署文档。
- 不要在普通日志中输出完整 Key。
- 外部 AI 调用前需要明确哪些知识库内容会发送给模型。
- 生产环境不应使用 `change_me` 作为真实 Key。

## 不能提交到 git 的变量文件

- `.env`
- `.env.production`
- `apps/web/.env.local`
- `apps/web/.env.production`
- 任何包含真实密码、真实域名、真实 API Key 的配置文件
