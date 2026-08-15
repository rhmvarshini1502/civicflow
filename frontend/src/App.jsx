import React, { useState, useEffect } from "react";
import { api } from "./api";
import LandingPage from "./components/LandingPage";
import CitizenDashboard from "./components/CitizenDashboard";
import AuthorityDashboard from "./components/AuthorityDashboard";
import AdminDashboard from "./components/AdminDashboard";
import ReportIssueWizard from "./components/ReportIssueWizard";
import MapPageView from "./components/MapPageView";
import BeforeAfterSlider from "./components/BeforeAfterSlider";
import { 
  ShieldCheck, Bell, LogIn, LogOut, User, 
  Map, LayoutDashboard, FileSpreadsheet, X, Check,
  Clock, ShieldAlert, CheckCircle, Calendar, MapPin, 
  Building2, MessageSquare, Award, Sparkles, Loader2
} from "lucide-react";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [profile, setProfile] = useState(null);
  const [currentView, setCurrentView] = useState("home"); // home, dashboard, report, map
  
  // Modals & Panels
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Global Complaint Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [verifyComments, setVerifyComments] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [afterImage, setAfterImage] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [modalError, setModalError] = useState("");

  // Auth form fields
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authRole, setAuthRole] = useState("citizen");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Load User Profile on mount/token change
  const loadProfile = async () => {
    if (!token) {
      setProfile(null);
      return;
    }
    try {
      const data = await api.getProfile();
      setProfile(data);
    } catch (err) {
      console.error(err);
      handleLogout();
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    if (!token) return;
    try {
      const data = await api.getNotifications();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (err) {
      console.error("Notifications fetch failed", err);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [token]);

  useEffect(() => {
    if (token) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 10000); // poll every 10 seconds
      return () => clearInterval(interval);
    }
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setProfile(null);
    setCurrentView("home");
    setNotifPanelOpen(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      const res = await api.login(authEmail, authPassword);
      localStorage.setItem("token", res.access_token);
      setToken(res.access_token);
      setLoginModalOpen(false);
      setCurrentView("dashboard");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    try {
      await api.register(authName, authEmail, authPassword, authRole);
      // Auto login after registration
      const loginRes = await api.login(authEmail, authPassword);
      localStorage.setItem("token", loginRes.access_token);
      setToken(loginRes.access_token);
      setRegisterModalOpen(false);
      setCurrentView("dashboard");
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setAuthLoading(false);
    }
  };

  // Open the global details modal
  const handleViewComplaint = async (id) => {
    try {
      setModalError("");
      const detail = await api.getComplaint(id);
      setSelectedComplaint(detail);
      setResolutionNotes("");
      setAfterImage("");
      setVerifyComments("");
      setDetailModalOpen(true);
    } catch (err) {
      alert("Failed to load details: " + err.message);
    }
  };

  const handleNotifClick = async (notif) => {
    // Mark as read
    if (!notif.read) {
      try {
        await api.markNotificationRead(notif.id);
        loadNotifications();
      } catch (err) {
        console.error(err);
      }
    }
    // Open complaint
    if (notif.complaint_id) {
      setNotifPanelOpen(false);
      handleViewComplaint(notif.complaint_id);
    }
  };

  // Quick Login Helper for Demo presentation
  const handleQuickLogin = (email, role) => {
    setAuthEmail(email);
    setAuthPassword("password");
    setAuthRole(role);
  };

  // Detail Modal Actions: Accept Ticket (Department)
  const handleModalAccept = async () => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      await api.updateComplaintStatus(selectedComplaint.id, "In_Progress", "Officer accepted. Dispatched crew.");
      // Refresh modal data
      const updated = await api.getComplaint(selectedComplaint.id);
      setSelectedComplaint(updated);
      loadProfile();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Detail Modal Actions: Resolve Ticket (Department)
  const handleModalResolve = async (e) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (!afterImage) {
      setModalError("A resolution photo is required.");
      return;
    }
    if (!resolutionNotes.trim()) {
      setModalError("Resolution description is required.");
      return;
    }
    try {
      setActionLoading(true);
      setModalError("");
      await api.updateComplaintStatus(selectedComplaint.id, "Resolved", resolutionNotes, afterImage);
      const updated = await api.getComplaint(selectedComplaint.id);
      setSelectedComplaint(updated);
      loadProfile();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // Detail Modal Actions: Verify Resolution (Citizen creator)
  const handleModalVerify = async (result) => {
    if (!selectedComplaint) return;
    try {
      setActionLoading(true);
      setModalError("");
      await api.verifyComplaint(selectedComplaint.id, result, verifyComments);
      const updated = await api.getComplaint(selectedComplaint.id);
      setSelectedComplaint(updated);
      loadProfile();
    } catch (err) {
      setModalError(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  // SLA formatter
  const renderSLA = (c) => {
    if (c.status === "Closed" || c.status === "Resolved") {
      return <span className="text-emerald-600 font-bold">Resolved</span>;
    }
    const diff = new Date(c.deadline) - new Date();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days < 0 ? (
      <span className="text-red-600 font-extrabold animate-pulse">Overdue by {Math.abs(days)} days</span>
    ) : (
      <span className="text-slate-500 font-medium">{days} days remaining</span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-brand-50/20">
      {/* Header bar */}
      <header className="bg-slate-900 text-white sticky top-0 z-[50] shadow-md px-6 py-4 flex items-center justify-between">
        <div 
          className="flex items-center gap-2 cursor-pointer select-none"
          onClick={() => setCurrentView("home")}
        >
          <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center font-black font-outfit text-lg text-white shadow shadow-brand-500/20">
            CF
          </div>
          <span className="text-lg font-black tracking-tight font-outfit">CivicFlow</span>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-5 text-sm font-semibold">
          <button 
            onClick={() => setCurrentView("home")} 
            className={`transition hover:text-brand-400 ${currentView === "home" ? "text-brand-450 text-brand-400" : "text-slate-350 text-slate-300"}`}
          >
            Home
          </button>
          
          {profile && (
            <button 
              onClick={() => setCurrentView("dashboard")} 
              className={`transition hover:text-brand-400 ${currentView === "dashboard" ? "text-brand-450 text-brand-400" : "text-slate-350 text-slate-350 text-slate-300"}`}
            >
              Dashboard
            </button>
          )}

          {profile && profile.role === "citizen" && (
            <button 
              onClick={() => setCurrentView("report")} 
              className={`transition hover:text-brand-400 ${currentView === "report" ? "text-brand-450 text-brand-400" : "text-slate-350 text-slate-300"}`}
            >
              Report Issue
            </button>
          )}

          <button 
            onClick={() => setCurrentView("map")} 
            className={`transition hover:text-brand-400 ${currentView === "map" ? "text-brand-450 text-brand-400" : "text-slate-350 text-slate-300"}`}
          >
            GIS Map
          </button>
        </nav>

        {/* User / Authentication Options */}
        <div className="flex items-center gap-4 relative">
          {profile ? (
            <>
              {/* Notification bell */}
              <div className="relative">
                <button 
                  onClick={() => setNotifPanelOpen(!notifPanelOpen)}
                  className="p-2 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition relative"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-brand-500 rounded-full border border-slate-900 text-[9px] font-bold flex items-center justify-center text-white">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown Panel */}
                {notifPanelOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white text-slate-800 rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-[99] max-h-[400px] flex flex-col">
                    <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Notifications</span>
                      <button 
                        onClick={() => setNotifPanelOpen(false)}
                        className="text-xs text-brand-600 hover:underline"
                      >
                        Close
                      </button>
                    </div>

                    <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-slate-400 text-xs">No alerts received.</div>
                      ) : (
                        notifications.map((n) => (
                          <div 
                            key={n.id}
                            onClick={() => handleNotifClick(n)}
                            className={`p-3 text-xs cursor-pointer hover:bg-slate-50 transition flex items-start gap-2.5 ${!n.read ? "bg-brand-50/30 font-semibold" : ""}`}
                          >
                            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${!n.read ? "bg-brand-600" : "bg-transparent"}`} />
                            <div className="flex-1 space-y-0.5">
                              <p className="text-slate-700 leading-normal">{n.message}</p>
                              <span className="text-[9px] text-slate-400">{new Date(n.created_at).toLocaleTimeString()}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User profile identifier */}
              <div className="hidden lg:flex items-center gap-2 bg-slate-800 py-1.5 px-3 rounded-full text-xs font-semibold">
                <User className="w-4 h-4 text-brand-400" />
                <span className="max-w-[100px] truncate">{profile.name}</span>
                <span className="text-[9px] bg-brand-500 text-white px-1.5 py-0.2 rounded-full text-[8px] uppercase">
                  {profile.role}
                </span>
              </div>

              {/* Signout button */}
              <button 
                onClick={handleLogout}
                className="bg-slate-800 hover:bg-slate-700 text-slate-350 text-slate-300 hover:text-white p-2 rounded-xl text-sm font-semibold transition flex items-center gap-1.5"
              >
                <LogOut className="w-4.5 h-4.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </>
          ) : (
            <button 
              onClick={() => setLoginModalOpen(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-xl text-sm font-bold shadow-md shadow-brand-600/10 hover:shadow-brand-650 transition flex items-center gap-1.5 active:scale-95"
            >
              <LogIn className="w-4.5 h-4.5" />
              Sign In
            </button>
          )}
        </div>
      </header>

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === "home" && (
          <LandingPage 
            onNavigate={(view) => {
              if (!profile && (view === "report" || view === "dashboard")) {
                setLoginModalOpen(true);
              } else {
                setCurrentView(view);
              }
            }} 
            onOpenLogin={() => setLoginModalOpen(true)}
          />
        )}

        {currentView === "dashboard" && profile && (
          profile.role === "citizen" ? (
            <CitizenDashboard 
              userProfile={profile} 
              onNavigate={setCurrentView} 
              onRefreshProfile={loadProfile}
            />
          ) : profile.role === "department" ? (
            <AuthorityDashboard userProfile={profile} />
          ) : (
            <AdminDashboard onViewComplaint={handleViewComplaint} />
          )
        )}

        {currentView === "report" && profile && profile.role === "citizen" && (
          <ReportIssueWizard 
            onNavigate={setCurrentView} 
            onRefreshProfile={loadProfile} 
          />
        )}

        {currentView === "map" && (
          <MapPageView onViewComplaint={handleViewComplaint} />
        )}
      </main>

      {/* Footer copyright */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 py-6 text-center text-xs px-6">
        <p>© 2026 CivicFlow Platform. All rights reserved.</p>
      </footer>


      {/* AUTHENTICATION: LOGIN MODAL */}
      {loginModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 animate-slide-up relative">
            <button 
              onClick={() => setLoginModalOpen(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold font-outfit text-slate-800 mb-2">Sign In to CivicFlow</h3>
            <p className="text-xs text-slate-500 mb-6">Welcome back! Access your account dashboard.</p>

            {authError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                {authError}
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@email.com"
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-lg shadow-brand-600/10 transition disabled:opacity-50"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign In"}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-slate-500">
              Don't have an account?{" "}
              <button 
                onClick={() => { setLoginModalOpen(false); setRegisterModalOpen(true); }}
                className="text-brand-600 font-bold hover:underline"
              >
                Sign Up
              </button>
            </div>

            {/* Quick login aids */}
            <div className="mt-6 border-t border-slate-100 pt-4 space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Demo Accounts Quick Login:</span>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleQuickLogin("citizen@civicflow.org", "citizen")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2 rounded-lg text-[9px] font-semibold transition"
                >
                  Citizen User
                </button>
                <button
                  onClick={() => handleQuickLogin("authority@civicflow.org", "department")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2 rounded-lg text-[9px] font-semibold transition"
                >
                  Officer User
                </button>
                <button
                  onClick={() => handleQuickLogin("admin@civicflow.org", "admin")}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 py-1.5 px-2 rounded-lg text-[9px] font-semibold transition"
                >
                  Admin Center
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTHENTICATION: REGISTER MODAL */}
      {registerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 animate-slide-up relative">
            <button 
              onClick={() => setRegisterModalOpen(false)}
              className="absolute right-4 top-4 w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold font-outfit text-slate-800 mb-2">Create CivicFlow Account</h3>
            <p className="text-xs text-slate-500 mb-6">Join your neighbors in active civic accountability.</p>

            {authError && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                {authError}
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Full Name</label>
                <input 
                  type="text" 
                  required
                  placeholder="Jane Doe"
                  value={authName} 
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Email Address</label>
                <input 
                  type="email" 
                  required
                  placeholder="name@email.com"
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Password</label>
                <input 
                  type="password" 
                  required
                  placeholder="Min 6 characters"
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-brand-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase">Role Type</label>
                <select
                  value={authRole}
                  onChange={(e) => setAuthRole(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none"
                >
                  <option value="citizen">Citizen Reporter</option>
                  <option value="department">Department Officer</option>
                  <option value="admin">Platform Administrator</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1 shadow-lg shadow-brand-600/10 transition disabled:opacity-50"
              >
                {authLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Sign Up"}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-slate-500">
              Already have an account?{" "}
              <button 
                onClick={() => { setRegisterModalOpen(false); setLoginModalOpen(true); }}
                className="text-brand-600 font-bold hover:underline"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}


      {/* GLOBAL COMPLAINT DETAIL ACTION MODAL */}
      {detailModalOpen && selectedComplaint && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Complaint File Details</span>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  {selectedComplaint.complaint_code}
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    selectedComplaint.status === "Closed" ? "bg-slate-100 text-slate-700 border-slate-200" :
                    selectedComplaint.status === "Resolved" ? "bg-emerald-100 text-emerald-800 border-emerald-250" :
                    selectedComplaint.status === "In_Progress" ? "bg-blue-100 text-blue-800 border-blue-200" : "bg-indigo-100 text-indigo-850"
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

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              {modalError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-800">
                  {modalError}
                </div>
              )}

              {/* Photo comparisons */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  {selectedComplaint.images.length > 1 ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Before / After Slider Proof</h4>
                      <BeforeAfterSlider 
                        beforeImage={selectedComplaint.images.find(img => img.image_type === "before")?.image_url} 
                        afterImage={selectedComplaint.images.find(img => img.image_type === "after")?.image_url} 
                      />
                    </div>
                  ) : selectedComplaint.images.length === 1 ? (
                    <div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Evidence Photo</h4>
                      <img 
                        src={selectedComplaint.images[0].image_url} 
                        alt="Evidence preview"
                        className="w-full aspect-video object-cover rounded-xl border shadow-sm"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-slate-100 border border-dashed rounded-xl flex items-center justify-center text-slate-400 text-xs">
                      No images uploaded.
                    </div>
                  )}
                </div>

                {/* Basic data cards */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Category</h4>
                    <p className="text-sm font-bold text-slate-800">{selectedComplaint.category}</p>
                  </div>
                  <div>
                    <h4 className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Citizen Description</h4>
                    <p className="text-xs text-slate-650 bg-slate-50 p-3 rounded-xl border italic leading-relaxed">
                      "{selectedComplaint.description}"
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-[10px] text-slate-400 font-bold uppercase">Department In-Charge</h4>
                      <p className="text-xs font-semibold text-slate-700">{selectedComplaint.department?.name || "Unassigned"}</p>
                    </div>
                    <div>
                      <h4 className="text-[10px] text-slate-400 font-bold uppercase">SLA Target</h4>
                      <p className="text-xs font-semibold text-slate-700 flex items-center gap-1 mt-0.5">
                        {renderSLA(selectedComplaint)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION: Citizen Verification block */}
              {selectedComplaint.status === "Resolved" && profile && profile.id === selectedComplaint.user_id && (
                <div className="bg-emerald-50 border border-emerald-250 rounded-2xl p-5 space-y-4 border-emerald-100">
                  <div className="flex gap-2">
                    <CheckCircle className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-950 font-outfit">Has this issue actually been resolved?</h4>
                      <p className="text-xs text-emerald-700 mt-0.5">
                        Please review the resolution evidence. Verification actions directly reward XP points.
                      </p>
                    </div>
                  </div>

                  <textarea
                    placeholder="Provide additional details or feedback for verification (optional)..."
                    value={verifyComments}
                    onChange={(e) => setVerifyComments(e.target.value)}
                    className="w-full bg-white border border-emerald-100 rounded-xl p-3 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 placeholder-emerald-450 transition"
                    rows={2}
                  />

                  <div className="flex gap-3 justify-end">
                    <button
                      onClick={() => handleModalVerify("Rejected")}
                      disabled={actionLoading}
                      className="bg-white hover:bg-red-50 text-red-700 font-bold px-4 py-2 border border-red-200 rounded-xl text-xs transition disabled:opacity-50"
                    >
                      No, Still Exists (Reopen)
                    </button>
                    <button
                      onClick={() => handleModalVerify("Approved")}
                      disabled={actionLoading}
                      className="bg-emerald-600 hover:bg-emerald-750 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 transition disabled:opacity-50 hover:bg-emerald-700"
                    >
                      <Check className="w-4 h-4" /> Yes, Resolved (Close Ticket)
                    </button>
                  </div>
                </div>
              )}

              {/* ACTION: Department Accept block */}
              {selectedComplaint.status === "Assigned" && profile && profile.role === "department" && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-3">
                  <h4 className="text-sm font-bold text-indigo-900 font-outfit">Accept Ticket Assignment</h4>
                  <p className="text-xs text-indigo-700 leading-normal">
                    Notify the citizen that the crew is dispatched. Status transitions to "In Progress".
                  </p>
                  <button
                    onClick={handleModalAccept}
                    disabled={actionLoading}
                    className="w-full bg-brand-650 bg-brand-600 hover:bg-brand-700 text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : "Accept Assignment"}
                  </button>
                </div>
              )}

              {/* ACTION: Department Resolve Form */}
              {(selectedComplaint.status === "In_Progress" || selectedComplaint.status === "Reopened") && profile && profile.role === "department" && (
                <form onSubmit={handleModalResolve} className="space-y-4 border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-bold text-slate-800 font-outfit">Upload Resolution Proof</h4>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex flex-col items-center justify-center border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 rounded-xl p-5 cursor-pointer relative group transition">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setModalError("");
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
                                setModalError("Failed to decode image file. Try selecting a JPEG/PNG or use URL paste.");
                              };
                              img.src = event.target.result;
                            };
                            reader.onerror = () => {
                              setModalError("Failed to read image file.");
                            };
                            reader.readAsDataURL(file);
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        {afterImage ? (
                          <div className="flex flex-col items-center gap-2 z-20">
                            <img src={afterImage} alt="Resolution preview" className="max-h-36 object-contain rounded border border-slate-200" />
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setAfterImage("");
                              }}
                              className="text-[10px] bg-red-50 text-red-600 font-semibold px-2 py-0.5 rounded"
                            >
                              Clear Image
                            </button>
                          </div>
                        ) : (
                          <div className="text-center pointer-events-none">
                            <Camera className="w-7 h-7 text-indigo-600 mx-auto mb-1" />
                            <p className="text-xs font-bold text-slate-700">Click or drag & drop a resolved proof photo</p>
                          </div>
                        )}
                      </div>

                      <input
                        type="url"
                        placeholder="Or paste resolution image URL..."
                        value={afterImage.startsWith("data:") ? "" : afterImage}
                        onChange={(e) => {
                          setAfterImage(e.target.value);
                          setModalError("");
                        }}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs focus:outline-none"
                      />
                    </div>

                    <textarea
                      placeholder="Describe resolution details..."
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={actionLoading || !afterImage || !resolutionNotes.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition disabled:opacity-50"
                  >
                    Submit Resolution Proof
                  </button>
                </form>
              )}

              {/* Timeline list */}
              <div className="border-t border-slate-100 pt-6">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Complaint History</h4>
                <div className="space-y-4">
                  {[
                    ...selectedComplaint.status_history.map(h => ({
                      type: 'history',
                      date: new Date(h.timestamp),
                      label: h.old_status === h.new_status ? 'Status Update' : `Status: ${h.old_status.replace('_', ' ')} ➔ ${h.new_status.replace('_', ' ')}`,
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
                    .sort((a, b) => b.date - a.date)
                    .map((item, index) => (
                      <div key={index} className="flex gap-4 items-start text-xs border-l-2 border-slate-100 pl-4 relative ml-2">
                        <div className={`absolute -left-1.5 w-3 h-3 rounded-full border border-white ${
                          item.type === 'escalation' ? 'bg-amber-500' : 'bg-brand-500'
                        }`} />
                        <div className="flex-1">
                          <div className="flex justify-between items-center font-bold text-slate-800">
                            <span>{item.label}</span>
                            <span className="text-[9px] text-slate-400 font-normal">{item.date.toLocaleString()}</span>
                          </div>
                          <p className="text-slate-500 mt-0.5">{item.notes}</p>
                          <div className="text-[9px] text-slate-400 mt-0.5">By {item.author}</div>
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
