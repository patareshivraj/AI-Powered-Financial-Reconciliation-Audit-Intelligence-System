"use client";

import { useState, useEffect } from "react";

export function useAuth() {
  const [role, setRole] = useState<string>("LOADING");
  const [token, setToken] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Only run on client after mount to prevent hydration mismatch
    const storedRole = localStorage.getItem("bank_ai_role") || "UNKNOWN";
    const storedToken = localStorage.getItem("bank_ai_token");
    setRole(storedRole);
    setToken(storedToken);
    setIsHydrated(true);
  }, []);

  const logout = () => {
    localStorage.removeItem("bank_ai_token");
    localStorage.removeItem("bank_ai_role");
    window.location.reload();
  };

  return {
    role,
    token,
    isHydrated,
    logout
  };
}
