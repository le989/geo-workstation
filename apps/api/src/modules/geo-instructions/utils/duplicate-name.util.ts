export function buildInstructionTemplateCopyName(sourceName: string): string {
  return `${sourceName} 副本`;
}

export function buildInstructionTemplateNumberedCopyName(
  baseName: string,
  sequence: number
): string {
  return `${baseName} ${sequence}`;
}
