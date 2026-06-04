"use client";

import React, { useState, useCallback } from "react";
import { Filter, X, RotateCcw, ChevronDown } from "lucide-react";

export interface FilterState {
  status: string;
  search: string;
  minAmount: string;
  maxAmount: string;
  dateFrom: string;
  dateTo: string;
}

const INITIAL_FILTERS: FilterState = {
  status: "ALL",
  search: "",
  minAmount: "",
  maxAmount: "",
  dateFrom: "",
  dateTo: "",
};

interface AdvancedFilterPanelProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  resultCount: number;
  totalCount: number;
}

export function AdvancedFilterPanel({ filters, onChange, resultCount, totalCount }: AdvancedFilterPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const update = useCallback((key: keyof FilterState, value: string) => {
    onChange({ ...filters, [key]: value });
  }, [filters, onChange]);

  const reset = useCallback(() => {
    onChange(INITIAL_FILTERS);
  }, [onChange]);

  const activeCount = Object.entries(filters).filter(
    ([k, v]) => v !== "" && v !== "ALL"
  ).length;

  return (
    <div className="p-4 bg-slate-900/40 border border-slate-800 rounded-2xl backdrop-blur-md space-y-3">
      {/* Top row: search + status + toggle */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <input
            type="text"
            placeholder="Search reference, description, remarks..."
            value={filters.search}
            onChange={(e) => update("search", e.target.value)}
            className="w-full pl-3 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-slate-700 font-sans"
          />
        </div>

        {/* Status */}
        <select
          value={filters.status}
          onChange={(e) => update("status", e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none font-medium cursor-pointer"
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

        {/* Toggle advanced */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold transition-colors"
        >
          <Filter className="h-3.5 w-3.5" />
          Advanced{activeCount > 0 && ` (${activeCount})`}
          <ChevronDown className={`h-3 w-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>

        {activeCount > 0 && (
          <button onClick={reset} className="flex items-center gap-1 px-2.5 py-2 text-xs text-rose-400 hover:text-rose-300 transition-colors">
            <RotateCcw className="h-3 w-3" /> Reset
          </button>
        )}

        {/* Result count */}
        <span className="text-[10px] text-slate-500 font-mono ml-auto">{resultCount} of {totalCount} records</span>
      </div>

      {/* Expanded filters */}
      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-slate-800">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Min Amount</label>
            <input
              type="number"
              value={filters.minAmount}
              onChange={(e) => update("minAmount", e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-slate-700"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Max Amount</label>
            <input
              type="number"
              value={filters.maxAmount}
              onChange={(e) => update("maxAmount", e.target.value)}
              placeholder="999999.99"
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-slate-700"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => update("dateFrom", e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-slate-700"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => update("dateTo", e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-mono focus:outline-none focus:border-slate-700"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export { INITIAL_FILTERS };
