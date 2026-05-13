import type { Component } from "vue";
import {
  CollectionTag,
  DataBoard,
  DocumentChecked,
  EditPen,
  Files,
  MagicStick,
  PieChart,
  Search,
  Setting,
  TrendCharts
} from "@element-plus/icons-vue";

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
};

export const navigationItems: GeoPageMeta[] = [
  {
    path: "/dashboard",
    label: "GEO 工作台",
    title: "GEO 工作台",
    question: "今天的 GEO 闭环推进到哪一步？",
    description: "聚合 GEO 诊断、提示词资产、知识库资料、内容产出和待优化事项。",
    phaseNote: "Phase 3A 仅搭建后台框架，后续会接入真实总览指标与待办列表。",
    nextSteps: ["展示核心资产概览", "展示待优化提示词", "串联后端 MVP 主流程入口"],
    apiFocus: "后续读取 /api/reports/geo-overview 和 /api/reports/optimization-suggestions",
    icon: DataBoard
  },
  {
    path: "/geo-analysis",
    label: "GEO 分析",
    title: "GEO 分析",
    question: "品牌在 AI 回答里表现如何？",
    description: "用于创建分析任务，观察品牌是否被提及、推荐、引用官网以及暴露哪些缺口。",
    phaseNote: "已接入模拟 GEO 分析任务、提示词建议转入和内容任务创建流程。",
    nextSteps: ["创建 GEO 分析任务", "运行模拟 GEO 分析", "将提示词建议转入策略库"],
    apiFocus: "已联调 /api/geo-analysis-tasks",
    icon: Search
  },
  {
    path: "/geo-prompts",
    label: "提示词策略库",
    title: "提示词策略库",
    question: "用户会怎么问 AI？",
    description: "沉淀训练词、蒸馏词、品牌词和场景词，支撑模型覆盖追踪与内容生产。",
    phaseNote: "当前仅保留策略库占位，不实现列表、导入或编辑。",
    nextSteps: ["提示词分页筛选", "批量导入和去重", "覆盖状态与内容资产联动"],
    apiFocus: "后续联调 /api/geo-prompts",
    icon: CollectionTag
  },
  {
    path: "/expansion",
    label: "AI 拓词",
    title: "AI 拓词",
    question: "还能生成哪些适合 GEO 追踪的问题？",
    description: "通过规则组合或 AI 接口拓词生成候选提示词，再由运营选择保存。",
    phaseNote: "已支持规则拓词、默认模拟生成、可选真实 AI 接口、候选词去重和勾选保存。",
    nextSteps: ["规则拓词表单", "AI 候选词预览", "勾选保存到提示词库"],
    apiFocus: "POST /api/expansion/rule-generate, POST /api/expansion/ai-generate",
    icon: MagicStick
  },
  {
    path: "/knowledge-bases",
    label: "企业 GEO 知识库",
    title: "企业 GEO 知识库",
    question: "AI 应该引用哪些企业事实资料？",
    description: "管理产品、案例、FAQ、解决方案和资质等可被内容生成引用的事实底座。",
    phaseNote: "当前仅保留知识库占位，不上传文件或编辑片段。",
    nextSteps: ["知识库列表", "文本导入", "txt/md/csv 上传解析与片段管理"],
    apiFocus: "后续联调 /api/knowledge-bases 和 /api/knowledge-files",
    icon: Files
  },
  {
    path: "/instruction-templates",
    label: "指令库",
    title: "指令库",
    question: "内容生产应该遵循什么 GEO 方法？",
    description: "沉淀选型指南、问答素材、国产替代、FAQ 等 GEO 内容生产指令。",
    phaseNote: "当前仅保留指令模板占位，不创建或复制指令。",
    nextSteps: ["指令模板列表", "模板复制", "与内容任务联动"],
    apiFocus: "后续联调 /api/instruction-templates",
    icon: DocumentChecked
  },
  {
    path: "/content-tasks",
    label: "GEO 内容生成",
    title: "GEO 内容生成",
    question: "应该生产什么内容来影响 AI 回答？",
    description: "基于提示词、知识库和指令模板生成服务于 AI 问答可见度的内容资产。",
    phaseNote: "当前仅保留内容任务占位，不创建生成任务。",
    nextSteps: ["创建内容任务", "查看生成结果", "编辑和导出 Markdown"],
    apiFocus: "后续联调 /api/content-tasks 和 /api/content-items",
    icon: EditPen
  },
  {
    path: "/model-inclusion-records",
    label: "模型覆盖记录",
    title: "模型覆盖记录",
    question: "哪些提示词已经被 AI 提及或推荐？",
    description: "记录不同模型下品牌是否被提及、推荐、引用官网以及排名位置。",
    phaseNote: "当前仅保留覆盖记录占位，不录入或导入记录。",
    nextSteps: ["手动新增覆盖记录", "批量导入", "未覆盖提示词查询"],
    apiFocus: "后续联调 /api/model-inclusion-records",
    icon: TrendCharts
  },
  {
    path: "/reports",
    label: "GEO 报表",
    title: "GEO 报表",
    question: "下一步应该补哪些词、资料和内容？",
    description: "围绕提示词覆盖、模型表现、内容资产和知识库覆盖输出复盘指标。",
    phaseNote: "当前仅保留报表占位，不绘制图表或查询统计。",
    nextSteps: ["GEO 总览", "模型覆盖报表", "优化建议列表"],
    apiFocus: "后续联调 /api/reports",
    icon: PieChart
  },
  {
    path: "/settings",
    label: "系统设置",
    title: "系统设置",
    question: "本地联调环境是否准备好？",
    description: "展示前端 API 地址、环境标识和 AI 接口配置边界说明。",
    phaseNote:
      "AI 接口支持模拟生成和真实 AI 接口；API Key 只允许在后端 .env 配置，前端不提供密钥输入框。",
    nextSteps: ["展示 API 地址", "说明 AI 接口后端配置", "保留后续接口状态检查入口"],
    apiFocus: "当前使用 VITE_API_BASE_URL；AI_PROVIDER 由后端环境变量控制",
    icon: Setting
  }
];

export const pageMetaByPath = Object.fromEntries(
  navigationItems.map((item) => [item.path, item])
) as Record<string, GeoPageMeta>;
