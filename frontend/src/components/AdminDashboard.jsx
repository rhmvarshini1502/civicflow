import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend
} from "recharts";
import { 
  Shield, Users, ShieldAlert, Award, FileText, 
  TrendingUp, Activity, Cpu, Sparkles, Calendar, ArrowRight, Clock
} from "lucide-react";

export default function AdminDashboard({ onViewComplaint }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAdminData = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminAnalytics();
      setData(res);
    } catch (err) {
      setError("Failed to load admin analytics: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-7xl mx-auto animate-pulse">
        <div className="h-16 bg-slate-100 rounded-3xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-24 bg-slate-100 rounded-2xl" />)}
        </div>
        <div className="h-64 bg-slate-100 rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-700 bg-red-50 rounded-3xl max-w-3xl mx-auto my-8 border">
        {error}
      </div>
    );
  }

  // Format Recharts data safely
  const categoryData = (data?.category_distribution || []).map((item, idx) => ({
    name: item.category,
    count: item.count,
  })).sort((a, b) => b.count - a.count);

  const statusData = [
    { name: "Reported", value: data?.stats?.assigned || 0 },
    { name: "In Progress", value: data?.stats?.in_progress || 0 },
    { name: "Resolved", value: data?.stats?.resolved || 0 },
    { name: "Reopened", value: data?.stats?.reopened || 0 },
  ].filter(item => item.value > 0);

  const PIE_COLORS = ["#6366f1", "#3b82f6", "#10b981", "#f59e0b"];
  const BAR_COLORS = ["#3b82f6", "#6366f1", "#ec4899", "#f59e0b", "#10b981", "#8b5cf6"];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in space-y-8">
      {/* Admin header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full translate-x-10 -translate-y-10" />
        
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center border border-indigo-400">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">Executive Management Portal</div>
            <h2 className="text-xl font-bold font-outfit">City Command Center</h2>
          </div>
        </div>

        <div className="text-xs text-indigo-200 border-l border-indigo-700/80 pl-4 max-w-sm">
          Authority levels active. Review municipal resolution timings and process SLA escalations.
        </div>
      </div>

      {/* KPI Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400">Total System Complaints</span>
          <span className="text-2xl font-extrabold text-slate-800 font-outfit mt-2">{data?.stats?.total || 0}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400">Citizen Signups</span>
          <span className="text-2xl font-extrabold text-slate-800 font-outfit mt-2 flex items-center gap-1">
            <Users className="w-4 h-4 text-indigo-500" />
            {data?.admin_stats?.citizen_count || 0}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400">Resolution Rate</span>
          <span className="text-2xl font-extrabold text-emerald-600 font-outfit mt-2">{data?.stats?.resolution_rate || 0}%</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400">Overdue SLA Files</span>
          <span className="text-2xl font-extrabold font-outfit mt-2 text-red-600 flex items-center gap-1">
            <Clock className="w-4 h-4 animate-pulse" />
            {data?.stats?.overdue || 0}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between col-span-2 lg:col-span-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">Breach Escalations</span>
          <span className="text-2xl font-extrabold text-amber-600 font-outfit mt-2 flex items-center gap-1">
            <ShieldAlert className="w-4 h-4" />
            {data?.admin_stats?.escalations_count || 0}
          </span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Category distribution */}
        <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Volume Distribution by Category</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} />
                <YAxis stroke="#94a3b8" fontSize={10} />
                <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={25}>
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={BAR_COLORS[index % BAR_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status pie chart */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Lifecycle Stage Breakdown</h3>
          <div className="h-56 flex justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-slate-400 text-xs flex items-center">No reports mapped</div>
            )}
          </div>
          <div className="flex justify-center gap-4 flex-wrap text-[10px] text-slate-500 font-semibold mt-2">
            {statusData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[index % PIE_COLORS.length] }} />
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI INSIGHTS BLOCK */}
      <div className="bg-gradient-to-br from-indigo-50 to-brand-50 border rounded-3xl p-6 border-indigo-100">
        <h3 className="text-sm font-bold text-slate-800 font-outfit mb-4 flex items-center gap-2">
          <div className="bg-indigo-100 p-1.5 rounded-lg text-indigo-700">
            <Cpu className="w-4 h-4" />
          </div>
          CivicFlow AI Predictive Insights
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(data?.ai_insights || []).map((insight, idx) => (
            <div key={idx} className="bg-white p-4 rounded-2xl border border-indigo-50 shadow-sm flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-700 leading-relaxed font-medium">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* DEPARTMENT PERFORMANCE TABLE */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Department Performance Directory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/40 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b">
                <th className="p-4">Department Name</th>
                <th className="p-4">Total Files</th>
                <th className="p-4">Resolved</th>
                <th className="p-4">Pending</th>
                <th className="p-4">Overdue SLA</th>
                <th className="p-4 text-right">Avg Resolution (Days)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
              {(data?.department_performance || []).map((d) => (
                <tr key={d.department} className="hover:bg-slate-50/20">
                  <td className="p-4 font-bold text-slate-800">{d.department}</td>
                  <td className="p-4">{d.total}</td>
                  <td className="p-4 text-emerald-600">{d.resolved}</td>
                  <td className="p-4">{d.pending}</td>
                  <td className={`p-4 ${d.overdue > 0 ? "font-bold text-red-600" : ""}`}>{d.overdue}</td>
                  <td className="p-4 text-right font-mono text-slate-500">{d.avg_resolution_days} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ACTIVE ESCALATION LIST */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Breached SLA Escalation Logs</h3>
          <span className="text-[10px] bg-amber-100 border border-amber-200 text-amber-800 rounded font-bold uppercase px-2 py-0.5">
            Active Warning Logs
          </span>
        </div>
        
        {(!data?.recent_escalations || data.recent_escalations.length === 0) ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            No active escalations logged. All departments operating within parameters.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {data.recent_escalations.map((esc) => (
              <div 
                key={esc.id} 
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/20"
              >
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-brand-700">{esc.complaint_code}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                      esc.level === "Higher Authority" ? "bg-red-900 text-white border-red-900" : "bg-amber-100 border-amber-200 text-amber-800"
                    }`}>
                      Escalated: {esc.level}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5" /> {new Date(esc.created_at).toLocaleString()}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-800">{esc.category}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">"{esc.reason}"</p>
                </div>
                
                <button
                  onClick={() => onViewComplaint && onViewComplaint(esc.id)}
                  className="bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-xl px-3 py-2 text-xs font-bold border border-slate-200/80 flex items-center gap-1 transition flex-shrink-0"
                >
                  Inspect Case <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
