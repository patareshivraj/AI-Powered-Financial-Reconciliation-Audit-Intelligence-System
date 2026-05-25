"use client";

import React, { useEffect, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, AlertTriangle, Activity, Database, RefreshCw } from "lucide-react";
import { InvestigationApiService } from "../../investigation/services/investigation-api";

export function AnalyticsDashboard({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await InvestigationApiService.getAnalytics(sessionId);
        if (res.success) setData(res.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="w-full h-48 flex items-center justify-center bg-slate-900/20 border border-slate-800 rounded-2xl animate-pulse">
        <RefreshCw className="h-6 w-6 text-slate-500 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6">
      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database className="h-16 w-16 text-blue-500" />
          </div>
          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">Total Processed</span>
          <span className="text-2xl font-black text-white font-mono">{data.total_processed}</span>
        </div>

        <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-5 flex flex-col gap-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle className="h-16 w-16 text-rose-500" />
          </div>
          <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5">
            Mismatch Value Risk
          </span>
          <span className="text-2xl font-black text-rose-400 font-mono">
            ${data.total_mismatch_value?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* Chart Row */}
      <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-6">
        <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-400" /> System Processing Velocity
        </h3>
        <div className="h-64 w-full">
          {data.volume_trends && data.volume_trends.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.volume_trends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#020617', borderColor: '#1e293b', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="total_volume" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-xs font-mono">
              Insufficient time-series data
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
