let activeReviewTicketId = null;
let activeReviewReplyId = null;
let originalGeneratedText = '';

async function loadReviewWorkspace(ticketId = null) {
  const container = document.getElementById('review-content-area');
  if (!container) return;

  if (!ticketId && !activeReviewTicketId) {
    try {
      const res = await window.api.getTickets({ status: 'NEEDS_REVIEW', limit: 1 });
      if (res.data.length > 0) {
        ticketId = res.data[0].id;
      } else {
        const anyRes = await window.api.getTickets({ limit: 1 });
        if (anyRes.data.length > 0) ticketId = anyRes.data[0].id;
      }
    } catch (e) {
      console.error(e);
    }
  }

  ticketId = ticketId || activeReviewTicketId;
  if (!ticketId) {
    container.innerHTML = `
      <div class="card p-5 text-center text-muted" style="border-radius:12px;">
        <h3>No Pending Draft Reviews</h3>
        <p>All support ticket replies have been reviewed or resolved.</p>
        <button class="btn btn-primary" onclick="openCreateTicketModal()" style="margin: 0 auto; width: max-content;">+ Create New Ticket</button>
      </div>
    `;
    return;
  }

  activeReviewTicketId = ticketId;
  container.innerHTML = '<div class="text-center py-5 text-muted"><span class="spinner-border spinner-border-sm me-2"></span>Loading review workspace...</div>';

  try {
    const res = await window.api.getTicketDetail(ticketId);
    const t = res.data;
    const reply = t.currentReply;
    const analysis = t.analysis;

    if (!reply) {
      container.innerHTML = `
        <div class="alert alert-warning" style="border-radius:10px;">
          <h4 style="font-weight:700;">No Reply Draft Generated for Ticket ${escapeHtml(t.ticket_code)}</h4>
          <p>Please run the NLP analysis pipeline first.</p>
          <button class="btn btn-primary btn-sm" onclick="runAnalysisOnTicket(${t.id})">⚡ Analyze & Generate Draft</button>
        </div>
      `;
      return;
    }

    activeReviewReplyId = reply.id;
    originalGeneratedText = reply.original_text || reply.current_text;

    const reasons = analysis?.priority_reasons || [];
    const isApproved = reply.status === 'APPROVED';

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; background:#ffffff; padding:1.2rem; border-radius:10px; border:1px solid #e2e8f0;">
        <div>
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <h2 style="font-size:1.25rem; font-weight:800; color:#0f172a; margin-bottom:0;">${escapeHtml(t.ticket_code)}: ${escapeHtml(t.subject)}</h2>
            <span class="badge badge-status-${escapeHtml(reply.status)}">${escapeHtml(reply.status)}</span>
          </div>
          <div style="font-size:0.8rem; color:#64748b; margin-top:4px;">
            Customer: <strong>${escapeHtml(t.customer_name || 'N/A')}</strong> |
            Triage Level: <span class="badge badge-${(t.effective_priority || 'LOW').toLowerCase()}">${escapeHtml(t.effective_priority || 'LOW')}</span> |
            Strategy: <code>${escapeHtml(reply.prompt_type)}</code> (v${reply.version})
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <label style="font-size:0.75rem; font-weight:700; color:#64748b;">SWITCH TICKET:</label>
          <select id="review-ticket-switcher" class="select-field" style="font-weight:600;" onchange="loadReviewWorkspace(parseInt(this.value, 10))">
            <option value="${t.id}" selected>${escapeHtml(t.ticket_code)} (Current)</option>
          </select>
        </div>
      </div>

      <div class="alert alert-warning" style="margin-bottom:1.25rem; border-radius:8px;">
        <div style="font-weight:700; display:flex; align-items:center; gap:0.4rem;">
          <span>🛡️ Human-in-the-Loop AI Governance:</span>
        </div>
        <div style="font-size:0.82rem; margin-top:2px;">
          SupportIQ creates professional draft responses. Approving a reply records the audit approval and marks it ready, but <strong>does NOT transmit an email or external message</strong>.
        </div>
      </div>

      <div class="split-view">
        <div>
          <div class="card p-3 mb-3" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <h4 style="font-size:0.9rem; font-weight:700; color:#1e293b; margin:0;">Customer Inquiry</h4>
              <span style="font-size:0.75rem; color:#64748b;">${new Date(t.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
            </div>
            <div style="font-size:0.875rem; white-space:pre-wrap; max-height:180px; overflow-y:auto; color:#1e293b; background:#f8fafc; padding:0.85rem; border-radius:8px; border:1px solid #e2e8f0;">${escapeHtml(t.description)}</div>
          </div>

          <div class="card p-3" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
            <h4 style="font-size:0.9rem; font-weight:700; color:#1e293b; margin-bottom:0.6rem;">Triage Signals & Explainability</h4>
            <div style="font-size:0.85rem; display:flex; flex-direction:column; gap:0.5rem;">
              <div><strong>Predicted Intent:</strong> <code style="color:#2563eb; background:#eff6ff; padding:2px 6px; border-radius:4px;">${escapeHtml(analysis?.intent_label || 'N/A')}</code></div>
              <div><strong>Sentiment:</strong> <span style="text-transform:capitalize;">${escapeHtml(analysis?.sentiment_label || 'N/A')}</span> (${Math.round((analysis?.sentiment_confidence || 0) * 100)}% conf)</div>
              <div><strong>T5 Synopsis:</strong> <span style="font-style:italic; color:#334155;">"${escapeHtml(analysis?.summary || 'N/A')}"</span></div>
              <div><strong>Priority Reason Codes:</strong> ${reasons.map(r => `<span style="background:#f1f5f9; padding:2px 6px; border-radius:4px; font-family:monospace; font-size:0.72rem;">${escapeHtml(r)}</span>`).join(' ')}</div>
            </div>
          </div>
        </div>

        <div>
          <div class="card p-3" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <h4 style="font-size:0.95rem; font-weight:700; color:#1e293b;">Agent Response Draft (v${reply.version})</h4>
              <div style="display:flex; gap:0.4rem;">
                <button class="btn btn-secondary btn-sm" style="padding:2px 8px; font-size:0.75rem;" onclick="copyTextToClipboard(document.getElementById('reply-editor-textarea').value, 'Draft copied!')">Copy Text</button>
              </div>
            </div>

            <!-- Snippets -->
            <div style="margin-bottom:0.6rem;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600; margin-right:4px;">Quick Snippets:</span>
              <button class="snippet-btn" onclick="insertSnippet('Please provide your 12-digit Acquirer Reference Number (ARN) or merchant ID.')">+ ARN Ref</button>
              <button class="snippet-btn" onclick="insertSnippet('For your security, a temporary protective hold has been placed on your card.')">+ Card Hold</button>
              <button class="snippet-btn" onclick="insertSnippet('You can update this securely in the Mobile App under Settings > Security 2FA.')">+ 2FA Link</button>
            </div>

            <div class="form-group mb-2">
              <textarea id="reply-editor-textarea" class="textarea-field" style="width:100%; min-height:200px; font-family:inherit; line-height:1.55;" oninput="updateWordCount()">${escapeHtml(reply.current_text)}</textarea>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <span id="char-word-count" style="font-size:0.75rem; color:#64748b;">Calculating...</span>
                <span style="font-size:0.72rem; color:#94a3b8;">Shortcut: <kbd style="background:#e2e8f0; padding:1px 4px; border-radius:3px;">Cmd/Ctrl + Enter</kbd> to save</span>
              </div>
            </div>

            <!-- Diff comparison box -->
            <div class="diff-container">
              <div class="diff-title">Original AI Generated Baseline (v${reply.version}):</div>
              <div style="color:#64748b; font-size:0.8rem; font-style:italic;">"${escapeHtml(reply.original_text)}"</div>
            </div>

            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.1rem; flex-wrap:wrap; gap:0.5rem;">
              <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-secondary btn-sm" onclick="saveReplyEdit()">💾 Save Edit</button>
                <button class="btn btn-secondary btn-sm" onclick="openRegenerateModal()">⚡ Regenerate</button>
              </div>
              <div style="display:flex; gap:0.5rem;">
                <button class="btn btn-danger btn-sm" onclick="openRejectModal()">✕ Reject</button>
                <button class="btn btn-success btn-sm" onclick="approveCurrentReply()" ${isApproved ? 'disabled' : ''}>
                  ${isApproved ? '✓ Approved (sent=false)' : '✓ Approve Draft'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    updateWordCount();
    populateSwitcherOptions();

    // Setup keyboard shortcut
    const textarea = document.getElementById('reply-editor-textarea');
    if (textarea) {
      textarea.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          saveReplyEdit();
        }
      });
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger">Error: ${escapeHtml(err.message)}</div>`;
  }
}

function updateWordCount() {
  const textarea = document.getElementById('reply-editor-textarea');
  const countEl = document.getElementById('char-word-count');
  if (!textarea || !countEl) return;

  const text = textarea.value.trim();
  const words = text ? text.split(/\s+/).length : 0;
  const chars = text.length;

  countEl.textContent = `${words} words | ${chars} characters`;
}

function insertSnippet(snippet) {
  const textarea = document.getElementById('reply-editor-textarea');
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  textarea.value = text.substring(0, start) + ' ' + snippet + ' ' + text.substring(end);
  textarea.focus();
  updateWordCount();
  window.api.showToast('Snippet inserted into draft', 'info');
}

async function populateSwitcherOptions() {
  const switcher = document.getElementById('review-ticket-switcher');
  if (!switcher) return;

  try {
    const res = await window.api.getTickets({ limit: 30 });
    const tickets = res.data;
    switcher.innerHTML = '';
    tickets.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.id;
      opt.textContent = `${t.ticket_code} — ${t.subject.substring(0, 32)}... (${t.status})`;
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
    window.api.showToast('Edit saved! If previously approved, approval was reset to review.', 'success');
    loadReviewWorkspace(activeReviewTicketId);
    loadDashboard();
  } catch (err) {
    alert(`Failed to save edit: ${err.message}`);
  }
}

async function approveCurrentReply() {
  if (!activeReviewReplyId) return;

  if (!confirm('Approve this response draft? It will be marked APPROVED with sent=false (no email sent).')) {
    return;
  }

  try {
    const res = await window.api.approveReply(activeReviewReplyId, 'Approved by authenticated support agent');
    window.api.showToast('Reply draft approved! (sent=false)', 'success');
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
    window.api.showToast('Draft rejected and recorded in audit trail.', 'error');
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
    window.api.showToast(`New draft version created using ${promptType}!`, 'success');
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
