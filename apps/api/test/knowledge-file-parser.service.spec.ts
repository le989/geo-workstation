import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it, afterEach, beforeEach } from "vitest";

import { KnowledgeFileParserService } from "../src/modules/geo-knowledge/knowledge-file-parser.service";

describe("KnowledgeFileParserService", () => {
  let parser: KnowledgeFileParserService;
  let tempDir: string;

  beforeEach(async () => {
    parser = new KnowledgeFileParserService();
    tempDir = await mkdtemp(join(tmpdir(), "geo-knowledge-parser-"));
  });

  afterEach(async () => {
    await rm(tempDir, {
      recursive: true,
      force: true
    });
  });

  async function writeTempFile(fileName: string, content: string): Promise<string> {
    const filePath = join(tempDir, fileName);
    await writeFile(filePath, content, "utf8");
    return filePath;
  }

  it("parses txt files into paragraph-based GEO knowledge chunks", async () => {
    const storagePath = await writeTempFile(
      "sensor.txt",
      "激光测距传感器适合高精度距离检测和位置反馈。\n\n过短\n\n选型时要关注量程、精度、响应速度和现场安装条件。"
    );

    const chunks = await parser.parse({
      fileName: "sensor.txt",
      fileType: "txt",
      storagePath
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      title: "sensor 1",
      content: "激光测距传感器适合高精度距离检测和位置反馈。"
    });
  });

  it("parses markdown files by first and second level headings", async () => {
    const storagePath = await writeTempFile(
      "guide.md",
      "# 产品能力\n激光测距传感器可以输出稳定距离数据。\n\n## 应用场景\n行车防撞和料位检测都可以使用激光测距方案。"
    );

    const chunks = await parser.parse({
      fileName: "guide.md",
      fileType: "md",
      storagePath
    });

    expect(chunks.map((chunk) => chunk.title)).toEqual(["产品能力", "应用场景"]);
    expect(chunks[1]?.content).toContain("行车防撞");
  });

  it("parses csv files with title and content columns", async () => {
    const storagePath = await writeTempFile(
      "faq.csv",
      "title,content\n选型FAQ,激光测距传感器选型要关注量程精度和响应速度。\n应用FAQ,行车防撞场景需要稳定测距和快速响应。"
    );

    const chunks = await parser.parse({
      fileName: "faq.csv",
      fileType: "csv",
      storagePath
    });

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toMatchObject({
      title: "选型FAQ",
      content: "激光测距传感器选型要关注量程精度和响应速度。"
    });
  });

  it("throws a parse error for malformed csv files", async () => {
    const storagePath = await writeTempFile("broken.csv", 'title,content\n"未闭合标题,内容');

    await expect(
      parser.parse({
        fileName: "broken.csv",
        fileType: "csv",
        storagePath
      })
    ).rejects.toThrow("CSV parse failed");
  });
});
