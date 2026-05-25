"use client";

import React, { useState } from "react";
import { PreviewDataResponse } from "../types/upload";
import { Table, ArrowRight, Sparkles, Receipt, FileText, Ban } from "lucide-react";

interface DataPreviewTableProps {
  data: PreviewDataResponse;
  title: string;
}

export function DataPreviewTable({ data, title }: DataPreviewTableProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const rowsPerPage = 5;
  
  const totalRows = data.preview_rows.length;
  const totalPages = Math.ceil(totalRows / rowsPerPage);
  
  const startIndex = currentPage * rowsPerPage;
  const paginatedRows = data.preview_rows.slice(startIndex, startIndex + rowsPerPage);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(val);
  };

  return (
    <div className="w-full rounded-2xl border border-slate-800 bg-slate-950/40 backdrop-blur-md overflow-hidden">
      {/* 1. Header Banner */}
      <div className="p-6 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-slate-100">{title}</h4>
            <p className="text-xs text-slate-400">
              Parsed from <span className="text-slate-300 font-medium">{data.filename}</span> • {data.total_records} records total
            </p>
          </div>
        </div>

        {/* Dynamic Summaries */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] md:text-xs">
            <span className="text-slate-500 mr-1.5 font-medium">Deposits:</span>
            <span className="text-emerald-400 font-semibold">{formatCurrency(data.metrics.total_deposits_volume)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] md:text-xs">
            <span className="text-slate-500 mr-1.5 font-medium">Withdrawals:</span>
            <span className="text-red-400 font-semibold">{formatCurrency(data.metrics.total_withdrawals_volume)}</span>
          </div>
        </div>
      </div>

      {/* 2. Dynamic Column Mapping Legend */}
      <div className="px-6 py-4 bg-slate-950/80 border-b border-slate-800 flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400">
          <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
          <span>Intelligent Schema Transformations</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {Object.entries(data.mapped_columns).map(([rawCol, canonKey]) => (
            <div
              key={rawCol}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-900 border border-slate-800/80 text-[10px] font-mono text-slate-300 shadow-sm"
            >
              <span className="text-slate-500 font-sans">{rawCol}</span>
              <ArrowRight className="h-3 w-3 text-emerald-500" />
              <span className="text-emerald-400 font-semibold">{canonKey}</span>
            </div>
          ))}
          {Object.keys(data.mapped_columns).length === 0 && (
            <div className="text-[10px] text-slate-500 italic">No direct custom mappings matched. System using core schemas.</div>
          )}
        </div>
      </div>

      {/* 3. Paginated Preview Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/10 text-slate-400 font-mono">
              <th className="p-4 font-medium">Date</th>
              <th className="p-4 font-medium">Reference ID</th>
              <th className="p-4 font-medium">Description</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium text-right">Normalized Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {paginatedRows.map((row, idx) => {
              const amountVal = Number(row.amount) || 0;
              const isCredit = amountVal >= 0;
              
              return (
                <tr key={idx} className="hover:bg-slate-900/25 transition-colors">
                  <td className="p-4 text-slate-300 whitespace-nowrap font-mono">
                    {row.date || <span className="text-slate-600">NULL</span>}
                  </td>
                  <td className="p-4 font-mono text-slate-400">
                    {row.reference_id ? (
                      <span className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px]">
                        {row.reference_id}
                      </span>
                    ) : (
                      <span className="text-slate-600">NULL</span>
                    )}
                  </td>
                  <td className="p-4 text-slate-200 max-w-[200px] truncate">
                    {row.description || <span className="text-slate-600">NULL</span>}
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${
                        isCredit
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-red-500/10 text-red-400 border border-red-500/20"
                      }`}
                    >
                      {isCredit ? "CREDIT" : "DEBIT"}
                    </span>
                  </td>
                  <td
                    className={`p-4 text-right font-semibold font-mono ${
                      isCredit ? "text-emerald-400" : "text-red-400"
                    }`}
                  >
                    {formatCurrency(amountVal)}
                  </td>
                </tr>
              );
            })}

            {paginatedRows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500 font-mono italic">
                  <Ban className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                  No row data available to preview.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 4. Paginated Actions bar */}
      {totalPages > 1 && (
        <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/15">
          <span className="text-[11px] text-slate-500">
            Showing rows {startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
              disabled={currentPage === 0}
              className="px-2.5 py-1 text-[11px] rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages - 1))}
              disabled={currentPage === totalPages - 1}
              className="px-2.5 py-1 text-[11px] rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
