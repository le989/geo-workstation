# 真实 AI 自用流程测试计划

本文档用于记录 Phase 4F 的自用真实流程验证。测试目标不是上线验收，也不是外部 AI 自动检测，而是确认真实 OpenAI-compatible Provider 能服务 GEO 拓词和内容生成。

## 测试目标

- 验证 `provider = openai_compatible` 的 AI 拓词可生成候选词。
- 验证候选词不会自动入库，必须人工勾选保存。
- 验证真实 AI 内容生成能基于提示词、知识库和指令模板产出可编辑内容项。
- 验证失败提示可读，且不会泄露 API Key。
- 验证报表能反映真实导入、生成和人工覆盖记录。

## 测试产品线

| 字段     | 建议值                                                     |
| -------- | ---------------------------------------------------------- |
| 品牌     | 凯基特                                                     |
| 产品线   | 激光测距传感器                                             |
| 关联词   | 光电传感器、接近开关                                       |
| 目标模型 | deepseek-chat 或当前 OpenAI-compatible Provider 支持的模型 |

## 测试提示词

| 类型      | promptText                       | 用户意图                    | 优先级 | 是否追踪 |
| --------- | -------------------------------- | --------------------------- | ------ | -------- |
| base      | 激光测距传感器                   | selection                   | 3      | true     |
| distilled | 激光测距传感器怎么选             | selection                   | 1      | true     |
| distilled | 激光测距传感器厂家推荐           | manufacturer_recommendation | 1      | true     |
| brand     | 凯基特激光测距传感器怎么样       | brand_verification          | 2      | true     |
| scene     | 行车防撞用什么激光测距传感器     | application_solution        | 1      | true     |
| scene     | 料位检测适合用哪种激光测距传感器 | application_solution        | 2      | true     |

## 测试知识库资料

第一轮只需要少量资料，建议每类 1-2 条。

| materialType  | 建议内容                                           |
| ------------- | -------------------------------------------------- |
| product_info  | 产品能力、测距范围、输出方式、防护等级等可公开事实 |
| solution      | 行车防撞、料位检测、定位测距等应用场景             |
| faq           | 用户常问的选型、安装、抗干扰、售后问题             |
| comparison    | 与传统测距方式或竞品方案的对比口径                 |
| qualification | 可公开的资质、认证、行业经验说明                   |

## 测试指令模板

| 模板        | instructionType      | contentType          | 检查重点                           |
| ----------- | -------------------- | -------------------- | ---------------------------------- |
| 选型指南    | selection_guide      | selection_guide      | 是否给出判断标准和选型步骤         |
| FAQ         | faq                  | faq                  | 是否形成问答式、可摘取结构         |
| AI 问答素材 | ai_qa                | qa_material          | 是否面向 AI 回答压缩企业事实       |
| 应用方案    | application_solution | application_solution | 是否连接场景、痛点、方案和注意事项 |

## 测试内容类型

| generationType       | 推荐提示词                   | 推荐指令    |
| -------------------- | ---------------------------- | ----------- |
| selection_guide      | 激光测距传感器怎么选         | 选型指南    |
| faq                  | 凯基特激光测距传感器怎么样   | FAQ         |
| qa_material          | 激光测距传感器厂家推荐       | AI 问答素材 |
| application_solution | 行车防撞用什么激光测距传感器 | 应用方案    |

## 结果记录表格

| 时间 | 页面     | provider          | model | 输入           | 结果 | 是否入库 | 备注 |
| ---- | -------- | ----------------- | ----- | -------------- | ---- | -------- | ---- |
|      | AI 拓词  | openai_compatible |       | 激光测距传感器 |      | 是 / 否  |      |
|      | AI 拓词  | openai_compatible |       | 光电传感器     |      | 是 / 否  |      |
|      | 内容生成 | openai_compatible |       | 选型指南       |      | 是 / 否  |      |
|      | 内容生成 | openai_compatible |       | FAQ            |      | 是 / 否  |      |

## 问题记录表格

| 时间 | 模块     | 问题 | 影响 | 临时处理 | 后续建议 |
| ---- | -------- | ---- | ---- | -------- | -------- |
|      | AI 拓词  |      |      |          |          |
|      | 内容生成 |      |      |          |          |
|      | 知识库   |      |      |          |          |
|      | 报表     |      |      |          |          |

## 验证清单

- [ ] `.env` 已配置真实 `AI_OPENAI_COMPATIBLE_API_KEY`，但未提交。
- [ ] 后端已重启。
- [ ] `/login` 可登录。
- [ ] `/expansion` 使用 `openai_compatible` 生成候选词。
- [ ] 候选词不会自动进入提示词库。
- [ ] 勾选保存后能在 `/geo-prompts` 查询到。
- [ ] `/knowledge-bases` 有真实知识片段。
- [ ] `/instruction-templates` 有至少 4 个真实指令模板。
- [ ] `/content-tasks` 使用 `openai_compatible` 生成内容。
- [ ] 内容项可编辑并导出 Markdown。
- [ ] 失败时错误提示可读。
- [ ] `/model-inclusion-records` 可人工录入真实查询结果。
- [ ] `/reports` 能看到数据变化。

## 后续优化建议

| 方向     | 建议                                                           |
| -------- | -------------------------------------------------------------- |
| Prompt   | 为不同 `generationType` 建立更稳定的系统提示词和输出 JSON 约束 |
| 指令模板 | 沉淀选型指南、FAQ、应用方案的高质量模板                        |
| 知识库   | 补齐参数、应用、案例、FAQ 和可公开资质                         |
| 内容审核 | 增加人工审核字段或发布状态                                     |
| 报表     | 把真实 AI 内容质量和模型覆盖记录关联起来                       |
| 自动检测 | 等自用内容质量稳定后，再进入外部 AI 检测自动化                 |
