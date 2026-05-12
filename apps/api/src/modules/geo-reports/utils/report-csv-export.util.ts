function csvValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  const rawValue = value instanceof Date ? value.toISOString() : String(value);
  const escapedValue = rawValue.replace(/"/g, '""');

  if (/[",\n\r]/.test(escapedValue)) {
    return `"${escapedValue}"`;
  }

  return escapedValue;
}

export function buildMetricCsv(metrics: Record<string, unknown>): string {
  const rows = Object.entries(metrics).map(([metric, value]) => [
    metric,
    typeof value === "object" && value !== null ? JSON.stringify(value) : value
  ]);

  return buildRowsCsv(["metric", "value"], rows);
}

export function buildRowsCsv(headers: string[], rows: unknown[][]): string {
  return [headers, ...rows].map((row) => row.map(csvValue).join(",")).join("\n");
}
