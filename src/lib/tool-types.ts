// Shared Data Contracts & Tool Types

export interface SourceFreshnessEntry {
  table: string;
  maxTimestamp: string;
  rowsExamined: number;
}

export interface ToolMetadata {
  toolName: string;
  queryParameters: Record<string, any>;
  resolvedDateRange: { start: string; end: string };
  roleScope: string | null;
  rowsExamined: number;
  computedMetrics: Record<string, number | string>;
  sourceTables: string[];
  sourceFreshness?: SourceFreshnessEntry[];
  queriedAt: string;
  sourceMaxTimestamp: string;
  warnings: string[];
  reconciliationStatus: "VERIFIED" | "MISMATCH" | "PARTIAL" | "UNKNOWN";
  freshnessStatus: "FRESH" | "STALE" | "PARTIAL" | "UNKNOWN";
  syncStatus: "VERIFIED" | "UNKNOWN";
}

export interface ToolResult<T> {
  data: T;
  meta: ToolMetadata;
}

export interface ConfidenceDetails {
  confidenceScore: number | null;
  confidenceBand: "HIGH" | "MEDIUM" | "LOW" | "UNKNOWN";
  confidenceReasons: string[];
  components: {
    dataCompletenessScore: number | string;
    temporalAlignmentScore: number | string;
    sourceCoverageScore: number | string;
    reconciliationScore: number | string;
    sampleAdequacyScore: number | string;
    forecastReliabilityScore: number | string;
    contradictionScore: number | string;
  };
}

export interface ClaimProvenance {
  claimId: string;
  claimText: string;
  numericValue: number;
  unit: string;
  claimType: string;
  provenanceType: "DIRECT" | "CALCULATED" | "FORECAST" | "ASSUMPTION" | "UNSUPPORTED";
  sourceTool?: string;
  sourceMetric?: string;
  calculationId?: string;
  evidenceIds: string[];
  assumptionIds: string[];
}

export interface AIResponseContract {
  answer: string;
  summary: string;
  evidence: Array<{
    label: string;
    value: string;
    sourceType?: string;
    sourceId?: string;
  }>;
  reasoning: string[];
  recommendedActions: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    estimatedImpact?: string;
    actionType:
      | "CREATE_PO"
      | "APPLY_MARKDOWN"
      | "OPEN_PRODUCT"
      | "OPEN_CUSTOMER"
      | "OPEN_SUPPLIER"
      | "INVESTIGATE_ANOMALY"
      | "NAVIGATE";
    entityId?: string;
  }>;
  risks: Array<{
    title: string;
    severity: "high" | "medium" | "low";
  }>;
  confidenceDetails?: ConfidenceDetails;
  claimProvenances?: ClaimProvenance[];
  unsupportedClaims?: string[];
  warnings?: string[];
  freshnessDetails?: {
    queriedAt: string;
    sourceMaxTimestamp: string;
    syncStatus: string;
    dataAgeSeconds: number;
  };
  confidence?: number;
}

export interface ShadowLog {
  requestId: string;
  questionHash: string;
  intent: string;
  toolsSelected: string[];
  evidenceCount: number;
  unsupportedClaimCount: number;
  latencyMs: number;
  warnings: string[];
  oldQualityScore: number;
  newQualityScore: number;
  timestamp: string;
}
