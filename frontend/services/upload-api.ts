import { StandardResponse, UploadDataResponse, SessionPreviewResponse } from "../types/upload";

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

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

    const response = await fetch(`${API_BASE_URL}/uploads/bank-statement`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.errors?.[0] || "Failed to upload bank statement.");
    }

    return response.json();
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

    const response = await fetch(`${API_BASE_URL}/uploads/external-transactions`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.errors?.[0] || "Failed to upload external ledger transactions.");
    }

    return response.json();
  }

  /**
   * Retrieves column mapping and data preview for both uploaded datasets under a session.
   */
  static async getSessionPreview(
    sessionId: string
  ): Promise<StandardResponse<SessionPreviewResponse>> {
    const response = await fetch(`${API_BASE_URL}/preview/${sessionId}`);

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.errors?.[0] || "Failed to retrieve session preview.");
    }

    return response.json();
  }
}
