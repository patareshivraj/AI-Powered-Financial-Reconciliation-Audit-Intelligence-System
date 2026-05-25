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
  Search, 
  ShieldAlert, 
  ArrowRight,
  Database,
  Terminal,
  Activity,
  Check,
  HelpCircle,
  Sparkles
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

// Mock statistics logs for demonstration
const RECONCILIATION_HISTORY = [
  { date: "May 20", matchRate: 98.4, totalVolume: 1205000, mismatchCount: 14 },
  { date: "May 21", matchRate: 99.1, totalVolume: 1420000, mismatchCount: 8 },
  { date: "May 22", matchRate: 97.8, totalVolume: 980000, mismatchCount: 22 },
  { date: "May 23", matchRate: 99.5, totalVolume: 1850000, mismatchCount: 4 },
  { date: "May 24", matchRate: 98.9, totalVolume: 1560000, mismatchCount: 11 },
  { date: "May 25", matchRate: 99.2, totalVolume: 2100000, mismatchCount: 6 },
];

const MOCK_HISTORICAL_SESSIONS = [
  { id: "471436b8", name: "Session - TEST RUN", totalVolume: 1850000, date: "May 25", matchRate: 99.2, mismatches: 6, status: "PARSED" }
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

  // Reconciliation processing simulation
  const [isProcessing, setIsProcessing] = useState(false);
  const [processLogs, setProcessLogs] = useState<string[]>([]);
  const [processStep, setProcessStep] = useState(0);
  const [processCompleted, setProcessCompleted] = useState(false);

  // Active workspace table selection
  const [workspaceTab, setWorkspaceTab] = useState<"bank" | "ledger">("bank");

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

  // Run simulated reconciliation
  const runReconciliation = async () => {
    if (!bankFile || !ledgerFile || !sessionId) return;

    setIsProcessing(true);
    setProcessCompleted(false);
    setProcessLogs([]);
    setProcessStep(0);

    const logs = [
      `Initializing BANK AI fintech reconciliation sandbox for Session: ${sessionId.toUpperCase()}`,
      `Configuring SQLite transactional schemas and connection pools...`,
      `Reading cached bank statement: ${bankFile.name} (${(bankFile.size / 1024).toFixed(1)} KB)...`,
      `Reading cached external ledger: ${ledgerFile.name} (${(ledgerFile.size / 1024).toFixed(1)} KB)...`,
      `Invoking Pandas auto-detection parser backend...`,
      `Identifying sheet headers and custom mappings...`,
      `Normalizing amount formats (extracting currency indicators, correcting signs)...`,
      `Standardizing timestamps and dates to ISO format: YYYY-MM-DD HH:MM:SS...`,
      `Executing matching funnel algorithms...`,
      `Matching results compiled: 100% data successfully parsed and normalized.`,
      `Ready to initiate Phase 2 Reconciliation matching engine.`
    ];

    for (let i = 0; i < logs.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      setProcessLogs(prev => [...prev, logs[i]]);
      setProcessStep(i + 1);
    }

    setIsProcessing(false);
    setProcessCompleted(true);
  };

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-100 overflow-hidden">
      {/* 1. Left Sidebar Navigation */}
      <aside className="w-64 border-r border-neutral-900 bg-neutral-950 flex flex-col justify-between p-4 shrink-0">
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
              Data Previewer
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
              <Activity className="h-3 w-3 text-neutral-400" /> API Server
            </span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Online
            </span>
          </div>
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-neutral-950 flex flex-col">
        {/* Top Header */}
        <header className="h-16 border-b border-neutral-900 bg-neutral-950 px-6 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md bg-neutral-950/80">
          <div className="flex items-center gap-4">
            <h2 className="font-semibold text-lg text-white">
              {activeTab === "dashboard" && "Overview Dashboard"}
              {activeTab === "workspace" && "Data Previewer Workspace"}
              {activeTab === "history" && "Reconciliation History"}
              {activeTab === "settings" && "Platform Configuration"}
            </h2>
            <div className="h-4 w-px bg-neutral-900"></div>
            <p className="text-xs text-neutral-400 font-medium hidden sm:inline">
              Phase 1 File Upload MVP Active
            </p>
          </div>
          <div className="flex items-center gap-3">
            {sessionId && (
              <div className="px-2.5 py-1 rounded bg-neutral-900/60 border border-neutral-800 text-[10px] font-mono text-emerald-400">
                Session: {sessionId.substring(0, 8).toUpperCase()}
              </div>
            )}
            <div className="px-2.5 py-1 rounded bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
              v0.1.0-alpha
            </div>
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <div className="flex-1 p-6 space-y-6 max-w-7xl w-full mx-auto">
          {/* TAB 1: DASHBOARD */}
          {activeTab === "dashboard" && (
            <>
              {/* Financial Metrics Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-5 bg-neutral-900/60 rounded-xl border border-neutral-900 flex flex-col justify-between space-y-3 hover:border-neutral-800 transition-colors">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Total Volume Processed</span>
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {previewData?.bank_statement 
                        ? `$${(previewData.bank_statement.metrics.total_deposits_volume + previewData.bank_statement.metrics.total_withdrawals_volume).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                        : "$0"
                      }
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                      Live volume parsed from statement
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-neutral-900/60 rounded-xl border border-neutral-900 flex flex-col justify-between space-y-3 hover:border-neutral-800 transition-colors">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Statement Rows</span>
                    <FileText className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {previewData?.bank_statement?.total_records || 0}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                      Total statement records normalized
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-neutral-900/60 rounded-xl border border-neutral-900 flex flex-col justify-between space-y-3 hover:border-neutral-800 transition-colors">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Ledger Rows</span>
                    <FileText className="h-4 w-4 text-emerald-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white tracking-tight">
                      {previewData?.external_ledger?.total_records || 0}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                      Total ledger records normalized
                    </p>
                  </div>
                </div>

                <div className="p-5 bg-neutral-900/60 rounded-xl border border-neutral-900 flex flex-col justify-between space-y-3 hover:border-neutral-800 transition-colors">
                  <div className="flex items-center justify-between text-neutral-400">
                    <span className="text-xs font-medium uppercase tracking-wider">Missing references</span>
                    <ShieldAlert className="h-4 w-4 text-rose-500" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-rose-500 tracking-tight">
                      {(previewData?.bank_statement?.metrics.missing_references || 0) + (previewData?.external_ledger?.metrics.missing_references || 0)}
                    </h3>
                    <p className="text-xs text-neutral-500 mt-1">
                      Pending metadata corrections
                    </p>
                  </div>
                </div>
              </div>

              {/* Upload Dropzones and Controls Panel */}
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-bold text-white">Fintech File Upload & Parsing Infrastructure</h3>
                    <p className="text-xs text-neutral-400 mt-0.5">Upload a bank statement and a matching external ledger for isolated session previewing</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {bankFile && ledgerFile && !isProcessing && (
                      <button 
                        onClick={runReconciliation}
                        className="bg-emerald-500 hover:bg-emerald-600 text-black px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] flex items-center gap-1.5 cursor-pointer animate-pulse"
                      >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Execute File Normalizer
                      </button>
                    )}
                    {(bankFile || ledgerFile) && (
                      <button 
                        onClick={() => {
                          setBankFile(null);
                          setLedgerFile(null);
                          setSessionId(undefined);
                          setPreviewData(null);
                          setProcessCompleted(false);
                          setProcessLogs([]);
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

                {/* Simulated Logs console when processing */}
                {(isProcessing || processCompleted) && (
                  <div className="mt-6 border border-neutral-900 bg-neutral-950 rounded-xl p-4 font-mono text-xs">
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-neutral-900 text-neutral-400">
                      <span className="flex items-center gap-2 font-bold text-white">
                        <Terminal className="h-4 w-4 text-emerald-400" /> Core Pipeline Terminal Log Console
                      </span>
                      <span className="text-[10px]">
                        {isProcessing ? "Reconciling..." : "Finished"}
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
                    {processCompleted && previewData && (
                      <div className="mt-4 p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-lg flex items-center justify-between text-neutral-300">
                        <div className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-emerald-400" />
                          <span className="text-xs font-medium">Standardizer Pipeline execution successful! Check dynamic previews below.</span>
                        </div>
                        <button 
                          onClick={() => setActiveTab("workspace")}
                          className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold px-3 py-1 rounded text-[10px] flex items-center gap-1 transition-colors"
                        >
                          Open Data Previewer <ArrowRight className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Data Plots Visualization and Details Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 1. Historical Trends Area Chart */}
                <div className="p-6 bg-neutral-900/40 rounded-xl border border-neutral-900 lg:col-span-2 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Historical Reconciliation Quality Trends</h3>
                    <p className="text-xs text-neutral-500">Auto-matching efficiency and aggregate rates daily (Simulation)</p>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={RECONCILIATION_HISTORY} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorMatch" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                        <XAxis dataKey="date" stroke="#737373" fontSize={11} tickLine={false} />
                        <YAxis domain={[95, 100]} stroke="#737373" fontSize={11} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: "#171717", borderColor: "#262626", borderRadius: "8px", fontSize: "12px", color: "#fff" }} />
                        <Area type="monotone" dataKey="matchRate" name="Match Rate (%)" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorMatch)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Database Session Diagnostics */}
                <div className="p-6 bg-neutral-900/40 rounded-xl border border-neutral-900 space-y-4">
                  <div>
                    <h3 className="text-sm font-bold text-white">Fintech Compliance & Audit Trail</h3>
                    <p className="text-xs text-neutral-500">Phase 1 upload schemas and session sandbox details</p>
                  </div>
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-3.5 p-3 rounded bg-neutral-900 border border-neutral-800/80">
                      <div className="h-8 w-8 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                        DB
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">SQLite Engine Active</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">Relational tables synced on startup</p>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"></span>
                    </div>

                    <div className="flex items-center gap-3.5 p-3 rounded bg-neutral-900 border border-neutral-800/80">
                      <div className="h-8 w-8 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                        UA
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">Chunked Upload Streamer</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">Enforces 1MB chunks to block bloat</p>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"></span>
                    </div>

                    <div className="flex items-center gap-3.5 p-3 rounded bg-neutral-900 border border-neutral-800/80">
                      <div className="h-8 w-8 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0 font-mono text-xs font-bold">
                        SM
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-white truncate">Synonym Column Mapping</p>
                        <p className="text-[10px] text-neutral-400 mt-0.5">Dynamic checking on header fields</p>
                      </div>
                      <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0"></span>
                    </div>
                  </div>

                  <div className="p-3 bg-neutral-950 border border-neutral-900 rounded-lg space-y-1 text-center font-mono">
                    <p className="text-[10px] text-neutral-500">PHASE 1 ARCHITECTURE CHECK</p>
                    <p className="text-xs text-white font-bold">✔ 100% Parsing & Upload Standardized</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: RECONCILIATION WORKSPACE */}
          {activeTab === "workspace" && (
            <div className="space-y-6">
              {/* Workspace Header */}
              <div className="bg-neutral-900/40 border border-neutral-900 rounded-xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-white">Live Data Previewer Workspace</h3>
                  <p className="text-xs text-neutral-400">View standard schemas columns, value date strings parsing, and numeric amounts checks.</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setWorkspaceTab("bank")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        workspaceTab === "bank"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      Bank Statement
                    </button>
                    <button
                      onClick={() => setWorkspaceTab("ledger")}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                        workspaceTab === "ledger"
                          ? "bg-slate-800 text-white shadow-sm"
                          : "text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      External Ledger
                    </button>
                  </div>
                </div>
              </div>

              {previewLoading && (
                <div className="flex flex-col items-center justify-center p-20 space-y-4">
                  <RefreshCw className="h-8 w-8 text-emerald-500 animate-spin" />
                  <p className="text-sm font-mono text-slate-400">Compiling dataset normalizer preview...</p>
                </div>
              )}

              {previewError && (
                <div className="p-8 border border-red-500/20 bg-red-950/10 rounded-xl text-center space-y-3">
                  <ShieldAlert className="h-8 w-8 text-red-500 mx-auto" />
                  <h4 className="font-semibold text-red-400">Parser Preview Failed</h4>
                  <p className="text-xs text-slate-400">{previewError}</p>
                </div>
              )}

              {/* Dynamic Preview Tables */}
              {!previewLoading && !previewError && previewData && (
                <div className="space-y-6">
                  {workspaceTab === "bank" && previewData.bank_statement && (
                    <DataPreviewTable 
                      data={previewData.bank_statement} 
                      title="Bank Statement Normalized Columns Preview" 
                    />
                  )}
                  {workspaceTab === "bank" && !previewData.bank_statement && (
                    <div className="p-12 border border-dashed border-slate-800 text-center text-slate-500 rounded-xl">
                      No Bank Statement uploaded in this session.
                    </div>
                  )}

                  {workspaceTab === "ledger" && previewData.external_ledger && (
                    <DataPreviewTable 
                      data={previewData.external_ledger} 
                      title="External Transactions Ledger Preview" 
                    />
                  )}
                  {workspaceTab === "ledger" && !previewData.external_ledger && (
                    <div className="p-12 border border-dashed border-slate-800 text-center text-slate-500 rounded-xl">
                      No External Transactions ledger uploaded in this session.
                    </div>
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
                  <h3 className="text-base font-bold text-white">Platform Settings (Phase 1 Config)</h3>
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
