import { BadRequestException } from "@nestjs/common";
import { toOptionalInt, toStringArray } from "../dto/content-dto-transforms";
import type { QueryContentItemsDto } from "../dto/query-content-items.dto";
import type { UpdateContentItemDto } from "../dto/update-content-item.dto";

const MIN_CONTENT_BODY_LENGTH = 20;

export type NormalizedQueryContentItems = {
  page: number;
  pageSize: number;
  search?: string;
  taskId?: string;
  geoPromptId?: string;
  status?: string;
};

export type NormalizedUpdateContentItem = {
  title?: string;
  body?: string;
  geoOptimizationPoints?: string[];
  suggestedPublishChannel?: string;
  status?: string;
};

export function normalizeQueryContentItems(
  input: QueryContentItemsDto,
  defaultPage = 1,
  defaultPageSize = 20
): NormalizedQueryContentItems {
  return {
    page: Math.max(toOptionalInt(input.page) ?? defaultPage, 1),
    pageSize: Math.min(Math.max(toOptionalInt(input.pageSize) ?? defaultPageSize, 1), 100),
    search: trimOptional(input.search),
    taskId: trimOptional(input.taskId),
    geoPromptId: trimOptional(input.geoPromptId),
    status: trimOptional(input.status)
  };
}

export function normalizeUpdateContentItem(
  input: UpdateContentItemDto
): NormalizedUpdateContentItem {
  const normalized: NormalizedUpdateContentItem = {};

  if (input.title !== undefined) {
    normalized.title = trimRequired(input.title);
    assertRequired("GEO content item title", normalized.title);
  }
  if (input.body !== undefined) {
    normalized.body = trimRequired(input.body);
    assertRequired("GEO content item body", normalized.body);

    if (normalized.body.length < MIN_CONTENT_BODY_LENGTH) {
      throw new BadRequestException(
        `GEO content item body must be at least ${MIN_CONTENT_BODY_LENGTH} characters`
      );
    }
  }
  if (input.geoOptimizationPoints !== undefined) {
    normalized.geoOptimizationPoints = toStringArray(input.geoOptimizationPoints);
  }
  if (input.suggestedPublishChannel !== undefined) {
    normalized.suggestedPublishChannel = trimOptional(input.suggestedPublishChannel);
  }
  if (input.status !== undefined) {
    normalized.status = trimOptional(input.status);
  }

  return normalized;
}

export function jsonStringArray(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return [];
}

export function trimOptional(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function trimRequired(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function assertRequired(label: string, value: string): void {
  if (value.length === 0) {
    throw new BadRequestException(`${label} cannot be empty`);
  }
}
