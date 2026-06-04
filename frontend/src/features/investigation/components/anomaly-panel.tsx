"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, ShieldAlert, CheckCircle2, RefreshCw } from "lucide-react";
import { InvestigationApiService } from "../services/investigation-api";

export function AnomalyPanel({ sessionId }: { sessionId: string }) {
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnomalies = async () => {
      try {
        const res = await InvestigationApiService.getAnomalies(sessionId);
        if (res.success && res.data) setAnomalies(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnomalies();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="w-full h-32 flex items-center justify-center bg-slate-900/20 border border-slate-800 rounded-2xl animate-pulse">
        <RefreshCw className="h-5 w-5 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (anomalies.length === 0) {
    return (
      <div className="w-full p-8 bg-emerald-950/10 border border-emerald-900/30 rounded-2xl flex flex-col items-center justify-center text-center">
        <CheckCircle2 className="h-10 w-10 text-emerald-500/50 mb-3" />
        <h3 className="text-emerald-400 font-bold text-sm">No Operational Anomalies Detected</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm">
          The deterministic anomaly engine scanned the reconciliation dataset and found no critical compliance risks or extreme outliers.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <ShieldAlert className="h-4 w-4 text-rose-500" /> Detected Anomalies & Outliers
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {anomalies.map((a, i) => (
          <div key={i} className="p-4 bg-rose-950/10 border border-rose-900/40 rounded-xl relative overflow-hidden flex flex-col gap-3">
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <AlertCircle className="h-12 w-12 text-rose-500" />
            </div>
            <div className="flex justify-between items-start">
              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 text-[10px] font-bold uppercase tracking-wider font-mono">
                {a.type.replace(/_/g, " ")}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">ID: {a.result_id}</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans mt-1">
              {a.description}
            </p>
            <div className="pt-3 border-t border-rose-900/30 text-[10px] text-rose-400/80 font-mono font-medium">
              Severity: {a.severity}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
