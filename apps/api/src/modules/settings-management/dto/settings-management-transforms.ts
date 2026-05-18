export function trimRequiredString(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

export function trimOptionalString(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : undefined;
}
