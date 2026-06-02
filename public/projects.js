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
    renderOpenTasks();
    renderToniHint();
    await loadPersonalTasks();
    renderWeeklyPlan();
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
// OFFENE AUFGABEN (Dashboard-Kasten)
// ══════════════════════════════════════
function renderOpenTasks() {
  const wrap = document.getElementById('toni-open-tasks-list');
  if (!wrap) return;

  const projects = window.TONI_PROJECTS;
  if (!projects.length) {
    wrap.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:6px 0">Keine Projekte vorhanden.</div>`;
    return;
  }

  // Alle offenen Aufgaben aus allen Projekten sammeln
  // Da project_tasks nicht im Dashboard-State sind, zeigen wir pro Projekt die offene Anzahl
  // und laden Tasks beim ersten Render nach
  loadOpenTasksFromProjects();
}

// ══════════════════════════════════════
// EIGENE (FREIE) AUFGABEN – personal_tasks
// Aufgaben, die der Schüler selbst anlegt (unabhängig von Projekten/Lernreisen).
// Geräteübergreifend in Supabase gespeichert, RLS schützt sie pro Nutzer.
// ══════════════════════════════════════
async function loadPersonalTasks() {
  try {
    const token = await getToken();
    if (!token) { window.TONI_PERSONAL_TASKS = []; return; }
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/personal_tasks?order=position.asc,created_at.asc&select=*`,
      { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token } }
    );
    window.TONI_PERSONAL_TASKS = res.ok ? (await res.json()) : [];
  } catch (e) {
    console.warn('TONI eigene Aufgaben laden:', e);
    window.TONI_PERSONAL_TASKS = [];
  }
}

async function addPersonalTask() {
  const title = (typeof prompt === 'function') ? prompt('Neue eigene Aufgabe:') : '';
  if (!title || !title.trim()) return;
  try {
    const token = await getToken();
    if (!token) return;
    const ownerId = (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.id) || window.TONI_ACTIVE_PROFILE_ID;
    if (!ownerId) { console.warn('Keine Profil-ID für eigene Aufgabe'); return; }
    await fetch(`${window.SUPABASE_URL}/rest/v1/personal_tasks`, {
      method: 'POST',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ owner_id: ownerId, title: title.trim(), status: 'todo' })
    });
    await loadPersonalTasks();
    renderWeeklyPlan();
  } catch (e) { console.warn('TONI eigene Aufgabe anlegen:', e); }
}

// Status der Reihe nach durchschalten: todo -> in_progress -> done -> todo
async function cyclePersonalTask(taskId) {
  try {
    const list = Array.isArray(window.TONI_PERSONAL_TASKS) ? window.TONI_PERSONAL_TASKS : [];
    const t = list.find(x => x.id === taskId);
    if (!t) return;
    const next = t.status === 'todo' ? 'in_progress' : (t.status === 'in_progress' ? 'done' : 'todo');
    const token = await getToken();
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/personal_tasks?id=eq.${taskId}`, {
      method: 'PATCH',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next, updated_at: new Date().toISOString() })
    });
    await loadPersonalTasks();
    renderWeeklyPlan();
  } catch (e) { console.warn('TONI eigene Aufgabe ändern:', e); }
}

async function deletePersonalTask(taskId) {
  try {
    const token = await getToken();
    if (!token) return;
    await fetch(`${window.SUPABASE_URL}/rest/v1/personal_tasks?id=eq.${taskId}`, {
      method: 'DELETE',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Prefer': 'return=minimal' }
    });
    await loadPersonalTasks();
    renderWeeklyPlan();
  } catch (e) { console.warn('TONI eigene Aufgabe löschen:', e); }
}

// ══════════════════════════════════════
// MEIN WOCHENPLAN (gespiegelt aus Lernreise + Projekten)
// Lese-Ansicht: drei Spalten (Offen / In Arbeit / Erledigt), innerhalb
// nach Dringlichkeit (Blocker/überfällig zuerst). Herkunft farbcodiert:
// Lernreise = blau, Projekt = amber. Erledigtes klein/ausgegraut.
// ══════════════════════════════════════
function wpIsOverdue(d) {
  if (!d) return false;
  const due = new Date(d); if (isNaN(due)) return false;
  const today = new Date(); today.setHours(0,0,0,0);
  return due < today;
}

function collectWeeklyPlanItems() {
  const items = [];

  // --- Lernreise: aktive Lernreise, aktuelle Station ---
  try {
    if (typeof window.activeJourney === 'function') {
      const j = window.activeJourney();
      if (j && Array.isArray(j.steps) && j.steps.length) {
        let curIdx = 0;
        if (typeof window.stepStatus === 'function') {
          const i = j.steps.findIndex((s, idx) => window.stepStatus(s, idx, j) === 'current');
          curIdx = i < 0 ? 0 : i;
        }
        const cur = j.steps[curIdx];
        (cur.tasks || []).forEach(t => {
          if (t.status === 'locked') return;
          const col = t.status === 'done' ? 'done' : (t.status === 'in_progress' ? 'wip' : 'todo');
          items.push({
            source: 'journey', title: t.title || '', col,
            meta: `${j.title || 'Lernreise'} · ${cur.title || ''}`,
            urgent: false, taskId: t.id
          });
        });
      }
    }
  } catch (e) { console.warn('Wochenplan Lernreise:', e); }

  // --- Projekte: NUR mir zugewiesene Aufgaben (inkl. erledigte) mit Verbindlichkeiten ---
  try {
    const projects = Array.isArray(window.TONI_PROJECTS) ? window.TONI_PROJECTS : [];
    const openT = Array.isArray(window.TONI_OPEN_TASKS) ? window.TONI_OPEN_TASKS : [];
    const doneT = Array.isArray(window.TONI_DONE_TASKS) ? window.TONI_DONE_TASKS : [];
    const tasks = openT.concat(doneT);
    const myId = (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.id) || window.TONI_ACTIVE_PROFILE_ID || null;
    const projTitle = {};
    projects.forEach(p => { projTitle[p.id] = p.title; });
    tasks.forEach(t => {
      // Punkt 2: nur Aufgaben anzeigen, die mir zugewiesen sind.
      if (!myId || t.assigned_to !== myId) return;
      const col = t.status === 'done' ? 'done' : (t.status === 'in_progress' || t.status === 'review' ? 'wip' : 'todo');
      const overdue = t.due_date && wpIsOverdue(t.due_date) && t.status !== 'done';
      const blocked = !!t.blocker && t.status !== 'done';
      let note = '';
      if (blocked) note = 'Blockiert';
      else if (overdue) note = 'überfällig';
      items.push({
        source: 'project', title: t.title || '', col,
        meta: `${projTitle[t.project_id] || 'Projekt'}`,
        note, urgent: blocked || overdue, blocked, overdue,
        projectId: t.project_id
      });
    });
  } catch (e) { console.warn('Wochenplan Projekte:', e); }

  // --- Eigene (freie) Aufgaben ---
  try {
    const personal = Array.isArray(window.TONI_PERSONAL_TASKS) ? window.TONI_PERSONAL_TASKS : [];
    personal.forEach(t => {
      const col = t.status === 'done' ? 'done' : (t.status === 'in_progress' ? 'wip' : 'todo');
      items.push({
        source: 'personal', title: t.title || '', col,
        meta: 'Eigene Aufgabe',
        urgent: false, personalId: t.id
      });
    });
  } catch (e) { console.warn('Wochenplan eigene Aufgaben:', e); }

  return items;
}

function renderWeeklyPlan() {
  const wrap = document.getElementById('toni-weekly-plan');
  if (!wrap) return;

  const items = collectWeeklyPlanItems();

  if (!items.length) {
    wrap.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:14px 0;text-align:center">
      Noch nichts zu planen. Öffne eine Lernreise oder lege ein Projekt an – dein Wochenplan füllt sich automatisch.</div>`;
    return;
  }

  // Innerhalb der Spalten nach Dringlichkeit sortieren (urgent zuerst)
  const byCol = { todo: [], wip: [], done: [] };
  items.forEach(it => { (byCol[it.col] || byCol.todo).push(it); });
  ['todo','wip'].forEach(c => byCol[c].sort((a,b) => (b.urgent?1:0) - (a.urgent?1:0)));

  const colColor = (source) => source === 'journey'
    ? { border:'#185FA5', text:'#0C447C', icon:'ti-book', label:'Lernreise' }
    : source === 'personal'
    ? { border:'#534AB7', text:'#3C3489', icon:'ti-star', label:'Eigene' }
    : { border:'#BA7517', text:'#633806', icon:'ti-folder', label:'Projekt' };

  const cardHtml = (it) => {
    const c = colColor(it.source);
    // Klickverhalten je Quelle:
    // - Lernreise: Aufgabe öffnen
    // - Projekt: Projekt öffnen
    // - Eigene: Status durchschalten (todo -> in_progress -> done -> todo)
    const click = it.source === 'journey'
      ? (it.taskId && typeof window.openLearningTask === 'function' ? `onclick="openLearningTask('${it.taskId}')"` : '')
      : it.source === 'personal'
      ? (it.personalId ? `onclick="cyclePersonalTask('${it.personalId}')" title="Status ändern"` : '')
      : (it.projectId ? `onclick="openProjectModal('${it.projectId}')"` : '');
    let badge = '';
    if (it.note === 'Blockiert') badge = `<span style="font-size:10px;background:#FAECE7;color:#993C1D;padding:1px 6px;border-radius:8px;margin-left:4px">Blockiert</span>`;
    else if (it.note === 'überfällig') badge = `<span style="font-size:10px;background:#FAECE7;color:#993C1D;padding:1px 6px;border-radius:8px;margin-left:4px">⚠ überfällig</span>`;
    const done = it.col === 'done';
    // Eigene Aufgaben: kleines Löschsymbol
    const del = it.source === 'personal' && it.personalId
      ? `<span onclick="event.stopPropagation();deletePersonalTask('${it.personalId}')" title="Löschen" style="margin-left:auto;color:var(--color-text-tertiary);cursor:pointer;font-size:12px"><i class="ti ti-x"></i></span>`
      : '';
    return `<div class="k-card${done?' done-c':''}" ${click} style="border-left:3px solid ${c.border};${done?'opacity:.55':''}">
      <div class="k-card-title" style="${done?'text-decoration:line-through;':''}">${escapeHtml(it.title)}${done?'':badge}</div>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:${c.text}">
        <i class="ti ${c.icon}" style="font-size:13px"></i><span style="opacity:.85">${escapeHtml(it.meta)}</span>${del}
      </div>
    </div>`;
  };

  const colDef = [
    { key:'todo', title:'Offen' },
    { key:'wip',  title:'In Arbeit' },
    { key:'done', title:'Erledigt' }
  ];

  wrap.innerHTML = `<div class="kanban-grid" style="grid-template-columns:repeat(3,minmax(180px,1fr));min-width:560px">
    ${colDef.map(cd => {
      const list = byCol[cd.key] || [];
      const cards = list.length ? list.map(cardHtml).join('') :
        `<div style="font-size:12px;color:var(--color-text-tertiary);padding:6px 2px">—</div>`;
      const addBtn = cd.key === 'todo'
        ? `<div onclick="addPersonalTask()" style="margin-top:6px;font-size:12px;color:#534AB7;cursor:pointer"><i class="ti ti-plus" style="font-size:13px"></i> Eigene Aufgabe</div>`
        : '';
      return `<div class="kanban-col col-${cd.key==='wip'?'wip':cd.key==='done'?'done':'todo'}">
        <div class="k-header"><span class="k-title">${cd.title}</span><span class="k-badge">${list.length}</span></div>
        <div>${cards}</div>
        ${addBtn}
      </div>`;
    }).join('')}
  </div>
  <div style="display:flex;gap:14px;align-items:center;margin-top:8px;padding:0 2px;font-size:11px;color:var(--color-text-tertiary);flex-wrap:wrap">
    <span><i class="ti ti-book" style="color:#185FA5"></i> Lernreise</span>
    <span><i class="ti ti-folder" style="color:#BA7517"></i> Projekt</span>
    <span><i class="ti ti-star" style="color:#534AB7"></i> Eigene</span>
    <span style="margin-left:auto">tippe eine eigene Aufgabe an, um den Status zu ändern</span>
  </div>`;
}

async function loadOpenTasksFromProjects() {
  const wrap = document.getElementById('toni-open-tasks-list');
  if (!wrap) return;

  const projects = window.TONI_PROJECTS;
  if (!projects.length) return;

  try {
    const token = await getToken();
    if (!token) return;

    // Alle offenen Aufgaben aller Projekte laden
    const projectIds = projects.map(p => `project_id=in.(${projects.map(x=>x.id).join(',')})`)[0];
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/project_tasks?${projectIds}&status=neq.done&order=due_date.asc.nullslast,created_at.asc&select=*,assigned_profile:profiles!project_tasks_assigned_to_fkey(id,display_name,first_name,avatar_url)`,
      { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token } }
    );
    if (!res.ok) throw new Error(await res.text());
    const tasks = await res.json();

    // Für den KI-Kontext global ablegen (bereits geladene Daten wiederverwenden).
    window.TONI_OPEN_TASKS = Array.isArray(tasks) ? tasks : [];

    // Zusätzlich die zuletzt erledigten Projektaufgaben laden – nur für den
    // Wochenplan (die "Erledigt"-Spalte). Begrenzt, damit es übersichtlich bleibt.
    try {
      const doneRes = await fetch(
        `${window.SUPABASE_URL}/rest/v1/project_tasks?${projectIds}&status=eq.done&order=updated_at.desc.nullslast,created_at.desc&limit=20&select=*,assigned_profile:profiles!project_tasks_assigned_to_fkey(id,display_name,first_name,avatar_url)`,
        { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token } }
      );
      window.TONI_DONE_TASKS = doneRes.ok ? (await doneRes.json()) : [];
    } catch (e) { window.TONI_DONE_TASKS = []; }

    if (!tasks.length) {
      wrap.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:6px 0">Keine offenen Aufgaben – sehr gut! 🎉</div>`;
      return;
    }

    wrap.innerHTML = tasks.slice(0, 8).map(t => {
      const profile = t.assigned_profile;
      const pal = profile ? getMemberPalette(profile.id) : { bg: 'var(--color-background-secondary)', border: 'var(--color-border-secondary)', text: 'var(--color-text-primary)' };
      const proj = projects.find(p => p.id === t.project_id);
      const projName = proj ? escapeHtml(proj.title) : '';
      const overdue = t.due_date && isOverdue(t.due_date);
      const dueHtml = t.due_date
        ? `<span style="font-size:11px;color:${overdue?'#A32D2D':'var(--color-text-tertiary)'};margin-left:4px">${overdue?'⚠ ':''}${formatDate(t.due_date)}</span>`
        : '';
      const blockerBadge = t.blocker
        ? `<span style="font-size:10px;background:#FAECE7;color:#993C1D;padding:1px 6px;border-radius:8px;margin-left:4px">Blockiert</span>`
        : '';
      const statusBadge = t.status === 'in_progress'
        ? `<span style="font-size:10px;background:#FAEEDA;color:#633806;padding:1px 6px;border-radius:8px;margin-left:4px">In Arbeit</span>`
        : t.status === 'review'
        ? `<span style="font-size:10px;background:#EEEDFE;color:#3C3489;padding:1px 6px;border-radius:8px;margin-left:4px">Review</span>`
        : '';

      return `<div onclick="openProjectModal('${t.project_id}')"
        style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:0.5px solid var(--color-border-tertiary);cursor:pointer"
        onmouseover="this.style.opacity='.75'" onmouseout="this.style.opacity='1'">
        ${profile ? avatarHtml(profile, 28) : `<div style="width:28px;height:28px;border-radius:50%;background:var(--color-background-secondary);border:0.5px solid var(--color-border-secondary);flex-shrink:0"></div>`}
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(t.title)}${statusBadge}${blockerBadge}</div>
          <div style="display:flex;align-items:center;flex-wrap:wrap;gap:2px;margin-top:1px">
            ${profile ? `<span style="font-size:11px;color:${pal.text}">${escapeHtml(profile.first_name||profile.display_name||'')}</span>` : '<span style="font-size:11px;color:var(--color-text-tertiary)">Nicht zugewiesen</span>'}
            ${projName ? `<span style="font-size:11px;color:var(--color-text-tertiary)"> · ${projName}</span>` : ''}
            ${dueHtml}
          </div>
        </div>
      </div>`;
    }).join('');

    if (tasks.length > 8) {
      wrap.innerHTML += `<div style="font-size:12px;color:var(--color-text-tertiary);padding:6px 0;text-align:center">+ ${tasks.length - 8} weitere Aufgaben</div>`;
    }

    // TONI-Hinweis basierend auf echten Daten aktualisieren
    renderToniHintFromTasks(tasks);
    // Wochenplan aktualisieren, jetzt wo die Projekt-Aufgaben geladen sind
    renderWeeklyPlan();

  } catch (e) {
    console.warn('TONI offene Aufgaben:', e);
    wrap.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:6px 0">Aufgaben konnten nicht geladen werden.</div>`;
  }
}

// ══════════════════════════════════════
// TONI-HINWEIS (Dashboard-Kasten)
// ══════════════════════════════════════
function renderToniHint() {
  const projects = window.TONI_PROJECTS;
  if (!projects.length) return;
  // Wird durch renderToniHintFromTasks überschrieben sobald Tasks geladen
}

function renderToniHintFromTasks(tasks) {
  const wrap = document.getElementById('toni-project-hint');
  if (!wrap) return;

  const blocked = tasks.filter(t => t.blocker);
  const overdue = tasks.filter(t => t.due_date && isOverdue(t.due_date));
  const unassigned = tasks.filter(t => !t.assigned_to && t.status !== 'done');

  let hint = '';
  let chips = '';

  if (blocked.length) {
    const b = blocked[0];
    const proj = window.TONI_PROJECTS.find(p => p.id === b.project_id);
    hint = `Es gibt ${blocked.length} blockierte Aufgabe${blocked.length>1?'n':''} in deinen Projekten. "${escapeHtml(b.title)}" ist blockiert: <em>${escapeHtml(b.blocker)}</em>. Kläre das zuerst – Blocker bremsen die ganze Gruppe.`;
    chips = `<span onclick="openProjectModal('${b.project_id}')" style="display:inline-flex;align-items:center;font-size:12px;padding:5px 11px;border-radius:20px;border:0.5px solid var(--color-border-secondary);cursor:pointer;color:var(--color-text-secondary)">Projekt öffnen</span>`;
  } else if (overdue.length) {
    hint = `${overdue.length} Aufgabe${overdue.length>1?'n sind':' ist'} überfällig. Am besten heute noch angehen!`;
    chips = `<span onclick="loadOpenTasksFromProjects()" style="display:inline-flex;align-items:center;font-size:12px;padding:5px 11px;border-radius:20px;border:0.5px solid var(--color-border-secondary);cursor:pointer;color:var(--color-text-secondary)">Aufgaben anzeigen</span>`;
  } else if (unassigned.length) {
    hint = `${unassigned.length} Aufgabe${unassigned.length>1?'n sind':' ist'} noch niemandem zugewiesen. Weise sie Gruppenmitgliedern zu damit alle wissen was zu tun ist.`;
    chips = '';
  } else if (tasks.length === 0) {
    hint = 'Alle Aufgaben sind erledigt – fantastisch! 🎉 Zeit für neue Projekte.';
  } else {
    hint = `Du hast ${tasks.length} offene Aufgabe${tasks.length>1?'n':''} in deinen Projekten. Schau regelmäßig rein und halte deinen Fortschritt aktuell.`;
    chips = `<span onclick="agentAction('project_agent','Projektstatus zusammenfassen','desktop')" style="display:inline-flex;align-items:center;font-size:12px;padding:5px 11px;border-radius:20px;border:0.5px solid var(--color-border-secondary);cursor:pointer;color:var(--color-text-secondary)">Projektstatus zusammenfassen</span>`;
  }

  wrap.innerHTML = `
    <div style="background:#E6F1FB;border-radius:0 10px 10px 10px;padding:10px 13px;font-size:13px;color:#0C447C;line-height:1.6;margin-bottom:${chips?'10px':'0'}">${hint}</div>
    ${chips ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${chips}</div>` : ''}`;
}

// ──────────────────────────────────────
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

  // Karteikarte bekommt die Farbe des zugewiesenen Mitglieds, unzugewiesene bekommen einen neutralen Rahmen
  const pal = profile
    ? getMemberPalette(profile.id)
    : { bg: 'var(--color-background-secondary)', border: 'var(--color-border-secondary)', text: 'var(--color-text-primary)' };

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
    loadOpenTasksFromProjects();
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
function selectProjectType(type) {
  document.getElementById('new-project-type').value = type;
  const soloCard = document.getElementById('pt-solo-card');
  const groupCard = document.getElementById('pt-group-card');
  if (type === 'solo') {
    soloCard.style.border = '2px solid #185FA5';
    soloCard.style.background = '#E6F1FB';
    soloCard.querySelector('div:nth-child(2)').style.color = '#0C447C';
    soloCard.querySelector('div:nth-child(3)').style.color = '#185FA5';
    groupCard.style.border = '0.5px solid var(--color-border-secondary)';
    groupCard.style.background = 'var(--color-background-secondary)';
    groupCard.querySelector('div:nth-child(2)').style.color = 'var(--color-text-primary)';
    groupCard.querySelector('div:nth-child(3)').style.color = 'var(--color-text-tertiary)';
  } else {
    groupCard.style.border = '2px solid #185FA5';
    groupCard.style.background = '#E6F1FB';
    groupCard.querySelector('div:nth-child(2)').style.color = '#0C447C';
    groupCard.querySelector('div:nth-child(3)').style.color = '#185FA5';
    soloCard.style.border = '0.5px solid var(--color-border-secondary)';
    soloCard.style.background = 'var(--color-background-secondary)';
    soloCard.querySelector('div:nth-child(2)').style.color = 'var(--color-text-primary)';
    soloCard.querySelector('div:nth-child(3)').style.color = 'var(--color-text-tertiary)';
  }
}

function openCreateProjectModal() {
  document.getElementById('new-project-title').value = '';
  document.getElementById('new-project-desc').value = '';
  document.getElementById('new-project-deadline').value = '';
  selectProjectType('solo');
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
  let done = false;

  function tryLoad() {
    if (done) return;
    if (window.TONI_AUTH_PROFILE?.id) {
      done = true;
      loadProjects();
    }
  }

  tryLoad();

  const origApply = window.applyAuthProfile;
  window.applyAuthProfile = function(profile) {
    if (typeof origApply === 'function') origApply(profile);
    if (profile?.id) { done = false; setTimeout(tryLoad, 200); }
  };

  function hookSupabase() {
    const client = window._supabaseClient || window.supabase;
    if (client?.auth?.onAuthStateChange) {
      client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) { done = false; setTimeout(tryLoad, 600); }
        if (event === 'SIGNED_OUT') {
          done = false;
          window.TONI_PROJECTS = [];
          const w1 = document.getElementById('toni-projects-list');
          const w2 = document.getElementById('toni-open-tasks-list');
          if (w1) w1.innerHTML = '<div style="color:var(--color-text-tertiary);font-size:13px;padding:12px 0">Projekte werden geladen…</div>';
          if (w2) w2.innerHTML = '<div style="color:var(--color-text-tertiary);font-size:13px;padding:8px 0">Wird geladen…</div>';
        }
      });
      return true;
    }
    return false;
  }

  let tries = 0;
  const poll = setInterval(() => {
    tries++;
    hookSupabase();
    tryLoad();
    if (done || tries > 50) clearInterval(poll);
  }, 400);
})();
