const API_BASE = '/api/v1';

class ApiClient {
  constructor() {
    this.token = localStorage.getItem('supportiq_token') || '';
  }

  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('supportiq_token', token);
    } else {
      localStorage.removeItem('supportiq_token');
    }
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-msg ${type}`;
    const icon = type === 'success' ? '✓' : (type === 'error' ? '✕' : 'ℹ');
    toast.innerHTML = `<span><strong>${icon}</strong></span><span>${escapeHtml(message)}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3500);
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    } else {
      // In development mode, pass development agent fallback header if unauthenticated
      headers['x-dev-agent'] = 'true';
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}: Request failed`;
        const err = new Error(errorMsg);
        err.status = response.status;
        err.code = data?.error?.code;
        err.details = data?.error?.details;
        throw err;
      }

      return data;
    } catch (err) {
      console.error(`[API Error] ${endpoint}:`, err);
      throw err;
    }
  }

  // Auth
  async login(email, password) {
    const res = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (res.data?.token) {
      this.setToken(res.data.token);
    }
    return res.data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.setToken('');
    }
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // System Readiness
  async getHealth() {
    return this.request('/health');
  }

  async getModelStatus() {
    return this.request('/models/status');
  }

  // Tickets
  async createTicket(payload) {
    return this.request('/tickets', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getTickets(params = {}) {
    const query = new URLSearchParams(params).toString();
    return this.request(`/tickets${query ? '?' + query : ''}`);
  }

  async getTicketDetail(id) {
    return this.request(`/tickets/${id}`);
  }

  async updateTicketStatus(id, status, note = '') {
    return this.request(`/tickets/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note }),
    });
  }

  async analyzeTicket(id, promptType = 'FEW_SHOT') {
    return this.request(`/tickets/${id}/analyze`, {
      method: 'POST',
      body: JSON.stringify({ promptType }),
    });
  }

  async getTicketHistory(id) {
    return this.request(`/tickets/${id}/history`);
  }

  // Reply Review Workflow
  async editReply(replyId, text) {
    return this.request(`/replies/${replyId}`, {
      method: 'PATCH',
      body: JSON.stringify({ text }),
    });
  }

  async approveReply(replyId, agentNote = '') {
    return this.request(`/replies/${replyId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ agentNote }),
    });
  }

  async rejectReply(replyId, reason) {
    return this.request(`/replies/${replyId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  async regenerateReply(ticketId, promptType = 'FEW_SHOT') {
    return this.request(`/tickets/${ticketId}/replies/regenerate`, {
      method: 'POST',
      body: JSON.stringify({ promptType }),
    });
  }

  // Analytics
  async getOverview() {
    return this.request('/analytics/overview');
  }

  async getDistributions() {
    return this.request('/analytics/distributions');
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

window.api = new ApiClient();
