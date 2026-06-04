export interface StandardResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  errors: string[];
}

export interface UploadDataResponse {
  session_id: string;
  filename: string;
  file_path: string;
  file_type: "BANK_STATEMENT" | "EXTERNAL_LEDGER";
  file_size_kb: number;
}

export interface DatasetPreviewMetrics {
  deposits_count: number;
  withdrawals_count: number;
  total_deposits_volume: number;
  total_withdrawals_volume: number;
  missing_references: number;
}

export interface PreviewDataResponse {
  filename: string;
  total_records: number;
  detected_columns: string[];
  mapped_columns: Record<string, string>;
  preview_rows: Record<string, any>[];
  metrics: DatasetPreviewMetrics;
}

export interface SessionPreviewResponse {
  bank_statement?: PreviewDataResponse;
  external_ledger?: PreviewDataResponse;
}
