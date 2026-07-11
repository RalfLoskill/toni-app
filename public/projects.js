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
  // V31: Profilbilder lagen als Base64 in avatar_data_url. Performance-Fix (V120):
  // Storage-URL (avatar_url) bevorzugen – cachebar und parallel ladbar. Das
  // schwere Base64 (avatar_data_url) nur noch als Fallback, falls keine URL da ist.
  const img = member.avatar_url || member.avatar_data_url;
  if (img) {
    return `<img src="${img}" loading="lazy" decoding="async" width="${size}" height="${size}" style="width:${size}px;height:${size}px;border-radius:50%;object-fit:cover;border:2px solid var(--color-background-primary)" title="${escapeHtml(member.first_name||member.display_name||'')}">`;
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
  { bg: '#E6F1FB', border: '#85B7EB', text: '#0C447C', bgGradient: 'linear-gradient(135deg,#EAF4FD 0%,#CFE6FB 55%,#AED4F7 100%)' },  // Blau
  { bg: '#E1F5EE', border: '#5DCAA5', text: '#085041', bgGradient: 'linear-gradient(135deg,#E6F8F1 0%,#C6EEDD 55%,#A8E5CC 100%)' },  // Teal
  { bg: '#FAEEDA', border: '#EF9F27', text: '#633806', bgGradient: 'linear-gradient(135deg,#FCF3E4 0%,#FAE3BC 55%,#F8D69C 100%)' },  // Amber
  { bg: '#EEEDFE', border: '#AFA9EC', text: '#3C3489', bgGradient: 'linear-gradient(135deg,#F1F0FE 0%,#DEDBFA 55%,#CBC6F6 100%)' },  // Lila
  { bg: '#FBEAF0', border: '#ED93B1', text: '#72243E', bgGradient: 'linear-gradient(135deg,#FCEFF4 0%,#F7D5E2 55%,#F3C0D3 100%)' },  // Pink
  { bg: '#FAECE7', border: '#F0997B', text: '#712B13', bgGradient: 'linear-gradient(135deg,#FCF0EB 0%,#F8D8CC 55%,#F5C3B0 100%)' },  // Coral
  { bg: '#EAF3DE', border: '#97C459', text: '#27500A', bgGradient: 'linear-gradient(135deg,#EFF7E5 0%,#DBEDC4 55%,#C8E5A8 100%)' },  // Grün
  { bg: '#F1EFE8', border: '#B4B2A9', text: '#444441', bgGradient: 'linear-gradient(135deg,#F5F3EE 0%,#E6E4DB 55%,#D7D4C9 100%)' },  // Grau
];

const PROJECT_PALETTES = [
  { bg: '#E6F1FB', bar: '#378ADD', border: '#B5D4F4', bgGradient: 'linear-gradient(135deg,#EAF4FD 0%,#D6E9FB 55%,#C5E0F7 100%)' },
  { bg: '#E1F5EE', bar: '#1D9E75', border: '#9FE1CB', bgGradient: 'linear-gradient(135deg,#E6F8F1 0%,#CFF0E2 55%,#BCEAD6 100%)' },
  { bg: '#FAEEDA', bar: '#EF9F27', border: '#FAC775', bgGradient: 'linear-gradient(135deg,#FCF3E4 0%,#FAE6C5 55%,#F8DBAC 100%)' },
  { bg: '#EEEDFE', bar: '#7F77DD', border: '#CECBF6', bgGradient: 'linear-gradient(135deg,#F1F0FE 0%,#E0DEFB 55%,#D2CFF8 100%)' },
  { bg: '#FBEAF0', bar: '#D4537E', border: '#F4C0D1', bgGradient: 'linear-gradient(135deg,#FCEFF4 0%,#F8DBE6 55%,#F5CAD9 100%)' },
  { bg: '#FAECE7', bar: '#D85A30', border: '#F5C4B3', bgGradient: 'linear-gradient(135deg,#FCF0EB 0%,#F8DDD2 55%,#F6CDBD 100%)' },
  { bg: '#E8F6E9', bar: '#3FA65A', border: '#B6E2BC', bgGradient: 'linear-gradient(135deg,#EDF8EE 0%,#D8EFDB 55%,#C6E8CB 100%)' },
  { bg: '#FEF6E0', bar: '#CFA70F', border: '#F1DE9A', bgGradient: 'linear-gradient(135deg,#FEF8E6 0%,#FBEEC2 55%,#F8E5A6 100%)' },
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

// === Variante A: kräftige, dunkle Verläufe (weiße Schrift lesbar) ===
// Deterministisch pro Projekt-ID -> gleiche Reihenfolge wie helle Palette.
const PROJECT_GRADIENTS_DARK_V114 = [
  { grad: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 55%,#1e293b 100%)', accent: '#1e3a8a', bar: '#60a5fa' }, // Royalblau
  { grad: 'linear-gradient(135deg,#0f766e 0%,#14b8a6 55%,#134e4a 100%)', accent: '#0f766e', bar: '#5eead4' }, // Teal
  { grad: 'linear-gradient(135deg,#b45309 0%,#f59e0b 55%,#78350f 100%)', accent: '#b45309', bar: '#fcd34d' }, // Bernstein
  { grad: 'linear-gradient(135deg,#3730a3 0%,#6366f1 55%,#1e1b4b 100%)', accent: '#3730a3', bar: '#a5b4fc' }, // Indigo
  { grad: 'linear-gradient(135deg,#9d174d 0%,#db2777 55%,#500724 100%)', accent: '#9d174d', bar: '#f9a8d4' }, // Magenta
  { grad: 'linear-gradient(135deg,#7c2d12 0%,#ea580c 55%,#431407 100%)', accent: '#7c2d12', bar: '#fdba74' }, // Orange-Rost
  { grad: 'linear-gradient(135deg,#047857 0%,#10b981 55%,#064e3b 100%)', accent: '#047857', bar: '#6ee7b7' }, // Smaragd
  { grad: 'linear-gradient(135deg,#374151 0%,#4b5563 55%,#111827 100%)', accent: '#374151', bar: '#cbd5e1' }  // Anthrazit
];
function getProjectGradientDarkV114(projectId) {
  const idx = Math.abs((projectId||'').split('').reduce((a,c) => a + c.charCodeAt(0), 0)) % PROJECT_GRADIENTS_DARK_V114.length;
  return PROJECT_GRADIENTS_DARK_V114[idx];
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
    if (wrap.dataset.projSignature !== 'EMPTY') {
      wrap.innerHTML = `<div style="color:var(--color-text-tertiary);font-size:13px;padding:14px 0;text-align:center">
        Noch keine Projekte vorhanden.<br>
        <span style="color:#185FA5;cursor:pointer;font-size:13px" onclick="openCreateProjectModal()">+ Erstes Projekt anlegen</span>
      </div>`;
      wrap.dataset.projSignature = 'EMPTY';
    }
    return;
  }

  // Signatur-Guard gegen Zittern: nur neu schreiben, wenn sich darstellungsrelevante
  // Projektdaten ändern (Reihenfolge, Titel, Fortschritt, Mitglieder, Blocker, Deadline).
  const signature = JSON.stringify(projects.map(p => ({
    id: p.id,
    t: p.title,
    d: p.description || '',
    done: p.task_done, total: p.task_total,
    mc: p.member_count || 0,
    mem: (p.members || []).slice(0, 5).map(m => (m && (m.id || m.user_id || m.display_name)) || ''),
    cb: p.created_by || '',
    blk: !!p.has_blocker, off: !!p.is_official, ty: p.type || '',
    dl: p.deadline || ''
  })));
  // DOM-Realitätscheck: Der Guard darf nur greifen, wenn der Container auch
  // wirklich schon gerenderte Projektkacheln enthält. Beim Erstaufruf steht dort
  // noch der HTML-Platzhalter "Projekte werden geladen…" – Signatur und DOM können
  // dann auseinanderlaufen (z.B. nach Token-Retry), sodass die Kacheln nie erscheinen.
  const hasRenderedCards = !!wrap.querySelector('.toni-project-card-v90, [data-project-id]');
  if (wrap.dataset.projSignature === signature && hasRenderedCards) {
    return; // nichts geändert UND bereits gerendert -> kein Rebuild, kein Zittern
  }
  wrap.dataset.projSignature = signature;

  wrap.innerHTML = projects.map(p => {
    const pct = p.task_total > 0 ? Math.round((p.task_done / p.task_total) * 100) : 0;
    const g = getProjectGradientDarkV114(p.id);
    const memberCount = p.member_count || (p.members || []).length || 0;

    const badges = [
      p.is_official ? `<span class="journey-tile-chip" style="background:rgba(255,255,255,.9);color:#475569">Offiziell</span>` : '',
      p.has_blocker ? `<span class="journey-tile-chip" style="background:rgba(255,255,255,.9);color:#854F0B;border:0.5px solid #FAC775">⚠ Blocker</span>` : '',
      p.type==='group' ? `<span class="journey-tile-chip" style="background:rgba(255,255,255,.9);color:#475569">Gruppe</span>` : '',
    ].filter(Boolean).join(' ');

    const overdue = p.deadline && isOverdue(p.deadline) && p.status !== 'completed';
    const deadlineChip = p.deadline
      ? `<span class="journey-tile-chip" style="background:rgba(255,255,255,.9);color:${overdue?'#b91c1c':'#475569'};font-weight:${overdue?800:700}">📅 ${formatDate(p.deadline)}${overdue?' · überfällig':''}</span>`
      : '';

    // Mitglieder mit Avatar + Name + Klasse (wie im Vorbild). Inhaber (created_by)
    // zuerst und mit Krone/Ring markiert. So viele wie passen, Rest als "+N".
    const allMembers = (p.members || []);
    const ownerId = p.created_by;
    const sortedMembers = allMembers.slice().sort((a, b) => {
      const ao = (a && a.id === ownerId) ? 0 : 1;
      const bo = (b && b.id === ownerId) ? 0 : 1;
      return ao - bo;
    });
    const MAX_AVATARS = 5;
    const shown = sortedMembers.slice(0, MAX_AVATARS);
    const restCount = Math.max(0, (memberCount || sortedMembers.length) - shown.length);
    const memberCols = shown.map(m => {
      const isOwner = m && m.id === ownerId;
      const name = escapeHtml(memberPrimaryName(m));
      const sub  = escapeHtml(memberSubLabel(m));
      const ring = isOwner ? "box-shadow:0 0 0 2px #f5b301;border-radius:50%;" : "";
      const crown = isOwner
        ? `<span title="Projektinhaber" style="position:absolute;top:-7px;right:-5px;font-size:13px;line-height:1;filter:drop-shadow(0 1px 1px rgba(0,0,0,.35))">👑</span>`
        : "";
      return `<div style="display:flex;flex-direction:column;align-items:center;gap:3px;width:64px;flex-shrink:0">
        <div style="position:relative;${ring}display:inline-flex">${avatarHtml(m, 40)}${crown}</div>
        <span style="font-size:11px;font-weight:700;color:#fff;line-height:1.2;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 2px rgba(0,0,0,.4)">${name}</span>
        <span style="font-size:10px;color:rgba(255,255,255,.85);line-height:1.2;text-align:center;text-shadow:0 1px 2px rgba(0,0,0,.4)">${sub}</span>
      </div>`;
    }).join('');
    const restCol = restCount > 0
      ? `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.85);color:#334155;font-size:12px;font-weight:800;flex-shrink:0;align-self:flex-start;margin-top:2px">+${restCount}</div>`
      : '';
    const membersRow = (shown.length || restCount)
      ? `<div style="display:flex;align-items:flex-start;gap:10px;flex-wrap:wrap;margin-top:12px">${memberCols}${restCol}</div>`
      : '';

    // Fuß-Metadaten (Deadline, Blocker, Gruppe) für den weißen Fußbereich.
    const footItems = [
      deadlineChip,
      p.has_blocker ? `<span class="journey-tile-chip" style="background:#fff7ec;color:#854F0B;border:0.5px solid #FAC775">⚠ Blocker</span>` : '',
      p.is_official ? `<span class="journey-tile-chip" style="background:#f1f5f9;color:#475569">Offiziell</span>` : '',
      p.type==='group' ? `<span class="journey-tile-chip" style="background:#f1f5f9;color:#475569">Gruppe</span>` : '',
    ].filter(Boolean).join(' ');

    // Projektkachel: Verlauf-Hintergrund, Glas-Box (Titel+Prozent), Fortschritts-
    // balken, Mitglieder (Name+Klasse), weißer abgesetzter Fußbereich.
    return `<div data-project-id="${p.id}" onclick="openProjectModal('${p.id}')"
      class="journey-tile journey-tile-cover-v112 has-cover journey-tile-clickable toni-proj-tile-v115" style="background:${g.grad}" role="button" tabindex="0" title="Projekt öffnen">
      <div class="toni-proj-tile-body-v115">
        <div class="toni-proj-glass-v115">
          <div class="toni-proj-glass-head-v115">
            <div class="toni-proj-title-v115">${escapeHtml(p.title)}</div>
            <div class="toni-proj-pct-v115" style="color:${g.accent}">${pct}%</div>
          </div>
          ${p.description ? `<div class="toni-proj-desc-v115">${escapeHtml(p.description)}</div>` : ''}
        </div>
        <div class="toni-proj-bar-v115"><div class="toni-proj-bar-fill-v115" style="width:${pct}%;background:${g.bar}"></div></div>
        ${membersRow}
      </div>
      ${footItems ? `<div class="toni-proj-foot-v115">${footItems}</div>` : ''}
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

// Öffnet den Dialog für eine neue eigene Aufgabe (gleiches Design wie Projektaufgabe).
function openPersonalTaskModal() {
  const t = document.getElementById('add-personal-task-title');
  const d = document.getElementById('add-personal-task-desc');
  const due = document.getElementById('add-personal-task-due-date');
  if (t) t.value = '';
  if (d) d.value = '';
  if (due) due.value = '';
  document.getElementById('add-personal-task-modal')?.classList.add('open');
  setTimeout(() => t?.focus(), 50);
}

function closePersonalTaskModal() {
  document.getElementById('add-personal-task-modal')?.classList.remove('open');
}

// Legt die eigene Aufgabe an (Titel Pflicht, Beschreibung + Fällig bis optional).
async function savePersonalTask() {
  const titleEl = document.getElementById('add-personal-task-title');
  const descEl = document.getElementById('add-personal-task-desc');
  const dueEl = document.getElementById('add-personal-task-due-date');
  const title = (titleEl?.value || '').trim();
  if (!title) { titleEl?.focus(); return; }
  try {
    const token = await getToken();
    if (!token) return;
    const ownerId = (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.id) || window.TONI_ACTIVE_PROFILE_ID;
    if (!ownerId) { console.warn('Keine Profil-ID für eigene Aufgabe'); return; }
    const row = { owner_id: ownerId, title, status: 'todo' };
    const desc = (descEl?.value || '').trim();
    if (desc) row.description = desc;
    if (dueEl?.value) row.due_date = dueEl.value; // 'YYYY-MM-DD'
    await fetch(`${window.SUPABASE_URL}/rest/v1/personal_tasks`, {
      method: 'POST',
      headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify(row)
    });
    closePersonalTaskModal();
    await loadPersonalTasks();
    renderWeeklyPlan();
  } catch (e) { console.warn('TONI eigene Aufgabe anlegen:', e); }
}

// Alt: Direkter Prompt – jetzt durch das Modal ersetzt. Bleibt als Weiterleitung,
// falls noch irgendwo aufgerufen.
async function addPersonalTask() {
  openPersonalTaskModal();
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
      const overdue = t.due_date && wpIsOverdue(t.due_date) && t.status !== 'done';
      items.push({
        source: 'personal', title: t.title || '', col,
        meta: 'Eigene Aufgabe',
        description: t.description || '',
        dueDate: t.due_date || '',
        note: overdue ? 'überfällig' : '',
        urgent: !!overdue, overdue: !!overdue, personalId: t.id,
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
    // Variante A: weiße Karte, dicker DOPPELTER farbiger Balken links (Quelle).
    const del = it.source === 'personal' && it.personalId
      ? `<span onclick="event.stopPropagation();deletePersonalTask('${it.personalId}')" title="Löschen" style="margin-left:auto;color:var(--color-text-tertiary);cursor:pointer;font-size:12px"><i class="ti ti-x"></i></span>`
      : '';
    // Eigene Aufgaben: Beschreibung + Fälligkeit unter der Meta-Zeile zeigen
    const descHtml = (it.source === 'personal' && it.description)
      ? `<div style="font-size:11px;color:var(--color-text-secondary);margin-top:3px;line-height:1.35">${escapeHtml(it.description)}</div>`
      : '';
    const dueHtml = (it.source === 'personal' && it.dueDate)
      ? `<div style="font-size:11px;color:${it.overdue?'#993C1D':'var(--color-text-tertiary)'};margin-top:2px"><i class="ti ti-calendar" style="font-size:11px;vertical-align:-1px"></i> ${typeof formatDate==='function'?formatDate(it.dueDate):it.dueDate}${it.overdue?' · überfällig':''}</div>`
      : '';
    return `<div class="k-card${done?' done-c':''}" ${click} style="background:#ffffff;border-left:7px double ${c.border};${done?'opacity:.55':''}">
      <div class="k-card-title" style="${done?'text-decoration:line-through;':''}">${escapeHtml(it.title)}${done?'':badge}</div>
      <div style="display:flex;align-items:center;gap:5px;font-size:11px;color:${c.text}">
        <i class="ti ${c.icon}" style="font-size:13px"></i><span style="opacity:.85">${escapeHtml(it.meta)}</span>${del}
      </div>
      ${descHtml}${dueHtml}
    </div>`;
  };

  const colDef = [
    { key:'todo', title:'Offen',     dot:'#378ADD', headBg:'#E6F1FB', headText:'#185FA5', grad:'linear-gradient(135deg,#3b82f6,#2563eb)', empty:{icon:'ti-inbox', text:'Nichts offen'} },
    { key:'wip',  title:'In Arbeit', dot:'#EF9F27', headBg:'#FAEEDA', headText:'#854F0B', grad:'linear-gradient(135deg,#f59e0b,#d97706)', empty:{icon:'ti-coffee', text:'Nichts in Arbeit'} },
    { key:'done', title:'Erledigt',  dot:'#1D9E75', headBg:'#E1F5EE', headText:'#0F6E56', grad:'linear-gradient(135deg,#22c55e,#16a34a)', empty:{icon:'ti-checks', text:'Noch nichts erledigt'} }
  ];

  // Fortschrittsleiste: erledigt / gesamt (offen + in Arbeit + erledigt)
  const nDone = (byCol.done || []).length;
  const nTotal = (byCol.todo || []).length + (byCol.wip || []).length + nDone;
  const pct = nTotal ? Math.round((nDone / nTotal) * 100) : 0;
  const progressBar = `
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <div style="flex:1;height:8px;background:#fff;border-radius:999px;overflow:hidden;border:1px solid var(--border)">
        <div style="width:${pct}%;height:100%;background:#1D9E75;border-radius:999px;transition:width .3s"></div>
      </div>
      <span style="font-size:12px;color:var(--color-text-secondary);white-space:nowrap">${nDone} von ${nTotal} erledigt</span>
    </div>`;

  wrap.innerHTML = progressBar + `<div class="kanban-grid" style="grid-template-columns:repeat(3,minmax(180px,1fr));min-width:560px">
    ${colDef.map(cd => {
      let list = byCol[cd.key] || [];
      let extraNote = '';
      // in "Erledigt" nur die letzten 5 zeigen
      if (cd.key === 'done' && list.length > 5) {
        const hidden = list.length - 5;
        list = list.slice(0, 5);
        extraNote = `<div style="font-size:11px;color:var(--color-text-tertiary);padding:4px 2px;text-align:center">+ ${hidden} weitere erledigt</div>`;
      }
      const cards = list.length ? list.map(cardHtml).join('') :
        `<div style="padding:22px 10px;display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--color-text-tertiary)">
          <i class="ti ${cd.empty.icon}" style="font-size:20px"></i>
          <span style="font-size:11px;text-align:center">${cd.empty.text}</span>
        </div>`;
      const addBtn = cd.key === 'todo'
        ? `<div onclick="openPersonalTaskModal()" style="margin-top:8px;font-size:12px;color:#534AB7;cursor:pointer;text-align:center;padding:6px;border:1px dashed #c7d2fe;border-radius:8px"><i class="ti ti-plus" style="font-size:13px"></i> Eigene Aufgabe</div>`
        : '';
      const count = (byCol[cd.key] || []).length;
      return `<div class="kanban-col col-${cd.key==='wip'?'wip':cd.key==='done'?'done':'todo'}">
        <div class="k-header" style="display:flex;align-items:center;justify-content:space-between;background:${cd.grad};border-radius:10px;padding:9px 12px;box-shadow:0 2px 6px rgba(15,23,42,.10)">
          <span class="k-title" style="display:flex;align-items:center;gap:6px;color:#fff;font-weight:800;text-transform:uppercase;letter-spacing:.04em">${cd.title}</span>
          <span class="k-badge" style="background:rgba(255,255,255,.25);color:#fff;font-weight:800">${count}</span>
        </div>
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

  const newHtml = `
    <div style="background:#E6F1FB;border-radius:0 10px 10px 10px;padding:10px 13px;font-size:13px;color:#0C447C;line-height:1.6;margin-bottom:${chips?'10px':'0'}">${hint}</div>
    ${chips ? `<div style="display:flex;gap:6px;flex-wrap:wrap">${chips}</div>` : ''}`;

  // Signatur-Guard gegen Zittern: nur neu schreiben, wenn sich der Hinweistext/Chip
  // tatsächlich ändert (renderToniHintFromTasks wird mehrfach getriggert).
  if (wrap.dataset.hintSignature === newHtml) {
    return;
  }
  wrap.dataset.hintSignature = newHtml;
  wrap.innerHTML = newHtml;
}

// ──────────────────────────────────────
function openProjectModal(projectId) {
  const p = window.TONI_PROJECTS.find(x => x.id === projectId);
  if (!p) return;
  window.TONI_ACTIVE_PROJECT_ID = projectId;

  const pct = p.task_total > 0 ? Math.round((p.task_done / p.task_total) * 100) : 0;

  // Kopf trägt denselben dunklen Verlauf wie die Projektkachel.
  const headerGrad = (typeof getProjectGradientDarkV114 === 'function')
    ? getProjectGradientDarkV114(p.id).grad
    : 'linear-gradient(135deg,#3730a3,#6366f1)';
  const headerEl = document.querySelector('#project-modal .lr-modal-header');
  if (headerEl) headerEl.style.background = headerGrad;

  document.getElementById('project-modal-title').textContent = p.title;

  // Header mit Mitgliedern (Glas-Box, dunkle Schrift). Kein Fortschrittsbalken mehr (nur in der Kachel).
  const members = p.members || [];
  const avatarsHtml = members.map(m => memberBlock(m, 40)).join('');
  const inviteCode = p.invite_code ? `<span style="font-size:11px;background:rgba(0,0,0,.06);padding:2px 8px;border-radius:8px;font-family:monospace;cursor:pointer;color:#334155" onclick="copyInviteCode('${p.invite_code}')" title="Kopieren">🔗 ${p.invite_code}</span>` : '';
  const deadlineHtml = p.deadline ? `<span style="font-size:12px;color:${isOverdue(p.deadline)?'#A32D2D':'#475569'}">📅 ${formatDate(p.deadline)}</span>` : '';

  // V2/Regel 7: Projektmanager (Ersteller) statt Solo/Gruppe-Unterscheidung.
  const managerProfile = members.find(m => m.id === p.created_by);
  const managerName = managerProfile
    ? (typeof memberPrimaryName === 'function' ? memberPrimaryName(managerProfile) : (managerProfile.first_name||managerProfile.display_name||''))
    : '–';

  document.getElementById('project-modal-sub').innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:4px">
      <span style="font-size:12px;color:#475569">👤 Projektmanager: <strong style="color:#1e293b">${escapeHtml(managerName)}</strong></span>
      ${deadlineHtml}
      ${inviteCode}
    </div>
    <div style="display:flex;gap:10px;margin-top:10px;overflow-x:auto;padding-bottom:4px">${avatarsHtml}</div>
    <div style="margin-top:8px;font-size:12px;color:#475569">
      ${p.task_done||0} von ${p.task_total||0} Aufgaben erledigt · <strong style="color:#1e293b">${pct}%</strong>
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

    // Datei-Anhänge für alle Aufgaben in EINER Abfrage holen (nicht pro Kachel),
    // um sie als kleine Icons auf den Board-Kacheln anzuzeigen.
    await loadTaskFileBadges(tasks.map(t => t.id));

    renderProjectKanban(tasks);
  } catch (e) {
    console.warn('TONI Aufgaben laden:', e);
    if (kanban) kanban.innerHTML = `<div style="color:#A32D2D;font-size:13px;padding:20px">Fehler beim Laden: ${escapeHtml(e.message)}</div>`;
  }
}

// ══════════════════════════════════════
// DATEI-ANHÄNGE: Badges auf Board-Kacheln
// ══════════════════════════════════════
// Map task_id -> Array von Datei-Metadaten ({mime_type, file_name}).
window.TONI_TASK_FILE_BADGES = window.TONI_TASK_FILE_BADGES || {};

async function loadTaskFileBadges(taskIds){
  window.TONI_TASK_FILE_BADGES = {};
  const ids = (taskIds || []).filter(Boolean);
  if(!ids.length) return;
  try{
    const token = await getToken();
    if(!token) return;
    // PostgREST IN-Filter: id=in.(a,b,c)
    const inList = `(${ids.join(',')})`;
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/project_task_files?task_id=in.${inList}&select=task_id,mime_type,file_name&order=created_at.asc`,
      { headers: { 'apikey': window.SUPABASE_ANON_KEY, 'Authorization': 'Bearer ' + token } }
    );
    if(!res.ok) return; // Tabelle evtl. noch nicht angelegt -> keine Badges, kein Fehler
    const rows = await res.json();
    const map = {};
    rows.forEach(r => { (map[r.task_id] = map[r.task_id] || []).push(r); });
    window.TONI_TASK_FILE_BADGES = map;
  }catch(e){
    console.warn('Datei-Badges laden fehlgeschlagen:', e);
    window.TONI_TASK_FILE_BADGES = {};
  }
}

// Kleiner Icon-Streifen für eine Kachel (max. 4 Icons + Zähler).
function taskFileBadgesHtml(taskId){
  const files = (window.TONI_TASK_FILE_BADGES || {})[taskId] || [];
  if(!files.length) return '';
  const shown = files.slice(0, 4);
  const more = files.length > 4 ? `<span style="font-size:10px;color:var(--color-text-secondary);align-self:center">+${files.length-4}</span>` : '';
  const chips = shown.map(f => {
    const ic = toniTaskFileIcon(f.mime_type, f.file_name);
    const lbl = ic.icon.length > 2 ? ic.icon : '';
    // Kompakter farbiger Chip: Text-Label (PDF/DOC/XLS) oder Symbol (Bild/Datei)
    return `<span title="${escapeHtml(f.file_name||'')}" style="display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:16px;padding:0 3px;border-radius:4px;background:${ic.bg};color:${ic.fg};font-size:${lbl?'8px':'10px'};font-weight:700;letter-spacing:.2px;line-height:1">${lbl || ic.icon}</span>`;
  }).join('');
  return `<div style="display:flex;align-items:center;gap:3px;margin-top:6px" title="${files.length} Datei(en) angehängt">
    <span style="font-size:10px;color:var(--color-text-secondary)">📎</span>${chips}${more}
  </div>`;
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
    todo:        { label: 'Offen',     color: '#378ADD', bg: '#E6F1FB', grad: 'linear-gradient(135deg,#3b82f6,#2563eb)' },
    in_progress: { label: 'In Arbeit', color: '#EF9F27', bg: '#FAEEDA', grad: 'linear-gradient(135deg,#f59e0b,#d97706)' },
    review:      { label: 'Review',    color: '#7F77DD', bg: '#EEEDFE', grad: 'linear-gradient(135deg,#8b5cf6,#7c3aed)' },
    done:        { label: 'Erledigt',  color: '#639922', bg: '#EAF3DE', grad: 'linear-gradient(135deg,#22c55e,#16a34a)' },
  };

  const wrap = document.getElementById('project-kanban');
  if (!wrap) return;

  wrap.innerHTML = Object.entries(cols).map(([col, colTasks]) => {
    const cfg = colConfig[col];
    return `<div style="flex:1;min-width:150px;max-width:260px">
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;padding:8px 11px;background:${cfg.grad};border-radius:10px;box-shadow:0 2px 6px rgba(15,23,42,.10)">
        <span style="font-size:11px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:.06em;flex:1">${cfg.label}</span>
        <span style="font-size:11px;font-weight:800;color:#fff;background:rgba(255,255,255,.25);min-width:20px;height:20px;border-radius:10px;display:inline-flex;align-items:center;justify-content:center;padding:0 6px">${colTasks.length}</span>
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
    ? `<div style="font-size:11px;color:${dueColor};margin-top:3px;opacity:.85">${isOverdue(task.due_date)&&col!=='done'?'⚠ ':''}${formatDate(task.due_date)}</div>`
    : '';
  const blockerHtml = task.blocker
    ? `<div style="font-size:11px;color:#993C1D;background:rgba(255,255,255,.6);padding:3px 7px;border-radius:6px;margin-top:5px;line-height:1.3;border:0.5px solid #F0997B">⚠️ ${escapeHtml(task.blocker)}</div>`
    : '';
  const doneStyle = col === 'done' ? 'text-decoration:line-through;opacity:.6' : '';

  const assigneeHtml = profile
    ? `<div style="display:flex;align-items:center;gap:6px;margin-top:5px">${avatarHtml(profile,22)}<div style="display:flex;flex-direction:column;line-height:1.15"><span style="font-size:11px;font-weight:600;color:${pal.text}">${escapeHtml(memberPrimaryName(profile))}</span><span style="font-size:10px;color:${pal.text};opacity:.7">${escapeHtml(memberSubLabel(profile))}</span></div></div>`
    : '';

  // ── Status-Steuerung ──────────────────────────────
  const canChange   = toniCanChangeTaskStatus(task);
  const nextCol     = TONI_TASK_NEXT_COL[col];          // null bei done
  const prevCol     = TONI_TASK_PREV_COL[col];          // null bei todo
  const fwdLabel    = TONI_TASK_FWD_LABEL[col] || 'Start';
  const fwdEnabled  = canChange && !!nextCol;           // done -> kein Vorwaerts
  const resetEnabled = canChange && !!prevCol;          // todo -> kein Zurueck

  const fwdBtn = `<button ${fwdEnabled ? `onclick="event.stopPropagation();moveProjectTask('${task.id}','${nextCol}')"` : 'disabled'}
      style="flex:1;font-size:11px;padding:4px 9px;border:0.5px solid ${pal.border};border-radius:10px;font-weight:600;
      background:${fwdEnabled ? 'rgba(255,255,255,.65)' : 'transparent'};color:${pal.text};
      cursor:${fwdEnabled ? 'pointer' : 'default'};opacity:${fwdEnabled ? '1' : '.4'}">
      ${fwdLabel}${nextCol ? ' →' : ''}
    </button>`;

  const resetBtn = `<button ${resetEnabled ? `onclick="event.stopPropagation();moveProjectTask('${task.id}','${prevCol}')"` : 'disabled'}
      title="Zurücksetzen"
      style="font-size:11px;padding:4px 9px;border:0.5px solid ${pal.border};border-radius:10px;font-weight:600;
      background:transparent;color:${pal.text};
      cursor:${resetEnabled ? 'pointer' : 'default'};opacity:${resetEnabled ? '.8' : '.3'}">
      ↺
    </button>`;

  // Blockierte Aufgaben: roter Rand + Warnsymbol oben rechts
  const isBlocked = !!task.blocker;
  const cardBg = pal.bgGradient || pal.bg;
  const cardBorder = isBlocked ? '2px solid #D8472B' : `0.5px solid ${pal.border}`;
  const blockerBadge = isBlocked
    ? `<span style="position:absolute;top:6px;right:8px;font-size:13px" title="${escapeHtml(task.blocker)}">⛔</span>`
    : '';

  return `<div style="position:relative;background:${cardBg};border:${cardBorder};border-radius:10px;padding:10px 11px;margin-bottom:6px;cursor:pointer;box-shadow:0 1px 4px rgba(15,23,42,.06);transition:box-shadow .15s, transform .15s"
    onclick="openTaskDetail('${task.id}')"
    onmouseover="this.style.boxShadow='0 3px 10px rgba(15,23,42,.12)';this.style.transform='translateY(-1px)'" onmouseout="this.style.boxShadow='0 1px 4px rgba(15,23,42,.06)';this.style.transform='translateY(0)'">
    ${blockerBadge}
    <div style="font-size:13px;font-weight:600;color:${pal.text};line-height:1.3;${doneStyle};${isBlocked?'padding-right:18px':''}">${escapeHtml(task.title)}</div>
    ${assigneeHtml}${dueHtml}${blockerHtml}${taskFileBadgesHtml(task.id)}
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

    // Dateianhänge initialisieren (Inhaber sieht Upload, alle sehen Download)
    initTaskFiles(task, isOwner);

    document.getElementById('task-detail-modal').classList.add('open');
  } catch (e) { console.warn('TONI Aufgabe öffnen:', e); }
}

function closeTaskDetailModal() {
  document.getElementById('task-detail-modal').classList.remove('open');
  window.TONI_CURRENT_TASK = null;
  // Board neu laden, damit Datei-Badges nach Up-/Download aktuell sind.
  if (window.TONI_ACTIVE_PROJECT_ID) loadProjectTasks(window.TONI_ACTIVE_PROJECT_ID);
}

/* =========================================================
   TONI – Dateianhänge für Projektaufgaben
   - Inhaber lädt hoch (max. 5 Dateien, je max. 10 MB)
   - Alle Projektteilnehmer dürfen herunterladen
   - Nur der Hochladende darf seine eigene Datei entfernen
   Speicher: Supabase Storage Bucket "task-files",
   Metadaten: Tabelle "project_task_files".
   HINWEIS: Bucket + Tabelle + RLS-Policies müssen in Supabase
   eingerichtet sein (siehe SQL 10a). Ohne sie schlagen Up-/Download
   sauber fehl (mit Hinweis), die UI bleibt funktionsfähig.
   ========================================================= */
const TONI_TASKFILE_BUCKET = "task-files";
const TONI_TASKFILE_MAX_MB = 10;
const TONI_TASKFILE_MAX_COUNT = 5;
const TONI_TASKFILE_ALLOWED = [
  "image/", "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
];

let TONI_TASKFILES_STATE = { taskId: null, isOwner: false, files: [] };

function toniTaskFileIcon(type, name){
  const t = (type || "") + " " + (name || "").toLowerCase();
  // Kräftige, gut unterscheidbare Farbflächen (Fläche in Akzentfarbe, Symbol weiß).
  if(/image\//.test(t) || /\.(png|jpe?g|gif|webp|heic)$/.test(t)) return { icon:"🖼", bg:"#185FA5", fg:"#fff", label:"BILD" };
  if(/pdf/.test(t)) return { icon:"PDF", bg:"#C0392B", fg:"#fff", label:"PDF" };
  if(/word|\.docx?$/.test(t)) return { icon:"DOC", bg:"#2B579A", fg:"#fff", label:"DOC" };
  if(/excel|spreadsheet|\.xlsx?$/.test(t)) return { icon:"XLS", bg:"#1E7145", fg:"#fff", label:"XLS" };
  return { icon:"📎", bg:"#5F5E5A", fg:"#fff", label:"DATEI" };
}

function toniFormatBytes(bytes){
  const b = Number(bytes) || 0;
  if(b < 1024) return b + " B";
  if(b < 1024*1024) return Math.round(b/1024) + " KB";
  return (b/(1024*1024)).toFixed(1).replace(".", ",") + " MB";
}

async function initTaskFiles(task, isOwner){
  TONI_TASKFILES_STATE = { taskId: task.id, isOwner: !!isOwner, files: [] };
  const dropzone = document.getElementById("ptask-files-dropzone");
  const input = document.getElementById("ptask-file-input");
  const listEl = document.getElementById("ptask-files-list");
  const hintEl = document.getElementById("ptask-files-hint");
  if(listEl) listEl.innerHTML = `<div style="font-size:12px;color:var(--color-text-tertiary)">Dateien werden geladen …</div>`;
  if(hintEl) hintEl.textContent = "";

  // Ablagezone nur für den Inhaber
  if(dropzone) dropzone.style.display = isOwner ? "" : "none";

  // Inhaber-Interaktionen einmalig verdrahten
  if(isOwner && dropzone && input && !dropzone.dataset.wired){
    dropzone.dataset.wired = "1";
    dropzone.addEventListener("click", ()=> input.click());
    input.addEventListener("change", ()=>{ handleTaskFileSelection(input.files); input.value = ""; });
    dropzone.addEventListener("dragover", e=>{ e.preventDefault(); dropzone.style.background = "var(--color-background-secondary)"; });
    dropzone.addEventListener("dragleave", ()=>{ dropzone.style.background = "var(--color-background-primary)"; });
    dropzone.addEventListener("drop", e=>{
      e.preventDefault();
      dropzone.style.background = "var(--color-background-primary)";
      handleTaskFileSelection(e.dataTransfer.files);
    });
  }

  await loadTaskFiles();
}

async function loadTaskFiles(){
  const taskId = TONI_TASKFILES_STATE.taskId;
  const listEl = document.getElementById("ptask-files-list");
  if(!taskId || !listEl) return;
  try{
    const res = await fetch(
      `${window.SUPABASE_URL}/rest/v1/project_task_files?task_id=eq.${taskId}&order=created_at.asc&select=*`,
      { headers: await toniSupabaseHeaders() }
    );
    if(!res.ok) throw new Error("HTTP " + res.status);
    TONI_TASKFILES_STATE.files = await res.json();
  }catch(e){
    console.warn("Dateien laden fehlgeschlagen:", e);
    TONI_TASKFILES_STATE.files = [];
  }
  renderTaskFiles();
}

function renderTaskFiles(){
  const listEl = document.getElementById("ptask-files-list");
  const countEl = document.getElementById("ptask-files-count");
  const hintEl = document.getElementById("ptask-files-hint");
  const dropzone = document.getElementById("ptask-files-dropzone");
  if(!listEl) return;

  const files = TONI_TASKFILES_STATE.files || [];
  const isOwner = TONI_TASKFILES_STATE.isOwner;
  const myId = window.TONI_ACTIVE_PROFILE_ID || localStorage.getItem("toni_profile_id") || null;

  if(countEl) countEl.textContent = files.length ? `(${files.length})` : "";

  // Upload-Limit erreicht? Ablagezone für Inhaber ausgrauen.
  if(dropzone && isOwner){
    const full = files.length >= TONI_TASKFILE_MAX_COUNT;
    dropzone.style.opacity = full ? ".5" : "1";
    dropzone.style.pointerEvents = full ? "none" : "auto";
  }

  if(!files.length){
    listEl.innerHTML = `<div style="font-size:12px;color:var(--color-text-tertiary)">Noch keine Dateien angehängt.</div>`;
  } else {
    listEl.innerHTML = files.map(f=>{
      const ic = toniTaskFileIcon(f.mime_type, f.file_name);
      const canDelete = isOwner && String(f.uploaded_by) === String(myId);
      const uploaderName = escapeHtml(f.uploader_name || "Teilnehmer");
      const delBtn = canDelete
        ? `<button aria-label="Entfernen" onclick="deleteTaskFile('${f.id}')" style="width:30px;height:30px;flex-shrink:0;border:0.5px solid var(--color-border-secondary);border-radius:6px;background:var(--color-background-primary);color:#A32D2D;cursor:pointer;font-size:15px;line-height:1">🗑️</button>`
        : `<span style="width:30px;flex-shrink:0"></span>`;
      return `<div style="display:flex;align-items:center;gap:10px;background:var(--color-background-primary);border:1px solid #D8D2C4;border-radius:var(--border-radius-md);padding:9px 11px">
        <span style="width:34px;height:34px;flex-shrink:0;border-radius:7px;background:${ic.bg};display:flex;align-items:center;justify-content:center;font-size:${ic.icon.length>2?'14px':'17px'};font-weight:700;color:${ic.fg};letter-spacing:.3px">${ic.icon}</span>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:var(--color-text-primary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escapeHtml(f.file_name)}</div>
          <div style="font-size:11px;color:var(--color-text-tertiary)">${uploaderName} · ${toniFormatBytes(f.file_size)}</div>
        </div>
        <button aria-label="Herunterladen" onclick="downloadTaskFile('${f.id}')" style="width:30px;height:30px;flex-shrink:0;border:0.5px solid var(--color-border-secondary);border-radius:6px;background:var(--color-background-primary);color:#185FA5;cursor:pointer;font-size:15px;line-height:1">⬇️</button>
        ${delBtn}
      </div>`;
    }).join("");
  }

  if(hintEl){
    hintEl.textContent = isOwner
      ? "Nur eigene Dateien können entfernt werden. Alle Teilnehmer können herunterladen."
      : "Du kannst alle Dateien herunterladen. Hochladen kann nur der Aufgaben-Inhaber.";
  }
}

function handleTaskFileSelection(fileList){
  const files = Array.from(fileList || []);
  if(!files.length) return;
  const hintEl = document.getElementById("ptask-files-hint");
  const current = (TONI_TASKFILES_STATE.files || []).length;

  if(current + files.length > TONI_TASKFILE_MAX_COUNT){
    if(hintEl) hintEl.innerHTML = `<span style="color:#A32D2D">Maximal ${TONI_TASKFILE_MAX_COUNT} Dateien pro Aufgabe. Aktuell: ${current}.</span>`;
    return;
  }

  for(const file of files){
    if(file.size > TONI_TASKFILE_MAX_MB * 1024 * 1024){
      if(hintEl) hintEl.innerHTML = `<span style="color:#A32D2D">„${escapeHtml(file.name)}" ist größer als ${TONI_TASKFILE_MAX_MB} MB.</span>`;
      return;
    }
    const okType = TONI_TASKFILE_ALLOWED.some(t => (file.type||"").startsWith(t) || (t.startsWith(".") && file.name.toLowerCase().endsWith(t)));
    if(!okType){
      if(hintEl) hintEl.innerHTML = `<span style="color:#A32D2D">Dateityp von „${escapeHtml(file.name)}" ist nicht erlaubt (Bild, PDF, Word, Excel).</span>`;
      return;
    }
  }
  // Sequenziell hochladen (einfacher für Fehlerbehandlung + Limit-Check)
  uploadTaskFilesSequentially(files);
}

async function uploadTaskFilesSequentially(files){
  const hintEl = document.getElementById("ptask-files-hint");
  const taskId = TONI_TASKFILES_STATE.taskId;
  const myId = window.TONI_ACTIVE_PROFILE_ID || localStorage.getItem("toni_profile_id") || null;
  for(const file of files){
    if(hintEl) hintEl.textContent = `„${file.name}" wird hochgeladen …`;
    try{
      const token = await getToken();
      if(!token) throw new Error("Keine Supabase-Sitzung.");
      const safeName = String(file.name).replace(/[^\w.\-]+/g, "_");
      const path = `${taskId}/${Date.now()}-${safeName}`;
      // 1) Datei in den Storage-Bucket laden
      const up = await fetch(`${window.SUPABASE_URL}/storage/v1/object/${TONI_TASKFILE_BUCKET}/${path}`, {
        method:"POST",
        headers:{ "apikey":window.SUPABASE_ANON_KEY, "Authorization":"Bearer "+token, "Content-Type":file.type||"application/octet-stream", "x-upsert":"true" },
        body:file
      });
      if(!up.ok) throw new Error("Storage " + up.status + ": " + (await up.text()));
      // 2) Metadaten-Zeile anlegen
      const meta = await fetch(`${window.SUPABASE_URL}/rest/v1/project_task_files`, {
        method:"POST",
        headers:{ ...(await toniSupabaseHeaders()), "Prefer":"return=representation" },
        body:JSON.stringify([{ task_id:taskId, storage_path:path, file_name:file.name, file_size:file.size, mime_type:file.type||"", uploaded_by:myId }])
      });
      if(!meta.ok) throw new Error("Meta " + meta.status + ": " + (await meta.text()));
    }catch(e){
      console.warn("Upload fehlgeschlagen:", e);
      if(hintEl) hintEl.innerHTML = `<span style="color:#A32D2D">Upload von „${escapeHtml(file.name)}" fehlgeschlagen.</span>`;
      await loadTaskFiles();
      return;
    }
  }
  if(hintEl) hintEl.textContent = "";
  await loadTaskFiles();
}

async function downloadTaskFile(fileId){
  const f = (TONI_TASKFILES_STATE.files || []).find(x => String(x.id) === String(fileId));
  if(!f) return;
  try{
    const token = await getToken();
    const res = await fetch(`${window.SUPABASE_URL}/storage/v1/object/${TONI_TASKFILE_BUCKET}/${f.storage_path}`, {
      headers:{ "apikey":window.SUPABASE_ANON_KEY, "Authorization":"Bearer "+token }
    });
    if(!res.ok) throw new Error("HTTP " + res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = f.file_name || "datei";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=> URL.revokeObjectURL(url), 4000);
  }catch(e){
    console.warn("Download fehlgeschlagen:", e);
    const hintEl = document.getElementById("ptask-files-hint");
    if(hintEl) hintEl.innerHTML = `<span style="color:#A32D2D">Download fehlgeschlagen.</span>`;
  }
}

async function deleteTaskFile(fileId){
  const f = (TONI_TASKFILES_STATE.files || []).find(x => String(x.id) === String(fileId));
  if(!f) return;
  if(!window.confirm(`Datei „${f.file_name}" wirklich entfernen?`)) return;
  try{
    const token = await getToken();
    // 1) Storage-Objekt löschen
    await fetch(`${window.SUPABASE_URL}/storage/v1/object/${TONI_TASKFILE_BUCKET}/${f.storage_path}`, {
      method:"DELETE",
      headers:{ "apikey":window.SUPABASE_ANON_KEY, "Authorization":"Bearer "+token }
    });
    // 2) Metadaten-Zeile löschen
    await fetch(`${window.SUPABASE_URL}/rest/v1/project_task_files?id=eq.${f.id}`, {
      method:"DELETE",
      headers: await toniSupabaseHeaders()
    });
  }catch(e){
    console.warn("Löschen fehlgeschlagen:", e);
  }
  await loadTaskFiles();
}

// Standard-Header für PostgREST-Aufrufe (apikey + Bearer-Token).
async function toniSupabaseHeaders(){
  const token = await getToken();
  return {
    "apikey": window.SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + (token || window.SUPABASE_ANON_KEY),
    "Content-Type": "application/json"
  };
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
    style="padding:12px 4px;border:0.5px solid ${fwdEnabled?'#4d7a1a':'var(--color-border-secondary)'};border-radius:var(--border-radius-md);
    background:${fwdEnabled?'#639922':'var(--color-background-primary)'};
    cursor:${fwdEnabled?'pointer':'default'};opacity:${fwdEnabled?'1':'.6'};
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

// ══════════════════════════════════════
// PROJEKT-JOURNAL als PDF (jsPDF)
// Chronologische Dokumentation der Projektentwicklung mit Durchlaufzeiten.
// Nutzt die Helfer aus journey.js (toniLoadJsPDF, toniJournalLoadImage,
// toniJournalProfile) – diese sind global verfügbar.
// ══════════════════════════════════════

// Lädt html2canvas einmalig vom CDN (für den Kanban-Snapshot im Journal).
function toniLoadHtml2Canvas(){
  return new Promise((resolve, reject) => {
    if(window.html2canvas){ resolve(window.html2canvas); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s.onload = () => window.html2canvas ? resolve(window.html2canvas) : reject(new Error('html2canvas konnte nicht initialisiert werden.'));
    s.onerror = () => reject(new Error('html2canvas konnte nicht geladen werden (CDN nicht erreichbar?).'));
    document.head.appendChild(s);
  });
}

// Schneidet eine Bild-Data-URL kreisförmig zu (für runde Avatare im PDF).
// Gibt eine PNG-Data-URL mit transparenten Ecken zurück, oder das Original bei Fehler.
async function toniCircleCrop(dataUrl){
  return new Promise(resolve => {
    try{
      const img = new Image();
      img.onload = () => {
        try{
          const size = Math.min(img.naturalWidth, img.naturalHeight);
          const c = document.createElement('canvas');
          c.width = size; c.height = size;
          const ctx = c.getContext('2d');
          ctx.beginPath();
          ctx.arc(size/2, size/2, size/2, 0, Math.PI*2);
          ctx.closePath();
          ctx.clip();
          // zentriert zuschneiden
          const sx = (img.naturalWidth - size)/2;
          const sy = (img.naturalHeight - size)/2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
          resolve(c.toDataURL('image/png'));
        }catch(e){ resolve(dataUrl); }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    }catch(e){ resolve(dataUrl); }
  });
}

// Rendert die Projektkachel (wie im Dashboard) temporär unsichtbar und fängt sie
// als Bild ein. Gibt {dataUrl, w, h} zurück oder null. Unabhängig davon, was
// gerade sichtbar ist (das Dashboard liegt beim Journal hinter dem Modal).
async function toniSnapshotProjectTile(project){
  let html2canvas, container;
  try{
    html2canvas = await toniLoadHtml2Canvas();
  }catch(e){ return null; }
  try{
    const p = project;
    const pct = p.task_total > 0 ? Math.round((p.task_done / p.task_total) * 100) : 0;
    const pal = (typeof getProjectPalette === 'function') ? getProjectPalette(p.id) : { bg:'#FBE9E2', border:'#E0A38C', text:'#8A3A22', bar:'#D4694A' };
    const members = (p.members || []).slice(0, 5);
    const extra = (p.member_count||0) > 5 ? `<span style="font-size:11px;color:${pal.text};opacity:.7;margin-left:4px;align-self:center">+${p.member_count-5}</span>` : '';
    const avatars = members.map(m => (typeof memberBlock === 'function') ? memberBlock(m, 32) : '').join('');
    const overdue = p.deadline && (typeof isOverdue === 'function') && isOverdue(p.deadline) && p.status !== 'completed';
    const deadlineHtml = p.deadline
      ? `<span style="font-size:11px;color:${overdue?'#A32D2D':pal.text};opacity:${overdue?1:.8}">📅 ${(typeof formatDate==='function'?formatDate(p.deadline):p.deadline)}${overdue?' · überfällig':''}</span>`
      : '';
    const badges = [
      p.has_blocker ? `<span style="font-size:10px;background:rgba(255,255,255,.6);color:#854F0B;padding:1px 6px;border-radius:10px;border:0.5px solid #FAC775">⚠ Blocker</span>` : '',
    ].filter(Boolean).join(' ');

    container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:0;width:340px;background:#fff;padding:0;z-index:-1';
    container.innerHTML = `<div style="background:${pal.bg};border:0.5px solid ${pal.border};border-radius:10px;padding:10px 12px;width:316px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:3px">
        <div style="font-size:14px;font-weight:500;color:${pal.text};line-height:1.3">${escapeHtml(p.title||'')}</div>
        <div style="font-size:13px;font-weight:500;color:${pal.bar};white-space:nowrap;flex-shrink:0">${pct}%</div>
      </div>
      ${p.description ? `<div style="font-size:12px;color:${pal.text};opacity:.75;margin-bottom:5px;line-height:1.4">${escapeHtml(p.description)}</div>` : ''}
      <div style="height:4px;background:rgba(255,255,255,.5);border-radius:2px;margin:5px 0">
        <div style="height:4px;width:${pct}%;background:${pal.bar};border-radius:2px"></div>
      </div>
      <div style="display:flex;align-items:flex-start;gap:6px;margin-top:6px;flex-wrap:wrap">
        <div style="display:flex;gap:6px;max-width:100%">${avatars}${extra}</div>
        <div style="display:flex;align-items:center;gap:6px;width:100%;margin-top:4px">
          ${deadlineHtml}
          <div style="margin-left:auto;display:flex;gap:4px">${badges}</div>
        </div>
      </div>
    </div>`;
    document.body.appendChild(container);
    // kurz warten, damit Avatare (Base64) im DOM sind
    await new Promise(r => setTimeout(r, 50));
    const tile = container.firstElementChild;
    const canvas = await html2canvas(tile, { backgroundColor:'#ffffff', scale:2, width: tile.offsetWidth, height: tile.offsetHeight });
    return { dataUrl: canvas.toDataURL('image/jpeg', 0.92), w: canvas.width, h: canvas.height };
  }catch(e){
    return null;
  }finally{
    if(container && container.parentNode) container.parentNode.removeChild(container);
  }
}

// Durchlaufzeit zwischen zwei Zeitpunkten als lesbarer deutscher Text.
function toniProjDuration(fromIso, toIso){
  if(!fromIso || !toIso) return null;
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  if(!(ms >= 0)) return null;
  const min = Math.round(ms / 60000);
  if(min < 60) return `${min} Min.`;
  const std = Math.round(min / 60);
  if(std < 24) return `${std} Std.`;
  const tage = Math.round(std / 24);
  return `${tage} Tag${tage === 1 ? '' : 'e'}`;
}

// Deutsches Datum + Uhrzeit aus ISO-String, oder '—'.
function toniProjDateTime(iso){
  if(!iso) return '—';
  try{
    const d = new Date(iso);
    return d.toLocaleDateString('de-DE', { year:'numeric', month:'long', day:'numeric' }) +
      ' ' + d.toLocaleTimeString('de-DE', { hour:'2-digit', minute:'2-digit' });
  }catch(e){ return '—'; }
}

async function toniGenerateProjectJournal(){
  const projectId = window.TONI_ACTIVE_PROJECT_ID;
  const project = (Array.isArray(window.TONI_PROJECTS) ? window.TONI_PROJECTS : []).find(p => p.id === projectId);
  if(!project){ alert('Es ist kein Projekt geöffnet.'); return; }
  const tasks = (Array.isArray(window.TONI_PROJECT_TASKS) ? window.TONI_PROJECT_TASKS : []).slice();

  let jsPDF;
  try{
    jsPDF = await toniLoadJsPDF();
  }catch(e){
    alert('Das Projekt-Journal konnte nicht erstellt werden:\n' + (e.message || e));
    return;
  }

  try{
    const doc = new jsPDF({ unit:'mm', format:'a4' });
    const pageW = 210, pageH = 297, margin = 18;
    const contentW = pageW - 2 * margin;
    let y = margin;
    const prof = (typeof toniJournalProfile === 'function') ? toniJournalProfile() : { name:'', klasse:'', institution:'' };

    const ensureSpace = (need) => { if(y + need > pageH - margin){ doc.addPage(); y = margin; } };
    const setFont = (size, style='normal', color=[20,40,62]) => {
      doc.setFont('helvetica', style); doc.setFontSize(size); doc.setTextColor(color[0],color[1],color[2]);
    };
    const writeText = (text, size=11, style='normal', color=[40,40,40], lineGap=1.4) => {
      if(!text) return;
      setFont(size, style, color);
      const lines = doc.splitTextToSize(String(text), contentW);
      for(const ln of lines){ ensureSpace(size*0.5); doc.text(ln, margin, y); y += size * 0.5 * lineGap; }
    };

    // Mitgliedsname zu einer assigned_to-ID
    const members = project.members || [];
    const nameFor = (id) => {
      const m = members.find(x => x.id === id);
      if(!m) return 'nicht zugewiesen';
      return (typeof memberPrimaryName === 'function') ? memberPrimaryName(m) : (m.first_name || m.display_name || '–');
    };

    // Horizontale Trennlinie (mit etwas Abstand davor/danach)
    const hr = (gapBefore=4, gapAfter=6, color=[200,200,200]) => {
      y += gapBefore; ensureSpace(2);
      doc.setDrawColor(color[0],color[1],color[2]);
      doc.line(margin, y, pageW - margin, y);
      y += gapAfter;
    };

    // ---------- DECKBLATT ----------
    ensureSpace(60);
    setFont(24, 'bold', [12,36,62]);
    doc.splitTextToSize(project.title || 'Projekt', contentW).forEach(ln => { ensureSpace(11); doc.text(ln, margin, y); y += 11; });
    y += 2;
    hr(2, 6);
    setFont(13, 'bold', [12,36,62]); doc.text('Projekt-Journal', margin, y); y += 8;

    // Metadaten-Box (linke Spalte) + Projektkachel-Snapshot (rechte Spalte)
    const pct = project.task_total > 0 ? Math.round((project.task_done / project.task_total) * 100) : 0;
    const managerProfile = members.find(m => m.id === project.created_by);
    const managerName = managerProfile
      ? ((typeof memberPrimaryName === 'function') ? memberPrimaryName(managerProfile) : (managerProfile.first_name||managerProfile.display_name||''))
      : '—';
    const meta = [
      ['Projektmanager', managerName],
      ['Team', members.length ? members.map(m => (typeof memberPrimaryName === 'function') ? memberPrimaryName(m) : (m.first_name||m.display_name||'')).join(', ') : '—'],
      ['Fortschritt', `${pct} % (${project.task_done||0} von ${project.task_total||0} Aufgaben)`],
    ];
    if(project.deadline) meta.push(['Deadline', (typeof formatDate === 'function' ? formatDate(project.deadline) : project.deadline) + (isOverdue(project.deadline) ? '  ⚠ überfällig' : '')]);
    meta.push(['Erstellt am', toniProjDateTime(new Date().toISOString())]);
    if(prof.name) meta.push(['Journal von', prof.name]);

    // Kachel rechts: Snapshot vorab einfangen, Breite ~ 38% der Inhaltsbreite
    const tileSnap = await toniSnapshotProjectTile(project);
    const tileW = tileSnap ? Math.min(78, contentW * 0.42) : 0;
    const leftW = tileSnap ? (contentW - tileW - 8) : contentW;   // linke Textspalte
    const metaTop = y;

    // Linke Spalte: Metadaten (Label + Wert), umbrochen auf leftW
    const labelW = 34;
    for(const [k,v] of meta){
      ensureSpace(7);
      setFont(11, 'bold', [70,70,70]); doc.text(k + ':', margin, y);
      setFont(11, 'normal', [40,40,40]);
      doc.splitTextToSize(String(v), leftW - labelW).forEach((ln, i) => { if(i>0){ y += 5.5; ensureSpace(6); } doc.text(ln, margin + labelW, y); });
      y += 7;
    }

    // Rechte Spalte: Kachel-Snapshot auf Höhe der Metadaten
    if(tileSnap){
      const tileH = tileW * (tileSnap.h / tileSnap.w);
      const tileX = margin + leftW + 8;
      doc.addImage(tileSnap.dataUrl, 'JPEG', tileX, metaTop - 2, tileW, tileH);
      // y auf den tieferen der beiden Spalten setzen
      y = Math.max(y, metaTop - 2 + tileH + 2);
    }

    if(project.description){
      hr(4, 6);
      ensureSpace(10);
      setFont(11, 'bold', [12,36,62]); doc.text('Beschreibung', margin, y); y += 6;
      writeText(project.description, 11, 'normal', [40,40,40]);
    }

    // Team mit Profilbildern, Name und Klasse/Rolle
    if(members.length){
      hr(4, 6);
      ensureSpace(14);
      setFont(11, 'bold', [12,36,62]); doc.text('Team', margin, y); y += 7;
      const avatarSize = 18;          // mm
      const cellW = 42;               // Breite pro Mitglied
      const perRow = Math.max(1, Math.floor(contentW / cellW));
      let col = 0;
      let rowTop = y;
      for(const m of members){
        if(col === 0){ ensureSpace(avatarSize + 12); rowTop = y; }
        const cx = margin + col * cellW;
        // Avatar (Bild oder farbiger Kreis mit Initiale)
        const imgSrc = m.avatar_data_url || m.avatar_url || '';
        let drewImg = false;
        if(imgSrc){
          const ai = await toniJournalLoadImage(imgSrc);
          if(ai){
            // rund zuschneiden, damit die Avatare als Kreis erscheinen
            const round = await toniCircleCrop(ai.dataUrl);
            doc.addImage(round, 'PNG', cx, rowTop, avatarSize, avatarSize);
            drewImg = true;
          }
        }
        if(!drewImg){
          // Fallback: Kreis mit Initiale
          const initial = ((m.first_name||'')[0] || (m.display_name||'?')[0] || '?').toUpperCase();
          doc.setFillColor(200, 214, 235);
          doc.circle(cx + avatarSize/2, rowTop + avatarSize/2, avatarSize/2, 'F');
          setFont(11, 'bold', [12,68,124]);
          doc.text(initial, cx + avatarSize/2, rowTop + avatarSize/2 + 1.5, { align:'center' });
        }
        // Name + Klasse/Rolle unter dem Avatar
        const nm = (typeof memberPrimaryName === 'function') ? memberPrimaryName(m) : (m.first_name||m.display_name||'');
        const sub = (typeof memberSubLabel === 'function') ? memberSubLabel(m) : (m.class_name||'');
        setFont(9, 'bold', [40,40,40]);
        doc.text(doc.splitTextToSize(nm, cellW - 3)[0] || nm, cx, rowTop + avatarSize + 4);
        setFont(8, 'normal', [120,120,120]);
        doc.text(doc.splitTextToSize(sub, cellW - 3)[0] || sub, cx, rowTop + avatarSize + 8.5);

        col++;
        if(col >= perRow){ col = 0; y = rowTop + avatarSize + 13; }
      }
      if(col !== 0){ y = rowTop + avatarSize + 13; }
    }

    // ---------- KANBAN-SNAPSHOT auf dem Deckblatt (unter den Profilbildern) ----------
    // Das aktuell geöffnete Projekt-Board wird 1:1 als Bild eingefangen.
    try{
      const html2canvas = await toniLoadHtml2Canvas();
      const board = document.getElementById('project-kanban');
      if(board){
        const canvas = await html2canvas(board, {
          backgroundColor: '#ffffff',
          scale: 2,
          width: board.scrollWidth,
          height: board.scrollHeight,
          windowWidth: board.scrollWidth
        });
        const imgData = canvas.toDataURL('image/jpeg', 0.92);
        // Trennlinie zwischen Profilbildern und Projektboard (Linie 4)
        hr(2, 6);
        setFont(13, 'bold', [12,36,62]); ensureSpace(8);
        doc.text('Aktueller Stand (Projektboard)', margin, y); y += 7;
        // Bild proportional einpassen; reicht der Platz auf dem Deckblatt nicht,
        // bricht es auf die nächste Seite um (kein fest erzwungenes addPage).
        const imgW = contentW;
        let imgH = imgW * (canvas.height / canvas.width);
        let drawW = imgW, drawH = imgH, drawX = margin;
        const avail = pageH - margin - y;
        if(imgH > avail){
          if(avail < 60){
            // zu wenig Platz -> neue Seite, dann volle Breite
            doc.addPage(); y = margin;
            drawH = Math.min(imgH, pageH - 2*margin);
            drawW = drawH * (canvas.width / canvas.height);
            if(drawW > contentW){ drawW = contentW; drawH = drawW * (canvas.height / canvas.width); }
            drawX = margin + (contentW - drawW)/2;
          }else{
            // an verfügbarer Höhe ausrichten, zentriert
            drawH = avail;
            drawW = drawH * (canvas.width / canvas.height);
            if(drawW > contentW){ drawW = contentW; drawH = drawW * (canvas.height / canvas.width); }
            drawX = margin + (contentW - drawW)/2;
          }
        }
        doc.addImage(imgData, 'JPEG', drawX, y, drawW, drawH);
        y += drawH + 4;
      }
    }catch(snapErr){
      // Snapshot ist optional – wenn html2canvas scheitert, Journal trotzdem erzeugen.
      console.warn('Kanban-Snapshot übersprungen:', snapErr);
    }

    // ---------- CHRONOLOGISCHER VERLAUF ----------
    // Sortierung: nach frühestem Aktivitätszeitpunkt (started_at, sonst created_at).
    const sortKey = (t) => t.started_at || t.created_at || '';
    tasks.sort((a,b) => String(sortKey(a)).localeCompare(String(sortKey(b))));

    doc.addPage(); y = margin;
    setFont(16, 'bold', [12,36,62]); doc.text('Projektverlauf', margin, y); y += 9;
    setFont(10, 'italic', [110,110,110]);
    doc.text('Aufgaben in der Reihenfolge ihrer Bearbeitung.', margin, y); y += 8;
    doc.setDrawColor(200,200,200); doc.line(margin, y, pageW - margin, y); y += 8;

    const statusTxt = (s) => s === 'done' ? 'erledigt' : (s === 'review' ? 'in Review' : (s === 'in_progress' ? 'in Arbeit' : 'offen'));

    for(const t of tasks){
      ensureSpace(20);
      // Titel + Inhaber + Status
      setFont(12, 'bold', [12,36,62]);
      doc.splitTextToSize(t.title || 'Aufgabe', contentW).forEach(ln => { ensureSpace(7); doc.text(ln, margin, y); y += 6.5; });
      setFont(9, 'normal', [130,130,130]);
      doc.text(`Inhaber: ${nameFor(t.assigned_to)} · Status: ${statusTxt(t.status)}`, margin, y); y += 6;

      // Beschreibung
      if(t.description) writeText(t.description, 10.5, 'normal', [50,50,50]);

      // Blocker (falls vorhanden)
      if(t.blocker){
        ensureSpace(6);
        writeText(`⚠ Blocker: ${t.blocker}`, 10, 'normal', [163,45,45]);
      }

      // Zeitverlauf mit Durchlaufzeiten
      y += 1; ensureSpace(8);
      setFont(10, 'bold', [12,36,62]); doc.text('Zeitverlauf:', margin, y); y += 5.5;
      const steps = [
        ['Erstellt',  t.created_at],
        ['Gestartet', t.started_at],
        ['Review',    t.review_at],
        ['Erledigt',  t.done_at],
      ].filter(([,iso]) => iso);
      if(steps.length <= 1 && !t.started_at){
        setFont(10, 'italic', [150,150,150]); ensureSpace(6);
        doc.text('(noch keine Bearbeitung begonnen)', margin + 4, y); y += 6;
      }else{
        for(const [label, iso] of steps){
          ensureSpace(5.5);
          setFont(9.5, 'normal', [90,90,90]);
          doc.text(`• ${label}: ${toniProjDateTime(iso)}`, margin + 4, y); y += 5.5;
        }
        // Durchlaufzeit-Auswertung
        const dStart = t.started_at && t.done_at ? toniProjDuration(t.started_at, t.done_at) : null;
        const dInProg = t.started_at && t.review_at ? toniProjDuration(t.started_at, t.review_at) : null;
        if(dStart){
          ensureSpace(6); setFont(9.5, 'bold', [20,120,70]);
          doc.text(`⏱ Durchlaufzeit (Start → Erledigt): ${dStart}`, margin + 4, y); y += 6;
        }else if(dInProg){
          ensureSpace(6); setFont(9.5, 'bold', [120,119,221]);
          doc.text(`⏱ Bearbeitungszeit bis Review: ${dInProg}`, margin + 4, y); y += 6;
        }
      }

      // Notiz / Lösung des Schülers (der inhaltliche Beitrag)
      y += 1; ensureSpace(10);
      setFont(10, 'bold', [12,36,62]); doc.text('Notiz / Lösung:', margin, y); y += 5.5;
      if(t.note && String(t.note).trim()){
        writeText(String(t.note).trim(), 10.5, 'normal', [30,30,30]);
      }else{
        setFont(10, 'italic', [150,150,150]); ensureSpace(6); doc.text('(keine Notiz)', margin, y); y += 6;
      }

      y += 4;
      doc.setDrawColor(230,230,230); ensureSpace(2); doc.line(margin, y, pageW - margin, y); y += 6;
    }

    if(!tasks.length){
      writeText('Dieses Projekt enthält noch keine Aufgaben.', 11, 'italic', [120,120,120]);
    }

    // Fußzeile mit Seitenzahlen
    const total = doc.getNumberOfPages();
    for(let p=1; p<=total; p++){
      doc.setPage(p);
      setFont(8, 'normal', [150,150,150]);
      doc.text(`Projekt-Journal · ${project.title || ''}`, margin, pageH - 10);
      doc.text(`Seite ${p} / ${total}`, pageW - margin, pageH - 10, { align:'right' });
    }

    const slug = (typeof toniSlugifyTitle === 'function') ? toniSlugifyTitle(project.title) : 'projekt';
    doc.save(slug + '_projektjournal.pdf');
  }catch(error){
    console.error('Projekt-Journal:', error);
    alert('Beim Erstellen des Projekt-Journals ist ein Fehler aufgetreten:\n' + (error.message || error));
  }
}
window.toniGenerateProjectJournal = toniGenerateProjectJournal;

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
