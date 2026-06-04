import { StandardResponse } from "../../../types/upload";
import { api } from "../../../services/api-client";

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: string;
  org_id: string;
}

export class AuthApiService {
  /**
   * Attempts to signup a new user. 
   * If it fails (e.g. user already exists), we catch it and ignore it in the simulation script.
   */
  static async signup(email: string, password: string, fullName: string, orgName: string): Promise<StandardResponse<any>> {
    const res = await api.post(`/auth/signup`, {
      email,
      password,
      full_name: fullName,
      organization_name: orgName
    });
    return res.data;
  }

  /**
   * Standard OAuth2 URL Encoded Form login
   */
  static async login(email: string, password: string): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    const res = await api.post(`/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return res.data;
  }
}
