import { BadRequestException } from "@nestjs/common";
import { describe, expect, it } from "vitest";

import { normalizeCreateContentTask } from "../src/modules/geo-content/utils/normalize-content-task";

const baseInput = {
  name: "CONTENT_SCOPE_1_SMOKE_20260526_测试任务",
  generationType: "article",
  geoPromptIds: ["prompt-1"]
};

describe("content task knowledge scope normalization", () => {
  it("defaults scope type to all", () => {
    const normalized = normalizeCreateContentTask(baseInput as never);

    expect(normalized.scopeType).toBe("all");
    expect(normalized.selectedKnowledgeFileIds).toEqual([]);
  });

  it("requires productLineId for product_line scope", () => {
    expect(() =>
      normalizeCreateContentTask({
        ...baseInput,
        scopeType: "product_line"
      } as never)
    ).toThrow(BadRequestException);
  });

  it("requires 1 to 10 selected files for selected_files scope", () => {
    expect(() =>
      normalizeCreateContentTask({
        ...baseInput,
        scopeType: "selected_files",
        selectedKnowledgeFileIds: []
      } as never)
    ).toThrow(BadRequestException);

    expect(() =>
      normalizeCreateContentTask({
        ...baseInput,
        scopeType: "selected_files",
        selectedKnowledgeFileIds: Array.from({ length: 11 }, (_, index) => `file-${index}`)
      } as never)
    ).toThrow(BadRequestException);

    const normalized = normalizeCreateContentTask({
      ...baseInput,
      scopeType: "selected_files",
      selectedKnowledgeFileIds: ["file-1", "file-1", "file-2"]
    } as never);

    expect(normalized.selectedKnowledgeFileIds).toEqual(["file-1", "file-2"]);
  });
});
