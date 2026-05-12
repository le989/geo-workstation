# GEO Marketing Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable GEO marketing operations MVP that follows the loop: GEO diagnosis -> prompt strategy -> enterprise GEO knowledge base -> GEO content generation -> model inclusion records -> optimization reports.

**Architecture:** Use a TypeScript monorepo with a Vue 3 frontend, NestJS backend, PostgreSQL data layer, Prisma ORM, Redis + BullMQ async jobs, local file storage, and an AI Provider abstraction starting with DeepSeek. Each phase must leave the system runnable and checkable before the next phase starts.

**Tech Stack:** Vue 3, Vite, TypeScript, Element Plus, NestJS, PostgreSQL, Prisma, Redis, BullMQ, local file storage, DeepSeek Provider.

---

## Source Documents

- Primary instructions: `AGENTS.md`.
- Product spec: `docs/specs/geo-marketing-platform-spec.md`.
- During Phase 0, the root spec file was moved to the canonical `docs/specs/` path.
- This plan intentionally does not implement code. It describes the execution sequence and stops for confirmation.

## Execution Principles

- Do one phase at a time. Do not attempt to complete the whole platform in one pass.
- Every phase must end with a running app or a verifiable artifact.
- Naming must express GEO business meaning first: `geoAnalysisTask`, `geoPrompt`, `knowledgeBase`, `knowledgeChunk`, `instructionTemplate`, `contentTask`, `modelInclusionRecord`.
- Do not turn the product into a generic CMS, generic knowledge base, or employee productivity system.
- All backend responses must use the unified structure: `code`, `message`, `data`.
- All delete operations should use soft delete where the table has business records.
- AI operations must support failure status and retry.
- Batch import must include preview, deduplication result, and failed row details.
- API keys, login credentials, and sensitive enterprise material must not be written to normal logs.

## First-Version Manual Boundaries

The first version keeps the GEO loop visible but avoids full automation:

- GEO Analysis: AI-assisted or manually completed analysis is allowed. Do not automate crawling or testing every external AI platform.
- Model Inclusion: support manual entry and Excel/CSV import. Do not build full automatic multi-model monitoring in MVP.
- Knowledge Base URL Import: support pasted text and single URL import if feasible. Do not build full-site crawling.
- Content Publishing: generate and export content only. Do not publish automatically to external media, official sites, WeChat, B2B platforms, or ad/media channels.
- Competitor Data: allow competitor names and answer summaries in analysis and records. Do not build a full competitor intelligence system.
- Reports: compute basic GEO metrics from local records. Do not build complex monthly report layout or automated executive decks.

## Repository Shape

Planned files and responsibilities:

- `docs/specs/geo-marketing-platform-spec.md`: canonical product spec.
- `docs/implementation-plan.md`: this staged implementation plan.
- `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`: monorepo setup.
- `docker-compose.yml`: local PostgreSQL and Redis.
- `.env.example`: environment variables for API, database, Redis, storage, and DeepSeek.
- `apps/api/`: NestJS backend.
- `apps/api/prisma/schema.prisma`: PostgreSQL schema.
- `apps/api/src/common/`: response envelope, validation, errors, pagination, auth guards.
- `apps/api/src/modules/geo-analysis/`: GEO diagnosis tasks and model results.
- `apps/api/src/modules/geo-prompts/`: prompt strategy library, import, deduplication, export.
- `apps/api/src/modules/expansion/`: rule-based expansion and AI expansion candidates.
- `apps/api/src/modules/knowledge/`: enterprise GEO knowledge bases, files, chunks, parsing status.
- `apps/api/src/modules/instructions/`: GEO instruction templates.
- `apps/api/src/modules/content/`: GEO content tasks and generated content items.
- `apps/api/src/modules/model-inclusion/`: model inclusion and ranking records.
- `apps/api/src/modules/reports/`: GEO overview and coverage reports.
- `apps/api/src/modules/ai/`: Provider abstraction and DeepSeek Provider.
- `apps/api/src/modules/queues/`: BullMQ queues and processors.
- `apps/web/`: Vue 3 frontend.
- `apps/web/src/views/geo-dashboard/`: GEO workbench.
- `apps/web/src/views/geo-analysis/`: GEO analysis pages.
- `apps/web/src/views/geo-prompts/`: prompt strategy pages.
- `apps/web/src/views/geo-expansion/`: AI and rule expansion pages.
- `apps/web/src/views/knowledge-bases/`: enterprise GEO knowledge base pages.
- `apps/web/src/views/instruction-templates/`: GEO instruction library pages.
- `apps/web/src/views/content-tasks/`: GEO content generation pages.
- `apps/web/src/views/model-inclusion/`: inclusion and ranking record pages.
- `apps/web/src/views/geo-reports/`: GEO report pages.
- `packages/shared/`: shared enums, DTO-facing types, and business constants.

## Module Coverage Matrix

| GEO module         | API                                                                                                                                                                                                                                                                                                                                                                                                                                                 | Data tables                                                                                                                                 | Frontend pages                                                                                                     | Test points                                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| GEO 工作台         | `GET /api/reports/geo-overview`                                                                                                                                                                                                                                                                                                                                                                                                                     | Reads `geo_prompts`, `knowledge_bases`, `content_tasks`, `content_items`, `geo_analysis_tasks`, `model_inclusion_records`, `expansion_jobs` | `GEO 工作台` with asset cards, task cards, effect cards, shortcuts, optimization list                              | Shows prompt type counts, knowledge base count, content count, failed tasks, brand mentioned/unmentioned counts                                       |
| GEO 分析           | `GET /api/geo-analysis-tasks`, `POST /api/geo-analysis-tasks`, `GET /api/geo-analysis-tasks/:id`, `PATCH /api/geo-analysis-tasks/:id`, `POST /api/geo-analysis-tasks/:id/run`, `POST /api/geo-analysis-tasks/:id/convert-prompts`, `POST /api/geo-analysis-tasks/:id/create-content-task`                                                                                                                                                           | `geo_analysis_tasks`, `geo_model_results`                                                                                                   | Analysis task list, create drawer/page, analysis detail, gaps and suggestions panel                                | Create task, save result, store content gaps, store knowledge gaps, convert prompt suggestions                                                        |
| 提示词策略库       | `GET /api/geo-prompts`, `POST /api/geo-prompts`, `POST /api/geo-prompts/import-preview`, `POST /api/geo-prompts/bulk-import`, `PATCH /api/geo-prompts/:id`, `DELETE /api/geo-prompts/:id`, `GET /api/geo-prompts/export`                                                                                                                                                                                                                            | `geo_prompts`                                                                                                                               | Prompt library with tabs for `base`, `distilled`, `brand`, `scene`; import preview modal; filters; batch edit      | Import 1000 rows, deduplicate by prompt text/type/product line, show failed rows, update priority and tracking                                        |
| AI 拓词            | `POST /api/expansion/rule-generate`, `POST /api/expansion/ai-generate`, `GET /api/expansion/jobs/:id`, `POST /api/expansion/jobs/:id/save-candidates`                                                                                                                                                                                                                                                                                               | `expansion_jobs`, `expansion_candidates`, `geo_prompts`, `ai_call_logs`                                                                     | Rule expansion tab, AI expansion tab, candidate table, save selected candidates                                    | Generate all seven rule combinations, mark duplicates, AI candidates not auto-saved, selected candidates saved after dedupe                           |
| 企业 GEO 知识库    | `GET /api/knowledge-bases`, `POST /api/knowledge-bases`, `GET /api/knowledge-bases/:id`, `PATCH /api/knowledge-bases/:id`, `DELETE /api/knowledge-bases/:id`, `POST /api/knowledge-bases/:id/files`, `POST /api/knowledge-bases/:id/text-import`, `POST /api/knowledge-bases/:id/url-import`, `POST /api/knowledge-files/:id/reparse`, `GET /api/knowledge-bases/:id/chunks`, `PATCH /api/knowledge-chunks/:id`, `DELETE /api/knowledge-chunks/:id` | `knowledge_bases`, `knowledge_files`, `knowledge_chunks`                                                                                    | Knowledge base list, detail page, upload panel, parsing status, chunk editor, tag controls                         | Create knowledge base, upload at least one supported file type, parse or fail with reason, retry failed parse, edit chunk                             |
| 指令库             | `GET /api/instruction-templates`, `POST /api/instruction-templates`, `GET /api/instruction-templates/:id`, `PATCH /api/instruction-templates/:id`, `DELETE /api/instruction-templates/:id`, `POST /api/instruction-templates/:id/duplicate`                                                                                                                                                                                                         | `instruction_templates`                                                                                                                     | Instruction template list, create/edit form, duplicate action, content type filters                                | Create, edit, delete, duplicate; ensure instruction fields express GEO output structure and forbidden rules                                           |
| GEO 内容生成       | `GET /api/content-tasks`, `POST /api/content-tasks`, `GET /api/content-tasks/:id`, `POST /api/content-tasks/:id/run`, `POST /api/content-tasks/:id/retry`, `POST /api/content-tasks/:id/cancel`, `GET /api/content-items`, `GET /api/content-items/:id`, `PATCH /api/content-items/:id`, `DELETE /api/content-items/:id`, `GET /api/content-items/:id/export`                                                                                       | `content_tasks`, `content_task_prompts`, `content_items`, `knowledge_bases`, `instruction_templates`, `ai_call_logs`                        | Content task list, create task page, task detail, content item editor, export actions                              | Create task from prompt + knowledge + instruction, status flow, generated item links to prompt and knowledge, retry failed task, export Markdown/Word |
| 模型覆盖与上词记录 | `GET /api/model-inclusion-records`, `POST /api/model-inclusion-records`, `POST /api/model-inclusion-records/import-preview`, `POST /api/model-inclusion-records/import`, `GET /api/model-inclusion-records/export`                                                                                                                                                                                                                                  | `model_inclusion_records`, `geo_prompts`                                                                                                    | Inclusion record list, manual entry form, import preview modal, uncovered prompt view                              | Manual record creation, import failed row details, filter by prompt/model/date, calculate mentioned and recommended flags                             |
| GEO 报表           | `GET /api/reports/geo-overview`, `GET /api/reports/prompt-coverage`, `GET /api/reports/model-coverage`, `GET /api/reports/content-coverage`, `GET /api/reports/export`                                                                                                                                                                                                                                                                              | Aggregates from all GEO business tables                                                                                                     | Report filter page, metric cards, prompt coverage table, model coverage table, product line coverage table, export | Filter by date/product line/model, export Excel, show missing content and missing knowledge indicators                                                |

## Phase 0: Project Initialization And GEO Foundation

**Goal:** Create the runnable project skeleton and align the documentation path before any business implementation.

**Files to create or modify:**

- Use `docs/specs/geo-marketing-platform-spec.md` as the only formal product spec path.
- Remove the root `geo-marketing-platform-spec.md` after moving the original content, and document the canonical path in `README.md`.
- Create `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `.env.example`, `docker-compose.yml`, `README.md`.
- Create `apps/api/` NestJS skeleton.
- Create `apps/web/` Vue 3 + Vite + TypeScript + Element Plus skeleton.
- Create `packages/shared/` for GEO enums and constants.

**Modules to add:**

- API health module with `/api/health`.
- Web app shell with GEO navigation labels only.
- Common `ApiResponse` shape.
- Local PostgreSQL and Redis services.

**Acceptance criteria:**

- `pnpm install` succeeds.
- PostgreSQL and Redis start through Docker Compose.
- API starts and returns `{ code, message, data }` from `/api/health`.
- Web app starts and shows a GEO workbench shell, not a generic admin landing page.
- The canonical spec path exists at `docs/specs/geo-marketing-platform-spec.md`.

**Risks:**

- Overbuilding auth, CI, deployment, or SaaS concerns too early.
- Creating generic module names like `articles`, `documents`, or `keywords` instead of GEO names.

**Stop point:** Stop after the skeleton runs and ask for confirmation before Phase 1.

## Phase 1: Database Models And Prisma

**Goal:** Create the GEO data foundation with Prisma migrations, seed data, enums, relations, indexes, and soft-delete fields.

**Files to create or modify:**

- `apps/api/prisma/schema.prisma`
- `apps/api/prisma/seed.ts`
- `apps/api/src/prisma/prisma.module.ts`
- `apps/api/src/prisma/prisma.service.ts`
- `packages/shared/src/geo-enums.ts`
- `packages/shared/src/index.ts`

**Data tables:**

- `users`
- `geo_analysis_tasks`
- `geo_model_results`
- `geo_prompts`
- `expansion_jobs`
- `expansion_candidates`
- `knowledge_bases`
- `knowledge_files`
- `knowledge_chunks`
- `instruction_templates`
- `content_tasks`
- `content_task_prompts`
- `content_items`
- `model_inclusion_records`
- `ai_call_logs`

**Important model decisions:**

- Add `region` and `language` to `geo_analysis_tasks`.
- Add `base_word`, `derived_word`, `prompt_text`, `prompt_type`, `product_line`, `scenario`, `user_intent`, `priority`, `target_models`, `track_enabled`, and `latest_coverage_status` to `geo_prompts`.
- Add a unique dedupe index for active prompts using `prompt_text`, `prompt_type`, and `product_line`.
- Add `needs_content` and `needs_knowledge` to `model_inclusion_records` or equivalent fields that support GEO optimization reports.
- Add `parse_attempts`, `parse_status`, `error_message`, and `source_url` to knowledge file/import records.
- Add `content_task_prompts` so a content task can target multiple GEO prompts.
- Add `deleted_at` to soft-deletable business tables.

**Acceptance criteria:**

- Prisma migration runs against local PostgreSQL.
- Seed creates one admin user, sample GEO prompts, one knowledge base, one instruction template, one inclusion record, and one content task.
- Prisma Studio can inspect all GEO tables.
- Table and field names express GEO business semantics.

**Test points:**

- Migration test: database can be reset and seeded.
- Uniqueness test: duplicate active GEO prompt is rejected or marked duplicate before save.
- Relation test: content task can link multiple GEO prompts and one knowledge base.
- Soft-delete test: deleted records are excluded from normal queries.

**Risks:**

- Storing too much as JSON and making reports difficult.
- Missing relations that later force ad hoc joins or generic CMS tables.

**Stop point:** Stop after schema, migration, and seed pass.

## Phase 2: NestJS Backend APIs

**Goal:** Implement the non-AI backend APIs that let the GEO loop be created, queried, edited, imported, and reported manually.

**Files to create or modify:**

- `apps/api/src/main.ts`
- `apps/api/src/common/response/*`
- `apps/api/src/common/errors/*`
- `apps/api/src/common/pagination/*`
- `apps/api/src/common/auth/*`
- `apps/api/src/modules/geo-analysis/*`
- `apps/api/src/modules/geo-prompts/*`
- `apps/api/src/modules/expansion/*`
- `apps/api/src/modules/knowledge/*`
- `apps/api/src/modules/instructions/*`
- `apps/api/src/modules/content/*`
- `apps/api/src/modules/model-inclusion/*`
- `apps/api/src/modules/reports/*`

**APIs to implement in this phase:**

- GEO Analysis CRUD and manual result save.
- GEO Prompts CRUD, import preview, bulk import, export.
- Rule expansion generation and candidate save.
- Knowledge base CRUD, text import, chunk CRUD, file metadata creation with parse status.
- Instruction template CRUD and duplicate.
- Content task CRUD and manual status transitions.
- Content item CRUD and export placeholder.
- Model inclusion manual entry, import preview, import, export.
- GEO report aggregation endpoints.

**First-version manual-only behavior:**

- `/api/geo-analysis-tasks/:id/run` may create a `pending` or `running` task record but does not need external platform automation until Phase 4.
- File parsing can support text import first; binary parsers can be completed in Phase 5.
- Content task execution can remain pending/manual until Phase 4 AI generation.
- Model inclusion records are manual or imported only.

**Acceptance criteria:**

- Every API returns the unified response shape.
- DTO validation rejects missing GEO-critical fields.
- Batch imports return success count, duplicate count, and failed rows.
- Soft deletes do not physically remove business records.
- Basic role guard exists for `admin`, `geo_operator`, `content_editor`, and `viewer`.

**Test points:**

- GEO analysis task creation and result save.
- Prompt batch import with duplicates and invalid rows.
- Rule expansion produces the seven required combinations.
- Candidate save deduplicates before creating `geo_prompts`.
- Knowledge base text import creates editable `knowledge_chunks`.
- Instruction template create/edit/delete.
- Content task status flow among `pending`, `running`, `succeeded`, `failed`, `cancelled`.
- Model inclusion manual entry and filtered query.
- Report endpoints calculate prompt counts, content counts, and brand mention rate.

**Risks:**

- Implementing AI logic too early inside CRUD services.
- Letting import/export become generic file utilities without GEO validation.

**Stop point:** Stop after API tests pass and manual GEO loop can be exercised through API calls.

## Phase 3: Vue Frontend Pages

**Goal:** Build the Element Plus frontend for the complete MVP loop using backend APIs, without adding new backend business scope.

**Files to create or modify:**

- `apps/web/src/main.ts`
- `apps/web/src/router/index.ts`
- `apps/web/src/api/*`
- `apps/web/src/stores/*`
- `apps/web/src/layouts/GeoAppLayout.vue`
- `apps/web/src/views/geo-dashboard/*`
- `apps/web/src/views/geo-analysis/*`
- `apps/web/src/views/geo-prompts/*`
- `apps/web/src/views/geo-expansion/*`
- `apps/web/src/views/knowledge-bases/*`
- `apps/web/src/views/instruction-templates/*`
- `apps/web/src/views/content-tasks/*`
- `apps/web/src/views/model-inclusion/*`
- `apps/web/src/views/geo-reports/*`

**Pages to implement:**

- GEO 工作台: asset cards, task cards, effect cards, pending optimization list, shortcuts.
- GEO 分析: task list, create form, detail page, result fields, prompt/content conversion actions.
- 提示词策略库: four GEO prompt type tabs, filters, table, create/edit form, import preview, export.
- AI 拓词: rule expansion tab, AI expansion tab placeholder until Phase 4, candidate table, save selected.
- 企业 GEO 知识库: knowledge base list, detail, text import, upload UI, parse status, chunk editor.
- 指令库: template list, filters, create/edit/duplicate forms.
- GEO 内容生成: task list, create form, task detail, content item editor, export action.
- 模型覆盖与上词记录: list, manual record form, import preview, uncovered prompt view.
- GEO 报表: filters, overview cards, prompt coverage table, model coverage table, content coverage table.

**Acceptance criteria:**

- A user can manually complete the path: create analysis task -> add/import GEO prompts -> create knowledge base -> add instruction -> create content task -> add model inclusion record -> view report.
- All forms have frontend validation matching backend DTO expectations.
- UI labels use GEO terms, not generic CMS terms.
- Element Plus tables, forms, dialogs, pagination, upload, tabs, and cards are used consistently.

**Test points:**

- Manual or Playwright validation for creating GEO analysis task.
- Prompt import preview and save.
- Rule expansion and selected candidate save.
- Knowledge base creation and chunk edit.
- Instruction template creation.
- Content task creation and content item edit.
- Model inclusion manual entry.
- Report filters.

**Risks:**

- Making a decorative dashboard instead of an operational GEO workbench.
- Building marketing landing pages instead of the actual work screens.

**Stop point:** Stop after the UI can run locally and the manual GEO loop is demonstrable.

## Phase 4: AI Provider, AI Expansion, GEO Analysis Runner, Content Generation

**Goal:** Add asynchronous AI capabilities using DeepSeek through a Provider abstraction, while keeping generated outputs reviewable before they become GEO assets.

**Files to create or modify:**

- `apps/api/src/modules/ai/ai-provider.interface.ts`
- `apps/api/src/modules/ai/deepseek.provider.ts`
- `apps/api/src/modules/ai/ai-provider.registry.ts`
- `apps/api/src/modules/ai/ai-call-log.service.ts`
- `apps/api/src/modules/queues/*`
- `apps/api/src/modules/expansion/ai-expansion.service.ts`
- `apps/api/src/modules/geo-analysis/geo-analysis-runner.service.ts`
- `apps/api/src/modules/content/content-generation.service.ts`
- `apps/web/src/views/geo-expansion/*`
- `apps/web/src/views/geo-analysis/*`
- `apps/web/src/views/content-tasks/*`

**AI APIs and behavior:**

- `POST /api/expansion/ai-generate`: creates an AI expansion job and candidates; does not save candidates automatically.
- `POST /api/geo-analysis-tasks/:id/run`: calls AI to produce diagnosis fields and model result summaries where configured.
- `POST /api/content-tasks/:id/run`: creates GEO content items from selected prompts, knowledge chunks, and instruction template.
- `POST /api/content-tasks/:id/retry`: retries failed AI generation.

**Provider abstraction:**

- DeepSeek is the first concrete provider.
- Provider registry must allow later OpenAI, Tongyi, Doubao, and Kimi providers.
- AI call logs store provider, model, purpose, related type, related id, token counts, status, and error summary.
- Do not log full API keys or sensitive raw enterprise source material in normal logs.

**Acceptance criteria:**

- AI expansion returns candidates with recommended intent, priority, and content type.
- AI candidates require user selection before saving to `geo_prompts`.
- GEO analysis can generate or update content gaps, knowledge gaps, prompt suggestions, and model result summaries.
- Content generation produces editable content items linked to target GEO prompts and knowledge base.
- Failed AI calls mark the job/task failed and can be retried.

**Test points:**

- Mock Provider test for AI expansion candidate creation.
- Candidate save test after AI generation.
- AI call logging test with redacted sensitive values.
- Content generation status flow test.
- Retry test changes failed task back through running and into succeeded or failed.

**Risks:**

- Generated text may hallucinate. The UI must keep generated content editable and reviewable.
- Sending too much knowledge base content to the model. The task detail should show which chunks are used.
- Provider failures and rate limits can block jobs; queue retries must be bounded.

**Stop point:** Stop after DeepSeek-backed AI flows work with mocked or real provider configuration.

## Phase 5: Import, Export, Reports, Tests, And Acceptance

**Goal:** Harden MVP operations so it can import, export, parse, report, and pass acceptance checks.

**Files to create or modify:**

- `apps/api/src/modules/import-export/*`
- `apps/api/src/modules/parsers/*`
- `apps/api/src/modules/files/*`
- `apps/api/src/modules/reports/*`
- `apps/api/test/*`
- `apps/web/tests/*`
- `apps/web/playwright.config.ts`
- `docs/acceptance/mvp-checklist.md`

**Capabilities to finish:**

- Prompt CSV/XLSX import and export.
- Model inclusion CSV/XLSX import and export.
- Report Excel export.
- Content Markdown export.
- Content Word export.
- Knowledge file upload to local storage.
- At least one reliable parser path for MVP acceptance, with failed parse retry.
- Parser adapters for `docx`, `pdf`, `xlsx`, `csv`, `txt`, and `md`, preserving failed status and retry support when a specific file cannot be parsed.

**Report acceptance:**

- GEO overview includes prompt totals by type, knowledge base totals, content totals, task failures, brand mentioned count, brand unmentioned count.
- Prompt coverage report shows high-priority prompts, latest coverage status, and missing content/knowledge flags.
- Model coverage report shows model, prompt, mention status, recommendation status, citation status, and checked date.
- Content coverage report shows content count by product line, generation type, and linked prompt coverage.

**End-to-end acceptance tests:**

- Create GEO analysis task.
- Create knowledge base and upload or import material.
- Batch import GEO prompts and show duplicate rows.
- Generate prompts with rule expansion and save selected candidates.
- Generate AI expansion candidates and save selected candidates when DeepSeek is configured.
- Create GEO content from prompt + knowledge base + instruction.
- Manually create model inclusion record.
- View GEO report and export data.

**Acceptance criteria:**

- Local developer can start database, Redis, API, and Web from README instructions.
- The app can run through the MVP manual GEO loop.
- Backend tests cover required AGENTS.md cases.
- Frontend key flows are manually or automatically verified.
- No full API keys or sensitive enterprise source text appear in normal logs.

**Risks:**

- Parser quality varies by file type. MVP should clearly show parse status and retry instead of pretending every file is cleanly parsed.
- Large imports may need streaming later. MVP should at least pass the 1000-prompt import target.
- Export polish should not delay core GEO loop acceptance.

**Stop point:** Stop after MVP acceptance checklist is complete and ask for confirmation before any post-MVP automatic monitoring work.

## Post-MVP Backlog

Only start these after the MVP is stable and confirmed:

- Automated multi-model inclusion detection.
- Competitor visibility comparison.
- Prompt priority auto-recommendation.
- External publishing and channel status tracking.
- Monthly report generation.
- Overseas and multilingual GEO.
- Team approval and publishing workflows.
- Managed operations workbench.

## Completion Rule For Every Phase

Each phase must end with:

- A short summary of changed files.
- Exact commands used to run and verify the phase.
- Test results or manual verification notes.
- Known limitations.
- A stop for user confirmation before continuing.
