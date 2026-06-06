/* ============================================================
   TONI – chat.js
   Chat, KI-Agent, Kanban, State
   Ausgelagert aus index.html (V110)
   ============================================================ */

// ══════════════════════════════════════
// STATE
// ══════════════════════════════════════
const DEFAULT_STATE = {
  // Schlanker Standard-State. Die früheren Demo-Daten (currentTopic, progress,
  // kanban, team, Demo-Projekte) wurden entfernt – der echte Kontext kommt aus
  // der Lernreise (journey.js) und den Projekten (projects.js).
  // 'user' dient nur als Fallback, bis das echte Profil geladen ist.
  // 'goals' bleibt als minimaler Stub, weil completeLearningTask es defensiv liest.
  user: { name:'', class:'' },
  goals: { weekly:'', completed:[], open:[] },
  chatHistory:[]
};

function loadState() {
  try { const s=localStorage.getItem('toni_v3'); return s?{...DEFAULT_STATE,...JSON.parse(s)}:{...DEFAULT_STATE}; }
  catch { return {...DEFAULT_STATE}; }
}
function saveState(s) {
  try { localStorage.setItem('toni_v3',JSON.stringify({...s,chatHistory:s.chatHistory.slice(-20)})); }
  catch(e){ console.warn(e); }
}
let STATE = loadState();
let isLoading = false;

// ══════════════════════════════════════
// ECHTER LERNREISE-KONTEXT (Baustein 1)
// Stellt clientseitig einen kompakten, datensparsamen Kontext-Block
// aus der aktiven Lernreise zusammen. Greift auf die journey.js-Funktionen
// zu (window.activeJourney etc.). Gibt null zurück, wenn keine Lernreise
// vorliegt – dann verhält sich der Chat wie bisher.
// ══════════════════════════════════════
function toniBuildJourneyContext() {
  try {
    if (typeof window.activeJourney !== 'function') return null;
    const j = window.activeJourney();
    if (!j || !Array.isArray(j.steps) || !j.steps.length) return null;

    const pct = (typeof window.journeyProgress === 'function') ? window.journeyProgress(j) : null;

    // aktuelle Station bestimmen (erste nicht-fertige, sonst erste)
    let curIdx = 0;
    if (typeof window.stepStatus === 'function') {
      const i = j.steps.findIndex((s, idx) => window.stepStatus(s, idx, j) === 'current');
      curIdx = i < 0 ? 0 : i;
    }
    const cur = j.steps[curIdx];

    const doneTitles = [];
    const openTitles = [];
    (cur.tasks || []).forEach(t => {
      if (t.status === 'done') doneTitles.push(t.title);
      else if (t.status !== 'locked') openTitles.push(t.title);
    });

    // erledigte Stationen (Titel) für groben Überblick
    const doneSteps = [];
    if (typeof window.stepStatus === 'function') {
      j.steps.forEach((s, idx) => { if (window.stepStatus(s, idx, j) === 'done') doneSteps.push(s.title); });
    }

    // Aktuell geöffnete Aufgabe (falls das Aufgaben-Fenster offen ist).
    // Das ist der wichtigste freie-Chat-Kontext: woran arbeitet der Schüler gerade?
    // Datensparsam: keine Quiz-Lösungen mitschicken (TONI soll beim Denken helfen,
    // nicht die Lösung verraten).
    let openTask = null;
    try {
      const modal = document.getElementById('lr-task-modal');
      const isOpen = modal && modal.classList.contains('open');
      const selId = (typeof STATE !== 'undefined' && STATE) ? STATE.selectedTaskId : null;
      if (isOpen && selId && typeof window.activeJourney === 'function') {
        let found = null;
        for (const s of j.steps) {
          const t = (s.tasks || []).find(x => x.id === selId);
          if (t) { found = { task: t, step: s }; break; }
        }
        if (found) {
          const t = found.task;
          // Aufgabenstellung zusammenbauen. Bei Quiz-Aufgaben stecken die
          // eigentlichen Fragen in quiz_data.questions – sonst wüsste TONi
          // nicht, worum es geht (description ist beim Quiz oft leer).
          let promptText = (t.description || t.content || '');
          if (t.type && String(t.type).toLowerCase().includes('quiz') &&
              t.quiz_data && Array.isArray(t.quiz_data.questions) && t.quiz_data.questions.length) {
            // NUR die aktuelle Frage mitschicken (nicht alle), plus den Klick-Stand.
            const qi = t._quizIndex || 0;
            const q = t.quiz_data.questions[qi];
            if (q) {
              const opts = Array.isArray(q.options)
                ? q.options.map((o, oi) => `${String.fromCharCode(65+oi)}) ${o}`).join('; ')
                : '';
              const lines = [
                `Dies ist ein Quiz. Der Schüler ist bei Frage ${qi+1} von ${t.quiz_data.questions.length}.`,
                `Aktuelle Frage: ${q.question || ''}`,
                opts ? `Antwortmöglichkeiten: ${opts}` : ''
              ];
              // Klick-Stand: hat der Schüler schon geantwortet, und wenn ja, was?
              if (q._answered && typeof q._selectedIndex === 'number') {
                const gewaehlt = String.fromCharCode(65 + q._selectedIndex);
                const richtig = (q._selectedIndex === q.correct_index);
                lines.push(`Der Schüler hat bereits Antwort ${gewaehlt} angeklickt – diese ist ${richtig ? 'RICHTIG' : 'FALSCH'}.`);
                lines.push(richtig
                  ? 'Bestätige kurz und hilf ihm zu verstehen, WARUM die Antwort richtig ist – ohne nur die Lösung zu wiederholen.'
                  : 'Verrate NICHT die richtige Antwort. Hilf ihm mit einer Frage, selbst zu erkennen, warum seine Wahl nicht passt.');
              } else {
                lines.push('Der Schüler hat noch nicht geantwortet. Hilf ihm beim Nachdenken über DIESE Frage, ohne die richtige Antwort zu nennen.');
              }
              promptText = (promptText ? promptText + '\n\n' : '') + lines.filter(Boolean).join('\n');
            }
          }
          openTask = {
            title: t.title || '',
            type: t.type || '',
            station: found.step.title || '',
            prompt: promptText.slice(0, 1500),
            studentAnswer: (t.answer && String(t.answer).trim()) ? String(t.answer).trim().slice(0, 800) : ''
          };
        }
      }
    } catch (e) { /* offene Aufgabe ist optional – bei Fehler einfach weglassen */ }

    return {
      title: j.title || '',
      subject: j.subject || '',
      goal: j.goal || '',
      progressPct: pct,
      currentStation: cur ? (cur.title || '') : '',
      currentStationSubtitle: cur ? (cur.subtitle || '') : '',
      doneStations: doneSteps,
      currentDone: doneTitles,
      currentOpen: openTitles,
      openTask: openTask
    };
  } catch (e) {
    console.warn('Lernreise-Kontext konnte nicht erstellt werden:', e);
    return null;
  }
}

// ══════════════════════════════════════
// ECHTER PROJEKT-KONTEXT (Verbindlichkeiten)
// Baut aus window.TONI_PROJECTS und window.TONI_OPEN_TASKS einen kompakten
// Kontext mit der gleichen Dringlichkeitslogik wie das Dashboard:
// Blocker zuerst, dann überfällig, dann nicht zugewiesen.
// Betont Verbindlichkeiten (wer wartet, was blockiert die Gruppe).
// Gibt null zurück, wenn keine echten Projektdaten vorliegen.
// ══════════════════════════════════════
function toniBuildProjectContext() {
  try {
    const projects = Array.isArray(window.TONI_PROJECTS) ? window.TONI_PROJECTS : null;
    if (!projects || !projects.length) return null;

    const isOverdue = (d) => {
      if (!d) return false;
      const due = new Date(d); if (isNaN(due)) return false;
      const today = new Date(); today.setHours(0,0,0,0);
      return due < today;
    };

    const projSummaries = projects.slice(0, 8).map(p => {
      const pct = (p.task_total > 0) ? Math.round((p.task_done / p.task_total) * 100) : 0;
      return {
        title: p.title || '',
        type: p.type || '',
        progressPct: pct,
        deadline: p.deadline || '',
        deadlineOverdue: p.deadline ? isOverdue(p.deadline) : false,
        hasBlocker: !!p.has_blocker,
        memberCount: p.member_count || (Array.isArray(p.members) ? p.members.length : 0)
      };
    });

    // Offene Aufgaben (falls bereits geladen) mit Verbindlichkeiten
    const tasks = Array.isArray(window.TONI_OPEN_TASKS) ? window.TONI_OPEN_TASKS : [];
    const projTitleById = {};
    projects.forEach(p => { projTitleById[p.id] = p.title; });

    const mapTask = (t) => ({
      title: t.title || '',
      status: t.status || '',
      project: projTitleById[t.project_id] || '',
      assignee: t.assigned_profile ? (t.assigned_profile.first_name || t.assigned_profile.display_name || '') : '',
      unassigned: !t.assigned_to,
      dueDate: t.due_date || '',
      overdue: t.due_date ? isOverdue(t.due_date) : false,
      blocker: (t.blocker && String(t.blocker).trim()) ? String(t.blocker).trim() : ''
    });

    const blocked = tasks.filter(t => t.blocker).map(mapTask);
    const overdue = tasks.filter(t => t.due_date && isOverdue(t.due_date) && !t.blocker).map(mapTask);
    const unassigned = tasks.filter(t => !t.assigned_to && t.status !== 'done' && !t.blocker && !(t.due_date && isOverdue(t.due_date))).map(mapTask);
    const otherOpen = tasks
      .filter(t => !t.blocker && !(t.due_date && isOverdue(t.due_date)) && t.assigned_to)
      .slice(0, 6)
      .map(mapTask);

    return {
      projectCount: projects.length,
      projects: projSummaries,
      openTaskCount: tasks.length,
      blocked,
      overdue,
      unassigned,
      otherOpen
    };
  } catch (e) {
    console.warn('Projekt-Kontext konnte nicht erstellt werden:', e);
    return null;
  }
}

// ══════════════════════════════════════
// API
// ══════════════════════════════════════
async function callAgent(agentType, context) {
  const res = await fetch('/api/agent', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({agentType, context})
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function agentAction(agentType, label, panel) {
  if (isLoading) return;
  const p = panel||'desktop';
  isLoading = true; setButtonsDisabled(true);
  STATE.chatHistory.push({role:'user',content:label});
  appendMsg('user', label, time(), p);
  const tid = showTyping(p);
  try {
    // Echten Lernreise- und Projekt-Kontext datensparsam anhängen.
    // Verändert STATE nicht dauerhaft – nur die gesendete Kopie.
    const journeyContext = toniBuildJourneyContext();
    const projectContext = toniBuildProjectContext();
    let payload = STATE;
    if (journeyContext || projectContext) {
      payload = { ...STATE };
      if (journeyContext) payload.journeyContext = journeyContext;
      if (projectContext) payload.projectContext = projectContext;
    }
    const result = await callAgent(agentType, payload);
    removeTyping(tid);
    appendMsg('toni', result.message, time(), p);
    STATE.chatHistory.push({role:'assistant',content:result.message});
    if (result.ui_updates) applyUpdates(result.ui_updates);
    setApiBadge(true); saveState(STATE);
  } catch(err) {
    removeTyping(tid);
    appendMsg('error', `⚠️ TONI ist gerade nicht erreichbar.<br><small>${err.message}</small>`, time(), p);
    setApiBadge(false);
  } finally { isLoading=false; setButtonsDisabled(false); }
}

async function sendChat(panel) {
  const p = panel||'desktop';
  const inp = document.getElementById('chat-in-'+p);
  const txt = inp.value.trim(); if (!txt||isLoading) return;
  inp.value = '';
  // Routing: task_agent und goal_agent → Lernreise-Funktionen
  // Alle anderen → direkt an Claude
  await agentAction('explanation_agent', txt, p);
}

// ══════════════════════════════════════
// UI UPDATES (von KI ausgelöst)
// ══════════════════════════════════════
function applyUpdates(u) {
  // Hinweis: Das alte Demo-Kanban, die Demo-Teilziele und die Demo-
  // Fortschrittsbalken wurden durch den echten Wochenplan (renderWeeklyPlan
  // in projects.js) ersetzt. Hier bleibt nur die XP-Belohnung erhalten.
  if (u && u.xp_gain) { showXPToast(u.xp_gain); }
}

function showXPToast(gained) {
  const t=document.getElementById('xp-toast');
  if(!t) return;
  t.textContent='+'+gained+' XP ⭐'; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

// ══════════════════════════════════════
// CHAT HELPERS
// ══════════════════════════════════════
function appendMsg(type,html,t,panel) {
  const wrap=document.getElementById('chat-msgs-'+panel); if(!wrap) return;
  const div=document.createElement('div'); div.className='fu';
  div.innerHTML=`<div class="msg-time${type==='user'?' r':''}">${t}</div><div class="bubble ${type}">${html}</div>`;
  wrap.appendChild(div); wrap.scrollTop=wrap.scrollHeight;
}

let tc=0;
function showTyping(panel) {
  const id='ty'+(++tc)+panel;
  const wrap=document.getElementById('chat-msgs-'+panel); if(!wrap) return id;
  const div=document.createElement('div'); div.id=id; div.className='fu';
  div.innerHTML=`<div class="bubble toni typing-row"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>`;
  wrap.appendChild(div); wrap.scrollTop=wrap.scrollHeight; return id;
}
function removeTyping(id) { const e=document.getElementById(id); if(e) e.remove(); }
function time() { return new Date().toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'}); }
function setButtonsDisabled(d) { document.querySelectorAll('.act-btn,.send-btn,.chat-input').forEach(e=>e.disabled=d); }
function setApiBadge(online) {
  const b=document.getElementById('api-badge'),l=document.getElementById('api-label');
  b.className='api-badge '+(online?'live':'offline'); l.textContent=online?'Live':'Offline';
}

// ══════════════════════════════════════
// MOBILE
// ══════════════════════════════════════
function openMobileChat()  { document.getElementById('mobile-chat').classList.add('open'); }
function closeMobileChat() { document.getElementById('mobile-chat').classList.remove('open'); }

// ══════════════════════════════════════
// AGENT ACTION ROUTING
// (überschreibt die Basis-agentAction für Lernreise-Buttons)
// ══════════════════════════════════════
(function() {
  const _base = window.agentAction || agentAction;
  window.agentAction = async function(agentType, label, panel) {
    // "Lernreise prüfen": echte, kontextbewusste KI-Antwort (statt statischer Liste).
    // Der echte Lernreise-Kontext wird in der Basis-agentAction angehängt.
    if (agentType === 'goal_agent') {
      return _base(agentType, label, panel);
    }
    // "Nächste sinnvolle Aufgabe": erst KI-Empfehlung im Chat, danach die
    // nächste Aufgabe automatisch öffnen (best of both).
    if (agentType === 'task_agent') {
      await _base(agentType, label, panel);
      if (typeof startNextLearningTask === 'function') {
        try { startNextLearningTask(); } catch (e) { console.warn('Aufgabe öffnen fehlgeschlagen:', e); }
      }
      return;
    }
    return _base(agentType, label, panel);
  };

  window.sendChat = async function(panel) {
    const p = panel||'desktop';
    const inp = document.getElementById('chat-in-'+p);
    const txt = inp.value.trim(); if (!txt) return;
    inp.value = '';
    await window.agentAction('explanation_agent', txt, p);
  };
})();

// ══════════════════════════════════════
// SOKRATISCHER TONI-HINWEIS (Lernreise-Aufgaben)
// Gestufte Hinweise (Leitfrage → konkreter) KOMBINIERT mit Feedback auf die
// bereits eingegebene Antwort. Verrät nie die Lösung. Erscheint direkt in der
// Aufgabenansicht (lr-task-hint). Nutzt den bestehenden explanation_agent und
// liefert die pädagogischen Regeln über den Kontext mit (Weg A, reines Frontend).
// ══════════════════════════════════════
window.toniHintLevels = window.toniHintLevels || {};   // taskId -> bisher angeforderte Stufe

async function toniRequestSocraticHint() {
  const hintEl = document.getElementById('lr-task-hint');
  const taskId = (typeof STATE !== 'undefined' && STATE) ? STATE.selectedTaskId : null;
  if (!taskId) return;
  // Live-Antwort sichern, damit der aktuelle Stand in den Kontext geht
  if (typeof window.saveSelectedTaskAnswer === 'function') {
    try { window.saveSelectedTaskAnswer(); } catch (e) {}
  }

  // Stufe hochzählen (max 3 inhaltliche Stufen)
  const prev = window.toniHintLevels[taskId] || 0;
  const level = Math.min(prev + 1, 3);
  window.toniHintLevels[taskId] = level;

  // Journey-Kontext bauen (enthält openTask inkl. studentAnswer)
  const jc = (typeof toniBuildJourneyContext === 'function') ? toniBuildJourneyContext() : null;

  const stufenText = {
    1: 'Hinweis-Stufe 1 von 3: Gib NUR eine offene Leitfrage oder einen Denkanstoß. Verrate nichts Konkretes.',
    2: 'Hinweis-Stufe 2 von 3: Werde etwas konkreter – nenne den nächsten Denkschritt oder die relevante Idee, aber NICHT die Lösung.',
    3: 'Hinweis-Stufe 3 von 3: Gib einen sehr konkreten Tipp, der fast zur Lösung führt – aber nenne die finale Antwort NICHT.'
  }[level];

  // WICHTIG: Der Server (api/agent.js) liest den Lernreise-Kontext aus
  // ctx.journeyContext und baut die Aufgabenstellung aus openTask.prompt.
  // Wir hängen die gestufte Hinweis-Anweisung an prompt an, damit sie
  // garantiert im KI-Prompt landet (der Server kennt kein eigenes Stufen-Feld).
  let journeyContext = jc;
  if (jc && jc.openTask) {
    journeyContext = {
      ...jc,
      openTask: {
        ...jc.openTask,
        prompt: (jc.openTask.prompt || '') +
          `\n\n[Anweisung an TONi für den Hinweis: ${stufenText} ` +
          `Verrate niemals die fertige Lösung. Wenn der Schüler schon etwas eingegeben hat, ` +
          `gehe konkret darauf ein – was ist gut, was fehlt noch? Halte den Hinweis kurz (2–4 Sätze) und ermutigend.]`
      }
    };
  }

  // Server baut die eigentliche Frage aus chatHistory (lastUserMessage).
  // Wir schicken eine Kopie des STATE (für ctx.user) mit angehängtem
  // journeyContext und einer Hinweis-Bitte als letzte Nutzernachricht.
  const baseState = (typeof STATE !== 'undefined' && STATE) ? STATE : {};
  const payload = {
    ...baseState,
    journeyContext,
    chatHistory: [
      ...((baseState.chatHistory || []).slice(-8)),
      { role: 'user', content: 'Gib mir bitte einen Hinweis zu dieser Aufgabe, ohne die Lösung zu verraten.' }
    ]
  };

  if (hintEl) hintEl.innerHTML = '<em>TONi denkt nach…</em>';

  try {
    const result = await callAgent('explanation_agent', payload);
    const msg = (result && result.message) ? result.message : 'Ich konnte gerade keinen Hinweis erstellen – versuch es gleich nochmal.';
    if (hintEl) hintEl.innerHTML = msg;
    setApiBadge(true);
  } catch (err) {
    // Fallback: bisheriger statischer Hinweis, damit der Button nie „tot“ wirkt
    if (hintEl) {
      const fb = (typeof hintForTask === 'function' && typeof findTask === 'function')
        ? (findTask(taskId) ? hintForTask(findTask(taskId).task) : '') : '';
      hintEl.innerHTML = (fb || 'TONi ist gerade nicht erreichbar. Versuch es gleich nochmal.') +
        '<br><small style="color:var(--color-text-tertiary)">(Offline-Tipp)</small>';
    }
    setApiBadge(false);
  }
}
window.toniRequestSocraticHint = toniRequestSocraticHint;

// Stufenzähler zurücksetzen, wenn eine Aufgabe neu geöffnet wird.
window.toniResetHintLevel = function(taskId){ if(taskId) window.toniHintLevels[taskId] = 0; };

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  const welcome = 'Hallo! 👋<br><br>Ich bin TONI, dein persönlicher Lernassistent. Was möchtest du heute erreichen?';
  appendMsg('toni', welcome, time(), 'desktop');
  appendMsg('toni', welcome, time(), 'mobile');
  setApiBadge(false);
});
