import type { Component } from "vue";
import {
  CollectionTag,
  DataBoard,
  DocumentChecked,
  EditPen,
  Files,
  Guide,
  MagicStick,
  OfficeBuilding,
  PieChart,
  Search,
  Setting,
  TrendCharts,
  User
} from "@element-plus/icons-vue";
import type { NormalizedRole } from "@/utils/permission";

const allRoles: NormalizedRole[] = ["platform_admin", "company_admin", "operator", "viewer"];
const activeBusinessRoles: NormalizedRole[] = ["platform_admin", "company_admin", "operator"];

export type GeoPageMeta = {
  path: string;
  label: string;
  title: string;
  question: string;
  description: string;
  phaseNote: string;
  nextSteps: string[];
  apiFocus: string;
  icon: Component;
  allowedRoles: NormalizedRole[];
};

export const navigationItems: GeoPageMeta[] = [
  {
    path: "/dashboard",
    label: "工作台",
    title: "工作台",
    question: "今天的 GEO 闭环推进到哪一步？",
    description: "聚合 GEO 诊断、提示词资产、知识库资料、内容产出和待优化事项。",
    phaseNote: "已接入总览指标、优化建议和核心操作入口，适合作为内部日常运营首页。",
    nextSteps: ["查看 GEO 资产概览", "进入待优化建议", "串联诊断、策略、内容和复盘流程"],
    apiFocus: "读取 /api/reports/geo-overview 和 /api/reports/optimization-suggestions",
    icon: DataBoard,
    allowedRoles: allRoles
  },
  {
    path: "/geo-analysis",
    label: "GEO 诊断",
    title: "GEO 诊断",
    question: "前期应该先补哪些 GEO 基础？",
    description: "用于前期评估品牌、官网和产品线，生成提示词、知识库和内容补齐建议。",
    phaseNote: "已接入 GEO 诊断任务、提示词建议转入和内容任务创建流程。",
    nextSteps: ["创建 GEO 诊断任务", "运行模拟 GEO 诊断", "将提示词建议转入策略库"],
    apiFocus: "已联调 /api/geo-analysis-tasks",
    icon: Search,
    allowedRoles: allRoles
  },
  {
    path: "/geo-prompts",
    label: "提示词库",
    title: "提示词库",
    question: "用户会怎么问 AI？",
    description: "沉淀训练词、蒸馏词、品牌词和场景词，支撑模型覆盖追踪与内容生产。",
    phaseNote: "已支持提示词查询、筛选、新增、编辑、软删除、批量导入和 CSV 导出。",
    nextSteps: ["维护训练词和蒸馏词", "补充品牌词与场景词", "为内容生成和覆盖记录提供资产"],
    apiFocus: "已联调 /api/geo-prompts",
    icon: CollectionTag,
    allowedRoles: allRoles
  },
  {
    path: "/expansion",
    label: "AI 拓词",
    title: "AI 拓词",
    question: "还能生成哪些适合 GEO 追踪的问题？",
    description: "通过规则组合或 AI 接口拓词生成候选提示词，再由运营选择保存。",
    phaseNote: "已支持规则拓词、AI 候选词生成、候选词去重和勾选保存。",
    nextSteps: ["规则拓词表单", "AI 候选词预览", "勾选保存到提示词库"],
    apiFocus: "POST /api/expansion/rule-generate, POST /api/expansion/ai-generate",
    icon: MagicStick,
    allowedRoles: activeBusinessRoles
  },
  {
    path: "/knowledge-bases",
    label: "知识库",
    title: "知识库",
    question: "AI 应该引用哪些企业事实资料？",
    description: "管理产品、案例、FAQ、解决方案和资质等可被内容生成引用的事实底座。",
    phaseNote: "已支持知识库管理、手动录入、txt/md/csv/Excel/Word 上传解析、片段编辑和解析重试。",
    nextSteps: ["维护产品线知识库", "导入可引用事实资料", "检查解析失败文件和知识片段质量"],
    apiFocus: "已联调 /api/knowledge-bases 和 /api/knowledge-files",
    icon: Files,
    allowedRoles: allRoles
  },
  {
    path: "/instruction-templates",
    label: "指令库",
    title: "指令库",
    question: "内容生产应该遵循什么 GEO 方法？",
    description: "沉淀需求决策、问答素材、场景方案、FAQ 等 GEO 内容生产指令。",
    phaseNote: "已支持指令模板查询、创建、编辑、详情查看、复制和软删除。",
    nextSteps: ["沉淀通用内容方法", "维护产品线专属约束", "为内容任务选择合适模板"],
    apiFocus: "已联调 /api/instruction-templates",
    icon: DocumentChecked,
    allowedRoles: allRoles
  },
  {
    path: "/geo-content",
    label: "GEO 内容生成",
    title: "GEO 内容生成",
    question: "应该生产什么内容来影响 AI 回答？",
    description: "基于提示词、知识库和指令模板生成服务于 AI 问答可见度的内容资产。",
    phaseNote: "已支持内容草稿生成、内容项编辑、软删除和 Markdown 导出。",
    nextSteps: ["选择提示词、知识库和指令模板", "审核生成内容", "沉淀可发布的 GEO 内容资产"],
    apiFocus: "已联调 /api/content-tasks 和 /api/content-items",
    icon: EditPen,
    allowedRoles: allRoles
  },
  {
    path: "/model-inclusion-records",
    label: "AI 模型覆盖记录",
    title: "AI 模型覆盖记录",
    question: "哪些提示词已经被 AI 提及或推荐？",
    description: "记录不同模型下品牌是否被提及、推荐、引用官网以及排名位置。",
    phaseNote: "已支持人工录入、批量导入、未覆盖提示词查询、基础统计和 CSV 导出。",
    nextSteps: ["记录真实模型表现", "定位未覆盖提示词", "为报表和优化建议提供依据"],
    apiFocus: "已联调 /api/model-inclusion-records",
    icon: TrendCharts,
    allowedRoles: allRoles
  },
  {
    path: "/geo-reports",
    label: "GEO 报表",
    title: "GEO 报表",
    question: "下一步应该补哪些词、资料和内容？",
    description: "围绕提示词覆盖、模型表现、内容资产和知识库覆盖输出复盘指标。",
    phaseNote: "已支持总览、提示词覆盖、模型覆盖、内容覆盖、知识库覆盖、优化建议和 CSV 导出。",
    nextSteps: ["复盘覆盖率和推荐率", "发现内容与知识库缺口", "导出当前报表进行运营复盘"],
    apiFocus: "已联调 /api/reports",
    icon: PieChart,
    allowedRoles: allRoles
  },
  {
    path: "/users",
    label: "用户管理",
    title: "用户管理",
    question: "谁可以进入 GEO 工作站并操作哪些公司？",
    description: "管理系统账号、所属公司与角色，仅平台管理员可使用。",
    phaseNote: "已支持用户列表、新增用户、重置密码、启用禁用和默认公司角色分配。",
    nextSteps: ["查看账号状态", "创建运营账号", "重置密码或调整公司角色"],
    apiFocus: "已联调 /api/users；密码只写入 passwordHash，不返回明文或哈希。",
    icon: User,
    allowedRoles: ["platform_admin"]
  },
  {
    path: "/departments",
    label: "部门管理",
    title: "部门管理",
    question: "不同部门可以进入哪些 GEO 模块？",
    description: "维护公司内部门，并配置部门能进入的 GEO 工作站模块。",
    phaseNote: "DEPT-1 已支持单部门绑定、部门启停和模块进入权限，不涉及按钮级或字段级权限。",
    nextSteps: ["新增或停用部门", "配置模块访问权限", "在用户管理中绑定部门"],
    apiFocus: "已联调 /api/departments 和 /api/departments/:id/module-permissions",
    icon: OfficeBuilding,
    allowedRoles: ["platform_admin", "company_admin"]
  },
  {
    path: "/settings",
    label: "系统设置",
    title: "系统设置",
    question: "当前 GEO 工作站代表哪个公司和项目？",
    description:
      "维护公司、产品线、项目档案、品牌上下文和表达边界，让 clean 库能从 0 搭建正式基础数据。",
    phaseNote:
      "公司和产品线复用现有 Company / ProductLine 模型，不提供物理删除；产品线说明字段后续如需使用，可单独扩展数据库模型。",
    nextSteps: ["维护公司和产品线", "配置项目档案", "确认 AI 接口配置边界"],
    apiFocus: "已联调 /api/companies、/api/product-lines 和 /api/project-profile",
    icon: Setting,
    allowedRoles: allRoles
  },
  {
    path: "/help",
    label: "使用教程",
    title: "使用教程",
    question: "新项目、日常生产和交接演示应该按什么流程走？",
    description: "查看 GEO 工作站的快速开始、日常 SOP、功能说明和版本更新记录。",
    phaseNote: "本页只整理前端帮助文档和说明，不新增后端 API、不修改数据模型或业务字段。",
    nextSteps: ["查看快速开始", "按 SOP 跑通日常流程", "对照版本记录做交接说明"],
    apiFocus: "前端静态帮助页面，不调用后端业务 API",
    icon: Guide,
    allowedRoles: allRoles
  }
];

export const pageMetaByPath = Object.fromEntries(
  navigationItems.map((item) => [item.path, item])
) as Record<string, GeoPageMeta>;
