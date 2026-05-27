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
    expect(publishMarkdown).toContain("## 资料依据");
    expect(publishMarkdown).not.toContain("content_task");
    expect(publishMarkdown).not.toContain("AI 用量");
    expect(publishMarkdown).not.toContain("AI 调用日志");
    expect(publishMarkdown).not.toContain("目标提示词");
    expect(publishMarkdown).not.toContain("GEO 优化点");
    expect(publishMarkdown).not.toContain("生成时间");
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
