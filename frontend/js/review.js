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

    const sources = reply.sources || [];
    const quality = reply.quality || {};
    const groundedScore = quality.groundedness !== undefined && quality.groundedness !== null ? quality.groundedness : null;
    const unsupportedClaims = quality.unsupported || [];
    const similarTickets = quality.similar || [];
    const isDuplicate = quality.is_duplicate;

    // Groundedness Badge
    let groundedBadge = '';
    if (groundedScore !== null) {
      const pct = Math.round(groundedScore * 100);
      if (groundedScore >= 0.8) {
        groundedBadge = `<span class="badge" style="background:#dcfce7; color:#15803d; border:1px solid #86efac; font-size:0.75rem;">🛡️ Grounded (${pct}%)</span>`;
      } else if (groundedScore >= 0.5) {
        groundedBadge = `<span class="badge" style="background:#fef3c7; color:#b45309; border:1px solid #fde68a; font-size:0.75rem;">⚠️ Partially Grounded (${pct}%)</span>`;
      } else {
        groundedBadge = `<span class="badge" style="background:#fee2e2; color:#b91c1c; border:1px solid #fca5a5; font-size:0.75rem;">⚠️ Low Grounding (${pct}%)</span>`;
      }
    }

    // Judge score chips
    let judgeHtml = '';
    if (quality.judge_relevance || quality.judge_tone || quality.judge_safety) {
      judgeHtml = `
        <div style="display:flex; flex-wrap:wrap; gap:0.4rem; align-items:center; margin-top:0.4rem; font-size:0.75rem;">
          <span style="font-weight:700; color:#475569;">LLM Judge:</span>
          <span style="background:#eff6ff; color:#1d4ed8; padding:2px 7px; border-radius:4px; font-weight:600;">Relevance: ${quality.judge_relevance || '-'}/5</span>
          <span style="background:#f0fdf4; color:#15803d; padding:2px 7px; border-radius:4px; font-weight:600;">Tone: ${quality.judge_tone || '-'}/5</span>
          <span style="background:${quality.judge_safety === 1 ? '#fee2e2; color:#b91c1c;' : '#faf5ff; color:#7e22ce;'} padding:2px 7px; border-radius:4px; font-weight:600;">Safety: ${quality.judge_safety || '-'}/5</span>
          ${quality.judge_reason ? `<span style="color:#64748b; font-style:italic;">"${escapeHtml(quality.judge_reason)}"</span>` : ''}
        </div>
      `;
    }

    // Sources List HTML
    let sourcesHtml = '';
    if (sources.length > 0) {
      sourcesHtml = `
        <div class="card p-3 mt-3" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
            <h4 style="font-size:0.9rem; font-weight:700; color:#1e293b; margin:0;">📚 Retrieved Company Knowledge (RAG Context)</h4>
            <span style="font-size:0.75rem; color:#64748b;">${sources.length} sources linked</span>
          </div>
          <div style="display:flex; flex-direction:column; gap:0.45rem;">
            ${sources.map((s, idx) => `
              <details style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:6px; padding:0.4rem 0.65rem; font-size:0.8rem;">
                <summary style="cursor:pointer; font-weight:600; color:#1e293b;">
                  [${idx + 1}] (${escapeHtml(s.doc_type)}) ${escapeHtml(s.title || s.doc_id)}
                  ${s.score !== null ? `<span style="font-size:0.72rem; color:#2563eb; margin-left:6px; font-weight:500;">Match: ${(s.score * 100).toFixed(0)}%</span>` : ''}
                </summary>
                <div style="margin-top:0.35rem; color:#475569; font-size:0.78rem; border-top:1px dashed #cbd5e1; padding-top:0.35rem; line-height:1.45;">
                  ${escapeHtml(s.snippet || 'No text snippet')}
                </div>
              </details>
            `).join('')}
          </div>
        </div>
      `;
    }

    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; background:#ffffff; padding:1.2rem; border-radius:10px; border:1px solid #e2e8f0;">
        <div>
          <div style="display:flex; align-items:center; gap:0.6rem; flex-wrap:wrap;">
            <h2 style="font-size:1.25rem; font-weight:800; color:#0f172a; margin-bottom:0;">${escapeHtml(t.ticket_code)}: ${escapeHtml(t.subject)}</h2>
            <span class="badge badge-status-${escapeHtml(reply.status)}">${escapeHtml(reply.status)}</span>
            ${isDuplicate ? '<span class="badge" style="background:#fee2e2; color:#b91c1c; font-weight:700;">🚨 Possible Duplicate</span>' : ''}
            ${groundedBadge}
          </div>
          <div style="font-size:0.8rem; color:#64748b; margin-top:4px;">
            Customer: <strong>${escapeHtml(t.customer_name || 'N/A')}</strong> |
            Triage Level: <span class="badge badge-${(t.effective_priority || 'LOW').toLowerCase()}">${escapeHtml(t.effective_priority || 'LOW')}</span> |
            Strategy: <code>${escapeHtml(reply.prompt_type)}</code> (v${reply.version}) |
            Model: <span style="font-family:monospace; color:#2563eb;">${escapeHtml(reply.model_id || 'Qwen2.5-1.5B')}</span>
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
          SupportIQ creates professional draft responses grounded in company knowledge. Approving a reply records the audit approval and marks it ready, but <strong>does NOT transmit an email or external message</strong>. Always verify sources before approving.
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

            ${similarTickets.length > 0 ? `
              <div class="mt-3 pt-2" style="border-top:1px solid #f1f5f9;">
                <div style="font-weight:700; font-size:0.82rem; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
                  <span>🔍 Similar Historical Inquiries:</span>
                  ${isDuplicate ? '<span class="badge" style="background:#fee2e2; color:#b91c1c; font-size:0.7rem;">Likely Duplicate</span>' : ''}
                </div>
                ${similarTickets.slice(0, 3).map(st => `
                  <div style="font-size:0.78rem; background:#f8fafc; border:1px solid #e2e8f0; padding:4px 8px; border-radius:5px; margin-bottom:4px; color:#334155;">
                    <div style="display:flex; justify-content:space-between;">
                      <strong>${escapeHtml(st.id)}</strong>
                      <span style="color:#2563eb; font-weight:600;">${Math.round((st.score || 0) * 100)}% match</span>
                    </div>
                    <div style="font-size:0.75rem; color:#64748b; margin-top:2px;">"${escapeHtml(st.text || '')}"</div>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        </div>

        <div>
          <div class="card p-3" style="background:#ffffff; border:1px solid #e2e8f0; border-radius:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
              <div style="display:flex; align-items:center; gap:0.5rem;">
                <h4 style="font-size:0.95rem; font-weight:700; color:#1e293b; margin:0;">Agent Response Draft (v${reply.version})</h4>
                ${groundedBadge}
              </div>
              <div style="display:flex; gap:0.4rem;">
                <button class="btn btn-secondary btn-sm" style="padding:2px 8px; font-size:0.75rem;" onclick="copyTextToClipboard(document.getElementById('reply-editor-textarea').value, 'Draft copied!')">Copy Text</button>
              </div>
            </div>

            ${judgeHtml}

            <!-- Snippets -->
            <div style="margin:0.6rem 0;">
              <span style="font-size:0.75rem; color:#64748b; font-weight:600; margin-right:4px;">Quick Snippets:</span>
              <button class="snippet-btn" onclick="insertSnippet('Please provide your 12-digit Acquirer Reference Number (ARN) or merchant ID.')">+ ARN Ref</button>
              <button class="snippet-btn" onclick="insertSnippet('For your security, a temporary protective hold has been placed on your card.')">+ Card Hold</button>
              <button class="snippet-btn" onclick="insertSnippet('You can update this securely in the Mobile App under Settings > Security 2FA.')">+ 2FA Link</button>
            </div>

            <div class="form-group mb-2">
              <textarea id="reply-editor-textarea" class="textarea-field" style="width:100%; min-height:190px; font-family:inherit; line-height:1.55;" oninput="updateWordCount()">${escapeHtml(reply.current_text)}</textarea>
              <div style="display:flex; justify-content:space-between; align-items:center; margin-top:4px;">
                <span id="char-word-count" style="font-size:0.75rem; color:#64748b;">Calculating...</span>
                <span style="font-size:0.72rem; color:#94a3b8;">Shortcut: <kbd style="background:#e2e8f0; padding:1px 4px; border-radius:3px;">Cmd/Ctrl + Enter</kbd> to save</span>
              </div>
            </div>

            ${unsupportedClaims.length > 0 ? `
              <div class="alert alert-warning p-2 mb-2" style="font-size:0.78rem; border-radius:6px;">
                <strong>⚠️ Claims requiring human agent verification:</strong>
                <ul style="margin:4px 0 0 16px; padding:0;">
                  ${unsupportedClaims.map(u => `<li>${escapeHtml(u)}</li>`).join('')}
                </ul>
              </div>
            ` : ''}

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

          ${sourcesHtml}
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
    const res = await window.api.getTickets({ limit: 40 });
    const tickets = res.data;

    let html = '';
    tickets.forEach(ticket => {
      const isCurrent = ticket.id === activeReviewTicketId;
      const statusIcon = ticket.status === 'APPROVED' ? '✓' : (ticket.status === 'NEEDS_REVIEW' ? '⚡' : '•');
      html += `<option value="${ticket.id}" ${isCurrent ? 'selected' : ''}>${statusIcon} ${escapeHtml(ticket.ticket_code)}: ${escapeHtml(ticket.subject.substring(0, 32))}...</option>`;
    });

    switcher.innerHTML = html;
  } catch (e) {
    console.error('Failed to populate switcher:', e);
  }
}

async function saveReplyEdit() {
  if (!activeReviewReplyId) return;
  const textarea = document.getElementById('reply-editor-textarea');
  if (!textarea) return;

  const newText = textarea.value.trim();
  if (!newText) {
    window.api.showToast('Reply text cannot be empty', 'error');
    return;
  }

  try {
    await window.api.editReply(activeReviewReplyId, newText);
    window.api.showToast('Draft edits saved successfully', 'success');
    loadReviewWorkspace(activeReviewTicketId);
  } catch (err) {
    window.api.showToast('Failed to save edit: ' + err.message, 'error');
  }
}

async function approveCurrentReply() {
  if (!activeReviewReplyId) return;

  try {
    const res = await window.api.approveReply(activeReviewReplyId, 'Approved by reviewing agent');
    window.api.showToast('Reply draft approved. Recorded with sent=false (Human-in-the-Loop)', 'success');
    loadReviewWorkspace(activeReviewTicketId);
  } catch (err) {
    window.api.showToast('Failed to approve reply: ' + err.message, 'error');
  }
}

function openRejectModal() {
  const modal = document.getElementById('reject-reply-modal');
  if (modal) {
    const textarea = document.getElementById('rejectReason');
    if (textarea) textarea.value = '';
    modal.classList.add('active');
  }
}

function closeRejectModal() {
  const modal = document.getElementById('reject-reply-modal');
  if (modal) modal.classList.remove('active');
}

async function handleRejectSubmit(e) {
  e.preventDefault();
  if (!activeReviewReplyId) return;

  const textarea = document.getElementById('rejectReason');
  const reason = textarea ? textarea.value.trim() : '';

  if (!reason || reason.length < 3) {
    window.api.showToast('Rejection reason must be at least 3 characters', 'error');
    return;
  }

  try {
    await window.api.rejectReply(activeReviewReplyId, reason);
    closeRejectModal();
    window.api.showToast('Reply rejected and reason recorded in audit log', 'info');
    loadReviewWorkspace(activeReviewTicketId);
  } catch (err) {
    window.api.showToast('Failed to reject reply: ' + err.message, 'error');
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

async function handleRegenerateSubmit(e) {
  e.preventDefault();
  if (!activeReviewTicketId) return;

  const select = document.getElementById('promptStrategy');
  const promptType = select ? select.value : 'INSTRUCTIONAL';

  closeRegenerateModal();
  window.api.showToast(`Regenerating draft using ${promptType} strategy...`, 'info');

  try {
    await window.api.regenerateReply(activeReviewTicketId, promptType);
    window.api.showToast('New draft version generated successfully', 'success');
    loadReviewWorkspace(activeReviewTicketId);
  } catch (err) {
    window.api.showToast('Failed to regenerate reply: ' + err.message, 'error');
  }
}

function copyTextToClipboard(text, successMsg = 'Copied to clipboard!') {
  if (!navigator.clipboard) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    window.api.showToast(successMsg, 'success');
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    window.api.showToast(successMsg, 'success');
  }).catch(err => {
    window.api.showToast('Failed to copy: ' + err.message, 'error');
  });
}
