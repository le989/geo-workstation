export function parseImportBoolean(value: unknown, fieldName: string): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    if (value === 1) {
      return true;
    }
    if (value === 0) {
      return false;
    }
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes", "y", "是"].includes(normalized)) {
      return true;
    }

    if (["false", "0", "no", "n", "否"].includes(normalized)) {
      return false;
    }
  }

  throw new Error(`${fieldName} must be a boolean value`);
}
