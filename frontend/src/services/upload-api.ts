import { StandardResponse, UploadDataResponse, SessionPreviewResponse } from "../types/upload";

import { api } from "./api-client";

export class UploadApiService {
  /**
   * Uploads a bank statement file.
   * If session_id is provided, attaches file to that session, otherwise creates a new one.
   */
  static async uploadBankStatement(
    file: File,
    sessionId?: string
  ): Promise<StandardResponse<UploadDataResponse>> {
    const formData = new FormData();
    formData.append("file", file);
    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    const res = await api.post("/uploads/bank-statement", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return res.data;
  }

  /**
   * Uploads an external ledger/ERP/payment gateway transaction file.
   * If session_id is provided, attaches file to that session, otherwise creates a new one.
   */
  static async uploadExternalTransactions(
    file: File,
    sessionId?: string
  ): Promise<StandardResponse<UploadDataResponse>> {
    const formData = new FormData();
    formData.append("file", file);
    if (sessionId) {
      formData.append("session_id", sessionId);
    }

    const res = await api.post("/uploads/external-transactions", formData, {
      headers: {
        "Content-Type": "multipart/form-data"
      }
    });
    return res.data;
  }

  /**
   * Retrieves column mapping and data preview for both uploaded datasets under a session.
   */
  static async getSessionPreview(
    sessionId: string
  ): Promise<StandardResponse<SessionPreviewResponse>> {
    const res = await api.get(`/preview/${sessionId}`);
    return res.data;
  }
}
