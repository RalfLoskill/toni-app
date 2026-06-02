/* ============================================================
   TONI – chat.js
   Chat, KI-Agent, Kanban, State
   Ausgelagert aus index.html (V110)
   ============================================================ */

// ══════════════════════════════════════
// STATE
// ══════════════════════════════════════
const DEFAULT_STATE = {
  user: { name:'Max', class:'ET23A', level:7, xp:820 },
  currentTopic: 'Ohmsches Gesetz',
  progress: { ohmsches_gesetz:70, leistungsberechnung:40, schaltungsanalyse:20, praxisprojekt:0 },
  goals: { weekly:'Ohmsches Gesetz sicher anwenden', completed:['Formeln verstehen','Einfache Aufgaben lösen'], open:['Praxisaufgabe bearbeiten'] },
  projects: [
    { title:'Automatisierte Pflanzenbewässerung', type:'Gruppe', progress:60, blocker:'Kalibrierwerte Feuchtigkeitssensor fehlen' },
    { title:'Lernreise Elektrotechnik Grundlagen', type:'Solo', progress:65, blocker:null }
  ],
  kanban: {
    todo:['Aufgabe 5 lösen','Video: Reihenschaltung','Materialliste prüfen'],
    wip:['Aufgabe 3 lösen','Arduino-Code: Sensorwerte auslesen'],
    review:['Schaltplan Version 1 hochladen'],
    done:['Aufgabe 1 lösen','Formeln Ohmsches Gesetz lernen','Projektziel formulieren']
  },
  team:[
    {name:'Lena',task:'Sensorik testen',progress:75,due:'Freitag'},
    {name:'Maximilian',task:'Präsentation vorbereiten',progress:40,due:null},
    {name:'Julia',task:'Dokumentation & Schaltplan',progress:60,due:null}
  ],
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

    return {
      title: j.title || '',
      subject: j.subject || '',
      goal: j.goal || '',
      progressPct: pct,
      currentStation: cur ? (cur.title || '') : '',
      currentStationSubtitle: cur ? (cur.subtitle || '') : '',
      doneStations: doneSteps,
      currentDone: doneTitles,
      currentOpen: openTitles
    };
  } catch (e) {
    console.warn('Lernreise-Kontext konnte nicht erstellt werden:', e);
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
    // Echten Lernreise-Kontext datensparsam anhängen (Baustein 1).
    // Verändert STATE nicht dauerhaft – nur die gesendete Kopie.
    const journeyContext = toniBuildJourneyContext();
    const payload = journeyContext ? { ...STATE, journeyContext } : STATE;
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
  if (u.progress_delta) {
    const {topic,add} = u.progress_delta;
    const key = topic.toLowerCase().replace(/\s/g,'_');
    if (STATE.progress[key]!==undefined) {
      const old=STATE.progress[key], nv=Math.min(100,old+add);
      STATE.progress[key]=nv;
      const map={ohmsches_gesetz:{bar:'p1',val:'p1v'},leistungsberechnung:{bar:'p2',val:'p2v'},schaltungsanalyse:{bar:'p3',val:'p3v'},praxisprojekt:{bar:'p4',val:'p4v'}};
      if(map[key]) animProg(map[key].bar,map[key].val,old,nv);
    }
  }
  if (u.new_kanban_task) { const {title,col}=u.new_kanban_task; addCardToCol(title,col||'wip'); STATE.kanban[col||'wip'].push(title); }
  if (u.complete_goal) {
    const g=u.complete_goal;
    if(STATE.goals.open.includes(g)){ STATE.goals.open=STATE.goals.open.filter(x=>x!==g); STATE.goals.completed.push(g); refreshTeilziele(); }
  }
  if (u.xp_gain) { STATE.user.xp+=u.xp_gain; showXPToast(u.xp_gain); }
}

function showXPToast(gained) {
  const t=document.getElementById('xp-toast');
  t.textContent='+'+gained+' XP ⭐'; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),2500);
}

function refreshTeilziele() {
  const wrap=document.getElementById('teilziele');
  const all=[...STATE.goals.completed,...STATE.goals.open];
  wrap.innerHTML=all.map(g=>{
    const done=STATE.goals.completed.includes(g);
    return `<div class="tz">${done?'<span class="tz-ok">✅</span>':'<div class="tz-open"></div>'} ${g}</div>`;
  }).join('');
}

// ══════════════════════════════════════
// KANBAN
// ══════════════════════════════════════
const counts={todo:3,wip:2,review:1,done:3};

function moveCard(el,from,to) {
  const col=document.getElementById('col-'+to); if(!col) return;
  el.classList.add('fu');
  if(to==='done'){
    el.classList.add('done-c');
    const txt=el.querySelector('.k-card-title')?el.querySelector('.k-card-title').textContent:el.textContent.replace('✓','').trim();
    if(!el.innerHTML.includes('done-chk')) el.innerHTML=`<span class="done-chk">✓</span>${txt}`;
    el.onclick=function(){moveCard(this,'done','todo');};
  } else {
    el.classList.remove('done-c');
    const next=to==='todo'?'wip':to==='wip'?'review':to==='review'?'done':'todo';
    el.onclick=function(){moveCard(this,to,next);};
  }
  col.appendChild(el);
  counts[from]=Math.max(0,counts[from]-1); counts[to]++;
  updCounts(); updateStatOpen();
}

function addCardToCol(title,col) {
  const card=document.createElement('div'); card.className='k-card fu';
  card.innerHTML=`<div class="k-card-title">${title}</div>`;
  const next=col==='todo'?'wip':col==='wip'?'review':col==='review'?'done':'todo';
  card.onclick=function(){moveCard(this,col,next);};
  document.getElementById('col-'+col).appendChild(card);
  counts[col]++; updCounts(); updateStatOpen();
}

function addTask(col) {
  const name=prompt('Neue Aufgabe:'); if(!name||!name.trim()) return;
  addCardToCol(name.trim(),col);
  STATE.kanban[col].push(name.trim()); saveState(STATE);
}

function updCounts() {
  ['todo','wip','review','done'].forEach(c=>{
    const el=document.getElementById('cnt-'+c); if(el) el.textContent=counts[c];
  });
}

function updateStatOpen() {
  const el=document.getElementById('stat-open');
  if(el) el.textContent=counts.todo+counts.wip+counts.review;
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
// PROGRESS ANIMATION
// ══════════════════════════════════════
function animProg(barId,valId,from,to) {
  const bar=document.getElementById(barId),val=document.getElementById(valId); if(!bar||!val) return;
  let cur=from;
  const tick=()=>{ cur=Math.min(cur+0.5,to); bar.style.width=cur+'%'; val.textContent=Math.round(cur)+'%'; if(cur<to) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
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
    if (agentType === 'task_agent') {
      appendMsg('user', label, time(), panel||'desktop');
      if (typeof startNextLearningTask === 'function') startNextLearningTask();
      return;
    }
    if (agentType === 'goal_agent') {
      appendMsg('user', label, time(), panel||'desktop');
      if (typeof checkCurrentStation === 'function') checkCurrentStation();
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
// INIT
// ══════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  const welcome = 'Hallo! 👋<br><br>Ich bin TONI, dein persönlicher Lernassistent. Was möchtest du heute erreichen?';
  appendMsg('toni', welcome, time(), 'desktop');
  appendMsg('toni', welcome, time(), 'mobile');
  refreshTeilziele();
  setApiBadge(false);
});
