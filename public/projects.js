/* ============================================================
   TONI – projects.js
   Projekt-Management: anlegen, anzeigen, Aufgaben, Kanban
   ============================================================ */

// ══════════════════════════════════════
// STATE
// ══════════════════════════════════════
window.TONI_PROJECTS = [];
window.TONI_ACTIVE_PROJECT_ID = null;

// ══════════════════════════════════════
// LADEN
// ══════════════════════════════════════
async function loadProjects() {
  try {
    const token = typeof toniV27GetAccessToken === 'function' ? await toniV27GetAccessToken() : null;
    if (!token) return;

    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/get_my_projects`, {
      method: 'POST',
      headers: {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    window.TONI_PROJECTS = Array.isArray(data) ? data : [];
    renderProjectsDashboard();
  } catch (e) {
    console.warn('TONI Projekte laden:', e);
  }
}

// ══════════════════════════════════════
// DASHBOARD RENDERN
// ══════════════════════════════════════
function renderProjectsDashboard() {
  const wrap = document.getElementById('toni-projects-list');
  if (!wrap) return;

  const projects = window.TONI_PROJECTS;

  if (!projects.length) {
    wrap.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:12px 0">
      Noch keine aktiven Projekte. Leg jetzt dein erstes Projekt an!
    </div>`;
    return;
  }

  wrap.innerHTML = projects.map(p => {
    const pct = p.task_total > 0 ? Math.round((p.task_done / p.task_total) * 100) : 0;
    const color = pct >= 80 ? '#639922' : pct >= 40 ? '#EF9F27' : '#378ADD';
    const members = (p.members || []).slice(0, 4);
    const blocker = p.has_blocker ? `<span style="font-size:11px;background:#FAEEDA;color:#633806;padding:2px 7px;border-radius:10px;margin-left:6px">Blockiert</span>` : '';
    const official = p.is_official ? `<span style="font-size:11px;background:#E1F5EE;color:#085041;padding:2px 7px;border-radius:10px;margin-left:4px">Offiziel</span>` : '';
    const avatars = members.map(m => {
      const initials = ((m.first_name||'')[0]||(m.display_name||'?')[0]).toUpperCase();
      const colors = ['#B5D4F4','#9FE1CB','#FAC775','#CECBF6','#F5C4B3'];
      const textColors = ['#0C447C','#085041','#633806','#3C3489','#712B13'];
      const ci = Math.abs(m.id?.charCodeAt(0)||0) % colors.length;
      if (m.avatar_url) return `<img src="${m.avatar_url}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;border:1.5px solid #fff">`;
      return `<div style="width:24px;height:24px;border-radius:50%;background:${colors[ci]};color:${textColors[ci]};display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:500;border:1.5px solid #fff">${initials}</div>`;
    }).join('');
    const extraMembers = (p.member_count||0) > 4 ? `<span style="font-size:11px;color:var(--color-text-tertiary);align-self:center">+${p.member_count-4}</span>` : '';

    return `<div class="projekt-item" onclick="openProjectModal('${p.id}')" style="cursor:pointer">
      <div class="projekt-row">
        <div class="projekt-name">${escapeHtml(p.title)}${official}${blocker}</div>
        <div class="projekt-pct">${pct}%</div>
      </div>
      <div class="projekt-desc">${escapeHtml(p.description||'')}${p.type==='group'?' · Gruppenarbeit':''}</div>
      <div class="projekt-track-wrap"><div class="projekt-fill" style="width:${pct}%;background:${color};height:4px;border-radius:2px"></div></div>
      <div style="display:flex;align-items:center;gap:4px;margin-top:6px">
        ${avatars}${extraMembers}
        ${p.deadline ? `<span style="font-size:11px;color:var(--color-text-tertiary);margin-left:auto">Abgabe: ${formatDate(p.deadline)}</span>` : ''}
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════
// PROJEKT-MODAL ÖFFNEN
// ══════════════════════════════════════
function openProjectModal(projectId) {
  const project = window.TONI_PROJECTS.find(p => p.id === projectId);
  if (!project) return;
  window.TONI_ACTIVE_PROJECT_ID = projectId;

  document.getElementById('project-modal-title').textContent = project.title;
  document.getElementById('project-modal-sub').textContent =
    (project.type === 'group' ? 'Gruppenarbeit' : 'Solo-Projekt') +
    (project.deadline ? ' · Abgabe: ' + formatDate(project.deadline) : '') +
    (project.invite_code ? ' · Code: ' + project.invite_code : '');

  loadProjectTasks(projectId);
  document.getElementById('project-modal').classList.add('open');
}

function closeProjectModal() {
  document.getElementById('project-modal').classList.remove('open');
  window.TONI_ACTIVE_PROJECT_ID = null;
}

// ══════════════════════════════════════
// AUFGABEN LADEN
// ══════════════════════════════════════
async function loadProjectTasks(projectId) {
  try {
    const token = typeof toniV27GetAccessToken === 'function' ? await toniV27GetAccessToken() : null;
    if (!token) return;

    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/project_tasks?project_id=eq.${projectId}&order=position.asc,created_at.asc&select=*,profiles(id,display_name,first_name,avatar_url)`,
      { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token } }
    );
    if (!res.ok) throw new Error(await res.text());
    const tasks = await res.json();
    renderProjectKanban(tasks);
  } catch (e) {
    console.warn('TONI Aufgaben laden:', e);
  }
}

// ══════════════════════════════════════
// KANBAN RENDERN
// ══════════════════════════════════════
function renderProjectKanban(tasks) {
  const cols = { todo: [], in_progress: [], review: [], done: [] };
  tasks.forEach(t => { if (cols[t.status]) cols[t.status].push(t); });

  const colLabels = { todo: 'Offen', in_progress: 'In Arbeit', review: 'Review', done: 'Erledigt' };
  const colColors = { todo: '#378ADD', in_progress: '#EF9F27', review: '#7F77DD', done: '#639922' };

  const wrap = document.getElementById('project-kanban');
  if (!wrap) return;

  wrap.innerHTML = Object.entries(cols).map(([col, colTasks]) => `
    <div style="flex:1;min-width:140px">
      <div style="font-size:11px;font-weight:500;color:var(--color-text-secondary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px;display:flex;align-items:center;gap:6px">
        <span style="width:8px;height:8px;border-radius:50%;background:${colColors[col]};display:inline-block"></span>
        ${colLabels[col]}
        <span style="margin-left:auto;background:var(--color-background-secondary);border-radius:10px;padding:1px 6px;font-size:11px">${colTasks.length}</span>
      </div>
      <div id="pkol-${col}" style="min-height:60px">
        ${colTasks.map(t => renderTaskCard(t, col)).join('')}
      </div>
      <button onclick="openAddTaskModal('${col}')" style="width:100%;margin-top:6px;padding:6px;font-size:12px;color:var(--color-text-tertiary);border:0.5px dashed var(--color-border-secondary);border-radius:var(--border-radius-md);background:none;cursor:pointer;text-align:left">
        + Aufgabe
      </button>
    </div>
  `).join('');
}

function renderTaskCard(task, col) {
  const profile = task.profiles;
  const assignee = profile ? (profile.first_name || profile.display_name || '') : '';
  const blocker = task.blocker ? `<div style="font-size:11px;color:#993C1D;margin-top:4px">⚠️ ${escapeHtml(task.blocker)}</div>` : '';
  const due = task.due_date ? `<div style="font-size:11px;color:var(--color-text-tertiary);margin-top:3px">${formatDate(task.due_date)}</div>` : '';

  const nextCol = { todo: 'in_progress', in_progress: 'review', review: 'done', done: 'todo' };
  const nextLabel = { todo: 'Starten', in_progress: 'Review', review: 'Erledigt', done: 'Zurück' };

  return `<div style="background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);padding:8px 10px;margin-bottom:6px;cursor:pointer" onclick="openTaskDetail('${task.id}')">
    <div style="font-size:13px;font-weight:500;color:var(--color-text-primary)">${escapeHtml(task.title)}</div>
    ${assignee ? `<div style="font-size:11px;color:var(--color-text-secondary);margin-top:3px">${escapeHtml(assignee)}</div>` : ''}
    ${due}${blocker}
    <button onclick="event.stopPropagation();moveProjectTask('${task.id}','${nextCol[col]}')"
      style="margin-top:6px;font-size:11px;padding:3px 8px;border:0.5px solid var(--color-border-secondary);border-radius:10px;background:none;cursor:pointer;color:var(--color-text-secondary)">
      ${nextLabel[col]} →
    </button>
  </div>`;
}

// ══════════════════════════════════════
// AUFGABE VERSCHIEBEN
// ══════════════════════════════════════
async function moveProjectTask(taskId, newStatus) {
  try {
    const token = typeof toniV27GetAccessToken === 'function' ? await toniV27GetAccessToken() : null;
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/project_tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status: newStatus, updated_at: new Date().toISOString() })
    });
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
  } catch (e) {
    console.warn('TONI Aufgabe verschieben:', e);
  }
}

// ══════════════════════════════════════
// AUFGABE DETAIL
// ══════════════════════════════════════
async function openTaskDetail(taskId) {
  try {
    const token = typeof toniV27GetAccessToken === 'function' ? await toniV27GetAccessToken() : null;
    if (!token) return;
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/project_tasks?id=eq.${taskId}&select=*`,
      { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token } }
    );
    const [task] = await res.json();
    if (!task) return;

    document.getElementById('task-detail-title').value = task.title;
    document.getElementById('task-detail-desc').value = task.description || '';
    document.getElementById('task-detail-blocker').value = task.blocker || '';
    document.getElementById('task-detail-due').value = task.due_date || '';
    document.getElementById('task-detail-id').value = taskId;
    document.getElementById('task-detail-modal').classList.add('open');
  } catch (e) {
    console.warn('TONI Aufgabe öffnen:', e);
  }
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
  if (!title) return;

  try {
    const token = typeof toniV27GetAccessToken === 'function' ? await toniV27GetAccessToken() : null;
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/project_tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ title, description, blocker: blocker || null, due_date, updated_at: new Date().toISOString() })
    });
    closeTaskDetailModal();
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
  } catch (e) {
    console.warn('TONI Aufgabe speichern:', e);
  }
}

// ══════════════════════════════════════
// AUFGABE HINZUFÜGEN
// ══════════════════════════════════════
function openAddTaskModal(col) {
  document.getElementById('add-task-col').value = col;
  document.getElementById('add-task-title').value = '';
  document.getElementById('add-task-modal').classList.add('open');
  setTimeout(() => document.getElementById('add-task-title').focus(), 100);
}

function closeAddTaskModal() {
  document.getElementById('add-task-modal').classList.remove('open');
}

async function saveNewTask() {
  const title = document.getElementById('add-task-title').value.trim();
  const col = document.getElementById('add-task-col').value;
  const projectId = window.TONI_ACTIVE_PROJECT_ID;
  if (!title || !projectId) return;

  try {
    const token = typeof toniV27GetAccessToken === 'function' ? await toniV27GetAccessToken() : null;
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/project_tasks`, {
      method: 'POST',
      headers: {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        project_id: projectId,
        title,
        status: col,
        created_by: window.TONI_AUTH_PROFILE?.id
      })
    });
    closeAddTaskModal();
    loadProjectTasks(projectId);
    loadProjects();
  } catch (e) {
    console.warn('TONI Aufgabe anlegen:', e);
  }
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
  const is_official = ['tutor', 'admin', 'superadmin'].includes(role);

  try {
    const token = typeof toniV27GetAccessToken === 'function' ? await toniV27GetAccessToken() : null;
    if (!token) return;
    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/create_project`, {
      method: 'POST',
      headers: {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_title: title, p_description: description, p_type: type, p_deadline: deadline, p_is_official: is_official })
    });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    closeCreateProjectModal();
    await loadProjects();

    if (type === 'group' && result.invite_code) {
      setTimeout(() => {
        alert(`Projekt angelegt! Einladungscode für deine Gruppe:\n\n${result.invite_code}\n\nMitschüler können mit diesem Code beitreten.`);
      }, 300);
    }
  } catch (e) {
    console.warn('TONI Projekt anlegen:', e);
    alert('Projekt konnte nicht angelegt werden: ' + e.message);
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
    const token = typeof toniV27GetAccessToken === 'function' ? await toniV27GetAccessToken() : null;
    if (!token) return;
    const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/join_project`, {
      method: 'POST',
      headers: {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_invite_code: code })
    });
    if (!res.ok) throw new Error(await res.text());
    const result = await res.json();
    closeJoinProjectModal();
    await loadProjects();
    alert(`Du bist dem Projekt "${result.title}" beigetreten!`);
  } catch (e) {
    console.warn('TONI Projekt beitreten:', e);
    alert('Beitreten fehlgeschlagen: ' + (e.message.includes('Ungültiger') ? 'Ungültiger Einladungscode.' : e.message));
  }
}

// ══════════════════════════════════════
// HILFSFUNKTIONEN
// ══════════════════════════════════════
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  // Projekt-Modal Tastatur
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      closeProjectModal();
      closeCreateProjectModal();
      closeAddTaskModal();
      closeTaskDetailModal();
      closeJoinProjectModal();
    }
  });

  // Enter in Add-Task
  const addTaskInput = document.getElementById('add-task-title');
  if (addTaskInput) addTaskInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveNewTask(); });

  // Enter in Join
  const joinInput = document.getElementById('join-code-input');
  if (joinInput) joinInput.addEventListener('keydown', e => { if (e.key === 'Enter') joinProject(); });
});

// Projekte laden sobald Nutzer eingeloggt ist
if (typeof window.TONI_AUTH_PROFILE !== 'undefined' && window.TONI_AUTH_PROFILE?.id) {
  loadProjects();
} else {
  document.addEventListener('toni:auth:ready', loadProjects);
}

// ══════════════════════════════════════
// MITGLIEDER FÜR ZUWEISUNG LADEN
// ══════════════════════════════════════
async function loadProjectMembers(projectId) {
  const project = window.TONI_PROJECTS.find(p => p.id === projectId);
  return project?.members || [];
}

// Erweiterte Aufgabe-anlegen mit Zuweisung
function openAddTaskModal(col) {
  const projectId = window.TONI_ACTIVE_PROJECT_ID;
  const project = window.TONI_PROJECTS.find(p => p.id === projectId);
  const members = project?.members || [];

  document.getElementById('add-task-col').value = col;
  document.getElementById('add-task-title').value = '';
  document.getElementById('add-task-due-date').value = '';

  // Mitglieder für Zuweisung befüllen
  const sel = document.getElementById('add-task-assigned');
  sel.innerHTML = '<option value="">Niemand zugewiesen</option>' +
    members.map(m => `<option value="${m.id}">${m.first_name || m.display_name}</option>`).join('');

  document.getElementById('add-task-modal').classList.add('open');
  setTimeout(() => document.getElementById('add-task-title').focus(), 100);
}

async function saveNewTask() {
  const title = document.getElementById('add-task-title').value.trim();
  const col = document.getElementById('add-task-col').value;
  const due_date = document.getElementById('add-task-due-date').value || null;
  const assigned_to = document.getElementById('add-task-assigned').value || null;
  const projectId = window.TONI_ACTIVE_PROJECT_ID;
  if (!title || !projectId) return;

  try {
    const token = typeof toniV27GetAccessToken === 'function' ? await toniV27GetAccessToken() : null;
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/project_tasks`, {
      method: 'POST',
      headers: {
        'apikey': window.SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
        project_id: projectId,
        title,
        status: col,
        due_date,
        assigned_to,
        created_by: window.TONI_AUTH_PROFILE?.id
      })
    });
    closeAddTaskModal();
    loadProjectTasks(projectId);
    loadProjects();
  } catch (e) {
    console.warn('TONI Aufgabe anlegen:', e);
  }
}
