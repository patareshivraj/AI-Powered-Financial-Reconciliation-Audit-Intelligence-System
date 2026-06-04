"use client";

import React, { useState } from "react";
import { Send, Bot, User, Sparkles, Loader2, X, MessageSquare } from "lucide-react";
import { InvestigationApiService } from "../../investigation/services/investigation-api";

interface Message {
  role: "user" | "ai";
  content: string;
  filters?: any;
}

export function AiChatAssistant({ sessionId }: { sessionId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "ai", content: "I am your AI Investigation Assistant. I have analyzed the operational metrics and mismatches. How can I help you explore this session?" }
  ]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    const userQuery = query;
    setQuery("");
    setMessages(prev => [...prev, { role: "user", content: userQuery }]);
    setLoading(true);

    try {
      const res = await InvestigationApiService.chatWithAssistant(sessionId, userQuery);
      if (res.success && res.data) {
        setMessages(prev => [...prev, { 
          role: "ai", 
          content: res.data.answer,
          filters: res.data.suggested_filters
        }]);
      } else {
        setMessages(prev => [...prev, { role: "ai", content: `Error: ${res.errors?.[0] || 'Investigation query failed.'}` }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "ai", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-8 right-8 h-14 w-14 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-full shadow-[0_0_30px_rgba(16,185,129,0.3)] flex items-center justify-center transition-all hover:scale-105 z-40 ring-4 ring-emerald-500/20"
        >
          <MessageSquare className="h-6 w-6" />
        </button>
      )}

      {/* Floating Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-8 right-8 w-[380px] h-[600px] max-h-[80vh] flex flex-col bg-slate-950/80 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl z-50 animate-in slide-in-from-bottom-5 duration-300">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                <Sparkles className="h-4 w-4 text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Investigation Assistant</h3>
                <p className="text-xs text-slate-400 font-mono">Llama-3 70B Analytics Engine</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : ""}`}>
                <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                  msg.role === "user" ? "bg-blue-500/20 text-blue-400" : "bg-emerald-500/20 text-emerald-400"
                }`}>
                  {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                </div>
                <div className={`p-3 rounded-xl text-xs leading-relaxed ${
                  msg.role === "user" 
                    ? "bg-blue-600 text-white rounded-tr-none" 
                    : "bg-slate-900 border border-slate-800 text-slate-300 rounded-tl-none"
                }`}>
                  {msg.content}
                  {msg.filters && Object.keys(msg.filters).length > 0 && (
                    <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-xs text-emerald-400">
                      <span className="text-slate-500 block mb-1 font-bold">Suggested Filters:</span>
                      {JSON.stringify(msg.filters, null, 2)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-1">
                  <Bot className="h-3 w-3" />
                </div>
                <div className="p-4 rounded-xl rounded-tl-none bg-slate-900 border border-slate-800 text-slate-300 flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-400" />
                  <span className="text-xs font-mono animate-pulse">Running data heuristics...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-slate-900/50 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask about mismatches..."
              disabled={loading}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-slate-600 transition-colors"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-9 w-9 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:hover:bg-emerald-500 flex items-center justify-center text-slate-950 transition-colors shrink-0"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}
