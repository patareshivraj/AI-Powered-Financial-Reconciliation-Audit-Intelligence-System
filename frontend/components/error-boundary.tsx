"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error in ErrorBoundary:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-8 m-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6 text-rose-500" />
          </div>
          <h2 className="text-sm font-bold text-white mb-2">Component Crashed</h2>
          <p className="text-xs text-neutral-400 max-w-md mb-6 leading-relaxed">
            {this.props.fallbackMessage || "An unexpected error occurred in this section of the workspace. The rest of the platform remains operational."}
            <br />
            <br />
            <span className="font-mono text-[10px] text-rose-400 bg-rose-500/10 px-2 py-1 rounded">
              {this.state.error?.message}
            </span>
          </p>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-colors border border-white/10"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
