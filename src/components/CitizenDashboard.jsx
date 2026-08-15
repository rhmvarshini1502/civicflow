import React, { useState, useEffect } from "react";
import { api } from "../api";
import BeforeAfterSlider from "./BeforeAfterSlider";
import { 
  Award, Sparkles, Plus, Search, Calendar, MapPin, 
  AlertTriangle, CheckCircle, Clock, ShieldAlert, 
  ArrowRight, ThumbsUp, X, Check, HelpCircle, ChevronRight
} from "lucide-react";

export default function CitizenDashboard({ userProfile, onNavigate, onRefreshProfile }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMyReports, setFilterMyReports] = useState(true); // Toggle My Reports vs All Reports
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [verifyComments, setVerifyComments] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Load complaints based on filters
  const loadComplaints = async () => {
    try {
      setLoading(true);
      const list = await api.getComplaints({
        search: search || undefined,
        status: statusFilter || undefined,
        my_reports: filterMyReports,
      });
      setComplaints(list);
    } catch (err) {
      console.error("Error loading complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [filterMyReports, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadComplaints();
  };

  // Open Details Modal and fetch full logs
  const handleViewDetails = async (id) => {
    try {
      const detail = await api.getComplaint(id);
      setSelectedComplaint(detail);
      setDetailModalOpen(true);
      setVerifyComments("");
    } catch (err) {
      alert("Failed to load details: " + err.message);
    }
  };

  // Support / Upvote complaint
  const handleSupport = async (id, e) => {
    e.stopPropagation();
    try {
      await api.supportComplaint(id);
      loadComplaints();
      onRefreshProfile(); // Refresh gamification points
    } catch (err) {
      alert("Failed to upvote: " + err.message);
    }
  };

  // Verify resolution
  const handleVerify = async (result) => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      await api.verifyComplaint(selectedComplaint.id, result, verifyComments);
      setDetailModalOpen(false);
      loadComplaints();
      onRefreshProfile();
    } catch (err) {
      alert("Verification error: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Gamification stats
  const points = userProfile?.points || 0;
  const badge = userProfile?.badge || "Novice Reporter";
  let pointsToNext = 100 - points;
  let nextBadge = "Community Helper";
  let percent = (points / 100) * 100;

  if (points >= 100 && points < 250) {
    pointsToNext = 250 - points;
    nextBadge = "Civic Champion";
    percent = ((points - 100) / 150) * 100;
  } else if (points >= 250) {
    pointsToNext = 0;
    nextBadge = "Elite Citizen";
    percent = 100;
  }

  // Calculate status progress steps
  const getStatusStep = (status) => {
    const steps = ["Reported", "Assigned", "In_Progress", "Resolved", "Closed"];
    if (status === "Reopened") return 2; // re-routed back to In Progress
    return steps.indexOf(status);
  };

  // Format SLA display text
  const renderSLA = (complaint) => {
    if (complaint.status === "Closed" || complaint.status === "Resolved") {
      return (
        <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
          <CheckCircle className="w-3.5 h-3.5" /> Resolved on schedule
        </span>
      );
    }
    
    const deadlineDate = new Date(complaint.deadline);
    const now = new Date();
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return (
        <span className="text-[11px] text-red-600 font-bold flex items-center gap-1 animate-pulse">
          <ShieldAlert className="w-3.5 h-3.5 text-red-600" /> Overdue by {Math.abs(diffDays)} days
        </span>
      );
    } else if (diffDays === 0) {
      return (
        <span className="text-[11px] text-amber-600 font-semibold flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> Due within 24 hours
        </span>
      );
    } else {
      return (
        <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {diffDays} days remaining
        </span>
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 animate-fade-in">
      {/* Gamification Dashboard Header */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        <div className="lg:col-span-8 bg-gradient-to-r from-brand-900 via-brand-850 to-indigo-950 text-white rounded-3xl p-6 shadow-md relative overflow-hidden flex flex-col justify-between min-h-[180px]">
          {/* Decorative design elements */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full translate-x-10 -translate-y-10" />
          <div className="absolute left-1/3 bottom-0 w-24 h-24 bg-white/5 rounded-full translate-y-12" />

          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-brand-300 font-semibold tracking-wider uppercase">Welcome back,</span>
              <h2 className="text-2xl font-extrabold font-outfit mt-1">{userProfile?.name}</h2>
            </div>
            <button
              onClick={() => onNavigate("report")}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-brand-500/20 text-xs flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-4 h-4" /> Report New Issue
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-white/10">
            <div>
              <span className="text-[10px] opacity-75 uppercase">Role</span>
              <div className="text-xs font-bold font-outfit capitalize">Citizen User</div>
            </div>
            <div>
              <span className="text-[10px] opacity-75 uppercase">Reports Filed</span>
              <div className="text-xs font-bold font-outfit">{userProfile?.stats?.total_reports || 0}</div>
            </div>
            <div>
              <span className="text-[10px] opacity-75 uppercase">Resolved Code</span>
              <div className="text-xs font-bold font-outfit text-emerald-400">{userProfile?.stats?.resolved_reports || 0}</div>
            </div>
            <div>
              <span className="text-[10px] opacity-75 uppercase">Pending Review</span>
              <div className="text-xs font-bold font-outfit text-amber-400">{userProfile?.stats?.pending_reports || 0}</div>
            </div>
          </div>
        </div>

        {/* Gamification scoreboard card */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 border border-amber-100 shadow-sm">
              <Award className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400">Contribution Rank</div>
              <div className="text-base font-bold text-slate-800 font-outfit flex items-center gap-1">
                {badge}
                <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              </div>
            </div>
          </div>

          <div className="my-4">
            <div className="flex justify-between text-xs text-slate-500 font-semibold mb-1">
              <span>Points: <strong>{points} XP</strong></span>
              {pointsToNext > 0 && <span><strong>{pointsToNext} XP</strong> to {nextBadge}</span>}
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-500 leading-relaxed">
            Report issues (+15 XP), support neighborhood reports (+5 XP), and verify resolutions (+20 XP) to rise.
          </div>
        </div>
      </div>

      {/* Main filter & dashboard grid */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Toggle + Filter Bar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50">
          <div className="flex bg-slate-250/30 bg-slate-200/50 p-1 rounded-xl">
            <button
              onClick={() => setFilterMyReports(true)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${filterMyReports ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              My Reported Issues
            </button>
            <button
              onClick={() => setFilterMyReports(false)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${!filterMyReports ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              All Local Reports
            </button>
          </div>

          <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by ID, category, or area..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
            >
              <option value="">All Statuses</option>
              <option value="Reported">Reported</option>
              <option value="Assigned">Assigned</option>
              <option value="In_Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
              <option value="Reopened">Reopened</option>
              <option value="Overdue">Overdue SLA</option>
              <option value="Escalated">Escalated Cases</option>
            </select>
            <button type="submit" className="hidden sm:inline bg-brand-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-brand-700">
              Apply
            </button>
          </form>
        </div>

        {/* Complaints Listing Table / Cards */}
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-slate-50 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-slate-400">
            <HelpCircle className="w-12 h-12 mb-3 stroke-[1.5]" />
            <p className="text-sm font-semibold">No complaints found</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the filters or file a new ticket.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.map((c) => {
              const severityColors = {
                Low: "bg-blue-50 text-blue-800 border-blue-100",
                Medium: "bg-amber-50 text-amber-800 border-amber-100",
                High: "bg-red-50 text-red-800 border-red-100",
                Critical: "bg-red-950 text-white border-red-950",
              };

              return (
                <div 
                  key={c.id} 
                  onClick={() => handleViewDetails(c.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/50 transition cursor-pointer"
                >
                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-brand-700">{c.complaint_code}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${severityColors[c.severity] || "bg-slate-50 text-slate-600"}`}>
                        {c.severity} Severity
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {new Date(c.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-800 truncate">{c.category}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {c.address}
                    </p>
                  </div>

                  {/* Progress milestones */}
                  <div className="flex flex-col sm:row gap-2 md:w-80 flex-shrink-0">
                    <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mb-0.5">
                      <span>Status: <strong className="text-brand-800 uppercase">{c.status.replace("_", " ")}</strong></span>
                      {renderSLA(c)}
                    </div>
                    {/* Visual bar */}
                    <div className="grid grid-cols-4 gap-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-l ${getStatusStep(c.status) >= 0 ? (c.status === "Reopened" ? "bg-amber-400" : "bg-brand-500") : "bg-slate-200"}`} />
                      <div className={`h-full ${getStatusStep(c.status) >= 1 ? (c.status === "Reopened" ? "bg-amber-400" : "bg-brand-500") : "bg-slate-200"}`} />
                      <div className={`h-full ${getStatusStep(c.status) >= 2 ? (c.status === "Reopened" ? "bg-amber-400" : "bg-brand-500") : "bg-slate-200"}`} />
                      <div className={`h-full rounded-r ${getStatusStep(c.status) >= 3 ? "bg-emerald-500" : "bg-slate-200"}`} />
                    </div>
                  </div>

                  {/* Actions column */}
                  <div className="flex items-center gap-3 justify-end flex-shrink-0">
                    {/* Citizen support vote button */}
                    {!filterMyReports && (
                      <button
                        onClick={(e) => handleSupport(c.id, e)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-brand-50 hover:text-brand-700 text-slate-600 rounded-xl text-xs font-semibold border border-slate-200/80 transition"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{c.support_count}</span>
                      </button>
                    )}
                    <ChevronRight className="w-5 h-5 text-slate-400 hidden md:block" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPLAINT DETAILS MODAL */}
      {detailModalOpen && selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Complaint File</span>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  {selectedComplaint.complaint_code}
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${
                    selectedComplaint.status === "Closed" ? "bg-slate-100 text-slate-700" :
                    selectedComplaint.status === "Resolved" ? "bg-emerald-100 text-emerald-800" :
                    selectedComplaint.status === "In_Progress" ? "bg-blue-100 text-blue-800" : "bg-indigo-100 text-indigo-800"
                  }`}>
                    {selectedComplaint.status.replace("_", " ")}
                  </span>
                </h3>
              </div>
              <button 
                onClick={() => setDetailModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Images view */}
                <div>
                  {selectedComplaint.images.length > 1 ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 mb-2">Before / After Slider Proof</h4>
                      <BeforeAfterSlider 
                        beforeImage={selectedComplaint.images.find(img => img.image_type === "before")?.image_url} 
                        afterImage={selectedComplaint.images.find(img => img.image_type === "after")?.image_url} 
                      />
                    </div>
                  ) : selectedComplaint.images.length === 1 ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-500 mb-2">Submitted Evidence</h4>
                      <img 
                        src={selectedComplaint.images[0].image_url} 
                        alt="Evidence" 
                        className="w-full aspect-video object-cover rounded-xl border border-slate-200 shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-slate-100 border border-dashed rounded-xl flex items-center justify-center text-slate-400 text-xs">
                      No photo uploaded
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Category</h4>
                    <p className="text-sm font-bold text-slate-800 mt-0.5">{selectedComplaint.category}</p>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Description</h4>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {selectedComplaint.description}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Assigned Dept</h4>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {selectedComplaint.department?.name || "Unassigned"}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">SLA Deadline</h4>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5">
                        {new Date(selectedComplaint.deadline).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Citizen Verification Panel */}
              {selectedComplaint.status === "Resolved" && selectedComplaint.user_id === userProfile.id && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 space-y-4 animate-pulse-slow">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-900 font-outfit">Has this issue actually been resolved?</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        The department has uploaded completion evidence. Please review it above and verify the fix.
                      </p>
                    </div>
                  </div>

                  <textarea
                    placeholder="Provide additional details or feedback for verification (optional)..."
                    value={verifyComments}
                    onChange={(e) => setVerifyComments(e.target.value)}
                    className="w-full bg-white border border-emerald-100 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-emerald-400 transition"
                    rows={2}
                  />

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => handleVerify("Rejected")}
                      disabled={actionLoading}
                      className="bg-white hover:bg-red-50 text-red-700 font-bold px-4 py-2 border border-red-200 rounded-xl text-xs transition disabled:opacity-50"
                    >
                      No, Still Exists (Reopen)
                    </button>
                    <button
                      onClick={() => handleVerify("Approved")}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition shadow shadow-emerald-700/10 disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" /> Yes, Resolved (Close Ticket)
                    </button>
                  </div>
                </div>
              )}

              {/* Timeline status history / escalations */}
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Milestone Timeline</h4>
                <div className="space-y-4">
                  {/* Join histories and escalations */}
                  {[
                    ...selectedComplaint.status_history.map(h => ({
                      type: 'history',
                      date: new Date(h.timestamp),
                      label: `${h.old_status === h.new_status ? 'Update' : `Status: ${h.old_status} ➔ ${h.new_status}`}`,
                      notes: h.notes,
                      author: h.changer.name
                    })),
                    ...selectedComplaint.escalations.map(e => ({
                      type: 'escalation',
                      date: new Date(e.created_at),
                      label: `⚠️ Escalated to ${e.level}`,
                      notes: e.reason,
                      author: "System SLA Watchdog"
                    }))
                  ]
                    .sort((a, b) => b.date - a.date) // reverse chronological
                    .map((item, index) => (
                      <div key={index} className="flex gap-4 items-start text-xs border-l-2 border-slate-100 pl-4 relative ml-2">
                        <div className={`absolute -left-1.5 w-3 h-3 rounded-full border border-white ${
                          item.type === 'escalation' ? 'bg-amber-500' : 'bg-brand-500'
                        }`} />
                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-slate-800">{item.label}</span>
                            <span className="text-[10px] text-slate-400">{item.date.toLocaleString()}</span>
                          </div>
                          <p className="text-slate-500">{item.notes}</p>
                          <div className="text-[10px] text-slate-400">By {item.author}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
