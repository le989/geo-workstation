import { describe, expect, it } from "vitest";

import {
  sanitizeErrorPreview,
  sanitizeLogMetadata,
  sanitizeLogTitle
} from "../src/modules/usage/usage-sanitizer";

describe("usage log sanitizer", () => {
  it("redacts customer contact and secrets from operation log titles", () => {
    const title = sanitizeLogTitle(
      "客户原问题：手机号 13812345678，微信 wxid_test_12345，需要完整方案"
    );

    expect(title).toContain("138****5678");
    expect(title).toContain("[wechat_redacted]");
    expect(title).not.toContain("13812345678");
    expect(title).not.toContain("wxid_test_12345");
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it("removes raw prompt, body and response fields from metadata", () => {
    const metadata = sanitizeLogMetadata({
      taskId: "task-1",
      prompt: "完整 prompt 不应进入日志",
      body: "完整正文不应进入日志",
      response: "完整 AI response 不应进入日志",
      questionPreview: "电话 13912345678 微信 wechat_abcd01",
      nested: {
        Authorization: "Bearer secret-token",
        safeCount: 2
      }
    }) as Record<string, unknown>;

    expect(metadata).toMatchObject({
      taskId: "task-1",
      questionPreview: "电话 139****5678 微信 [wechat_redacted]",
      nested: {
        safeCount: 2
      }
    });
    expect(metadata.prompt).toBeUndefined();
    expect(metadata.body).toBeUndefined();
    expect(metadata.response).toBeUndefined();
  });

  it("redacts secret assignments and query secrets from error previews", () => {
    const errorPreview = sanitizeErrorPreview(
      "Provider failed Authorization: Bearer abc123 token=raw-token https://x.test/cb?api_key=secret-key&ok=1"
    );

    expect(errorPreview).toContain("Authorization=[secret_redacted]");
    expect(errorPreview).toContain("token=[secret_redacted]");
    expect(errorPreview).toContain("api_key=[secret_redacted]");
    expect(errorPreview).not.toContain("Bearer abc123");
    expect(errorPreview).not.toContain("raw-token");
    expect(errorPreview).not.toContain("secret-key");
  });
});
