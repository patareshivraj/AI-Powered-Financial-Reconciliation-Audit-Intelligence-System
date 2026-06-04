"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ReconciliationResult } from "../services/reconciliation-api";
import { AiApiService, MismatchExplanation } from "../features/ai/services/ai-api";
import { 
  Sparkles, X, RefreshCw, AlertCircle, Lightbulb, HelpCircle 
} from "lucide-react";

interface AiAuditDrawerProps {
  selectedResult: ReconciliationResult | null;
  onClose: () => void;
}

export function AiAuditDrawer({ selectedResult, onClose }: AiAuditDrawerProps) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState<MismatchExplanation | null>(null);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    if (!selectedResult) {
      setAiData(null);
      setAiError("");
      return;
    }

    let active = true;
    const fetchExplanation = async () => {
      setAiLoading(true);
      setAiError("");
      setAiData(null);
      try {
        const res = await AiApiService.explainMismatch(selectedResult.id);
        if (active) {
          if (res.success && res.data) {
            setAiData(res.data);
          } else {
            setAiError(res.errors?.[0] || "Inference error occurred.");
          }
        }
      } catch (err: any) {
        if (active) {
          setAiError(err.message || "Failed communicating with Llama-3.");
        }
      } finally {
        if (active) {
          setAiLoading(false);
        }
      }
    };

    fetchExplanation();

    return () => {
      active = false;
    };
  }, [selectedResult]);

  if (!selectedResult) return null;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-end font-sans transition-all duration-300">
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
              onClick={onClose}
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
        
        <div className="p-4 bg-black rounded-xl border border-white/[0.05] shadow-inner text-[10px] text-neutral-500 leading-relaxed flex gap-3 items-start mt-4">
          <HelpCircle className="h-4 w-4 text-neutral-600 shrink-0 mt-0.5" />
          <span>
            <strong className="text-neutral-300">AI Discrepancy reviews are advisory.</strong> This output is generated using Llama 3 70B assistive analytics and must be manually approved. It does not modify accounting persistent records or exact deterministic matching results.
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}
