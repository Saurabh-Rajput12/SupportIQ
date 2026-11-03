let activeReviewTicketId = null;
let activeReviewReplyId = null;

async function loadReviewWorkspace(ticketId = null) {
  const container = document.getElementById('review-content-area');
  if (!container) return;

  if (!ticketId && !activeReviewTicketId) {
    // Find first ticket in NEEDS_REVIEW
    try {
      const res = await window.api.getTickets({ status: 'NEEDS_REVIEW', limit: 1 });
      if (res.data.length > 0) {
        ticketId = res.data[0].id;
      }
    } catch (e) {
      console.error(e);
    }
  }

  ticketId = ticketId || activeReviewTicketId;
  if (!ticketId) {
    container.innerHTML = `
      <div class="card p-5 text-center text-muted">
        <h3>No Pending Draft Reviews</h3>
        <p>All support ticket replies have been reviewed or resolved. Create or analyze a ticket to generate a draft.</p>
        <button class="btn btn-primary" onclick="openCreateTicketModal()" style="margin: 0 auto; width: max-content;">Create New Ticket</button>
      </div>
    `;
    return;
  }

  activeReviewTicketId = ticketId;
  container.innerHTML = '<div class="text-center py-5 text-muted">Loading review workspace...</div>';

  try {
    const res = await window.api.getTicketDetail(ticketId);
    const t = res.data;
    const reply = t.currentReply;
    const analysis = t.analysis;

    if (!reply) {
      container.innerHTML = `
        <div class="alert alert-warning">
          <h4>No reply draft generated yet for ticket ${escapeHtml(t.ticket_code)}</h4>
          <p>Please run the NLP analysis pipeline first.</p>
          <button class="btn btn-primary btn-sm" onclick="runAnalysisOnTicket(${t.id})">Analyze & Generate Draft</button>
        </div>
      `;
      return;
    }

    activeReviewReplyId = reply.id;

    const reasons = analysis?.priority_reasons || [];

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
        <div>
          <h2 style="font-size:1.25rem; font-weight:700;">Ticket ${escapeHtml(t.ticket_code)}: ${escapeHtml(t.subject)}</h2>
          <div style="font-size:0.8rem; color:#64748b;">
            Customer: ${escapeHtml(t.customer_name || 'N/A')} |
            Priority: <span class="badge badge-${(t.effective_priority || 'LOW').toLowerCase()}">${escapeHtml(t.effective_priority || 'LOW')}</span> |
            Status: <span class="badge badge-status-${escapeHtml(reply.status)}">${escapeHtml(reply.status)}</span>
          </div>
        </div>
        <div style="display:flex; gap:0.5rem;">
          <select id="review-ticket-switcher" class="select-field" onchange="loadReviewWorkspace(parseInt(this.value, 10))">
            <option value="${t.id}" selected>${escapeHtml(t.ticket_code)} (Current)</option>
          </select>
        </div>
      </div>

      <div class="alert alert-warning" style="margin-bottom:1.25rem;">
        <strong>Human-in-the-Loop Oversight:</strong> SupportIQ generates response drafts for agent inspection.
        Approving a reply sets its status to <code>APPROVED</code> but <strong>does NOT transmit an email or external message</strong>.
      </div>

      <div class="split-view">
        <div>
          <div class="card p-3 mb-3" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px;">
            <h4 style="font-size:0.9rem; font-weight:600; margin-bottom:0.5rem;">Customer Ticket Request</h4>
            <div style="font-size:0.875rem; white-space:pre-wrap; max-height:200px; overflow-y:auto; color:#1e293b; background:#f8fafc; padding:0.75rem; border-radius:6px;">${escapeHtml(t.description)}</div>
          </div>

          <div class="card p-3" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px;">
            <h4 style="font-size:0.9rem; font-weight:600; margin-bottom:0.5rem;">Context Signals & Rationale</h4>
            <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:0.4rem;">
              <div><strong>Intent:</strong> ${escapeHtml(analysis?.intent_label || 'N/A')}</div>
              <div><strong>Sentiment:</strong> ${escapeHtml(analysis?.sentiment_label || 'N/A')}</div>
              <div><strong>T5 Summary:</strong> ${escapeHtml(analysis?.summary || 'N/A')}</div>
              <div><strong>Priority Reasons:</strong> ${reasons.map(r => `<code>${escapeHtml(r)}</code>`).join(' ')}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="card p-3" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:8px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <h4 style="font-size:0.95rem; font-weight:600;">Draft Response (Version ${reply.version})</h4>
              <span style="font-size:0.75rem; color:#64748b;">Strategy: <strong>${escapeHtml(reply.prompt_type)}</strong></span>
            </div>

            <div class="form-group">
              <label class="form-label">Review & Edit Draft Content:</label>
              <textarea id="reply-editor-textarea" class="textarea-field" style="width:100%; min-height:220px; font-family:inherit; line-height:1.5;">${escapeHtml(reply.current_text)}</textarea>
              <div class="form-help">Edits will update version ${reply.version}. If the reply was already approved, saving an edit revokes approval back to review.</div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1rem; flex-wrap:wrap; gap:0.5rem;">
              <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-secondary btn-sm" onclick="saveReplyEdit()">Save Edit</button>
                <button class="btn btn-secondary btn-sm" onclick="openRegenerateModal()">Regenerate Draft</button>
              </div>
              <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-danger btn-sm" onclick="openRejectModal()">Reject Draft</button>
                <button class="btn btn-success btn-sm" onclick="approveCurrentReply()" ${reply.status === 'APPROVED' ? 'disabled' : ''}>
                  ${reply.status === 'APPROVED' ? '&#10003; Approved (Not Sent)' : 'Approve Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    populateSwitcherOptions();
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(err.message)}</div>`;
  }
}

async function populateSwitcherOptions() {
  const switcher = document.getElementById('review-ticket-switcher');
  if (!switcher) return;

  try {
    const res = await window.api.getTickets({ status: 'NEEDS_REVIEW', limit: 20 });
    const tickets = res.data;
    switcher.innerHTML = '';
    tickets.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.ticket_code} — ${t.subject.substring(0, 30)}...`;
      if (t.id === activeReviewTicketId) opt.selected = true;
      switcher.appendChild(opt);
    });
  } catch (e) {
    console.error(e);
  }
}

async function saveReplyEdit() {
  const textarea = document.getElementById('reply-editor-textarea');
  if (!textarea || !activeReviewReplyId) return;

  const newText = textarea.value.trim();
  if (!newText) {
    alert('Reply text cannot be empty.');
    return;
  }

  try {
    await window.api.editReply(activeReviewReplyId, newText);
    alert('Edit saved successfully. Note: If previously approved, approval was revoked to review.');
    loadReviewWorkspace(activeReviewTicketId);
    loadDashboard();
  } catch (err) {
    alert(`Failed to save edit: ${err.message}`);
  }
}

async function approveCurrentReply() {
  if (!activeReviewReplyId) return;

  if (!confirm('Approve this reply draft? Remember: this saves the approved draft for the agent record, but will NOT automatically send an email.')) {
    return;
  }

  try {
    const res = await window.api.approveReply(activeReviewReplyId, 'Approved by authenticated support agent');
    alert(`Success: Reply status updated to APPROVED. (sent=${res.data.sent})`);
    loadReviewWorkspace(activeReviewTicketId);
    loadDashboard();
  } catch (err) {
    alert(`Approval failed: ${err.message}`);
  }
}

function openRejectModal() {
  const modal = document.getElementById('reject-reply-modal');
  if (modal) modal.classList.add('active');
}

function closeRejectModal() {
  const modal = document.getElementById('reject-reply-modal');
  if (modal) modal.classList.remove('active');
}

async function handleRejectSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const reason = form.rejectReason.value.trim();

  if (!reason || reason.length < 3) {
    alert('Please enter a rejection reason (minimum 3 characters).');
    return;
  }

  try {
    await window.api.rejectReply(activeReviewReplyId, reason);
    form.reset();
    closeRejectModal();
    alert('Reply rejected and recorded in audit log.');
    loadReviewWorkspace(activeReviewTicketId);
    loadDashboard();
  } catch (err) {
    alert(`Rejection failed: ${err.message}`);
  }
}

function openRegenerateModal() {
  const modal = document.getElementById('regenerate-modal');
  if (modal) modal.classList.add('active');
}

function closeRegenerateModal() {
  const modal = document.getElementById('regenerate-modal');
  if (modal) modal.classList.remove('active');
}

async function handleRegenerateSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const promptType = form.promptStrategy.value;
  const submitBtn = form.querySelector('button[type="submit"]');

  submitBtn.disabled = true;
  submitBtn.textContent = 'Generating New Version...';

  try {
    await window.api.regenerateReply(activeReviewTicketId, promptType);
    closeRegenerateModal();
    alert(`New draft version generated using ${promptType} strategy.`);
    loadReviewWorkspace(activeReviewTicketId);
    loadDashboard();
  } catch (err) {
    alert(`Regeneration failed: ${err.message}`);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Generate Draft';
  }
}

function switchToReviewTab(ticketId) {
  closeTicketDetailModal();
  switchView('review');
  loadReviewWorkspace(ticketId);
}
