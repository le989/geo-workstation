export function normalizeTags(value: unknown): string[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (trimmed.length === 0) {
      return [];
    }

    if (trimmed.startsWith("[")) {
      try {
        return normalizeTags(JSON.parse(trimmed) as unknown);
      } catch {
        return [trimmed];
      }
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

export function jsonTagsToArray(value: unknown): string[] {
  return normalizeTags(value);
}
