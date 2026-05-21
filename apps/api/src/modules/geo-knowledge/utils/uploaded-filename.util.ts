const DEFAULT_UPLOADED_FILENAME = "uploaded-file";
const MOJIBAKE_MARKERS = /[ÃÂ]|(?:å|ä|æ|ç|è|é|ì|í|î|ï|ð|ñ|ò|ó|ô|õ|ö|÷|ø|ù|ú|û|ü|ý|þ|ÿ)/i;
const REPLACEMENT_CHAR = /\uFFFD/;
const REPLACEMENT_CHARS = /\uFFFD/g;
const CJK_CHAR = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

export function normalizeUploadedFilename(originalname: string | undefined | null): string {
  const rawName = String(originalname ?? "").trim();
  const decodedName = tryDecodeLatin1AsUtf8(rawName);
  const sanitizedOriginal = sanitizeUploadedDisplayFilename(rawName);
  const sanitizedDecoded = sanitizeUploadedDisplayFilename(decodedName);

  if (shouldUseDecodedFilename(sanitizedOriginal, sanitizedDecoded)) {
    return sanitizedDecoded;
  }

  return sanitizedOriginal || sanitizedDecoded || DEFAULT_UPLOADED_FILENAME;
}

function tryDecodeLatin1AsUtf8(value: string): string {
  if (!value) {
    return "";
  }

  try {
    return Buffer.from(value, "latin1").toString("utf8");
  } catch {
    return "";
  }
}

function shouldUseDecodedFilename(original: string, decoded: string): boolean {
  if (!decoded || decoded === original || REPLACEMENT_CHAR.test(decoded)) {
    return false;
  }

  const originalLooksBroken =
    MOJIBAKE_MARKERS.test(original) ||
    REPLACEMENT_CHAR.test(original) ||
    original.split("").some(isControlChar);
  const decodedAddsChinese = countCjkChars(decoded) > countCjkChars(original);

  return originalLooksBroken && decodedAddsChinese && qualityScore(decoded) > qualityScore(original);
}

function sanitizeUploadedDisplayFilename(value: string): string {
  return value
    .replace(/[\\/]+/g, "_")
    .replace(/[<>:"|?*]+/g, "_")
    .split("")
    .filter((char) => !isControlChar(char))
    .join("")
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .replace(/^[._\s]+|[._\s]+$/g, "")
    .trim();
}

function countCjkChars(value: string): number {
  return value.match(CJK_CHAR)?.length ?? 0;
}

function qualityScore(value: string): number {
  const cjkCount = countCjkChars(value);
  const replacementCount = value.match(REPLACEMENT_CHARS)?.length ?? 0;
  const markerCount = value.match(MOJIBAKE_MARKERS)?.length ?? 0;
  const controlCount = value.split("").filter(isControlChar).length;

  return cjkCount * 6 - replacementCount * 20 - controlCount * 10 - markerCount * 3;
}

function isControlChar(char: string): boolean {
  const codePoint = char.charCodeAt(0);
  return codePoint <= 31 || (codePoint >= 127 && codePoint <= 159);
}
