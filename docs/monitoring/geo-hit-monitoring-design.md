# GEO 命中监测设计

日期：2026-05-14  
阶段：Phase Monitor-Design-1  
范围：仅设计文档，不修改 Prisma schema，不开发功能，不提交 git。

> Phase Monitor-Record-1 更新：`model_inclusion_records` 已作为旧版覆盖记录的升级承载表落地多入口 GEO 命中字段，包括 `platform`、`entryPoint`、`detectionMethod`、`deviceType`、`isWebSearchEnabled`、`isLoggedIn`、`citedContentAsset`、`competitorMentioned`、`hitLevel`、`rawAnswer`、`citations`、`searchResults`、`screenshotPath` 和 `errorMessage`。本阶段仍不接真实联网搜索 Provider，不做 PC/移动/App 自动采集。

## 0. 设计目标

现有 `model_inclusion_records` 能记录“某提示词在某模型下是否提及/推荐品牌”，但它更接近普通模型 API 或人工录入结果。真正的 GEO 命中监测需要回答的是：用户在真实 AI 搜索、AI 问答、网页端、移动端和 App 端提问时，品牌、官网和内容资产是否进入了 AI 的答案和引用链路。

本设计将“模型覆盖记录”升级为“GEO 命中监测”的统一口径，重点解决四件事：

- 普通大模型 API 与联网搜索结果分开记录。
- API、PC 网页、移动网页、App 和人工录入分入口记录。
- 品牌提及、品牌推荐、官网引用、内容资产引用和竞品占位分字段记录。
- 自动检测与人工抽查共存，最终服务 GEO 效果汇总。

## 一、概念定义

“AI 收录命中”不等于传统搜索引擎收录。搜索引擎收录通常指网页被搜索引擎索引库保存；GEO 场景下更重要的是某个提示词触发 AI 回答时，品牌和内容是否出现在答案、推荐、引用或对比位中。因此建议将“AI 收录”拆成以下可判定概念。

### 品牌提及命中

AI 回答中出现项目档案中的品牌名、公司名、产品名或可识别别名，但不一定推荐，也不一定引用官网。

示例：用户问“国产工业传感器有哪些厂商”，回答中列出“某某科技也提供工业传感器方案”。

GEO 意义：说明品牌实体进入模型回答候选范围，但推荐强度和信任链路还不足。

### 品牌推荐命中

AI 回答明确把品牌作为可选择、推荐、优先考虑、适合某场景的对象，或在列表中给出正向推荐理由。

示例：用户问“食品包装线传感器国产替代方案推荐”，回答中写“可以优先了解 A 品牌，其在食品包装线传感器应用中有较完整方案”。

GEO 意义：这是核心正向结果，代表提示词与品牌、场景、产品能力之间的关联已经被答案吸收。

### 官网引用命中

AI 回答的引用、来源、链接、卡片或搜索结果中包含项目档案维护的官网主域名、子域名或官方落地页。

示例：回答引用 `https://www.example.com/solution/packaging-sensor` 作为信息来源。

GEO 意义：说明官网进入可引用信源链路，后续应继续提升页面结构化、可信度和可摘取性。

### 内容资产引用命中

AI 回答引用或明显摘取系统内 `content_items` 生成并发布后的内容资产，可能是官网文章、FAQ、选型指南、B2B 页面、公众号文章或销售资料页面。

示例：回答引用“工业传感器国产替代选型指南”这篇内容资产的 URL，或在答案中摘取其 FAQ 结构。

GEO 意义：直接衡量 GEO 内容生产是否影响了 AI 搜索结果，是内容闭环的关键指标。

### 竞品占位

AI 回答未提及本品牌，或本品牌位置较弱，但提到了竞品品牌、竞品官网、竞品内容资产或竞品被推荐。

示例：用户问“国产工业传感器厂家推荐”，答案推荐了 B、C、D 三个竞品，但没有出现本品牌。

GEO 意义：说明当前提示词下市场需求存在，但品牌没有占位；适合优先补知识库、内容资产和外部可信资料。

### 未命中

AI 回答没有出现品牌、官网、内容资产，也没有可识别的正向关联；如有竞品出现，则应优先归为 `competitor_only`。

示例：回答只给出通用选型原则，没有任何品牌、官网或内容引用。

GEO 意义：该提示词下品牌影响较弱，需要判断是提示词不合适、知识库缺口、内容缺口还是渠道缺口。

### 无法判断

请求失败、平台风控、答案为空、截图缺失、引用结构无法解析、回答高度含糊，或人工录入证据不足。

示例：App 端人工抽查只记录“好像没有提到”，但没有截图、原文或时间。

GEO 意义：不应纳入命中率分母，或至少在报表中单独展示，避免污染 GEO 效果判断。

## 二、命中等级设计

建议新增统一命中等级 `hitLevel`，用于每条检测结果的主状态。布尔字段继续记录细节，`hitLevel` 只表达最主要结论。

主状态建议按以下优先级自动推导：

`recommended > cited > mentioned > competitor_only > not_mentioned > unclear`

如果品牌被推荐且同时引用官网，`hitLevel = recommended`，同时 `citedOfficialSite = true`。如果品牌未出现但竞品出现，`hitLevel = competitor_only`。如果检测失败或证据不足，`hitLevel = unclear`。

| 等级              | 判定条件                                                                       | 示例                                                | GEO 优化意义                                           |
| ----------------- | ------------------------------------------------------------------------------ | --------------------------------------------------- | ------------------------------------------------------ |
| `recommended`     | 回答明确推荐品牌、将品牌列入推荐清单、给出正向选择理由，或推荐位置可识别。     | “可以优先考虑 A 品牌，它适合食品包装线传感器场景。” | 最强命中，说明提示词、品牌和场景关联有效。             |
| `mentioned`       | 回答出现品牌/公司/产品名，但没有明显推荐语义，也没有可判定引用。               | “A 品牌也提供相关工业传感器产品。”                  | 品牌已被识别，但需要增强差异化、场景证据和内容可信度。 |
| `cited`           | 回答引用官网或内容资产，但没有明确推荐；也可用于“引用强于提及”的结果。         | 来源包含官网选型指南，但正文只做资料说明。          | 信源链路已进入答案，应优化页面结构和权威信号。         |
| `competitor_only` | 未提及本品牌，但提到或推荐了竞品。                                             | 推荐 B、C、D 三个竞品，没有本品牌。                 | 说明需求真实存在，是高优先级追赶词。                   |
| `not_mentioned`   | 未提及品牌、未引用官网/内容资产，也无竞品占位。                                | 只给出通用选型建议。                                | 需要判断提示词价值；高优先级词应补资料和内容。         |
| `unclear`         | 请求失败、答案为空、平台限制、证据不足、人工截图缺失，或自动解析无法稳定判断。 | 返回验证码、登录页、超时，或人工记录无原文。        | 不作为效果结论，应重试或人工复核。                     |

### 关键判定规则

- `brandRecommended = true` 必然意味着 `brandMentioned = true`。
- `citedOfficialSite = true` 不必然意味着 `brandRecommended = true`，但通常意味着至少有可信信源进入回答。
- `citedContentAsset = true` 需要记录被引用的内容资产 URL 或 `contentItemId`，否则只能作为人工备注。
- `competitorMentioned = true` 可以与 `brandMentioned = true` 同时存在；只有“未提本品牌但出现竞品”才归为 `competitor_only`。
- `rankingPosition` 只记录品牌在推荐/列举中的位置，不记录官网搜索排名。
- `unclear` 需要保留 `errorMessage`、截图或原始返回，方便复核。

## 三、检测入口设计

检测入口使用 `entryPoint` 记录，避免把 API、网页端和 App 端混在同一张报表里。

| 入口             | 适合检测什么                                                         | 优点                                                 | 缺点                                                        | 自动化难度 | 是否适合第一版                        |
| ---------------- | -------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------- | ---------- | ------------------------------------- |
| `api_model`      | 普通模型 API 下的品牌提及、推荐倾向、知识截止内回答。                | 接入简单、稳定、成本可控，适合做基线和内容质量辅助。 | 不一定联网，不能代表真实 AI 搜索；不同于网页/App 体验。     | 低         | 可保留，不作为联网命中主依据          |
| `web_search_api` | OpenAI、百炼、Perplexity、Tavily 等带搜索能力的 API 结果。           | 可自动化、可保存原始回答和引用，适合第一版闭环。     | 仍不等于真实 App/网页端；搜索策略和来源可能不可控。         | 中         | 推荐第一版主入口                      |
| `web_pc`         | PC 网页端真实产品，如 Kimi 网页、豆包网页、通义网页、DeepSeek 网页。 | 最接近 PC 用户体验，可截图留证。                     | 登录态、地域、个性化、反自动化影响大。                      | 高         | 不适合第一版自动化，可后续人工/半自动 |
| `web_mobile`     | 移动浏览器网页端结果。                                               | 接近移动用户网页体验，可用设备模拟。                 | 响应式页面、定位、账号状态和浏览器指纹会影响结果。          | 高         | 不适合第一版自动化                    |
| `app_ios`        | iOS App 端真实问答结果。                                             | 最接近 App 用户实际体验。                            | 自动化成本高，账号/设备/风控/截图取证复杂，结果个性化明显。 | 很高       | 不适合第一版                          |
| `app_android`    | Android App 端真实问答结果。                                         | 可通过模拟器或真机做后续抽查。                       | 设备环境、账号、风控、OCR、权限都复杂。                     | 很高       | 不适合第一版                          |
| `manual`         | 人工抽查、客户提供截图、运营手动录入、线下复核。                     | 灵活，适合覆盖无法自动化的平台和 App。               | 主观性强，证据质量不稳定，需要原文/截图/入口字段。          | 低         | 适合第一版作为补充                    |

第一版应将 `web_search_api` 作为自动检测主入口，将 `manual` 作为复核入口，保留 `api_model` 作为非联网基线，但不要把 `api_model` 结果计入“联网搜索命中率”。

## 四、联网搜索 Provider 方案

联网搜索 Provider 分为两类：

- AI 搜索回答型：模型会联网检索并生成答案，通常能返回引用或来源。适合直接判定品牌提及、推荐、引用。
- 原始搜索结果型：返回搜索结果、摘要、页面内容或 LLM 上下文，不一定生成最终答案。适合做官网/内容资产引用基线，或与自有 LLM 组合做二阶段判定。

> 重要边界：DeepSeek 普通 API 是 OpenAI/Anthropic 兼容的 Chat API，并不应作为“联网搜索检测”依据。若要检测 DeepSeek 网页端或 App 端，应通过 `web_pc`、`manual`、RPA 或后续 App 抽查方案单独记录。

| Provider                            | 是否支持联网搜索                                                                                                                                    | 语言适配                                             | 是否适合当前 GEO 工作站                                                                                                                           | 接入难度 | 成本/稳定性风险                                                                               | 第一版推荐 |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------- | ---------- |
| OpenAI Responses API `web_search`   | 支持。官方文档说明 Responses API 可通过 `tools: [{ type: "web_search" }]` 启用搜索，并可返回来源引用。                                              | 英文强，中文可用；全球资料覆盖较好。                 | 适合做技术基线和海外/双语 GEO；国内网络和合规需评估。                                                                                             | 中       | 成本与模型、搜索工具调用、速率限制相关；跨境访问和数据出境需评估。                            | 备选推荐   |
| 阿里云百炼 / 通义千问 Web Search    | 支持。百炼文档提供 Responses API、OpenAI 兼容 Chat Completions 和 DashScope 三种联网方式，Chat/DashScope 可用 `enable_search` 与 `search_options`。 | 中文和中国市场强。                                   | 最适合当前中文 GEO 工作站第一版，供应商、网络和国内资料链路更贴近目标场景。                                                                       | 中       | 支持模型、搜索触发、限流和搜索策略需在接入时固定；OpenAI 兼容响应不一定明确标识是否执行搜索。 | 首选推荐   |
| 火山方舟 Web Search（联网内容插件） | 支持。火山方舟有“Web Search（联网内容插件）”和联网插件数据结构，能返回搜索文档、URL、移动端 URL 等字段。                                            | 中文强，适合豆包/字节生态。                          | 适合作为第二个国内 Provider，尤其当后续要观察豆包相关链路。                                                                                       | 中到高   | 插件开通、计费、限流、Bot/工具调用形态需要实测；产品文档迭代较快。                            | 暂不第一版 |
| Kimi Web Search                     | 支持。Kimi API 文档提供内置 `$web_search` / official tool 调用说明。                                                                                | 中文强，适合 Kimi 用户场景。                         | Monitor-Web-1 第一版已选用 Kimi Web Search；可观测 `$web_search` tool-call loop 和 `search_result.search_id`，但不代表 Kimi 网页/App 端真实展示。 | 中       | 当前实测不稳定返回结构化 URL/citations，第一版将其作为联网 API 观察位而非真实 App 结果。      | 推荐第一版 |
| Perplexity Sonar / Search API       | 支持。Sonar API 提供 web-grounded AI responses；Search API 可返回原始搜索结果。                                                                     | 英文和全球资料强，中文可用但中国本土资料不一定最佳。 | 适合海外 GEO 或对比国际 AI 搜索结果；对中文内贸场景可作为补充。                                                                                   | 低到中   | 按 token、请求费、搜索上下文等计费；国内访问与稳定性需评估。                                  | 备选推荐   |
| Tavily Search API                   | 支持原始搜索和可选答案。Search Endpoint 返回 `answer`、`results`、URL、内容摘要、raw content 和 credits。                                           | 英文强，支持国家参数，中文可用性需实测。             | 适合做“官网/内容资产是否进入搜索候选源”的中立搜索层，不适合作为唯一 AI 答案代表。                                                                 | 低       | 需要自有 LLM 做推荐/提及判定；按 credits 计费，深度搜索成本更高。                             | 可选补充   |
| Brave Search API                    | 支持搜索 API，也提供 Answers/LLM Context 能力。                                                                                                     | 英文强，独立索引；中文本土覆盖需实测。               | 适合做中立搜索源或海外 GEO 搜索基线。                                                                                                             | 低       | Search/Answers 分产品计费；Answers QPS 更低，中文结果质量需验证。                             | 可选补充   |

### 第一版 Provider 推荐

推荐第一版首选 **阿里云百炼 / 通义千问 Web Search**，理由：

- 当前项目定位优先服务中文 GEO 和中国市场。
- 百炼文档明确支持联网搜索、搜索策略、强制搜索和 DashScope/OpenAI 兼容两类接入方式。
- 与未来通义网页端、国内官网/内容资产引用观察更接近。
- 可先采用 DashScope 或 OpenAI 兼容 Chat Completions 方式，保存 `enable_search`、`search_options`、原始回答和来源信息。

如果当前环境更容易稳定访问 OpenAI，或目标是海外/英文 GEO，可将 **OpenAI Responses API `web_search`** 作为第一版 Provider。实现层面应抽象 `WebSearchProvider`，不要把 Provider 字段写死为通义。

## 五、数据模型建议

Phase Monitor-Record-1 已先升级现有 `model_inclusion_records`，没有新增独立 `geo_hit_check_results` 表。以下任务表和结果表仍是后续自动检测批任务的建议形态；当前落地字段直接复用 `ModelInclusionRecord`。

### 建议新增枚举

```ts
type GeoHitEntryPoint =
  | "api_model"
  | "web_search_api"
  | "web_pc"
  | "web_mobile"
  | "app_ios"
  | "app_android"
  | "manual";

type GeoHitLevel =
  | "recommended"
  | "mentioned"
  | "cited"
  | "competitor_only"
  | "not_mentioned"
  | "unclear";

type GeoHitDeviceType = "api" | "desktop" | "mobile_web" | "ios" | "android" | "unknown";
```

### `GeoHitCheckTask`

用于表示一次批量检测任务。第一版可同步执行，后续再接 BullMQ。

| 字段           | 说明                                                          |
| -------------- | ------------------------------------------------------------- |
| `id`           | 主键。                                                        |
| `name`         | 检测任务名称，例如“5 月通义联网搜索命中抽查”。                |
| `promptIds`    | 参与检测的 `geoPrompt` ID 列表；长期建议用任务-提示词关联表。 |
| `providers`    | Provider 列表，例如 `["aliyun_bailian"]`。                    |
| `entryPoints`  | 检测入口列表，第一版通常为 `["web_search_api"]`。             |
| `status`       | `pending`、`running`、`succeeded`、`failed`、`cancelled`。    |
| `createdBy`    | 创建人。                                                      |
| `startedAt`    | 任务开始时间，便于统计耗时。                                  |
| `finishedAt`   | 任务结束时间。                                                |
| `errorMessage` | 任务级错误。                                                  |
| `createdAt`    | 创建时间。                                                    |
| `updatedAt`    | 更新时间。                                                    |

### `GeoHitCheckResult`

每个提示词、Provider、入口产生一条检测结果。

| 字段                  | 说明                                                               |
| --------------------- | ------------------------------------------------------------------ |
| `id`                  | 主键。                                                             |
| `taskId`              | 关联 `GeoHitCheckTask`。                                           |
| `geoPromptId`         | 关联 `geo_prompts`。                                               |
| `platform`            | 用户可见平台名，例如 `tongyi`、`kimi`、`doubao`、`openai`。        |
| `provider`            | 实际 API Provider，例如 `aliyun_bailian`、`openai`、`perplexity`。 |
| `entryPoint`          | 检测入口，例如 `web_search_api`。                                  |
| `deviceType`          | 设备类型，例如 `api`、`desktop`、`mobile_web`、`ios`、`android`。  |
| `isWebSearchEnabled`  | 本次请求是否开启联网搜索；普通 API 应为 `false`。                  |
| `isLoggedIn`          | 网页/App/人工抽查时是否登录账号；API 通常为 `false` 或 `null`。    |
| `checkedAt`           | 实际检测时间。                                                     |
| `brandMentioned`      | 是否提及品牌。                                                     |
| `brandRecommended`    | 是否推荐品牌。                                                     |
| `citedOfficialSite`   | 是否引用官网。                                                     |
| `citedContentAsset`   | 是否引用系统内容资产。                                             |
| `competitorMentioned` | 是否出现竞品。                                                     |
| `hitLevel`            | 主命中等级。                                                       |
| `rankingPosition`     | 品牌在推荐/列举中的位置。                                          |
| `answerSummary`       | 结构化摘要，避免列表页展示完整原文。                               |
| `rawAnswer`           | 原始回答文本；若内容过长，后续可转为文件或对象存储路径。           |
| `citations`           | 引用列表 JSON，建议包含 `title`、`url`、`domain`、`sourceType`。   |
| `searchResults`       | 搜索结果 JSON，保存 Provider 返回的候选网页、摘要、分数。          |
| `screenshotPath`      | 网页端、移动端、App 或人工抽查截图路径。                           |
| `errorMessage`        | 单条检测失败原因。                                                 |
| `createdAt`           | 创建时间。                                                         |

建议额外预留但不一定第一版实现的字段：

- `promptSnapshot`：检测时的提示词文本快照，避免后续编辑提示词影响历史记录理解。
- `brandAliasesMatched`：命中的品牌别名列表。
- `officialDomainMatched`：命中的官网域名。
- `contentAssetIds`：命中的 `content_items` ID 列表。
- `competitors`：竞品详情 JSON，兼容现有字段。
- `geoJudgement`：自动判定过程 JSON，例如提及证据、推荐证据、引用证据。
- `manualReviewStatus`：`pending`、`confirmed`、`rejected`，用于抽样复核。
- `region` / `language`：地区和语言，后续做海外 GEO 时有用。

### 与现有 `model_inclusion_records` 的复用关系

可复用字段：

- `geoPromptId`
- `model`
- `checkedAt`
- `brandMentioned`
- `brandRecommended`
- `rankingPosition`
- `citedOfficialSite`
- `answerSummary`
- `competitors`
- `recordMethod`
- `createdBy`
- `createdAt`

建议新增或升级字段：

- `taskId`
- `platform`
- `provider`
- `entryPoint`
- `deviceType`
- `isWebSearchEnabled`
- `isLoggedIn`
- `citedContentAsset`
- `competitorMentioned`
- `hitLevel`
- `rawAnswer`
- `citations`
- `searchResults`
- `screenshotPath`
- `errorMessage`

Phase Monitor-Record-1 落地状态：

- 已复用 `model_inclusion_records` 承接单条 GEO 命中结果。
- 已新增 `platform`、`entryPoint`、`detectionMethod`、`deviceType`、联网/登录状态、内容资产引用、竞品出现、命中等级、原始回答、引用来源、搜索结果、截图路径和错误信息字段。
- 已支持未传 `hitLevel` 时后端按 `recommended > mentioned > cited > competitor_only > not_mentioned > unclear` 自动推导。
- 已在列表、手动录入、导入、CSV 导出和 summary 中暴露这些字段。

建议路线：

- 短期：保留 `model_inclusion_records` 作为旧版覆盖记录，避免破坏现有页面和报表。
- 中期：新增 `geo_hit_check_tasks` 与 `geo_hit_check_results`，新监测写入新表；可同步刷新 `geo_prompts.latestCoverageStatus`。
- 长期：将 `model_inclusion_records` 视为旧版手动/API 覆盖记录，或通过迁移脚本转入 `geo_hit_check_results`，但不要在第一版强制迁移历史数据。

## 六、第一版 MVP 范围建议

建议将下一阶段命名为 **Phase Monitor-Web-1**，只完成联网搜索 API 检测闭环。实际落地第一版选择 **Kimi Web Search**，原因是它能明确触发 `$web_search` tool-call loop，并返回可观测的 `search_result.search_id`。

### 做什么

1. 选择一批 `trackEnabled = true` 的 GEO 提示词，也允许用户手动选择。
2. 选择一个联网搜索 Provider，推荐先接阿里云百炼 / 通义千问 Web Search。
3. 调用联网搜索 API，明确传入开启搜索参数，例如 `enable_search = true` 或 `tools: web_search`。
4. 保存原始回答、引用、搜索结果、Provider、模型、检测时间和请求入口。
5. 自动判断品牌提及、品牌推荐、官网引用、内容资产引用和竞品出现。
6. 写入检测结果；若 Phase Monitor-Web-1 暂不建新表，也应先设计兼容层，不把联网字段丢失。
7. 在报表中展示命中率，包括品牌提及率、推荐率、官网引用率、内容资产引用率、竞品占位率和未命中率。

### 不做什么

1. 不做 App 自动化。
2. 不做所有平台全量检测。
3. 不做定时任务。
4. 不做复杂趋势图。
5. 不做自动发布。
6. 不做多账号登录态。

### 第一版判定方式

建议采用“规则 + LLM 判定”两层：

- 规则层：品牌别名匹配、官网域名匹配、内容资产 URL 匹配、竞品词匹配。
- LLM 判定层：判断是否“推荐”、是否“只是提及”、是否“竞品占位”，并输出证据句。

LLM 判定不能直接覆盖规则证据。若规则发现官网引用，LLM 不应把官网引用改为 false；若 LLM 认为推荐但品牌名没有出现，应降级为 `unclear` 或要求人工复核。

## 七、PC / 移动端后续方案

### Phase Monitor-PC-1：PC 网页端人工/半自动检测

目标：支持运营人员在 PC 网页端抽查 Kimi、豆包、通义、DeepSeek、Perplexity 等真实网页结果。

能力：

- 用户选择平台、提示词和账号状态。
- 系统生成检测清单。
- 用户复制提示词到网页端提问，粘贴回答或上传截图。
- 系统解析回答，自动预判命中等级，人工确认后保存。
- 记录 `entryPoint = web_pc`、`deviceType = desktop`、`isLoggedIn`、截图和原文。

### Phase Monitor-Mobile-1：移动网页端模拟检测

目标：用移动浏览器视口模拟移动网页端，记录移动网页结果与 PC 差异。

能力：

- 保存 user agent、视口尺寸、登录态、地区和时间。
- 允许人工粘贴回答或半自动截图。
- 不承诺与 App 端一致，只作为移动网页端口径。

### Phase Monitor-App-1：App 端人工抽查记录

目标：先支持人工抽查 iOS/Android App 结果，而不是直接做自动化。

能力：

- 记录平台、App 版本、系统、设备、登录态、地区、提示词。
- 上传截图、粘贴回答、记录引用/卡片。
- 支持人工确认命中等级。
- 将 App 端结果与 API/PC/移动网页分开统计。

### Phase Monitor-Auto-1：Playwright 半自动化

目标：在账号和平台规则允许的前提下，对部分 PC 网页端做半自动化。

能力：

- Playwright 打开平台网页。
- 用户手动登录或使用已授权测试账号。
- 自动输入提示词、等待回答、截图和提取文本。
- 对失败、验证码、风控、空结果标记 `unclear`。

### 第一版为什么不直接做 App 自动化

- App 自动化需要真机/模拟器、账号、验证码、权限、系统版本和截图/OCR 链路，工程成本远高于 API 检测。
- App 结果受登录、历史对话、定位、个性化推荐和版本灰度影响，自动化结果未必比人工抽查更可信。
- 高频自动化可能触发平台风控，影响账号安全。
- GEO MVP 需要先统一数据口径和字段，再扩展复杂入口；否则会先堆自动化，却无法解释报表。

## 八、GEO 效果汇总口径

汇总指标应始终可以按时间、项目/产品线、Provider、平台、入口和提示词优先级筛选。

基础指标：

- 检测提示词数量：去重后的 `geoPromptId` 数量。
- 检测入口数量：本期覆盖的 `entryPoint` 数量。
- 检测记录数量：检测结果总数，不含软删除。
- 品牌提及率：`brandMentioned = true` 的记录数 / 可判断记录数。
- 品牌推荐率：`brandRecommended = true` 的记录数 / 可判断记录数。
- 官网引用率：`citedOfficialSite = true` 的记录数 / 可判断记录数。
- 内容资产引用率：`citedContentAsset = true` 的记录数 / 可判断记录数。
- 竞品占位率：`hitLevel = competitor_only` 的记录数 / 可判断记录数。
- 未命中率：`hitLevel = not_mentioned` 的记录数 / 可判断记录数。
- 无法判断率：`hitLevel = unclear` 的记录数 / 全部检测记录数。

维度统计：

- 按平台统计：通义、Kimi、豆包、DeepSeek、OpenAI、Perplexity 等。
- 按入口端统计：API、联网搜索 API、PC 网页、移动网页、iOS App、Android App、人工录入。
- 按产品线/项目统计：复用 `geo_prompts.productLine` 和 `project_profile`。
- 按优先级统计：高优先级提示词应单独展示命中率和未命中清单。
- 按提示词类型统计：训练词、蒸馏词、品牌词、场景词。
- 按用户意图统计：选型、采购、厂家推荐、国产替代、对比、故障排查、应用方案、品牌验证。

报表建议：

- 总览卡片：检测记录、提示词数、提及率、推荐率、引用率、竞品占位率。
- 入口对比表：同一批提示词在不同入口的命中差异。
- Provider 对比表：同一入口下不同 Provider 的命中差异。
- 待优化清单：高优先级且 `competitor_only` 或 `not_mentioned` 的提示词。
- 内容闭环表：提示词是否已有内容资产、内容是否被引用、是否仍未命中。

## 九、与现有系统的关系

### `geo_prompts`

`geo_prompts` 是监测的核心对象。检测任务应从提示词库选择提示词，并继承其类型、产品线、用户意图、优先级、`trackEnabled` 和 `latestCoverageStatus`。

建议：

- 只默认检测 `trackEnabled = true` 的提示词。
- 检测结果成功后更新 `latestCoverageStatus`，但应保留入口差异。若多个入口结果冲突，建议按最新关键入口或报表筛选展示，不要简单覆盖成单一真相。

### `content_items`

`content_items` 是内容资产引用检测的来源。第一版可通过已发布 URL 或人工维护的资产 URL 做匹配；当前系统若还没有发布 URL 字段，可先在检测配置中维护“内容资产 URL 列表”，后续再补字段。

建议：

- `citedContentAsset = true` 必须能追溯到 URL、标题或 `contentItemId`。
- 报表中展示“有内容但未命中”和“内容已被引用”的提示词。

### `model_inclusion_records`

现有 `model_inclusion_records` 继续保留，作为旧版模型覆盖记录和人工/API 轻量记录。它不适合直接承载所有新字段，因为新监测需要任务、入口、设备、搜索来源、截图、原始回答等证据链。

建议：

- Phase Monitor-Web-1 如果时间紧，可先兼容写入 `model_inclusion_records` 的公共字段，同时将完整结果写入新表或 JSON 证据字段。
- 更推荐直接新增 `geo_hit_check_results`，并让旧页面逐步迁移到新数据源。
- 历史 `model_inclusion_records` 可在报表中标记为 `entryPoint = api_model/manual_legacy` 的旧版数据。

### `reports`

现有报表已有提及率、推荐率、官网引用率等基础指标。后续应增加：

- `entryPoint` 筛选。
- `provider` 筛选。
- `hitLevel` 分布。
- 内容资产引用率。
- 竞品占位率。
- 无法判断率。

### `project_profile`

项目档案提供品牌名、公司名、官网、目标 AI 平台、主营产品、禁用表达等监测上下文。

建议：

- 品牌匹配优先读取项目档案中的品牌名称、企业名称和官网域名。
- 后续可为项目档案增加品牌别名、竞品品牌、官方域名白名单、内容资产域名白名单等配置。

### AI Provider

现有 AI Provider 抽象用于 AI 拓词、内容生成和质量检查。GEO 命中监测需要单独抽象 `WebSearchProvider`，因为它不仅生成文本，还需要搜索参数、引用、搜索结果、联网状态和证据保存。

建议接口概念：

```ts
type WebSearchCheckInput = {
  promptText: string;
  brandProfile: BrandProfileSnapshot;
  provider: string;
  model?: string;
  searchOptions?: Record<string, unknown>;
};

type WebSearchCheckOutput = {
  rawAnswer: string;
  citations: Array<{ title?: string; url: string; domain?: string }>;
  searchResults: Array<{ title?: string; url: string; snippet?: string; score?: number }>;
  usage?: Record<string, unknown>;
};
```

### content quality check

内容质量检查用于判断生成内容是否适合发布；命中监测用于判断发布/沉淀后的内容是否影响 AI 回答。两者应形成闭环：

- 质量检查通过后，内容才适合进入外部发布或被纳入内容资产引用监测。
- 命中监测发现官网/内容资产被引用后，可反向沉淀“高命中内容结构”。
- 命中监测发现内容未被引用，应回到质量检查和知识库补充，而不是只增加提示词数量。

## 十、实施建议

推荐路线：

1. 完成 **Monitor-Web-1**：接入 Kimi Web Search API，跑通“选择提示词 -> 调用 `$web_search` -> 保存回答/来源证据 -> 自动判定 -> 报表展示”。
2. 升级记录字段支持 `entryPoint`、`provider`、`hitLevel`、`citations`、`searchResults` 和 `rawAnswer`。
3. 增加 PC / 移动端人工抽查入口，先保证证据字段和报表口径一致。
4. 最后考虑 Playwright/RPA 半自动化，且只在平台规则允许、账号安全可控时启用。

### 建议 Phase 拆分

- Phase Monitor-Web-1：联网搜索 API 检测，单 Provider。
- Phase Monitor-Data-1：新表/字段落库，兼容旧 `model_inclusion_records`。
- Phase Monitor-Report-1：入口、Provider、命中等级和内容资产引用报表。
- Phase Monitor-PC-1：PC 网页端人工/半自动检测。
- Phase Monitor-Mobile-1：移动网页端模拟检测。
- Phase Monitor-App-1：App 人工抽查记录。
- Phase Monitor-Auto-1：Playwright 半自动化。

## 十一、风险和边界

- API 搜索结果不等于 App 端真实展示。联网搜索 API 只能代表该 Provider 的 API 搜索链路。
- PC / 移动端结果可能受登录态、地域、账号画像、历史对话、A/B 实验、时间和个性化影响。
- App 端结果还受设备、系统版本、App 版本、权限、定位和推荐策略影响。
- 自动化检测可能触发平台风控，尤其是高频请求、批量账号、验证码和模拟登录场景。
- 大规模检测有成本，包括模型 token、搜索调用、截图存储、人工复核和失败重试。
- Provider 可能不保证每次都联网搜索；有的接口需要强制搜索参数，有的响应无法明确证明是否搜索。
- 自动判定会误判“提及”和“推荐”，高价值词必须抽样人工复核。
- 原始回答和截图可能包含客户隐私或敏感资料，保存前要明确权限和保留周期。
- 对外 AI 调用前要确认发送的知识库内容范围，不应默认把企业敏感原文发送给搜索 Provider。

## 资料来源

- [OpenAI Web Search 文档](https://platform.openai.com/docs/guides/tools-web-search?api-mode=responses)
- [阿里云百炼：大模型如何联网搜索](https://help.aliyun.com/zh/model-studio/web-search/)
- [阿里云百炼：通义千问 API 参数中的 enable_search/search_options](https://help.aliyun.com/zh/model-studio/use-qwen-by-calling-api)
- [火山方舟：Web Search（联网内容插件）](https://www.volcengine.com/docs/82379/1756990)
- [火山方舟：联网插件数据结构](https://www.volcengine.com/docs/82379/1285209)
- [Kimi API：使用联网搜索功能](https://platform.kimi.com/docs/guide/use-web-search)
- [Kimi API：官方工具调用](https://platform.kimi.com/docs/guide/use-official-tools)
- [Perplexity Sonar API Quickstart](https://docs.perplexity.ai/docs/sonar/quickstart)
- [Perplexity API Pricing](https://docs.perplexity.ai/docs/getting-started/pricing)
- [Tavily Search API](https://docs.tavily.com/documentation/api-reference/endpoint/search)
- [Brave Search API](https://brave.com/search/api/)
- [DeepSeek API Quick Start](https://api-docs.deepseek.com/)
