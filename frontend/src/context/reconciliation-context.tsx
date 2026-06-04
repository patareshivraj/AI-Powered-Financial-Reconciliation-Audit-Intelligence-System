"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";
import { UploadApiService } from "../services/upload-api";
import { SessionPreviewResponse } from "../types/upload";
import { ReconciliationApiService, ReconciliationSummary, ReconciliationResult } from "../services/reconciliation-api";
import { AiApiService, ReconciliationAiSummary } from "../features/ai/services/ai-api";

interface ReconciliationContextType {
  activeTab: "dashboard" | "workspace" | "history" | "settings" | "analytics" | "investigation";
  setActiveTab: (tab: "dashboard" | "workspace" | "history" | "settings" | "analytics" | "investigation") => void;
  workspaceTab: "reconciliation" | "bank" | "ledger";
  setWorkspaceTab: (tab: "reconciliation" | "bank" | "ledger") => void;

  sessionId: string | undefined;
  setSessionId: (id: string | undefined) => void;
  bankFile: File | null;
  setBankFile: (file: File | null) => void;
  ledgerFile: File | null;
  setLedgerFile: (file: File | null) => void;

  previewData: SessionPreviewResponse | null;
  previewLoading: boolean;
  previewError: string;
  loadSessionPreview: (sid: string) => Promise<void>;

  reconciliationSummary: ReconciliationSummary | null;
  reconciliationResults: ReconciliationResult[];
  isProcessing: boolean;
  processLogs: string[];
  processCompleted: boolean;
  reconError: string;
  runReconciliation: () => Promise<void>;
  resetSession: () => void;

  aiSummary: ReconciliationAiSummary | null;
  aiSummaryLoading: boolean;
  aiSummaryError: string;
  generateAiInsights: () => Promise<void>;
}

const ReconciliationContext = createContext<ReconciliationContextType | undefined>(undefined);

export function ReconciliationProvider({ children }: { children: React.ReactNode }) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"dashboard" | "workspace" | "history" | "settings" | "analytics" | "investigation">("dashboard");
  const [workspaceTab, setWorkspaceTab] = useState<"reconciliation" | "bank" | "ledger">("reconciliation");

  // File and session states
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);

  // Previewer states
  const [previewData, setPreviewData] = useState<SessionPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Reconciliation processing states
  const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary | null>(null);
  const [reconciliationResults, setReconciliationResults] = useState<ReconciliationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const [processCompleted, setProcessCompleted] = useState(false);
  const [reconError, setReconError] = useState("");

  // AI Copilot observations states
  const [aiSummary, setAiSummary] = useState<ReconciliationAiSummary | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState("");

  // AbortController refs to manage async cancellation (polling, simulated delay loops)
  const pollAbortControllerRef = useRef<AbortController | null>(null);

  // Auto-load previews when files + sessionId are present
  useEffect(() => {
    if (sessionId && bankFile && ledgerFile) {
      loadSessionPreview(sessionId);
    }
  }, [sessionId, bankFile, ledgerFile]);

  // Clean up polling loops on unmount
  useEffect(() => {
    return () => {
      if (pollAbortControllerRef.current) {
        pollAbortControllerRef.current.abort();
      }
    };
  }, []);

  const loadSessionPreview = async (sid: string) => {
    setPreviewLoading(true);
    setPreviewError("");
    try {
      const result = await UploadApiService.getSessionPreview(sid);
      if (result.success && result.data) {
        setPreviewData(result.data);
      } else {
        setPreviewError(result.errors?.[0] || "Could not retrieve preview data from standard parser.");
      }
    } catch (err: any) {
      setPreviewError(err.message || "Failed connecting to verification service.");
    } finally {
      setPreviewLoading(false);
    }
  };

  const runReconciliation = async () => {
    if (!bankFile || !ledgerFile || !sessionId) return;

    // Abort any existing reconciliation process / poll before starting a new one
    if (pollAbortControllerRef.current) {
      pollAbortControllerRef.current.abort();
    }
    
    // Create new abort signal
    const abortController = new AbortController();
    pollAbortControllerRef.current = abortController;
    const { signal } = abortController;

    setIsProcessing(true);
    setProcessCompleted(false);
    setProcessLogs([]);
    setReconError("");

    const logMessages = [
      `Initializing BANK AI rule-based matching engine for session: ${sessionId.toUpperCase()}`,
      `Loading SQL connection pools...`,
      `Reading Statement records: ${bankFile.name}`,
      `Reading Ledger records: ${ledgerFile.name}`,
      `Running DuplicateDetectionService: Deduplicating dataset references and value amounts...`,
      `Running MatchingService: Funneling transactions through reference keys, value amounts, and booking dates...`,
      `Status mappings applied: MATCHED, PARTIAL_MATCH, DATE_MISMATCH, AMOUNT_MISMATCH, DUPLICATE`,
      `Persisting matching pairings into SQLite database table 'reconciliation_results'...`,
      `Updating state variables and transaction indices...`,
      `Reconciliation pipeline completed successfully. Clearing transaction queues.`
    ];

    try {
      // Print logs in simulated sequence
      for (let i = 0; i < logMessages.length; i++) {
        if (signal.aborted) return;
        setProcessLogs((prev) => [...prev, logMessages[i]]);
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(resolve, 350);
          signal.addEventListener("abort", () => {
            clearTimeout(timeout);
            reject(new Error("aborted"));
          });
        });
      }

      if (signal.aborted) return;

      // Trigger the backend API matching runner
      const res = await ReconciliationApiService.runReconciliation(sessionId);
      
      if (res.success && res.data) {
        setProcessLogs((prev) => [...prev, "Waiting for background workers to finalize..."]);
        
        // Poll for summary completion safely
        let summaryData = null;
        for (let attempts = 0; attempts < 60; attempts++) {
          if (signal.aborted) return;

          await new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 2000);
            signal.addEventListener("abort", () => {
              clearTimeout(timeout);
              reject(new Error("aborted"));
            });
          });

          if (signal.aborted) return;

          try {
            const summaryRes = await ReconciliationApiService.getReconciliationSummary(sessionId);
            if (summaryRes.success && summaryRes.data && (summaryRes.data.matched_count > 0 || summaryRes.data.mismatch_count > 0)) {
              summaryData = summaryRes.data;
              break;
            }
          } catch (e) {
            // Ignore temporary network errors during polling
          }
        }

        if (signal.aborted) return;

        if (summaryData) {
          setReconciliationSummary(summaryData);
          
          // Fetch detailed results list immediately
          const resultsRes = await ReconciliationApiService.getReconciliationResults(sessionId);
          if (resultsRes.success && resultsRes.data) {
            setReconciliationResults(resultsRes.data);
          }
          
          setProcessCompleted(true);
        } else {
          setReconError("Engine timeout. Background matching took too long.");
        }
      } else {
        setReconError(res.errors?.[0] || "Backend matching engine failed.");
      }
    } catch (err: any) {
      if (err.message === "aborted") {
        console.log("Reconciliation polling run aborted.");
        return;
      }
      console.error(`Reconciliation engine run failure: ${err}`);
      setReconError(err.message || "An unexpected error occurred during the matching run.");
    } finally {
      if (!signal.aborted) {
        setIsProcessing(false);
      }
    }
  };

  const resetSession = () => {
    if (pollAbortControllerRef.current) {
      pollAbortControllerRef.current.abort();
    }
    setBankFile(null);
    setLedgerFile(null);
    setSessionId(undefined);
    setPreviewData(null);
    setReconciliationSummary(null);
    setReconciliationResults([]);
    setProcessCompleted(false);
    setProcessLogs([]);
    setReconError("");
    setAiSummary(null);
    setAiSummaryError("");
    setAiSummaryLoading(false);
  };

  const generateAiInsights = async () => {
    if (!sessionId) return;
    setAiSummaryLoading(true);
    setAiSummaryError("");
    setAiSummary(null);
    try {
      const res = await AiApiService.getAiSummary(sessionId);
      if (res.success && res.data) {
        setAiSummary(res.data);
      } else {
        setAiSummaryError(res.errors?.[0] || "AI aggregate summary failed.");
      }
    } catch (err: any) {
      setAiSummaryError(err.message || "Failed connecting with the Llama-3 compiler.");
    } finally {
      setAiSummaryLoading(false);
    }
  };

  const value = useMemo(() => ({
    activeTab,
    setActiveTab,
    workspaceTab,
    setWorkspaceTab,
    sessionId,
    setSessionId,
    bankFile,
    setBankFile,
    ledgerFile,
    setLedgerFile,
    previewData,
    previewLoading,
    previewError,
    loadSessionPreview,
    reconciliationSummary,
    reconciliationResults,
    isProcessing,
    processLogs,
    processCompleted,
    reconError,
    runReconciliation,
    resetSession,
    aiSummary,
    aiSummaryLoading,
    aiSummaryError,
    generateAiInsights
  }), [
    activeTab,
    workspaceTab,
    sessionId,
    bankFile,
    ledgerFile,
    previewData,
    previewLoading,
    previewError,
    reconciliationSummary,
    reconciliationResults,
    isProcessing,
    processLogs,
    processCompleted,
    reconError,
    aiSummary,
    aiSummaryLoading,
    aiSummaryError
  ]);

  return (
    <ReconciliationContext.Provider value={value}>
      {children}
    </ReconciliationContext.Provider>
  );
}

export function useReconciliation() {
  const context = useContext(ReconciliationContext);
  if (context === undefined) {
    throw new Error("useReconciliation must be used within a ReconciliationProvider");
  }
  return context;
}
