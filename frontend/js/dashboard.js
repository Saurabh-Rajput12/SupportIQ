let statusChart = null;
let priorityChart = null;

async function loadDashboard() {
  try {
    const overviewRes = await window.api.getOverview();
    const overview = overviewRes.data;

    document.getElementById('kpi-total').textContent = overview.total;
    document.getElementById('kpi-open').textContent = overview.open;
    document.getElementById('kpi-review').textContent = overview.pendingReview;
    document.getElementById('kpi-critical').textContent = overview.critical;
    document.getElementById('kpi-high').textContent = overview.high;
    document.getElementById('kpi-speed').textContent = `${overview.avgProcessingMs} ms`;

    // Load Charts
    const distRes = await window.api.getDistributions();
    const dists = distRes.data;

    renderStatusChart(dists.status);
    renderPriorityChart(dists.priority);

    // Check ML Service Readiness
    checkModelReadiness();

    // Load Recent Priority Queue
    loadPriorityQueue();
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

async function checkModelReadiness() {
  const badge = document.getElementById('model-readiness-badge');
  try {
    const statusRes = await window.api.getModelStatus();
    if (statusRes.data.mlServiceOnline) {
      badge.innerHTML = '<span class="dot" style="background:#10b981;"></span> ML Service Ready';
      badge.title = 'All NLP models loaded & operational';
    } else {
      badge.innerHTML = '<span class="dot" style="background:#ef4444;"></span> ML Service Offline';
      badge.title = 'Start Python ML service on port 8000';
    }
  } catch (e) {
    badge.innerHTML = '<span class="dot" style="background:#f59e0b;"></span> ML Service Checking...';
  }
}

function renderStatusChart(statusData) {
  const ctx = document.getElementById('statusChart');
  if (!ctx) return;

  const labels = statusData.map(d => d.label);
  const data = statusData.map(d => d.count);

  if (statusChart) statusChart.destroy();

  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data,
        backgroundColor: [
          '#d97706', // NEEDS_REVIEW
          '#16a34a', // APPROVED
          '#475569', // NEW
          '#0d9488', // RESOLVED
          '#dc2626', // REJECTED
          '#7c3aed', // ANALYZING
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 11 } } }
      }
    }
  });
}

function renderPriorityChart(priorityData) {
  const ctx = document.getElementById('priorityChart');
  if (!ctx) return;

  const labels = priorityData.map(d => d.label);
  const data = priorityData.map(d => d.count);

  if (priorityChart) priorityChart.destroy();

  priorityChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Tickets',
        data,
        backgroundColor: labels.map(l => {
          if (l === 'CRITICAL') return '#dc2626';
          if (l === 'HIGH') return '#ea580c';
          if (l === 'MEDIUM') return '#2563eb';
          return '#64748b';
        }),
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 } }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

async function loadPriorityQueue() {
  const container = document.getElementById('priority-queue-table-body');
  if (!container) return;

  try {
    const res = await window.api.getTickets({ limit: 5 });
    const tickets = res.data;
    container.innerHTML = '';

    if (tickets.length === 0) {
      container.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No pending tickets in queue</td></tr>';
      return;
    }

    tickets.forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(t.ticket_code)}</strong></td>
        <td>${escapeHtml(t.subject)}</td>
        <td><span class="badge badge-${(t.effective_priority || 'LOW').toLowerCase()}">${escapeHtml(t.effective_priority || 'LOW')}</span></td>
        <td><span class="badge badge-status-${escapeHtml(t.status)}">${escapeHtml(t.status)}</span></td>
        <td><button class="btn btn-secondary btn-sm" onclick="openTicketDetail(${t.id})">Inspect</button></td>
      `;
      container.appendChild(tr);
    });
  } catch (err) {
    console.error('Failed to load priority queue:', err);
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
