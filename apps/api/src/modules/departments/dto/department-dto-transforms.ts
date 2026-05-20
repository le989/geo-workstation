export function trimRequiredString(value: unknown): unknown {
  return typeof value === "string" ? value.trim() : value;
}
