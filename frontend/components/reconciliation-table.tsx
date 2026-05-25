"use client";

import React, { useState } from "react";
import { ReconciliationResult, ReconciliationApiService } from "../services/reconciliation-api";
import { StatusBadge } from "./status-badge";
import { Search, FileSpreadsheet, FileText, Calendar, DollarSign, RefreshCw, AlertCircle } from "lucide-react";

interface ReconciliationTableProps {
  results: ReconciliationResult[];
  sessionId: string;
}

export function ReconciliationTable({ results, sessionId }: ReconciliationTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 10;

  // 1. Format Currency Helper
  const formatCurrency = (val: number | null | undefined) => {
    if (val === null || val === undefined) return "—";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);
  };

  // 2. Format Date Helper
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    } catch {
      return dateStr;
    }
  };

  // 3. Filtering logic
  const filteredResults = results.filter((res) => {
    const statusMatch = selectedStatus === "ALL" || res.status === selectedStatus;
    
    const bRef = res.bank_transaction?.reference || "";
    const eRef = res.ledger_transaction?.reference || "";
    const bDesc = res.bank_transaction?.description || "";
    const eDesc = res.ledger_transaction?.description || "";
    const remarks = res.remarks || "";

    const matchesSearch = 
      bRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eRef.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      eDesc.toLowerCase().includes(searchTerm.toLowerCase()) ||
      remarks.toLowerCase().includes(searchTerm.toLowerCase());

    return statusMatch && matchesSearch;
  });

  // 4. Pagination boundaries
  const totalRows = filteredResults.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  const startIndex = currentPage * rowsPerPage;
  const paginatedRows = filteredResults.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Search and Filters Banner */}
      <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 backdrop-blur-md">
        {/* Search Input */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by reference, description, remarks..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 font-sans font-medium"
          />
        </div>

        {/* Filters and Exports */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter dropdown */}
          <select
            value={selectedStatus}
            onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(0); }}
            className="px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none font-medium cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="MATCHED">Matched</option>
            <option value="PARTIAL_MATCH">Partial Matches</option>
            <option value="AMOUNT_MISMATCH">Amount Mismatches</option>
            <option value="DATE_MISMATCH">Date Mismatches</option>
            <option value="MISSING_IN_BANK">Missing in Bank</option>
            <option value="MISSING_IN_EXTERNAL">Missing in Ledger</option>
            <option value="DUPLICATE">Duplicates</option>
          </select>

          {/* Export Buttons */}
          <a
            href={ReconciliationApiService.getExportUrl(sessionId, "csv")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <FileText className="h-3.5 w-3.5 text-blue-400" />
            <span>Export CSV</span>
          </a>
          <a
            href={ReconciliationApiService.getExportUrl(sessionId, "xlsx")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
            <span>Export XLSX</span>
          </a>
        </div>
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
                <th className="p-4 font-medium max-w-[200px]">Audit Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginatedRows.map((row) => {
                const referenceCode = row.bank_transaction?.reference || row.ledger_transaction?.reference || "N/A";
                
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
                          <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
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
                          <p className="text-[10px] text-slate-500 truncate max-w-[200px]">
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

                    {/* 5. Audit Comments */}
                    <td className="p-4 max-w-[200px]">
                      <p className="text-[11px] text-slate-400 font-sans italic leading-relaxed">
                        {row.remarks || "No remarks annotated."}
                      </p>
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
    </div>
  );
}
