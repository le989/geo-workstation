# UI-REDESIGN-HOME-LOGIN-1 首页登录页重设计报告

## 1. 阶段目标

本阶段按 Gemini UI 方向统一首页 `/` 和登录页 `/login`，让入口页与后台工作台保持一致的极简、扁平、企业级 SaaS 风格。

本阶段只做前端视觉、排版和信息层级调整，不改认证逻辑、登录 API、权限、数据库或后台主流程页面。

## 2. 当前项目状态

- 当前分支：feat/ui-redesign-home-login-1
- 当前提交：a0095ad
- `.env` 数据库：geo_workstation_aqa_chat_local_smoke
- 是否触碰 official：否
- 是否跑 migration / seed / AI：否
- 是否修改 Provider / 权限 / 认证逻辑：否

## 3. Gemini 方案采纳范围

已采纳：

- 极简入口页，避免夸张营销落地页。
- 企业级 SaaS 登录页，双栏布局，右侧登录卡片。
- 冷灰 / 白底 / 克制蓝。
- 小圆角、浅边框、去阴影。
- 降低本地 smoke / API 状态提示的视觉权重。

未采纳：

- 不做大面积插画、暗黑大屏或 AI 紫渐变。
- 不新增营销导航、注册页、找回密码或 OAuth。
- 不改登录 API、token/session、auth store 或路由权限。

## 4. 首页修改清单

- 顶部导航：保留品牌和登录入口，移除复杂导航。
- Hero：改为简洁标题、副标题和两个动作入口。
- 能力概览：从多模块营销卡片压缩为 4 个核心能力：用户问法、产品证据、发布文章、AI 推荐记录。
- 工作流说明：用一条流程表达“问法 → 证据 → 内容 → AI 推荐记录 → 复盘”。
- 底部说明：保留内部 MVP 和 smoke 数据边界提示。

## 5. 登录页修改清单

- 双栏布局：左侧展示产品定位和 3 个能力点，右侧保留登录表单。
- 登录卡片：改为浅边框、小圆角、无厚重阴影。
- 输入框 / 按钮 / 错误提示：保持原有表单绑定和错误提示位置，视觉更紧凑。
- API / smoke 状态：下沉到登录卡片底部，用小号标签展示。
- 删除无实际认证逻辑的“记住我 / 忘记密码”展示，避免误导用户。

## 6. 保留的能力

- 登录逻辑未改。
- 认证 API 未改。
- 权限逻辑未改。
- auth store 未改。
- 后台入口未改。
- smoke 环境未改。
- Dashboard、Help、Settings 页面未改结构。

## 7. 截图与走查

截图路径：

- `tmp/ui-redesign-home-login-1/home-1440.png`
- `tmp/ui-redesign-home-login-1/home-1280.png`
- `tmp/ui-redesign-home-login-1/login-1440.png`
- `tmp/ui-redesign-home-login-1/login-1280.png`
- `tmp/ui-redesign-home-login-1/login-error-state.png`
- `tmp/ui-redesign-home-login-1/dashboard-after-login-1440.png`

走查结果：

- `/`：正常打开，1280 / 1440 无横向溢出。
- `/login`：隔离浏览上下文下正常打开，1280 / 1440 无横向溢出。
- `/login` 错误态：空表单点击只触发前端本地校验“请输入邮箱和密码”，未提交真实账号密码。
- `/dashboard`：正常打开，未受入口页改动影响。
- `/help`：正常打开，无横向溢出。
- `/settings`：正常打开，无横向溢出。
- 以上页面未发现 `undefined/null/NaN`。
- 以上页面未发现控制台红色错误。

## 8. 暂缓项

- 真实 AI 验收准备。
- 正式部署。
- 首页营销化扩展。
- `/style-preview` 深度重做。
- 登录注册、找回密码、OAuth、多租户等新能力。

## 9. 验证结果

- `git diff --check`：通过
- `pnpm --filter @geo-workstation/web typecheck`：通过
- `pnpm --filter @geo-workstation/web lint`：通过
- `pnpm --filter @geo-workstation/api lint`：通过

## 10. 下一步建议

1. `REAL-AI-END-TO-END-VALIDATION-PREP-1`：准备最终真实 AI 端到端验收的授权边界和步骤清单。
2. `LOCAL-FULL-REGRESSION-CHECK-2`：首页 / 登录页重设计后再做一次全站回归。
3. `UI-REDESIGN-FINAL-POLISH-1`：按人工验收反馈做最终视觉微调。

最终真实 AI 端到端验收仍需另开 `REAL-AI-END-TO-END-VALIDATION-1` 阶段，本阶段未执行真实 AI 请求。
