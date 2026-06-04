"use client";

import React, { useState, useMemo, useCallback, useRef } from "react";
import { ReconciliationResult, ReconciliationApiService } from "../services/reconciliation-api";
import { AiApiService, MismatchExplanation } from "../features/ai/services/ai-api";
import { StatusBadge } from "./status-badge";
import { AdvancedFilterPanel, FilterState, INITIAL_FILTERS } from "./advanced-filter-panel";
import { 
  FileSpreadsheet, FileText, Calendar, DollarSign, RefreshCw, 
  AlertCircle, Sparkles, X, Lightbulb, ShieldCheck, HelpCircle
} from "lucide-react";

import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';

interface ReconciliationTableProps {
  results: ReconciliationResult[];
  sessionId: string;
}

export function ReconciliationTable({ results, sessionId }: ReconciliationTableProps) {
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  
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
      if (filters.status !== "ALL" && res.status !== filters.status) return false;
      if (filters.search) {
        const term = filters.search.toLowerCase();
        const fields = [
          res.bank_transaction?.reference, res.ledger_transaction?.reference,
          res.bank_transaction?.description, res.ledger_transaction?.description,
          res.remarks
        ].filter(Boolean).map(s => s!.toLowerCase());
        if (!fields.some(f => f.includes(term))) return false;
      }
      const amt = res.bank_transaction?.amount ?? res.ledger_transaction?.amount ?? null;
      if (filters.minAmount && amt !== null && amt < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && amt !== null && amt > parseFloat(filters.maxAmount)) return false;
      const dateStr = res.bank_transaction?.transaction_date ?? res.ledger_transaction?.transaction_date;
      if (dateStr && (filters.dateFrom || filters.dateTo)) {
        const txDate = new Date(dateStr).getTime();
        if (filters.dateFrom && txDate < new Date(filters.dateFrom).getTime()) return false;
        if (filters.dateTo && txDate > new Date(filters.dateTo + "T23:59:59").getTime()) return false;
      }
      return true;
    });
  }, [results, filters]);

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
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

  // TanStack Table Setup
  const columnHelper = createColumnHelper<ReconciliationResult>();
  
  const columns = useMemo(() => [
    columnHelper.accessor(row => row.bank_transaction?.reference || row.ledger_transaction?.reference || "N/A", {
      id: 'reference',
      header: 'Reconciliation Key',
      size: 150,
      cell: info => (
        <div className="flex flex-col gap-0.5 px-4 py-3">
          <span className="font-mono font-bold text-neutral-200 text-xs px-2 py-0.5 rounded bg-black/40 border border-white/5 w-fit">
            {info.getValue()}
          </span>
          <span className="text-[10px] text-neutral-500 font-sans mt-1 uppercase tracking-wider font-bold">Ref ID</span>
        </div>
      )
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status & Score',
      size: 150,
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex flex-col gap-1.5 justify-center px-4 py-3">
            <StatusBadge status={r.status} />
            <div className="flex items-center gap-1.5 text-[10px] text-neutral-500 font-mono font-bold">
              <span>Match Score:</span>
              <span className={r.match_score >= 90 ? "text-emerald-400" : r.match_score >= 40 ? "text-yellow-400" : "text-rose-500"}>
                {r.match_score}%
              </span>
            </div>
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'bank_details',
      header: 'Bank Statement Details',
      size: 250,
      cell: ({ row }) => {
        const t = row.original.bank_transaction;
        if (!t) return (
          <div className="flex items-center gap-1.5 text-rose-500 font-mono text-[10px] px-4 py-3 font-bold bg-rose-500/5 rounded-lg border border-rose-500/10 w-fit">
            <AlertCircle className="h-3.5 w-3.5" /> MISSING IN BANK
          </div>
        );
        return (
          <div className="space-y-1.5 px-4 py-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-200">
              <DollarSign className="h-3 w-3 text-neutral-500" />
              <span className="font-mono">{formatCurrency(t.amount)}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
              <Calendar className="h-3 w-3 text-neutral-500" />
              <span>{formatDate(t.transaction_date)}</span>
            </div>
            <p className="text-[10px] text-neutral-500 truncate max-w-[200px] font-medium">{t.description || "No description"}</p>
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'ledger_details',
      header: 'External Ledger Details',
      size: 250,
      cell: ({ row }) => {
        const t = row.original.ledger_transaction;
        if (!t) return (
          <div className="flex items-center gap-1.5 text-rose-500 font-mono text-[10px] px-4 py-3 font-bold bg-rose-500/5 rounded-lg border border-rose-500/10 w-fit">
            <AlertCircle className="h-3.5 w-3.5" /> MISSING IN EXTERNAL
          </div>
        );
        return (
          <div className="space-y-1.5 px-4 py-3">
            <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-200">
              <DollarSign className="h-3 w-3 text-neutral-500" />
              <span className="font-mono">{formatCurrency(t.amount)}</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-neutral-400 font-mono">
              <Calendar className="h-3 w-3 text-neutral-500" />
              <span>{formatDate(t.transaction_date)}</span>
            </div>
            <p className="text-[10px] text-neutral-500 truncate max-w-[200px] font-medium">{t.description || "No description"}</p>
          </div>
        );
      }
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Intelligence Actions',
      size: 150,
      cell: ({ row }) => {
        const r = row.original;
        const isMatched = r.status === "MATCHED";
        const isDuplicate = r.status === "DUPLICATE";
        if (!isMatched && !isDuplicate) {
          return (
            <div className="px-4 py-3">
              <button
                onClick={() => handleExplainDiscrepancy(r)}
                className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-black hover:border-transparent text-[10px] font-bold transition-all shadow-sm font-sans shrink-0 cursor-pointer group"
              >
                <Sparkles className="h-3.5 w-3.5 group-hover:animate-pulse" />
                <span>AI Review</span>
              </button>
            </div>
          );
        }
        if (isMatched) {
          return (
            <div className="flex items-center gap-1.5 text-emerald-500 font-mono text-[10px] font-bold px-4 py-3">
              <ShieldCheck className="h-4 w-4" /> Locked
            </div>
          );
        }
        return <span className="text-[10px] text-neutral-500 font-mono font-medium px-4 py-3">No action needed</span>;
      }
    })
  ], []);

  const table = useReactTable({
    data: filteredResults,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  // Virtualizer Setup
  const tableContainerRef = useRef<HTMLDivElement>(null);
  
  const { rows } = table.getRowModel();
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 90, // Estimated height per row
    overscan: 10,
  });

  return (
    <div className="w-full space-y-4 relative z-0">
      <AdvancedFilterPanel
        filters={filters}
        onChange={handleFilterChange}
        resultCount={filteredResults.length}
        totalCount={results.length}
      />

      <div className="flex items-center gap-2 justify-end mb-2">
        <button 
          onClick={() => ReconciliationApiService.downloadExport(sessionId, "csv")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black border border-white/5 hover:border-white/10 hover:bg-white/5 text-neutral-300 text-xs font-semibold transition-all">
          <FileText className="h-3.5 w-3.5 text-blue-400" /> Export CSV
        </button>
        <button 
          onClick={() => ReconciliationApiService.downloadExport(sessionId, "xlsx")}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black border border-white/5 hover:border-white/10 hover:bg-white/5 text-neutral-300 text-xs font-semibold transition-all">
          <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export XLSX
        </button>
      </div>

      <div className="w-full rounded-2xl border border-white/[0.05] bg-[#09090b] shadow-2xl overflow-hidden ring-1 ring-white/5">
        <div 
          ref={tableContainerRef} 
          className="overflow-auto max-h-[60vh] custom-scrollbar"
        >
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/[0.05]">
              {table.getHeaderGroups().map(headerGroup => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map(header => (
                    <th 
                      key={header.id} 
                      className="px-4 py-3.5 font-bold text-neutral-300 tracking-wider uppercase text-[10px]"
                      style={{ width: header.getSize() }}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {rowVirtualizer.getVirtualItems().length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-neutral-500 font-mono italic">
                    No reconciliation pairings found.
                  </td>
                </tr>
              ) : (
                <tr style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                  <td colSpan={5} className="p-0">
                    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                      {rowVirtualizer.getVirtualItems().map(virtualRow => {
                        const row = rows[virtualRow.index];
                        return (
                          <div 
                            key={row.id} 
                            className="absolute top-0 left-0 w-full flex items-center hover:bg-white/[0.02] transition-colors group"
                            style={{ 
                              transform: `translateY(${virtualRow.start}px)`,
                              height: `${virtualRow.size}px`
                            }}
                          >
                            <table className="w-full text-left text-xs border-collapse h-full">
                              <tbody>
                                <tr>
                                  {row.getVisibleCells().map(cell => (
                                    <td 
                                      key={cell.id} 
                                      className="border-b border-white/[0.02]"
                                      style={{ width: cell.column.getSize() }}
                                    >
                                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        );
                      })}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-white/[0.05] flex items-center justify-between bg-black/40 text-[10px] text-neutral-500 font-mono font-medium tracking-wide">
          <span>Displaying {filteredResults.length} / {results.length} mapped records</span>
          <span>Powered by Deterministic Engine v2.0</span>
        </div>
      </div>

      {/* Slide-out Premium AI Audit Review Panel */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-end font-sans transition-all duration-300">
          <div className="w-full max-w-lg h-full bg-[#09090b] border-l border-white/[0.05] p-6 flex flex-col justify-between shadow-2xl relative">
            <div>
              <div className="flex justify-between items-center pb-4 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Sparkles className="h-4 w-4 text-emerald-400" />
                  </div>
                  <h3 className="font-extrabold text-xs text-white uppercase tracking-wider">Assistive AI Audit Review</h3>
                </div>
                <button
                  onClick={() => setSelectedResult(null)}
                  className="p-1.5 rounded-lg bg-black border border-white/[0.05] hover:bg-white/5 hover:text-white text-neutral-400 transition-colors shadow-sm"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-5 p-3.5 bg-black rounded-xl border border-white/[0.05] shadow-inner flex justify-between items-center text-xs">
                <span className="font-mono text-neutral-400">
                  Key Reference: <b className="text-white font-bold">{selectedResult.bank_transaction?.reference || selectedResult.ledger_transaction?.reference || "N/A"}</b>
                </span>
                <span className="px-2 py-1 rounded-md bg-[#09090b] text-amber-400 border border-amber-500/20 text-[9px] uppercase font-bold font-mono tracking-wider shadow-sm">
                  {selectedResult.status.replace("_", " ")}
                </span>
              </div>

              {aiLoading && (
                <div className="mt-8 space-y-6 animate-pulse px-2">
                  <div className="h-4 bg-white/5 rounded-md w-1/3"></div>
                  <div className="space-y-3">
                    <div className="h-3.5 bg-white/5 rounded-md"></div>
                    <div className="h-3.5 bg-white/5 rounded-md"></div>
                    <div className="h-3.5 bg-white/5 rounded-md w-5/6"></div>
                  </div>
                  <div className="pt-6 border-t border-white/[0.05] space-y-4">
                    <div className="h-4 bg-white/5 rounded-md w-1/4"></div>
                    <div className="h-10 bg-white/5 rounded-xl"></div>
                  </div>
                  <div className="flex items-center justify-center p-12">
                    <RefreshCw className="h-6 w-6 text-emerald-400/50 animate-spin" />
                  </div>
                </div>
              )}

              {aiError && (
                <div className="mt-8 p-4 border border-rose-500/20 bg-rose-500/5 rounded-xl text-xs space-y-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold">
                    <AlertCircle className="h-4 w-4" />
                    <span>Inference Dispatched Failure</span>
                  </div>
                  <p className="text-neutral-400 leading-relaxed font-medium">{aiError}</p>
                </div>
              )}

              {!aiLoading && !aiError && aiData && (
                <div className="mt-6 space-y-6 overflow-y-auto max-h-[75vh] pr-2 custom-scrollbar">
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Lightbulb className="h-3.5 w-3.5 text-emerald-400" /> Discrepancy Observations
                    </h4>
                    <div className="text-[11px] text-neutral-200 leading-relaxed font-sans bg-black p-5 rounded-2xl border border-white/[0.05] shadow-sm">
                      {aiData.explanation.split('\\n').map((line, i) => (
                        <p key={i} className="mb-2 last:mb-0">{line}</p>
                      ))}
                    </div>
                  </div>
                  <div className="pt-5 border-t border-white/[0.05] flex items-center justify-between text-xs">
                    <span className="text-neutral-500 font-medium">Model Inference Accuracy:</span>
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono ${
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
            
            <div className="p-4 bg-black rounded-xl border border-white/[0.05] shadow-inner text-[10px] text-neutral-500 leading-relaxed flex gap-3 items-start">
              <HelpCircle className="h-4 w-4 text-neutral-600 shrink-0 mt-0.5" />
              <span>
                <strong className="text-neutral-300">AI Discrepancy reviews are advisory.</strong> This output is generated using Llama 3 70B assistive analytics and must be manually approved. It does not modify accounting persistent records or exact deterministic matching results.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
