let currentFilterStatus = '';
let currentFilterPriority = '';
let currentSearch = '';

async function loadTicketsList() {
  const tbody = document.getElementById('tickets-table-body');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Loading tickets...</td></tr>';

  try {
    const res = await window.api.getTickets({
      status: currentFilterStatus,
      priority: currentFilterPriority,
      search: currentSearch,
      limit: 50,
    });

    const tickets = res.data;
    tbody.innerHTML = '';

    if (tickets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">No tickets found matching filters.</td></tr>';
      return;
    }

    tickets.forEach(t => {
      const tr = document.createElement('tr');
      const priority = t.effective_priority || 'LOW';
      tr.innerHTML = `
        <td><strong>${escapeHtml(t.ticket_code)}</strong></td>
        <td>
          <div style="font-weight:600;">${escapeHtml(t.subject)}</div>
          <div style="font-size:0.75rem; color:#64748b;">${escapeHtml(t.customer_name || 'Anonymous Customer')}</div>
        </td>
        <td><span class="badge badge-${priority.toLowerCase()}">${escapeHtml(priority)}</span></td>
        <td><span class="badge badge-status-${escapeHtml(t.status)}">${escapeHtml(t.status)}</span></td>
        <td>${escapeHtml(t.intent_label || 'Not analyzed')}</td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="openTicketDetail(${t.id})">View Details</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

async function openTicketDetail(ticketId) {
  const modal = document.getElementById('ticket-detail-modal');
  const body = document.getElementById('ticket-detail-content');
  if (!modal || !body) return;

  modal.classList.add('active');
  body.innerHTML = '<div class="text-center py-5 text-muted">Loading ticket details and AI signals...</div>';

  try {
    const res = await window.api.getTicketDetail(ticketId);
    const t = res.data;

    const analysis = t.analysis;
    const reply = t.currentReply;
    const history = t.history || [];

    let analysisHtml = '';
    if (analysis) {
      const intentConf = Math.round((analysis.intent_confidence || 0) * 100);
      const sentConf = Math.round((analysis.sentiment_confidence || 0) * 100);
      const reasons = analysis.priority_reasons || [];

      analysisHtml = `
        <div class="signal-card">
          <div class="signal-title">Predicted Intent <span class="provenance-tag">BERT PREDICTION</span></div>
          <div class="signal-val">${escapeHtml(analysis.intent_label || 'Unclassified')} (${intentConf}% confidence)</div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Model: ${escapeHtml(analysis.intent_model_id || 'supportiq-bert-banking77-v1')}</div>
        </div>

        <div class="signal-card">
          <div class="signal-title">Customer Sentiment <span class="provenance-tag">DISTILBERT PREDICTION</span></div>
          <div class="signal-val">${escapeHtml(analysis.sentiment_label || 'Neutral')} (${sentConf}% confidence)</div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">SST-2 binary classifier (positive/negative)</div>
        </div>

        <div class="signal-card">
          <div class="signal-title">Recommended Priority <span class="provenance-tag" style="background:#e0f2fe; color:#0369a1;">RULE-BASED</span></div>
          <div class="signal-val">
            <span class="badge badge-${(analysis.priority_label || 'LOW').toLowerCase()}">${escapeHtml(analysis.priority_label || 'LOW')}</span>
          </div>
          <div style="font-size:0.75rem; color:#475569; margin-top:4px;">
            Rule Reasons: ${reasons.map(r => `<code>${escapeHtml(r)}</code>`).join(', ')}
          </div>
        </div>

        <div class="signal-card">
          <div class="signal-title">T5 Ticket Summary <span class="provenance-tag">T5-SMALL</span></div>
          <div style="font-size:0.875rem; font-style:italic;">"${escapeHtml(analysis.summary || 'No summary')}"</div>
        </div>
      `;
    } else {
      analysisHtml = `
        <div class="alert alert-info">
          <div>This ticket has not yet undergone NLP triage analysis.</div>
          <button class="btn btn-primary btn-sm mt-2" onclick="runAnalysisOnTicket(${t.id})">Run AI Analysis Now</button>
        </div>
      `;
    }

    let replyHtml = '';
    if (reply) {
      replyHtml = `
        <div style="margin-top:1.25rem; border-top:1px solid #e2e8f0; padding-top:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h4 style="font-size:0.95rem; font-weight:600;">Latest Generated Draft (v${reply.version})</h4>
            <span class="badge badge-status-${escapeHtml(reply.status)}">${escapeHtml(reply.status)}</span>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.75rem; font-size:0.875rem; white-space:pre-wrap; margin-bottom:0.75rem;">${escapeHtml(reply.current_text)}</div>
          <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="switchToReviewTab(${t.id})">Open in Review Workspace</button>
          </div>
        </div>
      `;
    }

    let historyHtml = history.map(h => `
      <div style="font-size:0.75rem; padding:4px 0; border-bottom:1px solid #f1f5f9;">
        <span style="color:#64748b;">${new Date(h.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
        <strong>${escapeHtml(h.event_type)}</strong>: ${escapeHtml(h.actor_name || 'System')} (${escapeHtml(h.from_status || 'NONE')} &rarr; ${escapeHtml(h.to_status || 'SAME')})
      </div>
    `).join('');

    body.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1rem;">
        <div>
          <h3 style="font-size:1.15rem; font-weight:700;">${escapeHtml(t.ticket_code)}: ${escapeHtml(t.subject)}</h3>
          <div style="font-size:0.8rem; color:#64748b;">Customer: ${escapeHtml(t.customer_name || 'N/A')} (${escapeHtml(t.customer_reference || 'N/A')}) | Created: ${new Date(t.created_at).toLocaleString()}</div>
        </div>
        <div>
          <span class="badge badge-status-${escapeHtml(t.status)}">${escapeHtml(t.status)}</span>
        </div>
      </div>

      <div class="split-view">
        <div>
          <h4 style="font-size:0.9rem; font-weight:600; margin-bottom:0.5rem;">Original Customer Request</h4>
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:6px; padding:0.85rem; font-size:0.875rem; white-space:pre-wrap; min-height:160px; max-height:260px; overflow-y:auto;">${escapeHtml(t.description)}</div>
          ${replyHtml}
        </div>
        <div>
          <h4 style="font-size:0.9rem; font-weight:600; margin-bottom:0.5rem;">NLP Analysis & Explainable Signals</h4>
          ${analysisHtml}
        </div>
      </div>

      <div style="margin-top:1.25rem; border-top:1px solid #e2e8f0; padding-top:0.75rem;">
        <h4 style="font-size:0.8rem; font-weight:600; text-transform:uppercase; color:#64748b; margin-bottom:0.4rem;">Audit History Trail</h4>
        <div style="max-height:120px; overflow-y:auto; background:#f8fafc; padding:0.5rem 0.75rem; border-radius:6px; border:1px solid #e2e8f0;">
          ${historyHtml || '<div style="font-size:0.75rem; color:#94a3b8;">No history events</div>'}
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div class="alert alert-danger">Error loading ticket: ${escapeHtml(err.message)}</div>`;
  }
}

async function runAnalysisOnTicket(ticketId) {
  const body = document.getElementById('ticket-detail-content');
  if (body) {
    body.innerHTML = '<div class="text-center py-5 text-muted">Running NLP Pipeline (Tokenization, BERT Intent, DistilBERT Sentiment, Rule Priority, T5 Summarization, Prompt Reply)... Please wait...</div>';
  }

  try {
    await window.api.analyzeTicket(ticketId, 'FEW_SHOT');
    openTicketDetail(ticketId);
    loadTicketsList();
    loadDashboard();
  } catch (err) {
    alert(`Analysis failed: ${err.message}`);
    openTicketDetail(ticketId);
  }
}

function closeTicketDetailModal() {
  const modal = document.getElementById('ticket-detail-modal');
  if (modal) modal.classList.remove('active');
}

function openCreateTicketModal() {
  const modal = document.getElementById('create-ticket-modal');
  if (modal) modal.classList.add('active');
}

function closeCreateTicketModal() {
  const modal = document.getElementById('create-ticket-modal');
  if (modal) modal.classList.remove('active');
}

async function handleCreateTicketSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const customerName = form.customerName.value.trim();
  const customerReference = form.customerReference.value.trim();
  const subject = form.subject.value.trim();
  const description = form.description.value.trim();
  const autoAnalyze = form.autoAnalyze.checked;

  if (!subject || !description) {
    alert('Please fill in both Subject and Description.');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating Ticket...';

  try {
    const res = await window.api.createTicket({
      customerName,
      customerReference,
      subject,
      description,
      channel: 'MANUAL',
    });

    const ticketId = res.data.id;

    if (autoAnalyze) {
      submitBtn.textContent = 'Running AI Analysis...';
      try {
        await window.api.analyzeTicket(ticketId, 'FEW_SHOT');
      } catch (analysisErr) {
        console.warn('Auto analysis warning:', analysisErr);
      }
    }

    form.reset();
    closeCreateTicketModal();
    loadTicketsList();
    loadDashboard();
    openTicketDetail(ticketId);
  } catch (err) {
    alert(`Failed to create ticket: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Ticket';
  }
}
