import { StandardResponse } from "../../../types/upload";

import { api } from "../../../services/api-client";

export class InvestigationApiService {
  static async getAnalytics(sessionId: string): Promise<StandardResponse<any>> {
    const res = await api.get(`/investigation/analytics/${sessionId}`);
    return res.data;
  }

  static async getFuzzyMatches(sessionId: string): Promise<StandardResponse<any[]>> {
    const res = await api.get(`/investigation/fuzzy-matches/${sessionId}`);
    return res.data;
  }

  static async getMerchantIntelligence(sessionId: string): Promise<StandardResponse<any[]>> {
    const res = await api.get(`/investigation/merchant-intelligence/${sessionId}`);
    return res.data;
  }

  static async getAnomalies(sessionId: string): Promise<StandardResponse<any[]>> {
    const res = await api.get(`/investigation/anomalies/${sessionId}`);
    return res.data;
  }

  static async chatWithAssistant(sessionId: string, query: string): Promise<StandardResponse<any>> {
    const res = await api.post(`/ai-assistant/chat/${sessionId}`, { query });
    return res.data;
  }

  static async downloadExport(sessionId: string, format: "csv" | "xlsx" | "pdf"): Promise<void> {
    const res = await api.get(`/reports/investigation/${sessionId}?format=${format}`, {
      responseType: 'blob'
    });
    
    // Create hidden anchor element to trigger download
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `investigation_report_${sessionId}.${format}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }
}
