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
APP_ENV=development
API_PORT=3000
WEB_PORT=5173
CORS_ORIGIN=
VITE_APP_ENV=development
VITE_APP_ENV_LABEL=开发环境 / Mock
VITE_ENABLE_MOCK=true
DATABASE_URL="postgresql://geo_workstation:geo_workstation@localhost:5432/geo_workstation?schema=public"
REDIS_URL=redis://localhost:6379
LOCAL_STORAGE_ROOT=./storage
JWT_SECRET="local_dev_jwt_secret_change_me_123456789"
JWT_EXPIRES_IN=12h
DEFAULT_ADMIN_EMAIL="admin@example.com"
DEFAULT_ADMIN_PASSWORD="change_me_admin_password"
BYPASS_AUTH_FOR_TESTS=false
ENABLE_MOCK_AUTH=true
INCLUDE_DEMO_SEED=false
AI_PROVIDER="mock"
ENABLE_MOCK_PROVIDER=true
AI_OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1
AI_OPENAI_COMPATIBLE_API_KEY=change_me
AI_OPENAI_COMPATIBLE_MODEL=deepseek-chat
AI_REQUEST_TIMEOUT_MS=60000
AI_MAX_TOKENS=3000
AI_TEMPERATURE=0.7
```

从项目根目录执行 `pnpm prisma:validate`、`pnpm prisma:generate`、`pnpm prisma:migrate`、`pnpm prisma:seed` 时，Prisma 配置会显式读取根目录 `.env`，不需要手动 `export DATABASE_URL`。`pnpm prisma:seed` 默认只执行基础 seed；演示数据必须额外使用 `INCLUDE_DEMO_SEED=true pnpm prisma:seed:demo` 显式执行。生产发布迁移使用 `pnpm prisma:migrate:deploy`，不要用开发迁移命令替代。

## 根目录 `.env.production`

生产或测试服务器使用，基于 `.env.production.example` 创建：

```env
NODE_ENV=production
APP_ENV=production
PORT=3000
API_PORT=3000
DATABASE_URL=postgresql://geo_user:change_me@localhost:5432/geo_workstation_official
LOCAL_STORAGE_ROOT=/var/www/geo-workstation/storage
CORS_ORIGIN=http://your-domain.example.com
JWT_SECRET=change_me_to_a_long_random_secret
JWT_EXPIRES_IN=12h
DEFAULT_ADMIN_EMAIL=admin@geo-workstation.local
DEFAULT_ADMIN_PASSWORD=change_me_admin_password
BYPASS_AUTH_FOR_TESTS=false
ENABLE_MOCK_AUTH=false
ALLOW_PRODUCTION_SEED=false
INCLUDE_DEMO_SEED=false
AI_PROVIDER=openai_compatible
ENABLE_MOCK_PROVIDER=false
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
- `APP_ENV`：业务运行环境，生产必须为 `production`，smoke 使用 `smoke`，本地开发使用 `development`。
- 当前阶段建议两者保持一致。

## 登录、JWT 与 seed

当前系统使用 JWT Bearer 作为内部 MVP 登录态。

```env
JWT_SECRET=change_me_to_a_long_random_secret
JWT_EXPIRES_IN=12h
DEFAULT_ADMIN_EMAIL=admin@geo-workstation.local
DEFAULT_ADMIN_PASSWORD=change_me_admin_password
BYPASS_AUTH_FOR_TESTS=false
ENABLE_MOCK_AUTH=false
INCLUDE_DEMO_SEED=false
```

说明：

- `JWT_SECRET`：JWT 签名密钥。生产或共享部署必须替换为长随机值，不允许使用示例值。
- `JWT_EXPIRES_IN`：登录 token 有效期，默认 `12h`。
- `DEFAULT_ADMIN_EMAIL`：`pnpm prisma:seed` 创建或更新默认管理员时使用的邮箱。
- `DEFAULT_ADMIN_PASSWORD`：`pnpm prisma:seed` 创建或更新默认管理员时使用的密码，会以 hash 写入数据库。
- `BYPASS_AUTH_FOR_TESTS`：仅自动化测试可设为 `true`。生产环境必须保持 `false`。
- `ENABLE_MOCK_AUTH`：控制测试 auth bypass 是否可用。`APP_ENV=production` 时必须为 `false`，即使误设 `BYPASS_AUTH_FOR_TESTS=true` API 也会拒绝启动或拒绝绕过登录。
- `ALLOW_PRODUCTION_SEED`：生产环境防误执行开关。只有首次初始化且已确认备份/影响范围时，才临时设为 `true` 执行 seed。
- `INCLUDE_DEMO_SEED`：演示 seed 防误执行开关。正式库和干净库保持 `false`，只有演示环境需要样例 GEO 数据时才临时设为 `true`。

如果生产首次初始化确实需要执行基础 seed，需要显式确认：

```bash
ALLOW_PRODUCTION_SEED=true pnpm prisma:seed
```

基础 seed 会创建或更新默认管理员、默认公司、管理员 Membership 和基础产品线，不会生成演示提示词、知识库、指令模板、内容任务、模型覆盖记录或 AI 调用日志。不要在已有真实业务数据的生产库中随意重跑。

演示 seed 只用于演示环境，需要显式确认：

```bash
INCLUDE_DEMO_SEED=true pnpm prisma:seed:demo
```

生产环境若确需演示 seed，还必须同时满足 `ALLOW_PRODUCTION_SEED=true`。正式库、干净库和已有真实业务数据的数据库不要执行演示 seed。

不要把真实管理员密码、真实 JWT 密钥或 token 写入 README、部署文档、日志或 git。

## 业务环境与 Mock 开关

后端使用 `APP_ENV` 区分业务环境，前端使用 `VITE_APP_ENV` 区分构建环境。

| 环境       | 后端 APP_ENV | 前端 VITE_APP_ENV | Mock 使用边界                       | 页面标签默认值      |
| ---------- | ------------ | ----------------- | ----------------------------------- | ------------------- |
| 本地开发   | `development` | `development`     | 可用 mock provider 和开发辅助能力   | `开发环境 / Mock`   |
| smoke 测试 | `smoke`      | `smoke`           | 可用测试数据和 mock provider        | `测试环境 / Smoke`  |
| 正式部署   | `production` | `production`      | 禁止 mock provider、模拟登录和 bypass | `正式环境 / API`    |

正式环境必须配置：

```env
APP_ENV=production
ENABLE_MOCK_PROVIDER=false
ENABLE_MOCK_AUTH=false
```

前端生产构建必须配置：

```env
VITE_APP_ENV=production
VITE_APP_ENV_LABEL=正式环境 / API
VITE_ENABLE_MOCK=false
```

生产下 API 启动日志只会输出 `APP_ENV`、数据库名、mock provider 状态和 mock auth 状态，不输出完整 `DATABASE_URL`、JWT_SECRET、管理员密码或 API Key。若正式环境请求 `provider=mock`，后端会返回明确错误，不会 fallback 到 mock 草稿。

smoke / development 可以使用：

```env
APP_ENV=smoke
ENABLE_MOCK_PROVIDER=true
ENABLE_MOCK_AUTH=true
VITE_APP_ENV=smoke
VITE_ENABLE_MOCK=true
```

smoke 数据和 mock 结果不能代表正式资料库，也不能用于正式发布。

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
postgresql://geo_user:change_me@localhost:5432/geo_workstation_official
```

真实部署时必须替换：

- 用户名
- 密码
- 主机
- 数据库名

不要把真实连接串写入 README、文档或 git。

生产环境必须显式设置 `DATABASE_URL`。缺失时 API 会启动失败，不会回退到本地默认数据库。

数据库边界：

- `geo_workstation_official`：正式资料库，仅正式资料管理和正式部署使用。
- `geo_workstation_aqa_chat_local_smoke`：开发 / 测试 / smoke 库，可保留测试数据和 mock provider。
- `geo_workstation_clean`：干净基线库，默认不触碰，不随意 seed、migrate、写库测试或 cleanup。

正式部署前只输出数据库名确认，不输出完整连接串。

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

生产环境必须显式设置 `CORS_ORIGIN`，不能留空。Nginx 同源反代时设置为用户访问前端的实际 Origin；跨域部署时设置为前端 Origin。

跨域部署时设置为前端 Origin：

```env
CORS_ORIGIN=http://your-domain.example.com
```

开发环境可以留空以便本地调试。不要在生产环境使用随意放开的跨域策略。

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

不要在局域网或生产构建中使用 `localhost` 作为 `VITE_API_BASE_URL`，否则访问者浏览器会请求访问者自己的机器。未设置生产值时，前端默认走同源 `/api`。

该值会被打进前端静态构建产物。修改后需要重新构建：

```bash
pnpm --filter @geo-workstation/web build
```

## AI Provider

当前已接入统一 AI Provider 抽象。development / smoke 默认可使用 `mock`，不需要真实 Key；正式流程必须切换为 OpenAI-compatible Provider 或其他真实 Provider，不能 fallback 到 mock。

AI Provider 的密钥只允许配置在后端私有环境变量中，不能配置到前端 `.env`，也不能写入文档、日志、构建产物或 git。

```env
AI_PROVIDER=mock
ENABLE_MOCK_PROVIDER=true
AI_OPENAI_COMPATIBLE_BASE_URL=https://api.deepseek.com/v1
AI_OPENAI_COMPATIBLE_API_KEY=change_me
AI_OPENAI_COMPATIBLE_MODEL=deepseek-chat
AI_REQUEST_TIMEOUT_MS=60000
AI_MAX_TOKENS=3000
AI_TEMPERATURE=0.7
```

说明：

- `AI_PROVIDER`：development / smoke 可为 `mock`。`APP_ENV=production` 默认应为 `openai_compatible` 或其他真实 Provider。
- `ENABLE_MOCK_PROVIDER`：控制 `provider=mock` 是否可用。生产必须为 `false`，内容生成、AI 拓词、质检和发布优化请求不得使用 mock。
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
- 生产环境不应使用 `AI_PROVIDER=mock`，也不应把请求失败兜底为 mock 数据。

### OpenAI-compatible / DeepSeek 兼容链路变量

| 变量名                          | 用途                                                             |
| ------------------------------- | ---------------------------------------------------------------- |
| `AI_PROVIDER`                   | 控制默认 AI Provider。真实兼容链路通常使用 `openai_compatible`。 |
| `AI_OPENAI_COMPATIBLE_BASE_URL` | OpenAI-compatible 服务地址。                                     |
| `AI_OPENAI_COMPATIBLE_API_KEY`  | OpenAI-compatible API Key，仅后端读取。                          |
| `AI_OPENAI_COMPATIBLE_MODEL`    | 默认模型名称。                                                   |
| `AI_REQUEST_TIMEOUT_MS`         | AI 请求超时时间。                                                |
| `AI_MAX_TOKENS`                 | 默认最大输出 token。                                             |
| `AI_TEMPERATURE`                | 默认生成温度。                                                   |

### Kimi Web Search 变量

| 变量名                  | 用途                                              |
| ----------------------- | ------------------------------------------------- |
| `KIMI_API_KEY`          | Kimi / Moonshot Web Search 调用密钥，仅后端读取。 |
| `KIMI_API_BASE_URL`     | Kimi / Moonshot API 地址。                        |
| `KIMI_WEB_SEARCH_MODEL` | Kimi 联网检测使用的模型名称。                     |

### Volcengine / 豆包方向 Web Search 变量

| 变量名                        | 用途                                              |
| ----------------------------- | ------------------------------------------------- |
| `VOLCENGINE_API_KEY`          | 火山 / 豆包方向 Web Search 调用密钥，仅后端读取。 |
| `VOLCENGINE_API_BASE_URL`     | 火山 / 豆包方向 API 地址。                        |
| `VOLCENGINE_WEB_SEARCH_MODEL` | 火山 / 豆包方向联网检测使用的模型名称。           |
| `DOUBAO_API_KEY`              | 如部署环境使用豆包兼容命名，可作为对应密钥变量。  |

### Aliyun Bailian / 通义方向 Web Search 变量

| 变量名                            | 用途                                                    |
| --------------------------------- | ------------------------------------------------------- |
| `ALIYUN_BAILIAN_API_KEY`          | 阿里云百炼 / 通义方向 Web Search 调用密钥，仅后端读取。 |
| `ALIYUN_BAILIAN_API_BASE_URL`     | 阿里云百炼 / 通义方向 API 地址。                        |
| `ALIYUN_BAILIAN_WEB_SEARCH_MODEL` | 阿里云百炼 / 通义方向联网检测使用的模型名称。           |
| `DASHSCOPE_API_KEY`               | 如部署环境使用 DashScope 兼容命名，可作为对应密钥变量。 |
| `QWEN_API_KEY`                    | 如部署环境使用通义兼容命名，可作为对应密钥变量。        |

### 前端可见变量

| 变量名              | 用途                                                                  |
| ------------------- | --------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | 前端访问 API 的基础地址。该变量会进入前端构建产物，不得包含任何密钥。 |

前端不得配置 `KIMI_API_KEY`、`VOLCENGINE_API_KEY`、`ALIYUN_BAILIAN_API_KEY`、`DASHSCOPE_API_KEY`、`QWEN_API_KEY`、`AI_OPENAI_COMPATIBLE_API_KEY` 或其他真实 Provider Key。

## 不能提交到 git 的变量文件

- `.env`
- `.env.production`
- `apps/web/.env.local`
- `apps/web/.env.production`
- 任何包含真实密码、真实域名、真实 API Key 的配置文件
