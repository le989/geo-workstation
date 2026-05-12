export type DateRangeQuery = {
  from?: Date;
  to?: Date;
};

export function buildDateRangeFilter(
  query: DateRangeQuery
): { gte?: Date; lte?: Date } | undefined {
  if (!query.from && !query.to) {
    return undefined;
  }

  return {
    ...(query.from ? { gte: query.from } : {}),
    ...(query.to ? { lte: query.to } : {})
  };
}
