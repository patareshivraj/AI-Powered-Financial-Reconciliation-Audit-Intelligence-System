import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, Copy } from "lucide-react";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  let styles = "bg-slate-900 text-slate-400 border-slate-800";
  let Icon = AlertTriangle;
  let text = status;

  switch (status) {
    case "MATCHED":
      styles = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      Icon = CheckCircle2;
      text = "MATCHED";
      break;
    case "PARTIAL_MATCH":
      styles = "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      Icon = AlertTriangle;
      text = "PARTIAL";
      break;
    case "AMOUNT_MISMATCH":
      styles = "bg-amber-500/10 text-amber-400 border-amber-500/20";
      Icon = AlertTriangle;
      text = "AMT MISMATCH";
      break;
    case "DATE_MISMATCH":
      styles = "bg-orange-500/10 text-orange-400 border-orange-500/20";
      Icon = AlertTriangle;
      text = "DATE MISMATCH";
      break;
    case "MISSING_IN_BANK":
      styles = "bg-rose-500/10 text-rose-400 border-rose-500/20";
      Icon = XCircle;
      text = "MISSING IN BANK";
      break;
    case "MISSING_IN_EXTERNAL":
      styles = "bg-rose-500/10 text-rose-400 border-rose-500/20";
      Icon = XCircle;
      text = "MISSING IN LEDGER";
      break;
    case "DUPLICATE":
      styles = "bg-orange-600/10 text-orange-500 border-orange-600/20";
      Icon = Copy;
      text = "DUPLICATE";
      break;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border font-sans tracking-wide uppercase shrink-0 ${styles}`}
    >
      <Icon className="h-3 w-3" />
      <span>{text}</span>
    </span>
  );
}
