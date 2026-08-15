import React, { useState, useEffect } from "react";
import { api } from "../api";
import LeafletMap from "./LeafletMap";
import { Search, MapPin, SlidersHorizontal, Info, Eye } from "lucide-react";

export default function MapPageView({ onViewComplaint }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const list = await api.getComplaints({
        search: search || undefined,
        category: category || undefined,
        status: status || undefined,
        severity: severity || undefined,
      });
      setComplaints(list);
    } catch (err) {
      console.error("Error loading map complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [category, status, severity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadComplaints();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in flex flex-col h-[calc(100vh-80px)]">
      <div className="mb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-outfit text-slate-800">City Issue GIS Map</h2>
          <p className="text-xs text-slate-500">
            Monitor civic issues, inspect severity distributions, and upvote reports live.
          </p>
        </div>

        {/* Active Locations Indicator */}
        <div className="bg-brand-50 border border-brand-100 rounded-xl px-3 py-1.5 text-[10px] text-brand-800 max-w-sm flex items-center gap-1.5 shadow-sm">
          <Info className="w-3.5 h-3.5 text-brand-650 flex-shrink-0" />
          <span>Active Operations: Map markers correspond to verified active reports and municipal resolution sites.</span>
        </div>
      </div>

      {/* Grid Layout: Sidebar & Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
        {/* Filters & Side List (4 Cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full min-h-[300px] lg:min-h-0">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" /> Filter Criteria
          </h3>

          <form onSubmit={handleSearchSubmit} className="space-y-3 mb-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search description, address..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Categories</option>
                <option value="Pothole">Pothole</option>
                <option value="Garbage">Garbage</option>
                <option value="Streetlight">Streetlight</option>
                <option value="Water Leakage">Water Leak</option>
                <option value="Drainage">Drainage</option>
                <option value="Open Manhole">Open Manhole</option>
                <option value="Traffic Signal">Signal</option>
                <option value="Road Damage">Road Damage</option>
                <option value="Illegal Dumping">Dumping</option>
              </select>

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Status</option>
                <option value="Reported">Reported</option>
                <option value="Assigned">Assigned</option>
                <option value="In_Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Reopened">Reopened</option>
                <option value="Overdue">Overdue SLA</option>
              </select>

              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-[10px] focus:outline-none focus:ring-1 focus:ring-brand-500"
              >
                <option value="">Severity</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>
            <button type="submit" className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition">
              Refresh List
            </button>
          </form>

          {/* Results List */}
          <div className="flex-1 overflow-y-auto min-h-0 border-t border-slate-100 pt-3">
            {loading ? (
              <div className="space-y-2 p-2">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-16 bg-slate-50 animate-pulse rounded-lg" />
                ))}
              </div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                No matching reports plotted.
              </div>
            ) : (
              <div className="space-y-2.5 pr-1">
                {complaints.map((c) => {
                  const severityBadge = {
                    Low: "border-blue-200 text-blue-800 bg-blue-50",
                    Medium: "border-amber-200 text-amber-800 bg-amber-50",
                    High: "border-red-200 text-red-800 bg-red-50",
                    Critical: "border-red-950 text-white bg-red-950"
                  };

                  return (
                    <div 
                      key={c.id} 
                      onClick={() => onViewComplaint(c.id)}
                      className="p-3 rounded-xl border border-slate-150 border-slate-200/80 hover:border-brand-500 hover:bg-brand-50/10 cursor-pointer transition flex items-start gap-2.5"
                    >
                      <MapPin className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        c.severity === "Critical" ? "text-red-950" :
                        c.severity === "High" ? "text-red-500" :
                        c.severity === "Medium" ? "text-amber-500" : "text-blue-500"
                      }`} />
                      
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="flex justify-between items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 font-mono">{c.complaint_code}</span>
                          <span className={`text-[8px] font-bold px-1 py-0.2 rounded border ${severityBadge[c.severity]}`}>
                            {c.severity}
                          </span>
                        </div>
                        <h4 className="text-[11px] font-bold text-slate-800 truncate">{c.category}</h4>
                        <p className="text-[10px] text-slate-500 truncate">{c.address}</p>
                      </div>
                      
                      <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-brand-600 flex-shrink-0">
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Map View (8 Cols) */}
        <div className="lg:col-span-8 h-full flex flex-col">
          <LeafletMap 
            complaints={complaints} 
            onViewComplaint={onViewComplaint} 
          />
        </div>
      </div>
    </div>
  );
}
