import axios from "axios";
import { StandardResponse } from "../../../types/upload";

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

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
    const res = await axios.post(`${API_BASE_URL}/auth/signup`, {
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
    
    const res = await axios.post(`${API_BASE_URL}/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
    return res.data;
  }
}
