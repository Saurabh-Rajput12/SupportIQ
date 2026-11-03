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

    const countBadge = document.getElementById('tickets-count-badge');
    if (countBadge) countBadge.textContent = `${tickets.length} tickets`;

    if (tickets.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-5 text-muted">No tickets found matching current filters.</td></tr>';
      return;
    }

    tickets.forEach(t => {
      const tr = document.createElement('tr');
      const priority = t.effective_priority || 'LOW';
      tr.innerHTML = `
        <td><strong style="color:#0f172a;">${escapeHtml(t.ticket_code)}</strong></td>
        <td>
          <div style="font-weight:600; color:#1e293b;">${escapeHtml(t.subject)}</div>
          <div style="font-size:0.75rem; color:#64748b;">${escapeHtml(t.customer_name || 'Anonymous')} (${escapeHtml(t.customer_reference || 'No ref')})</div>
        </td>
        <td><span class="badge badge-${priority.toLowerCase()}">${escapeHtml(priority)}</span></td>
        <td><span class="badge badge-status-${escapeHtml(t.status)}">${escapeHtml(t.status)}</span></td>
        <td><code style="font-size:0.75rem; color:#2563eb; background:#eff6ff; padding:2px 6px; border-radius:4px;">${escapeHtml(t.intent_label || 'Not analyzed')}</code></td>
        <td>
          <div style="display:flex; gap:0.4rem;">
            <button class="btn btn-secondary btn-sm" onclick="openTicketDetail(${t.id})">Details</button>
            ${t.status === 'NEEDS_REVIEW' ? `<button class="btn btn-primary btn-sm" onclick="switchToReviewTab(${t.id})">Review Draft</button>` : ''}
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Error: ${escapeHtml(err.message)}</td></tr>`;
  }
}

function setQuickFilter(type, value) {
  document.querySelectorAll('.filter-pill').forEach(el => el.classList.remove('active'));
  event?.target?.classList.add('active');

  if (type === 'all') {
    currentFilterStatus = '';
    currentFilterPriority = '';
  } else if (type === 'priority') {
    currentFilterPriority = value;
    currentFilterStatus = '';
  } else if (type === 'status') {
    currentFilterStatus = value;
    currentFilterPriority = '';
  }

  const statusSelect = document.getElementById('filter-status-select');
  if (statusSelect) statusSelect.value = currentFilterStatus;
  const prioritySelect = document.getElementById('filter-priority-select');
  if (prioritySelect) prioritySelect.value = currentFilterPriority;

  loadTicketsList();
  window.api.showToast(`Applied filter: ${type} ${value || 'all'}`, 'info');
}

async function openTicketDetail(ticketId) {
  const modal = document.getElementById('ticket-detail-modal');
  const body = document.getElementById('ticket-detail-content');
  if (!modal || !body) return;

  modal.classList.add('active');
  body.innerHTML = '<div class="text-center py-5 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading ticket details and AI signals...</div>';

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
          <div class="signal-val">${escapeHtml(analysis.intent_label || 'Unclassified')} <span style="font-size:0.8rem; font-weight:normal; color:#64748b;">(${intentConf}% confidence)</span></div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Model: <code>${escapeHtml(analysis.intent_model_id || 'supportiq-bert-banking77-v1')}</code></div>
        </div>

        <div class="signal-card">
          <div class="signal-title">Customer Sentiment <span class="provenance-tag">DISTILBERT SST-2</span></div>
          <div class="signal-val">
            <span style="text-transform:capitalize;">${escapeHtml(analysis.sentiment_label || 'Neutral')}</span>
            <span style="font-size:0.8rem; font-weight:normal; color:#64748b;">(${sentConf}% confidence)</span>
          </div>
          <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">Binary polarity classification (positive / negative)</div>
        </div>

        <div class="signal-card">
          <div class="signal-title">Recommended Priority <span class="provenance-tag" style="background:#e0f2fe; color:#0369a1;">RULE-BASED</span></div>
          <div class="signal-val">
            <span class="badge badge-${(analysis.priority_label || 'LOW').toLowerCase()}">${escapeHtml(analysis.priority_label || 'LOW')}</span>
          </div>
          <div style="font-size:0.75rem; color:#475569; margin-top:5px;">
            Triggered Rules: ${reasons.map(r => `<span style="background:#e2e8f0; padding:1px 5px; border-radius:3px; margin-right:3px; font-family:monospace; font-size:0.7rem;">${escapeHtml(r)}</span>`).join('')}
          </div>
        </div>

        <div class="signal-card">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="signal-title">T5 Ticket Summary <span class="provenance-tag">T5-SMALL</span></div>
            <button class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:0.7rem;" onclick="copyTextToClipboard('${escapeHtml(analysis.summary || '').replace(/'/g, "\\'")}', 'Summary copied!')">Copy</button>
          </div>
          <div style="font-size:0.875rem; font-style:italic; color:#1e293b; margin-top:4px;">"${escapeHtml(analysis.summary || 'No summary')}"</div>
        </div>
      `;
    } else {
      analysisHtml = `
        <div class="alert alert-info" style="border-radius:8px;">
          <div style="font-weight:600; margin-bottom:4px;">No AI Analysis Records Found</div>
          <div style="font-size:0.8rem; color:#1e40af; margin-bottom:12px;">Run the pipeline to extract intent, sentiment, priority, T5 summary, and draft response.</div>
          <button class="btn btn-primary btn-sm" onclick="runAnalysisOnTicket(${t.id})">⚡ Run AI Analysis Now</button>
        </div>
      `;
    }

    let replyHtml = '';
    if (reply) {
      replyHtml = `
        <div style="margin-top:1.25rem; border-top:1px solid #e2e8f0; padding-top:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h4 style="font-size:0.95rem; font-weight:700;">Latest Draft (v${reply.version})</h4>
            <span class="badge badge-status-${escapeHtml(reply.status)}">${escapeHtml(reply.status)}</span>
          </div>
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:0.85rem; font-size:0.875rem; white-space:pre-wrap; margin-bottom:0.75rem;">${escapeHtml(reply.current_text)}</div>
          <div style="display:flex; gap:0.5rem; justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" onclick="copyTextToClipboard('${escapeHtml(reply.current_text).replace(/'/g, "\\'")}', 'Draft copied to clipboard!')">Copy Draft</button>
            <button class="btn btn-primary btn-sm" onclick="switchToReviewTab(${t.id})">Open Review Workspace &rarr;</button>
          </div>
        </div>
      `;
    }

    let historyHtml = history.map(h => `
      <div style="font-size:0.75rem; padding:5px 0; border-bottom:1px solid #f1f5f9; display:flex; justify-content:space-between;">
        <div>
          <strong style="color:#0f172a;">${escapeHtml(h.event_type)}</strong>
          <span style="color:#64748b;">by ${escapeHtml(h.actor_name || 'System')}</span>
          ${h.from_status ? `<span style="color:#94a3b8;">(${escapeHtml(h.from_status)} &rarr; ${escapeHtml(h.to_status)})</span>` : ''}
        </div>
        <div style="color:#94a3b8;">${new Date(h.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div>
      </div>
    `).join('');

    body.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.25rem; background:#f8fafc; padding:1rem; border-radius:8px; border:1px solid #e2e8f0;">
        <div>
          <h3 style="font-size:1.15rem; font-weight:800; color:#0f172a; margin-bottom:4px;">${escapeHtml(t.ticket_code)}: ${escapeHtml(t.subject)}</h3>
          <div style="font-size:0.8rem; color:#64748b;">
            Customer: <strong>${escapeHtml(t.customer_name || 'N/A')}</strong> | Reference: <code>${escapeHtml(t.customer_reference || 'N/A')}</code> | Ingested: ${new Date(t.created_at).toLocaleString()}
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <label style="font-size:0.75rem; font-weight:700; color:#475569;">STATUS:</label>
          <select class="select-field" style="padding:3px 8px; font-size:0.75rem; font-weight:700;" onchange="handleModalStatusChange(${t.id}, this.value)">
            <option value="NEW" ${t.status === 'NEW' ? 'selected' : ''}>NEW</option>
            <option value="NEEDS_REVIEW" ${t.status === 'NEEDS_REVIEW' ? 'selected' : ''}>NEEDS_REVIEW</option>
            <option value="IN_PROGRESS" ${t.status === 'IN_PROGRESS' ? 'selected' : ''}>IN_PROGRESS</option>
            <option value="APPROVED" ${t.status === 'APPROVED' ? 'selected' : ''}>APPROVED</option>
            <option value="RESOLVED" ${t.status === 'RESOLVED' ? 'selected' : ''}>RESOLVED</option>
            <option value="REJECTED" ${t.status === 'REJECTED' ? 'selected' : ''}>REJECTED</option>
          </select>
        </div>
      </div>

      <div class="split-view">
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h4 style="font-size:0.9rem; font-weight:700; color:#1e293b;">Original Customer Request</h4>
            <button class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:0.7rem;" onclick="copyTextToClipboard('${escapeHtml(t.description).replace(/'/g, "\\'")}', 'Original text copied!')">Copy Text</button>
          </div>
          <div style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px; padding:0.95rem; font-size:0.875rem; white-space:pre-wrap; min-height:160px; max-height:240px; overflow-y:auto; color:#1e293b;">${escapeHtml(t.description)}</div>
          ${replyHtml}
        </div>
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h4 style="font-size:0.9rem; font-weight:700; color:#1e293b;">NLP Analysis & Explainable Signals</h4>
            ${analysis ? `<button class="btn btn-secondary btn-sm" style="padding:2px 6px; font-size:0.7rem;" onclick="runAnalysisOnTicket(${t.id})">Re-Analyze</button>` : ''}
          </div>
          ${analysisHtml}
        </div>
      </div>

      <div style="margin-top:1.25rem; border-top:1px solid #e2e8f0; padding-top:0.75rem;">
        <h4 style="font-size:0.75rem; font-weight:700; text-transform:uppercase; color:#64748b; margin-bottom:0.4rem; letter-spacing:0.04em;">Audit Trail Event Log</h4>
        <div style="max-height:110px; overflow-y:auto; background:#f8fafc; padding:0.5rem 0.85rem; border-radius:8px; border:1px solid #e2e8f0;">
          ${historyHtml || '<div style="font-size:0.75rem; color:#94a3b8;">No events recorded yet</div>'}
        </div>
      </div>
    `;
  } catch (err) {
    body.innerHTML = `<div class="alert alert-danger">Error loading ticket: ${escapeHtml(err.message)}</div>`;
  }
}

async function handleModalStatusChange(ticketId, newStatus) {
  try {
    await window.api.updateTicketStatus(ticketId, newStatus, 'Status changed via detail modal');
    window.api.showToast(`Ticket status updated to ${newStatus}`, 'success');
    loadTicketsList();
    loadDashboard();
  } catch (err) {
    alert(`Failed to update status: ${err.message}`);
  }
}

function copyTextToClipboard(text, successMsg = 'Copied to clipboard!') {
  navigator.clipboard.writeText(text).then(() => {
    window.api.showToast(successMsg, 'success');
  }).catch(() => {
    window.api.showToast('Failed to copy', 'error');
  });
}

async function runAnalysisOnTicket(ticketId) {
  const body = document.getElementById('ticket-detail-content');
  if (body) {
    body.innerHTML = `
      <div class="text-center py-5">
        <div class="spinner-border text-primary mb-3" role="status"></div>
        <h4 style="font-weight:700;">Running NLP Pipeline</h4>
        <p style="font-size:0.85rem; color:#64748b;">Executing Tokenization, BERT Intent, DistilBERT Sentiment, Rule Priority, T5 Summarization, and Prompt Reply Draft...</p>
      </div>
    `;
  }

  try {
    await window.api.analyzeTicket(ticketId, 'FEW_SHOT');
    window.api.showToast('AI analysis completed successfully!', 'success');
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

function prefillCreateForm(presetKey) {
  const form = document.querySelector('#create-ticket-modal form');
  if (!form) return;

  const presets = {
    stolen: {
      subject: 'Urgent: Debit card stolen in Paris, unauthorized access detected',
      name: 'Julian Henderson',
      ref: 'CUST-7712',
      desc: 'My wallet with my debit card was stolen this afternoon near Gare du Nord. I just saw an unauthorized withdrawal attempt for 200 EUR. Please freeze my card immediately!'
    },
    double: {
      subject: 'Double wire transfer charged twice for mortgage payment',
      name: 'Clara Vance',
      ref: 'CUST-3310',
      desc: 'I authorized a monthly transfer of $1,800 to my escrow account, but my transaction statement shows two identical deductions of $1,800 on November 1st. Please reverse the duplicate charge.'
    },
    phishing: {
      subject: 'Received fake security SMS asking for login credentials',
      name: 'Ahmed Mansoor',
      ref: 'CUST-9941',
      desc: 'I received an urgent text claiming my account is temporarily suspended and asking to verify my password at support-security-update.com. Forwarding this suspicious phishing attempt.'
    },
    phone: {
      subject: 'Need to update registered mobile phone number for 2FA',
      name: 'Maria Santos',
      ref: 'CUST-1029',
      desc: 'I switched mobile carriers and have a new phone number. How can I safely update my 2FA authentication number without getting locked out of my account?'
    }
  };

  const p = presets[presetKey];
  if (!p) return;

  form.subject.value = p.subject;
  form.customerName.value = p.name;
  form.customerReference.value = p.ref;
  form.description.value = p.desc;

  window.api.showToast(`Applied preset: ${presetKey}`, 'info');
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
    window.api.showToast(`Ticket ${res.data.ticketCode} created!`, 'success');

    if (autoAnalyze) {
      submitBtn.textContent = 'Running AI Analysis...';
      try {
        await window.api.analyzeTicket(ticketId, 'FEW_SHOT');
        window.api.showToast('AI analysis completed!', 'success');
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
