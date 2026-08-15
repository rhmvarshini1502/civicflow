import React, { useState, useEffect } from "react";
import { api } from "../api";
import { 
  Building2, Calendar, MapPin, ShieldAlert, 
  Clock, CheckCircle, ChevronRight, X, Camera, 
  Loader2, Check, ArrowRight, User
} from "lucide-react";

export default function AuthorityDashboard({ userProfile }) {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("Assigned"); // Default to Assigned incoming
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  
  // Resolution upload fields
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [afterImage, setAfterImage] = useState("");
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Load department complaints
  const loadComplaints = async () => {
    try {
      setLoading(true);
      // Department officers see issues assigned to their department
      const list = await api.getComplaints({
        status: statusFilter || undefined,
      });
      setComplaints(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [statusFilter]);

  // Open detail panel
  const handleOpenDetail = async (id) => {
    try {
      const detail = await api.getComplaint(id);
      setSelectedComplaint(detail);
      setResolutionNotes("");
      setAfterImage("");
      setError("");
      setModalOpen(true);
    } catch (err) {
      alert("Failed to load details: " + err.message);
    }
  };

  // Sample resolution proof photos for quick testing/demoing
  const SAMPLE_RESOLUTIONS = {
    "Repaved Road": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%23444'/><path d='M0 150 H400' stroke='%23fff' stroke-dasharray='10' stroke-width='2'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='lightgreen' text-anchor='middle'>PROOF: Repaved Smooth Road</text></svg>",
    "Cleaned Area": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%238fbc8f'/><circle cx='200' cy='120' r='30' fill='%232e8b57'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>PROOF: Swept &amp; Cleaned Area</text></svg>",
    "Repaired Light": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%232c3539'/><circle cx='200' cy='50' r='20' fill='%23ffd700'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='%23ffd700' text-anchor='middle'>PROOF: Operational Streetlight</text></svg>",
    "Fixed Pipe": "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='100%' height='100%' fill='%235c755e'/><path d='M200 50 L200 250' stroke='%23222' stroke-width='16'/><text x='50%25' y='85%25' font-family='sans-serif' font-size='20' fill='white' text-anchor='middle'>PROOF: Sealed Leakage Pipe</text></svg>"
  };

  // Convert after photo to base64 with canvas-based compression
  const handleAfterImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 600;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
          setAfterImage(compressedBase64);
        } catch (err) {
          setAfterImage(event.target.result);
        }
      };
      img.onerror = () => {
        setError("Failed to process photo. Please select a valid JPEG/PNG or use a sample resolution image.");
      };
      img.src = event.target.result;
    };
    reader.onerror = () => {
      setError("Failed to read image file.");
    };
    reader.readAsDataURL(file);
  };

  // Accept and set in progress
  const handleAccept = async () => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      await api.updateComplaintStatus(
        selectedComplaint.id, 
        "In_Progress", 
        "Officer accepted complaint. Dispatched maintenance crew to site."
      );
      setModalOpen(false);
      loadComplaints();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Resolve complaint with before/after evidence
  const handleResolve = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!afterImage) {
      setError("A resolution proof photo is required to mark the issue as resolved.");
      return;
    }
    if (!resolutionNotes.trim()) {
      setError("Please describe the resolution details.");
      return;
    }

    try {
      setActionLoading(true);
      await api.updateComplaintStatus(
        selectedComplaint.id,
        "Resolved",
        resolutionNotes,
        afterImage
      );
      setModalOpen(false);
      loadComplaints();
    } catch (err) {
      setError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Count helper functions (simulated counts of general list)
  const getBadgeStyle = (status) => {
    switch (status) {
      case "Assigned": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "In_Progress": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Resolved": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Reopened": return "bg-amber-100 text-amber-800 border-amber-200";
      default: return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const renderSLA = (complaint) => {
    const deadlineDate = new Date(complaint.deadline);
    const now = new Date();
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return (
        <span className="text-[10px] text-red-650 bg-red-50 px-2 py-0.5 border border-red-200 text-red-700 rounded font-semibold flex items-center gap-1 animate-pulse">
          ⚠️ OVERDUE BY {Math.abs(diffDays)} DAYS
        </span>
      );
    } else {
      return (
        <span className="text-[10px] text-slate-650 bg-slate-50 px-2 py-0.5 border rounded font-semibold text-slate-500 flex items-center gap-1">
          ⏳ {diffDays} DAYS REMAINING
        </span>
      );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 animate-fade-in">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl flex items-center justify-center">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Authority Dashboard</div>
            <h2 className="text-xl font-bold font-outfit text-slate-800 flex items-center gap-2">
              {userProfile?.name} 
              <span className="text-xs bg-slate-100 text-slate-500 font-normal px-2 py-0.5 rounded-full uppercase">
                Department Officer
              </span>
            </h2>
          </div>
        </div>

        {/* Info Box */}
        <div className="text-xs text-slate-500 max-w-sm border-l-2 border-indigo-500 pl-4 leading-relaxed">
          Logged in to Municipal Resolution Portal. Secure IoT nodes and official APIs enabled.
        </div>
      </div>

      {/* Filter Tabs & Complaint Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-100 overflow-x-auto scrollbar-none bg-slate-50/50">
          {[
            { id: "Assigned", label: "Incoming Assignments" },
            { id: "In_Progress", label: "Operations In-Progress" },
            { id: "Resolved", label: "Resolved Proofs" },
            { id: "Reopened", label: "Citizen Reopened" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-6 py-4 text-xs font-bold whitespace-nowrap border-b-2 transition ${
                statusFilter === tab.id 
                  ? "border-brand-600 text-brand-800 bg-white shadow-sm" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List content */}
        {loading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-16 bg-slate-50 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : complaints.length === 0 ? (
          <div className="p-16 text-center text-slate-400 text-xs">
             No active files found matching this status code.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {complaints.map((c) => (
              <div
                key={c.id}
                onClick={() => handleOpenDetail(c.id)}
                className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/40 cursor-pointer transition"
              >
                <div className="flex-1 space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-brand-700">{c.complaint_code}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getBadgeStyle(c.status)}`}>
                      {c.status.replace("_", " ")}
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Filed: {new Date(c.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-800 truncate">{c.category}</h3>
                  <p className="text-xs text-slate-500 flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" /> {c.address}
                  </p>
                </div>

                {/* Deadline Info */}
                <div className="flex items-center gap-4 flex-shrink-0">
                  {c.status !== "Resolved" && c.status !== "Closed" && renderSLA(c)}
                  {c.escalations && c.escalations.length > 0 && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 border border-amber-200 rounded">
                      ⚠️ ESCALATED
                    </span>
                  )}
                  <ChevronRight className="w-5 h-5 text-slate-400 hidden md:block" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AUTHORITY ACTION MODAL */}
      {modalOpen && selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Action Panel</span>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  {selectedComplaint.complaint_code}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getBadgeStyle(selectedComplaint.status)}`}>
                    {selectedComplaint.status.replace("_", " ")}
                  </span>
                </h3>
              </div>
              <button 
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                  {error}
                </div>
              )}

              {/* Information Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border">
                <div className="space-y-2">
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Reporter</span>
                    <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      {selectedComplaint.user.name} ({selectedComplaint.user.email})
                    </p>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase">Category</span>
                    <p className="text-xs font-bold text-slate-800">{selectedComplaint.category}</p>
                  </div>
                </div>
                <div>
                  <span className="text-[9px] text-slate-400 font-bold uppercase">Report Description</span>
                  <p className="text-xs text-slate-600 leading-relaxed max-h-24 overflow-y-auto">
                    "{selectedComplaint.description}"
                  </p>
                </div>
              </div>

              {/* Action State: ASSIGNED -> Transition to IN_PROGRESS */}
              {selectedComplaint.status === "Assigned" && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-4">
                  <div className="flex gap-2">
                    <Clock className="w-6 h-6 text-indigo-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-indigo-900 font-outfit">Accept Ticket Assignment</h4>
                      <p className="text-xs text-indigo-700 mt-0.5">
                        Transition this complaint status to "In Progress" to notify the citizen that a crew is dispatched to investigate/resolve.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleAccept}
                    disabled={actionLoading}
                    className="w-full bg-brand-650 bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition active:scale-98 shadow disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4.5 h-4.5" />}
                    Accept Assignment
                  </button>
                </div>
              )}

              {/* Action State: IN_PROGRESS or REOPENED -> Resolve Issue */}
              {(selectedComplaint.status === "In_Progress" || selectedComplaint.status === "Reopened") && (
                <form onSubmit={handleResolve} className="space-y-4">
                  <div className="border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-bold text-slate-800 font-outfit mb-3">Upload Resolution Proof</h4>
                    
                    <div className="space-y-4">
                      {/* After Photo Upload */}
                      <div className="space-y-2">
                        <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl p-6 cursor-pointer relative group transition">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAfterImageChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                          />
                          
                          {afterImage ? (
                            <div className="flex flex-col items-center gap-2 z-20">
                              <img
                                src={afterImage}
                                alt="Resolution preview"
                                className="max-h-40 object-contain rounded border border-slate-200 shadow-sm"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setAfterImage("");
                                }}
                                className="text-[10px] bg-red-50 text-red-600 hover:bg-red-100 font-semibold px-2 py-0.5 rounded transition"
                              >
                                Clear Image
                              </button>
                            </div>
                          ) : (
                            <div className="text-center space-y-1.5 pointer-events-none">
                              <Camera className="w-7 h-7 text-indigo-600 mx-auto" />
                              <p className="text-xs font-bold text-slate-700">Click or drag & drop a resolution photo</p>
                              <p className="text-[9px] text-slate-400">Required proof of resolved status</p>
                            </div>
                          )}
                        </div>

                        {/* Sample Proof Presets */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quick Sample Proof Photos:</span>
                          <div className="flex flex-wrap gap-1.5">
                            {Object.entries(SAMPLE_RESOLUTIONS).map(([name, svgData]) => (
                              <button
                                key={name}
                                type="button"
                                onClick={() => {
                                  setAfterImage(svgData);
                                  setError("");
                                }}
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                                  afterImage === svgData 
                                    ? "bg-emerald-600 text-white border-emerald-600" 
                                    : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                                }`}
                              >
                                + {name}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Direct URL paste */}
                        <input
                          type="url"
                          placeholder="Or paste resolution image URL..."
                          value={afterImage.startsWith("data:") ? "" : afterImage}
                          onChange={(e) => {
                            setAfterImage(e.target.value);
                            setError("");
                          }}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                      </div>

                      {/* Text details */}
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600 uppercase">Resolution Details</label>
                        <textarea
                          placeholder="Describe the actions taken to repair/address the issue (e.g. repaved pothole using cold mix, streetlight bulb replaced with LED)..."
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading || !afterImage || !resolutionNotes.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4.5 h-4.5" />}
                    Submit Resolution Evidence
                  </button>
                </form>
              )}

              {/* Resolved / Closed read-only proof state */}
              {(selectedComplaint.status === "Resolved" || selectedComplaint.status === "Closed") && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border">
                  <h4 className="text-xs font-bold text-slate-500 uppercase">Department Resolution Proof</h4>
                  {selectedComplaint.images.find(img => img.image_type === "after") ? (
                    <img 
                      src={selectedComplaint.images.find(img => img.image_type === "after").image_url} 
                      alt="Resolution evidence"
                      className="w-full aspect-video object-cover rounded-lg border shadow-sm"
                    />
                  ) : (
                    <div className="h-32 bg-slate-100 flex items-center justify-center text-slate-400 text-xs rounded border">No photo proof exists.</div>
                  )}
                  <p className="text-xs text-slate-650 bg-white p-3 rounded border italic">
                    "{selectedComplaint.status_history.find(h => h.new_status === "Resolved")?.notes || 'Resolution proof submitted.'}"
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
