"use client";

import { useState, useEffect } from "react";
import { AuthApiService } from "../services/auth-api";
import { ShieldAlert, Loader2, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SimulationLoginOverlay({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if token already exists
    const token = localStorage.getItem("bank_ai_token");
    if (token) {
      setIsAuthenticated(true);
    }
    setIsInitializing(false);
  }, []);

  const handleRoleLogin = async (role: "ADMIN" | "ANALYST" | "AUDITOR") => {
    setIsLoggingIn(true);
    setError(null);
    
    const email = `${role.toLowerCase()}@bankai.local`;
    const password = "localpassword123";
    const org = "Local Enterprise Simulation Inc.";

    try {
      // 1. Attempt to register the preset user (fails silently if exists)
      try {
        await AuthApiService.signup(email, password, `${role} User`, org);
      } catch (err: any) {
        // 400 means email already exists, which is fine
        if (err.response?.status !== 400) {
          throw err;
        }
      }

      // 2. Login
      const tokenData = await AuthApiService.login(email, password);
      
      // 3. Save to localStorage
      localStorage.setItem("bank_ai_token", tokenData.access_token);
      localStorage.setItem("bank_ai_role", tokenData.role);
      
      // 4. Reload window to clear all states and trigger interceptors
      window.location.reload();
      
    } catch (err: any) {
      console.error(err);
      setError("Failed to authenticate to local simulation server. Is FastAPI running?");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isInitializing) {
    return null; // Don't flash login on load
  }

  if (isAuthenticated) {
    return <>{children}</>; // Passthrough to actual app
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div className="w-[450px] bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl p-6">
        
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 bg-rose-500/10 rounded-xl flex items-center justify-center border border-rose-500/20">
            <ShieldAlert className="w-6 h-6 text-rose-500" />
          </div>
        </div>

        <h2 className="text-xl font-bold text-center text-white mb-2">Enterprise Auth Simulation</h2>
        <p className="text-sm text-neutral-400 text-center mb-6">
          Phase 4.7 enforces strict RBAC and Organization Isolation. Select a role below to simulate the workspace.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg mb-4 text-xs text-red-400 font-semibold text-center">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button 
            disabled={isLoggingIn}
            onClick={() => handleRoleLogin("ADMIN")}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-5"
          >
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <KeyRound className="w-4 h-4 mr-2" />}
            Log in as ADMIN (Full Access)
          </Button>

          <Button 
            disabled={isLoggingIn}
            onClick={() => handleRoleLogin("ANALYST")}
            variant="outline"
            className="w-full text-neutral-300 font-semibold py-5"
          >
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Log in as ANALYST (Ops & AI)
          </Button>
          
          <Button 
            disabled={isLoggingIn}
            onClick={() => handleRoleLogin("AUDITOR")}
            variant="outline"
            className="w-full text-neutral-400 font-semibold py-5 border-dashed"
          >
            {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Log in as AUDITOR (Read-Only)
          </Button>
        </div>
        
        <p className="text-[10px] text-neutral-500 text-center mt-6 uppercase tracking-wider font-mono">
          Local Development Environment
        </p>
      </div>
    </div>
  );
}
