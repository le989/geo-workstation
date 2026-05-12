export function incrementGroupCount(
  distribution: Record<string, number>,
  key: string | null | undefined,
  fallback: string
): void {
  const normalizedKey = key && key.trim().length > 0 ? key : fallback;
  distribution[normalizedKey] = (distribution[normalizedKey] ?? 0) + 1;
}

export function groupCount<T>(
  items: T[],
  resolveKey: (item: T) => string | null | undefined,
  fallback: string
): Record<string, number> {
  return items.reduce<Record<string, number>>((distribution, item) => {
    incrementGroupCount(distribution, resolveKey(item), fallback);
    return distribution;
  }, {});
}
