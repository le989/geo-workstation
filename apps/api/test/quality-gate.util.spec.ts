import { describe, expect, it } from "vitest";

import { buildQualityGateResult } from "../src/modules/geo-content/utils/quality-gate.util";
import type { ContentQualityCheckResponse } from "../src/modules/geo-content/content-items.service";

const baseQualityResult: ContentQualityCheckResponse = {
  score: 92,
  level: "good",
  summary: "质量较好，发布前轻微校对即可。",
  riskItems: [],
  positiveItems: ["结构清晰"],
  publishReadiness: {
    canPublish: true,
    needsHumanReview: false,
    suggestedAction: "可发布"
  }
};

describe("buildQualityGateResult", () => {
  it("persists a stable needs_review gate when article text contains forbidden words", () => {
    const checkedAt = new Date("2026-05-27T10:00:00.000Z");
    const gate = buildQualityGateResult({
      qualityResult: baseQualityResult,
      title: "KJT-LD18 雷达测距传感器选型参考",
      body: "安装时最好对准目标中心，输出方式需结合现场工况确认。",
      provider: "mock",
      model: "mock-content-v1",
      checkedAt,
      scopeSummary: {
        knowledgeBaseId: "kb_1",
        scopeType: "selected_files",
        selectedFileCount: 1
      }
    });

    expect(gate.publishStatus).toBe("needs_review");
    expect(gate.forbiddenWordHits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          word: "最好",
          field: "body"
        })
      ])
    );
    expect(gate.manualReviewItems).toEqual(
      expect.arrayContaining([expect.stringContaining("风险词")])
    );
    expect(gate.checkedAt).toBe("2026-05-27T10:00:00.000Z");
  });

  it("marks low-scored risky content as not_recommended", () => {
    const gate = buildQualityGateResult({
      qualityResult: {
        ...baseQualityResult,
        score: 42,
        level: "risky",
        riskItems: [
          {
            type: "unsupported_claim",
            severity: "high",
            text: "客户案例",
            reason: "正文出现未证实客户案例。",
            suggestion: "删除该表述。"
          }
        ],
        publishReadiness: {
          canPublish: false,
          needsHumanReview: true,
          suggestedAction: "暂不建议发布"
        }
      },
      title: "KJT-LD18 雷达测距传感器选型参考",
      body: "正文编造客户案例和市场排名。",
      provider: "mock",
      model: "mock-content-v1",
      checkedAt: new Date("2026-05-27T10:05:00.000Z"),
      scopeSummary: {
        knowledgeBaseId: "kb_1",
        scopeType: "selected_files",
        selectedFileCount: 1
      }
    });

    expect(gate.publishStatus).toBe("not_recommended");
    expect(gate.factBoundaryIssues.length).toBeGreaterThan(0);
    expect(gate.level).toBe("high");
  });

  it("keeps clean high-score content publish_ready with scope summary", () => {
    const gate = buildQualityGateResult({
      qualityResult: baseQualityResult,
      title: "KJT-LD18 雷达测距传感器选型参考",
      body: "## 选型建议\n建议结合检测距离、安装条件和现场工况确认。\n## FAQ\n问：选型前要确认什么？答：确认目标材质、距离范围和输出方式。",
      provider: "mock",
      model: "mock-content-v1",
      checkedAt: new Date("2026-05-27T10:10:00.000Z"),
      scopeSummary: {
        knowledgeBaseId: "kb_1",
        scopeType: "selected_files",
        selectedFileCount: 1
      }
    });

    expect(gate.publishStatus).toBe("publish_ready");
    expect(gate.forbiddenWordHits).toHaveLength(0);
    expect(gate.aiStyleIssues).toHaveLength(0);
    expect(gate.scopeSummary).toMatchObject({
      knowledgeBaseId: "kb_1",
      scopeType: "selected_files",
      selectedFileCount: 1
    });
  });
});
