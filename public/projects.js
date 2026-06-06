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
  // V31: Profilbilder liegen als Base64 in avatar_data_url; avatar_url als Fallback.
  const img = member.avatar_data_url || member.avatar_url;
  if (img) {
    return `<img src="${img}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid var(--color-background-primary)" title="${escapeHtml(member.first_name||member.display_name||'')}">`;
  }
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${colors[ci]};color:${textColors[ci]};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.4)}px;font-weight:500;border:2px solid var(--color-background-primary);flex-shrink:0" title="${escapeHtml(member.first_name||member.display_name||'')}">${initials}</div>`;
}

// ══════════════════════════════════════
// V1 – MITGLIEDER-BLOCK (Bild + Name + Klasse/Rolle untereinander)
// Tutor/Admin/SuperAdmin -> Nachname + "Tutor"
// Schüler                -> Vorname + Klasse (sonst "Keine Klasse")
// ══════════════════════════════════════
function memberPrimaryName(m) {
  const role = m.role || '';
  const isStaff = ['tutor', 'admin', 'superadmin'].includes(role);
  if (isStaff) {
    return m.last_name || m.display_name || m.first_name || '–';
  }
  return m.first_name || m.display_name || '–';
}

function memberSubLabel(m) {
  const role = m.role || '';
  const isStaff = ['tutor', 'admin', 'superadmin'].includes(role);
  if (isStaff) return 'Tutor';
  const cls = (m.class_name || '').trim();
  return cls || 'Keine Klasse';
}

// Vertikaler Block: Avatar oben, Name darunter, Klasse/Rolle darunter.
function memberBlock(m, size = 40) {
  const name = escapeHtml(memberPrimaryName(m));
  const sub  = escapeHtml(memberSubLabel(m));
  return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;width:${size + 24}px;flex-shrink:0">
    ${avatarHtml(m, size)}
    <span style="font-size:11px;font-weight:500;color:var(--color-text-primary);line-height:1.2;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${name}</span>
    <span style="font-size:10px;color:var(--color-text-tertiary);line-height:1.2;text-align:center">${sub}</span>
  </div>`;
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

// Projektweite, kollisionsfreie Farbe: jedes Mitglied bekommt anhand seiner
// Position in der Mitgliederliste eine eindeutige Farbe (solange Mitgliederzahl
// <= Palettenanzahl). Fallback auf Hash, wenn nicht auflösbar.
function getMemberPaletteInProject(memberId, projectId) {
  const proj = (window.TONI_PROJECTS || []).find(p => p.id === projectId);
  const members = proj?.members || [];
  const pos = members.findIndex(m => m.id === memberId);
  if (pos >= 0) return MEMBER_PALETTES[pos % MEMBER_PALETTES.length];
  return getMemberPalette(memberId || '');
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
    if (!token) {
      // Kein Token (z.B. mitten im Nutzerwechsel): alte Liste verwerfen,
      // statt ein fremdes Projekt aus dem alten State stehen zu lassen.
      window.TONI_PROJECTS = [];
      renderProjectsDashboard();
      return;
    }

    // V2-Fix (Token/Profil-Abgleich): Beim Nutzerwechsel kann das Token
    // kurz noch zum alten Nutzer gehoeren, waehrend das Profil schon
    // gewechselt ist. Dann wuerde der Server fremde Projekte liefern.
    // Wir vergleichen die User-ID IM Token (sub) mit dem aktuellen Profil
    // und laden erst, wenn beide uebereinstimmen.
    try {
      const sub = JSON.parse(atob(token.split('.')[1])).sub;
      const profileId = window.TONI_AUTH_PROFILE?.id;
      if (profileId && sub && sub !== profileId) {
        console.warn('TONI: Token gehört noch nicht zum aktuellen Profil – warte und lade neu.');
        window.TONI_PROJECTS = [];
        renderProjectsDashboard();
        setTimeout(loadProjects, 500); // kurz warten, dann mit frischem Token erneut
        return;
      }
    } catch (_) { /* Token nicht dekodierbar -> normal fortfahren */ }

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
    if (window.toniReady) window.toniReady.done("projects");
  } catch (e) {
    console.warn('TONI Projekte laden:', e);
    window.TONI_PROJECTS = [];
    renderProjectsDashboard();
    if (window.toniReady) window.toniReady.done("projects");
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
    const extra = (p.member_count||0) > 5 ? `<span style="font-size:11px;color:${pal.text};opacity:.7;margin-left:4px;align-self:center">+${p.member_count-5}</span>` : '';
    const avatars = members.map(m => memberBlock(m, 32)).join('');

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
      <div style="display:flex;align-items:flex-start;gap:6px;margin-top:6px;flex-wrap:wrap">
        <div style="display:flex;gap:6px;overflow-x:auto;max-width:100%;padding-bottom:2px">${avatars}${extra}</div>
        <div style="display:flex;align-items:center;gap:6px;width:100%;margin-top:2px">
          ${deadlineHtml}
          <div style="margin-left:auto;display:flex;gap:4px">${badges}</div>
        </div>
      </div>
    </div>`;
  }).join('');
}

// ══════════════════════════════════════
// OFFENE AUFGABEN (Dashboard-Kasten)
// ══════════════════════════════════════
function renderOpenTasks() {
  // Das Laden der offenen/erledigten Projektaufgaben (für Wochenplan + KI-Kontext)
  // läuft unabhängig davon, ob der alte "Offene Aufgaben"-Kasten noch existiert.
  const projects = window.TONI_PROJECTS;
  if (!projects || !projects.length) {
    const wrap = document.getElementById('toni-open-tasks-list');
    if (wrap) wrap.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:6px 0">Keine Projekte vorhanden.</div>`;
    return;
  }
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

// Status der Reihe nach durchschalten: todo -> in_progress -> done (Ende).
// Erledigte eigene Aufgaben wechseln NICHT zurück – dann lieber neu anlegen.
async function cyclePersonalTask(taskId) {
  try {
    const list = Array.isArray(window.TONI_PERSONAL_TASKS) ? window.TONI_PERSONAL_TASKS : [];
    const t = list.find(x => x.id === taskId);
    if (!t) return;
    if (t.status === 'done') return; // bleibt erledigt
    const next = t.status === 'todo' ? 'in_progress' : 'done';
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
        projectId: t.project_id,
        updatedAt: t.updated_at || t.created_at || ''
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
        urgent: false, personalId: t.id,
        updatedAt: t.updated_at || t.created_at || ''
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
  // "Erledigt": zuletzt erledigte zuerst (für die "letzten 5"-Anzeige)
  byCol.done.sort((a,b) => String(b.updatedAt||'').localeCompare(String(a.updatedAt||'')));

  const colColor = (source) => source === 'journey'
    ? { border:'#185FA5', text:'#0C447C', icon:'ti-book', label:'Lernreise' }
    : source === 'personal'
    ? { border:'#534AB7', text:'#3C3489', icon:'ti-star', label:'Eigene' }
    : { border:'#BA7517', text:'#633806', icon:'ti-folder', label:'Projekt' };

  const cardHtml = (it) => {
    const c = colColor(it.source);
    const done = it.col === 'done';
    // Klickverhalten je Quelle:
    // - Lernreise: Aufgabe öffnen
    // - Projekt: Projekt öffnen
    // - Eigene: Status durchschalten – aber NICHT mehr, wenn bereits erledigt
    const click = it.source === 'journey'
      ? (it.taskId && typeof window.openLearningTask === 'function' ? `onclick="openLearningTask('${it.taskId}')"` : '')
      : it.source === 'personal'
      ? (it.personalId && !done ? `onclick="cyclePersonalTask('${it.personalId}')" title="Status ändern"` : '')
      : (it.projectId ? `onclick="openProjectModal('${it.projectId}')"` : '');
    let badge = '';
    if (it.note === 'Blockiert') badge = `<span style="font-size:10px;background:#FAECE7;color:#993C1D;padding:1px 6px;border-radius:8px;margin-left:4px">Blockiert</span>`;
    else if (it.note === 'überfällig') badge = `<span style="font-size:10px;background:#FAECE7;color:#993C1D;padding:1px 6px;border-radius:8px;margin-left:4px">⚠ überfällig</span>`;
    // Eigene Aufgaben: hellblauer Hintergrund, damit sie sich klar abheben
    const bg = it.source === 'personal' ? 'background:#E6F1FB;' : '';
    // Eigene Aufgaben: kleines Löschsymbol
    const del = it.source === 'personal' && it.personalId
      ? `<span onclick="event.stopPropagation();deletePersonalTask('${it.personalId}')" title="Löschen" style="margin-left:auto;color:var(--color-text-tertiary);cursor:pointer;font-size:12px"><i class="ti ti-x"></i></span>`
      : '';
    return `<div class="k-card${done?' done-c':''}" ${click} style="${bg}border-left:3px solid ${c.border};${done?'opacity:.55':''}">
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
      let list = byCol[cd.key] || [];
      let extraNote = '';
      // Punkt 2: in "Erledigt" nur die letzten 5 zeigen
      if (cd.key === 'done' && list.length > 5) {
        const hidden = list.length - 5;
        list = list.slice(0, 5);
        extraNote = `<div style="font-size:11px;color:var(--color-text-tertiary);padding:4px 2px;text-align:center">+ ${hidden} weitere erledigt</div>`;
      }
      const cards = list.length ? list.map(cardHtml).join('') :
        `<div style="font-size:12px;color:var(--color-text-tertiary);padding:6px 2px">—</div>`;
      const addBtn = cd.key === 'todo'
        ? `<div onclick="addPersonalTask()" style="margin-top:6px;font-size:12px;color:#534AB7;cursor:pointer"><i class="ti ti-plus" style="font-size:13px"></i> Eigene Aufgabe</div>`
        : '';
      const count = (byCol[cd.key] || []).length;
      return `<div class="kanban-col col-${cd.key==='wip'?'wip':cd.key==='done'?'done':'todo'}">
        <div class="k-header"><span class="k-title">${cd.title}</span><span class="k-badge">${count}</span></div>
        <div>${cards}</div>
        ${extraNote}
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
  // Das frühere "Offene Aufgaben"-Anzeigeelement (toni-open-tasks-list) wurde aus
  // dem Dashboard entfernt. Diese Funktion lädt aber weiterhin die offenen und
  // erledigten Projektaufgaben für den Wochenplan und den KI-Kontext – daher
  // KEIN früher Abbruch, wenn das Anzeigeelement fehlt.
  const wrap = document.getElementById('toni-open-tasks-list');

  const projects = window.TONI_PROJECTS;
  if (!projects || !projects.length) return;

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

    // Anzeige im alten "Offene Aufgaben"-Kasten nur, wenn er (noch) existiert.
    if (wrap) {
      if (!tasks.length) {
        wrap.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:6px 0">Keine offenen Aufgaben – sehr gut! 🎉</div>`;
      } else {
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
      }
    }

    // TONI-Hinweis und Wochenplan immer aktualisieren (unabhängig vom Anzeigeelement)
    renderToniHintFromTasks(tasks);
    renderWeeklyPlan();

  } catch (e) {
    console.warn('TONI offene Aufgaben:', e);
    if (wrap) wrap.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:6px 0">Aufgaben konnten nicht geladen werden.</div>`;
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
  const avatarsHtml = members.map(m => memberBlock(m, 40)).join('');
  const inviteCode = p.invite_code ? `<span style="font-size:11px;background:var(--color-background-secondary);padding:2px 8px;border-radius:8px;font-family:monospace;cursor:pointer" onclick="copyInviteCode('${p.invite_code}')" title="Kopieren">🔗 ${p.invite_code}</span>` : '';
  const deadlineHtml = p.deadline ? `<span style="font-size:12px;color:${isOverdue(p.deadline)?'#A32D2D':'var(--color-text-secondary)'}">📅 ${formatDate(p.deadline)}</span>` : '';

  // V2/Regel 7: Projektmanager (Ersteller) statt Solo/Gruppe-Unterscheidung.
  const managerProfile = members.find(m => m.id === p.created_by);
  const managerName = managerProfile
    ? (typeof memberPrimaryName === 'function' ? memberPrimaryName(managerProfile) : (managerProfile.first_name||managerProfile.display_name||''))
    : '–';

  document.getElementById('project-modal-sub').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px">
      <span style="font-size:12px;color:var(--color-text-secondary)">👤 Projektmanager: <strong>${escapeHtml(managerName)}</strong></span>
      ${deadlineHtml}
      ${inviteCode}
    </div>
    <div style="display:flex;gap:10px;margin-top:10px;overflow-x:auto;padding-bottom:4px">${avatarsHtml}</div>
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
      `${window.SUPABASE_URL}/rest/v1/project_tasks?project_id=eq.${projectId}&order=position.asc,created_at.asc&select=*,assigned_profile:profiles!project_tasks_assigned_to_fkey(id,display_name,first_name,last_name,class_name,role,avatar_url,avatar_data_url)`,
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

  // Erledigt-Spalte: zuletzt fertiggestellte Aufgabe nach oben (neueste zuerst).
  // updated_at wird beim Statuswechsel auf "done" gesetzt; created_at als Rückfall.
  cols.done.sort((a, b) =>
    String(b.updated_at || b.created_at || '').localeCompare(String(a.updated_at || a.created_at || '')));

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

// ══════════════════════════════════════
// V110.1 – STATUS-KETTE (kein Drag&Drop)
// Kachel:  todo -> in_progress -> review -> done
// Vorwaerts-Button-Beschriftung je nach AKTUELLER Spalte:
//   todo:"Start" in_progress:"Review" review:"Erledigt" done:"Fertig"(inaktiv)
// "Zurücksetzen": einen Schritt zurueck; bei todo inaktiv.
// Beide Buttons nur fuer zugewiesene Person ODER Tutor/Admin aktiv.
// ══════════════════════════════════════
const TONI_TASK_NEXT_COL  = { todo: 'in_progress', in_progress: 'review', review: 'done', done: null };
const TONI_TASK_PREV_COL  = { todo: null, in_progress: 'todo', review: 'in_progress', done: 'review' };
const TONI_TASK_FWD_LABEL = { todo: 'Start', in_progress: 'Review', review: 'Erledigt', done: 'Fertig' };

// Darf der aktuelle Nutzer den Status dieser Aufgabe aendern?
// Regel: zugewiesene Person ODER Tutor/Admin/SuperAdmin.
// Hinweis: reine UI-Sperre. Echte Durchsetzung spaeter via RLS-Policy
// auf project_tasks (UPDATE ist dort aktuell fuer alle Mitglieder offen).
function toniCanChangeTaskStatus(task) {
  // V2/Regel 6: NUR der Inhaber (assigned_to) darf den Status aendern -
  // auch kein Tutor/Manager. Serverseitig durch RPC set_task_status erzwungen.
  const myId = (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.id) || window.TONI_ACTIVE_PROFILE_ID || null;
  return !!myId && task.assigned_to === myId;
}

function renderTaskCard(task, col) {
  // Profil des Inhabers bevorzugt aus der bereits geladenen Mitgliederliste
  // des Projekts auflösen (zuverlässig, inkl. Bild/Klasse/Rolle). Der
  // eingebettete Join (task.assigned_profile) liefert fremde Profile wegen
  // RLS nicht immer vollständig – deshalb ist members die bessere Quelle.
  let profile = task.assigned_profile;
  if (task.assigned_to) {
    const proj = (window.TONI_PROJECTS || []).find(p => p.id === task.project_id);
    const fromMembers = proj?.members?.find(m => m.id === task.assigned_to);
    if (fromMembers) profile = fromMembers;
  }

  // Jede Kachel bekommt immer eine Farbe: projektweit eindeutige Inhaberfarbe,
  // sonst eine stabile Farbe anhand der Aufgaben-ID (kein Weiss mehr).
  const pal = profile
    ? getMemberPaletteInProject(profile.id, task.project_id)
    : getMemberPalette(task.id || '');

  const dueColor = task.due_date && isOverdue(task.due_date) && col !== 'done' ? '#A32D2D' : pal.text;
  const dueHtml = task.due_date
    ? `<div style="font-size:11px;color:${dueColor};margin-top:3px;opacity:.8">${isOverdue(task.due_date)&&col!=='done'?'⚠ ':''}${formatDate(task.due_date)}</div>`
    : '';
  const blockerHtml = task.blocker
    ? `<div style="font-size:11px;color:#993C1D;background:rgba(255,255,255,.6);padding:3px 7px;border-radius:6px;margin-top:5px;line-height:1.3;border:0.5px solid #F0997B">⚠️ ${escapeHtml(task.blocker)}</div>`
    : '';
  const doneStyle = col === 'done' ? 'text-decoration:line-through;opacity:.6' : '';

  const assigneeHtml = profile
    ? `<div style="display:flex;align-items:center;gap:6px;margin-top:5px">${avatarHtml(profile,22)}<div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:11px;font-weight:500;color:${pal.text}">${escapeHtml(memberPrimaryName(profile))}</span><span style="font-size:10px;color:${pal.text};opacity:.7">${escapeHtml(memberSubLabel(profile))}</span></div></div>`
    : '';

  // ── Status-Steuerung ──────────────────────────────
  const canChange   = toniCanChangeTaskStatus(task);
  const nextCol     = TONI_TASK_NEXT_COL[col];          // null bei done
  const prevCol     = TONI_TASK_PREV_COL[col];          // null bei todo
  const fwdLabel    = TONI_TASK_FWD_LABEL[col] || 'Start';
  const fwdEnabled  = canChange && !!nextCol;           // done -> kein Vorwaerts
  const resetEnabled = canChange && !!prevCol;          // todo -> kein Zurueck

  const fwdBtn = `<button ${fwdEnabled ? `onclick="event.stopPropagation();moveProjectTask('${task.id}','${nextCol}')"` : 'disabled'}
      style="flex:1;font-size:11px;padding:4px 9px;border:0.5px solid ${pal.border};border-radius:10px;font-weight:500;
      background:${fwdEnabled ? 'rgba(255,255,255,.7)' : 'transparent'};color:${pal.text};
      cursor:${fwdEnabled ? 'pointer' : 'default'};opacity:${fwdEnabled ? '1' : '.4'}">
      ${fwdLabel}${nextCol ? ' →' : ''}
    </button>`;

  const resetBtn = `<button ${resetEnabled ? `onclick="event.stopPropagation();moveProjectTask('${task.id}','${prevCol}')"` : 'disabled'}
      title="Zurücksetzen"
      style="font-size:11px;padding:4px 9px;border:0.5px solid ${pal.border};border-radius:10px;font-weight:500;
      background:transparent;color:${pal.text};
      cursor:${resetEnabled ? 'pointer' : 'default'};opacity:${resetEnabled ? '.8' : '.3'}">
      ↺
    </button>`;

  // Blockierte Aufgaben: roter Rand + Warnsymbol oben rechts
  const isBlocked = !!task.blocker;
  const cardBorder = isBlocked ? '2px solid #D8472B' : `0.5px solid ${pal.border}`;
  const blockerBadge = isBlocked
    ? `<span style="position:absolute;top:6px;right:8px;font-size:13px" title="${escapeHtml(task.blocker)}">⛔</span>`
    : '';

  return `<div style="position:relative;background:${pal.bg};border:${cardBorder};border-radius:8px;padding:9px 10px;margin-bottom:6px;cursor:pointer;transition:opacity .15s"
    onclick="openTaskDetail('${task.id}')"
    onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
    ${blockerBadge}
    <div style="font-size:13px;font-weight:500;color:${pal.text};line-height:1.3;${doneStyle};${isBlocked?'padding-right:18px':''}">${escapeHtml(task.title)}</div>
    ${assigneeHtml}${dueHtml}${blockerHtml}
    <div style="display:flex;align-items:center;gap:6px;margin-top:7px">
      ${fwdBtn}${resetBtn}
    </div>
  </div>`;
}

// ══════════════════════════════════════
// AUFGABE VERSCHIEBEN
// ══════════════════════════════════════
// ══════════════════════════════════════
// V2/C1 – RPC-Helfer: ruft eine Supabase-RPC auf und gibt JSON zurueck.
// Wirft bei Fehler eine Exception mit der Server-Meldung (z.B. Berechtigung).
// ══════════════════════════════════════
async function callRpc(fnName, args) {
  const token = await getToken();
  if (!token) throw new Error('Nicht angemeldet');
  const res = await fetch(`${window.SUPABASE_URL}/rest/v1/rpc/${fnName}`, {
    method: 'POST',
    headers: {
      'apikey': window.SUPABASE_ANON_KEY,
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(args || {})
  });
  if (!res.ok) {
    let msg = 'Aktion nicht erlaubt';
    try { const j = await res.json(); msg = j.message || j.hint || msg; } catch(_) {}
    throw new Error(msg);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function moveProjectTask(taskId, newStatus) {
  try {
    await callRpc('set_task_status', { p_task_id: taskId, p_status: newStatus });
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
    loadOpenTasksFromProjects();
  } catch (e) {
    console.warn('TONI Status aendern:', e);
    alert(e.message || 'Statuswechsel nicht erlaubt.');
  }
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
    window.TONI_CURRENT_TASK = task;

    const p = window.TONI_PROJECTS.find(x => x.id === task.project_id);
    const members = p?.members || [];
    const myId = window.TONI_AUTH_PROFILE?.id || window.TONI_ACTIVE_PROFILE_ID || null;
    const isOwner = !!myId && task.assigned_to === myId;
    const isManager = !!p && !!myId && p.created_by === myId;

    // Inhaber-Name ermitteln
    const ownerProfile = members.find(m => m.id === task.assigned_to);
    const ownerName = ownerProfile
      ? (typeof memberPrimaryName === 'function' ? memberPrimaryName(ownerProfile) : (ownerProfile.first_name||ownerProfile.display_name||''))
      : 'niemandem';

    // Kopfzeilen-Akzent = Farbe des Inhabers (verbindet Fenster mit Kachel)
    const pal = ownerProfile
      ? getMemberPaletteInProject(ownerProfile.id, task.project_id)
      : getMemberPalette(task.id || '');
    const header = document.getElementById('ptask-header');
    if (header) {
      header.style.setProperty('--lr-type-color', pal.border);
      header.style.setProperty('--lr-type-bg', pal.bg);
      header.style.setProperty('--lr-type-text', pal.text);
    }

    document.getElementById('ptask-title').textContent = task.title;
    // TONi-Rückmeldebox für die neue Aufgabe zurücksetzen
    const ptaskHintBox = document.getElementById('ptask-toni-hint');
    if (ptaskHintBox) { ptaskHintBox.style.display = 'none'; ptaskHintBox.innerHTML = ''; }
    document.getElementById('ptask-sub').textContent =
      `${p ? (p.title || 'Projekt') : 'Projekt'} · Inhaber: ${ownerName}`;
    document.getElementById('task-detail-id').value = taskId;
    document.getElementById('ptask-owner').innerHTML =
      `Inhaber dieser Aufgabe: <strong>${escapeHtml(ownerName)}</strong>${isOwner ? ' (du)' : ''}`;

    // Titel + Beschreibung: Inhaber bekommt Eingabefelder, sonst nur Text
    const titleWrap = document.getElementById('ptask-title-edit-wrap');
    const descBox = document.getElementById('ptask-desc');
    const descEdit = document.getElementById('ptask-desc-edit');
    const saveAllBtn = document.getElementById('ptask-save-all');
    if (isOwner) {
      document.getElementById('ptask-title-edit').value = task.title || '';
      descEdit.value = task.description || '';
      titleWrap.style.display = '';
      descEdit.style.display = '';
      descBox.style.display = 'none';
      saveAllBtn.style.display = '';
    } else {
      titleWrap.style.display = 'none';
      descEdit.style.display = 'none';
      descBox.style.display = '';
      descBox.textContent = task.description || 'Keine Beschreibung.';
      saveAllBtn.style.display = 'none';
    }

    // Fällig bis: Inhaber bekommt Datumsfeld (vorbelegt), sonst Nur-Lese-Anzeige.
    const dueEdit = document.getElementById('ptask-due-edit');
    const dueView = document.getElementById('ptask-due-view');
    if (dueEdit && dueView) {
      // due_date kommt als 'YYYY-MM-DD' (date) – passt direkt ins type=date-Feld.
      const dueRaw = task.due_date ? String(task.due_date).slice(0, 10) : '';
      if (isOwner) {
        dueEdit.value = dueRaw;
        dueEdit.style.display = '';
        dueView.style.display = 'none';
      } else {
        dueEdit.style.display = 'none';
        dueView.style.display = '';
        dueView.textContent = dueRaw
          ? (typeof formatDate === 'function' ? formatDate(task.due_date) : dueRaw)
          : 'Kein Fälligkeitsdatum.';
      }
    }

    // Blocker (alle Mitglieder dürfen setzen/entfernen)
    const blCheck = document.getElementById('ptask-blocker-check');
    const blDetail = document.getElementById('ptask-blocker-detail');
    const blText = document.getElementById('ptask-blocker-text');
    const hasBlocker = !!task.blocker;
    blCheck.checked = hasBlocker;
    blDetail.style.display = hasBlocker ? '' : 'none';
    // "Blockiert" ist der Standardtext bei Markierung ohne Begründung -> dann Feld leer zeigen
    blText.value = (task.blocker && task.blocker !== 'Blockiert') ? task.blocker : '';

    // Status-Buttons (gleiche Kette wie im Board; nur Inhaber aktiv)
    renderTaskDetailStatus(task, isOwner);

    // Notizfeld – nur Inhaber darf schreiben, alle dürfen lesen
    const noteEl = document.getElementById('ptask-note');
    const noteHint = document.getElementById('ptask-note-hint');
    noteEl.value = task.note || '';
    if (isOwner) {
      noteEl.removeAttribute('readonly');
      noteEl.style.opacity = '1';
      noteHint.textContent = '';
    } else {
      noteEl.setAttribute('readonly', 'readonly');
      noteEl.style.opacity = '0.7';
      noteHint.textContent = 'Nur der Inhaber dieser Aufgabe kann die Notiz bearbeiten.';
      if (!task.note) noteEl.value = '';
      noteEl.placeholder = task.note ? '' : 'Noch keine Notiz vorhanden.';
    }

    // Verwaltung: Umweisen (nur Manager), Löschen (Inhaber oder Manager)
    const adminWrap = document.getElementById('ptask-admin');
    const reassignWrap = document.getElementById('ptask-reassign-wrap');
    const delBtn = document.getElementById('ptask-delete');
    let adminVisible = false;
    if (isManager) {
      reassignWrap.style.display = '';
      const sel = document.getElementById('ptask-reassign');
      sel.innerHTML = members.map(m => {
        const nm = typeof memberPrimaryName === 'function' ? memberPrimaryName(m) : (m.first_name||m.display_name||'');
        return `<option value="${m.id}" ${m.id===task.assigned_to?'selected':''}>${escapeHtml(nm)}</option>`;
      }).join('');
      adminVisible = true;
    } else {
      reassignWrap.style.display = 'none';
    }
    if (isOwner || isManager) { delBtn.style.display = ''; adminVisible = true; }
    else { delBtn.style.display = 'none'; }
    adminWrap.style.display = adminVisible ? '' : 'none';

    document.getElementById('task-detail-modal').classList.add('open');
  } catch (e) { console.warn('TONI Aufgabe öffnen:', e); }
}

function closeTaskDetailModal() {
  document.getElementById('task-detail-modal').classList.remove('open');
  window.TONI_CURRENT_TASK = null;
}

// Status-Buttons im Detailfenster als große gleich breite Reihe (Lernreisen-Stil)
function renderTaskDetailStatus(task, isOwner) {
  const col = task.status;
  const nextCol = TONI_TASK_NEXT_COL[col];
  const prevCol = TONI_TASK_PREV_COL[col];
  const fwdLabel = TONI_TASK_FWD_LABEL[col] || 'Start';
  const colDE = { todo:'Offen', in_progress:'In Arbeit', review:'Review', done:'Erledigt' };
  const fwdEnabled = isOwner && !!nextCol;
  const resetEnabled = isOwner && !!prevCol;

  // Button 1: Vorwaerts – Label nach Status (Start/Review/Erledigt/Fertig).
  // Bei done (kein nextCol) zeigt er "Fertig" und ist inaktiv.
  const fwdText = nextCol ? fwdLabel : 'Fertig';
  const fwdBtn = `<button ${fwdEnabled ? `onclick="moveProjectTaskFromDetail('${task.id}','${nextCol}')"` : 'disabled'}
    style="padding:12px 4px;border:none;border-radius:var(--border-radius-md);
    background:${fwdEnabled?'#639922':'var(--color-background-secondary)'};
    cursor:${fwdEnabled?'pointer':'default'};opacity:${fwdEnabled?'1':'.5'};
    display:flex;flex-direction:column;align-items:center;gap:4px">
    <span style="font-size:16px;color:${fwdEnabled?'#fff':'var(--color-text-tertiary)'}">▶</span>
    <span style="font-size:12px;font-weight:500;color:${fwdEnabled?'#fff':'var(--color-text-tertiary)'}">${fwdText}</span></button>`;

  // Button 2: Zuruecksetzen
  const resetBtn = `<button ${resetEnabled ? `onclick="moveProjectTaskFromDetail('${task.id}','${prevCol}')"` : 'disabled'}
    style="padding:12px 4px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);
    background:var(--color-background-primary);cursor:${resetEnabled?'pointer':'default'};opacity:${resetEnabled?'1':'.4'};
    display:flex;flex-direction:column;align-items:center;gap:4px">
    <span style="font-size:16px;color:var(--color-text-secondary)">↺</span>
    <span style="font-size:12px;color:var(--color-text-primary)">Zurücksetzen</span></button>`;

  // Button 3: TONI-Hinweis (vorerst nur Optik, Funktion folgt)
  const hintBtn = `<button onclick="toniProjectTaskHint()"
    style="padding:12px 4px;border:0.5px solid var(--color-border-secondary);border-radius:var(--border-radius-md);
    background:var(--color-background-primary);cursor:pointer;
    display:flex;flex-direction:column;align-items:center;gap:4px">
    <span style="font-size:13px;font-weight:600;color:#185FA5">TONi</span>
    <span style="font-size:12px;color:var(--color-text-primary)">Hinweis</span></button>`;

  const wrap = document.getElementById('ptask-status-controls');
  wrap.style.display = 'grid';
  wrap.style.gridTemplateColumns = 'repeat(3, 1fr)';
  wrap.style.gap = '8px';
  wrap.innerHTML = fwdBtn + resetBtn + hintBtn;

  document.getElementById('ptask-status-note').textContent =
    isOwner
      ? `Aktueller Status: ${colDE[col]||col}`
      : `Status: ${colDE[col]||col} – nur der Inhaber kann ihn ändern.`;
}

// TONI-Hinweis bei Projektaufgaben: praktische, handlungsorientierte Hilfe.
// Fokus: Vorankommen (nächster konkreter Schritt) + Blocker auflösen.
// Anders als bei Lernreisen gibt es keine "Lösung" – TONi macht handlungsfähig.
async function toniProjectTaskHint() {
  const box = document.getElementById('ptask-toni-hint');
  const taskId = document.getElementById('task-detail-id')?.value;
  if (!taskId) return;

  // Aktuelle Aufgabe + Projekt aus den geladenen Daten holen
  const tasks = Array.isArray(window.TONI_PROJECT_TASKS) ? window.TONI_PROJECT_TASKS : [];
  const task = tasks.find(t => String(t.id) === String(taskId));
  const projects = Array.isArray(window.TONI_PROJECTS) ? window.TONI_PROJECTS : [];
  const project = task ? projects.find(p => String(p.id) === String(task.project_id)) : null;

  // Live-Werte aus dem Modal (Inhaber kann Titel/Beschreibung/Notiz gerade bearbeiten)
  const liveDesc = document.getElementById('ptask-desc-edit');
  const description = (liveDesc && liveDesc.style.display !== 'none' && liveDesc.value)
    ? liveDesc.value : (task ? (task.description || '') : '');
  const note = document.getElementById('ptask-note')?.value || (task ? (task.note || '') : '');
  const hasBlocker = !!(document.getElementById('ptask-blocker-check')?.checked || (task && task.blocker));
  const blockerText = document.getElementById('ptask-blocker-text')?.value
    || (task && task.blocker && task.blocker !== 'Blockiert' ? task.blocker : '');

  if (!box) return;
  box.style.display = '';
  box.innerHTML = '<em>TONi denkt nach…</em>';

  // Projektaufgaben-Kontext für den project_agent zusammenbauen.
  // Wir nutzen das gleiche Schema, das der Server in buildContextSummary liest
  // (ctx.user, ctx.projectContext) und betten die konkrete Aufgabe samt
  // praktischer Hinweis-Anweisung ein.
  const baseState = (typeof STATE !== 'undefined' && STATE) ? STATE : {};
  const aufgabenText = [
    `Der Schüler arbeitet an einer Projektaufgabe und bittet um einen praktischen Hinweis.`,
    `Projekt: ${project ? (project.title || 'Projekt') : 'Projekt'}`,
    `Aufgabe: ${task ? (task.title || '') : ''}`,
    description ? `Beschreibung: ${description}` : `Beschreibung: (keine)`,
    hasBlocker ? `STATUS: Diese Aufgabe ist als BLOCKIERT markiert.${blockerText ? ' Grund: ' + blockerText : ' (kein Grund angegeben)'}` : `Status: nicht blockiert.`,
    note ? `Bisherige Notiz des Schülers: ${note}` : `Der Schüler hat noch keine Notiz gemacht.`,
    ``,
    `Anweisung an TONi: Gib direkte, praktische Hilfe, damit der Schüler vorankommt.`,
    hasBlocker
      ? `Die Aufgabe ist blockiert – hilf konkret, die Blockade zu lösen: Was genau hält auf? Kann er es selbst lösen, oder muss er jemanden ansprechen? Schlage 1–3 konkrete nächste Schritte vor.`
      : `Hilf ihm, den nächsten konkreten Schritt zu finden: Wie fängt er an bzw. kommt weiter? Zerlege die Aufgabe in 1–3 machbare Schritte.`,
    `Sei konkret und ermutigend, kurz (3–5 Sätze). Sprich den Schüler mit Namen an. Antworte auf Deutsch.`
  ].join('\n');

  const payload = {
    ...baseState,
    projectContext: {
      projectCount: projects.length,
      projects: [],
      currentTask: aufgabenText   // zusätzlicher Block; vom Server zwar nicht
                                  // eigens gelesen, aber wir liefern den Text
                                  // über die chatHistory-Nachricht (s.u.) an die KI.
    },
    chatHistory: [
      ...((baseState.chatHistory || []).slice(-8)),
      { role: 'user', content: aufgabenText }
    ]
  };

  try {
    const result = await (typeof callAgent === 'function'
      ? callAgent('project_agent', payload)
      : Promise.reject(new Error('callAgent fehlt')));
    const msg = (result && result.message) ? result.message : 'Ich konnte gerade keinen Hinweis erstellen – versuch es gleich nochmal.';
    box.innerHTML = msg;
    if (typeof setApiBadge === 'function') setApiBadge(true);
  } catch (err) {
    box.innerHTML = 'TONi ist gerade nicht erreichbar. Versuch es gleich nochmal.' +
      '<br><small style="color:var(--color-text-tertiary)">(Offline)</small>';
    if (typeof setApiBadge === 'function') setApiBadge(false);
  }
}
window.toniProjectTaskHint = toniProjectTaskHint;

// Status aus dem Detailfenster ändern -> danach Detail neu laden + Board aktualisieren
async function moveProjectTaskFromDetail(taskId, newStatus) {
  try {
    await callRpc('set_task_status', { p_task_id: taskId, p_status: newStatus });
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
    loadOpenTasksFromProjects();
    openTaskDetail(taskId); // Detailansicht mit neuem Status neu aufbauen
  } catch (e) {
    console.warn('TONI Status (Detail):', e);
    alert(e.message || 'Statuswechsel nicht erlaubt.');
  }
}

// Blocker-Checkbox: Textfeld ein/ausblenden. Beim Abwählen Blocker sofort entfernen.
function toggleBlockerField() {
  const checked = document.getElementById('ptask-blocker-check').checked;
  document.getElementById('ptask-blocker-detail').style.display = checked ? '' : 'none';
  if (!checked) {
    // Markierung entfernt -> Blocker direkt löschen
    saveTaskBlocker(true);
  }
}

// Blocker speichern (alle Mitglieder dürfen). clear=true entfernt ihn.
async function saveTaskBlocker(clear) {
  const taskId = document.getElementById('task-detail-id').value;
  if (!taskId) return;
  let blocker = null;
  if (!clear) {
    const text = document.getElementById('ptask-blocker-text').value.trim();
    // Markierung an, aber kein Text -> Standardtext "Blockiert"
    blocker = text || 'Blockiert';
  }
  try {
    await callRpc('set_task_blocker', { p_task_id: taskId, p_blocker: blocker });
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
  } catch (e) {
    console.warn('TONI Blocker speichern:', e);
    alert(e.message || 'Blocker konnte nicht gespeichert werden.');
  }
}

// V2: Gemeinsames Speichern – Titel + Beschreibung + Notiz in einem Schritt,
// danach Fenster schliessen. Nur der Inhaber sieht den Button (Sichtbarkeit
// in openTaskDetail); die RPCs erzwingen die Berechtigung zusaetzlich serverseitig.
async function saveTaskAll() {
  const taskId = document.getElementById('task-detail-id').value;
  const title = document.getElementById('ptask-title-edit').value.trim();
  const description = document.getElementById('ptask-desc-edit').value;
  const note = document.getElementById('ptask-note').value;
  const dueDate = document.getElementById('ptask-due-edit')?.value || null;
  if (!taskId) return;
  if (!title) { alert('Der Titel darf nicht leer sein.'); return; }
  try {
    // Titel + Beschreibung + Fälligkeit speichern (RPC erzwingt: nur Inhaber)
    await callRpc('set_task_details', { p_task_id: taskId, p_title: title, p_description: description, p_due_date: dueDate });
    // Notiz speichern
    await callRpc('set_task_note', { p_task_id: taskId, p_note: note });
    closeTaskDetailModal();
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
    loadOpenTasksFromProjects();
  } catch (e) {
    console.warn('TONI Aufgabe speichern:', e);
    alert(e.message || 'Konnte nicht gespeichert werden.');
  }
}

// Umweisen -> nur Manager (RPC erzwingt es serverseitig)
async function reassignCurrentTask() {
  const taskId = document.getElementById('task-detail-id').value;
  const newAssignee = document.getElementById('ptask-reassign').value;
  if (!taskId || !newAssignee) return;
  try {
    await callRpc('reassign_task', { p_task_id: taskId, p_new_assignee: newAssignee });
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
    openTaskDetail(taskId);
  } catch (e) {
    console.warn('TONI Umweisen:', e);
    alert(e.message || 'Umweisen nicht erlaubt.');
  }
}

async function deleteTask() {
  const taskId = document.getElementById('task-detail-id').value;
  if (!taskId || !confirm('Aufgabe wirklich löschen?')) return;
  try {
    await callRpc('delete_project_task', { p_task_id: taskId });
    closeTaskDetailModal();
    if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
    loadProjects();
    loadOpenTasksFromProjects();
  } catch (e) {
    console.warn('TONI Aufgabe löschen:', e);
    alert(e.message || 'Aufgabe konnte nicht gelöscht werden.');
  }
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
  const descEl = document.getElementById('add-task-desc'); if (descEl) descEl.value = '';

  // V2/Regel 8: Zuweisung beim Anlegen nur fuer den Projektmanager sichtbar.
  // Nicht-Manager werden automatisch selbst Inhaber (serverseitig in der RPC).
  const myId = window.TONI_AUTH_PROFILE?.id || window.TONI_ACTIVE_PROFILE_ID || null;
  const isManager = !!project && !!myId && project.created_by === myId;
  const sel = document.getElementById('add-task-assigned');
  const assignWrap = sel ? sel.closest('div') : null;
  if (sel) {
    if (isManager) {
      sel.innerHTML = '<option value="">Mir selbst (Standard)</option>' +
        members.map(m => {
          const nm = typeof memberPrimaryName === 'function' ? memberPrimaryName(m) : (m.first_name||m.display_name||'');
          return `<option value="${m.id}">${escapeHtml(nm)}</option>`;
        }).join('');
      if (assignWrap) assignWrap.style.display = '';
    } else {
      sel.innerHTML = '<option value="">Mir selbst</option>';
      if (assignWrap) assignWrap.style.display = 'none';
    }
  }

  document.getElementById('add-task-modal').classList.add('open');
  setTimeout(() => document.getElementById('add-task-title').focus(), 100);
}

function closeAddTaskModal() {
  document.getElementById('add-task-modal').classList.remove('open');
}

async function saveNewTask() {
  const title = document.getElementById('add-task-title').value.trim();
  const description = document.getElementById('add-task-desc')?.value.trim() || null;
  const due_date = document.getElementById('add-task-due-date').value || null;
  const assigned_to = document.getElementById('add-task-assigned')?.value || null;
  const projectId = window.TONI_ACTIVE_PROJECT_ID;
  if (!title || !projectId) return;
  try {
    // V2/C1: Anlegen ueber RPC. assigned_to wird serverseitig nur beruecksichtigt,
    // wenn der Aufrufer Manager ist; sonst wird der Ersteller automatisch Inhaber.
    await callRpc('create_project_task', {
      p_project_id: projectId,
      p_title: title,
      p_description: description,
      p_assigned_to: assigned_to || null,
      p_due_date: due_date
    });
    closeAddTaskModal();
    loadProjectTasks(projectId);
    loadProjects();
    loadOpenTasksFromProjects();
  } catch (e) {
    console.warn('TONI Aufgabe anlegen:', e);
    alert(e.message || 'Aufgabe konnte nicht angelegt werden.');
  }
}

// ══════════════════════════════════════
// PROJEKT ANLEGEN
// ══════════════════════════════════════
function selectProjectType(type) {
  // V2: Solo/Gruppe-Unterscheidung entfernt. Funktion bleibt nur, um das
  // versteckte Typ-Feld konsistent zu setzen (Default 'solo'); kein UI mehr.
  const el = document.getElementById('new-project-type');
  if (el) el.value = type || 'solo';
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
    // V2-Fix: Bei Nutzerwechsel (andere Profil-ID) die alte Projektliste
    // sofort verwerfen, damit kein fremdes Projekt aus dem alten State
    // haengen bleibt. Greift unabhaengig vom SIGNED_OUT-Event.
    if (profile?.id && window.TONI_LAST_PROFILE_ID && window.TONI_LAST_PROFILE_ID !== profile.id) {
      window.TONI_PROJECTS = [];
      const w1 = document.getElementById('toni-projects-list');
      if (w1) w1.innerHTML = '<div style="color:var(--color-text-tertiary);font-size:13px;padding:12px 0">Projekte werden geladen…</div>';
      const w2 = document.getElementById('toni-open-tasks-list');
      if (w2) w2.innerHTML = '<div style="color:var(--color-text-tertiary);font-size:13px;padding:8px 0">Wird geladen…</div>';
    }
    if (profile?.id) { window.TONI_LAST_PROFILE_ID = profile.id; done = false; setTimeout(tryLoad, 200); }
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

  // V2-Fix (robust, unabhängig von applyAuthProfile-Kette):
  // Ein dauerhafter Watcher vergleicht die aktuelle Profil-ID mit der
  // zuletzt geladenen. Ändert sie sich (Nutzerwechsel), wird die alte
  // Projektliste sofort verworfen und mit frischem Token neu geladen.
  // Das greift auch, wenn auth.js TONI_AUTH_PROFILE direkt setzt, ohne
  // applyAuthProfile aufzurufen.
  setInterval(() => {
    const curId = window.TONI_AUTH_PROFILE?.id || null;
    if (curId && curId !== window.TONI_PROJECTS_LOADED_FOR) {
      window.TONI_PROJECTS_LOADED_FOR = curId;
      window.TONI_PROJECTS = [];
      const w1 = document.getElementById('toni-projects-list');
      if (w1) w1.innerHTML = '<div style="color:var(--color-text-tertiary);font-size:13px;padding:12px 0">Projekte werden geladen…</div>';
      loadProjects();
    }
    // Abmeldung: Profil weg -> Liste leeren
    if (!curId && window.TONI_PROJECTS_LOADED_FOR) {
      window.TONI_PROJECTS_LOADED_FOR = null;
      window.TONI_PROJECTS = [];
      const w1 = document.getElementById('toni-projects-list');
      if (w1) w1.innerHTML = '';
    }
  }, 800);
})();
