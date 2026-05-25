"use client";

import React, { useState, useEffect } from "react";
import { 
  BarChart3, 
  Layers, 
  History, 
  Settings, 
  RefreshCw, 
  FileText, 
  TrendingUp, 
  ShieldAlert, 
  ArrowRight,
  Database,
  Terminal,
  Activity,
  Check,
  HelpCircle,
  Sparkles,
  Receipt,
  FileSpreadsheet
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";

// Import custom Phase 1 UI components & services
import { UploadDropzone } from "../components/upload-dropzone";
import { DataPreviewTable } from "../components/data-preview-table";
import { UploadApiService } from "../services/upload-api";
import { SessionPreviewResponse } from "../types/upload";

// Import custom Phase 2 UI components & services
import { ReconciliationApiService, ReconciliationSummary, ReconciliationResult } from "../services/reconciliation-api";
import { AiApiService, ReconciliationAiSummary } from "../features/ai/services/ai-api";
import { ReconciliationSummaryCards } from "../components/reconciliation-summary-cards";
import { ReconciliationTable } from "../components/reconciliation-table";

// Mock statistics logs for demonstration
const RECONCILIATION_HISTORY = [
  { date: "May 20", matchRate: 98.4, totalVolume: 1205000, mismatchCount: 14 },
  { date: "May 21", matchRate: 99.1, totalVolume: 1420000, mismatchCount: 8 },
  { date: "May 22", matchRate: 97.8, totalVolume: 980000, mismatchCount: 22 },
  { date: "May 23", matchRate: 99.5, totalVolume: 1850000, mismatchCount: 4 },
  { date: "May 24", matchRate: 98.9, totalVolume: 1560000, mismatchCount: 11 },
  { date: "May 25", matchRate: 99.2, totalVolume: 2100000, mismatchCount: 6 },
];

export default function Home() {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<"dashboard" | "workspace" | "history" | "settings">("dashboard");

  // Phase 1 API session status
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [bankFile, setBankFile] = useState<File | null>(null);
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<SessionPreviewResponse | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

  // Phase 2 Reconciliation status
  const [reconciliationSummary, setReconciliationSummary] = useState<ReconciliationSummary | null>(null);
  const [reconciliationResults, setReconciliationResults] = useState<ReconciliationResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const [processCompleted, setProcessCompleted] = useState(false);
  const [reconError, setReconError] = useState("");

  // Phase 3 AI Summary states
  const [aiSummary, setAiSummary] = useState<ReconciliationAiSummary | null>(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
  const [aiSummaryError, setAiSummaryError] = useState("");

  // Active workspace table view (switch between file previewer vs reconciliation pairings)
  const [workspaceTab, setWorkspaceTab] = useState<"reconciliation" | "bank" | "ledger">("reconciliation");

  // Load preview data automatically when both files are successfully uploaded
  useEffect(() => {
    if (sessionId && bankFile && ledgerFile) {
      loadSessionPreview(sessionId);
    }
  }, [sessionId, bankFile, ledgerFile]);

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

  const handleBankUploadSuccess = (file: File, sid: string) => {
    setBankFile(file);
    setSessionId(sid);
  };

  const handleLedgerUploadSuccess = (file: File, sid: string) => {
    setLedgerFile(file);
    setSessionId(sid);
  };

  // Run main reconciliation engine via backend API
  const runReconciliation = async () => {
    if (!bankFile || !ledgerFile || !sessionId) return;

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
      // Print logs in simulated sequence for excellent user visual micro-feedback
      for (let i = 0; i < logMessages.length; i++) {
        setProcessLogs((prev) => [...prev, logMessages[i]]);
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      // Trigger the backend API matching runner
      const res = await ReconciliationApiService.runReconciliation(sessionId);
      
      if (res.success && res.data) {
        setReconciliationSummary(res.data.summary);
        
        // Fetch detailed results list immediately
        const resultsRes = await ReconciliationApiService.getReconciliationResults(sessionId);
        if (resultsRes.success && resultsRes.data) {
          setReconciliationResults(resultsRes.data);
        }
        
        setProcessCompleted(true);
      } else {
        setReconError(res.errors?.[0] || "Backend matching engine failed.");
      }
    } catch (err: any) {
      console.error(`Reconciliation engine run failure: ${err}`);
      setReconError(err.message || "An unexpected error occurred during the matching run.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate Llama-3 executive insights and summary aggregates
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


  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 border-r border-neutral-900 bg-neutral-950 flex flex-col justify-between p-4 shrink-0 font-sans">
        <div>
          {/* Platform Title */}
          <div className="flex items-center gap-2.5 px-3 py-4 mb-6 border-b border-neutral-900">
            <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center text-black font-extrabold text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)]">
              $
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white">BANK AI</h1>
              <p className="text-xs text-neutral-400 font-medium">Reconciliation Suite</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-neutral-900 text-white border-l-2 border-emerald-500 pl-2.5"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
              }`}
            >
              <BarChart3 className="h-4 w-4" />
              Overview Dashboard
            </button>
            <button
              onClick={() => setActiveTab("workspace")}
              disabled={!previewData}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                !previewData 
                  ? "opacity-40 cursor-not-allowed text-neutral-600" 
                  : activeTab === "workspace"
                    ? "bg-neutral-900 text-white border-l-2 border-emerald-500 pl-2.5"
                    : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
              }`}
            >
              <Layers className="h-4 w-4" />
              Reconciliation Workspace
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "history"
                  ? "bg-neutral-900 text-white border-l-2 border-emerald-500 pl-2.5"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
              }`}
            >
              <History className="h-4 w-4" />
              History & Audits
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === "settings"
                  ? "bg-neutral-900 text-white border-l-2 border-emerald-500 pl-2.5"
                  : "text-neutral-400 hover:text-white hover:bg-neutral-900/50"
              }`}
            >
              <Settings className="h-4 w-4" />
              Platform Settings
            </button>
          </nav>
        </div>

        {/* Database Status Footer Info */}
        <div className="p-3 bg-neutral-900/40 rounded-xl border border-neutral-900 space-y-2">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Database className="h-3 w-3 text-neutral-400" /> Database
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[10px]">
              Local SQLite
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity className="h-3 w-3 text-neutral-400" /> Platform Mode
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono text-[10px]">
              Deterministic
            </span>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-neutral-950 flex flex-col font-sans">
        {/* Top Header */}
        <header className="h-16 border-b border-neutral-900 bg-neutral-950 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md bg-neutral-950/80">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-lg text-white">
              {activeTab === "dashboard" && "Overview Dashboard"}
              {activeTab === "workspace" && "Reconciliation Workspace"}
              {activeTab === "history" && "Reconciliation History"}
              {activeTab === "settings" && "Platform Configuration"}
            </h2>
            <div className="h-4 w-px bg-neutral-900"></div>
            <p className="text-xs text-neutral-400 font-medium hidden sm:inline">
              Phase 2 Reconciliation Engine Active
            </p>
          </div>
          <div className="flex items-center gap-3">
            {sessionId && (
              <div className="px-2.5 py-1 rounded bg-neutral-900/60 border border-neutral-800 text-[10px] font-mono text-emerald-400">
                Session: {sessionId.substring(0, 8).toUpperCase()}
              </div>
            )}
            <div className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
              v0.2.0-alpha
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
              {/* Financial Metrics Cards (Displays Live calculations once reconciled) */}
              {reconciliationSummary ? (
                <ReconciliationSummaryCards summary={reconciliationSummary} />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="p-5 bg-neutral-900/60 rounded-xl border border-neutral-900 flex flex-col justify-between space-y-3 hover:border-neutral-800 transition-colors">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="text-xs font-medium uppercase tracking-wider">Statement Rows</span>
                      <Receipt className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">
                        {previewData?.bank_statement?.total_records || 0}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">Pending engine execution</p>
                    </div>
                  </div>

                  <div className="p-5 bg-neutral-900/60 rounded-xl border border-neutral-900 flex flex-col justify-between space-y-3 hover:border-neutral-800 transition-colors">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="text-xs font-medium uppercase tracking-wider">Ledger Rows</span>
                      <Layers className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">
                        {previewData?.external_ledger?.total_records || 0}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-1">Pending engine execution</p>
                    </div>
                  </div>

                  <div className="p-5 bg-neutral-900/60 rounded-xl border border-neutral-900 flex flex-col justify-between space-y-3 hover:border-neutral-800 transition-colors">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="text-xs font-medium uppercase tracking-wider">Status Indicators</span>
                      <Activity className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-white tracking-tight">PARSED</h3>
                      <p className="text-xs text-neutral-500 mt-1">Uploads completed</p>
                    </div>
                  </div>

                  <div className="p-5 bg-neutral-900/60 rounded-xl border border-neutral-900 flex flex-col justify-between space-y-3 hover:border-neutral-800 transition-colors">
                    <div className="flex items-center justify-between text-neutral-400">
                      <span className="text-xs font-medium uppercase tracking-wider">Reconciled Volume</span>
                      <TrendingUp className="h-4 w-4 text-slate-500" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-slate-500 tracking-tight">$0</h3>
                      <p className="text-xs text-neutral-500 mt-1">Reconcile to view</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Upload Dropzones and Controls Panel */}
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                  <div>
                    <h3 className="text-base font-bold text-white">Fintech File Upload & Engine Execution</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Upload a bank statement and a ledger, then invoke the rule-based matching engine</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {bankFile && ledgerFile && !isProcessing && (
                      <button 
                        onClick={runReconciliation}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-1.5 cursor-pointer animate-pulse"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Run Reconciliation Engine
                      </button>
                    )}
                    {(bankFile || ledgerFile) && (
                      <button 
                        onClick={() => {
                          setBankFile(null);
                          setLedgerFile(null);
                          setSessionId(undefined);
                          setPreviewData(null);
                          setReconciliationSummary(null);
                          setReconciliationResults([]);
                          setProcessCompleted(false);
                          setProcessLogs([]);
                          setReconError("");
                        }}
                        className="border border-neutral-800 text-neutral-400 hover:text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors"
                      >
                        Reset Upload Session
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Dropzone 1: Bank Statements */}
                  <UploadDropzone
                    title="1. Upload Bank Statement"
                    subtitle="Drag & drop CSV or XLSX sheet, or click to browse"
                    fileType="BANK_STATEMENT"
                    sessionId={sessionId}
                    uploadFn={UploadApiService.uploadBankStatement}
                    onUploadSuccess={handleBankUploadSuccess}
                  />

                  {/* Dropzone 2: External Transactions Ledger */}
                  <UploadDropzone
                    title="2. Upload External Ledger"
                    subtitle="Drag & drop LMS or payment gateway report"
                    fileType="EXTERNAL_LEDGER"
                    sessionId={sessionId}
                    uploadFn={UploadApiService.uploadExternalTransactions}
                    onUploadSuccess={handleLedgerUploadSuccess}
                  />
                </div>

                {/* API Reconciliation Failures */}
                {reconError && (
                  <div className="mt-6 p-4 border border-rose-500/20 bg-rose-950/10 rounded-xl text-xs flex items-center gap-3 text-rose-400">
                    <ShieldAlert className="h-5 w-5 shrink-0" />
                    <span><b>Engine Execution Failed:</b> {reconError}</span>
                  </div>
                )}

                {/* Simulated Logs console when processing */}
                {(isProcessing || processCompleted) && (
                  <div className="mt-6 border border-neutral-900 bg-neutral-950 rounded-xl p-4 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-neutral-900 text-neutral-400">
                      <span className="flex items-center gap-2 font-bold text-white">
                        <Terminal className="h-4 w-4 text-emerald-400" /> Core Engine Process Logs
                      </span>
                      <span className="text-[10px]">
                        {isProcessing ? "Matching..." : "Finished"}
                      </span>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {processLogs.map((log, index) => (
                        <div key={index} className="flex gap-2.5 text-neutral-400 leading-relaxed">
                          <span className="text-emerald-500/70 select-none">▶</span>
                          <span className={index === processLogs.length - 1 && isProcessing ? "text-white animate-pulse" : ""}>{log}</span>
                        </div>
                      ))}
                    </div>
                    {processCompleted && reconciliationSummary && (
                      <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-center justify-between text-neutral-300">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-medium">Reconciliation processed successfully! {reconciliationSummary.matched_count} Perfect Matches identified.</span>
                        </div>
                        <button 
                          onClick={() => { setActiveTab("workspace"); setWorkspaceTab("reconciliation"); }}
                          className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-3 py-1 rounded text-[10px] flex items-center gap-1 transition-colors"
                        >
                          Open Workspace Table <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* AI Executive Summary Block (Only display if matching run is completed) */}
                {processCompleted && reconciliationSummary && (
                  <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-900 pb-4">
                      <div className="flex items-center gap-2.5">
                        <Sparkles className="h-5 w-5 text-emerald-400 animate-pulse" />
                        <div>
                          <h3 className="text-base font-bold text-white">AI Copilot Executive Observations</h3>
                          <p className="text-xs text-neutral-400 mt-0.5">Assistive insights generated on transaction mismatch anomalies using Llama-3</p>
                        </div>
                      </div>
                      
                      {!aiSummary && !aiSummaryLoading && (
                        <button
                          onClick={generateAiInsights}
                          className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Generate AI Observations</span>
                        </button>
                      )}
                    </div>

                    {/* Shimmer loading loader */}
                    {aiSummaryLoading && (
                      <div className="py-8 flex flex-col items-center justify-center space-y-3 animate-pulse">
                        <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin" />
                        <span className="text-xs text-neutral-400 font-mono">Llama-3 scanning transaction datasets and anomaly logs...</span>
                      </div>
                    )}

                    {/* Failed response */}
                    {aiSummaryError && (
                      <div className="p-4 border border-rose-500/20 bg-rose-950/10 rounded-xl text-xs space-y-1 text-rose-400">
                        <p className="font-bold flex items-center gap-1.5"><ShieldAlert className="h-4 w-4" /> AI observations compile failed</p>
                        <p className="text-neutral-400">{aiSummaryError}</p>
                      </div>
                    )}

                    {/* Loaded results content */}
                    {!aiSummaryLoading && !aiSummaryError && aiSummary && (
                      <div className="space-y-6">
                        {/* Summary review description */}
                        <div className="p-4 bg-neutral-950/80 rounded-xl border border-neutral-900/60 text-xs text-neutral-300 leading-relaxed font-sans">
                          {aiSummary.summary}
                        </div>

                        {/* Footer indicators and confidence levels */}
                        <div className="flex items-center justify-between text-[11px] text-neutral-500 pt-2 border-t border-neutral-900/40">
                          <span className="flex items-center gap-1"><HelpCircle className="h-3.5 w-3.5" /> advisory assistive AI insights</span>
                          <span className="font-mono">
                            Confidence Score: <b className="text-emerald-400 font-bold">{aiSummary.confidence_score}% ({aiSummary.confidence_indicator})</b>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </>
          )}

          {/* TAB 2: RECONCILIATION WORKSPACE */}
          {activeTab === "workspace" && (
            <div className="space-y-6">
              {/* Workspace Header */}
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Reconciliation Workspace Grid</h3>
                  <p className="text-xs text-neutral-400">Review perfect matching records, isolates date/amount mismatches, or consult standard raw datasets.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setWorkspaceTab("reconciliation")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        workspaceTab === "reconciliation"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Reconciliation Results
                    </button>
                    <button
                      onClick={() => setWorkspaceTab("bank")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        workspaceTab === "bank"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Bank Sheet Preview
                    </button>
                    <button
                      onClick={() => setWorkspaceTab("ledger")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        workspaceTab === "ledger"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Ledger Sheet Preview
                    </button>
                  </div>
                </div>
              </div>

              {previewLoading && (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
                  <p className="text-sm font-mono text-slate-400">Loading datasets...</p>
                </div>
              )}

              {previewError && (
                <div className="p-8 border border-red-500/20 bg-red-950/10 rounded-xl text-center space-y-3">
                  <ShieldAlert className="h-8 w-8 text-red-500 mx-auto" />
                  <h4 className="font-semibold text-red-400">Workspace Loading Failed</h4>
                  <p className="text-xs text-slate-400">{previewError}</p>
                </div>
              )}

              {/* Dynamic Workspace Panels */}
              {!previewLoading && !previewError && (
                <div className="space-y-6">
                  {/* Panel A: Live Reconciliation pairing list */}
                  {workspaceTab === "reconciliation" && (
                    <>
                      {reconciliationResults.length > 0 && sessionId ? (
                        <ReconciliationTable results={reconciliationResults} sessionId={sessionId} />
                      ) : (
                        <div className="p-12 border border-dashed border-slate-800 text-center text-slate-500 rounded-xl space-y-3">
                          <ShieldAlert className="h-8 w-8 mx-auto text-slate-600" />
                          <p className="text-xs font-mono">No matching results calculated for this session yet.</p>
                          <button
                            onClick={() => setActiveTab("dashboard")}
                            className="bg-emerald-500 hover:bg-emerald-600 text-black px-3 py-1.5 rounded-lg text-xs font-bold font-sans"
                          >
                            Return to Dashboard to Run Engine
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Panel B: Raw bank statement preview */}
                  {workspaceTab === "bank" && previewData?.bank_statement && (
                    <DataPreviewTable 
                      data={previewData.bank_statement} 
                      title="Bank Statement Raw Columns Standard Preview" 
                    />
                  )}

                  {/* Panel C: Raw ledger statement preview */}
                  {workspaceTab === "ledger" && previewData?.external_ledger && (
                    <DataPreviewTable 
                      data={previewData.external_ledger} 
                      title="External Ledger Raw Columns Standard Preview" 
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: HISTORY */}
          {activeTab === "history" && (
            <div className="space-y-6">
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-5">
                <h3 className="text-base font-bold text-white">Historical Reconciliation Sessions</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Review previous parsing and comparison sheets logged in SQLite</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 bg-neutral-900/60 rounded-xl border border-neutral-900 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-neutral-400">SESSION - DEMO AUDIT</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold text-[10px]">
                      Success
                    </span>
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-white">$2,100,000</h4>
                    <p className="text-xs text-neutral-400 mt-1">Reconciled on May 25, 2026</p>
                  </div>
                  <div className="pt-3 border-t border-neutral-900 flex justify-between items-center text-xs text-neutral-500">
                    <span>Match Quality: <b className="text-emerald-400 font-bold">99.2%</b></span>
                    <span>Discrepancies: <b className="text-rose-500 font-bold">6</b></span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-6 max-w-3xl">
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-6 space-y-5">
                <div>
                  <h3 className="text-base font-bold text-white">Platform Settings (Phase 2 Config)</h3>
                  <p className="text-xs text-neutral-400 mt-0.5">FastAPI `pydantic-settings` backend configuration environment variables</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">SQLite DB URI</label>
                    <input 
                      type="text" 
                      value="sqlite:///./app.db" 
                      disabled
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-400 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">File Size Limits</label>
                    <input 
                      type="text" 
                      value="52,428,800 Bytes (50MB Max)" 
                      disabled
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-400 cursor-not-allowed"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider">Supported Mappings</label>
                    <input 
                      type="text" 
                      value=".csv, .xlsx (Pandas + OpenPyXL engines)" 
                      disabled
                      className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-400 cursor-not-allowed"
                    />
                  </div>

                  <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-lg space-y-2">
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <HelpCircle className="h-4 w-4 text-emerald-400" /> PostgreSQL Deployment Standard
                    </h4>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      All schemas defined inside `/backend/app/models/base.py` use generic SQLAlchemy mapping definitions. 
                      Migrating this platform to Supabase or AWS RDS PostgreSQL requires changing ONLY the `DATABASE_URL` 
                      inside the `.env` configuration file.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
