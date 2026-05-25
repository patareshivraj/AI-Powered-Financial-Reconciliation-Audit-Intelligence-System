import { StandardResponse } from "../../../types/upload";

export interface MismatchExplanation {
  status: string;
  explanation: string;
  confidence_score: number;
  confidence_indicator: string;
}

export interface ReconciliationAiSummary {
  summary: string;
  confidence_score: number;
  confidence_indicator: string;
}

export interface OperationalInsights {
  insights: string[];
  confidence_score: number;
  confidence_indicator: string;
}

export interface NarrationCategory {
  merchant: string;
  category: string;
  payment_mode: string;
  confidence_score: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export class AiApiService {
  /**
   * Generates or fetches an assistive AI breakdown explanation of a discrepant transaction.
   */
  static async explainMismatch(resultId: string): Promise<StandardResponse<MismatchExplanation>> {
    const res = await fetch(`${API_BASE_URL}/ai/explain-mismatch/${resultId}`);
    if (!res.ok) {
      throw new Error(`Failed explaining discrepancy with status code ${res.status}`);
    }
    return res.json();
  }

  /**
   * Generates or fetches rate-limited high-level AI dashboard insights and audit summaries.
   */
  static async getAiSummary(sessionId: string): Promise<StandardResponse<ReconciliationAiSummary>> {
    const res = await fetch(`${API_BASE_URL}/ai/reconciliation-summary/${sessionId}`);
    if (!res.ok) {
      throw new Error(`Failed retrieving AI insights with status code ${res.status}`);
    }
    return res.json();
  }

  /**
   * Generates operational insights across the workspace.
   */
  static async getOperationalInsights(sessionId: string): Promise<StandardResponse<OperationalInsights>> {
    const res = await fetch(`${API_BASE_URL}/ai/operational-insights/${sessionId}`, { method: "POST" });
    if (!res.ok) {
      throw new Error(`Failed retrieving operational insights with status code ${res.status}`);
    }
    return res.json();
  }
}
