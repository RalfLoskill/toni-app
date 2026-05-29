/* ============================================================
   TONI – projects.js V2
   Projekt-Management: anlegen, anzeigen, Aufgaben, Kanban
   Komplett überarbeitet: bessere UI, Löschen, Avatare, Farben
   ============================================================ */

window.TONI_PROJECTS = [];
window.TONI_ACTIVE_PROJECT_ID = null;
window.TONI_PROJECT_TASKS = [];

// ══════════════════════════════════════
// HILFSFUNKTIONEN
// ══════════════════════════════════════
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('de-DE', { day:'2-digit', month:'2-digit', year:'numeric' });
}

function isOverdue(dateStr) {
  if (!dateStr) return false;
  return new Date(dateStr) < new Date();
}

function avatarHtml(member, size=28) {
  const colors = ['#B5D4F4','#9FE1CB','#FAC775','#CECBF6','#F5C4B3','#F4C0D1'];
  const textColors = ['#0C447C','#085041','#633806','#3C3489','#712B13','#72243E'];
  const ci = Math.abs((member.id||'').charCodeAt(0)||0) % colors.length;
  const initials = ((member.first_name||'')[0]||(member.display_name||'?')[0]).toUpperCase();
  if (member.avatar_url) {
    return `<img src="${member.avatar_url}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid var(--color-background-primary)" title="${escapeHtml(member.first_name||member.display_name||'')}">`;
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${colors[ci]};color:${textColors[ci]};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.4)}px;font-weight:500;border:2px solid var(--color-background-primary);flex-shrink:0" title="${escapeHtml(member.first_name||member.display_name||'')}">${initials}</div>`;
}

// ══════════════════════════════════════
// FARB-SYSTEM
// ══════════════════════════════════════
const MEMBER_PALETTES = [
  { bg: '#E6F1FB', border: '#85B7EB', text: '#0C447C' },  // Blau
  { bg: '#E1F5EE', border: '#5DCAA5', text: '#085041' },  // Teal
  { bg: '#FAEEDA', border: '#EF9F27', text: '#633806' },  // Amber
  { bg: '#EEEDFE', border: '#AFA9EC', text: '#3C3489' },  // Lila
  { bg: '#FBEAF0', border: '#ED93B1', text: '#72243E' },  // Pink
  { bg: '#FAECE7', border: '#F0997B', text: '#712B13' },  // Coral
  { bg: '#EAF3DE', border: '#97C459', text: '#27500A' },  // Grün
  { bg: '#F1EFE8', border: '#B4B2A9', text: '#444441' },  // Grau
];

const PROJECT_PALETTES = [
  { bg: '#E6F1FB', bar: '#378ADD', border: '#B5D4F4' },
  { bg: '#E1F5EE', bar: '#1D9E75', border: '#9FE1CB' },
  { bg: '#FAEEDA', bar: '#EF9F27', border: '#FAC775' },
  { bg: '#EEEDFE', bar: '#7F77DD', border: '#CECBF6' },
  { bg: '#FBEAF0', bar: '#D4537E', border: '#F4C0D1' },
  { bg: '#FAECE7', bar: '#D85A30', border: '#F5C4B3' },
];

function getMemberPalette(memberId) {
  const idx = Math.abs((memberId||'').split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % MEMBER_PALETTES.length;
  return MEMBER_PALETTES[idx];
}

function getProjectPalette(projectId) {
  const idx = Math.abs((projectId||'').split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % PROJECT_PALETTES.length;
  return PROJECT_PALETTES[idx];
}

async function getToken() {
  return typeof toniV27GetAccessToken === 'function' ? await toniV27GetAccessToken() : null;
}

// ══════════════════════════════════════
// PROJEKTE LADEN
// ══════════════════════════════════════
async function loadProjects() {
  try {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/get_my_projects`, {
      method: 'POST',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    window.TONI_PROJECTS = Array.isArray(data) ? data : [];
    renderProjectsDashboard();
  } catch (e) { console.warn('TONI Projekte laden:', e); }
}

// ══════════════════════════════════════
// DASHBOARD RENDERN
// ══════════════════════════════════════
function renderProjectsDashboard() {
  const wrap = document.getElementById('toni-projects-list');
  if (!wrap) return;
  const projects = window.TONI_PROJECTS;

  if (!projects.length) {
    wrap.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:14px 0;text-align:center">
      Noch keine Projekte vorhanden.<br>
      <span style="color:#185FA5;cursor:pointer;font-size:13px" onclick="openCreateProjectModal()">+ Erstes Projekt anlegen</span>
    </div>`;
    return;
  }

  wrap.innerHTML = projects.map(p => {
    const pct = p.task_total > 0 ? Math.round((p.task_done / p.task_total) * 100) : 0;
    const pal = getProjectPalette(p.id);
    const members = (p.members || []).slice(0, 5);
    const extra = (p.member_count||0) > 5 ? `<span style="font-size:11px;color:${pal.text};opacity:.7;margin-left:2px">+${p.member_count-5}</span>` : '';
    const avatars = members.map(m => avatarHtml(m, 24)).join('');

    const badges = [
      p.is_official ? `<span style="font-size:10px;background:rgba(255,255,255,.6);color:${pal.text};padding:1px 6px;border-radius:10px;border:0.5px solid ${pal.border}">Offiziell</span>` : '',
      p.has_blocker ? `<span style="font-size:10px;background:rgba(255,255,255,.6);color:#854F0B;padding:1px 6px;border-radius:10px;border:0.5px solid #FAC775">⚠ Blocker</span>` : '',
      p.type==='group' ? `<span style="font-size:10px;background:rgba(255,255,255,.6);color:${pal.text};padding:1px 6px;border-radius:10px;border:0.5px solid ${pal.border}">Gruppe</span>` : '',
    ].filter(Boolean).join(' ');

    const overdue = p.deadline && isOverdue(p.deadline) && p.status !== 'completed';
    const deadlineHtml = p.deadline
      ? `<span style="font-size:11px;color:${overdue?'#A32D2D':pal.text};opacity:${overdue?1:.8}">📅 ${formatDate(p.deadline)}${overdue?' · überfällig':''}</span>`
      : '';

    return `<div onclick="openProjectModal('${p.id}')" style="cursor:pointer;background:${pal.bg};border:0.5px solid ${pal.border};border-radius:10px;padding:10px 12px;margin-bottom:8px;transition:opacity .15s"
      onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:3px">
        <div style="font-size:14px;font-weight:500;color:${pal.text};line-height:1.3">${escapeHtml(p.title)}</div>
        <div style="font-size:13px;font-weight:500;color:${pal.bar};white-space:nowrap;flex-shrink:0">${pct}%</div>
      </div>
      ${p.description ? `<div style="font-size:12px;color:${pal.text};opacity:.75;margin-bottom:5px;line-height:1.4">${escapeHtml(p.description)}</div>` : ''}
      <div style="height:4px;background:rgba(255,255,255,.5);border-radius:2px;margin:5px 0">
        <div style="height:4px;width:${pct}%;background:${pal.bar};border-radius:2px;transition:width .3s"></div>
      </div>
      <div style="display:flex;align-items:center;gap:6px;margin-top:6px;flex-wrap:wrap">
        <div style="display:flex;gap:2px">${avatars}${extra}</div>
        ${deadlineHtml}
        <div style="margin-left:auto;display:flex;gap:4px">${badges}</div>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════
// PROJEKT-MODAL
// ══════════════════════════════════════
function openProjectModal(projectId) {
  const p = window.TONI_PROJECTS.find(x => x.id === projectId);
  if (!p) return;
  window.TONI_ACTIVE_PROJECT_ID = projectId;

  const pct = p.task_total > 0 ? Math.round((p.task_done / p.task_total) * 100) : 0;
  const barColor = pct >= 80 ? '#639922' : pct >= 40 ? '#EF9F27' : '#378ADD';

  document.getElementById('project-modal-title').textContent = p.title;

  // Header mit Fortschritt + Mitglieder
  const members = p.members || [];
  const avatarsHtml = members.map(m => avatarHtml(m, 28)).join('');
  const inviteCode = p.invite_code ? `<span style="font-size:11px;background:var(--color-background-secondary);padding:2px 8px;border-radius:8px;font-family:monospace;cursor:pointer" onclick="copyInviteCode('${p.invite_code}')" title="Kopieren">🔗 ${p.invite_code}</span>` : '';
  const deadlineHtml = p.deadline ? `<span style="font-size:12px;color:${isOverdue(p.deadline)?'#A32D2D':'var(--color-text-secondary)'}">📅 ${formatDate(p.deadline)}</span>` : '';

  document.getElementById('project-modal-sub').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px">
      <span style="font-size:12px;color:var(--color-text-secondary)">${p.type==='group'?'Gruppenarbeit':'Solo-Projekt'}</span>
      ${deadlineHtml}
      ${inviteCode}
      <div style="margin-left:auto;display:flex;gap:2px">${avatarsHtml}</div>
    </div>
    <div style="margin-top:8px">
      <div style="display:flex;justify-content:space-between;font-size:12px;color:var(--color-text-secondary);margin-bottom:3px">
        <span>${p.task_done||0} von ${p.task_total||0} Aufgaben erledigt</span>
        <span style="color:${barColor};font-weight:500">${pct}%</span>
      </div>
      <div style="height:5px;background:var(--color-border-tertiary);border-radius:3px">
        <div style="height:5px;width:${pct}%;background:${barColor};border-radius:3px;transition:width .4s"></div>
      </div>
    </div>`;

  loadProjectTasks(projectId);
  document.getElementById('project-modal').classList.add('open');
}

function closeProjectModal() {
  document.getElementById('project-modal').classList.remove('open');
  window.TONI_ACTIVE_PROJECT_ID = null;
  window.TONI_PROJECT_TASKS = [];
}

function copyInviteCode(code) {
  navigator.clipboard?.writeText(code).then(() => {
    alert(`Code "${code}" wurde kopiert!`);
  }).catch(() => prompt('Einladungscode:', code));
}

// ══════════════════════════════════════
// AUFGABEN LADEN
// ══════════════════════════════════════
async function loadProjectTasks(projectId) {
  const kanban = document.getElementById('project-kanban');
  if (kanban) kanban.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:20px">Aufgaben werden geladen…</div>`;
  try {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/project_tasks?project_id=eq.${projectId}&order=position.asc,created_at.asc&select=*,assigned_profile:profiles!project_tasks_assigned_to_fkey(id,display_name,first_name,avatar_url)`,
      { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token } }
    );
    if (!res.ok) throw new Error(await res.text());
    const tasks = await res.json();
    window.TONI_PROJECT_TASKS = tasks;
    renderProjectKanban(tasks);
  } catch (e) {
    console.warn('TONI Aufgaben laden:', e);
    if (kanban) kanban.innerHTML = `<div style="color:#A32D2D;font-size:13px;padding:20px">Fehler beim Laden: ${escapeHtml(e.message)}</div>`;
  }
}

// ══════════════════════════════════════
// KANBAN RENDERN
// ══════════════════════════════════════
function renderProjectKanban(tasks) {
  const cols = { todo: [], in_progress: [], review: [], done: [] };
  tasks.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });

  const colConfig = {
    todo:        { label: 'Offen',     color: '#378ADD', bg: '#E6F1FB' },
    in_progress: { label: 'In Arbeit', color: '#EF9F27', bg: '#FAEEDA' },
    review:      { label: 'Review',    color: '#7F77DD', bg: '#EEEDFE' },
    done:        { label: 'Erledigt',  color: '#639922', bg: '#EAF3DE' },
  };

  const wrap = document.getElementById('project-kanban');
  if (!wrap) return;

  wrap.innerHTML = Object.entries(cols).map(([col, colTasks]) => {
    const cfg = colConfig[col];
    return `<div style="flex:1;min-width:150px;max-width:260px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;padding:4px 8px;background:${cfg.bg};border-radius:8px">
        <span style="width:8px;height:8px;border-radius:50%;background:${cfg.color};display:inline-block;flex-shrink:0"></span>
        <span style="font-size:11px;font-weight:500;color:${cfg.color};text-transform:uppercase;letter-spacing:.06em;flex:1">${cfg.label}</span>
        <span style="font-size:11px;font-weight:500;color:${cfg.color}">${colTasks.length}</span>
      </div>
      <div id="pkol-${col}" style="min-height:80px">
        ${colTasks.map(t => renderTaskCard(t, col)).join('')}
      </div>
      <button onclick="openAddTaskModal('${col}')"
        style="width:100%;margin-top:6px;padding:7px 8px;font-size:12px;color:var(--color-text-tertiary);border:0.5px dashed var(--color-border-secondary);border-radius:8px;background:none;cursor:pointer;text-align:left;transition:background .15s"
        onmouseover="this.style.background='var(--color-background-secondary)'"
        onmouseout="this.style.background='none'">
        + Aufgabe
      </button>
    </div>`;
  }).join('');
}

function renderTaskCard(task, col) {
  const profile = task.assigned_profile;
  const nextCol = { todo: 'in_progress', in_progress: 'review', review: 'done', done: 'todo' };
  const nextLabel = { todo: 'Starten', in_progress: 'Review', review: 'Erledigt', done: 'Zurück' };

  // Karteikarte bekommt die Farbe des zugewiesenen Mitglieds
  const pal = profile ? getMemberPalette(profile.id) : { bg: 'var(--color-background-primary)', border: 'var(--color-border-tertiary)', text: 'var(--color-text-primary)' };

  const dueColor = task.due_date && isOverdue(task.due_date) && col !== 'done' ? '#A32D2D' : pal.text;
  const dueHtml = task.due_date
    ? `<div style="font-size:11px;color:${dueColor};margin-top:3px;opacity:.8">${isOverdue(task.due_date)&&col!=='done'?'⚠ ':''}${formatDate(task.due_date)}</div>`
    : '';
  const blockerHtml = task.blocker
    ? `<div style="font-size:11px;color:#993C1D;background:rgba(255,255,255,.6);padding:3px 7px;border-radius:6px;margin-top:5px;line-height:1.3;border:0.5px solid #F0997B">⚠️ ${escapeHtml(task.blocker)}</div>`
    : '';
  const doneStyle = col === 'done' ? 'text-decoration:line-through;opacity:.6' : '';

  const assigneeHtml = profile
    ? `<div style="display:flex;align-items:center;gap:4px;margin-top:4px">${avatarHtml(profile,18)}<span style="font-size:11px;color:${pal.text};opacity:.8">${escapeHtml(profile.first_name||profile.display_name||'')}</span></div>`
    : '';

  return `<div style="background:${pal.bg};border:0.5px solid ${pal.border};border-radius:8px;padding:9px 10px;margin-bottom:6px;cursor:pointer;transition:opacity .15s"
    onclick="openTaskDetail('${task.id}')"
    onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
    <div style="font-size:13px;font-weight:500;color:${pal.text};line-height:1.3;${doneStyle}">${escapeHtml(task.title)}</div>
    ${assigneeHtml}${dueHtml}${blockerHtml}
    <button onclick="event.stopPropagation();moveProjectTask('${task.id}','${nextCol[col]}')"
      style="margin-top:7px;font-size:11px;padding:3px 9px;border:0.5px solid ${pal.border};border-radius:10px;background:rgba(255,255,255,.5);cursor:pointer;color:${pal.text};font-weight:500">
      ${nextLabel[col]} →
    </button>
  </div>`;
}

// ══════════════════════════════════════
// AUFGABE VERSCHIEBEN
// ══════════════════════════════════════
async function moveProjectTask(taskId, newStatus) {
  try {
    const token = await getToken();
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/project_tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() })
    });
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
  } catch (e) { console.warn('TONI Aufgabe verschieben:', e); }
}

// ══════════════════════════════════════
// AUFGABE DETAIL & BEARBEITEN
// ══════════════════════════════════════
async function openTaskDetail(taskId) {
  try {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/project_tasks?id=eq.${taskId}&select=*`,
      { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token } }
    );
    const [task] = await res.json();
    if (!task) return;

    // Mitglieder für Zuweisung laden
    const p = window.TONI_PROJECTS.find(x => x.id === task.project_id);
    const members = p?.members || [];
    const assignSel = document.getElementById('task-detail-assigned');
    if (assignSel) {
      assignSel.innerHTML = '<option value="">Niemand zugewiesen</option>' +
        members.map(m => `<option value="${m.id}" ${m.id===task.assigned_to?'selected':''}>${escapeHtml(m.first_name||m.display_name)}</option>`).join('');
    }

    document.getElementById('task-detail-title').value = task.title;
    document.getElementById('task-detail-desc').value = task.description || '';
    document.getElementById('task-detail-blocker').value = task.blocker || '';
    document.getElementById('task-detail-due').value = task.due_date || '';
    document.getElementById('task-detail-id').value = taskId;
    document.getElementById('task-detail-modal').classList.add('open');
    setTimeout(() => document.getElementById('task-detail-title').focus(), 100);
  } catch (e) { console.warn('TONI Aufgabe öffnen:', e); }
}

function closeTaskDetailModal() {
  document.getElementById('task-detail-modal').classList.remove('open');
}

async function saveTaskDetail() {
  const taskId = document.getElementById('task-detail-id').value;
  const title = document.getElementById('task-detail-title').value.trim();
  const description = document.getElementById('task-detail-desc').value.trim();
  const blocker = document.getElementById('task-detail-blocker').value.trim();
  const due_date = document.getElementById('task-detail-due').value || null;
  const assigned_to = document.getElementById('task-detail-assigned')?.value || null;
  if (!title) return;
  try {
    const token = await getToken();
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/project_tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, blocker: blocker||null, due_date, assigned_to: assigned_to||null, updated_at: new Date().toISOString() })
    });
    closeTaskDetailModal();
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
  } catch (e) { console.warn('TONI Aufgabe speichern:', e); }
}

async function deleteTask() {
  const taskId = document.getElementById('task-detail-id').value;
  if (!taskId || !confirm('Aufgabe wirklich löschen?')) return;
  try {
    const token = await getToken();
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/project_tasks?id=eq.${taskId}`, {
      method: 'DELETE',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token }
    });
    closeTaskDetailModal();
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
  } catch (e) { console.warn('TONI Aufgabe löschen:', e); }
}

// ══════════════════════════════════════
// AUFGABE HINZUFÜGEN
// ══════════════════════════════════════
function openAddTaskModal(col) {
  const projectId = window.TONI_ACTIVE_PROJECT_ID;
  const project = window.TONI_PROJECTS.find(p => p.id === projectId);
  const members = project?.members || [];

  document.getElementById('add-task-col').value = col;
  document.getElementById('add-task-title').value = '';
  document.getElementById('add-task-due-date').value = '';

  const sel = document.getElementById('add-task-assigned');
  if (sel) sel.innerHTML = '<option value="">Niemand zugewiesen</option>' +
    members.map(m => `<option value="${m.id}">${escapeHtml(m.first_name||m.display_name)}</option>`).join('');

  document.getElementById('add-task-modal').classList.add('open');
  setTimeout(() => document.getElementById('add-task-title').focus(), 100);
}

function closeAddTaskModal() {
  document.getElementById('add-task-modal').classList.remove('open');
}

async function saveNewTask() {
  const title = document.getElementById('add-task-title').value.trim();
  const col = document.getElementById('add-task-col').value;
  const due_date = document.getElementById('add-task-due-date').value || null;
  const assigned_to = document.getElementById('add-task-assigned')?.value || null;
  const projectId = window.TONI_ACTIVE_PROJECT_ID;
  if (!title || !projectId) return;
  try {
    const token = await getToken();
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/project_tasks`, {
      method: 'POST',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ project_id: projectId, title, status: col, due_date, assigned_to: assigned_to||null, created_by: window.TONI_AUTH_PROFILE?.id })
    });
    closeAddTaskModal();
    loadProjectTasks(projectId);
    loadProjects();
  } catch (e) { console.warn('TONI Aufgabe anlegen:', e); }
}

// ══════════════════════════════════════
// PROJEKT ANLEGEN
// ══════════════════════════════════════
function openCreateProjectModal() {
  document.getElementById('new-project-title').value = '';
  document.getElementById('new-project-desc').value = '';
  document.getElementById('new-project-deadline').value = '';
  document.getElementById('new-project-type').value = 'solo';
  document.getElementById('create-project-modal').classList.add('open');
  setTimeout(() => document.getElementById('new-project-title').focus(), 100);
}

function closeCreateProjectModal() {
  document.getElementById('create-project-modal').classList.remove('open');
}

async function saveNewProject() {
  const title = document.getElementById('new-project-title').value.trim();
  const description = document.getElementById('new-project-desc').value.trim();
  const deadline = document.getElementById('new-project-deadline').value || null;
  const type = document.getElementById('new-project-type').value;
  if (!title) { alert('Bitte einen Projekttitel eingeben.'); return; }
  const role = window.TONI_AUTH_PROFILE?.role || localStorage.getItem('toni_role') || 'student';
  const is_official = ['tutor','admin','superadmin'].includes(role);
  try {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/create_project`, {
      method: 'POST',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_title: title, p_description: description, p_type: type, p_deadline: deadline, p_is_official: is_official })
    });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    closeCreateProjectModal();
    await loadProjects();
    if (type === 'group' && result.invite_code) {
      setTimeout(() => alert(`Projekt angelegt!\n\nEinladungscode für deine Gruppe:\n\n${result.invite_code}\n\nMitschüler können mit diesem Code beitreten.`), 300);
    }
  } catch (e) {
    console.warn('TONI Projekt anlegen:', e);
    alert('Fehler: ' + e.message);
  }
}

// ══════════════════════════════════════
// PROJEKT LÖSCHEN
// ══════════════════════════════════════
async function deleteProject() {
  const projectId = window.TONI_ACTIVE_PROJECT_ID;
  if (!projectId || !confirm('Projekt wirklich löschen? Alle Aufgaben werden ebenfalls gelöscht.')) return;
  try {
    const token = await getToken();
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/projects?id=eq.${projectId}`, {
      method: 'DELETE',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token }
    });
    closeProjectModal();
    loadProjects();
  } catch (e) {
    console.warn('TONI Projekt löschen:', e);
    alert('Fehler beim Löschen: ' + e.message);
  }
}

// ══════════════════════════════════════
// PROJEKT BEITRETEN
// ══════════════════════════════════════
function openJoinProjectModal() {
  document.getElementById('join-code-input').value = '';
  document.getElementById('join-project-modal').classList.add('open');
  setTimeout(() => document.getElementById('join-code-input').focus(), 100);
}

function closeJoinProjectModal() {
  document.getElementById('join-project-modal').classList.remove('open');
}

async function joinProject() {
  const code = document.getElementById('join-code-input').value.trim();
  if (!code) return;
  try {
    const token = await getToken();
    if (!token) return;
    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/join_project`, {
      method: 'POST',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_invite_code: code })
    });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    closeJoinProjectModal();
    await loadProjects();
    alert(`Du bist dem Projekt "${result.title}" beigetreten!`);
  } catch (e) {
    alert('Beitreten fehlgeschlagen: ' + (e.message.includes('Ungültiger') ? 'Ungültiger Einladungscode.' : e.message));
  }
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeProjectModal(); closeCreateProjectModal();
      closeAddTaskModal(); closeTaskDetailModal(); closeJoinProjectModal();
    }
  });
  const addIn = document.getElementById('add-task-title');
  if (addIn) addIn.addEventListener('keydown', e => { if (e.key==='Enter') saveNewTask(); });
  const joinIn = document.getElementById('join-code-input');
  if (joinIn) joinIn.addEventListener('keydown', e => { if (e.key==='Enter') joinProject(); });
});

// Projekte laden – zuverlässig nach Login
(function waitForAuth() {
  let loaded = false;
  function tryLoad() {
    if (loaded) return;
    if (window.TONI_AUTH_PROFILE?.id) { loaded = true; loadProjects(); }
  }
  tryLoad();
  function hookSupabase() {
    const client = window._supabaseClient || window.supabase;
    if (client?.auth?.onAuthStateChange) {
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) setTimeout(tryLoad, 800);
        if (event === 'SIGNED_OUT') { loaded = false; window.TONI_PROJECTS = []; renderProjectsDashboard(); }
      });
      return true;
    }
    return false;
  }
  const origApply = window.applyAuthProfile;
  window.applyAuthProfile = function(profile) {
    if (typeof origApply === 'function') origApply(profile);
    if (profile?.id) { loaded = false; setTimeout(tryLoad, 300); }
  };
  let tries = 0;
  const poll = setInterval(() => {
    tries++;
    hookSupabase();
    tryLoad();
    if (loaded || tries > 40) clearInterval(poll);
  }, 500);
})();
