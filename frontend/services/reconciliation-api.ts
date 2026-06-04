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



import { api } from "./api-client";

export class ReconciliationApiService {
  /**
   * Invokes the deterministic matching engine on the session.
   */
  static async runReconciliation(sessionId: string): Promise<StandardResponse<RunReconciliationResponse>> {
    const res = await api.post(`/reconciliation/run/${sessionId}`);
    return res.data;
  }

  /**
   * Loads the paired detailed transactional matches.
   */
  static async getReconciliationResults(sessionId: string): Promise<StandardResponse<ReconciliationResult[]>> {
    const res = await api.get(`/reconciliation/results/${sessionId}`);
    return res.data;
  }

  /**
   * Loads the session metrics and aggregate matching numbers.
   */
  static async getReconciliationSummary(sessionId: string): Promise<StandardResponse<ReconciliationSummary>> {
    const res = await api.get(`/reconciliation/summary/${sessionId}`);
    return res.data;
  }


  /**
   * Securely downloads an exported report using the JWT token and Blob manipulation.
   */
  static async downloadExport(sessionId: string, format: "csv" | "xlsx"): Promise<void> {
    const res = await api.get(`/reconciliation/export/${sessionId}?format=${format}`, {
      responseType: 'blob'
    });
    
    // Create hidden anchor element to trigger download
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reconciliation_export_${sessionId}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}

