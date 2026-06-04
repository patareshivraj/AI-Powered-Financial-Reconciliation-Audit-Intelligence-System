import { StandardResponse } from "../../../types/upload";
import { api } from "../../../services/api-client";

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

export class AiApiService {
  /**
   * Generates or fetches an assistive AI breakdown explanation of a discrepant transaction.
   */
  static async explainMismatch(resultId: string): Promise<StandardResponse<MismatchExplanation>> {
    const res = await api.get(`/ai/explain-mismatch/${resultId}`);
    return res.data;
  }

  /**
   * Generates or fetches rate-limited high-level AI dashboard insights and audit summaries.
   */
  static async getAiSummary(sessionId: string): Promise<StandardResponse<ReconciliationAiSummary>> {
    const res = await api.get(`/ai/reconciliation-summary/${sessionId}`);
    return res.data;
  }

  /**
   * Generates operational insights across the workspace.
   */
  static async getOperationalInsights(sessionId: string): Promise<StandardResponse<OperationalInsights>> {
    const res = await api.post(`/ai/operational-insights/${sessionId}`);
    return res.data;
  }
}
