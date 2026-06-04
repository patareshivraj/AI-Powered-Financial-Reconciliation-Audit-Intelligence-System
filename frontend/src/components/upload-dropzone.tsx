"use client";

import React, { useState, useRef, DragEvent } from "react";
import { UploadCloud, CheckCircle2, AlertCircle, FileSpreadsheet, Loader2 } from "lucide-react";

interface UploadDropzoneProps {
  title: string;
  subtitle: string;
  fileType: "BANK_STATEMENT" | "EXTERNAL_LEDGER";
  onUploadSuccess: (file: File, sessionId: string) => void;
  sessionId?: string;
  uploadFn: (file: File, sessionId?: string) => Promise<any>;
}

export function UploadDropzone({
  title,
  subtitle,
  fileType,
  onUploadSuccess,
  sessionId,
  uploadFn,
}: UploadDropzoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      await processFileUpload(file);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      await processFileUpload(file);
    }
  };

  const processFileUpload = async (file: File) => {
    // 1. Core extensions validation check
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "xlsx") {
      setUploadState("error");
      setErrorMsg("Unsupported format. Please upload only .csv or .xlsx files.");
      return;
    }

    // 2. Core sizes validation check (50MB Limit)
    if (file.size > 50 * 1024 * 1024) {
      setUploadState("error");
      setErrorMsg("File size limits exceeded (max 50MB is allowed).");
      return;
    }

    setUploadedFile(file);
    setUploadState("uploading");
    setErrorMsg("");

    try {
      // Execute the endpoint upload
      const result = await uploadFn(file, sessionId);
      if (result.success && result.data) {
        setUploadState("success");
        onUploadSuccess(file, result.data.session_id);
      } else {
        setUploadState("error");
        setErrorMsg(result.errors?.[0] || "Upload failed during parsing verification.");
      }
    } catch (err: any) {
      setUploadState("error");
      setErrorMsg(err.message || "Network failure connecting to parsing servers.");
    }
  };

  const triggerInputClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragEnter={handleDrag}
      onDragOver={handleDrag}
      onDragLeave={handleDrag}
      onDrop={handleDrop}
      className={`relative w-full rounded-2xl border border-dashed transition-all duration-300 ${
        isDragActive
          ? "border-emerald-500 bg-emerald-950/20 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
          : "border-slate-800 bg-slate-950/40 hover:border-slate-700 hover:bg-slate-900/40"
      } backdrop-blur-md overflow-hidden`}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        accept=".csv, .xlsx"
        className="hidden"
      />

      <div className="p-8 flex flex-col items-center text-center justify-center min-h-[220px]">
        {uploadState === "idle" && (
          <>
            <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-slate-400 mb-4 transition-transform group-hover:scale-110">
              <UploadCloud className="h-8 w-8" />
            </div>
            <h4 className="font-semibold text-slate-100 mb-1">{title}</h4>
            <p className="text-sm text-slate-400 mb-4 max-w-[280px]">{subtitle}</p>
            <button
              onClick={triggerInputClick}
              type="button"
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-700 hover:border-slate-500 text-slate-200 bg-slate-900/60 hover:bg-slate-900 transition-colors shadow-sm"
            >
              Browse Files
            </button>
          </>
        )}

        {uploadState === "uploading" && (
          <div className="flex flex-col items-center py-4">
            <Loader2 className="h-8 w-8 text-emerald-500 animate-spin mb-4" />
            <h4 className="font-medium text-slate-200 mb-1">Streaming ledger rows...</h4>
            <p className="text-xs text-slate-400">Piping chunks to isolated directory</p>
            <div className="w-48 bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
              <div className="bg-emerald-500 h-full w-[65%] animate-pulse rounded-full" />
            </div>
          </div>
        )}

        {uploadState === "success" && uploadedFile && (
          <div className="flex flex-col items-center">
            <div className="p-4 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 mb-4 animate-bounce">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h4 className="font-semibold text-emerald-400 mb-1">Upload Standardized!</h4>
            <div className="flex items-center gap-2 p-2 rounded bg-slate-900 border border-slate-800/80 mb-4 text-xs text-slate-300">
              <FileSpreadsheet className="h-4 w-4 text-emerald-500" />
              <span className="font-medium truncate max-w-[150px]">{uploadedFile.name}</span>
              <span className="text-slate-500">
                ({(uploadedFile.size / 1024).toFixed(1)} KB)
              </span>
            </div>
            <button
              onClick={triggerInputClick}
              type="button"
              className="text-xs font-medium text-slate-400 hover:text-slate-200 underline transition-colors"
            >
              Replace Document
            </button>
          </div>
        )}

        {uploadState === "error" && (
          <div className="flex flex-col items-center">
            <div className="p-4 rounded-full bg-red-950/40 border border-red-500/30 text-red-400 mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h4 className="font-semibold text-red-400 mb-1">Verification Refused</h4>
            <p className="text-xs text-slate-300 mb-4 max-w-[280px] bg-red-950/20 p-2 rounded border border-red-500/10">
              {errorMsg}
            </p>
            <button
              onClick={triggerInputClick}
              type="button"
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-950 border border-red-500/30 hover:border-red-400 text-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
