import { StandardResponse } from "../types/upload";

// 1. Core TypeScript Interface Definitions for Reconciliation
export interface TransactionRepresentation {
  id: string;
  session_id: string;
  source_type: "BANK_STATEMENT" | "EXTERNAL_LEDGER";
  transaction_date: string;
  amount: number;
  currency: string;
  reference: string | null;
  description: string | null;
  matching_status: string;
}

export interface ReconciliationResult {
  id: string;
  session_id: string;
  bank_transaction_id: string | null;
  ledger_transaction_id: string | null;
  status: "MATCHED" | "PARTIAL_MATCH" | "AMOUNT_MISMATCH" | "DATE_MISMATCH" | "MISSING_IN_BANK" | "MISSING_IN_EXTERNAL" | "DUPLICATE";
  match_score: number;
  remarks: string | null;
  bank_transaction: TransactionRepresentation | null;
  ledger_transaction: TransactionRepresentation | null;
}

export interface ReconciliationSummary {
  total_bank_transactions: number;
  total_external_transactions: number;
  matched_count: number;
  mismatch_count: number;
  unmatched_count: number;
  duplicate_count: number;
  matched_amount: number;
  unmatched_amount: number;
}

export interface RunReconciliationResponse {
  session_id: string;
  status: string;
  summary: ReconciliationSummary;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export class ReconciliationApiService {
  /**
   * Invokes the deterministic matching engine on the session.
   */
  static async runReconciliation(sessionId: string): Promise<StandardResponse<RunReconciliationResponse>> {
    const res = await fetch(`${API_BASE_URL}/reconciliation/run/${sessionId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.detail || `Reconciliation failure with status code ${res.status}`);
    }
    return res.json();
  }

  /**
   * Loads the paired detailed transactional matches.
   */
  static async getReconciliationResults(sessionId: string): Promise<StandardResponse<ReconciliationResult[]>> {
    const res = await fetch(`${API_BASE_URL}/reconciliation/results/${sessionId}`);
    if (!res.ok) {
      throw new Error(`Failed retrieving reconciliation results with status code ${res.status}`);
    }
    return res.json();
  }

  /**
   * Loads the session metrics and aggregate matching numbers.
   */
  static async getReconciliationSummary(sessionId: string): Promise<StandardResponse<ReconciliationSummary>> {
    const res = await fetch(`${API_BASE_URL}/reconciliation/summary/${sessionId}`);
    if (!res.ok) {
      throw new Error(`Failed retrieving reconciliation summary with status code ${res.status}`);
    }
    return res.json();
  }

  /**
   * Computes the download URL for exporting results as CSV or Excel sheets.
   */
  static getExportUrl(sessionId: string, format: "csv" | "xlsx"): string {
    return `${API_BASE_URL}/reconciliation/export/${sessionId}?format=${format}`;
  }
}
