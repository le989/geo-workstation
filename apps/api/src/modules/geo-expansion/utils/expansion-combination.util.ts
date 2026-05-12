export type ExpansionRuleType =
  | "prefix_base"
  | "base_application"
  | "prefix_base_application"
  | "base_service"
  | "prefix_base_service"
  | "base_service_application"
  | "prefix_base_service_application";

export type ExpansionCombinationInput = {
  baseWord: string;
  prefixes?: string[];
  serviceSuffixes?: string[];
  applicationSuffixes?: string[];
};

export type ExpansionCombination = {
  promptText: string;
  ruleType: ExpansionRuleType;
};

export function generateExpansionCombinations(
  input: ExpansionCombinationInput
): ExpansionCombination[] {
  const baseWord = input.baseWord.trim();
  const prefixes = normalizeParts(input.prefixes);
  const serviceSuffixes = normalizeParts(input.serviceSuffixes);
  const applicationSuffixes = normalizeParts(input.applicationSuffixes);
  const combinations: ExpansionCombination[] = [];

  for (const prefix of prefixes) {
    combinations.push({
      promptText: joinExpansionParts(prefix, baseWord),
      ruleType: "prefix_base"
    });
  }

  for (const applicationSuffix of applicationSuffixes) {
    combinations.push({
      promptText: joinExpansionParts(baseWord, applicationSuffix),
      ruleType: "base_application"
    });
  }

  for (const prefix of prefixes) {
    for (const applicationSuffix of applicationSuffixes) {
      combinations.push({
        promptText: joinExpansionParts(prefix, baseWord, applicationSuffix),
        ruleType: "prefix_base_application"
      });
    }
  }

  for (const serviceSuffix of serviceSuffixes) {
    combinations.push({
      promptText: joinExpansionParts(baseWord, serviceSuffix),
      ruleType: "base_service"
    });
  }

  for (const prefix of prefixes) {
    for (const serviceSuffix of serviceSuffixes) {
      combinations.push({
        promptText: joinExpansionParts(prefix, baseWord, serviceSuffix),
        ruleType: "prefix_base_service"
      });
    }
  }

  for (const serviceSuffix of serviceSuffixes) {
    for (const applicationSuffix of applicationSuffixes) {
      combinations.push({
        promptText: joinExpansionParts(baseWord, serviceSuffix, applicationSuffix),
        ruleType: "base_service_application"
      });
    }
  }

  for (const prefix of prefixes) {
    for (const serviceSuffix of serviceSuffixes) {
      for (const applicationSuffix of applicationSuffixes) {
        combinations.push({
          promptText: joinExpansionParts(prefix, baseWord, serviceSuffix, applicationSuffix),
          ruleType: "prefix_base_service_application"
        });
      }
    }
  }

  return combinations.filter((combination) => combination.promptText.length > 0);
}

function normalizeParts(parts: string[] | undefined): string[] {
  return (parts ?? []).map((part) => part.trim()).filter(Boolean);
}

function joinExpansionParts(...parts: string[]): string {
  return parts
    .map((part) => part.trim())
    .filter(Boolean)
    .join("");
}
