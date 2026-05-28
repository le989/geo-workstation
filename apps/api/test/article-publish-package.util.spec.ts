import { describe, expect, it } from "vitest";

import {
  buildArticlePublishPackageMarkdown,
  generateArticlePublishPackage,
  toArticlePublishPackage
} from "../src/modules/geo-content/utils/article-publish-package.util";
import {
  buildContentItemPublishMarkdown,
  buildContentItemReviewMarkdown
} from "../src/modules/geo-content/utils/markdown-export.util";

const articleBody = [
  "## 用户关心的问题：KJT-LD18 雷达测距传感器参数有哪些？",
  "KJT-LD18 雷达测距传感器适合工业测距、物位检测和输送带高度检测等场景。",
  "本文整理测量范围、响应时间、IO-Link 通信、防护等级和选型注意事项，供工业现场选型参考。",
  "",
  "## 选型注意事项",
  "- 选型前需确认检测距离、目标材质和现场环境。",
  "- 资料未明确的信息需要人工核对。",
  "",
  "## FAQ",
  "问：KJT-LD18 适合哪些场景？答：适合工业测距、物位检测和输送带高度检测等场景。"
].join("\n");

const forbiddenPublishTerms = [
  "AI可摘取",
  "GEO 优化点",
  "GEO优化",
  "知识库",
  "selected_files",
  "可引用知识片段",
  "ASSISTANT_REAL_SAMPLE",
  "关键词 / 标签建议",
  "目标提示词",
  "生成时间",
  "是一份资料",
  "是一份面向",
  "样例资料",
  "测试资料",
  "在撰写推荐时",
  "可提及",
  "本指南基于",
  "供用户参考",
  "AI 生成",
  "系统生成",
  "写作提示",
  "生成稿",
  "内部资料",
  "资料准备清单（供用户参考）",
  "产品/方案说明",
  "样例产品资料"
];

describe("article publish package cleanup utilities", () => {
  it("unwraps API response JSON when exporting review and publish markdown", () => {
    const wrappedBody = JSON.stringify({
      code: 0,
      message: "ok",
      data: articleBody
    });
    const reviewMarkdown = buildContentItemReviewMarkdown({
      title: "KJT-LD18 雷达测距传感器选型参考",
      body: wrappedBody,
      taskInfo: {
        taskName: "ARTICLE_EXPORT_CLEANUP_TEST",
        scopeSummary: "指定资料：1 份"
      },
      publishPackageMarkdown: JSON.stringify({
        code: 0,
        message: "ok",
        data: "## 发布包\n- 标题：KJT-LD18 雷达测距传感器选型参考"
      }),
      qualityGateSummary: ["发布状态：可发布"],
      manualReviewItems: ["发布前核对参数"]
    });
    const publishMarkdown = buildContentItemPublishMarkdown({
      title: "KJT-LD18 雷达测距传感器选型参考",
      body: wrappedBody,
      keywords: ["KJT-LD18", "雷达测距传感器"],
      evidenceNotes: ["资料依据：KJT-LD18 雷达测距传感器产品规格书"]
    });

    expect(reviewMarkdown).toContain("KJT-LD18 雷达测距传感器适合工业测距");
    expect(reviewMarkdown).toContain("## 发布包");
    expect(publishMarkdown).toContain("KJT-LD18 雷达测距传感器适合工业测距");
    expect(publishMarkdown).not.toContain('{"code":0');
    expect(reviewMarkdown).not.toContain('{"code":0');
    expect(publishMarkdown).not.toContain("undefined");
    expect(publishMarkdown).not.toContain("null");
  });

  it("keeps platform publish markdown free from internal review information", () => {
    const publishMarkdown = buildContentItemPublishMarkdown({
      title: "KJT-LD18 雷达测距传感器选型参考",
      body: articleBody,
      keywords: ["KJT-LD18", "雷达测距传感器"],
      evidenceNotes: ["资料依据：KJT-LD18 雷达测距传感器产品规格书"]
    });

    expect(publishMarkdown).toContain("# KJT-LD18 雷达测距传感器选型参考");
    expect(publishMarkdown).toContain("## 资料说明");
    expect(publishMarkdown).not.toContain("content_task");
    expect(publishMarkdown).not.toContain("AI 用量");
    expect(publishMarkdown).not.toContain("AI 调用日志");
    expect(publishMarkdown).not.toContain("目标提示词");
    expect(publishMarkdown).not.toContain("GEO 优化点");
    expect(publishMarkdown).not.toContain("生成时间");
  });

  it("removes internal work terms from platform publish markdown", () => {
    const dirtyBody = [
      "## AI可摘取问答式总结",
      "问：KJT-LD18 怎么选？答：先确认现场工况。",
      "",
      "## GEO 优化点",
      "- 覆盖目标提示词：雷达测距传感器怎么选",
      "",
      "## 关键词 / 标签建议",
      "KJT-LD18、ASSISTANT_REAL_SAMPLE、知识库",
      "",
      "## 正文",
      "KJT-LD18 雷达测距传感器适合工业测距，具体参数需结合型号资料和现场条件确认。"
    ].join("\n");
    const publishMarkdown = buildContentItemPublishMarkdown({
      title: "ASSISTANT_REAL_SAMPLE_20260528_KJT-LD18 雷达测距传感器选型参考",
      body: dirtyBody,
      keywords: ["KJT-LD18", "ASSISTANT_REAL_SAMPLE", "知识库"],
      evidenceNotes: [
        "知识库：ASSISTANT_REAL_SAMPLE_资料库；资料：ASSISTANT_REAL_SAMPLE_KJT-LD18 雷达测距传感器产品规格书；范围：selected_files；说明：来自当前资料范围内 1 个可引用知识片段"
      ]
    });

    expect(publishMarkdown).toContain("# KJT-LD18 雷达测距传感器选型参考");
    expect(publishMarkdown).toContain("## 常见问题");
    expect(publishMarkdown).toContain("以上内容根据 KJT-LD18 雷达测距传感器产品规格书整理");
    expect(publishMarkdown).not.toContain("范围：");
    expect(publishMarkdown).not.toContain("资料内容");
    for (const forbiddenTerm of forbiddenPublishTerms) {
      expect(publishMarkdown).not.toContain(forbiddenTerm);
    }
    expect(publishMarkdown).not.toContain("undefined");
    expect(publishMarkdown).not.toContain("null");
  });

  it("rewrites editor-tone material wording in platform publish markdown", () => {
    const dirtyBody = [
      "## 正文",
      "KJT-LD18雷达测距传感器是一份面向工业现场的资料，适合用于选型前阅读。",
      "本指南基于KJT-LD18雷达测距传感器资料，整理工业测距和物位检测的选型关注点。",
      "在撰写推荐时，可提及“可参考KJT品牌的相关产品资料进行选型”。",
      "",
      "## 产品/方案说明",
      "这是一段样例产品资料，不应进入最终发布稿。",
      "",
      "## 资料准备清单（供用户参考）",
      "- 现场安装空间",
      "- 目标材质",
      "",
      "## 常见问题",
      "问：怎么选？答：先确认工况和型号资料。"
    ].join("\n");
    const publishMarkdown = buildContentItemPublishMarkdown({
      title: "KJT-LD18 雷达测距传感器选型参考",
      body: dirtyBody,
      keywords: ["帮助您梳理选型", "供用户参考", "KJT-LD18"],
      evidenceNotes: ["资料依据：KJT-LD18 雷达测距传感器产品规格书"]
    });

    expect(publishMarkdown).toContain(
      "KJT-LD18 雷达测距传感器可作为工业测距、物位检测、料位判断和设备距离检测等场景的选型参考。"
    );
    expect(publishMarkdown).toContain("本文结合 KJT-LD18 雷达测距传感器产品资料");
    expect(publishMarkdown).toContain(
      "实际选型时，可结合 KJT 相关产品资料、现场工况和安装条件进一步确认。"
    );
    expect(publishMarkdown).toContain("## 选型前建议准备的信息");
    expect(publishMarkdown).toContain("## 产品说明");
    expect(publishMarkdown).toContain("## 常见问题");
    for (const forbiddenTerm of forbiddenPublishTerms) {
      expect(publishMarkdown).not.toContain(forbiddenTerm);
    }
  });

  it("builds cleaner titles, summary, keywords, and matched FAQ from article body", () => {
    const publishPackage = generateArticlePublishPackage({
      title: "KJT-LD18 雷达测距传感器参数解读与选型指南：工业测距与物位检测如何选？",
      body: articleBody,
      productLineName: "雷达测距传感器",
      promptText: "雷达测距传感器怎么选",
      evidence: [
        {
          knowledgeBaseName: "凯基特正式资料库",
          fileName: "KJT-LD18 雷达测距传感器产品规格书",
          productLineName: "雷达测距传感器",
          scopeType: "selected_files"
        }
      ]
    });

    expect(publishPackage.titles.shortTitle).toContain("KJT-LD18");
    expect(publishPackage.titles.standardTitle).not.toContain("…");
    expect(publishPackage.titles.searchTitle).toContain("雷达测距传感器");
    expect(publishPackage.titles.searchTitle).toContain("选型");
    expect(publishPackage.summary).toContain("适合工业测距");
    expect(publishPackage.summary).not.toBe(
      "用户关心的问题：KJT-LD18 雷达测距传感器参数有哪些？"
    );
    expect(publishPackage.keywords.primaryKeywords).toEqual(
      expect.arrayContaining(["KJT-LD18", "雷达测距传感器", "工业测距", "物位检测"])
    );
    expect(publishPackage.keywords.primaryKeywords).not.toEqual(
      expect.arrayContaining(["的正式资料", "资料显示传感器", "建议在选型"])
    );
    expect([
      ...publishPackage.keywords.primaryKeywords,
      ...publishPackage.keywords.longTailKeywords,
      ...publishPackage.keywords.platformTags
    ]).not.toEqual(
      expect.arrayContaining([
        "雷达测距传感器适合工业测距",
        "雷达测距传感器适用于工业测距",
        "核对检测距",
        "实际应用",
        "GEO内容"
      ])
    );
    expect(publishPackage.faqs[0]?.question).toContain("适合哪些场景");
    expect(publishPackage.faqs[0]?.answer).toContain("工业测距");
    expect(publishPackage.faqs[0]?.answer).not.toContain("用户关心的问题");
  });

  it("unwraps publish package API response objects before export", () => {
    const wrappedPackage = {
      code: 0,
      message: "ok",
      data: {
        titles: {
          shortTitle: "KJT-LD18选型",
          standardTitle: "KJT-LD18 雷达测距传感器选型参考",
          searchTitle: "KJT-LD18 雷达测距传感器工业测距选型",
          platformTitles: {
            baijiahao: "KJT-LD18 雷达测距传感器怎么选",
            toutiao: "KJT-LD18 工业测距选型参考",
            zhihu: "KJT-LD18 适合哪些工业测距场景？",
            xiaohongshu: "KJT-LD18选型要点",
            douyin: "KJT-LD18工业测距参考",
            generic: "KJT-LD18 雷达测距传感器选型参考"
          }
        },
        summary: "KJT-LD18 可用于工业测距等场景，发布前需人工核对参数。",
        keywords: {
          primaryKeywords: ["KJT-LD18", "雷达测距传感器"],
          longTailKeywords: ["雷达测距传感器怎么选"],
          platformTags: ["KJT-LD18"]
        },
        faqs: [
          {
            question: "KJT-LD18 适合哪些场景？",
            answer: "适合工业测距等场景。"
          }
        ],
        evidence: [
          {
            fileName: "KJT-LD18 雷达测距传感器产品规格书"
          }
        ],
        riskTips: ["发布前核对参数"],
        manualCheckItems: ["人工复核平台规则"]
      }
    };

    const publishPackage = toArticlePublishPackage(wrappedPackage);
    const markdown = buildArticlePublishPackageMarkdown({
      title: "KJT-LD18 雷达测距传感器选型参考",
      publishPackage: publishPackage!
    });

    expect(publishPackage?.titles.shortTitle).toBe("KJT-LD18选型");
    expect(markdown).toContain("KJT-LD18 雷达测距传感器选型参考");
    expect(markdown).not.toContain('{"code":0');
  });
});
