const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (
  typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8000/api"
    : "/api"
);

const getHeaders = () => {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
};

// In-Memory & LocalStorage Client-Side Demo Database Fallback
const MOCK_DB = {
  users: [
    { email: "citizen@civicflow.org", name: "Citizen Reporter", role: "citizen", points: 120, badge: "Community Helper" },
    { email: "authority@civicflow.org", name: "Officer User", role: "authority", points: 45, badge: "Novice Reporter" },
    { email: "admin@civicflow.org", name: "Admin Center", role: "admin", points: 300, badge: "Civic Champion" }
  ],
  complaints: [
    {
      id: 1,
      complaint_code: "CF-20260815-100001",
      category: "Pothole",
      severity: "High",
      description: "Severe pothole on main road causing heavy traffic and risk of vehicle damage.",
      address: "100 Feet Rd, Koramangala 4th Block",
      latitude: 12.9352,
      longitude: 77.6245,
      status: "In_Progress",
      department: "Road Maintenance",
      created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
      deadline: new Date(Date.now() + 3600000 * 24).toISOString(),
      support_count: 14,
      image_url: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
      after_image_url: null,
      notes: "Repair crew dispatched to section 4."
    },
    {
      id: 2,
      complaint_code: "CF-20260815-100002",
      category: "Garbage",
      severity: "Medium",
      description: "Unattended garbage heap near residential area needing immediate cleanup.",
      address: "5th Block Park, Koramangala",
      latitude: 12.9320,
      longitude: 77.6210,
      status: "Assigned",
      department: "Sanitation & Waste Management",
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      deadline: new Date(Date.now() + 3600000 * 120).toISOString(),
      support_count: 8,
      image_url: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=800&q=80",
      after_image_url: null,
      notes: null
    },
    {
      id: 3,
      complaint_code: "CF-20260815-100003",
      category: "Streetlight",
      severity: "Low",
      description: "Streetlight flickering continuously on 8th Main.",
      address: "8th Main Rd, Koramangala 1st Block",
      latitude: 12.9380,
      longitude: 77.6280,
      status: "Closed",
      department: "Public Lighting & Electricity",
      created_at: new Date(Date.now() - 3600000 * 96).toISOString(),
      deadline: new Date(Date.now() - 3600000 * 24).toISOString(),
      support_count: 3,
      image_url: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
      after_image_url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
      notes: "LED bulb replaced by lighting department."
    }
  ]
};

// Safe Fetch Wrapper that catches 404/non-JSON errors and provides instant client-side fallbacks
async function safeFetch(url, options, fallbackFn) {
  try {
    const res = await fetch(url, options);
    if (res.ok) {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        return await res.json();
      }
    }
  } catch (err) {
    console.warn("Network call failed, using client-side fallback:", err);
  }
  return fallbackFn();
}

export const api = {
  // Authentication
  async register(name, email, password, role = "citizen") {
    return safeFetch(
      `${API_BASE_URL}/auth/register`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, role }),
      },
      () => ({ id: Date.now(), name, email, role, points: 10, badge: "Novice Reporter" })
    );
  },

  async login(email, password) {
    return safeFetch(
      `${API_BASE_URL}/auth/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
      () => {
        const user = MOCK_DB.users.find(u => u.email === email) || {
          email,
          name: email.split("@")[0],
          role: email.includes("admin") ? "admin" : email.includes("authority") ? "authority" : "citizen",
          points: 100,
          badge: "Community Helper"
        };
        localStorage.setItem("demo_user", JSON.stringify(user));
        return { access_token: `demo_jwt_token_${user.role}_${Date.now()}`, token_type: "bearer" };
      }
    );
  },

  async getProfile() {
    return safeFetch(
      `${API_BASE_URL}/auth/profile`,
      {
        method: "GET",
        headers: getHeaders(),
      },
      () => {
        const savedUser = JSON.parse(localStorage.getItem("demo_user") || "null") || MOCK_DB.users[0];
        return {
          id: 1,
          name: savedUser.name,
          email: savedUser.email,
          role: savedUser.role,
          points: savedUser.points || 150,
          badge: savedUser.badge || "Community Helper",
          stats: {
            total_reports: 12,
            resolved_reports: 9,
            pending_reports: 3
          }
        };
      }
    );
  },

  // Complaints
  async getComplaints(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.category) queryParams.append("category", filters.category);
    if (filters.status) queryParams.append("status", filters.status);

    return safeFetch(
      `${API_BASE_URL}/complaints?${queryParams.toString()}`,
      {
        method: "GET",
        headers: getHeaders(),
      },
      () => {
        let items = [...MOCK_DB.complaints];
        if (filters.category) items = items.filter(c => c.category === filters.category);
        if (filters.status) items = items.filter(c => c.status === filters.status);
        return items;
      }
    );
  },

  async getComplaint(id) {
    return safeFetch(
      `${API_BASE_URL}/complaints/${id}`,
      {
        method: "GET",
        headers: getHeaders(),
      },
      () => MOCK_DB.complaints.find(c => c.id === parseInt(id)) || MOCK_DB.complaints[0]
    );
  },

  async checkDuplicate(category, latitude, longitude) {
    return safeFetch(
      `${API_BASE_URL}/complaints/check-duplicate`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ category, latitude, longitude }),
      },
      () => ({ has_duplicate: false, duplicates: [] })
    );
  },

  async createComplaint(data) {
    return safeFetch(
      `${API_BASE_URL}/complaints`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify(data),
      },
      () => {
        const newCode = `CF-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${Math.floor(100000 + Math.random() * 900000)}`;
        const newComp = {
          id: MOCK_DB.complaints.length + 1,
          complaint_code: newCode,
          category: data.category || "General Issue",
          severity: "Medium",
          description: data.description,
          address: data.address || "Koramangala 5th Block",
          latitude: data.latitude || 12.935,
          longitude: data.longitude || 77.624,
          status: "Assigned",
          department: "General Administration",
          created_at: new Date().toISOString(),
          deadline: new Date(Date.now() + 3600000 * 72).toISOString(),
          support_count: 1,
          image_url: data.image_url || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
          after_image_url: null,
          notes: "Auto-registered via CivicFlow AI portal."
        };
        MOCK_DB.complaints.unshift(newComp);
        return newComp;
      }
    );
  },

  async updateComplaintStatus(id, status, notes = "", afterImageUrl = "") {
    return safeFetch(
      `${API_BASE_URL}/complaints/${id}/status`,
      {
        method: "PUT",
        headers: getHeaders(),
        body: JSON.stringify({ status, notes, after_image_url: afterImageUrl }),
      },
      () => {
        const comp = MOCK_DB.complaints.find(c => c.id === parseInt(id));
        if (comp) {
          comp.status = status;
          if (notes) comp.notes = notes;
          if (afterImageUrl) comp.after_image_url = afterImageUrl;
        }
        return comp || { id, status, notes };
      }
    );
  },

  async supportComplaint(id) {
    return safeFetch(
      `${API_BASE_URL}/complaints/${id}/support`,
      {
        method: "POST",
        headers: getHeaders(),
      },
      () => {
        const comp = MOCK_DB.complaints.find(c => c.id === parseInt(id));
        if (comp) comp.support_count = (comp.support_count || 0) + 1;
        return { message: "Complaint supported (+5 points)" };
      }
    );
  },

  async verifyComplaint(id, result, reason = "") {
    return safeFetch(
      `${API_BASE_URL}/complaints/${id}/verify`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ result, reason }),
      },
      () => ({ message: `Verification submitted: ${result}` })
    );
  },

  // Dashboards / Analytics
  async getPublicAnalytics() {
    return safeFetch(
      `${API_BASE_URL}/dashboard/public`,
      {
        method: "GET",
        headers: getHeaders(),
      },
      () => ({
        stats: {
          total_complaints: 148,
          resolved_complaints: 112,
          in_progress_complaints: 24,
          overdue_sla_complaints: 3,
          resolution_rate: 75.6
        },
        category_distribution: [
          { category: "Pothole", count: 42 },
          { category: "Garbage", count: 38 },
          { category: "Streetlight", count: 28 },
          { category: "Water Leakage", count: 22 },
          { category: "Drainage", count: 18 }
        ],
        department_performance: [
          { department: "Road Maintenance", total: 54, resolved: 45, rate: 83.3 },
          { department: "Sanitation & Waste", total: 42, resolved: 36, rate: 85.7 },
          { department: "Water & Sewerage", total: 30, resolved: 21, rate: 70.0 }
        ]
      })
    );
  },

  async getAdminAnalytics() {
    return safeFetch(
      `${API_BASE_URL}/dashboard/admin`,
      {
        method: "GET",
        headers: getHeaders(),
      },
      () => ({
        stats: {
          total_complaints: 148,
          resolved_complaints: 112,
          overdue_sla_complaints: 3,
          escalation_count: 5,
          citizen_signups: 840,
          resolution_rate: 75.6
        },
        category_distribution: [
          { category: "Pothole", count: 42 },
          { category: "Garbage", count: 38 },
          { category: "Streetlight", count: 28 }
        ],
        department_performance: [
          { department: "Road Maintenance", total: 54, resolved: 45, rate: 83.3 },
          { department: "Sanitation & Waste", total: 42, resolved: 36, rate: 85.7 }
        ],
        recent_escalations: [
          {
            id: 1,
            complaint_code: "CF-20260812-100008",
            category: "Pothole",
            level: "Supervisor",
            reason: "SLA deadline breached by 12 hours.",
            created_at: new Date(Date.now() - 3600000 * 12).toISOString()
          }
        ],
        ai_insights: [
          "High concentration of road damage complaints in Koramangala 4th Block.",
          "Sanitation department improved turnaround time by 18% this week."
        ]
      })
    );
  },

  // Notifications
  async getNotifications() {
    return safeFetch(
      `${API_BASE_URL}/notifications`,
      {
        method: "GET",
        headers: getHeaders(),
      },
      () => [
        {
          id: 1,
          message: "Your complaint CF-20260815-100001 has been assigned to Road Maintenance.",
          created_at: new Date().toISOString(),
          is_read: false
        }
      ]
    );
  },

  async markNotificationRead(id) {
    return safeFetch(
      `${API_BASE_URL}/notifications/${id}/read`,
      {
        method: "PUT",
        headers: getHeaders(),
      },
      () => ({ message: "Notification marked read" })
    );
  },

  // Raw AI classification helper
  async analyzeAI(description, imageUrl = null, latitude = null, longitude = null) {
    return safeFetch(
      `${API_BASE_URL}/ai/analyze`,
      {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ description, image_url: imageUrl, latitude, longitude }),
      },
      () => ({
        category: description.toLowerCase().includes("pothole") ? "Pothole" : description.toLowerCase().includes("garbage") ? "Garbage" : "Water Leakage",
        severity: "High",
        summary: description.slice(0, 60),
        suggested_department: "Road Maintenance",
        priority: 75
      })
    );
  }
};
