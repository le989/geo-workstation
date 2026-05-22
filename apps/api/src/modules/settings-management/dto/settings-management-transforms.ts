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

export function trimNullableString(value: unknown): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const trimmed = String(value).trim();
  return trimmed ? trimmed : null;
}
