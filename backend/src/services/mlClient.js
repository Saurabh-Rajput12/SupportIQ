const config = require('../config');

class MLClient {
  constructor(baseUrl = config.mlServiceUrl) {
    this.baseUrl = baseUrl;
  }

  async checkHealth() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.baseUrl}/health`, { signal: controller.signal });
      return res.ok;
    } catch (e) {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  async checkReady() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch(`${this.baseUrl}/ready`, { signal: controller.signal });
      if (!res.ok) return { ready: false };
      return await res.json();
    } catch (e) {
      return { ready: false, error: e.message };
    } finally {
      clearTimeout(timeout);
    }
  }

  async analyzeTicket({ ticket_id, subject, description, prompt_type = 'FEW_SHOT' }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout for cold model inference
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id, subject, description, prompt_type }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`ML Service error (${response.status}): ${detail}`);
      }

      return await response.json();
    } catch (err) {
      if (err.name === 'AbortError') {
        throw new Error('ML Service request timed out after 120 seconds.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async regenerateReply({ ticket_text, intent, sentiment, priority, summary, prompt_type = 'FEW_SHOT' }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/reply/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_text, intent, sentiment, priority, summary, prompt_type }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`ML Service reply generation error (${response.status}): ${detail}`);
      }

      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }
}

module.exports = new MLClient();

