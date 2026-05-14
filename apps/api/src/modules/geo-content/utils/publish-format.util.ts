import type { PublishFormatStyle } from "../dto/format-content-item-for-publish.dto";

export type FormattedPublishContent = {
  title: string;
  html: string;
  markdown: string;
  plainText: string;
  style: PublishFormatStyle;
  copyTips: string[];
};

type BuildFormattedPublishContentInput = {
  title: string;
  body: string;
  style?: PublishFormatStyle;
  includeGeoNotes?: boolean;
  includeWarnings?: boolean;
};

const STYLE_LABEL_MAP: Record<PublishFormatStyle, string> = {
  general: "通用发布稿",
  website: "官网文章",
  zhihu_baijiahao: "知乎 / 百家号",
  wechat: "公众号草稿"
};

const STYLE_TIPS_MAP: Record<PublishFormatStyle, string[]> = {
  general: ["可复制到大多数内容平台编辑器。", "不同平台可能会过滤部分样式，发布前请预览。"],
  website: ["适合官网 CMS、SEO 站或技术文章编辑器。", "建议发布前核对标题层级和内链位置。"],
  zhihu_baijiahao: [
    "适合知乎、百家号等平台的问答式或短段落阅读。",
    "平台可能会重置字号和颜色，建议粘贴后预览。"
  ],
  wechat: ["适合粘贴到公众号草稿箱。", "公众号可能过滤部分样式，建议人工预览后再发布。"]
};

const ARTICLE_STYLE_MAP: Record<PublishFormatStyle, string> = {
  general:
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#1f2937;line-height:1.8;font-size:16px;",
  website:
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#172033;line-height:1.78;font-size:16px;",
  zhihu_baijiahao:
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#1f2933;line-height:1.85;font-size:16px;",
  wechat:
    "font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;color:#2f3744;line-height:1.9;font-size:16px;"
};

const HEADING_STYLE_MAP: Record<PublishFormatStyle, string> = {
  general: "margin:28px 0 12px;font-weight:700;color:#172033;",
  website:
    "margin:30px 0 12px;font-weight:700;color:#14315f;border-left:4px solid #2f6fed;padding-left:12px;",
  zhihu_baijiahao: "margin:26px 0 12px;font-weight:700;color:#1f2933;",
  wechat:
    "margin:28px 0 14px;font-weight:700;color:#14315f;border-left:4px solid #5b8def;padding-left:12px;"
};

export function buildFormattedPublishContent(
  input: BuildFormattedPublishContentInput
): FormattedPublishContent {
  const style = input.style ?? "general";
  const title = input.title.trim();
  const body = normalizeLineBreaks(input.body);
  const markdown = buildMarkdown(title, body, input.includeGeoNotes, input.includeWarnings);
  const html = buildHtml(title, markdown, style);

  return {
    title,
    html,
    markdown,
    plainText: markdownToPlainText(markdown),
    style,
    copyTips: STYLE_TIPS_MAP[style]
  };
}

function buildMarkdown(
  title: string,
  body: string,
  includeGeoNotes?: boolean,
  includeWarnings?: boolean
): string {
  const sections = [`# ${title}`, body];

  if (includeGeoNotes) {
    sections.push(
      [
        "## GEO 发布提示",
        "- 保留清晰小标题、列表、FAQ、判断逻辑和适用边界，便于 AI 摘取。",
        "- 发布前建议核对目标提示词、知识库事实和品牌表达是否一致。"
      ].join("\n")
    );
  }

  if (includeWarnings) {
    sections.push(
      [
        "## 发布前确认",
        "- 富文本排版只做格式转换，不新增事实、不自动发布、不覆盖原内容项。",
        "- 涉及型号、参数、协议、认证、价格、交期、案例和效果承诺时，仍需人工复核。"
      ].join("\n")
    );
  }

  return sections
    .map((section) => section.trim())
    .filter(Boolean)
    .join("\n\n");
}

function buildHtml(title: string, markdown: string, style: PublishFormatStyle): string {
  const bodyHtml = markdownToHtml(markdown, style);
  const safeStyleLabel = escapeHtml(STYLE_LABEL_MAP[style]);

  return [
    `<article data-publish-style="${style}" style="${ARTICLE_STYLE_MAP[style]}max-width:760px;margin:0 auto;padding:8px 0;">`,
    `<p style="margin:0 0 12px;color:#64748b;font-size:14px;">${safeStyleLabel}</p>`,
    bodyHtml,
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0 18px;">`,
    `<p style="margin:0;color:#64748b;font-size:14px;">发布前请人工预览，不同平台可能会过滤部分样式。</p>`,
    `</article>`
  ].join("\n");
}

function markdownToHtml(markdown: string, style: PublishFormatStyle): string {
  const lines = markdown.split("\n");
  const html: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let blockquoteLines: string[] = [];

  const closeList = () => {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  };
  const closeBlockquote = () => {
    if (blockquoteLines.length > 0) {
      html.push(
        `<blockquote style="margin:18px 0;padding:12px 16px;background:#f8fafc;border-left:4px solid #94a3b8;color:#475569;">${blockquoteLines
          .map((line) => inlineMarkdownToHtml(line))
          .join("<br>")}</blockquote>`
      );
      blockquoteLines = [];
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      closeList();
      closeBlockquote();
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      closeList();
      closeBlockquote();
      const level = Math.min(headingMatch[1].length, 3);
      const tag = `h${level}`;
      const margin =
        level === 1
          ? "margin:0 0 18px;font-size:28px;line-height:1.35;color:#0f172a;"
          : `${HEADING_STYLE_MAP[style]}font-size:${level === 2 ? "21px" : "18px"};line-height:1.45;`;
      html.push(`<${tag} style="${margin}">${inlineMarkdownToHtml(headingMatch[2])}</${tag}>`);
      continue;
    }

    if (/^---+$/.test(line)) {
      closeList();
      closeBlockquote();
      html.push(`<hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">`);
      continue;
    }

    if (line.startsWith(">")) {
      closeList();
      blockquoteLines.push(line.replace(/^>\s?/, ""));
      continue;
    }

    const unorderedMatch = line.match(/^[-*]\s+(.+)$/);
    if (unorderedMatch) {
      closeBlockquote();
      if (listType !== "ul") {
        closeList();
        html.push(`<ul style="margin:12px 0 18px;padding-left:1.25em;">`);
        listType = "ul";
      }
      html.push(`<li style="margin:6px 0;">${inlineMarkdownToHtml(unorderedMatch[1])}</li>`);
      continue;
    }

    const orderedMatch = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedMatch) {
      closeBlockquote();
      if (listType !== "ol") {
        closeList();
        html.push(`<ol style="margin:12px 0 18px;padding-left:1.4em;">`);
        listType = "ol";
      }
      html.push(`<li style="margin:6px 0;">${inlineMarkdownToHtml(orderedMatch[1])}</li>`);
      continue;
    }

    closeList();
    closeBlockquote();
    html.push(`<p style="margin:12px 0;">${inlineMarkdownToHtml(line)}</p>`);
  }

  closeList();
  closeBlockquote();

  return html.join("\n");
}

function inlineMarkdownToHtml(value: string): string {
  return escapeHtml(value).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function markdownToPlainText(markdown: string): string {
  return markdown
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeLineBreaks(value: string): string {
  return value.replace(/\r\n?/g, "\n").trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
