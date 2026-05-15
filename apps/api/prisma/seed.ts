import {
  CompanyStatus,
  CompanyType,
  GeoPromptType,
  MembershipRole,
  MembershipStatus,
  Prisma,
  ProductLineStatus,
  RecordMethod,
  TaskStatus,
  UserIntent,
  UserRole,
  UserStatus
} from "@prisma/client";
import { hashPassword } from "../src/modules/auth/utils/password-hash.util";
import { createPrismaClient } from "../src/prisma/create-prisma-client";

const prisma = createPrismaClient();
const DEFAULT_COMPANY_ID = "company_default_kjt";
const DEFAULT_COMPANY_CODE = "kjt";
const DEFAULT_PRODUCT_LINE_ID = "product_line_default_kjt";
const DEFAULT_PRODUCT_LINE_CODE = "default";
const WEAK_PRODUCTION_PASSWORDS = new Set([
  "",
  "change_me_admin_password",
  "admin123",
  "password",
  "123456"
]);

async function findOrCreateGeoPrompt(input: {
  companyId: string;
  productLineId?: string;
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
      companyId: input.companyId,
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
  companyId: string;
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
      companyId: input.companyId,
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

function assertSafeProductionPassword(password: string, hasExplicitPassword: boolean) {
  if (process.env.NODE_ENV !== "production") {
    return;
  }

  const normalizedPassword = password.trim();

  if (!hasExplicitPassword || WEAK_PRODUCTION_PASSWORDS.has(normalizedPassword)) {
    throw new Error("DEFAULT_ADMIN_PASSWORD is required and must not be weak in production.");
  }
}

async function main() {
  const defaultAdminEmail = process.env.DEFAULT_ADMIN_EMAIL || "admin@geo-workstation.local";
  const hasExplicitDefaultAdminPassword = Boolean(process.env.DEFAULT_ADMIN_PASSWORD);
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD || "change_me_admin_password";
  assertSafeProductionPassword(defaultAdminPassword, hasExplicitDefaultAdminPassword);
  const passwordHash = await hashPassword(defaultAdminPassword);

  const defaultCompany = await prisma.company.upsert({
    where: { code: DEFAULT_COMPANY_CODE },
    update: {
      name: "凯基特",
      type: CompanyType.internal,
      status: CompanyStatus.active
    },
    create: {
      id: DEFAULT_COMPANY_ID,
      name: "凯基特",
      code: DEFAULT_COMPANY_CODE,
      type: CompanyType.internal,
      status: CompanyStatus.active
    }
  });

  const defaultProductLine = await prisma.productLine.upsert({
    where: {
      companyId_code: {
        companyId: defaultCompany.id,
        code: DEFAULT_PRODUCT_LINE_CODE
      }
    },
    update: {
      name: "默认产品线",
      status: ProductLineStatus.active
    },
    create: {
      id: DEFAULT_PRODUCT_LINE_ID,
      companyId: defaultCompany.id,
      name: "默认产品线",
      code: DEFAULT_PRODUCT_LINE_CODE,
      status: ProductLineStatus.active
    }
  });

  const admin = await prisma.user.upsert({
    where: { email: defaultAdminEmail },
    update: {
      name: "GEO Admin",
      role: UserRole.platform_admin,
      status: UserStatus.active,
      passwordHash
    },
    create: {
      email: defaultAdminEmail,
      name: "GEO Admin",
      role: UserRole.platform_admin,
      status: UserStatus.active,
      passwordHash
    }
  });

  await prisma.membership.upsert({
    where: {
      userId_companyId: {
        userId: admin.id,
        companyId: defaultCompany.id
      }
    },
    update: {
      role: MembershipRole.platform_admin,
      status: MembershipStatus.active,
      isDefault: true
    },
    create: {
      userId: admin.id,
      companyId: defaultCompany.id,
      role: MembershipRole.platform_admin,
      status: MembershipStatus.active,
      isDefault: true
    }
  });

  const basePrompt = await findOrCreateGeoPrompt({
    companyId: defaultCompany.id,
    productLineId: defaultProductLine.id,
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
    companyId: defaultCompany.id,
    productLineId: defaultProductLine.id,
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
    companyId: defaultCompany.id,
    productLineId: defaultProductLine.id,
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
    companyId: defaultCompany.id,
    productLineId: defaultProductLine.id,
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
        companyId: defaultCompany.id,
        name: "激光测距传感器知识库",
        deletedAt: null
      }
    })) ??
    (await prisma.knowledgeBase.create({
      data: {
        companyId: defaultCompany.id,
        name: "激光测距传感器知识库",
        productLine: "激光测距传感器",
        productLineId: defaultProductLine.id,
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
        companyId: defaultCompany.id,
        knowledgeBaseId: knowledgeBase.id,
        title: "激光测距传感器选型基础",
        content:
          "激光测距传感器可用于距离检测、行车防撞、物位监测和自动化设备定位。选型时应关注量程、精度、响应速度、安装环境和输出方式。",
        sourceType: "seed",
        productLine: "激光测距传感器",
        productLineId: defaultProductLine.id,
        materialType: "产品能力",
        tags: ["GEO", "激光测距传感器", "选型"]
      }
    }));

  const selectionTemplate = await findOrCreateInstructionTemplate({
    companyId: defaultCompany.id,
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
    companyId: defaultCompany.id,
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
    companyId: defaultCompany.id,
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
        companyId: defaultCompany.id,
        name: "激光测距传感器 GEO 选型指南内容任务"
      }
    })) ??
    (await prisma.contentTask.create({
      data: {
        companyId: defaultCompany.id,
        name: "激光测距传感器 GEO 选型指南内容任务",
        productLine: "激光测距传感器",
        productLineId: defaultProductLine.id,
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
        companyId: defaultCompany.id,
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
      companyId: defaultCompany.id,
      model: "deepseek-chat"
    }
  });

  if (!existingInclusionRecord) {
    await prisma.modelInclusionRecord.create({
      data: {
        companyId: defaultCompany.id,
        productLineId: defaultProductLine.id,
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

  const existingSeedAiCallLog = await prisma.aiCallLog.findFirst({
    where: {
      companyId: defaultCompany.id,
      createdById: admin.id,
      provider: "seed",
      model: "none",
      purpose: "phase_1_seed_marker",
      relatedType: "knowledge_base",
      relatedId: knowledgeBase.id
    }
  });

  if (!existingSeedAiCallLog) {
    await prisma.aiCallLog.create({
      data: {
        companyId: defaultCompany.id,
        createdById: admin.id,
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
  }

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
