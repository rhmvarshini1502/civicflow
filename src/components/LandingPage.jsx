import React, { useState, useEffect } from "react";
import { api } from "../api";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ShieldCheck, MessageSquarePlus, Route, CheckCircle2, ChevronRight, BarChart3, AlertCircle } from "lucide-react";

export default function LandingPage({ onNavigate, onOpenLogin }) {
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const data = await api.getPublicAnalytics();
        setStats(data.stats);
        
        // Format category distribution for charts
        const formattedChart = data.category_distribution.map((item, idx) => ({
          name: item.category,
          count: item.count,
        })).sort((a, b) => b.count - a.count).slice(0, 5); // top 5 categories
        
        setChartData(formattedChart);
      } catch (err) {
        console.error("Error loading public stats:", err);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

  const COLORS = ["#3b82f6", "#ef4444", "#f59e0b", "#10b981", "#8b5cf6"];

  return (
    <div className="min-h-screen bg-brand-50/50">
      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 sm:px-8 max-w-7xl mx-auto flex flex-col items-center text-center overflow-hidden">
        {/* Background micro-blobs */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-brand-200/40 rounded-full filter blur-3xl -z-10 animate-pulse" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-blue-100/30 rounded-full filter blur-3xl -z-10" />

        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-brand-100/80 border border-brand-200 text-brand-800 text-xs font-semibold uppercase tracking-wider mb-6 animate-fade-in">
          <ShieldCheck className="w-3.5 h-3.5 text-brand-700" />
          Verified Accountability Platform
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight font-outfit max-w-4xl leading-tight mb-6 animate-slide-up">
          Report Problems. Track Action. <br/>
          <span className="bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-700 bg-clip-text text-transparent">
            Improve Your City.
          </span>
        </h1>

        <p className="text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed mb-10 animate-slide-up [animation-delay:100ms]">
          A smart, citizen-driven platform that turns public infrastructure reports into trackable, measurable, and verified community action.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center w-full max-w-md animate-slide-up [animation-delay:200ms] mb-16">
          <button
            onClick={() => onNavigate("report")}
            className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg shadow-brand-600/10 hover:shadow-brand-600/20 transform hover:-translate-y-0.5 transition flex items-center justify-center gap-2"
          >
            <MessageSquarePlus className="w-5 h-5" />
            Report an Issue
          </button>
          <button
            onClick={() => onNavigate("dashboard")}
            className="w-full sm:w-auto bg-white border border-slate-200 hover:border-brand-500 hover:bg-brand-50/20 text-slate-800 hover:text-brand-800 font-semibold px-8 py-3.5 rounded-xl shadow-sm transition flex items-center justify-center gap-2"
          >
            <BarChart3 className="w-5 h-5" />
            Explore Dashboard
          </button>
        </div>
      </section>

      {/* Real-time Stats Section */}
      <section className="bg-white border-y border-slate-200/80 py-16 px-6 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-outfit mb-3">
              City Accountability Tracker
            </h2>
            <p className="text-slate-500 text-sm max-w-lg mx-auto">
              Real-time analytics collected from citizen reports and official municipal resolutions.
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-32 bg-slate-100 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
              {/* Counters */}
              <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                <div className="bg-brand-50/50 p-5 rounded-2xl border border-brand-100 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Reports</span>
                  <span className="text-3xl font-extrabold text-slate-900 font-outfit mt-2">{stats?.total || 0}</span>
                </div>
                <div className="bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Resolved Issues</span>
                  <span className="text-3xl font-extrabold text-emerald-900 font-outfit mt-2">{stats?.resolved || 0}</span>
                </div>
                <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Action</span>
                  <span className="text-3xl font-extrabold text-amber-900 font-outfit mt-2">
                    {(stats?.assigned || 0) + (stats?.in_progress || 0) + (stats?.reopened || 0)}
                  </span>
                </div>
                <div className="bg-red-50/50 p-5 rounded-2xl border border-red-100 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-red-600 uppercase tracking-wider">Overdue Alerts</span>
                  <span className="text-3xl font-extrabold text-red-900 font-outfit mt-2">{stats?.overdue || 0}</span>
                </div>
                <div className="col-span-2 bg-gradient-to-br from-brand-900 to-indigo-950 text-white p-5 rounded-2xl flex items-center justify-between shadow-md">
                  <div>
                    <div className="text-xs opacity-75 font-semibold uppercase tracking-wider">Resolution Success Rate</div>
                    <div className="text-3xl font-extrabold font-outfit mt-1">{stats?.resolution_rate || 0}%</div>
                  </div>
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 opacity-90" />
                </div>
              </div>

              {/* Chart */}
              <div className="lg:col-span-7 bg-brand-50/30 p-6 rounded-3xl border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-4">Top Reported Issues (Volume)</h3>
                {chartData.length > 0 ? (
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
                        <XAxis type="number" stroke="#94a3b8" fontSize={11} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={11} width={80} />
                        <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '12px' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-64 flex flex-col items-center justify-center text-slate-400 text-xs">
                    <AlertCircle className="w-8 h-8 mb-2" />
                    No reports mapped yet
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-20 px-6 sm:px-8 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-outfit mb-3">
            Closing the Civic Loop
          </h2>
          <p className="text-slate-500 text-sm max-w-lg mx-auto">
            Traditional portals file complaints away. CivicFlow enforces complete accountability at every milestone.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center text-brand-700 font-bold font-outfit mb-4">1</div>
            <h3 className="text-base font-bold text-slate-800 mb-2">Citizen Uploads</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Snaps a photo and inputs details. The client automatically tags exact GPS coordinates and fetches addresses.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center text-violet-700 font-bold font-outfit mb-4">2</div>
            <h3 className="text-base font-bold text-slate-800 mb-2">AI Analyzes &amp; Assigns</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              FastAPI parses content to determine category, safety severity, and matches it immediately to the proper department.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-bold font-outfit mb-4">3</div>
            <h3 className="text-base font-bold text-slate-800 mb-2">Track &amp; Escalate</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Dynamic countdowns based on SLA rules display. Delayed reports escalate automatically to supervisors and commissioners.
            </p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm relative hover:shadow-md transition">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold font-outfit mb-4">4</div>
            <h3 className="text-base font-bold text-slate-800 mb-2">Verify Resolution</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              Departments must upload after-photos. Citizen accepts or rejects. If rejected, the case automatically reopens.
            </p>
          </div>
        </div>
      </section>

      {/* Landing Footer CTA */}
      <section className="bg-slate-900 text-white py-16 px-6 sm:px-8 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/10 rounded-full filter blur-3xl -z-10" />
        <h2 className="text-3xl font-bold font-outfit mb-4">Ready to start improving your neighborhood?</h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
          Join other civic-minded citizens reporting issues, upvoting local complaints, and collaborating with officials.
        </p>
        <button
          onClick={onOpenLogin}
          className="bg-brand-500 hover:bg-brand-600 text-white font-semibold px-8 py-3.5 rounded-xl shadow-lg transition"
        >
          Sign In / Create Account
        </button>
      </section>
    </div>
  );
}
