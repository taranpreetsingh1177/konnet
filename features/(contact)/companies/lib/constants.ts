export const Companies = {
  EnrichmentStatus: {
    PENDING: "pending",
    PROCESSING: "processing",
    COMPLETED: "completed",
    FAILED: "failed",
  },
} as const;

export type CompanyEnrichmentStatus =
  typeof Companies.EnrichmentStatus[keyof typeof Companies.EnrichmentStatus];
