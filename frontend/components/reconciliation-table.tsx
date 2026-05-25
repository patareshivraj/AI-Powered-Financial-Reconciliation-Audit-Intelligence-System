"use client";

import React, { useState, useMemo, useCallback } from "react";
import { ReconciliationResult, ReconciliationApiService } from "../services/reconciliation-api";
import { AiApiService, MismatchExplanation } from "../features/ai/services/ai-api";
import { StatusBadge } from "./status-badge";
import { AdvancedFilterPanel, FilterState, INITIAL_FILTERS } from "./advanced-filter-panel";
import { 
  Search, 
  FileSpreadsheet, 
  FileText, 
  Calendar, 
  DollarSign, 
  RefreshCw, 
  AlertCircle, 
  Sparkles, 
  X, 
  TrendingUp, 
  HelpCircle, 
  CheckCircle,
  Lightbulb,
  ShieldCheck
} from "lucide-react";

interface ReconciliationTableProps {
  results: ReconciliationResult[];
  sessionId: string;
}

export function ReconciliationTable({ results, sessionId }: ReconciliationTableProps) {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 15;

  // AI Explanation Drawer states
  const [selectedResult, setSelectedResult] = useState<ReconciliationResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<MismatchExplanation | null>(null);
  const [aiError, setAiError] = useState("");

  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) +
        " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch { return dateStr; }
  };

  // Multi-dimensional filtering with memoization
  const filteredResults = useMemo(() => {
    return results.filter((res) => {
      // Status filter
      if (filters.status !== "ALL" && res.status !== filters.status) return false;

      // Text search
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const fields = [
          res.bank_transaction?.reference, res.ledger_transaction?.reference,
          res.bank_transaction?.description, res.ledger_transaction?.description,
          res.remarks
        ].filter(Boolean).map(s => s!.toLowerCase());
        if (!fields.some(f => f.includes(term))) return false;
      }

      // Amount range
      const amt = res.bank_transaction?.amount ?? res.ledger_transaction?.amount ?? null;
      if (filters.minAmount && amt !== null && amt < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && amt !== null && amt > parseFloat(filters.maxAmount)) return false;

      // Date range
      const dateStr = res.bank_transaction?.transaction_date ?? res.ledger_transaction?.transaction_date;
      if (dateStr && (filters.dateFrom || filters.dateTo)) {
        const txDate = new Date(dateStr).getTime();
        if (filters.dateFrom && txDate < new Date(filters.dateFrom).getTime()) return false;
        if (filters.dateTo && txDate > new Date(filters.dateTo + "T23:59:59").getTime()) return false;
      }

      return true;
    });
  }, [results, filters]);

  // Pagination
  const totalRows = filteredResults.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = currentPage * rowsPerPage;
  const paginatedRows = filteredResults.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) setCurrentPage(newPage);
  };

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setCurrentPage(0);
  }, []);

  const handleExplainDiscrepancy = async (result: ReconciliationResult) => {
    setSelectedResult(result);
    setAiLoading(true);
    setAiError("");
    setAiData(null);
    try {
      const res = await AiApiService.explainMismatch(result.id);
      if (res.success && res.data) { setAiData(res.data); }
      else { setAiError(res.errors?.[0] || "Inference error occurred."); }
    } catch (err: any) {
      setAiError(err.message || "Failed communicating with Llama-3.");
    } finally { setAiLoading(false); }
  };

  return (
    <div className="w-full space-y-4 relative">
      
      {/* Smart Filtering Engine */}
      <AdvancedFilterPanel
        filters={filters}
        onChange={handleFilterChange}
        resultCount={totalRows}
        totalCount={results.length}
      />

      {/* Export Buttons */}
      <div className="flex items-center gap-2 justify-end">
        <a href={ReconciliationApiService.getExportUrl(sessionId, "csv")} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-colors">
          <FileText className="h-3.5 w-3.5 text-blue-400" /> Export CSV
        </a>
        <a href={ReconciliationApiService.getExportUrl(sessionId, "xlsx")} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-colors">
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export XLSX
        </a>
      </div>

      {/* Main Table Card */}
      <div className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 backdrop-blur-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-900/20 text-slate-400 font-mono">
                <th className="p-4 font-medium">Reconciliation Key</th>
                <th className="p-4 font-medium">Status & Score</th>
                <th className="p-4 font-medium">Bank Statement Details</th>
                <th className="p-4 font-medium">External Ledger Details</th>
                <th className="p-4 font-medium">Intelligence Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedRows.map((row) => {
                const referenceCode = row.bank_transaction?.reference || row.ledger_transaction?.reference || "N/A";
                const isMatched = row.status === "MATCHED";
                const isDuplicate = row.status === "DUPLICATE";
                
                return (
                  <tr key={row.id} className="hover:bg-slate-900/20 transition-colors">
                    {/* 1. Reconciliation Key */}
                    <td className="p-4 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-mono font-bold text-slate-200 text-xs px-2 py-0.5 rounded bg-slate-900 border border-slate-800 w-fit">
                          {referenceCode}
                        </span>
                        <span className="text-[10px] text-slate-500 font-sans mt-1">Ref ID</span>
                      </div>
                    </td>

                    {/* 2. Status & Score */}
                    <td className="p-4">
                      <div className="flex flex-col gap-1.5 justify-center">
                        <StatusBadge status={row.status} />
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                          <span>Match Score:</span>
                          <span
                            className={`font-bold ${
                              row.match_score >= 90
                                ? "text-emerald-400"
                                : row.match_score >= 40
                                ? "text-yellow-400"
                                : "text-rose-500"
                            }`}
                          >
                            {row.match_score}%
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 3. Bank Statement Details */}
                    <td className="p-4">
                      {row.bank_transaction ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-200">
                            <DollarSign className="h-3 w-3 text-slate-500" />
                            <span className="font-mono">{formatCurrency(row.bank_transaction.amount)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            <span>{formatDate(row.bank_transaction.transaction_date)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            {row.bank_transaction.description || "No description"}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-500 font-mono text-[10px]">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>MISSING IN BANK</span>
                        </div>
                      )}
                    </td>

                    {/* 4. External Ledger Details */}
                    <td className="p-4">
                      {row.ledger_transaction ? (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-200">
                            <DollarSign className="h-3 w-3 text-slate-500" />
                            <span className="font-mono">{formatCurrency(row.ledger_transaction.amount)}</span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                            <Calendar className="h-3 w-3 text-slate-500" />
                            <span>{formatDate(row.ledger_transaction.transaction_date)}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate max-w-[180px]">
                            {row.ledger_transaction.description || "No description"}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-rose-500 font-mono text-[10px]">
                          <AlertCircle className="h-3.5 w-3.5" />
                          <span>MISSING IN EXTERNAL</span>
                        </div>
                      )}
                    </td>

                    {/* 5. Intelligence Actions */}
                    <td className="p-4">
                      {!isMatched && !isDuplicate ? (
                        <button
                          onClick={() => handleExplainDiscrepancy(row)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black hover:border-transparent text-[10px] font-bold transition-all shadow-sm font-sans shrink-0 cursor-pointer animate-pulse"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>AI Review</span>
                        </button>
                      ) : isMatched ? (
                        <div className="flex items-center gap-1 text-emerald-500 font-mono text-[10px]">
                          <ShieldCheck className="h-4 w-4" />
                          <span>Locked</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-500 font-mono font-medium">No action needed</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {paginatedRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-500 font-mono italic">
                    No reconciliation pairings found matching the active search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginated Actions Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/10">
            <span className="text-[11px] text-slate-500">
              Showing rows {startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="px-3 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="px-3 py-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 text-[11px] font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Slide-out Premium AI Audit Review Panel */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-end font-sans transition-all duration-300">
          <div className="w-full max-w-lg h-full bg-slate-950 border-l border-slate-900 p-6 flex flex-col justify-between shadow-2xl relative">
            
            {/* Header */}
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-slate-900">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-emerald-400" />
                  <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Assistive AI Audit Review</h3>
                </div>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="p-1 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Session / Ref Details info capsule */}
              <div className="mt-4 p-3 bg-slate-900/60 rounded-xl border border-slate-900 flex justify-between items-center text-xs">
                <span className="font-mono text-slate-400">
                  Key Reference: <b className="text-white font-bold">{
                    selectedResult.bank_transaction?.reference || selectedResult.ledger_transaction?.reference || "N/A"
                  }</b>
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-400 border border-slate-800 text-[10px] uppercase font-bold font-mono">
                  {selectedResult.status.replace("_", " ")}
                </span>
              </div>

              {/* Shimmer loading loader */}
              {aiLoading && (
                <div className="mt-8 space-y-6 animate-pulse">
                  <div className="h-4 bg-slate-900 rounded w-1/3"></div>
                  <div className="space-y-2.5">
                    <div className="h-3.5 bg-slate-900 rounded"></div>
                    <div className="h-3.5 bg-slate-900 rounded"></div>
                    <div className="h-3.5 bg-slate-900 rounded w-5/6"></div>
                  </div>
                  <div className="pt-6 border-t border-slate-900 space-y-4">
                    <div className="h-4 bg-slate-900 rounded w-1/4"></div>
                    <div className="h-8 bg-slate-900 rounded-lg"></div>
                  </div>
                  <div className="flex items-center justify-center p-12">
                    <RefreshCw className="h-6 w-6 text-emerald-400 animate-spin" />
                  </div>
                </div>
              )}

              {/* Failed response */}
              {aiError && (
                <div className="mt-8 p-4 border border-rose-500/20 bg-rose-950/10 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold">
                    <AlertCircle className="h-4 w-4" />
                    <span>Inference Dispatched Failure</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">{aiError}</p>
                </div>
              )}

              {/* Loaded results content */}
              {!aiLoading && !aiError && aiData && (
                <div className="mt-6 space-y-6 overflow-y-auto max-h-[75vh] pr-1">
                  
                  {/* Observation Block */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="h-4 w-4 text-emerald-400" /> Discrepancy Observations
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans bg-slate-900/20 p-4 rounded-xl border border-slate-900/60">
                      {aiData.explanation}
                    </p>
                  </div>


                  {/* Confidence indicators */}
                  <div className="pt-6 border-t border-slate-900 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Model Inference Accuracy:</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                      aiData.confidence_indicator === "HIGH" 
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                        : "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                    }`}>
                      {aiData.confidence_score}% ({aiData.confidence_indicator})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Non-authoritative Footer Disclaimer */}
            <div className="p-4 bg-slate-900/40 rounded-xl border border-slate-900 text-[10px] text-slate-500 leading-relaxed flex gap-2">
              <HelpCircle className="h-4 w-4 text-slate-600 shrink-0" />
              <span>
                <b>AI Discrepancy reviews are advisory.</b> This output is generated using Llama 3 70B assistive analytics and must be manually approved. It does not modify accounting persistent records or exact deterministic matching results.
              </span>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
