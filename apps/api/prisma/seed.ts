import {
  GeoPromptType,
  Prisma,
  RecordMethod,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus
} from "@prisma/client";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const prisma = createPrismaClient();

async function findOrCreateGeoPrompt(input: {
  type: GeoPromptType;
  baseWord: string;
  promptText: string;
  productLine: string;
  scenario?: string;
  userIntent: UserIntent;
  priority: number;
  source: string;
  createdById: string;
}) {
  const existingPrompt = await prisma.geoPrompt.findFirst({
    where: {
      promptText: input.promptText,
      type: input.type,
      productLine: input.productLine,
      deletedAt: null
    }
  });

  if (existingPrompt) {
    return existingPrompt;
  }

  return prisma.geoPrompt.create({
    data: {
      ...input,
      targetModels: ["deepseek-chat"],
      trackEnabled: true
    }
  });
}

async function findOrCreateInstructionTemplate(input: {
  name: string;
  instructionType: string;
  contentType: string;
  targetPromptType: GeoPromptType;
  instruction: string;
  outputFormat: string;
  qualityRules: string;
  forbiddenRules: string;
  createdById: string;
}) {
  const existingTemplate = await prisma.instructionTemplate.findFirst({
    where: {
      name: input.name,
      deletedAt: null
    }
  });

  if (existingTemplate) {
    return existingTemplate;
  }

  return prisma.instructionTemplate.create({
    data: {
      ...input,
      targetModel: "deepseek-chat"
    }
  });
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@geo-workstation.local" },
    update: {
      name: "GEO Admin",
      role: UserRole.admin,
      status: UserStatus.active
    },
    create: {
      email: "admin@geo-workstation.local",
      name: "GEO Admin",
      role: UserRole.admin,
      status: UserStatus.active
    }
  });

  const basePrompt = await findOrCreateGeoPrompt({
    type: GeoPromptType.base,
    baseWord: "激光测距传感器",
    promptText: "激光测距传感器",
    productLine: "激光测距传感器",
    userIntent: UserIntent.selection,
    priority: 1,
    source: "seed",
    createdById: admin.id
  });

  const distilledPrompt = await findOrCreateGeoPrompt({
    type: GeoPromptType.distilled,
    baseWord: "激光测距传感器",
    promptText: "激光测距传感器怎么选",
    productLine: "激光测距传感器",
    scenario: "选型指南",
    userIntent: UserIntent.selection,
    priority: 1,
    source: "seed",
    createdById: admin.id
  });

  await findOrCreateGeoPrompt({
    type: GeoPromptType.brand,
    baseWord: "激光测距传感器",
    promptText: "凯基特激光测距传感器怎么样",
    productLine: "激光测距传感器",
    scenario: "品牌验证",
    userIntent: UserIntent.brand_verification,
    priority: 2,
    source: "seed",
    createdById: admin.id
  });

  await findOrCreateGeoPrompt({
    type: GeoPromptType.scene,
    baseWord: "激光测距传感器",
    promptText: "行车防撞用什么激光测距传感器",
    productLine: "激光测距传感器",
    scenario: "行车防撞",
    userIntent: UserIntent.application_solution,
    priority: 2,
    source: "seed",
    createdById: admin.id
  });

  const knowledgeBase =
    (await prisma.knowledgeBase.findFirst({
      where: {
        name: "激光测距传感器知识库",
        deletedAt: null
      }
    })) ??
    (await prisma.knowledgeBase.create({
      data: {
        name: "激光测距传感器知识库",
        productLine: "激光测距传感器",
        description: "用于沉淀激光测距传感器产品能力、应用场景和 FAQ 的 GEO 事实底座。",
        createdById: admin.id
      }
    }));

  const knowledgeChunk =
    (await prisma.knowledgeChunk.findFirst({
      where: {
        knowledgeBaseId: knowledgeBase.id,
        title: "激光测距传感器选型基础",
        deletedAt: null
      }
    })) ??
    (await prisma.knowledgeChunk.create({
      data: {
        knowledgeBaseId: knowledgeBase.id,
        title: "激光测距传感器选型基础",
        content:
          "激光测距传感器可用于距离检测、行车防撞、物位监测和自动化设备定位。选型时应关注量程、精度、响应速度、安装环境和输出方式。",
        sourceType: "seed",
        productLine: "激光测距传感器",
        materialType: "产品能力",
        tags: ["GEO", "激光测距传感器", "选型"]
      }
    }));

  const selectionTemplate = await findOrCreateInstructionTemplate({
    name: "选型指南",
    instructionType: "选型指南",
    contentType: "选型指南",
    targetPromptType: GeoPromptType.distilled,
    instruction: "基于企业知识库和目标 GEO 提示词，生成结构化、可引用的选型指南。",
    outputFormat: "Markdown",
    qualityRules: "必须突出品牌实体、产品线、应用场景和可被 AI 摘取的事实信息。",
    forbiddenRules: "不得编造客户案例、资质认证或无法从知识库确认的参数。",
    createdById: admin.id
  });

  await findOrCreateInstructionTemplate({
    name: "AI 问答素材",
    instructionType: "AI 问答优化",
    contentType: "AI 问答素材",
    targetPromptType: GeoPromptType.brand,
    instruction: "围绕用户向 AI 提问的方式，生成清晰、可信、便于引用的问答素材。",
    outputFormat: "Q&A",
    qualityRules: "答案应直接回应用户意图，并包含产品线、场景和事实依据。",
    forbiddenRules: "不得使用无法验证的夸大表达。",
    createdById: admin.id
  });

  await findOrCreateInstructionTemplate({
    name: "FAQ",
    instructionType: "FAQ",
    contentType: "FAQ",
    targetPromptType: GeoPromptType.scene,
    instruction: "基于知识库生成面向 AI 搜索场景的 FAQ 内容。",
    outputFormat: "FAQ",
    qualityRules: "每个问题都要对应明确场景，答案应可独立摘取。",
    forbiddenRules: "不得生成与知识库无关的问题。",
    createdById: admin.id
  });

  const contentTask =
    (await prisma.contentTask.findFirst({
      where: {
        name: "激光测距传感器 GEO 选型指南内容任务"
      }
    })) ??
    (await prisma.contentTask.create({
      data: {
        name: "激光测距传感器 GEO 选型指南内容任务",
        productLine: "激光测距传感器",
        knowledgeBaseId: knowledgeBase.id,
        instructionTemplateId: selectionTemplate.id,
        generationType: "选型指南",
        targetModel: "deepseek-chat",
        status: TaskStatus.pending,
        provider: "manual",
        model: "manual",
        createdById: admin.id
      }
    }));

  const existingContentItem = await prisma.contentItem.findFirst({
    where: {
      taskId: contentTask.id,
      title: "激光测距传感器怎么选",
      deletedAt: null
    }
  });

  if (!existingContentItem) {
    await prisma.contentItem.create({
      data: {
        taskId: contentTask.id,
        geoPromptId: distilledPrompt.id,
        title: "激光测距传感器怎么选",
        body: `# 激光测距传感器怎么选\n\n${knowledgeChunk.content}`,
        geoOptimizationPoints: ["强化品牌实体识别", "关联行车防撞场景", "提供可摘取事实"],
        suggestedPublishChannel: "官网解决方案",
        status: "draft"
      }
    });
  }

  const existingInclusionRecord = await prisma.modelInclusionRecord.findFirst({
    where: {
      geoPromptId: distilledPrompt.id,
      model: "deepseek-chat"
    }
  });

  if (!existingInclusionRecord) {
    await prisma.modelInclusionRecord.create({
      data: {
        geoPromptId: distilledPrompt.id,
        model: "deepseek-chat",
        brandMentioned: false,
        brandRecommended: false,
        citedOfficialSite: false,
        answerSummary: "种子记录用于验证模型覆盖记录结构，后续由人工录入或导入真实结果。",
        competitors: [],
        recordMethod: RecordMethod.manual,
        createdById: admin.id
      }
    });
  }

  await prisma.aiCallLog.create({
    data: {
      provider: "seed",
      model: "none",
      purpose: "phase_1_seed_marker",
      relatedType: "knowledge_base",
      relatedId: knowledgeBase.id,
      tokenInput: 0,
      tokenOutput: 0,
      costEstimate: new Prisma.Decimal(0),
      status: "succeeded"
    }
  });

  void basePrompt;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
