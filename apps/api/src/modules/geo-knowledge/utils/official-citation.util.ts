import {
  KnowledgeReviewStatus,
  KnowledgeTrustLevel,
  Prisma,
  type KnowledgeFile
} from "@prisma/client";

export function buildOfficialCitableKnowledgeFileWhere(
  where: Prisma.KnowledgeFileWhereInput = {}
): Prisma.KnowledgeFileWhereInput {
  return {
    AND: [
      {
        deletedAt: null,
        reviewStatus: KnowledgeReviewStatus.approved,
        trustLevel: {
          not: KnowledgeTrustLevel.low
        }
      },
      where
    ]
  };
}

export function isKnowledgeFileOfficiallyCitable(
  file: Pick<KnowledgeFile, "deletedAt" | "reviewStatus" | "trustLevel">
) {
  return (
    !file.deletedAt &&
    file.reviewStatus === KnowledgeReviewStatus.approved &&
    file.trustLevel !== KnowledgeTrustLevel.low
  );
}
