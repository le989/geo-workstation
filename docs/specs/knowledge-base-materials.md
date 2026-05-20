# KB-1 企业知识库资料分类与手动录入

## 第一版范围

KB-1 将企业知识库从普通文件库升级为可治理的 GEO 资料底座。

- 资料记录支持标题、资料类型、适用模块、来源说明、可信度、审核状态。
- 文件上传支持 `txt`、`md`、`csv`、Excel（`xls` / `xlsx`）和 Word（`docx`）。
- 手动录入资料会生成一条资料记录，并同步生成知识片段。
- 文件和手动资料默认 `reviewStatus=pending`，管理员可以设置 `approved` 或 `disabled`。
- 文件列表支持按资料类型、审核状态、可信度、适用模块筛选。
- 片段内容继续支持编辑；`viewer` 仍然只读。
- `storagePath` 仍只保存在后端，不返回前端。

## 资料类型

资料类型挂在 `KnowledgeFile.materialType` 上，知识片段保留现有 `KnowledgeChunk.materialType` 字符串以兼容旧数据。

- `product_material`：产品资料
- `aftersales_material`：售后资料
- `company_trust_material`：公司可信信息
- `content_reference_material`：内容引用资料
- `internal_process_material`：内部制度 / 流程资料
- `customer_case_material`：客户案例资料

旧文件默认归入 `content_reference_material`。旧片段里的 `faq`、`product_info` 等历史值继续展示，不强制迁移。

## 审核状态

- `pending`：待审核，新上传和手动录入默认值。
- `approved`：已通过，后续售后问答检索只应使用该状态。
- `disabled`：已停用，后续检索不应使用。

`platform_admin` 和 `company_admin` 可以管理审核状态。`operator` 可以按原角色策略上传或手动录入资料，但不能直接把资料设为已通过或已停用。

当前 KB-1 阶段仅为后续检索和售后问答预留审核状态；GEO 内容生成暂未强制限定只使用 `approved` 资料，后续接入引用检索时再统一收口。

## 手动录入

手动录入入口位于知识库详情的“新增资料”页签。

流程：

1. 选择知识库。
2. 填写资料标题、资料类型、适用模块、来源说明、可信度、审核状态。
3. 输入正文内容。
4. 保存后创建 `sourceType=manual`、`fileType=manual` 的资料记录。
5. 同步生成一个知识片段，可在片段列表继续编辑。

手动录入不写 `storagePath`，也不模拟真实上传文件。

## 文件上传元信息

文件上传入口支持在上传时填写：

- 资料标题
- 资料类型
- 适用模块
- 来源说明
- 可信度
- 审核状态
- 售后资料可见部门

旧上传调用仍可只传文件；后端会补默认元信息并保持统一响应 `{ code, message, data }`。

## 售后资料访问限制

第一版只对 `aftersales_material` 启用部门可见性限制。

- 非售后资料默认按原知识库可见性内部可见。
- 售后资料可配置 `allowedDepartmentIds`。
- `platform_admin` / `company_admin` 不受售后资料部门限制。
- `operator` / `viewer` 访问售后资料时，必须属于允许且启用中的部门；部门停用后不再授予售后资料访问权。
- 跨公司部门 ID 会被后端拒绝。
- 旧 `text-import` 兼容片段如果没有关联资料记录且自身标记为 `aftersales_material`，普通用户默认不可见，避免绕过 `allowedDepartmentIds`。
- 本限制不影响 DEPT-1 的模块入口权限；两者是叠加关系。

## 片段编辑

上传解析和手动录入生成的片段都可编辑正文内容。

- 更新片段不会改变 `companyId`、`knowledgeBaseId`、`fileId`。
- `viewer` 不允许编辑或删除片段。
- 售后资料下的片段列表会继承资料记录的部门可见性。
- `disabled` 资料默认不参与后续检索；片段是否可编辑仍按现有角色写权限和售后资料访问限制判断。

## 第一版不做

- 不做 PDF。
- 不做 OCR。
- 不做售后问答聊天框。
- 不接真实 AI Provider。
- 不做 token 统计。
- 不做操作日志。
- 不做自动纠错写入知识库。
- 不做复杂审批流。
- 不做产品线级权限。

## 验收方式

写入验收只使用 `geo_workstation_crud_smoke`，不要使用 `geo_workstation_clean`。

建议命令：

```bash
DATABASE_URL="<geo_workstation_crud_smoke>" pnpm --filter @geo-workstation/api prisma:migrate:deploy
DATABASE_URL="<geo_workstation_crud_smoke>" pnpm --filter @geo-workstation/api exec vitest run test/knowledge-file-parser.service.spec.ts test/knowledge-files.service.spec.ts
DATABASE_URL="<geo_workstation_crud_smoke>" JWT_SECRET="<test-secret>" BYPASS_AUTH_FOR_TESTS=true pnpm --filter @geo-workstation/api exec vitest run test/knowledge-files.controller.spec.ts
pnpm --filter @geo-workstation/web typecheck
pnpm --filter @geo-workstation/web build
```

不要运行 `api test:auth`、`api test:users`、`api test:api`。
