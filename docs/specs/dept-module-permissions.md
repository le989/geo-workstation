# DEPT-1 部门管理与模块访问权限底座

## 第一版范围

DEPT-1 新增公司内部门管理、用户绑定部门、部门模块访问权限三部分能力。

- 一个用户在一个公司内只属于一个部门，`Membership.departmentId` 可为空以兼容旧数据。
- 部门支持新增、编辑名称/编码、启用和停用，不做物理删除。
- 部门权限只控制成员能不能进入模块。
- 当前登录用户信息返回所属部门和可访问模块列表。
- 前端菜单会按可访问模块隐藏，后端 API 也会按模块做基础拦截。

## 不做范围

- 不做按钮级权限。
- 不做字段级权限。
- 不做多级部门。
- 不做一个用户多个部门。
- 不做知识库权限。
- 不做售后问答。
- 不做 token 统计。
- 不做操作日志。

## 角色权限关系

角色权限仍然控制写入能力，部门权限只控制模块入口。

- `platform_admin` 不受部门模块权限限制，可访问全部模块，可管理部门和权限。
- `company_admin` 默认可访问本公司全部模块，可管理本公司部门和模块权限，避免配置错误导致管理员被锁死。
- `operator` 受部门模块权限控制；没有所属部门时仅允许 `dashboard` 和 `help`。
- `viewer` 受部门模块权限控制，但仍保持只读；即使部门允许模块，也不会获得写入能力。

停用部门后，绑定在该部门的 `operator` / `viewer` 按无部门策略处理，仅保留 `dashboard` 和 `help`。

## 模块权限列表

正式模块：

- `dashboard`
- `geo-analysis`
- `geo-prompts`
- `expansion`
- `knowledge-bases`
- `instruction-templates`
- `geo-content`
- `model-inclusion-records`
- `geo-reports`
- `users`
- `settings`
- `help`
- `companies`
- `product-lines`

新增和预留模块：

- `departments`
- `aftersales-qa`
- `feedback-center`
- `usage-analytics`
- `operation-logs`

其中 `companies`、`product-lines` 当前是系统设置里的子能力，不是独立前端路由；后端 API 仍保留独立 moduleKey 以便后续细分。

## 验收方式

专项验收使用新增测试：

```bash
DATABASE_URL="<geo_workstation_crud_smoke>" JWT_SECRET="<test-secret>" BYPASS_AUTH_FOR_TESTS=false pnpm exec vitest run test/departments.controller.spec.ts
```

覆盖点：

- `company_admin` 可以新增、编辑、停用部门。
- `company_admin` 可以保存和读取部门模块权限。
- `operator` 绑定部门后只能访问被允许的模块。
- `operator` 直接访问未授权模块 API 会被 403 拦截。
- 无部门 `operator` 仅有 `dashboard` / `help`。
- `viewer` 即使获得模块入口，也不能执行写入操作。
- `platform_admin` / `company_admin` 不会被部门权限锁死。
- 部门和权限按 `companyId` 隔离。

## 数据库边界

写入验收必须使用 `geo_workstation_crud_smoke`。不要在 `geo_workstation_clean` 上跑会写库的测试，也不要运行 `api test:auth`、`api test:users`、`api test:api`。
