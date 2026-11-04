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

  async analyzeTicket({ ticket_id, subject, description, prompt_type = 'INSTRUCTIONAL' }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000); // 5 min timeout for LLM + RAG + Judge
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
        throw new Error('ML Service request timed out after 300 seconds.');
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  async regenerateReply({ ticket_text, intent, sentiment, priority, summary, prompt_type = 'INSTRUCTIONAL', context_docs = null }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/reply/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticket_text,
          intent,
          sentiment,
          priority,
          summary,
          prompt_type,
          context_docs,
        }),
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

  async retrieveDocs({ query, k = 3, doc_types = null, min_score = 0.0 }) {
    const res = await fetch(`${this.baseUrl}/api/v1/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, k, doc_types, min_score }),
    });
    if (!res.ok) throw new Error('Failed to retrieve docs from ML service');
    return await res.json();
  }

  async findSimilar({ query, k = 3 }) {
    const res = await fetch(`${this.baseUrl}/api/v1/similar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, k }),
    });
    if (!res.ok) throw new Error('Failed to search similar tickets in ML service');
    return await res.json();
  }
}

module.exports = new MLClient();
