import { StandardResponse } from "../../../types/upload";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1";

export class InvestigationApiService {
  static async getAnalytics(sessionId: string): Promise<StandardResponse<any>> {
    const res = await fetch(`${API_BASE_URL}/investigation/analytics/${sessionId}`);
    if (!res.ok) throw new Error("Failed fetching analytics");
    return res.json();
  }

  static async getFuzzyMatches(sessionId: string): Promise<StandardResponse<any[]>> {
    const res = await fetch(`${API_BASE_URL}/investigation/fuzzy-matches/${sessionId}`);
    if (!res.ok) throw new Error("Failed fetching fuzzy matches");
    return res.json();
  }

  static async getMerchantIntelligence(sessionId: string): Promise<StandardResponse<any[]>> {
    const res = await fetch(`${API_BASE_URL}/investigation/merchant-intelligence/${sessionId}`);
    if (!res.ok) throw new Error("Failed fetching merchant intelligence");
    return res.json();
  }

  static async getAnomalies(sessionId: string): Promise<StandardResponse<any[]>> {
    const res = await fetch(`${API_BASE_URL}/investigation/anomalies/${sessionId}`);
    if (!res.ok) throw new Error("Failed fetching anomalies");
    return res.json();
  }

  static async chatWithAssistant(sessionId: string, query: string): Promise<StandardResponse<any>> {
    const res = await fetch(`${API_BASE_URL}/ai-assistant/chat/${sessionId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query })
    });
    if (!res.ok) throw new Error("AI Chat failed");
    return res.json();
  }

  static getReportUrl(sessionId: string, format: "csv" | "xlsx" | "pdf"): string {
    return `${API_BASE_URL}/reports/investigation/${sessionId}?format=${format}`;
  }
}
