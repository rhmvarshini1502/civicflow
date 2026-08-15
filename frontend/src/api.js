const API_BASE_URL = "http://localhost:8000/api";

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

export const api = {
  // Authentication
  async register(name, email, password, role = "citizen") {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Registration failed");
    }
    return res.json();
  },

  async login(email, password) {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Login failed");
    }
    return res.json();
  },

  async getProfile() {
    const res = await fetch(`${API_BASE_URL}/auth/profile`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to fetch profile");
    }
    return res.json();
  },

  // Complaints
  async getComplaints(filters = {}) {
    const queryParams = new URLSearchParams();
    if (filters.category) queryParams.append("category", filters.category);
    if (filters.status) queryParams.append("status", filters.status);
    if (filters.severity) queryParams.append("severity", filters.severity);
    if (filters.search) queryParams.append("search", filters.search);
    if (filters.my_reports) queryParams.append("my_reports", "true");

    const res = await fetch(`${API_BASE_URL}/complaints?${queryParams.toString()}`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to fetch complaints");
    }
    return res.json();
  },

  async getComplaint(id) {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to fetch complaint details");
    }
    return res.json();
  },

  async checkDuplicate(category, latitude, longitude) {
    const res = await fetch(`${API_BASE_URL}/complaints/check-duplicate`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ category, latitude, longitude }),
    });
    if (!res.ok) {
      throw new Error("Failed to run duplicate detection");
    }
    return res.json();
  },

  async createComplaint(data) {
    const res = await fetch(`${API_BASE_URL}/complaints`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to submit complaint");
    }
    return res.json();
  },

  async updateComplaintStatus(id, status, notes = "", afterImageUrl = "") {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}/status`, {
      method: "PUT",
      headers: getHeaders(),
      body: JSON.stringify({ status, notes, after_image_url: afterImageUrl }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to update complaint status");
    }
    return res.json();
  },

  async supportComplaint(id) {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}/support`, {
      method: "POST",
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to support complaint");
    }
    return res.json();
  },

  async verifyComplaint(id, result, reason = "") {
    const res = await fetch(`${API_BASE_URL}/complaints/${id}/verify`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ result, reason }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "Failed to submit verification");
    }
    return res.json();
  },

  // Dashboards / Analytics
  async getPublicAnalytics() {
    const res = await fetch(`${API_BASE_URL}/dashboard/public`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to fetch public analytics");
    }
    return res.json();
  },

  async getAdminAnalytics() {
    const res = await fetch(`${API_BASE_URL}/dashboard/admin`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to fetch admin analytics");
    }
    return res.json();
  },

  // Notifications
  async getNotifications() {
    const res = await fetch(`${API_BASE_URL}/notifications`, {
      method: "GET",
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to fetch notifications");
    }
    return res.json();
  },

  async markNotificationRead(id) {
    const res = await fetch(`${API_BASE_URL}/notifications/${id}/read`, {
      method: "PUT",
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error("Failed to mark notification as read");
    }
    return res.json();
  },

  // Raw AI classification test helper
  async analyzeAI(description, imageUrl = null, latitude = null, longitude = null) {
    const res = await fetch(`${API_BASE_URL}/ai/analyze`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ description, image_url: imageUrl, latitude, longitude }),
    });
    if (!res.ok) {
      throw new Error("Failed to analyze text description");
    }
    return res.json();
  }
};
