/* ==========================================================
   GAUGE — Maintenance Control
   All data lives in localStorage, so nothing needs a server.
   Machines are numbered 1..MACHINE_COUNT.
   ========================================================== */

const MACHINE_COUNT = 500;
const STORAGE_MACHINES = 'gauge_machines_v1';
const STORAGE_REPORTS  = 'gauge_reports_v1';
const STORAGE_TECH      = 'gauge_active_tech_v1';

const ZONES = ['Zone A', 'Zone B', 'Zone C', 'Zone D', 'Zone E'];
const CATEGORIES = ['CNC lathe', 'Conveyor unit', 'Hydraulic press', 'Compressor', 'Packaging line', 'Welding cell', 'Generator', 'Pump station'];

const STATUS = {
  OP: 'Operational',
  MAINT: 'Under maintenance',
  FAULT: 'Faulty'
};

/* ---------------------------------------------------------
   State
   --------------------------------------------------------- */
let machines = [];   // [{id, zone, category}]
let reports  = [];   // [{id, machineId, date, type, technician, description, parts, downtime, status, createdAt}]
let currentView = 'dashboard';
let currentMachineId = null;
let machineStatusFilter = 'all';
let reportsTypeFilter = 'all';

/* ---------------------------------------------------------
   Bootstrapping / persistence
   --------------------------------------------------------- */
function loadOrSeed(){
  const savedMachines = localStorage.getItem(STORAGE_MACHINES);
  const savedReports  = localStorage.getItem(STORAGE_REPORTS);

  if (savedMachines){
    machines = JSON.parse(savedMachines);
  } else {
    machines = [];
    for (let i = 1; i <= MACHINE_COUNT; i++){
      machines.push({
        id: i,
        zone: ZONES[i % ZONES.length],
        category: CATEGORIES[i % CATEGORIES.length]
      });
    }
    saveMachines();
  }

  if (savedReports){
    reports = JSON.parse(savedReports);
  } else {
    reports = seedSampleReports();
    saveReports();
  }
}

function seedSampleReports(){
  const today = new Date();
  const daysAgo = n => {
    const d = new Date(today);
    d.setDate(d.getDate() - n);
    return d.toISOString().slice(0, 10);
  };
  return [
    { id: cryptoId(), machineId: 12, date: daysAgo(2),  type: 'Oil renewal',       technician: 'R. Haddad', description: 'Routine gearbox oil change, filter replaced.', parts: 'Gear oil 2L, oil filter F-12', downtime: 1,   status: STATUS.OP,    createdAt: Date.now()-2 },
    { id: cryptoId(), machineId: 47, date: daysAgo(1),  type: 'Electrical work',   technician: 'S. Khalil', description: 'Replaced tripped contactor on main motor circuit.', parts: 'Contactor CT-40', downtime: 3, status: STATUS.OP,    createdAt: Date.now()-1 },
    { id: cryptoId(), machineId: 47, date: daysAgo(30), type: 'Inspection',        technician: 'S. Khalil', description: 'Quarterly electrical safety inspection, no faults found.', parts: '', downtime: 0, status: STATUS.OP, createdAt: Date.now()-40 },
    { id: cryptoId(), machineId: 203,date: daysAgo(0),  type: 'Repair',            technician: 'M. Aoun',   description: 'Bearing failure on drive shaft, unit stopped pending part delivery.', parts: 'Bearing 6205-2RS (on order)', downtime: 0, status: STATUS.FAULT, createdAt: Date.now() },
    { id: cryptoId(), machineId: 88, date: daysAgo(5),  type: 'Part replacement',  technician: 'R. Haddad', description: 'Worn conveyor belt swapped, tensioner realigned.', parts: 'Belt B-42', downtime: 2, status: STATUS.OP, createdAt: Date.now()-5 },
    { id: cryptoId(), machineId: 310,date: daysAgo(0),  type: 'Repair',            technician: 'M. Aoun',   description: 'Hydraulic leak found at cylinder seal, unit taken offline for teardown.', parts: 'Seal kit HP-9', downtime: 6, status: STATUS.MAINT, createdAt: Date.now() },
    { id: cryptoId(), machineId: 5,  date: daysAgo(14), type: 'Inspection',        technician: 'S. Khalil', description: 'Monthly compressor pressure and vibration check, within tolerance.', parts: '', downtime: 0, status: STATUS.OP, createdAt: Date.now()-14 }
  ];
}

function saveMachines(){ localStorage.setItem(STORAGE_MACHINES, JSON.stringify(machines)); }
function saveReports(){ localStorage.setItem(STORAGE_REPORTS, JSON.stringify(reports)); }
function cryptoId(){ return 'r_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36); }

/* ---------------------------------------------------------
   Derived data helpers
   --------------------------------------------------------- */
function getMachine(id){ return machines.find(m => m.id === id); }

function getHistory(id){
  return reports
    .filter(r => r.machineId === id)
    .sort((a, b) => (b.date + b.createdAt) > (a.date + a.createdAt) ? 1 : -1);
}

function getStatus(id){
  const h = getHistory(id);
  return h.length ? h[0].status : STATUS.OP;
}

function getLastServiceDate(id){
  const h = getHistory(id);
  return h.length ? h[0].date : null;
}

function statusClass(status){
  if (status === STATUS.OP) return 'st-op';
  if (status === STATUS.MAINT) return 'st-maint';
  return 'st-fault';
}

function formatDate(iso){
  if (!iso) return '—';
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ---------------------------------------------------------
   View switching
   --------------------------------------------------------- */
function showView(view){
  currentView = view;
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  document.getElementById('view-' + view).hidden = false;
  document.querySelectorAll('.nav-link').forEach(btn => {
    btn.classList.toggle('is-active', btn.dataset.view === view);
  });

  if (view === 'dashboard') renderDashboard();
  if (view === 'machines') renderMachineGrid();
  if (view === 'reports') renderReportsTable();
}

function openMachineDetail(id){
  currentMachineId = id;
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  document.getElementById('view-detail').hidden = false;
  document.querySelectorAll('.nav-link').forEach(btn => btn.classList.remove('is-active'));
  renderDetail(id);
}

/* ---------------------------------------------------------
   Render: Dashboard
   --------------------------------------------------------- */
function renderDashboard(){
  const total = machines.length;
  let op = 0, maint = 0, fault = 0;
  machines.forEach(m => {
    const s = getStatus(m.id);
    if (s === STATUS.OP) op++;
    else if (s === STATUS.MAINT) maint++;
    else fault++;
  });

  document.getElementById('stat-row').innerHTML = `
    <div class="stat-card">
      <span class="stat-num">${total}</span>
      <span class="stat-label">Total units</span>
    </div>
    <div class="stat-card accent-good">
      <span class="stat-num">${op}</span>
      <span class="stat-label">Operational</span>
    </div>
    <div class="stat-card accent-warn">
      <span class="stat-num">${maint}</span>
      <span class="stat-label">Under maintenance</span>
    </div>
    <div class="stat-card accent-bad">
      <span class="stat-num">${fault}</span>
      <span class="stat-label">Faulty</span>
    </div>`;

  // Attention needed
  const attention = machines
    .filter(m => getStatus(m.id) !== STATUS.OP)
    .sort((a, b) => a.id - b.id)
    .slice(0, 8);

  const attnEl = document.getElementById('attention-list');
  if (!attention.length){
    attnEl.innerHTML = `<p class="empty-note">Every unit is operational right now.</p>`;
  } else {
    attnEl.innerHTML = attention.map(m => {
      const s = getStatus(m.id);
      return `
        <div class="attention-row" data-id="${m.id}">
          <span class="row-id">#${m.id}</span>
          <div class="row-main">
            <div class="row-title">${getMachine(m.id).category}</div>
            <div class="row-sub">${getMachine(m.id).zone}</div>
          </div>
          <span class="status-pill ${statusClass(s)}">${s}</span>
        </div>`;
    }).join('');
    attnEl.querySelectorAll('.attention-row').forEach(row => {
      row.addEventListener('click', () => openMachineDetail(Number(row.dataset.id)));
    });
  }

  // Recent reports
  const recent = [...reports]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 8);

  const recentEl = document.getElementById('recent-list');
  if (!recent.length){
    recentEl.innerHTML = `<p class="empty-note">No reports filed yet.</p>`;
  } else {
    recentEl.innerHTML = recent.map(r => `
      <div class="recent-row" data-id="${r.machineId}">
        <span class="row-id">#${r.machineId}</span>
        <div class="row-main">
          <div class="row-title">${r.type}</div>
          <div class="row-sub">${r.technician} · ${formatDate(r.date)}</div>
        </div>
      </div>`).join('');
    recentEl.querySelectorAll('.recent-row').forEach(row => {
      row.addEventListener('click', () => openMachineDetail(Number(row.dataset.id)));
    });
  }
}

/* ---------------------------------------------------------
   Render: Machines grid
   --------------------------------------------------------- */
function renderMachineGrid(){
  const search = document.getElementById('machine-search').value.trim();
  const grid = document.getElementById('machine-grid');

  const filtered = machines.filter(m => {
    if (search && !String(m.id).startsWith(search)) return false;
    if (machineStatusFilter !== 'all' && getStatus(m.id) !== machineStatusFilter) return false;
    return true;
  });

  if (!filtered.length){
    grid.innerHTML = `<p class="empty-note">No units match that search.</p>`;
    return;
  }

  grid.innerHTML = filtered.map(m => {
    const s = getStatus(m.id);
    return `<button class="machine-tile ${statusClass(s)}" data-id="${m.id}" title="Unit #${m.id} · ${s}">${m.id}</button>`;
  }).join('');

  grid.querySelectorAll('.machine-tile').forEach(tile => {
    tile.addEventListener('click', () => openMachineDetail(Number(tile.dataset.id)));
  });
}

/* ---------------------------------------------------------
   Render: Machine detail
   --------------------------------------------------------- */
function renderDetail(id){
  const m = getMachine(id);
  const status = getStatus(id);
  const history = getHistory(id);

  document.getElementById('detail-id').textContent = '#' + String(id).padStart(3, '0');
  const pill = document.getElementById('detail-status');
  pill.textContent = status;
  pill.className = 'status-pill ' + statusClass(status);
  document.getElementById('detail-zone').textContent = m.zone;
  document.getElementById('detail-category').textContent = m.category;
  document.getElementById('detail-last').textContent = formatDate(getLastServiceDate(id));

  const timeline = document.getElementById('history-timeline');
  if (!history.length){
    timeline.innerHTML = `<p class="empty-note" style="padding-left:0">No reports have been filed for this unit yet. File the first one above.</p>`;
    return;
  }

  timeline.innerHTML = history.map(r => `
    <div class="history-entry type-${r.type.replace(/\s+/g, '-')}">
      <div class="he-top">
        <span class="he-date">${formatDate(r.date)}</span>
        <span class="he-type">${r.type}</span>
        <span class="status-pill ${statusClass(r.status)}">${r.status}</span>
      </div>
      <p class="he-desc">${escapeHtml(r.description)}</p>
      <div class="he-foot">
        <span><b>Technician</b> ${escapeHtml(r.technician)}</span>
        ${r.parts ? `<span><b>Parts</b> ${escapeHtml(r.parts)}</span>` : ''}
        ${r.downtime ? `<span><b>Downtime</b> ${r.downtime}h</span>` : ''}
      </div>
    </div>`).join('');
}

/* ---------------------------------------------------------
   Render: Reports log
   --------------------------------------------------------- */
function renderReportsTable(){
  const search = document.getElementById('reports-search').value.trim().toLowerCase();
  const tbody = document.getElementById('reports-tbody');
  const emptyNote = document.getElementById('reports-empty');

  const filtered = [...reports]
    .filter(r => {
      if (reportsTypeFilter !== 'all' && r.type !== reportsTypeFilter) return false;
      if (search){
        const hay = `${r.machineId} ${r.technician} ${r.description} ${r.parts}`.toLowerCase();
        if (!hay.includes(search)) return false;
      }
      return true;
    })
    .sort((a, b) => b.createdAt - a.createdAt);

  if (!filtered.length){
    tbody.innerHTML = '';
    emptyNote.hidden = false;
    return;
  }
  emptyNote.hidden = true;

  tbody.innerHTML = filtered.map(r => `
    <tr>
      <td class="cell-date">${formatDate(r.date)}</td>
      <td class="cell-unit" data-id="${r.machineId}">#${r.machineId}</td>
      <td>${r.type}</td>
      <td>${escapeHtml(r.technician)}</td>
      <td class="cell-desc">${escapeHtml(r.description)}</td>
      <td><span class="status-pill ${statusClass(r.status)}">${r.status}</span></td>
    </tr>`).join('');

  tbody.querySelectorAll('.cell-unit').forEach(cell => {
    cell.addEventListener('click', () => openMachineDetail(Number(cell.dataset.id)));
  });
}

/* ---------------------------------------------------------
   Utility
   --------------------------------------------------------- */
function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
function showToast(msg){
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2600);
}

/* ---------------------------------------------------------
   Report modal
   --------------------------------------------------------- */
const backdrop   = document.getElementById('modal-backdrop');
const reportForm = document.getElementById('report-form');

function openReportModal(presetMachineId){
  document.getElementById('f-date').value = new Date().toISOString().slice(0, 10);
  const techSaved = localStorage.getItem(STORAGE_TECH);
  if (techSaved) document.getElementById('f-tech').value = techSaved;
  document.getElementById('f-machine').value = presetMachineId || '';
  backdrop.hidden = false;
  (presetMachineId ? document.getElementById('f-type') : document.getElementById('f-machine')).focus();
}
function closeReportModal(){
  backdrop.hidden = true;
  reportForm.reset();
}

document.getElementById('btn-new-report-global').addEventListener('click', () => openReportModal());
document.getElementById('btn-new-report-detail').addEventListener('click', () => openReportModal(currentMachineId));
document.getElementById('modal-close').addEventListener('click', closeReportModal);
document.getElementById('btn-cancel-report').addEventListener('click', closeReportModal);
backdrop.addEventListener('click', (e) => { if (e.target === backdrop) closeReportModal(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !backdrop.hidden) closeReportModal(); });

reportForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const machineId = Number(document.getElementById('f-machine').value);
  if (machineId < 1 || machineId > MACHINE_COUNT){
    showToast(`Unit number must be between 1 and ${MACHINE_COUNT}.`);
    return;
  }
  const report = {
    id: cryptoId(),
    machineId,
    date: document.getElementById('f-date').value,
    type: document.getElementById('f-type').value,
    technician: document.getElementById('f-tech').value.trim(),
    description: document.getElementById('f-desc').value.trim(),
    parts: document.getElementById('f-parts').value.trim(),
    downtime: Number(document.getElementById('f-downtime').value) || 0,
    status: document.getElementById('f-status').value,
    createdAt: Date.now()
  };
  reports.push(report);
  saveReports();
  localStorage.setItem(STORAGE_TECH, report.technician);

  closeReportModal();
  showToast(`Report filed for unit #${machineId}.`);

  // Refresh whichever view is visible
  if (!document.getElementById('view-detail').hidden && currentMachineId === machineId){
    renderDetail(machineId);
  }
  if (currentView === 'dashboard') renderDashboard();
  if (currentView === 'machines') renderMachineGrid();
  if (currentView === 'reports') renderReportsTable();
});

/* ---------------------------------------------------------
   Nav + filters wiring
   --------------------------------------------------------- */
document.querySelectorAll('.nav-link').forEach(btn => {
  btn.addEventListener('click', () => showView(btn.dataset.view));
});
document.getElementById('btn-back-machines').addEventListener('click', () => showView('machines'));

document.getElementById('machine-search').addEventListener('input', renderMachineGrid);

document.getElementById('status-filter').addEventListener('click', (e) => {
  const btn = e.target.closest('.seg-btn');
  if (!btn) return;
  document.querySelectorAll('#status-filter .seg-btn').forEach(b => b.classList.remove('is-active'));
  btn.classList.add('is-active');
  machineStatusFilter = btn.dataset.status;
  renderMachineGrid();
});

document.getElementById('reports-search').addEventListener('input', renderReportsTable);
document.getElementById('reports-type-filter').addEventListener('change', (e) => {
  reportsTypeFilter = e.target.value;
  renderReportsTable();
});

/* Active technician name persists across sessions */
const activeTechInput = document.getElementById('active-tech');
activeTechInput.value = localStorage.getItem(STORAGE_TECH) || '';
activeTechInput.addEventListener('change', () => {
  localStorage.setItem(STORAGE_TECH, activeTechInput.value.trim());
});

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */
loadOrSeed();
showView('dashboard');
