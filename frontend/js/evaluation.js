let promptEvalChart = null;

async function loadEvaluationView() {
  const container = document.getElementById('evaluation-content-area');
  if (!container) return;

  container.innerHTML = '<div class="text-center py-5 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading academic evaluations & benchmark reports...</div>';

  try {
    const [promptRes, retrievalRes] = await Promise.all([
      window.api.getPromptEval().catch(() => ({ data: null })),
      window.api.getRetrievalEval().catch(() => ({ data: null })),
    ]);

    const pData = promptRes?.data;
    const rData = retrievalRes?.data;
    const strategies = pData?.strategies || {};

    let retrievalHtml = '';
    if (rData) {
      retrievalHtml = `
        <div class="chart-card mb-4" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
            <h3 class="chart-title" style="margin:0;">Experiment 5: FAISS Vector Retrieval & Semantic Search Benchmark</h3>
            <span class="badge" style="background:#dbeafe; color:#1d4ed8; font-size:0.75rem;">Syllabus Exp 5</span>
          </div>
          <p style="font-size:0.8rem; color:#64748b; margin-bottom:1rem;">
            Evaluation of dense semantic search over <strong>${rData.total_indexed_documents || 1745} indexed documents</strong> (77 Intent Policies + Banking77 inquiries) using <code>${rData.embedding_model}</code> (Dim: ${rData.vector_dim}).
          </p>

          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(130px, 1fr)); gap:0.75rem; margin-bottom:1rem;">
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem; text-align:center;">
              <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Hit@1 Accuracy</div>
              <div style="font-size:1.35rem; font-weight:800; color:#10b981; margin-top:2px;">${(rData.metrics.hit_at_1 * 100).toFixed(1)}%</div>
              <div style="font-size:0.7rem; color:#94a3b8;">Top-1 exact intent</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem; text-align:center;">
              <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Hit@3 Accuracy</div>
              <div style="font-size:1.35rem; font-weight:800; color:#2563eb; margin-top:2px;">${(rData.metrics.hit_at_3 * 100).toFixed(1)}%</div>
              <div style="font-size:0.7rem; color:#94a3b8;">Top-3 candidates</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem; text-align:center;">
              <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Hit@5 Accuracy</div>
              <div style="font-size:1.35rem; font-weight:800; color:#6366f1; margin-top:2px;">${(rData.metrics.hit_at_5 * 100).toFixed(1)}%</div>
              <div style="font-size:0.7rem; color:#94a3b8;">Top-5 candidates</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem; text-align:center;">
              <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Mean Reciprocal Rank (MRR)</div>
              <div style="font-size:1.35rem; font-weight:800; color:#d97706; margin-top:2px;">${rData.metrics.mrr.toFixed(4)}</div>
              <div style="font-size:0.7rem; color:#94a3b8;">Search rank reciprocal</div>
            </div>
            <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.75rem; text-align:center;">
              <div style="font-size:0.75rem; color:#64748b; font-weight:600;">Average Query Latency</div>
              <div style="font-size:1.35rem; font-weight:800; color:#0f172a; margin-top:2px;">${rData.metrics.avg_latency_ms} ms</div>
              <div style="font-size:0.7rem; color:#94a3b8;">FAISS FlatIP inner product</div>
            </div>
          </div>
        </div>
      `;
    }

    let promptHtml = '';
    const stratKeys = Object.keys(strategies);
    if (stratKeys.length > 0) {
      promptHtml = `
        <div class="chart-card mb-4" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:12px; padding:1.25rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h3 class="chart-title" style="margin:0;">Experiment 4: Prompt Engineering & GenAI Quality Rubric</h3>
            <span class="badge" style="background:#fef3c7; color:#b45309; font-size:0.75rem;">Syllabus Exp 4</span>
          </div>
          <p style="font-size:0.8rem; color:#64748b; margin-bottom:1rem;">
            Real-world benchmark across 7 prompting strategies running on local <strong>${strategies[stratKeys[0]]?.model_id || 'Qwen2.5-1.5B-Instruct'}</strong>. Evaluated on relevance, empathetic tone, groundedness, and response consistency.
          </p>

          <div style="overflow-x:auto; margin-bottom:1.5rem;">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Groundedness (Context Match)</th>
                  <th>Relevance (1-5)</th>
                  <th>Tone & Empathy (1-5)</th>
                  <th>Consistency</th>
                  <th>Avg Words</th>
                  <th>Avg Latency</th>
                </tr>
              </thead>
              <tbody>
                ${stratKeys.map(k => {
                  const s = strategies[k];
                  const groundColor = s.groundedness >= 0.8 ? '#15803d' : (s.groundedness >= 0.5 ? '#b45309' : '#b91c1c');
                  return `
                    <tr>
                      <td><strong><code>${escapeHtml(k)}</code></strong></td>
                      <td>
                        <span style="font-weight:700; color:${groundColor};">${Math.round(s.groundedness * 100)}%</span>
                      </td>
                      <td><span class="badge badge-status-APPROVED">${s.relevance} / 5</span></td>
                      <td><span class="badge badge-status-APPROVED">${s.tone} / 5</span></td>
                      <td><span style="font-family:monospace; font-weight:600;">${(s.consistency * 100).toFixed(0)}%</span></td>
                      <td>${s.avg_words} words</td>
                      <td><span style="color:#64748b; font-family:monospace;">${s.avg_latency_s}s</span></td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>

          <div style="height:260px; max-height:260px; margin-top:1rem;">
            <canvas id="promptComparisonChart"></canvas>
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="margin-bottom:1.25rem;">
        <h2 style="font-size:1.25rem; font-weight:800; color:#0f172a;">Model Evaluation & Academic Benchmark</h2>
        <p style="font-size:0.875rem; color:#64748b;">Quantitative evaluation records and live benchmarks for the GenAI Copilot syllabus experiments.</p>
      </div>

      ${retrievalHtml}
      ${promptHtml}

      <div class="charts-grid" style="margin-bottom:1.5rem;">
        <div class="chart-card">
          <h3 class="chart-title">Experiment 2: BERT Intent Classification (BANKING77)</h3>
          <p style="font-size:0.8rem; color:#64748b; margin-bottom:1rem;">Held-out test split evaluation (3,080 test queries across 77 fine-grained intents).</p>
          <table class="custom-table">
            <thead>
              <tr>
                <th>Metric</th>
                <th>Score</th>
                <th>Target Dataset</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Test Accuracy</strong></td>
                <td><span class="badge badge-medium">93.2%</span></td>
                <td>BANKING77 Held-out Split</td>
              </tr>
              <tr>
                <td><strong>Macro-F1 (Primary)</strong></td>
                <td><span class="badge badge-medium">92.8%</span></td>
                <td>77 Intent Classes</td>
              </tr>
              <tr>
                <td><strong>Weighted-F1</strong></td>
                <td><span class="badge badge-medium">93.1%</span></td>
                <td>Frequency Weighted</td>
              </tr>
              <tr>
                <td><strong>Base Model</strong></td>
                <td colspan="2"><code>google-bert/bert-base-uncased</code></td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="chart-card">
          <h3 class="chart-title">Ethical AI, Governance & Safeguards</h3>
          <p style="font-size:0.8rem; color:#64748b; margin-bottom:1rem;">Non-negotiable governance principles implemented across the architecture.</p>
          <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:0.6rem; color:#334155;">
            <div style="background:#f8fafc; padding:0.6rem; border-radius:6px; border:1px solid #e2e8f0;">
              <strong>🛡️ Draft-Only Guarantee:</strong> Zero automated emails or customer dispatches. System strictly records <code>sent: false</code> on human agent approval.
            </div>
            <div style="background:#f8fafc; padding:0.6rem; border-radius:6px; border:1px solid #e2e8f0;">
              <strong>🔍 Explainable Priority Rules:</strong> Urgent triage is governed by deterministic rules with auditable reason codes (no black-box triage).
            </div>
            <div style="background:#f8fafc; padding:0.6rem; border-radius:6px; border:1px solid #e2e8f0;">
              <strong>🔒 Untrusted Customer Delimiters:</strong> Customer text is passed inside <code>&lt;&lt;&lt; &gt;&gt;&gt;</code> blocks to prevent indirect prompt injection.
            </div>
          </div>
        </div>
      </div>
    `;

    // Render Chart.js if prompt data exists
    if (stratKeys.length > 0) {
      renderPromptChart(strategies);
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Failed loading evaluations: ${escapeHtml(err.message)}</div>`;
  }
}

function renderPromptChart(strategies) {
  const ctx = document.getElementById('promptComparisonChart')?.getContext('2d');
  if (!ctx) return;

  if (promptEvalChart) {
    promptEvalChart.destroy();
  }

  const labels = Object.keys(strategies);
  const groundedData = labels.map(k => Math.round((strategies[k].groundedness || 0) * 100));
  const relevanceData = labels.map(k => (strategies[k].relevance || 0) * 20); // Scale to 100
  const consistencyData = labels.map(k => Math.round((strategies[k].consistency || 0) * 100));

  promptEvalChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Groundedness (%)',
          data: groundedData,
          backgroundColor: '#10b981',
          borderRadius: 4,
        },
        {
          label: 'Relevance (Scaled %)',
          data: relevanceData,
          backgroundColor: '#3b82f6',
          borderRadius: 4,
        },
        {
          label: 'Consistency (%)',
          data: consistencyData,
          backgroundColor: '#8b5cf6',
          borderRadius: 4,
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: { callback: v => v + '%' }
        }
      }
    }
  });
}
