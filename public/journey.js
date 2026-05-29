/* ============================================================
   TONI – journey.js
   Lernreise, Stationen, Aufgaben, Video, Fortschritt
   Ausgelagert aus index.html (V110)
   ============================================================ */

/* Lernreisen V1: ergänzt das bestehende Dashboard, ohne das Design zu ersetzen. */
const DEFAULT_LEARNING_JOURNEYS = [{
  id:'elektro-grundlagen',
  title:'Elektrotechnik Grundlagen',
  description:'Grundlagen zu Strom, Spannung, Widerstand, Leistung und einfachen Schaltungen.',
  goal:'Ohmsches Gesetz sicher anwenden',
  steps:[
    {id:'start',title:'Start',subtitle:'Orientierung',description:'Du kennst Ziel, Ablauf und Bewertung der Lernreise.',tasks:[
      {id:'start-1',title:'Lernziel lesen',type:'Info',status:'done',required:true,description:'Lies das Ziel der Lernreise.',content:'Ziel: Du kannst Grundgrößen der Elektrotechnik erklären und einfache Berechnungen durchführen.'}]},
    {id:'grundlagen',title:'Grundlagen',subtitle:'Strom & Spannung',description:'Du unterscheidest Stromstärke, Spannung und Widerstand.',tasks:[
      {id:'grund-1',title:'Video: Strom und Spannung',type:'Video',status:'done',required:true,description:'Schaue das Erklärvideo.',content:'Notiere: Was ist Stromstärke? Was ist Spannung? Welche Einheiten gehören dazu?'},
      {id:'grund-2',title:'Begriffe zuordnen',type:'Quiz',status:'done',required:true,description:'Ordne Formelzeichen und Einheiten zu.',content:'Ordne zu: U, I, R, V, A, Ω.'}]},
    {id:'ohm',title:'Ohmsches Gesetz',subtitle:'Rechnen & anwenden',description:'Du nutzt U = R · I und stellst die Formel sicher um.',tasks:[
      {id:'ohm-1',title:'Formeln verstehen',type:'Erklärung',status:'done',required:true,description:'Erkläre U = R · I.',content:'Beschreibe mit eigenen Worten, wofür U, R und I stehen.'},
      {id:'ohm-2',title:'Aufgabe 5 lösen',type:'Rechenaufgabe',status:'todo',required:true,description:'Berechne die Stromstärke mit dem Ohmschen Gesetz.',content:'Gegeben: U = 12 V, R = 120 Ω. Gesucht: I. Nutze I = U / R.'},
      {id:'ohm-3',title:'Video: Reihenschaltung',type:'Video',status:'todo',required:false,description:'Bereite die nächste Station vor.',content:'Schaue das Video und notiere, wie sich Widerstände in einer Reihenschaltung verhalten.'},
      {id:'ohm-4',title:'Praxisaufgabe bearbeiten',type:'Praxis',status:'todo',required:true,description:'Wende das Ohmsche Gesetz auf eine echte Situation an.',content:'Eine LED-Leuchte wird mit 230 V betrieben und hat eine Stromaufnahme von 0,5 A. Berechne den Widerstand.'}]},
    {id:'leistung',title:'Leistung',subtitle:'Berechnung',description:'Du berechnest elektrische Leistung.',tasks:[
      {id:'leistung-1',title:'Leistung P = U · I berechnen',type:'Rechenaufgabe',status:'locked',required:true,description:'Berechne elektrische Leistung.',content:'Diese Aufgabe wird freigeschaltet, wenn die Pflichtaufgaben der vorherigen Station erledigt sind.'}]},
    {id:'schaltungen',title:'Schaltungen',subtitle:'Analyse',description:'Du analysierst einfache Reihen- und Parallelschaltungen.',tasks:[
      {id:'schalt-1',title:'Reihenschaltung analysieren',type:'Analyse',status:'locked',required:true,description:'Analysiere eine Reihenschaltung.',content:'Diese Aufgabe wird später freigeschaltet.'}]},
    {id:'praxisprojekt',title:'Praxisprojekt',subtitle:'Anwendung',description:'Du überträgst dein Wissen in eine Anwendung.',tasks:[
      {id:'projekt-1',title:'Praxisprojekt planen',type:'Projekt',status:'locked',required:true,description:'Plane ein kleines Praxisprojekt.',content:'Diese Aufgabe wird später freigeschaltet.'}]},
    {id:'reflexion',title:'Ziel erreicht!',subtitle:'Reflexion',description:'Du reflektierst deine Lernreise.',tasks:[
      {id:'reflexion-1',title:'Lernreise reflektieren',type:'Reflexion',status:'locked',required:true,description:'Reflektiere deinen Lernfortschritt.',content:'Was hast du verstanden? Was war schwierig? Was möchtest du weiter üben?'}]}
  ]
}];

function ensureLearningState(){
  if(!STATE.learningJourneys) STATE.learningJourneys = structuredClone(DEFAULT_LEARNING_JOURNEYS);
  if(!STATE.activeJourneyId) STATE.activeJourneyId = 'elektro-grundlagen';
}
function activeJourney(){ensureLearningState();return STATE.learningJourneys.find(j=>j.id===STATE.activeJourneyId)||STATE.learningJourneys[0];}
function allJourneyTasks(j=activeJourney()){return j.steps.flatMap(s=>s.tasks.map(t=>({...t,stepId:s.id,stepTitle:s.title})));}
function findTask(id){for(const s of activeJourney().steps){const t=s.tasks.find(x=>x.id===id);if(t)return{task:t,step:s};}return null;}
function stepStatus(s,i,j=activeJourney()){const prev=j.steps.slice(0,i);const prevDone=prev.every(p=>p.tasks.filter(t=>t.required).every(t=>t.status==='done'));if(!prevDone)return'locked';const req=s.tasks.filter(t=>t.required);if(req.length&&req.every(t=>t.status==='done'))return'done';return'current';}
function currentStepIndex(j=activeJourney()){const i=j.steps.findIndex((s,idx)=>stepStatus(s,idx,j)==='current');return i<0?j.steps.length-1:i;}
function currentStep(j=activeJourney()){return j.steps[currentStepIndex(j)];}
function requiredAvailableTasks(j=activeJourney()){return allJourneyTasks(j).filter(t=>t.required&&t.status!=='locked');}
function journeyProgress(j=activeJourney()){const req=requiredAvailableTasks(j);return req.length?Math.round(req.filter(t=>t.status==='done').length/req.length*100):0;}
function nextLearningTask(j=activeJourney()){const s=currentStep(j);return s.tasks.find(t=>t.status==='todo'&&t.required)||s.tasks.find(t=>t.status==='todo')||allJourneyTasks(j).find(t=>t.status==='todo'&&t.required)||allJourneyTasks(j).find(t=>t.status==='todo');}
function unlockJourneyTasks(){const j=activeJourney();j.steps.forEach((s,i)=>{if(stepStatus(s,i,j)!=='locked')s.tasks.forEach(t=>{if(t.status==='locked')t.status='todo';});});}
function syncJourneyToDashboard(){
  ensureLearningState();unlockJourneyTasks();
  const j=activeJourney(),pct=journeyProgress(j),tasks=allJourneyTasks(j);
  const statOpen=document.getElementById('stat-open');if(statOpen)statOpen.textContent=tasks.filter(t=>['todo','in_progress'].includes(t.status)).length;
  const doneStat=document.querySelector('.done-stat .stat-value');if(doneStat)doneStat.textContent=tasks.filter(t=>t.status==='done').length;
  const goalTitle=document.querySelector('.goal-title');if(goalTitle)goalTitle.textContent=j.goal;
  const p1=document.getElementById('p1'),p1v=document.getElementById('p1v');if(p1&&p1v){p1.style.width=pct+'%';p1v.textContent=pct+'%';}
  document.querySelectorAll('.projekt-item').forEach(row=>{if(row.textContent.includes('Lernreise Elektrotechnik Grundlagen')){const pctEl=row.querySelector('.projekt-pct'),fill=row.querySelector('.projekt-fill');if(pctEl)pctEl.textContent=pct+'%';if(fill)fill.style.width=pct+'%';}});
  updateLearningJourneyBar();saveState(STATE);
}
function updateLearningJourneyBar(){
  const j=activeJourney();document.querySelectorAll('.lernreise .step').forEach((el,i)=>{if(!j.steps[i])return;const st=stepStatus(j.steps[i],i,j),c=el.querySelector('.step-circle'),l=el.querySelector('.step-label');if(!c)return;c.className='step-circle';if(st==='done'){c.classList.add('done');c.textContent='✓';}else if(st==='current'){c.classList.add('current');c.textContent=i+1;}else{c.classList.add(i===j.steps.length-1?'trophy':'locked');c.textContent=i===j.steps.length-1?'🏆':i+1;}if(l)l.classList.toggle('cur',st==='current');const b=el.querySelector('.step-badge');if(b)b.style.display=st==='current'?'block':'none';});
  const fill=document.querySelector('.lr-fill');if(fill)fill.style.width=Math.max(0,Math.min(100,(currentStepIndex(j)/(j.steps.length-1))*100))+'%';
}
function openLearningJourney(){renderLearningJourneyModal();document.getElementById('lr-modal').classList.add('open');}
function closeLearningJourney(){document.getElementById('lr-modal').classList.remove('open');}
function renderLearningJourneyModal(){
  const j=activeJourney(),pct=journeyProgress(j),cur=currentStep(j);
  document.getElementById('lr-modal-title').textContent=j.title;document.getElementById('lr-modal-sub').textContent=j.description;document.getElementById('lr-goal').textContent=j.goal;document.getElementById('lr-progress-number').textContent=pct+'%';document.getElementById('lr-progress-fill').style.width=pct+'%';document.getElementById('lr-current-title').textContent='Aufgaben der aktuellen Station: '+cur.title;
  document.getElementById('lr-mini-list').innerHTML=j.steps.map((s,i)=>{const st=stepStatus(s,i,j),icon=st==='done'?'✓':st==='current'?i+1:'–';return`<div class="lr-mini-item"><div class="lr-mini-dot ${st}">${icon}</div><div><strong>${s.title}</strong><br><span class="wz-label">${s.subtitle}</span></div></div>`;}).join('');
  document.getElementById('lr-stations').innerHTML=j.steps.map((s,i)=>{const st=stepStatus(s,i,j),req=s.tasks.filter(t=>t.required),done=req.filter(t=>t.status==='done').length;return`<div class="lr-station-card ${st}"><div class="lr-station-status">${st==='done'?'✓':st==='locked'?'🔒':i+1}</div><div class="lr-station-name">${s.title}</div><div class="lr-station-sub">${s.subtitle}</div><div class="lr-station-progress">${done}/${req.length} Pflichtaufgaben</div></div>`;}).join('');
  document.getElementById('lr-task-grid').innerHTML=cur.tasks.filter(t=>t.status!=='locked').map(taskCardHtml).join('');
}

/* ── Aufgabentyp-Hilfsfunktionen (neue Typen) ── */
function taskTypeIcon(type) {
  const t = String(type||'').toLowerCase();
  if(t==='lerninhalt' || t==='info' || t==='erklärung' || t==='material') return '📖 ';
  if(t==='aufgabe' || t==='übung' || t==='praxis') return '✏️ ';
  if(t==='quiz') return '🎯 ';
  if(t==='video') return '🎬 ';
  if(t==='reflexion') return '💬 ';
  return '📌 ';
}

function taskTypeColor(type) {
  const t = String(type||'').toLowerCase();
  if(t==='lerninhalt' || t==='info' || t==='erklärung' || t==='material') return '#185FA5';
  if(t==='aufgabe' || t==='übung' || t==='praxis') return '#3B6D11';
  if(t==='quiz') return '#854F0B';
  if(t==='video') return '#3C3489';
  if(t==='reflexion') return '#72243E';
  return '#444441';
}

function taskTypeBg(type) {
  const t = String(type||'').toLowerCase();
  if(t==='lerninhalt' || t==='info' || t==='erklärung' || t==='material') return '#E6F1FB';
  if(t==='aufgabe' || t==='übung' || t==='praxis') return '#EAF3DE';
  if(t==='quiz') return '#FAEEDA';
  if(t==='video') return '#EEEDFE';
  if(t==='reflexion') return '#FBEAF0';
  return '#F1EFE8';
}

/* Normalisiert alte auf neue Typen */
function normalizeTaskType(type) {
  const t = String(type||'').toLowerCase();
  if(t==='info' || t==='erklärung' || t==='material') return 'Lerninhalt';
  if(t==='übung' || t==='praxis') return 'Aufgabe';
  if(t==='quiz') return 'Quiz';
  if(t==='video') return 'Video';
  if(t==='reflexion') return 'Reflexion';
  if(t==='lerninhalt') return 'Lerninhalt';
  if(t==='aufgabe') return 'Aufgabe';
  return type || 'Aufgabe';
}

function taskCardHtml(t){
  const normType = normalizeTaskType(t.type);
  const color = taskTypeColor(normType);
  const bg = taskTypeBg(normType);
  const icon = taskTypeIcon(normType);
  return `<div class="lr-task-card ${t.status}">
    <div class="lr-task-title">${t.status==='done'?'✅ ':t.status==='in_progress'?'🟡 ':'☐ '}${t.title}</div>
    <div class="lr-task-desc">${t.description}</div>
    <div class="lr-task-tags">
      <span class="lr-task-tag" style="background:${bg};color:${color};border-color:${color}20">${icon}${normType}</span>
      <span class="lr-task-tag ${t.required?'required':'optional'}">${t.required?'Pflicht':'optional'}</span>
      ${t.status==='done'?'<span class="lr-task-tag done">erledigt</span>':''}
    </div>
    <div class="lr-task-buttons">
      <button class="lr-secondary-btn" onclick="openLearningTask('${t.id}')">Öffnen</button>
      ${t.status!=='done'?`<button class="lr-success-btn" onclick="completeLearningTask('${t.id}')">Erledigt</button>`:''}
    </div>
  </div>`;
}function checkCurrentStation(){const s=currentStep(),missing=s.tasks.filter(t=>t.required&&t.status!=='done');appendMsg('toni',missing.length?`In der aktuellen Station fehlen noch <strong>${missing.length}</strong> Pflichtaufgabe(n):<br>${missing.map(t=>'• '+t.title).join('<br>')}`:'✅ Diese Station ist abgeschlossen. Die nächste Station wurde freigeschaltet.',time(),'desktop');syncJourneyToDashboard();renderLearningJourneyModal();}
function startNextLearningTask(){const t=nextLearningTask();if(!t){appendMsg('toni','🎉 Alle aktuell verfügbaren Aufgaben sind erledigt. Starte die Reflexion.',time(),'desktop');return;}openLearningTask(t.id);}
function openLearningTask(id){const f=findTask(id);if(!f)return;STATE.selectedTaskId=id;if(f.task.status==='todo')f.task.status='in_progress';document.getElementById('lr-task-title').textContent=f.task.title;document.getElementById('lr-task-sub').textContent=`${f.step.title} · ${taskTypeIcon(f.task.type)}${f.task.type}`;document.getElementById('lr-task-content').innerHTML=`<strong>Auftrag:</strong><br>${f.task.content}`;document.getElementById('lr-answer').value=f.task.answer||'';document.getElementById('lr-task-hint').innerHTML=hintForTask(f.task);document.getElementById('lr-task-modal').classList.add('open');appendMsg('toni',`Du hast <strong>${f.task.title}</strong> geöffnet. Bearbeite die Aufgabe Schritt für Schritt.`,time(),'desktop');syncJourneyToDashboard();renderLearningJourneyModal();}
function closeLearningTask(){saveSelectedTaskAnswer();document.getElementById('lr-task-modal').classList.remove('open');}
function saveSelectedTaskAnswer(){const f=findTask(STATE.selectedTaskId);if(!f)return;f.task.answer=document.getElementById('lr-answer')?.value||f.task.answer||'';saveState(STATE);}
function startSelectedLearningTask(){const f=findTask(STATE.selectedTaskId);if(!f)return;f.task.status='in_progress';syncJourneyToDashboard();renderLearningJourneyModal();showXPToast(5);}
function completeSelectedLearningTask(){saveSelectedTaskAnswer();completeLearningTask(STATE.selectedTaskId);closeLearningTask();}
function completeLearningTask(id){const f=findTask(id);if(!f)return;f.task.status='done';if(f.task.title==='Praxisaufgabe bearbeiten'&&STATE.goals.open.includes('Praxisaufgabe bearbeiten')){STATE.goals.open=STATE.goals.open.filter(g=>g!=='Praxisaufgabe bearbeiten');STATE.goals.completed.push('Praxisaufgabe bearbeiten');}unlockJourneyTasks();syncJourneyToDashboard();renderLearningJourneyModal();showXPToast(20);appendMsg('toni',`✅ Gut gemacht! <strong>${f.task.title}</strong> ist erledigt. Dein Lernfortschritt liegt jetzt bei <strong>${journeyProgress()}%</strong>.`,time(),'desktop');}
function showSelectedTaskHint(){const f=findTask(STATE.selectedTaskId);if(!f)return;const h=hintForTask(f.task);document.getElementById('lr-task-hint').innerHTML=h;appendMsg('toni',h,time(),'desktop');}
function hintForTask(task){
  const t = String(task.type||'').toLowerCase();
  if(t==='video') return '🎥 Tipp: Notiere während des Videos drei Kernaussagen. Was nimmst du mit?';
  if(t==='quiz') return '🎯 Tipp: Lies die Frage genau. Schließe falsche Antworten aus bevor du wählst.';
  if(t==='reflexion') return '💬 Tipp: Es gibt keine falsche Antwort. Sei ehrlich mit dir selbst.';
  if(t==='aufgabe') return '⚡ Tipp: Welche Werte sind gegeben? Welche Größe wird gesucht? Schreibe zuerst die Formel.';
  if(t==='lerninhalt') return '📖 Tipp: Lies aufmerksam und markiere die wichtigsten Punkte.';
  return 'Ich helfe dir Schritt für Schritt. Was ist unklar?';
}
window.addEventListener('DOMContentLoaded',()=>setTimeout(syncJourneyToDashboard,0));

/* =========================================================
   TONI – SUPABASE / HELPER BOOTSTRAP FIX
   ========================================================= */
// Konfiguration wird über /api/config geladen (Umgebungsvariablen via Vercel)

if (typeof window.escapeHtml !== "function") {
  window.escapeHtml = function(value) {
    return String(value ?? "").replace(/[&<>"']/g, function(c) {
      return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c];
    });
  };
}

if (typeof window.supabaseRequest !== "function") {
  window.supabaseRequest = async function(path, options = {}) {
    const headers = {
      "apikey": window.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + window.SUPABASE_ANON_KEY,
      "Content-Type": "application/json",
      ...(options.headers || {})
    };

    const response = await fetch(`${window.SUPABASE_URL}/rest/v1/${path}`, {
      ...options,
      headers
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Supabase ${response.status}: ${text}`);
    }

    if (response.status === 204) return null;
    const body = await response.text();
    return body ? JSON.parse(body) : null;
  };
}

/* =========================================================
   TONI – PROFILE / ROLLEN V2
   ========================================================= */
const TONI_PROFILE_FALLBACKS=[];
let TONI_PROFILES=[];
let CURRENT_PROFILE=null;

function getCurrentProfileId(){
  return localStorage.getItem("toni_profile_id") || null;
}
function setCurrentProfileId(id){
  localStorage.setItem("toni_profile_id",id);
}
async function loadProfilesFromSupabase(){
  try{
    if(typeof supabaseRequest!=="function"){
      TONI_PROFILES=TONI_PROFILE_FALLBACKS;
      return TONI_PROFILES;
    }
    const rows=await supabaseRequest("profiles?is_active=eq.true&select=id,display_name,email,class_name,role&order=role.asc,display_name.asc");
    TONI_PROFILES=(rows&&rows.length)?rows:TONI_PROFILE_FALLBACKS;
    if(typeof setApiBadge==="function") setApiBadge(true);
  }catch(e){
    console.warn("Profile konnten nicht geladen werden:",e);
    TONI_PROFILES=TONI_PROFILE_FALLBACKS;
    if(typeof setApiBadge==="function") setApiBadge(false);
  }
  return TONI_PROFILES;
}
function renderProfileSelect(){
  const select=document.getElementById("profile-select");
  if(!select) return;
  const current=getCurrentProfileId();
  const esc = (typeof escapeHtml === "function") ? escapeHtml : (v => String(v ?? ""));
  select.innerHTML=TONI_PROFILES.map(p=>`<option value="${p.id}" ${p.id===current?"selected":""}>${esc(p.display_name)} · ${esc(p.role)}</option>`).join("");
}
function applyProfile(profile){
  if(!profile) return;
  CURRENT_PROFILE=profile;
  setCurrentProfileId(profile.id);
  localStorage.setItem("toni_role",profile.role||"student");
  window.TONI_ACTIVE_PROFILE_ID=profile.id;

  const greeting=document.querySelector(".topbar-greeting h2");
  if(greeting) greeting.innerHTML=`Hallo ${escapeHtml((profile.display_name||"Max").split(" ")[0])}! 👋`;

  const sub=document.querySelector(".topbar-greeting p");
  if(sub){
    const label=(typeof ROLE_CONFIG!=="undefined" && ROLE_CONFIG[profile.role]) ? ROLE_CONFIG[profile.role].label : profile.role;
    sub.textContent=`${label}${profile.class_name ? " · "+profile.class_name : ""}`;
  }

  if(typeof applyRoleUI==="function") applyRoleUI();

  const text=document.getElementById("role-info-text");
  if(text){
    const cfg=(typeof ROLE_CONFIG!=="undefined" && ROLE_CONFIG[profile.role]) ? ROLE_CONFIG[profile.role] : null;
    text.textContent=(cfg?cfg.text:"") + " Aktives Profil: " + profile.display_name + ".";
  }

  if(typeof STATE!=="undefined"){
    STATE.user=STATE.user||{};
    STATE.user.name=profile.display_name;
    STATE.user.class=profile.class_name||"";
    if(typeof saveState==="function") saveState(STATE);
  }
}
async function selectProfile(id){
  const profile=TONI_PROFILES.find(p=>p.id===id);
  if(!profile) return;
  applyProfile(profile);
  if(typeof appendMsg==="function") {
    const esc = (typeof escapeHtml === "function") ? escapeHtml : (v => String(v ?? ""));
    appendMsg("toni",`Profil gewechselt: <strong>${esc(profile.display_name)}</strong><br>Rolle: <strong>${esc(profile.role)}</strong>`,typeof time==="function"?time():"","desktop");
  }
}
window.getCurrentRole=function(){
  if(CURRENT_PROFILE&&CURRENT_PROFILE.role) return CURRENT_PROFILE.role;
  return localStorage.getItem("toni_role")||"student";
};
async function initProfilesAndRoles(){
  // Sofort Fallback-Profile anzeigen, damit der Schalter nie leer bleibt.
  if(!TONI_PROFILES || !TONI_PROFILES.length) {
    TONI_PROFILES = TONI_PROFILE_FALLBACKS;
    renderProfileSelect();
    applyProfile(TONI_PROFILES.find(p=>p.id===getCurrentProfileId()) || TONI_PROFILES[0]);
  }

  // Danach Supabase laden und Dropdown aktualisieren.
  await loadProfilesFromSupabase();
  renderProfileSelect();
  const profile=TONI_PROFILES.find(p=>p.id===getCurrentProfileId()) || TONI_PROFILES[0];
  applyProfile(profile);
}
window.addEventListener("DOMContentLoaded",()=>setTimeout(initProfilesAndRoles,700));

/* TONI – Fortschritt pro aktivem Profil speichern */
async function saveTaskProgressToSupabase(task){
  if(!task || !task.id || !task.id.includes("-")) return;
  if(typeof supabaseRequest!=="function") return;
  const profileId=window.TONI_ACTIVE_PROFILE_ID || localStorage.getItem("toni_profile_id") || null;
  try{
    await supabaseRequest("student_task_progress?on_conflict=student_id,task_id",{
      method:"POST",
      headers:{"Prefer":"resolution=merge-duplicates,return=representation"},
      body:JSON.stringify([{student_id:profileId,task_id:task.id,status:task.status||"todo",answer:task.answer||"",updated_at:new Date().toISOString()}])
    });
    if(typeof setApiBadge==="function") setApiBadge(true);
  }catch(e){
    console.warn("Fortschritt konnte nicht gespeichert werden:",e);
    if(typeof setApiBadge==="function") setApiBadge(false);
  }
}

/* =========================================================
   TONI – SUPABASE AUTH / LOGIN V3
   ========================================================= */
let TONI_SUPABASE = null;
let TONI_AUTH_SESSION = null;
let TONI_AUTH_PROFILE = null;

function getSupabaseClient() {
  if (TONI_SUPABASE) return TONI_SUPABASE;
  if (!window.supabase || !window.supabase.createClient) {
    console.error("Supabase JS wurde nicht geladen.");
    return null;
  }
  TONI_SUPABASE = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
  return TONI_SUPABASE;
}

async function getAuthAccessToken() {
  const client = getSupabaseClient();
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data?.session?.access_token || null;
}

// REST-Zugriffe künftig mit User-JWT ausführen, falls angemeldet.
window.supabaseRequest = async function(path, options = {}) {
  const token = await getAuthAccessToken();
  const bearer = token || window.SUPABASE_ANON_KEY;

  const headers = {
    "apikey": window.SUPABASE_ANON_KEY,
    "Authorization": "Bearer " + bearer,
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const response = await fetch(`${window.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase ${response.status}: ${text}`);
  }

  if (response.status === 204) return null;
  const body = await response.text();
  return body ? JSON.parse(body) : null;
};

function openAuthModal() {
  document.getElementById("auth-modal").classList.add("open");
  setTimeout(() => document.getElementById("auth-email")?.focus(), 80);
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.remove("open");
}

function setAuthMessage(text, type = "ok") {
  const box = document.getElementById("auth-message");
  if (!box) return;
  box.className = "auth-message visible " + (type === "err" ? "err" : "ok");
  box.innerHTML = text;
}

async function sendMagicLink() {
  const client = getSupabaseClient();
  const email = document.getElementById("auth-email").value.trim();

  if (!email) {
    setAuthMessage("Bitte gib eine E-Mail-Adresse ein.", "err");
    return;
  }

  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) throw error;

    setAuthMessage("✅ Magic Link wurde gesendet. Bitte prüfe dein E-Mail-Postfach.");
  } catch (error) {
    console.error(error);
    setAuthMessage("⚠️ Anmeldung konnte nicht gestartet werden:<br>" + escapeHtml(error.message), "err");
  }
}

async function signOutUser() {
  const client = getSupabaseClient();
  await client.auth.signOut();

  TONI_AUTH_SESSION = null;
  TONI_AUTH_PROFILE = null;
  localStorage.setItem("toni_role", "student");
  window.TONI_ACTIVE_PROFILE_ID = null;

  updateAuthUI(null, null);
  if (typeof applyRoleUI === "function") applyRoleUI();

  if (typeof appendMsg === "function") {
    appendMsg("toni", "Du wurdest abgemeldet. TONI zeigt nun wieder die Student-Ansicht.", time(), "desktop");
  }
}

async function ensureProfileForUser(user) {
  if (!user) return null;

  let rows = [];
  try {
    rows = await supabaseRequest(`profiles?id=eq.${user.id}&select=id,display_name,email,class_name,role&limit=1`);
  } catch (error) {
    console.warn("Profil konnte nicht gelesen werden:", error);
  }

  if (rows && rows.length) return rows[0];

  const fallbackName = user.email ? user.email.split("@")[0] : "Neuer Nutzer";

  try {
    const inserted = await supabaseRequest("profiles?on_conflict=id", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{
        id: user.id,
        display_name: fallbackName,
        email: user.email,
        class_name: "",
        role: "student"
      }])
    });
    return inserted?.[0] || {
      id: user.id,
      display_name: fallbackName,
      email: user.email,
      role: "student",
      class_name: ""
    };
  } catch (error) {
    console.warn("Profil konnte nicht erstellt werden:", error);
    return {
      id: user.id,
      display_name: fallbackName,
      email: user.email,
      role: "student",
      class_name: ""
    };
  }
}

function updateAuthUI(user, profile) {
  const nameEl = document.getElementById("auth-user-name");
  const roleEl = document.getElementById("auth-user-role");
  const loginBtn = document.getElementById("auth-login-btn");
  const logoutBtn = document.getElementById("auth-logout-btn");

  if (user && profile) {
    nameEl.textContent = profile.display_name || user.email || "Angemeldet";
    roleEl.textContent = `${profile.role || "student"}${profile.class_name ? " · " + profile.class_name : ""}`;
    loginBtn.style.display = "none";
    logoutBtn.style.display = "";
  } else {
    nameEl.textContent = "Nicht angemeldet";
    roleEl.textContent = "Student-Ansicht";
    loginBtn.style.display = "";
    logoutBtn.style.display = "none";
  }
}

function applyAuthProfile(profile) {
  if (!profile) return;

  TONI_AUTH_PROFILE = profile;
  localStorage.setItem("toni_role", profile.role || "student");
  localStorage.setItem("toni_profile_id", profile.id);
  window.TONI_ACTIVE_PROFILE_ID = profile.id;

  const greeting = document.querySelector(".topbar-greeting h2");
  if (greeting) greeting.innerHTML = `Hallo ${escapeHtml((profile.display_name || "Max").split(" ")[0])}! 👋`;

  const sub = document.querySelector(".topbar-greeting p");
  if (sub) {
    const roleLabel = (typeof ROLE_CONFIG !== "undefined" && ROLE_CONFIG[profile.role]) ? ROLE_CONFIG[profile.role].label : profile.role;
    sub.textContent = `${roleLabel}${profile.class_name ? " · " + profile.class_name : ""}`;
  }

  const text = document.getElementById("role-info-text");
  if (text) {
    const cfg = (typeof ROLE_CONFIG !== "undefined" && ROLE_CONFIG[profile.role]) ? ROLE_CONFIG[profile.role] : null;
    text.textContent = (cfg ? cfg.text : "Angemeldet.") + " Aktives Profil: " + profile.display_name + ".";
  }

  if (typeof applyRoleUI === "function") applyRoleUI();

  if (typeof STATE !== "undefined") {
    STATE.user = STATE.user || {};
    STATE.user.name = profile.display_name || STATE.user.name;
    STATE.user.class = profile.class_name || "";
    if (typeof saveState === "function") saveState(STATE);
  }
}

// Rolle künftig aus Auth-Profil lesen.
window.getCurrentRole = function() {
  if (TONI_AUTH_PROFILE && TONI_AUTH_PROFILE.role) return TONI_AUTH_PROFILE.role;
  return localStorage.getItem("toni_role") || "student";
};

async function handleAuthSession(session) {
  TONI_AUTH_SESSION = session || null;

  if (!session?.user) {
    updateAuthUI(null, null);
    localStorage.setItem("toni_role", "student");
    if (typeof applyRoleUI === "function") applyRoleUI();
    return;
  }

  const profile = await ensureProfileForUser(session.user);
  applyAuthProfile(profile);
  updateAuthUI(session.user, profile);
  closeAuthModal();

  if (typeof appendMsg === "function") {
    appendMsg("toni", `✅ Angemeldet als <strong>${escapeHtml(profile.display_name)}</strong> (${escapeHtml(profile.role)}).`, time(), "desktop");
  }
}

async function initAuthLogin() {
  const client = getSupabaseClient();
  if (!client) return;

  const { data } = await client.auth.getSession();
  await handleAuthSession(data?.session || null);

  client.auth.onAuthStateChange(async (_event, session) => {
    await handleAuthSession(session);
  });
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(initAuthLogin, 950);
});

/* =========================================================
   TONI – LERNGRUPPEN / QR-BEITRITT V4
   ========================================================= */
let TONI_GROUPS=[]; let ACTIVE_GROUP_ID=null;

function generateJoinCode(){const a="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let c="GRP-";for(let i=0;i<8;i++)c+=a[Math.floor(Math.random()*a.length)];return c;}
function getActiveProfileIdForGroups(){return window.TONI_ACTIVE_PROFILE_ID || localStorage.getItem("toni_profile_id") || null;}
function getJoinCodeFromUrl(){return new URL(window.location.href).searchParams.get("join");}
function buildJoinLink(g){return `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(g.join_code)}`;}
function canManageGroups(){const r=typeof getCurrentRole==="function"?getCurrentRole():localStorage.getItem("toni_role");return r==="tutor"||r==="admin";}

async function createLearningGroup(){
  if(!canManageGroups()){appendMsg?.("toni","🔒 Lerngruppen können nur Tutor oder Admin anlegen.",time?.()||"","desktop");return;}
  const name=document.getElementById("group-name").value.trim();
  const description=document.getElementById("group-description").value.trim();
  const tutorId=getActiveProfileIdForGroups();
  if(!name){alert("Bitte gib einen Namen für die Lerngruppe ein.");return;}
  if(!tutorId){alert("Bitte melde dich zuerst an.");return;}
  try{
    const rows=await supabaseRequest("learning_groups",{method:"POST",headers:{"Prefer":"return=representation"},body:JSON.stringify([{name,description,tutor_id:tutorId,join_code:generateJoinCode(),is_active:true}])});
    document.getElementById("group-name").value=""; document.getElementById("group-description").value="";
    appendMsg?.("toni",`✅ Lerngruppe <strong>${escapeHtml(name)}</strong> wurde angelegt.`,time?.()||"","desktop");
    await loadTutorGroups(); if(rows&&rows[0]) selectLearningGroup(rows[0].id);
  }catch(e){console.error(e);appendMsg?.("error",`⚠️ Lerngruppe konnte nicht angelegt werden.<br><small>${escapeHtml(e.message)}</small>`,time?.()||"","desktop");}
}

async function loadTutorGroups(){
  if(!canManageGroups())return;
  const profileId=getActiveProfileIdForGroups(); if(!profileId)return;
  try{
    const role=getCurrentRole();
    let q="learning_groups?select=*&order=created_at.desc";
    if(role!=="admin") q=`learning_groups?tutor_id=eq.${profileId}&select=*&order=created_at.desc`;
    TONI_GROUPS=await supabaseRequest(q)||[];
    renderGroupList();
    if(TONI_GROUPS.length&&!ACTIVE_GROUP_ID) selectLearningGroup(TONI_GROUPS[0].id);
  }catch(e){console.warn(e);const el=document.getElementById("group-list");if(el)el.innerHTML=`<div class="lr-editor-empty">Lerngruppen konnten nicht geladen werden.<br>${escapeHtml(e.message)}</div>`;}
}

function renderGroupList(){
  const root=document.getElementById("group-list"); if(!root)return;
  if(!TONI_GROUPS.length){root.innerHTML=`<div class="lr-editor-empty">Noch keine Lerngruppen vorhanden.</div>`;return;}
  root.innerHTML=TONI_GROUPS.map(g=>`<div class="group-row ${g.id===ACTIVE_GROUP_ID?"active":""}" onclick="selectLearningGroup('${g.id}')"><div class="group-row-title">${escapeHtml(g.name)}</div><div class="group-row-meta">Join-Code: ${escapeHtml(g.join_code)}</div></div>`).join("");
}

async function selectLearningGroup(id){
  ACTIVE_GROUP_ID=id; renderGroupList();
  const g=TONI_GROUPS.find(x=>x.id===id); if(!g)return;
  document.getElementById("group-detail-empty").style.display="none";
  document.getElementById("group-detail").style.display="";
  document.getElementById("active-group-title").textContent=g.name;
  document.getElementById("group-join-card").style.display="none";
  await refreshGroupMembers();
}

function generateJoinQRCode(){
  const g=TONI_GROUPS.find(x=>x.id===ACTIVE_GROUP_ID); if(!g)return;
  const link=buildJoinLink(g);
  const qrUrl="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data="+encodeURIComponent(link);
  document.getElementById("qr-box").innerHTML=`<img alt="QR-Code für Lerngruppe" src="${qrUrl}">`;
  document.getElementById("join-link-box").textContent=link;
  document.getElementById("group-join-card").style.display="";
}

async function copyJoinLink(){
  const g=TONI_GROUPS.find(x=>x.id===ACTIVE_GROUP_ID); if(!g)return;
  const link=buildJoinLink(g);
  try{await navigator.clipboard.writeText(link);appendMsg?.("toni","✅ Einladungslink wurde kopiert.",time?.()||"","desktop");}
  catch{prompt("Einladungslink kopieren:",link);}
}

async function refreshGroupMembers(){
  const root=document.getElementById("group-members"); if(!root||!ACTIVE_GROUP_ID)return;
  try{
    const rows=await supabaseRequest(`learning_group_members?group_id=eq.${ACTIVE_GROUP_ID}&select=role_in_group,joined_at,profiles(display_name,email,class_name,role)&order=joined_at.asc`);
    if(!rows||!rows.length){root.innerHTML=`<div class="lr-editor-empty">Noch keine Mitglieder in dieser Lerngruppe.</div>`;return;}
    root.innerHTML=`<table class="member-table"><thead><tr><th>Name</th><th>Klasse</th><th>Rolle</th><th>Beigetreten</th></tr></thead><tbody>${rows.map(r=>{const p=r.profiles||{};return `<tr><td>${escapeHtml(p.display_name||p.email||"Unbekannt")}</td><td>${escapeHtml(p.class_name||"-")}</td><td><span class="group-badge ${escapeHtml(p.role||"student")}">${escapeHtml(r.role_in_group||p.role||"student")}</span></td><td>${new Date(r.joined_at).toLocaleDateString("de-DE")}</td></tr>`}).join("")}</tbody></table>`;
  }catch(e){console.error(e);root.innerHTML=`<div class="lr-editor-empty">Mitglieder konnten nicht geladen werden.<br>${escapeHtml(e.message)}</div>`;}
}

async function handleJoinLinkAfterLogin(){
  const joinCode=getJoinCodeFromUrl(); if(!joinCode)return;
  const banner=document.getElementById("join-banner");
  if(!window.TONI_AUTH_SESSION?.user){if(banner){banner.className="join-banner visible";banner.innerHTML="Du möchtest einer Lerngruppe beitreten. Bitte melde dich zuerst an. Danach ordnet TONI dich automatisch zu.";}openAuthModal?.();return;}
  try{
    const result=await supabaseRequest("rpc/join_learning_group_by_code",{method:"POST",body:JSON.stringify({p_join_code:joinCode})});
    if(banner){banner.className="join-banner visible";banner.innerHTML=`✅ Du bist der Lerngruppe <strong>${escapeHtml(result.group_name||"Lerngruppe")}</strong> beigetreten.`;}
    appendMsg?.("toni",`✅ Du bist der Lerngruppe <strong>${escapeHtml(result.group_name||"Lerngruppe")}</strong> zugeordnet.`,time?.()||"","desktop");
    const url=new URL(window.location.href); url.searchParams.delete("join"); window.history.replaceState({},"",url.toString());
  }catch(e){console.error(e);if(banner){banner.className="join-banner visible err";banner.innerHTML=`⚠️ Beitritt fehlgeschlagen.<br><small>${escapeHtml(e.message)}</small>`;}}
}

const toniGroupsOriginalApplyRoleUI=window.applyRoleUI;
window.applyRoleUI=function(){if(typeof toniGroupsOriginalApplyRoleUI==="function")toniGroupsOriginalApplyRoleUI();const panel=document.getElementById("group-panel");if(panel)panel.classList.toggle("visible",canManageGroups());if(canManageGroups())setTimeout(loadTutorGroups,100);};

const toniGroupsOriginalHandleAuthSession=window.handleAuthSession;
window.handleAuthSession=async function(session){if(typeof toniGroupsOriginalHandleAuthSession==="function")await toniGroupsOriginalHandleAuthSession(session);setTimeout(handleJoinLinkAfterLogin,300);};

window.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{if(typeof applyRoleUI==="function")applyRoleUI();handleJoinLinkAfterLogin();},1300));

/* =========================================================
   TONI – AUTH V15 / Registrierung-Fenster schließen
   ========================================================= */
window.TONI_REGISTRATION_MANUALLY_CLOSED = sessionStorage.getItem("toni_registration_modal_closed") === "1";

function toniV15ShouldSuppressRegistrationModal() {
  return window.TONI_REGISTRATION_MANUALLY_CLOSED === true ||
         sessionStorage.getItem("toni_registration_modal_closed") === "1";
}

function toniV15CloseRegistrationModal() {
  window.TONI_REGISTRATION_MANUALLY_CLOSED = true;
  sessionStorage.setItem("toni_registration_modal_closed", "1");

  const modal = document.getElementById("registration-required-modal");
  if (modal) {
    modal.classList.remove("open");
    modal.style.display = "none";
  }

  const msg = document.getElementById("registration-message");
  if (msg) msg.className = "auth-message";
}

function toniV15InsertRegistrationCloseButton() {
  const modal = document.getElementById("registration-required-modal");
  if (!modal) return;

  const header =
    modal.querySelector(".registration-required-header") ||
    modal.querySelector(".auth-modal-header") ||
    modal.querySelector("[class*='header']");

  if (!header) return;
  if (header.querySelector(".registration-modal-close")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "registration-modal-close";
  btn.setAttribute("aria-label", "Fenster schließen");
  btn.innerHTML = "×";
  btn.onclick = toniV15CloseRegistrationModal;

  header.appendChild(btn);
}

const TONI_V15_ORIGINAL_OPEN_REGISTRATION_MODAL = window.openRegistrationRequiredModal;

window.openRegistrationRequiredModal = function(force = false) {
  if (!force && toniV15ShouldSuppressRegistrationModal()) return;

  if (typeof TONI_V15_ORIGINAL_OPEN_REGISTRATION_MODAL === "function") {
    TONI_V15_ORIGINAL_OPEN_REGISTRATION_MODAL();
  } else {
    const modal = document.getElementById("registration-required-modal");
    if (modal) {
      modal.style.display = "";
      modal.classList.add("open");
    }
  }

  toniV15InsertRegistrationCloseButton();
};

if (typeof window.toniV13OpenRegistration === "function") {
  const TONI_V15_ORIGINAL_V13_OPEN = window.toniV13OpenRegistration;
  window.toniV13OpenRegistration = function(profile, reason) {
    if (toniV15ShouldSuppressRegistrationModal()) return;
    TONI_V15_ORIGINAL_V13_OPEN(profile, reason);
    setTimeout(toniV15InsertRegistrationCloseButton, 50);
  };
}

if (typeof window.toniV12OpenRegistration === "function") {
  const TONI_V15_ORIGINAL_V12_OPEN = window.toniV12OpenRegistration;
  window.toniV12OpenRegistration = function(profile) {
    if (toniV15ShouldSuppressRegistrationModal()) return;
    TONI_V15_ORIGINAL_V12_OPEN(profile);
    setTimeout(toniV15InsertRegistrationCloseButton, 50);
  };
}

const TONI_V15_ORIGINAL_SEND_VERIFICATION = window.sendVerificationMail;
if (typeof TONI_V15_ORIGINAL_SEND_VERIFICATION === "function") {
  window.sendVerificationMail = async function(email) {
    window.TONI_REGISTRATION_MANUALLY_CLOSED = false;
    sessionStorage.removeItem("toni_registration_modal_closed");
    return TONI_V15_ORIGINAL_SEND_VERIFICATION(email);
  };
}

const TONI_V15_ORIGINAL_COMPLETE_REGISTRATION = window.completeSelfRegistration;
if (typeof TONI_V15_ORIGINAL_COMPLETE_REGISTRATION === "function") {
  window.completeSelfRegistration = async function() {
    const result = await TONI_V15_ORIGINAL_COMPLETE_REGISTRATION();
    sessionStorage.removeItem("toni_registration_modal_closed");
    window.TONI_REGISTRATION_MANUALLY_CLOSED = false;
    return result;
  };
}

window.addEventListener("DOMContentLoaded", () => {
  toniV15InsertRegistrationCloseButton();
  setTimeout(toniV15InsertRegistrationCloseButton, 500);
  setTimeout(toniV15InsertRegistrationCloseButton, 1500);
});

/* =========================================================
   TONI – V16 / Admin-Tutor Lernreisen CRUD
   ========================================================= */
window.TONI_ADMIN_JOURNEYS = [];
window.TONI_ACTIVE_ADMIN_JOURNEY_ROW = null;

function canManageLearningJourneysV16(){
  const role = (window.TONI_AUTH_PROFILE && TONI_AUTH_PROFILE.role) || localStorage.getItem("toni_role") || "student";
  return role === "admin" || role === "tutor";
}

function getJourneyOwnerIdV16(){
  return (window.TONI_AUTH_PROFILE && TONI_AUTH_PROFILE.id) ||
         window.TONI_ACTIVE_PROFILE_ID ||
         localStorage.getItem("toni_profile_id") ||
         null;
}

function escapeToniV16(value){
  if(typeof escapeHtml === "function") return escapeHtml(value);
  return String(value ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}

function uuidLikeV16(){
  if(crypto && crypto.randomUUID) return crypto.randomUUID();
  return "jr-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function getLocalJourneysV16(){
  try { return JSON.parse(localStorage.getItem("toni_admin_learning_journeys_v16") || "[]"); }
  catch { return []; }
}

function setLocalJourneysV16(rows){
  localStorage.setItem("toni_admin_learning_journeys_v16", JSON.stringify(rows || []));
}

function fillJourneyExample(){
  document.getElementById("journey-title").value = "Ohmsches Gesetz sicher anwenden";
  document.getElementById("journey-subject").value = "Technische Mathematik / Elektrotechnik";
  document.getElementById("journey-goal").value = "Ich kann Spannung, Stromstärke und Widerstand berechnen und in Praxisbeispielen anwenden.";
  document.getElementById("journey-description").value = "Lernreise mit Grundlagen, Rechenaufgaben, Praxisbezug und Reflexion.";
  document.getElementById("journey-structure").value =
`Station: Einstieg | Orientierung | Die Lernenden verstehen Ziel und Ablauf der Lernreise.
- [Pflicht] Info | Lernziel lesen | Lies das Ziel der Lernreise und markiere, was dir bereits bekannt ist.
- [Optional] Reflexion | Vorwissen notieren | Notiere, was du über Strom, Spannung und Widerstand weißt.

Station: Grundlagen | Strom & Spannung | Die Grundgrößen der Elektrotechnik werden wiederholt.
- [Pflicht] Erklärung | Stromstärke und Spannung erklären | Erkläre die Begriffe U und I mit eigenen Worten.
- [Pflicht] Quiz | Einheiten zuordnen | Ordne Volt, Ampere und Ohm den passenden Größen zu.

Station: Ohmsches Gesetz | Rechnen & anwenden | Die Formel U = R · I wird angewendet.
- [Pflicht] Rechenaufgabe | Aufgabe 1 berechnen | Gegeben: U = 12 V, R = 120 Ω. Berechne I.
- [Pflicht] Praxis | LED-Beispiel bearbeiten | Berechne den Widerstand einer LED-Schaltung.
- [Optional] Video | Reihenschaltung ansehen | Schaue ein Video zur Reihenschaltung.

Station: Reflexion | Ziel erreicht | Der Lernfortschritt wird reflektiert.
- [Pflicht] Reflexion | Lernreise auswerten | Was kannst du jetzt sicher? Wo brauchst du noch Übung?`;
}

function resetJourneyEditor(){
  window.TONI_ACTIVE_ADMIN_JOURNEY_ROW = null;
  document.getElementById("journey-edit-id").value = "";
  document.getElementById("journey-editor-title").textContent = "Neue Lernreise anlegen";
  ["journey-title","journey-subject","journey-goal","journey-description","journey-structure"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = "";
  });
}

function parseJourneyStructureV16(text){
  const lines = String(text || "").split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const steps = [];
  let current = null;

  lines.forEach((line, index) => {
    if(/^Station\s*:/i.test(line)){
      const raw = line.replace(/^Station\s*:/i, "").trim();
      const parts = raw.split("|").map(p => p.trim());
      current = {
        id: "station-" + (steps.length + 1) + "-" + uuidLikeV16().slice(0,8),
        title: parts[0] || "Station " + (steps.length + 1),
        subtitle: parts[1] || "",
        description: parts[2] || "",
        tasks: []
      };
      steps.push(current);
      return;
    }

    if(line.startsWith("-")){
      if(!current){
        current = { id: "station-1-" + uuidLikeV16().slice(0,8), title: "Station 1", subtitle: "", description: "", tasks: [] };
        steps.push(current);
      }

      let raw = line.replace(/^-+/, "").trim();
      const required = /\[(Pflicht|required)\]/i.test(raw);
      const optional = /\[(Optional|optional)\]/i.test(raw);
      raw = raw.replace(/\[(Pflicht|required|Optional|optional)\]/ig, "").trim();

      const parts = raw.split("|").map(p => p.trim());
      const type = parts[0] || "Aufgabe";
      const title = parts[1] || "Aufgabe " + (current.tasks.length + 1);
      const description = parts[2] || "";

      current.tasks.push({
        id: "task-" + (steps.length) + "-" + (current.tasks.length + 1) + "-" + uuidLikeV16().slice(0,8),
        title,
        type,
        status: steps.length === 1 ? "todo" : "locked",
        required: optional ? false : (required ? true : true),
        description,
        content: description || title
      });
    }
  });

  if(!steps.length){
    throw new Error("Bitte lege mindestens eine Station an.");
  }

  steps.forEach((s, idx) => {
    if(!s.tasks.length){
      s.tasks.push({
        id: "task-" + (idx + 1) + "-1-" + uuidLikeV16().slice(0,8),
        title: "Aufgabe bearbeiten",
        type: "Aufgabe",
        status: idx === 0 ? "todo" : "locked",
        required: true,
        description: "Aufgabe dieser Station bearbeiten.",
        content: "Bearbeite die Aufgabe dieser Station."
      });
    }
  });

  return steps;
}

function journeyToStructureTextV16(journey){
  if(!journey || !journey.steps) return "";
  return journey.steps.map(step => {
    const head = `Station: ${step.title || ""} | ${step.subtitle || ""} | ${step.description || ""}`;
    const tasks = (step.tasks || []).map(t => `- [${t.required ? "Pflicht" : "Optional"}] ${t.type || "Aufgabe"} | ${t.title || ""} | ${t.description || t.content || ""}`);
    return [head, ...tasks].join("\n");
  }).join("\n\n");
}

function buildJourneyFromFormV16(id){
  const title = document.getElementById("journey-title").value.trim();
  const subject = document.getElementById("journey-subject").value.trim();
  const goal = document.getElementById("journey-goal").value.trim();
  const description = document.getElementById("journey-description").value.trim();
  const structure = document.getElementById("journey-structure").value.trim();

  if(!title) throw new Error("Bitte gib einen Titel ein.");
  if(!goal) throw new Error("Bitte gib ein Lernziel ein.");
  if(!structure) throw new Error("Bitte lege Stationen und Aufgaben an.");

  const steps = parseJourneyStructureV16(structure);

  return {
    id: id || uuidLikeV16(),
    title,
    subject,
    goal,
    description,
    steps
  };
}

function rowToJourneyV16(row){
  const j = row.journey_json || {};
  return {
    id: row.id || j.id || uuidLikeV16(),
    title: row.title || j.title || "Lernreise",
    subject: row.subject || j.subject || "",
    goal: row.goal || j.goal || "",
    description: row.description || j.description || "",
    steps: j.steps || []
  };
}

async function loadAdminLearningJourneys(){
  const list = document.getElementById("admin-journey-list");
  if(!list) return;

  if(!canManageLearningJourneysV16()){
    list.innerHTML = `<div class="journey-empty">🔒 Lernreisen können nur Admins und Tutoren verwalten.</div>`;
    return;
  }

  list.innerHTML = `<div class="journey-empty">Lernreisen werden geladen …</div>`;

  try{
    const ownerId = getJourneyOwnerIdV16();
    let rows = [];

    if(typeof supabaseRequest === "function" && ownerId){
      const role = (window.TONI_AUTH_PROFILE && TONI_AUTH_PROFILE.role) || localStorage.getItem("toni_role") || "student";
      const query = role === "admin"
        ? "learning_journey_templates?select=*&order=updated_at.desc"
        : `learning_journey_templates?owner_profile_id=eq.${encodeURIComponent(ownerId)}&select=*&order=updated_at.desc`;
      rows = await supabaseRequest(query);
      rows = (rows || []).map(r => ({...r, _source:"remote"}));
    }else{
      rows = getLocalJourneysV16().map(r => ({...r, _source:"local"}));
    }

    if(!rows.length){
      list.innerHTML = `<div class="journey-empty">Noch keine Lernreisen vorhanden. Lege links eine neue Lernreise an.</div>`;
      window.TONI_ADMIN_JOURNEYS = [];
      return;
    }

    window.TONI_ADMIN_JOURNEYS = rows;
    renderAdminJourneyListV16(rows);
  }catch(error){
    console.warn("Lernreisen konnten nicht aus Supabase geladen werden:", error);
    const local = getLocalJourneysV16().map(r => ({...r, _source:"local"}));
    window.TONI_ADMIN_JOURNEYS = local;
    if(local.length){
      renderAdminJourneyListV16(local);
    }else{
      list.innerHTML = `<div class="journey-empty">⚠️ Lernreisen konnten nicht geladen werden:<br>${escapeToniV16(error.message)}</div>`;
    }
  }
}

function renderAdminJourneyListV16(rows){
  const list = document.getElementById("admin-journey-list");
  if(!list) return;

  list.innerHTML = rows.map(row => {
    const j = rowToJourneyV16(row);
    const stations = (j.steps || []).length;
    const tasks = (j.steps || []).reduce((sum, s) => sum + ((s.tasks || []).length), 0);
    const src = row._source === "local" ? "local" : "remote";
    return `
      <div class="journey-list-item">
        <div>
          <div class="journey-list-title">${escapeToniV16(j.title)}</div>
          <div class="journey-list-meta">
            ${escapeToniV16(j.subject || "Ohne Fach")} · ${stations} Station(en) · ${tasks} Aufgabe(n)<br>
            Ziel: ${escapeToniV16(j.goal || "–")}<br>
            <span class="journey-status-pill ${src}">${src === "local" ? "lokal" : "gespeichert"}</span>
          </div>
        </div>
        <div class="journey-list-actions">
          <button class="lr-secondary-btn" onclick="openAdminJourney('${row.id}')">Öffnen</button>
          <button class="lr-secondary-btn" onclick="editAdminJourney('${row.id}')">Bearbeiten</button>
          <button class="lr-secondary-btn" onclick="deleteAdminJourney('${row.id}')">Löschen</button>
        </div>
      </div>`;
  }).join("");
}

function findAdminJourneyRowV16(id){
  return (window.TONI_ADMIN_JOURNEYS || []).find(r => String(r.id) === String(id));
}

function openAdminJourney(id){
  const row = findAdminJourneyRowV16(id);
  if(!row){ alert("Lernreise wurde nicht gefunden."); return; }

  const journey = rowToJourneyV16(row);
  ensureLearningState?.();

  STATE.learningJourneys = STATE.learningJourneys || [];
  const existing = STATE.learningJourneys.findIndex(j => String(j.id) === String(journey.id));
  if(existing >= 0) STATE.learningJourneys[existing] = journey;
  else STATE.learningJourneys.push(journey);

  STATE.activeJourneyId = journey.id;
  saveState?.(STATE);
  syncJourneyToDashboard?.();
  renderLearningJourneyModal?.();
  document.getElementById("lr-modal")?.classList.add("open");

  appendMsg?.("toni", `📚 Lernreise geöffnet: <strong>${escapeToniV16(journey.title)}</strong>`, typeof time === "function" ? time() : "", "desktop");
}

function editAdminJourney(id){
  const row = findAdminJourneyRowV16(id);
  if(!row){ alert("Lernreise wurde nicht gefunden."); return; }

  const j = rowToJourneyV16(row);
  window.TONI_ACTIVE_ADMIN_JOURNEY_ROW = row;

  document.getElementById("journey-edit-id").value = row.id;
  document.getElementById("journey-editor-title").textContent = "Lernreise bearbeiten";
  document.getElementById("journey-title").value = j.title || "";
  document.getElementById("journey-subject").value = j.subject || "";
  document.getElementById("journey-goal").value = j.goal || "";
  document.getElementById("journey-description").value = j.description || "";
  document.getElementById("journey-structure").value = journeyToStructureTextV16(j);

  document.getElementById("journey-admin-panel")?.scrollIntoView({behavior:"smooth", block:"start"});
}

async function saveAdminLearningJourney(){
  if(!canManageLearningJourneysV16()){
    alert("Nur Admins und Tutoren können Lernreisen speichern.");
    return;
  }

  try{
    const editId = document.getElementById("journey-edit-id").value || "";
    const ownerId = getJourneyOwnerIdV16();
    const journey = buildJourneyFromFormV16(editId || null);

    const rowData = {
      owner_profile_id: ownerId,
      title: journey.title,
      subject: journey.subject || "",
      goal: journey.goal || "",
      description: journey.description || "",
      journey_json: journey,
      updated_at: new Date().toISOString()
    };

    if(typeof supabaseRequest === "function" && ownerId){
      if(editId){
        await supabaseRequest(`learning_journey_templates?id=eq.${encodeURIComponent(editId)}`, {
          method: "PATCH",
          headers: {"Prefer":"return=representation"},
          body: JSON.stringify(rowData)
        });
      }else{
        await supabaseRequest("learning_journey_templates", {
          method: "POST",
          headers: {"Prefer":"return=representation"},
          body: JSON.stringify([{...rowData, id: journey.id}])
        });
      }
    }else{
      const rows = getLocalJourneysV16();
      const row = {...rowData, id: editId || journey.id, _source:"local", created_at:new Date().toISOString()};
      const idx = rows.findIndex(r => String(r.id) === String(row.id));
      if(idx >= 0) rows[idx] = row; else rows.unshift(row);
      setLocalJourneysV16(rows);
    }

    resetJourneyEditor();
    await loadAdminLearningJourneys();
    appendMsg?.("toni", "✅ Lernreise wurde gespeichert.", typeof time === "function" ? time() : "", "desktop");
  }catch(error){
    console.error("Lernreise speichern:", error);
    alert("Lernreise konnte nicht gespeichert werden:\n" + error.message);
  }
}

async function deleteAdminJourney(id){
  const row = findAdminJourneyRowV16(id);
  if(!row) return;

  const title = rowToJourneyV16(row).title;
  if(!confirm(`Lernreise „${title}“ wirklich löschen?`)) return;

  try{
    if(row._source === "local" || typeof supabaseRequest !== "function"){
      const rows = getLocalJourneysV16().filter(r => String(r.id) !== String(id));
      setLocalJourneysV16(rows);
    }else{
      await supabaseRequest(`learning_journey_templates?id=eq.${encodeURIComponent(id)}`, {method:"DELETE"});
    }

    if(String(document.getElementById("journey-edit-id")?.value) === String(id)) resetJourneyEditor();

    await loadAdminLearningJourneys();
    appendMsg?.("toni", "🗑️ Lernreise wurde gelöscht.", typeof time === "function" ? time() : "", "desktop");
  }catch(error){
    console.error("Lernreise löschen:", error);
    alert("Lernreise konnte nicht gelöscht werden:\n" + error.message);
  }
}

function showJourneyAdminPanelIfAllowedV16(){
  const panel = document.getElementById("journey-admin-panel");
  if(!panel) return;
  const allowed = canManageLearningJourneysV16();
  panel.style.display = allowed ? "" : "none";
  panel.classList.toggle("visible", allowed);
  if(allowed) setTimeout(loadAdminLearningJourneys, 250);
}

// applyRoleUI zusätzlich erweitern
const TONI_V16_ORIGINAL_APPLY_ROLE_UI = window.applyRoleUI;
window.applyRoleUI = function(){
  if(typeof TONI_V16_ORIGINAL_APPLY_ROLE_UI === "function"){
    TONI_V16_ORIGINAL_APPLY_ROLE_UI();
  }
  showJourneyAdminPanelIfAllowedV16();
};

// Auth-/Dashboard-Funktionen nachziehen, weil ältere Layer Panels hart setzen
["toniV10ShowAdminDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(showJourneyAdminPanelIfAllowedV16, 100);
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(showJourneyAdminPanelIfAllowedV16, 700);
  setTimeout(showJourneyAdminPanelIfAllowedV16, 1800);
  setTimeout(showJourneyAdminPanelIfAllowedV16, 3500);
});

/* =========================================================
   TONI – V17 / Lernreise-Editor mit Stationsformular
   ========================================================= */
window.TONI_JOURNEY_BUILDER_STATIONS=[];window.TONI_CURRENT_STATION_TASKS=[];
function toniV17Escape(value){if(typeof escapeHtml==="function")return escapeHtml(value);return String(value??"").replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
function toniV17Uuid(){if(window.crypto&&crypto.randomUUID)return crypto.randomUUID();return "id-"+Date.now()+"-"+Math.random().toString(16).slice(2)}
function setupJourneyBuilderV17(){const legacy=document.getElementById("journey-structure");if(legacy&&legacy.parentElement)legacy.parentElement.classList.add("journey-legacy-structure-field");renderTaskBuilderListV17();renderStationPreviewV17()}
function clearTaskBuilder(){const title=document.getElementById("task-title"),desc=document.getElementById("task-description"),type=document.getElementById("task-type"),req=document.getElementById("task-required");if(title)title.value="";if(desc)desc.value="";if(type)type.value="Lerninhalt";if(req)req.checked=true}
function addTaskToStationBuilder(){const type=document.getElementById("task-type")?.value||"Aufgabe",title=document.getElementById("task-title")?.value.trim(),description=document.getElementById("task-description")?.value.trim(),required=document.getElementById("task-required")?.checked!==false;if(!title){alert("Bitte gib einen Aufgabentitel ein.");return}window.TONI_CURRENT_STATION_TASKS.push({id:"task-"+toniV17Uuid(),title,type,description:description||"",content:description||title,required,status:"todo"});clearTaskBuilder();renderTaskBuilderListV17()}
function removeTaskFromStationBuilder(index){window.TONI_CURRENT_STATION_TASKS.splice(index,1);renderTaskBuilderListV17()}
function renderTaskBuilderListV17(){const wrap=document.getElementById("station-task-list");if(!wrap)return;const tasks=window.TONI_CURRENT_STATION_TASKS||[];if(!tasks.length){wrap.innerHTML='<div class="journey-empty">Noch keine Aufgabe für diese Station hinzugefügt.</div>';return}wrap.innerHTML=tasks.map((task,index)=>`<div class="station-task-chip"><div><strong>${toniV17Escape(task.type)} · ${toniV17Escape(task.title)}</strong><br>${task.required?"Pflichtaufgabe":"Optionale Aufgabe"}${task.description?" · "+toniV17Escape(task.description):""}</div><button type="button" class="station-small-btn" onclick="removeTaskFromStationBuilder(${index})">Entfernen</button></div>`).join("")}
function clearStationBuilder(){const edit=document.getElementById("station-edit-index"),title=document.getElementById("station-title"),subtitle=document.getElementById("station-subtitle"),desc=document.getElementById("station-description");if(edit)edit.value="";if(title)title.value="";if(subtitle)subtitle.value="";if(desc)desc.value="";window.TONI_CURRENT_STATION_TASKS=[];renderTaskBuilderListV17();const addBtn=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Station zur Lernreise")||b.textContent.includes("Station aktualisieren"));if(addBtn)addBtn.textContent="+ Station zur Lernreise hinzufügen"}
function addStationToJourneyBuilder(){const title=document.getElementById("station-title")?.value.trim(),subtitle=document.getElementById("station-subtitle")?.value.trim(),description=document.getElementById("station-description")?.value.trim(),editIndexRaw=document.getElementById("station-edit-index")?.value;if(!title){alert("Bitte gib einen Stationstitel ein.");return}const tasks=[...(window.TONI_CURRENT_STATION_TASKS||[])];if(!tasks.length){alert("Bitte füge mindestens eine Aufgabe zu dieser Station hinzu.");return}const station={id:"station-"+toniV17Uuid(),title,subtitle:subtitle||"",description:description||"",tasks};if(editIndexRaw!==""){const idx=Number(editIndexRaw);if(!Number.isNaN(idx)&&window.TONI_JOURNEY_BUILDER_STATIONS[idx]){station.id=window.TONI_JOURNEY_BUILDER_STATIONS[idx].id||station.id;window.TONI_JOURNEY_BUILDER_STATIONS[idx]=station}}else{window.TONI_JOURNEY_BUILDER_STATIONS.push(station)}clearStationBuilder();renderStationPreviewV17();syncJourneyBuilderToLegacyTextareaV17()}
function editStationInJourneyBuilder(index){const station=window.TONI_JOURNEY_BUILDER_STATIONS[index];if(!station)return;document.getElementById("station-edit-index").value=String(index);document.getElementById("station-title").value=station.title||"";document.getElementById("station-subtitle").value=station.subtitle||"";document.getElementById("station-description").value=station.description||"";window.TONI_CURRENT_STATION_TASKS=JSON.parse(JSON.stringify(station.tasks||[]));renderTaskBuilderListV17();const addBtn=[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Station zur Lernreise"));if(addBtn)addBtn.textContent="Station aktualisieren";document.getElementById("station-title")?.focus()}
function deleteStationFromJourneyBuilder(index){const station=window.TONI_JOURNEY_BUILDER_STATIONS[index];if(!station)return;if(!confirm(`Station „${station.title}“ wirklich entfernen?`))return;window.TONI_JOURNEY_BUILDER_STATIONS.splice(index,1);renderStationPreviewV17();syncJourneyBuilderToLegacyTextareaV17()}
function moveStationV17(index,direction){const target=index+direction,arr=window.TONI_JOURNEY_BUILDER_STATIONS;if(target<0||target>=arr.length)return;[arr[index],arr[target]]=[arr[target],arr[index]];renderStationPreviewV17();syncJourneyBuilderToLegacyTextareaV17()}
function renderStationPreviewV17(){const wrap=document.getElementById("journey-station-preview");if(!wrap)return;const stations=window.TONI_JOURNEY_BUILDER_STATIONS||[];if(!stations.length){wrap.innerHTML='<div class="journey-empty">Noch keine Station hinzugefügt.</div>';return}wrap.innerHTML=stations.map((station,index)=>{const tasks=station.tasks||[];return `<div class="station-preview-item"><div class="station-preview-head"><div><div class="station-preview-title">${index+1}. ${toniV17Escape(station.title)}</div><div class="station-preview-meta">${toniV17Escape(station.subtitle||"Ohne Untertitel")} · ${tasks.length} Aufgabe(n)<br>${toniV17Escape(station.description||"")}</div></div><div class="station-preview-actions"><button type="button" class="station-small-btn" onclick="moveStationV17(${index},-1)">↑</button><button type="button" class="station-small-btn" onclick="moveStationV17(${index},1)">↓</button><button type="button" class="station-small-btn" onclick="editStationInJourneyBuilder(${index})">Bearbeiten</button><button type="button" class="station-small-btn" onclick="deleteStationFromJourneyBuilder(${index})">Löschen</button></div></div></div>`}).join("")}
function syncJourneyBuilderToLegacyTextareaV17(){const legacy=document.getElementById("journey-structure");if(!legacy)return;legacy.value=(window.TONI_JOURNEY_BUILDER_STATIONS||[]).map(station=>{const head=`Station: ${station.title||""} | ${station.subtitle||""} | ${station.description||""}`;const tasks=(station.tasks||[]).map(task=>`- [${task.required?"Pflicht":"Optional"}] ${task.type||"Aufgabe"} | ${task.title||""} | ${task.description||task.content||""}`);return [head,...tasks].join("\n")}).join("\n\n")}
function setJourneyBuilderFromJourneyV17(journey){window.TONI_JOURNEY_BUILDER_STATIONS=JSON.parse(JSON.stringify(journey?.steps||[]));window.TONI_CURRENT_STATION_TASKS=[];renderTaskBuilderListV17();renderStationPreviewV17();syncJourneyBuilderToLegacyTextareaV17()}
function setJourneyBuilderFromLegacyTextV17(){const legacy=document.getElementById("journey-structure");if(!legacy||!legacy.value.trim())return;try{if(typeof parseJourneyStructureV16==="function"){window.TONI_JOURNEY_BUILDER_STATIONS=parseJourneyStructureV16(legacy.value);renderStationPreviewV17()}}catch(error){console.warn("Stationen konnten nicht aus Text übernommen werden:",error)}}
const TONI_V17_ORIGINAL_SAVE_ADMIN_JOURNEY=window.saveAdminLearningJourney;window.saveAdminLearningJourney=async function(){syncJourneyBuilderToLegacyTextareaV17();if(!(window.TONI_JOURNEY_BUILDER_STATIONS||[]).length){alert("Bitte füge mindestens eine Station zur Lernreise hinzu.");return}return TONI_V17_ORIGINAL_SAVE_ADMIN_JOURNEY?.()};
const TONI_V17_ORIGINAL_RESET_EDITOR=window.resetJourneyEditor;window.resetJourneyEditor=function(){TONI_V17_ORIGINAL_RESET_EDITOR?.();window.TONI_JOURNEY_BUILDER_STATIONS=[];window.TONI_CURRENT_STATION_TASKS=[];clearStationBuilder();renderStationPreviewV17();syncJourneyBuilderToLegacyTextareaV17()};
const TONI_V17_ORIGINAL_FILL_EXAMPLE=window.fillJourneyExample;window.fillJourneyExample=function(){TONI_V17_ORIGINAL_FILL_EXAMPLE?.();setJourneyBuilderFromLegacyTextV17()};
const TONI_V17_ORIGINAL_EDIT_ADMIN_JOURNEY=window.editAdminJourney;window.editAdminJourney=function(id){TONI_V17_ORIGINAL_EDIT_ADMIN_JOURNEY?.(id);const row=typeof findAdminJourneyRowV16==="function"?findAdminJourneyRowV16(id):null;if(row&&typeof rowToJourneyV16==="function"){setJourneyBuilderFromJourneyV17(rowToJourneyV16(row))}else{setJourneyBuilderFromLegacyTextV17()}};
window.addEventListener("DOMContentLoaded",()=>{setTimeout(setupJourneyBuilderV17,500);setTimeout(setupJourneyBuilderV17,1500)});

/* =========================================================
   TONI – V18 / Lernreisen direkt Studenten zuordnen
   ========================================================= */
window.TONI_JOURNEY_ASSIGNMENTS = [];
window.TONI_JOURNEY_ASSIGNMENT_ROWS = [];

function toniV18Role(){
  return (window.TONI_AUTH_PROFILE && TONI_AUTH_PROFILE.role) || localStorage.getItem("toni_role") || "student";
}

function toniV18CanManage(){
  const role = toniV18Role();
  return role === "admin" || role === "tutor";
}

function toniV18ProfileId(){
  return (window.TONI_AUTH_PROFILE && TONI_AUTH_PROFILE.id) ||
         window.TONI_ACTIVE_PROFILE_ID ||
         localStorage.getItem("toni_profile_id") ||
         null;
}

function toniV18Escape(value){
  if(typeof escapeHtml === "function") return escapeHtml(value);
  return String(value ?? "").replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}

function toniV18Uuid(){
  if(window.crypto && crypto.randomUUID) return crypto.randomUUID();
  return "id-" + Date.now() + "-" + Math.random().toString(16).slice(2);
}

function getLocalAssignmentsV18(){
  try { return JSON.parse(localStorage.getItem("toni_journey_assignments_v18") || "[]"); }
  catch { return []; }
}

function setLocalAssignmentsV18(rows){
  localStorage.setItem("toni_journey_assignments_v18", JSON.stringify(rows || []));
}

function hideLegacyGroupViewsV18(){
  ["group-panel","group-admin-panel","learning-groups-panel"].forEach(id => {
    const el = document.getElementById(id);
    if(el){
      el.style.display = "none";
      el.classList.remove("visible");
    }
  });

  document.querySelectorAll(".group-panel,[data-panel='groups'],[data-section='groups']").forEach(el => {
    el.style.display = "none";
    el.classList.remove("visible");
  });

  [...document.querySelectorAll("*")].forEach(el => {
    const txt = (el.textContent || "").trim();
    if(txt === "Lerngruppen verwalten" || txt === "Lerngruppe verwalten"){
      const card = el.closest(".card") || el.closest("section") || el.closest("div");
      if(card && card.id !== "learning-journey-assignment-panel"){
        card.style.display = "none";
      }
    }
  });
}

function showAssignmentPanelV18(){
  hideLegacyGroupViewsV18();
  const panel = document.getElementById("learning-journey-assignment-panel");
  if(!panel) return;
  const show = toniV18CanManage();
  panel.style.display = show ? "" : "none";
  panel.classList.toggle("visible", show);
  if(show) setTimeout(loadJourneyAssignmentTable, 200);
}

async function loadJourneyTemplatesForAssignmentsV18(){
  const ownerId = toniV18ProfileId();
  const role = toniV18Role();

  try{
    if(typeof supabaseRequest === "function" && ownerId){
      const query = role === "admin"
        ? "learning_journey_templates?select=*&order=updated_at.desc"
        : `learning_journey_templates?owner_profile_id=eq.${encodeURIComponent(ownerId)}&select=*&order=updated_at.desc`;
      const rows = await supabaseRequest(query);
      return (rows || []).map(r => ({...r, _source:"remote"}));
    }
  }catch(error){
    console.warn("Lernreisen für Zuordnung konnten nicht aus Supabase geladen werden:", error);
  }

  if(typeof getLocalJourneysV16 === "function"){
    return getLocalJourneysV16().map(r => ({...r, _source:"local"}));
  }

  return [];
}

async function loadJourneyAssignmentsV18(){
  try{
    if(typeof supabaseRequest === "function"){
      const rows = await supabaseRequest("learning_journey_assignments?select=*,profiles(id,display_name,email,class_name,first_name,last_name)&order=created_at.desc");
      return rows || [];
    }
  }catch(error){
    console.warn("Zuordnungen konnten nicht aus Supabase geladen werden, nutze lokale Daten:", error);
  }
  return getLocalAssignmentsV18();
}

function journeyTitleFromRowV18(row){
  const json = row.journey_json || {};
  return row.title || json.title || "Lernreise";
}

function journeyMetaFromRowV18(row){
  const json = row.journey_json || {};
  const subject = row.subject || json.subject || "Ohne Fach";
  const goal = row.goal || json.goal || "";
  const steps = (json.steps || []).length;
  return {subject, goal, steps};
}

function studentFromAssignmentV18(a){
  const p = a.profiles || {};
  const email = a.student_email || p.email || "";
  const first = a.student_first_name || p.first_name || "";
  const last = a.student_last_name || p.last_name || "";
  const display = a.student_display_name || p.display_name || `${first} ${last}`.trim() || email || "Student";
  const cls = a.student_class_name || p.class_name || "";
  return {display, email, className: cls};
}

async function loadJourneyAssignmentTable(){
  const tbody = document.getElementById("journey-assignment-table-body");
  if(!tbody) return;

  if(!toniV18CanManage()){
    tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">🔒 Nur Admins und Tutoren können Lernreisen zuordnen.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">Lernreisen und Zuordnungen werden geladen …</div></td></tr>`;

  try{
    const [journeys, assignments] = await Promise.all([
      loadJourneyTemplatesForAssignmentsV18(),
      loadJourneyAssignmentsV18()
    ]);

    window.TONI_JOURNEY_ASSIGNMENT_ROWS = journeys;
    window.TONI_JOURNEY_ASSIGNMENTS = assignments;

    if(!journeys.length){
      tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">Noch keine Lernreisen vorhanden. Lege zuerst im Bereich „Lernreisen verwalten“ eine Lernreise an.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = journeys.map(journey => {
      const meta = journeyMetaFromRowV18(journey);
      const related = assignments.filter(a => String(a.learning_journey_template_id) === String(journey.id));

      const studentHtml = related.length
        ? `<div class="assigned-student-list">` + related.map(a => {
            const s = studentFromAssignmentV18(a);
            return `
              <div class="assigned-student-pill">
                <div class="assigned-student-main">
                  <div class="assigned-student-name">${toniV18Escape(s.display)}</div>
                  <div class="assigned-student-class">${toniV18Escape(s.className || "ohne Klasse")} · ${toniV18Escape(s.email || "ohne E-Mail")}</div>
                </div>
                <button class="assignment-remove-btn" title="Zuordnung löschen" onclick="deleteJourneyStudentAssignment('${a.id}')">×</button>
              </div>`;
          }).join("") + `</div>`
        : `<div class="assignment-empty">Noch keinem Studenten zugeordnet.</div>`;

      return `
        <tr>
          <td>
            <div class="assignment-journey-title">${toniV18Escape(journeyTitleFromRowV18(journey))}</div>
            <div class="assignment-journey-meta">
              ${toniV18Escape(meta.subject)} · ${meta.steps || 0} Station(en)<br>
              ${meta.goal ? "Ziel: " + toniV18Escape(meta.goal) : ""}
            </div>
          </td>
          <td>${studentHtml}</td>
          <td>
            <button class="assignment-add-btn" title="Student zuordnen" onclick="openAssignStudentModal('${journey.id}')">+</button>
          </td>
        </tr>
      `;
    }).join("");
  }catch(error){
    console.error("Zuordnungstabelle konnte nicht geladen werden:", error);
    tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">⚠️ Tabelle konnte nicht geladen werden:<br>${toniV18Escape(error.message)}</div></td></tr>`;
  }
}

function findJourneyForAssignmentV18(id){
  return (window.TONI_JOURNEY_ASSIGNMENT_ROWS || []).find(j => String(j.id) === String(id));
}

function openAssignStudentModal(journeyId){
  const journey = findJourneyForAssignmentV18(journeyId);
  document.getElementById("assign-journey-id").value = journeyId;

  const subtitle = document.getElementById("assignment-student-subtitle");
  if(subtitle){
    subtitle.textContent = journey
      ? `Lernreise: ${journeyTitleFromRowV18(journey)}`
      : "Wähle eine Lernreise und ergänze die Studentendaten.";
  }

  ["assign-student-email","assign-student-class","assign-student-first","assign-student-last"].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.value = "";
  });

  document.getElementById("assignment-student-modal")?.classList.add("open");
  setTimeout(() => document.getElementById("assign-student-email")?.focus(), 100);
}

function closeAssignStudentModal(){
  document.getElementById("assignment-student-modal")?.classList.remove("open");
}

async function findStudentProfileByEmailV18(email){
  if(!email || typeof supabaseRequest !== "function") return null;

  try{
    const rows = await supabaseRequest(`profiles?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id,email,display_name,class_name,first_name,last_name&limit=1`);
    return rows && rows[0] ? rows[0] : null;
  }catch(error){
    console.warn("Studentenprofil konnte nicht gesucht werden:", error);
    return null;
  }
}

async function saveJourneyStudentAssignment(){
  const journeyId = document.getElementById("assign-journey-id")?.value;
  const email = document.getElementById("assign-student-email")?.value.trim().toLowerCase();
  const className = document.getElementById("assign-student-class")?.value.trim();
  const first = document.getElementById("assign-student-first")?.value.trim();
  const last = document.getElementById("assign-student-last")?.value.trim();

  if(!journeyId){
    alert("Keine Lernreise ausgewählt.");
    return;
  }
  if(!email){
    alert("Bitte gib eine E-Mail-Adresse ein.");
    return;
  }

  try{
    const profile = await findStudentProfileByEmailV18(email);
    const displayName = `${first || ""} ${last || ""}`.trim() || profile?.display_name || email;

    if(typeof supabaseRequest === "function"){
      const payload = {
        learning_journey_template_id: journeyId,
        student_profile_id: profile?.id || null,
        student_email: email,
        student_first_name: first || profile?.first_name || "",
        student_last_name: last || profile?.last_name || "",
        student_display_name: displayName,
        student_class_name: className || profile?.class_name || "",
        assigned_by_profile_id: toniV18ProfileId(),
        status: "assigned",
        updated_at: new Date().toISOString()
      };

      await supabaseRequest("learning_journey_assignments", {
        method: "POST",
        headers: {"Prefer":"return=representation"},
        body: JSON.stringify([payload])
      });
    }else{
      const rows = getLocalAssignmentsV18();
      rows.unshift({
        id: toniV18Uuid(),
        learning_journey_template_id: journeyId,
        student_profile_id: profile?.id || null,
        student_email: email,
        student_first_name: first || "",
        student_last_name: last || "",
        student_display_name: displayName,
        student_class_name: className || "",
        assigned_by_profile_id: toniV18ProfileId(),
        status: "assigned",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setLocalAssignmentsV18(rows);
    }

    closeAssignStudentModal();
    await loadJourneyAssignmentTable();
    appendMsg?.("toni", "✅ Lernreise wurde dem Studenten zugeordnet.", typeof time === "function" ? time() : "", "desktop");
  }catch(error){
    console.error("Zuordnung speichern:", error);
    alert("Zuordnung konnte nicht gespeichert werden:\n" + error.message);
  }
}

async function deleteJourneyStudentAssignment(assignmentId){
  if(!confirm("Diese Zuordnung wirklich löschen?")) return;

  try{
    if(typeof supabaseRequest === "function"){
      await supabaseRequest(`learning_journey_assignments?id=eq.${encodeURIComponent(assignmentId)}`, {method:"DELETE"});
    }else{
      const rows = getLocalAssignmentsV18().filter(a => String(a.id) !== String(assignmentId));
      setLocalAssignmentsV18(rows);
    }

    await loadJourneyAssignmentTable();
    appendMsg?.("toni", "🗑️ Zuordnung wurde gelöscht.", typeof time === "function" ? time() : "", "desktop");
  }catch(error){
    console.error("Zuordnung löschen:", error);
    alert("Zuordnung konnte nicht gelöscht werden:\n" + error.message);
  }
}

// Vorhandene Rollenlogik erweitern und Lerngruppen-Ansicht konsequent ausblenden
const TONI_V18_ORIGINAL_APPLY_ROLE_UI = window.applyRoleUI;
window.applyRoleUI = function(){
  if(typeof TONI_V18_ORIGINAL_APPLY_ROLE_UI === "function"){
    TONI_V18_ORIGINAL_APPLY_ROLE_UI();
  }
  hideLegacyGroupViewsV18();
  showAssignmentPanelV18();
};

["toniV10ShowAdminDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","toniV17ApplyDashboard"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(() => {
        hideLegacyGroupViewsV18();
        showAssignmentPanelV18();
      }, 120);
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => { hideLegacyGroupViewsV18(); showAssignmentPanelV18(); }, 500);
  setTimeout(() => { hideLegacyGroupViewsV18(); showAssignmentPanelV18(); }, 1600);
  setTimeout(() => { hideLegacyGroupViewsV18(); showAssignmentPanelV18(); }, 3500);
});

/* =========================================================
   TONI – V19 / Lernreise-Bereiche per Plus/Minus öffnen
   ========================================================= */

window.TONI_SECTION_OPEN_STATE = {
  manage: sessionStorage.getItem("toni_section_manage_open") === "1",
  assign: sessionStorage.getItem("toni_section_assign_open") === "1"
};

function toniV19MakeSectionCollapsible(panelId, sectionKey, labelWhenClosed) {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  const header = panel.querySelector(".card-header");
  if (!header) return;

  if (panel.dataset.v19Collapsible === "1") {
    toniV19ApplySectionState(panelId, sectionKey);
    return;
  }

  panel.dataset.v19Collapsible = "1";

  const titleEl = header.querySelector(".card-title");
  if (titleEl) {
    const originalTitle = titleEl.textContent.trim();

    titleEl.innerHTML = `
      <span class="journey-section-toggle" onclick="toniV19ToggleSection('${panelId}','${sectionKey}')">
        <span class="journey-toggle-symbol" id="${panelId}-toggle-symbol">+</span>
        <span>${originalTitle}</span>
      </span>
    `;
  }

  const body = document.createElement("div");
  body.className = "journey-collapsible-body";
  body.id = panelId + "-body";

  const note = document.createElement("div");
  note.className = "journey-section-collapsed-note";
  note.id = panelId + "-collapsed-note";
  note.textContent = labelWhenClosed || "Klicke auf das Pluszeichen, um diesen Bereich zu öffnen.";

  const children = Array.from(panel.childNodes);
  children.forEach(node => {
    if (node === header) return;
    body.appendChild(node);
  });

  panel.appendChild(note);
  panel.appendChild(body);

  toniV19ApplySectionState(panelId, sectionKey);
}

function toniV19ApplySectionState(panelId, sectionKey) {
  const open = !!window.TONI_SECTION_OPEN_STATE[sectionKey];

  const body = document.getElementById(panelId + "-body");
  const note = document.getElementById(panelId + "-collapsed-note");
  const symbol = document.getElementById(panelId + "-toggle-symbol");

  if (body) body.classList.toggle("open", open);
  if (note) note.classList.toggle("hidden", open);
  if (symbol) symbol.textContent = open ? "−" : "+";

  if (sectionKey === "manage") {
    sessionStorage.setItem("toni_section_manage_open", open ? "1" : "0");
  }
  if (sectionKey === "assign") {
    sessionStorage.setItem("toni_section_assign_open", open ? "1" : "0");
  }
}

function toniV19ToggleSection(panelId, sectionKey) {
  window.TONI_SECTION_OPEN_STATE[sectionKey] = !window.TONI_SECTION_OPEN_STATE[sectionKey];
  toniV19ApplySectionState(panelId, sectionKey);

  if (window.TONI_SECTION_OPEN_STATE[sectionKey]) {
    if (sectionKey === "manage" && typeof loadAdminLearningJourneys === "function") {
      setTimeout(loadAdminLearningJourneys, 100);
    }
    if (sectionKey === "assign" && typeof loadJourneyAssignmentTable === "function") {
      setTimeout(loadJourneyAssignmentTable, 100);
    }
  }
}

function toniV19SetupCollapsibleJourneySections() {
  toniV19MakeSectionCollapsible(
    "journey-admin-panel",
    "manage",
    "Klicke auf das Pluszeichen, um Lernreisen anzulegen, zu bearbeiten oder zu löschen."
  );

  toniV19MakeSectionCollapsible(
    "learning-journey-assignment-panel",
    "assign",
    "Klicke auf das Pluszeichen, um Lernreisen einzelnen Studenten zuzuordnen."
  );
}

// Bestehende Anzeige-Funktionen erweitern: Panel darf sichtbar sein, Inhalt bleibt eingeklappt.
const TONI_V19_ORIGINAL_SHOW_JOURNEY_ADMIN = window.showJourneyAdminPanelIfAllowedV16;
if (typeof TONI_V19_ORIGINAL_SHOW_JOURNEY_ADMIN === "function") {
  window.showJourneyAdminPanelIfAllowedV16 = function() {
    TONI_V19_ORIGINAL_SHOW_JOURNEY_ADMIN();
    setTimeout(toniV19SetupCollapsibleJourneySections, 50);
  };
}

const TONI_V19_ORIGINAL_SHOW_ASSIGNMENT = window.showAssignmentPanelV18;
if (typeof TONI_V19_ORIGINAL_SHOW_ASSIGNMENT === "function") {
  window.showAssignmentPanelV18 = function() {
    TONI_V19_ORIGINAL_SHOW_ASSIGNMENT();
    setTimeout(toniV19SetupCollapsibleJourneySections, 50);
  };
}

// Beim Laden mehrfach anwenden, da frühere Auth-Layer Panels später einblenden können.
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV19SetupCollapsibleJourneySections, 500);
  setTimeout(toniV19SetupCollapsibleJourneySections, 1500);
  setTimeout(toniV19SetupCollapsibleJourneySections, 3500);
});

/* =========================================================
   TONI – V20 / QR-Code Lernreise und Student-Zuordnung
   ========================================================= */
window.TONI_QR_CURRENT_JOURNEY_ID = null;
window.TONI_QR_CURRENT_JOURNEY_TITLE = "";
window.TONI_QR_STREAM = null;
window.TONI_QR_SCAN_TIMER = null;
window.TONI_QR_LAST_CODE = "";
function toniV20Role(){return (window.TONI_AUTH_PROFILE&&TONI_AUTH_PROFILE.role)||localStorage.getItem("toni_role")||"student";}
function toniV20Profile(){return window.TONI_AUTH_PROFILE||{id:window.TONI_ACTIVE_PROFILE_ID||localStorage.getItem("toni_profile_id")||null,role:localStorage.getItem("toni_role")||"student"};}
function toniV20Escape(value){if(typeof escapeHtml==="function")return escapeHtml(value);return String(value??"").replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));}
function toniV20UuidLike(value){const v=String(value||"").trim();return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);}
function journeyQrPayloadV20(journeyId){return "TONI-JOURNEY:"+String(journeyId||"").trim();}
function parseJourneyQrPayloadV20(raw){const text=String(raw||"").trim();if(!text)throw new Error("Kein QR-Code erkannt.");if(text.startsWith("TONI-JOURNEY:")){const id=text.replace("TONI-JOURNEY:","").trim();if(!id)throw new Error("Der QR-Code enthält keine Lernreise-ID.");return id;}try{const url=new URL(text);const id=url.searchParams.get("journey")||url.searchParams.get("journey_id")||url.searchParams.get("lernreise");if(id)return id.trim();}catch{}if(toniV20UuidLike(text)||text.length>=12)return text;throw new Error("Der QR-Code ist kein gültiger TONI-Lernreise-Code.");}
function qrImageUrlV20(payload,size=320){return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=12&data=${encodeURIComponent(payload)}`;}
window.openAssignStudentModal=function(journeyId){openJourneyQrModal(journeyId);};
function findJourneyRowV20(journeyId){return (window.TONI_JOURNEY_ASSIGNMENT_ROWS||window.TONI_ADMIN_JOURNEYS||[]).find(r=>String(r.id)===String(journeyId));}
function journeyTitleV20(row){const json=row?.journey_json||{};return row?.title||json.title||"Lernreise";}
function openJourneyQrModal(journeyId){const row=findJourneyRowV20(journeyId);const title=journeyTitleV20(row);window.TONI_QR_CURRENT_JOURNEY_ID=journeyId;window.TONI_QR_CURRENT_JOURNEY_TITLE=title;const payload=journeyQrPayloadV20(journeyId);const img=document.getElementById("journey-qr-img");const code=document.getElementById("journey-qr-code");const sub=document.getElementById("journey-qr-subtitle");if(img)img.src=qrImageUrlV20(payload,360);if(code)code.textContent=payload;if(sub)sub.textContent=`Lernreise: ${title}. Der QR-Code bleibt für diese Lernreise gleich.`;document.getElementById("journey-qr-modal")?.classList.add("open");}
function closeJourneyQrModal(){document.getElementById("journey-qr-modal")?.classList.remove("open");}
function downloadJourneyQrCode(){const id=window.TONI_QR_CURRENT_JOURNEY_ID;if(!id)return;const payload=journeyQrPayloadV20(id);const url=qrImageUrlV20(payload,640);const a=document.createElement("a");const safeTitle=String(window.TONI_QR_CURRENT_JOURNEY_TITLE||"lernreise").toLowerCase().replace(/[^a-z0-9äöüß]+/gi,"-").replace(/^-|-$/g,"");a.href=url;a.download=`toni-qr-${safeTitle||id}.png`;a.target="_blank";document.body.appendChild(a);a.click();a.remove();}
function updateAssignmentHeaderV20(){const table=document.querySelector(".assignment-table");if(!table)return;const ths=table.querySelectorAll("thead th");if(ths[2])ths[2].textContent="QR-Code";}
function installStudentJourneyButtonsV20(){if(document.getElementById("student-journey-actions-v20"))return;const cards=[...document.querySelectorAll(".card")];const journeyCard=cards.find(card=>{const title=card.querySelector(".card-title")?.textContent||"";return title.includes("Deine Lernreise")||title.includes("Lernreise");});if(!journeyCard)return;const header=journeyCard.querySelector(".card-header")||journeyCard;const actions=document.createElement("div");actions.className="student-journey-actions student-only";actions.id="student-journey-actions-v20";actions.innerHTML=`<button class="student-journey-btn" onclick="openJourneyScanModal()">+ Lernreise hinzufügen</button><button class="student-journey-btn" onclick="openJourneySwitchModal()">Lernreise wechseln</button>`;header.insertAdjacentElement("afterend",actions);}
function setScanStatusV20(message,type=""){const el=document.getElementById("journey-scan-status");if(!el)return;el.className="scan-status"+(type?" "+type:"");el.innerHTML=message;}
function loadJsQrV20(){return new Promise((resolve,reject)=>{if(window.jsQR)return resolve(window.jsQR);const existing=document.querySelector("script[data-toni-jsqr='1']");if(existing){existing.addEventListener("load",()=>resolve(window.jsQR));existing.addEventListener("error",()=>reject(new Error("QR-Scanner-Bibliothek konnte nicht geladen werden.")));return;}const script=document.createElement("script");script.src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js";script.async=true;script.dataset.toniJsqr="1";script.onload=()=>resolve(window.jsQR);script.onerror=()=>reject(new Error("QR-Scanner-Bibliothek konnte nicht geladen werden."));document.head.appendChild(script);});}
async function openJourneyScanModal(){document.getElementById("journey-scan-modal")?.classList.add("open");document.getElementById("manual-journey-code").value="";setScanStatusV20("Kamera wird vorbereitet …");try{await loadJsQrV20();const video=document.getElementById("journey-qr-video");if(!navigator.mediaDevices?.getUserMedia){setScanStatusV20("Diese Browser-Version erlaubt keinen Kamerazugriff. Bitte Code manuell eingeben.","err");return;}const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:"environment"},audio:false});window.TONI_QR_STREAM=stream;video.srcObject=stream;await video.play();setScanStatusV20("Kamera aktiv. Halte den QR-Code in den sichtbaren Bereich.");startQrScanLoopV20();}catch(error){console.error("QR-Kamera:",error);setScanStatusV20("Kamera konnte nicht gestartet werden. Du kannst den Code unten manuell eingeben.<br>"+toniV20Escape(error.message),"err");}}
function closeJourneyScanModal(){document.getElementById("journey-scan-modal")?.classList.remove("open");if(window.TONI_QR_SCAN_TIMER){clearInterval(window.TONI_QR_SCAN_TIMER);window.TONI_QR_SCAN_TIMER=null;}if(window.TONI_QR_STREAM){window.TONI_QR_STREAM.getTracks().forEach(track=>track.stop());window.TONI_QR_STREAM=null;}const video=document.getElementById("journey-qr-video");if(video)video.srcObject=null;window.TONI_QR_LAST_CODE="";}
function startQrScanLoopV20(){const video=document.getElementById("journey-qr-video");const canvas=document.getElementById("journey-qr-canvas");const ctx=canvas.getContext("2d",{willReadFrequently:true});if(window.TONI_QR_SCAN_TIMER)clearInterval(window.TONI_QR_SCAN_TIMER);window.TONI_QR_SCAN_TIMER=setInterval(async()=>{if(!video||video.readyState!==video.HAVE_ENOUGH_DATA||!window.jsQR)return;canvas.width=video.videoWidth;canvas.height=video.videoHeight;if(!canvas.width||!canvas.height)return;ctx.drawImage(video,0,0,canvas.width,canvas.height);const imageData=ctx.getImageData(0,0,canvas.width,canvas.height);const qr=window.jsQR(imageData.data,imageData.width,imageData.height);if(qr?.data&&qr.data!==window.TONI_QR_LAST_CODE){window.TONI_QR_LAST_CODE=qr.data;setScanStatusV20("QR-Code erkannt. TONI prüft die Lernreise …","ok");try{await assignJourneyFromCodeV20(qr.data);closeJourneyScanModal();}catch(error){setScanStatusV20("QR-Code konnte nicht zugeordnet werden:<br>"+toniV20Escape(error.message),"err");window.TONI_QR_LAST_CODE="";}}},350);}
async function assignJourneyFromManualCode(){const raw=document.getElementById("manual-journey-code")?.value.trim();if(!raw){setScanStatusV20("Bitte gib einen Code ein.","err");return;}try{setScanStatusV20("Code wird geprüft …");await assignJourneyFromCodeV20(raw);setScanStatusV20("✅ Lernreise wurde hinzugefügt.","ok");setTimeout(closeJourneyScanModal,800);}catch(error){setScanStatusV20("Code konnte nicht zugeordnet werden:<br>"+toniV20Escape(error.message),"err");}}
async function getCurrentStudentProfileV20(){let profile=window.TONI_AUTH_PROFILE;if(profile?.id&&profile?.email)return profile;try{const token=typeof getAuthAccessToken==="function"?await getAuthAccessToken():null;if(!token)throw new Error("Bitte melde dich zuerst als Student an.");const userResponse=await fetch(`${window.SUPABASE_URL}/auth/v1/user`,{headers:{"apikey":window.SUPABASE_ANON_KEY,"Authorization":"Bearer "+token}});if(!userResponse.ok)throw new Error("Nutzer konnte nicht geladen werden.");const user=await userResponse.json();const rows=await supabaseRequest(`profiles?id=eq.${user.id}&select=id,email,display_name,class_name,first_name,last_name,role&limit=1`);profile=rows?.[0]||{id:user.id,email:user.email,role:"student",display_name:user.email};window.TONI_AUTH_PROFILE=profile;window.TONI_ACTIVE_PROFILE_ID=profile.id;localStorage.setItem("toni_profile_id",profile.id);localStorage.setItem("toni_role",profile.role||"student");return profile;}catch(error){throw new Error("Bitte melde dich zuerst vollständig an. "+error.message);}}
async function assignJourneyFromCodeV20(rawCode){const journeyId=parseJourneyQrPayloadV20(rawCode);const profile=await getCurrentStudentProfileV20();if(!profile?.id||!profile?.email)throw new Error("Dein Profil konnte nicht eindeutig ermittelt werden.");if(typeof supabaseRequest!=="function"){const rows=getLocalAssignmentsV18?getLocalAssignmentsV18():[];const exists=rows.some(a=>String(a.learning_journey_template_id)===String(journeyId)&&String(a.student_email).toLowerCase()===String(profile.email).toLowerCase());if(!exists){rows.unshift({id:"assign-"+Date.now(),learning_journey_template_id:journeyId,student_profile_id:profile.id,student_email:profile.email,student_display_name:profile.display_name||profile.email,student_class_name:profile.class_name||"",status:"assigned",created_at:new Date().toISOString(),updated_at:new Date().toISOString()});setLocalAssignmentsV18?.(rows);}appendMsg?.("toni","✅ Lernreise wurde hinzugefügt.",typeof time==="function"?time():"","desktop");return;}const payload={learning_journey_template_id:journeyId,student_profile_id:profile.id,student_email:String(profile.email).toLowerCase(),student_first_name:profile.first_name||"",student_last_name:profile.last_name||"",student_display_name:profile.display_name||profile.email,student_class_name:profile.class_name||"",assigned_by_profile_id:null,status:"assigned",updated_at:new Date().toISOString()};try{await supabaseRequest("learning_journey_assignments?on_conflict=learning_journey_template_id,student_email",{method:"POST",headers:{"Prefer":"resolution=merge-duplicates,return=representation"},body:JSON.stringify([payload])});}catch(error){if(String(error.message||"").includes("duplicate")||String(error.message||"").includes("23505")){}else{throw error;}}appendMsg?.("toni","✅ Lernreise wurde deinem Profil zugeordnet.",typeof time==="function"?time():"","desktop");}
async function loadAssignedJourneysForStudentV20(){const profile=await getCurrentStudentProfileV20();if(typeof supabaseRequest!=="function"){const assignments=(getLocalAssignmentsV18?getLocalAssignmentsV18():[]).filter(a=>String(a.student_email).toLowerCase()===String(profile.email).toLowerCase());const journeys=typeof getLocalJourneysV16==="function"?getLocalJourneysV16():[];return assignments.map(a=>{const j=journeys.find(x=>String(x.id)===String(a.learning_journey_template_id));return {assignment:a,journey_template:j};}).filter(x=>x.journey_template);}const rows=await supabaseRequest(`learning_journey_assignments?select=*,learning_journey_templates(*)&or=(student_profile_id.eq.${encodeURIComponent(profile.id)},student_email.eq.${encodeURIComponent(String(profile.email).toLowerCase())})&order=created_at.desc`);return (rows||[]).map(r=>({assignment:r,journey_template:r.learning_journey_templates})).filter(x=>x.journey_template);}
async function openJourneySwitchModal(){const modal=document.getElementById("journey-switch-modal");const list=document.getElementById("journey-switch-list");modal?.classList.add("open");if(list)list.innerHTML=`<div class="assignment-empty">Lernreisen werden geladen …</div>`;try{const rows=await loadAssignedJourneysForStudentV20();if(!rows.length){list.innerHTML=`<div class="assignment-empty">Dir ist noch keine Lernreise zugeordnet. Nutze „Lernreise hinzufügen“, um einen QR-Code zu scannen.</div>`;return;}list.innerHTML=rows.map((row,index)=>{const t=row.journey_template||{};const j=t.journey_json||{};const title=t.title||j.title||"Lernreise";const subject=t.subject||j.subject||"Ohne Fach";const goal=t.goal||j.goal||"";const steps=(j.steps||[]).length;window["TONI_SWITCH_JOURNEY_"+index]=t;return `<div class="switch-item"><div><div class="switch-title">${toniV20Escape(title)}</div><div class="switch-meta">${toniV20Escape(subject)} · ${steps} Station(en)<br>${goal?"Ziel: "+toniV20Escape(goal):""}</div></div><button class="switch-start-btn" onclick="startAssignedJourneyV20(${index})">Starten</button></div>`;}).join("");}catch(error){console.error("Lernreisen wechseln:",error);list.innerHTML=`<div class="assignment-empty">⚠️ Lernreisen konnten nicht geladen werden:<br>${toniV20Escape(error.message)}</div>`;}}
function closeJourneySwitchModal(){document.getElementById("journey-switch-modal")?.classList.remove("open");}
function normalizeTemplateToJourneyV20(template){const j=template.journey_json||{};return {id:template.id||j.id,title:template.title||j.title||"Lernreise",subject:template.subject||j.subject||"",goal:template.goal||j.goal||"",description:template.description||j.description||"",steps:j.steps||[]};}
function startAssignedJourneyV20(index){const template=window["TONI_SWITCH_JOURNEY_"+index];if(!template)return;const journey=normalizeTemplateToJourneyV20(template);ensureLearningState?.();STATE.learningJourneys=STATE.learningJourneys||[];const pos=STATE.learningJourneys.findIndex(j=>String(j.id)===String(journey.id));if(pos>=0)STATE.learningJourneys[pos]=journey;else STATE.learningJourneys.push(journey);STATE.activeJourneyId=journey.id;saveState?.(STATE);syncJourneyToDashboard?.();closeJourneySwitchModal();if(typeof renderLearningJourneyModal==="function"){renderLearningJourneyModal();document.getElementById("lr-modal")?.classList.add("open");}appendMsg?.("toni",`📚 Lernreise gewechselt: <strong>${toniV20Escape(journey.title)}</strong>`,typeof time==="function"?time():"","desktop");}
const TONI_V20_ORIGINAL_LOAD_ASSIGNMENT_TABLE=window.loadJourneyAssignmentTable;if(typeof TONI_V20_ORIGINAL_LOAD_ASSIGNMENT_TABLE==="function"){window.loadJourneyAssignmentTable=async function(){const result=await TONI_V20_ORIGINAL_LOAD_ASSIGNMENT_TABLE.apply(this,arguments);updateAssignmentHeaderV20();return result;};}
const TONI_V20_ORIGINAL_APPLY_ROLE_UI=window.applyRoleUI;window.applyRoleUI=function(){if(typeof TONI_V20_ORIGINAL_APPLY_ROLE_UI==="function")TONI_V20_ORIGINAL_APPLY_ROLE_UI();installStudentJourneyButtonsV20();};
window.addEventListener("DOMContentLoaded",()=>{setTimeout(()=>{installStudentJourneyButtonsV20();updateAssignmentHeaderV20();},600);setTimeout(()=>{installStudentJourneyButtonsV20();updateAssignmentHeaderV20();},1800);setTimeout(()=>{installStudentJourneyButtonsV20();updateAssignmentHeaderV20();},3600);});

/* =========================================================
   TONI – V22 / Student QR-Zuordnung per RPC
   =========================================================
   Behebt:
   new row violates row-level security policy for table "learning_journey_assignments"

   Ursache:
   Direkter INSERT aus dem Browser kann an RLS scheitern.
   Lösung:
   Die Zuordnung läuft über die SECURITY-DEFINER-Funktion
   public.assign_learning_journey_to_me(p_template_id).
   ========================================================= */

async function assignJourneyFromCodeV20(rawCode){
  const journeyId = parseJourneyQrPayloadV20(rawCode);
  const profile = await getCurrentStudentProfileV20();

  if(!profile?.id || !profile?.email){
    throw new Error("Dein Profil konnte nicht eindeutig ermittelt werden. Bitte melde dich erneut an.");
  }

  if(!toniV20UuidLike(journeyId)){
    throw new Error("Der QR-Code enthält keine gültige Lernreise-ID.");
  }

  if(typeof supabaseRequest !== "function"){
    const rows = getLocalAssignmentsV18 ? getLocalAssignmentsV18() : [];
    const exists = rows.some(a =>
      String(a.learning_journey_template_id) === String(journeyId) &&
      String(a.student_email).toLowerCase() === String(profile.email).toLowerCase()
    );

    if(!exists){
      rows.unshift({
        id: "assign-" + Date.now(),
        learning_journey_template_id: journeyId,
        student_profile_id: profile.id,
        student_email: profile.email,
        student_display_name: profile.display_name || profile.email,
        student_class_name: profile.class_name || "",
        status: "assigned",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      setLocalAssignmentsV18?.(rows);
    }

    appendMsg?.("toni", "✅ Lernreise wurde hinzugefügt.", typeof time === "function" ? time() : "", "desktop");
    return;
  }

  try{
    await supabaseRequest("rpc/assign_learning_journey_to_me", {
      method: "POST",
      body: JSON.stringify({ p_template_id: journeyId })
    });

    appendMsg?.("toni", "✅ Lernreise wurde deinem Profil zugeordnet.", typeof time === "function" ? time() : "", "desktop");
  }catch(error){
    console.error("TONI V22 Zuordnung per RPC fehlgeschlagen:", error);
    throw new Error(
      "Lernreise konnte nicht zugeordnet werden: " +
      (error.message || "Unbekannter Fehler")
    );
  }
}

/* TONI V23 – Ansichtsfeld „Deine Lernreise“ neu gestalten */
window.TONI_V23_ASSIGNED_JOURNEYS_CACHE=null;

function toniV23Role(){return (window.TONI_AUTH_PROFILE&&TONI_AUTH_PROFILE.role)||localStorage.getItem("toni_role")||"student";}
function toniV23EnsureState(){try{if(typeof ensureLearningState==="function")ensureLearningState();}catch{}}
function toniV23GetActiveJourneyFromState(){
  toniV23EnsureState();
  if(typeof STATE==="undefined")return null;
  const journeys=STATE.learningJourneys||[];
  const activeId=STATE.activeJourneyId;
  return journeys.find(j=>String(j.id)===String(activeId))||journeys[0]||null;
}
async function toniV23LoadAssignedJourneysSafe(){
  if(toniV23Role()!=="student")return null;
  try{
    if(typeof loadAssignedJourneysForStudentV20==="function"){
      const rows=await loadAssignedJourneysForStudentV20();
      window.TONI_V23_ASSIGNED_JOURNEYS_CACHE=rows||[];
      return window.TONI_V23_ASSIGNED_JOURNEYS_CACHE;
    }
  }catch(e){console.warn("TONI V23: Zugeordnete Lernreisen konnten nicht geladen werden:",e);}
  return window.TONI_V23_ASSIGNED_JOURNEYS_CACHE;
}
function toniV23FindLearningJourneyCard(){
  const cards=[...document.querySelectorAll(".card")];
  let card=cards.find(c=>((c.querySelector(".card-title")?.textContent)||"").includes("Deine Lernreise"));
  if(card)return card;
  card=cards.find(c=>{
    const t=(c.querySelector(".card-title")?.textContent)||"";
    return t.includes("Lernreise")&&!t.includes("verwalten")&&!t.includes("zuordnen");
  });
  return card||null;
}
function toniV23SubjectForJourney(journey){return journey?(journey.subject||journey.area||journey.fach||journey.category||""):"";}
function toniV23OpenActiveJourney(){
  const active=toniV23GetActiveJourneyFromState();
  if(!active){if(typeof openJourneySwitchModal==="function")openJourneySwitchModal();return;}
  if(typeof renderLearningJourneyModal==="function"){
    renderLearningJourneyModal();
    document.getElementById("lr-modal")?.classList.add("open");
  }else alert("Die Lernreise kann aktuell nicht geöffnet werden.");
}
async function toniV23DeleteActiveJourneyAssignment(){
  const active=toniV23GetActiveJourneyFromState();
  if(!active){alert("Es ist keine aktive Lernreise ausgewählt.");return;}
  if(!confirm(`Zuordnung zur Lernreise „${active.title||"Lernreise"}“ wirklich löschen?`))return;
  try{
    if(typeof supabaseRequest==="function"){
      await supabaseRequest("rpc/delete_my_learning_journey_assignment",{method:"POST",body:JSON.stringify({p_template_id:active.id})});
    }else if(typeof getLocalAssignmentsV18==="function"&&typeof setLocalAssignmentsV18==="function"){
      const profile=window.TONI_AUTH_PROFILE||{};
      const email=String(profile.email||"").toLowerCase();
      const rows=getLocalAssignmentsV18().filter(a=>!(String(a.learning_journey_template_id)===String(active.id)&&String(a.student_email||"").toLowerCase()===email));
      setLocalAssignmentsV18(rows);
    }
    if(typeof STATE!=="undefined"){
      STATE.learningJourneys=(STATE.learningJourneys||[]).filter(j=>String(j.id)!==String(active.id));
      STATE.activeJourneyId=STATE.learningJourneys[0]?.id||null;
      saveState?.(STATE);syncJourneyToDashboard?.();
    }
    window.TONI_V23_ASSIGNED_JOURNEYS_CACHE=null;
    await toniV23LoadAssignedJourneysSafe();
    toniV23RefreshLearningJourneyHeader();
    appendMsg?.("toni","🗑️ Die Zuordnung zur Lernreise wurde gelöscht.",typeof time==="function"?time():"","desktop");
  }catch(e){console.error("TONI V23: Zuordnung löschen fehlgeschlagen:",e);alert("Die Zuordnung konnte nicht gelöscht werden:\n"+e.message);}
}
function toniV23BuildHeader(card){
  const header=card.querySelector(".card-header"); if(!header)return null;
  if(!header.classList.contains("lr-hero-header-v23")){
    header.classList.add("lr-hero-header-v23");
    header.innerHTML=`
      <div class="lr-title-stack-v23">
        <div class="lr-title-main-v23" id="lr-title-main-v23">Lernreisen</div>
        <div class="lr-title-sub-v23" id="lr-title-sub-v23"></div>
      </div>
      <div class="lr-action-row-v23">
        <button class="lr-icon-btn-v23" id="lr-open-btn-v23" title="Lernreise öffnen" aria-label="Lernreise öffnen" onclick="toniV23OpenActiveJourney()">🎯</button>
        <button class="lr-icon-btn-v23" title="Lernreise wechseln" aria-label="Lernreise wechseln" onclick="openJourneySwitchModal()">⇄</button>
        <button class="lr-icon-btn-v23" title="Lernreise hinzufügen" aria-label="Lernreise hinzufügen" onclick="openJourneyScanModal()">+</button>
        <button class="lr-icon-btn-v23 danger" id="lr-delete-assignment-btn-v23" title="Zuordnung löschen" aria-label="Zuordnung löschen" onclick="toniV23DeleteActiveJourneyAssignment()">−</button>
      </div>`;
  }
  [...card.querySelectorAll(".card-link")].forEach(el=>{if((el.textContent||"").includes("Lernreise öffnen"))el.style.display="none";});
  return header;
}
async function toniV23RefreshLearningJourneyHeader(){
  const card=toniV23FindLearningJourneyCard(); if(!card)return;
  toniV23BuildHeader(card);
  const main=document.getElementById("lr-title-main-v23"), sub=document.getElementById("lr-title-sub-v23"), openBtn=document.getElementById("lr-open-btn-v23"), delBtn=document.getElementById("lr-delete-assignment-btn-v23");
  let assigned=window.TONI_V23_ASSIGNED_JOURNEYS_CACHE;
  if(toniV23Role()==="student")assigned=await toniV23LoadAssignedJourneysSafe();
  const active=toniV23GetActiveJourneyFromState();
  let hasAssigned=true;
  if(toniV23Role()==="student"&&Array.isArray(assigned))hasAssigned=assigned.length>0; else hasAssigned=!!active;
  if(!hasAssigned){
    if(main)main.textContent="Lernreisen"; if(sub)sub.textContent=""; if(openBtn)openBtn.disabled=true; if(delBtn)delBtn.disabled=true; return;
  }
  if(main)main.textContent=active?.title||"Lernreisen";
  if(sub)sub.textContent=toniV23SubjectForJourney(active)||"";
  if(openBtn)openBtn.disabled=!active;
  if(delBtn)delBtn.disabled=!active||toniV23Role()!=="student";
}
function toniV23InstallLearningJourneyHeader(){
  const card=toniV23FindLearningJourneyCard(); if(!card)return;
  toniV23BuildHeader(card); toniV23RefreshLearningJourneyHeader();
}
const TONI_V23_ORIGINAL_SYNC_JOURNEY=window.syncJourneyToDashboard;
if(typeof TONI_V23_ORIGINAL_SYNC_JOURNEY==="function"){
  window.syncJourneyToDashboard=function(){const r=TONI_V23_ORIGINAL_SYNC_JOURNEY.apply(this,arguments);setTimeout(toniV23RefreshLearningJourneyHeader,80);return r;};
}
const TONI_V23_ORIGINAL_START_ASSIGNED=window.startAssignedJourneyV20;
if(typeof TONI_V23_ORIGINAL_START_ASSIGNED==="function"){
  window.startAssignedJourneyV20=function(index){const r=TONI_V23_ORIGINAL_START_ASSIGNED.apply(this,arguments);setTimeout(toniV23RefreshLearningJourneyHeader,120);return r;};
}
const TONI_V23_ORIGINAL_ASSIGN_CODE=window.assignJourneyFromCodeV20;
if(typeof TONI_V23_ORIGINAL_ASSIGN_CODE==="function"){
  window.assignJourneyFromCodeV20=async function(rawCode){const r=await TONI_V23_ORIGINAL_ASSIGN_CODE.apply(this,arguments);window.TONI_V23_ASSIGNED_JOURNEYS_CACHE=null;await toniV23LoadAssignedJourneysSafe();toniV23RefreshLearningJourneyHeader();return r;};
}
const TONI_V23_ORIGINAL_APPLY_ROLE_UI=window.applyRoleUI;
window.applyRoleUI=function(){if(typeof TONI_V23_ORIGINAL_APPLY_ROLE_UI==="function")TONI_V23_ORIGINAL_APPLY_ROLE_UI();setTimeout(toniV23InstallLearningJourneyHeader,100);};
window.addEventListener("DOMContentLoaded",()=>{setTimeout(toniV23InstallLearningJourneyHeader,500);setTimeout(toniV23InstallLearningJourneyHeader,1600);setTimeout(toniV23InstallLearningJourneyHeader,3500);});

/* TONI V24 – Lernreise-Titel zuverlässiger aktualisieren und Öffnen-Icon ändern */

window.TONI_V24_CURRENT_JOURNEY = window.TONI_V24_CURRENT_JOURNEY || null;

function toniV24NormalizeTemplate(template){
  if(!template) return null;
  const j = template.journey_json || template;
  return {
    id: template.id || j.id,
    title: template.title || j.title || "Lernreise",
    subject: template.subject || j.subject || template.area || j.area || "",
    goal: template.goal || j.goal || "",
    description: template.description || j.description || "",
    steps: j.steps || []
  };
}

function toniV24GetActiveJourney(){
  // 1. Explizit gemerkte Lernreise nach einem Wechsel
  if(window.TONI_V24_CURRENT_JOURNEY?.id){
    return window.TONI_V24_CURRENT_JOURNEY;
  }

  // 2. Aus STATE
  try{
    if(typeof ensureLearningState === "function") ensureLearningState();
    if(typeof STATE !== "undefined"){
      const journeys = STATE.learningJourneys || [];
      const activeId = STATE.activeJourneyId;
      const active = journeys.find(j => String(j.id) === String(activeId)) || journeys[0] || null;
      if(active?.id) return active;
    }
  }catch(e){}

  // 3. Aus Cache zugeordneter Lernreisen
  try{
    const rows = window.TONI_V23_ASSIGNED_JOURNEYS_CACHE || [];
    if(rows.length){
      const template = rows[0].journey_template || rows[0].learning_journey_templates || rows[0];
      return toniV24NormalizeTemplate(template);
    }
  }catch(e){}

  return null;
}

function toniV24SetOpenButtonIcon(){
  const btn = document.getElementById("lr-open-btn-v23");
  if(!btn) return;
  btn.classList.add("open-v24");
  btn.innerHTML = '<span class="lr-open-dot-v24" aria-hidden="true"></span>';
  btn.title = "Lernreise öffnen";
  btn.setAttribute("aria-label", "Lernreise öffnen");
}

function toniV24UpdateHeaderNow(){
  const card = typeof toniV23FindLearningJourneyCard === "function" ? toniV23FindLearningJourneyCard() : null;
  if(card && typeof toniV23BuildHeader === "function"){
    toniV23BuildHeader(card);
  }

  toniV24SetOpenButtonIcon();

  const main = document.getElementById("lr-title-main-v23");
  const sub = document.getElementById("lr-title-sub-v23");
  const openBtn = document.getElementById("lr-open-btn-v23");
  const delBtn = document.getElementById("lr-delete-assignment-btn-v23");

  const role = (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) || localStorage.getItem("toni_role") || "student";
  const active = toniV24GetActiveJourney();

  if(!active){
    if(main) main.textContent = "Lernreisen";
    if(sub) sub.textContent = "";
    if(openBtn) openBtn.disabled = true;
    if(delBtn) delBtn.disabled = true;
    return;
  }

  if(main) main.textContent = active.title || "Lernreisen";
  if(sub) sub.textContent = active.subject || active.area || active.fach || "";
  if(openBtn) openBtn.disabled = false;
  if(delBtn) delBtn.disabled = role !== "student";
}

function toniV24ScheduleHeaderUpdate(){
  setTimeout(toniV24UpdateHeaderNow, 0);
  setTimeout(toniV24UpdateHeaderNow, 80);
  setTimeout(toniV24UpdateHeaderNow, 250);
  setTimeout(toniV24UpdateHeaderNow, 700);
}

// Öffnen der Lernreise nutzt jetzt ebenfalls den zuverlässigen aktiven Wert
window.toniV23OpenActiveJourney = function(){
  const active = toniV24GetActiveJourney();

  if(!active){
    if(typeof openJourneySwitchModal === "function") openJourneySwitchModal();
    return;
  }

  try{
    if(typeof ensureLearningState === "function") ensureLearningState();
    if(typeof STATE !== "undefined"){
      STATE.learningJourneys = STATE.learningJourneys || [];
      const pos = STATE.learningJourneys.findIndex(j => String(j.id) === String(active.id));
      if(pos >= 0) STATE.learningJourneys[pos] = active;
      else STATE.learningJourneys.push(active);
      STATE.activeJourneyId = active.id;
      saveState?.(STATE);
    }
  }catch(e){}

  if(typeof renderLearningJourneyModal === "function"){
    renderLearningJourneyModal();
    document.getElementById("lr-modal")?.classList.add("open");
  }else{
    alert("Die Lernreise kann aktuell nicht geöffnet werden.");
  }
};

// Wechsel-Funktion nachschärfen: Titel sofort merken und Header aktualisieren
if(typeof window.startAssignedJourneyV20 === "function"){
  const TONI_V24_ORIGINAL_START_ASSIGNED = window.startAssignedJourneyV20;
  window.startAssignedJourneyV20 = function(index){
    try{
      const template = window["TONI_SWITCH_JOURNEY_" + index];
      const journey = toniV24NormalizeTemplate(template);
      if(journey?.id){
        window.TONI_V24_CURRENT_JOURNEY = journey;

        if(typeof ensureLearningState === "function") ensureLearningState();
        if(typeof STATE !== "undefined"){
          STATE.learningJourneys = STATE.learningJourneys || [];
          const pos = STATE.learningJourneys.findIndex(j => String(j.id) === String(journey.id));
          if(pos >= 0) STATE.learningJourneys[pos] = journey;
          else STATE.learningJourneys.push(journey);
          STATE.activeJourneyId = journey.id;
          saveState?.(STATE);
        }
      }
    }catch(e){
      console.warn("TONI V24 Wechsel-Vorbereitung:", e);
    }

    const result = TONI_V24_ORIGINAL_START_ASSIGNED.apply(this, arguments);
    toniV24ScheduleHeaderUpdate();
    return result;
  };
}

// Nach QR-Zuordnung Cache leeren und Header nachziehen
if(typeof window.assignJourneyFromCodeV20 === "function"){
  const TONI_V24_ORIGINAL_ASSIGN = window.assignJourneyFromCodeV20;
  window.assignJourneyFromCodeV20 = async function(rawCode){
    const result = await TONI_V24_ORIGINAL_ASSIGN.apply(this, arguments);
    window.TONI_V23_ASSIGNED_JOURNEYS_CACHE = null;
    try{
      if(typeof toniV23LoadAssignedJourneysSafe === "function"){
        await toniV23LoadAssignedJourneysSafe();
      }
    }catch(e){}
    toniV24ScheduleHeaderUpdate();
    return result;
  };
}

// Nach dem Wechsel-Modal laden ebenfalls nachziehen
if(typeof window.openJourneySwitchModal === "function"){
  const TONI_V24_ORIGINAL_OPEN_SWITCH = window.openJourneySwitchModal;
  window.openJourneySwitchModal = async function(){
    const result = await TONI_V24_ORIGINAL_OPEN_SWITCH.apply(this, arguments);
    toniV24ScheduleHeaderUpdate();
    return result;
  };
}

// Bestehende Refresh-Funktion überschreiben, damit sie nicht mehr auf veraltete Daten zurückfällt
window.toniV23RefreshLearningJourneyHeader = async function(){
  toniV24UpdateHeaderNow();
};

// Falls ältere Funktionen das Header-HTML neu schreiben, beobachte den Bereich und setze das Icon/Titel erneut.
function toniV24InstallObserver(){
  const card = typeof toniV23FindLearningJourneyCard === "function" ? toniV23FindLearningJourneyCard() : null;
  if(!card || card.dataset.v24Observer === "1") return;
  card.dataset.v24Observer = "1";

  const observer = new MutationObserver(() => {
    toniV24SetOpenButtonIcon();
  });
  observer.observe(card, {childList:true, subtree:true});
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => { toniV24UpdateHeaderNow(); toniV24InstallObserver(); }, 400);
  setTimeout(() => { toniV24UpdateHeaderNow(); toniV24InstallObserver(); }, 1200);
  setTimeout(() => { toniV24UpdateHeaderNow(); toniV24InstallObserver(); }, 3000);
});

/* TONI V25 – Dynamische Stationskreise je ausgewählter Lernreise */
(function(){
  function toniV25Esc(v){
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function toniV25JourneySteps(j){
    if(!j) return [];
    if(Array.isArray(j.steps)) return j.steps;
    if(Array.isArray(j.stations)) return j.stations;
    return [];
  }

  function toniV25BuildJourneyBar(){
    const wrap = document.querySelector('.lernreise-wrap');
    if(!wrap || typeof activeJourney !== 'function') return;

    const j = activeJourney();
    const steps = toniV25JourneySteps(j);
    if(!steps.length) return;

    const count = steps.length;
    const minWidth = Math.max(580, count * 150);

    const stepsHtml = steps.map((s, i) => {
      let st = 'locked';
      try {
        st = typeof stepStatus === 'function' ? stepStatus(s, i, j) : 'locked';
      } catch(e) {}

      let circleClass = 'locked';
      let circleContent = String(i + 1);
      if(st === 'done'){
        circleClass = 'done';
        circleContent = '✓';
      } else if(st === 'current'){
        circleClass = 'current';
        circleContent = String(i + 1);
      }

      const title = toniV25Esc(s.title || `Station ${i+1}`);
      const subtitle = toniV25Esc(s.subtitle || s.type || '');
      const currentBadge = st === 'current' ? '<div class="step-badge">Du bist hier</div>' : '';

      return `
        <div class="step">
          <div class="step-circle ${circleClass}">${circleContent}</div>
          <div class="step-label ${st === 'current' ? 'cur' : ''}">${title}</div>
          <div class="step-sublabel">${subtitle}</div>
          ${currentBadge}
        </div>`;
    }).join('');

    wrap.innerHTML = `
      <div style="position:relative">
        <div class="lr-line"></div>
        <div class="lr-fill"></div>
        <div class="lernreise" style="min-width:${minWidth}px">${stepsHtml}</div>
      </div>`;

    const fill = wrap.querySelector('.lr-fill');
    if(fill){
      let pct = 0;
      try {
        const idx = typeof currentStepIndex === 'function' ? currentStepIndex(j) : 0;
        pct = count <= 1 ? (idx >= 0 ? 100 : 0) : Math.max(0, Math.min(100, (idx / (count - 1)) * 100));
      } catch(e) {}
      fill.style.width = pct + '%';
    }
  }

  const originalUpdate = window.updateLearningJourneyBar;
  window.updateLearningJourneyBar = function(){
    toniV25BuildJourneyBar();
    if (typeof window.toniV24UpdateHeaderNow === 'function') {
      window.toniV24UpdateHeaderNow();
    }
  };

  const originalRender = window.renderLearningJourneyModal;
  window.renderLearningJourneyModal = function(){
    if(typeof originalRender === 'function') originalRender.apply(this, arguments);
    window.updateLearningJourneyBar();
  };

  const originalOpen = window.openLearningJourney;
  window.openLearningJourney = function(){
    window.updateLearningJourneyBar();
    if(typeof originalOpen === 'function') return originalOpen.apply(this, arguments);
  };

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => window.updateLearningJourneyBar(), 150);
    setTimeout(() => window.updateLearningJourneyBar(), 800);
    setTimeout(() => window.updateLearningJourneyBar(), 1800);
  });
})();

/* TONI V30 – Vorname und Nachname jeweils direkt im vorhandenen Feld bearbeiten */

window.TONI_V30_INLINE_EDIT_FIELD = null;

function toniV30Escape(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function toniV30Profile(){
  return {
    ...(window.TONI_AUTH_PROFILE || {}),
    ...(window.TONI_V27_PROFILE_CACHE || {})
  };
}

function toniV30NameParts(){
  const profile = toniV30Profile();

  let first = profile.first_name || "";
  let last = profile.last_name || "";

  if((!first || !last) && profile.display_name){
    const parts = String(profile.display_name).trim().split(/\s+/).filter(Boolean);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  if(!first || !last){
    const nameText = (document.getElementById("auth-user-name")?.textContent || "").trim();
    const parts = nameText.split(/\s+/).filter(Boolean);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  return { first, last };
}

function toniV30ClassName(){
  const profile = toniV30Profile();
  let cls = profile.class_name || profile.class || "";

  if(!cls){
    const roleText = (document.getElementById("auth-user-role")?.textContent || "").trim();
    if(roleText.includes("·")) cls = roleText.split("·").slice(1).join("·").trim();
  }

  return cls || "–";
}

function toniV30RenderField(field, value){
  const id = field === "first" ? "profile-data-first" : "profile-data-last";
  const el = document.getElementById(id);
  if(!el) return;

  el.classList.add("inline-edit-v30");
  el.classList.add("editable-v29");

  if(window.TONI_V30_INLINE_EDIT_FIELD === field){
    el.innerHTML = `
      <input class="profile-inline-input-v30" id="profile-inline-${field}-v30" value="${toniV30Escape(value || "")}" onkeydown="toniV30InlineKey(event,'${field}')"/>
      <div class="profile-inline-actions-v30">
        <button class="profile-inline-btn-v30 save" type="button" title="Speichern" onclick="toniV30SaveInlineName('${field}')">✓</button>
        <button class="profile-inline-btn-v30 cancel" type="button" title="Abbrechen" onclick="toniV30CancelInlineEdit()">×</button>
      </div>
    `;
    setTimeout(() => {
      const input = document.getElementById(`profile-inline-${field}-v30`);
      if(input){
        input.focus();
        input.select();
      }
    }, 50);
    return;
  }

  el.innerHTML = `
    <span class="profile-data-text-v29">${toniV30Escape(value || "–")}</span>
    <button class="profile-inline-btn-v30 edit" type="button" onclick="toniV30StartInlineEdit('${field}')" title="${field === "first" ? "Vorname" : "Nachname"} bearbeiten" aria-label="${field === "first" ? "Vorname" : "Nachname"} bearbeiten">✎</button>
  `;
}

function toniV30RenderProfileValues(profile){
  if(profile){
    window.TONI_AUTH_PROFILE = {...(window.TONI_AUTH_PROFILE || {}), ...profile};
    window.TONI_V27_PROFILE_CACHE = {...(window.TONI_V27_PROFILE_CACHE || {}), ...profile};
  }

  const names = toniV30NameParts();

  toniV30RenderField("first", names.first || "");
  toniV30RenderField("last", names.last || "");

  const classEl = document.getElementById("profile-data-class");
  if(classEl){
    classEl.classList.remove("editable-v29", "inline-edit-v30");
    classEl.textContent = toniV30ClassName();
  }
}

function toniV30StartInlineEdit(field){
  window.TONI_V30_INLINE_EDIT_FIELD = field;
  toniV30RenderProfileValues();
}

function toniV30CancelInlineEdit(){
  window.TONI_V30_INLINE_EDIT_FIELD = null;
  toniV30RenderProfileValues();
}

function toniV30InlineKey(event, field){
  if(event.key === "Enter"){
    event.preventDefault();
    toniV30SaveInlineName(field);
  }
  if(event.key === "Escape"){
    event.preventDefault();
    toniV30CancelInlineEdit();
  }
}

async function toniV30SaveInlineName(field){
  const names = toniV30NameParts();
  const input = document.getElementById(`profile-inline-${field}-v30`);
  const value = input?.value.trim() || "";

  if(!value){
    alert(field === "first" ? "Bitte gib einen Vornamen ein." : "Bitte gib einen Nachnamen ein.");
    return;
  }

  const first = field === "first" ? value : names.first;
  const last = field === "last" ? value : names.last;

  if(!first || !last){
    alert("Vorname und Nachname müssen ausgefüllt sein.");
    return;
  }

  try{
    if(typeof supabaseRequest === "function"){
      await supabaseRequest("rpc/update_my_profile_names", {
        method: "POST",
        body: JSON.stringify({
          p_first_name: first,
          p_last_name: last
        })
      });
    }else{
      const token = typeof toniV27GetAccessToken === "function" ? await toniV27GetAccessToken() : null;
      const profile = toniV30Profile();

      if(!token || !profile.id){
        throw new Error("Keine aktive Sitzung gefunden.");
      }

      const response = await fetch(`${window.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}`, {
        method: "PATCH",
        headers: {
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          display_name: `${first} ${last}`,
          updated_at: new Date().toISOString()
        })
      });

      if(!response.ok){
        const text = await response.text();
        throw new Error(text || "Profil konnte nicht gespeichert werden.");
      }
    }

    const updated = {
      ...toniV30Profile(),
      first_name: first,
      last_name: last,
      display_name: `${first} ${last}`
    };

    window.TONI_AUTH_PROFILE = updated;
    window.TONI_V27_PROFILE_CACHE = updated;
    window.TONI_V30_INLINE_EDIT_FIELD = null;

    const nameEl = document.getElementById("auth-user-name");
    if(nameEl) nameEl.textContent = `${first} ${last}`;

    const greeting = document.querySelector(".topbar-greeting h2");
    if(greeting) greeting.innerHTML = `Hallo ${toniV30Escape(first)}! 👋`;

    toniV30RenderProfileValues(updated);

    appendMsg?.("toni", "✅ Deine Profildaten wurden aktualisiert.", typeof time === "function" ? time() : "", "desktop");

  }catch(error){
    console.error("TONI V30 Namen speichern:", error);
    alert("Der Name konnte nicht gespeichert werden:\n" + error.message);
  }
}

// Alte V29-Bearbeitungsfläche deaktivieren und Anzeige auf Inline-Editing umstellen.
window.toniV29OpenNameEditor = function(){
  toniV30StartInlineEdit("first");
};

window.toniV29CancelNameEditor = function(){
  toniV30CancelInlineEdit();
};

window.toniV29RenderProfileValues = function(profile){
  toniV30RenderProfileValues(profile);
};

window.toniV27SetProfileModalValues = function(profile){
  if(window.TONI_V30_INLINE_EDIT_FIELD) return;
  toniV30RenderProfileValues(profile);
};

const TONI_V30_ORIGINAL_OPEN_PROFILE = window.openProfileDataModal;
window.openProfileDataModal = async function(){
  document.getElementById("profile-data-modal")?.classList.add("open");
  window.TONI_V30_INLINE_EDIT_FIELD = null;
  toniV30RenderProfileValues();

  try{
    if(typeof toniV27FetchFreshProfile === "function"){
      const fresh = await toniV27FetchFreshProfile();
      toniV30RenderProfileValues(fresh);
    }else if(typeof TONI_V30_ORIGINAL_OPEN_PROFILE === "function"){
      await TONI_V30_ORIGINAL_OPEN_PROFILE.apply(this, arguments);
      toniV30RenderProfileValues();
    }
  }catch(error){
    console.warn("TONI V30 Profil frisch laden:", error);
  }

  document.getElementById("profile-edit-form-v29")?.classList.add("hidden");
};

if(typeof window.openProfileDataModalV27 === "function"){
  const TONI_V30_ORIGINAL_OPEN_PROFILE_V27 = window.openProfileDataModalV27;
  window.openProfileDataModalV27 = async function(){
    document.getElementById("profile-data-modal")?.classList.add("open");
    const result = await TONI_V30_ORIGINAL_OPEN_PROFILE_V27.apply(this, arguments);
    window.TONI_V30_INLINE_EDIT_FIELD = null;
    toniV30RenderProfileValues(window.TONI_V27_PROFILE_CACHE || window.TONI_AUTH_PROFILE || {});
    document.getElementById("profile-edit-form-v29")?.classList.add("hidden");
    return result;
  };
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if(document.getElementById("profile-data-modal")?.classList.contains("open")){
      toniV30RenderProfileValues();
    }
  }, 500);
});

/* TONI V35 – Fotoaufnahme mit Countdown 3-2-1 */

window.TONI_V35_AVATAR_COUNTDOWN_RUNNING = false;

function toniV35Sleep(ms){
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toniV35EnsureCountdownOverlay(){
  const wrap = document.querySelector(".avatar-video-wrap-v31");
  if(!wrap) return null;

  let overlay = document.getElementById("avatar-countdown-overlay-v35");
  if(overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "avatar-countdown-overlay-v35";
  overlay.className = "avatar-countdown-overlay-v35";
  overlay.innerHTML = `<div class="avatar-countdown-number-v35" id="avatar-countdown-number-v35">3</div>`;
  wrap.appendChild(overlay);

  return overlay;
}

function toniV35SetCountdownNumber(number){
  const overlay = toniV35EnsureCountdownOverlay();
  const numberEl = document.getElementById("avatar-countdown-number-v35");
  if(!overlay || !numberEl) return;

  numberEl.textContent = String(number);
  numberEl.style.animation = "none";
  numberEl.offsetHeight; // Reflow für Animation
  numberEl.style.animation = "";

  overlay.classList.add("visible");
}

function toniV35HideCountdown(){
  const overlay = document.getElementById("avatar-countdown-overlay-v35");
  if(overlay) overlay.classList.remove("visible");
}

const TONI_V35_ORIGINAL_CAPTURE_AVATAR = window.toniV31CaptureAvatarPhoto;

window.toniV31CaptureAvatarPhoto = async function(){
  if(window.TONI_V35_AVATAR_COUNTDOWN_RUNNING) return;

  try{
    const video = document.getElementById("profile-avatar-video-v31");
    if(!video || video.readyState < 2){
      throw new Error("Die Kamera ist noch nicht bereit.");
    }

    window.TONI_V35_AVATAR_COUNTDOWN_RUNNING = true;

    if(typeof toniV31SetAvatarStatus === "function"){
      toniV31SetAvatarStatus("Foto wird aufgenommen … 3");
    }

    for(const number of [3, 2, 1]){
      toniV35SetCountdownNumber(number);

      if(typeof toniV31SetAvatarStatus === "function"){
        toniV31SetAvatarStatus("Foto wird aufgenommen … " + number, "");
      }

      await toniV35Sleep(800);
    }

    toniV35HideCountdown();

    if(typeof TONI_V35_ORIGINAL_CAPTURE_AVATAR === "function"){
      TONI_V35_ORIGINAL_CAPTURE_AVATAR.apply(this, arguments);
    }

  }catch(error){
    console.error("TONI V35 Countdown/Fotofunktion:", error);
    toniV35HideCountdown();

    if(typeof toniV31SetAvatarStatus === "function"){
      toniV31SetAvatarStatus("⚠️ Foto konnte nicht aufgenommen werden:<br>" + String(error.message || error), "err");
    }else{
      alert("Foto konnte nicht aufgenommen werden:\n" + (error.message || error));
    }
  }finally{
    window.TONI_V35_AVATAR_COUNTDOWN_RUNNING = false;
  }
};

// Wenn das Kamerafenster geöffnet wird, Overlay vorbereiten.
if(typeof window.toniV31OpenAvatarCamera === "function"){
  const TONI_V35_ORIGINAL_OPEN_CAMERA = window.toniV31OpenAvatarCamera;
  window.toniV31OpenAvatarCamera = function(...args){
    const result = TONI_V35_ORIGINAL_OPEN_CAMERA.apply(this, args);
    setTimeout(toniV35EnsureCountdownOverlay, 80);
    return result;
  };
}

// Beim Schließen Countdown zurücksetzen.
if(typeof window.toniV31CloseAvatarCamera === "function"){
  const TONI_V35_ORIGINAL_CLOSE_CAMERA = window.toniV31CloseAvatarCamera;
  window.toniV31CloseAvatarCamera = function(...args){
    window.TONI_V35_AVATAR_COUNTDOWN_RUNNING = false;
    toniV35HideCountdown();
    return TONI_V35_ORIGINAL_CLOSE_CAMERA.apply(this, args);
  };
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV35EnsureCountdownOverlay, 500);
});

/* TONI V40 – Individuellen Lernstand je Student und Lernreise speichern */

window.TONI_V40_PROGRESS_SAVE_TIMER = null;
window.TONI_V40_PROGRESS_LOADING = false;
window.TONI_V40_LAST_SAVE_KEY = "";

function toniV40IsUuid(value){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(value || "").trim());
}

function toniV40Role(){
  return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) || localStorage.getItem("toni_role") || "student";
}

function toniV40CurrentProfileId(){
  return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.id) ||
         window.TONI_ACTIVE_PROFILE_ID ||
         localStorage.getItem("toni_profile_id") ||
         null;
}

function toniV40CanPersist(){
  return typeof supabaseRequest === "function" &&
         !!toniV40CurrentProfileId() &&
         toniV40Role() === "student";
}

function toniV40Indicator(text, type=""){
  const box = document.getElementById("toni-progress-save-indicator-v40");
  const label = document.getElementById("toni-progress-save-text-v40");
  if(!box || !label) return;

  label.textContent = text;
  box.className = "toni-progress-save-indicator-v40 visible " + type;

  clearTimeout(window.TONI_V40_INDICATOR_TIMER);
  window.TONI_V40_INDICATOR_TIMER = setTimeout(() => {
    box.classList.remove("visible");
  }, type === "err" ? 5000 : 1700);
}

function toniV40EnsureState(){
  try{
    if(typeof ensureLearningState === "function") ensureLearningState();
  }catch{}
}

function toniV40ActiveJourney(){
  toniV40EnsureState();
  try{
    if(typeof activeJourney === "function") return activeJourney();
  }catch{}
  if(typeof STATE !== "undefined"){
    const journeys = STATE.learningJourneys || [];
    return journeys.find(j => String(j.id) === String(STATE.activeJourneyId)) || journeys[0] || null;
  }
  return null;
}

function toniV40AllTasks(journey){
  journey = journey || toniV40ActiveJourney();
  if(!journey?.steps) return [];
  return journey.steps.flatMap(step => (step.tasks || []).map(task => ({...task, stepId: step.id, stepTitle: step.title})));
}

function toniV40ProgressPercent(journey){
  journey = journey || toniV40ActiveJourney();
  try{
    if(typeof journeyProgress === "function") return journeyProgress(journey);
  }catch{}

  const required = toniV40AllTasks(journey).filter(t => t.required);
  if(!required.length) return 0;
  return Math.round(required.filter(t => t.status === "done").length / required.length * 100);
}

function toniV40CurrentStepIndex(journey){
  journey = journey || toniV40ActiveJourney();
  try{
    if(typeof currentStepIndex === "function") return currentStepIndex(journey);
  }catch{}
  return 0;
}

function toniV40Snapshot(journey){
  journey = journey || toniV40ActiveJourney();
  if(!journey?.id) return null;

  const tasks = toniV40AllTasks(journey);
  const progressPercent = toniV40ProgressPercent(journey);
  const activeStepIndex = toniV40CurrentStepIndex(journey);
  const activeStep = journey.steps?.[activeStepIndex] || null;

  return {
    version: 1,
    saved_at: new Date().toISOString(),
    student_profile_id: toniV40CurrentProfileId(),
    learning_journey_template_id: journey.id,
    active_step_id: activeStep?.id || null,
    active_step_index: activeStepIndex,
    selected_task_id: (typeof STATE !== "undefined" ? STATE.selectedTaskId : null) || null,
    progress_percent: progressPercent,
    status: progressPercent >= 100 ? "completed" : "in_progress",
    completed_required_count: tasks.filter(t => t.required && t.status === "done").length,
    total_required_count: tasks.filter(t => t.required).length,
    journey: {
      id: journey.id,
      title: journey.title,
      subject: journey.subject || "",
      goal: journey.goal || "",
      description: journey.description || "",
      steps: (journey.steps || []).map(step => ({
        id: step.id,
        title: step.title,
        subtitle: step.subtitle || "",
        description: step.description || "",
        tasks: (step.tasks || []).map(task => ({
          id: task.id,
          title: task.title,
          type: task.type || "",
          required: task.required !== false,
          status: task.status || "todo",
          description: task.description || "",
          content: task.content || "",
          answer: task.answer || "",
          updated_at: task.updated_at || null
        }))
      }))
    }
  };
}

async function toniV40SaveActiveProgressNow(showIndicator=false){
  if(window.TONI_V40_PROGRESS_LOADING) return;
  if(!toniV40CanPersist()) return;

  const journey = toniV40ActiveJourney();
  if(!journey?.id || !toniV40IsUuid(journey.id)) return;

  const snapshot = toniV40Snapshot(journey);
  if(!snapshot) return;

  const saveKey = JSON.stringify({
    jid: journey.id,
    pct: snapshot.progress_percent,
    step: snapshot.active_step_id,
    selected: snapshot.selected_task_id,
    tasks: snapshot.journey.steps.map(s => s.tasks.map(t => [t.id, t.status, t.answer || ""]))
  });

  if(saveKey === window.TONI_V40_LAST_SAVE_KEY && !showIndicator){
    return;
  }

  try{
    if(showIndicator) toniV40Indicator("Lernstand wird gespeichert …");

    await supabaseRequest("rpc/save_my_learning_journey_progress", {
      method: "POST",
      body: JSON.stringify({
        p_template_id: journey.id,
        p_progress_json: snapshot,
        p_active_step_id: snapshot.active_step_id,
        p_active_step_index: snapshot.active_step_index,
        p_selected_task_id: snapshot.selected_task_id,
        p_progress_percent: snapshot.progress_percent,
        p_status: snapshot.status
      })
    });

    window.TONI_V40_LAST_SAVE_KEY = saveKey;
    if(showIndicator) toniV40Indicator("Lernstand gespeichert", "ok");
  }catch(error){
    console.error("TONI V40 Lernstand speichern:", error);
    if(showIndicator) toniV40Indicator("Lernstand konnte nicht gespeichert werden", "err");
  }
}

function toniV40DebouncedSave(showIndicator=false){
  if(window.TONI_V40_PROGRESS_LOADING) return;
  clearTimeout(window.TONI_V40_PROGRESS_SAVE_TIMER);
  window.TONI_V40_PROGRESS_SAVE_TIMER = setTimeout(() => {
    toniV40SaveActiveProgressNow(showIndicator);
  }, showIndicator ? 120 : 900);
}

function toniV40BuildTaskMap(progressJson){
  const map = new Map();
  const steps = progressJson?.journey?.steps || [];
  steps.forEach(step => {
    (step.tasks || []).forEach(task => {
      if(task.id) map.set(String(task.id), task);
    });
  });
  return map;
}

function toniV40ApplyProgressToJourney(journey, progressJson){
  if(!journey || !progressJson) return journey;

  const savedJourney = progressJson.journey || {};
  const taskMap = toniV40BuildTaskMap(progressJson);

  const merged = {
    ...journey,
    id: journey.id || savedJourney.id,
    title: journey.title || savedJourney.title,
    subject: journey.subject || savedJourney.subject || "",
    goal: journey.goal || savedJourney.goal || "",
    description: journey.description || savedJourney.description || ""
  };

  if(Array.isArray(merged.steps)){
    merged.steps = merged.steps.map(step => ({
      ...step,
      tasks: (step.tasks || []).map(task => {
        const saved = taskMap.get(String(task.id));
        if(!saved) return task;
        return {
          ...task,
          status: saved.status || task.status || "todo",
          answer: saved.answer || task.answer || "",
          updated_at: saved.updated_at || task.updated_at || null
        };
      })
    }));
  }else if(Array.isArray(savedJourney.steps)){
    merged.steps = savedJourney.steps;
  }

  return merged;
}

async function toniV40LoadProgressForJourney(templateId){
  if(!toniV40CanPersist() || !templateId || !toniV40IsUuid(templateId)) return null;

  try{
    const rows = await supabaseRequest("rpc/get_my_learning_journey_progress", {
      method: "POST",
      body: JSON.stringify({ p_template_id: templateId })
    });

    if(Array.isArray(rows) && rows[0]) return rows[0];
    if(rows && rows.progress_json) return rows;
  }catch(error){
    console.warn("TONI V40 Lernstand laden:", error);
  }

  return null;
}

async function toniV40ApplyProgressForJourney(journey){
  if(!journey?.id) return journey;

  const row = await toniV40LoadProgressForJourney(journey.id);
  const progressJson = row?.progress_json || null;

  if(!progressJson) return journey;

  const merged = toniV40ApplyProgressToJourney(journey, progressJson);

  if(typeof STATE !== "undefined"){
    STATE.learningJourneys = STATE.learningJourneys || [];
    const idx = STATE.learningJourneys.findIndex(j => String(j.id) === String(merged.id));
    if(idx >= 0) STATE.learningJourneys[idx] = merged;
    else STATE.learningJourneys.push(merged);

    STATE.activeJourneyId = merged.id;
    if(progressJson.selected_task_id) STATE.selectedTaskId = progressJson.selected_task_id;

    saveState?.(STATE);
  }

  try{
    if(typeof unlockJourneyTasks === "function") unlockJourneyTasks();
  }catch{}

  return merged;
}

async function toniV40ApplyProgressForActiveJourney(){
  const journey = toniV40ActiveJourney();
  if(!journey?.id) return;

  window.TONI_V40_PROGRESS_LOADING = true;
  try{
    await toniV40ApplyProgressForJourney(journey);
    if(typeof syncJourneyToDashboard === "function"){
      // Original wrapper schützt über TONI_V40_PROGRESS_LOADING vor direktem Resave.
      syncJourneyToDashboard();
    }
    if(document.getElementById("lr-modal")?.classList.contains("open") && typeof renderLearningJourneyModal === "function"){
      renderLearningJourneyModal();
    }
    if(typeof toniV24UpdateHeaderNow === "function") toniV24UpdateHeaderNow();
  }finally{
    window.TONI_V40_PROGRESS_LOADING = false;
  }
}

async function toniV40LoadMostRecentAssignedProgress(){
  if(!toniV40CanPersist()) return;
  if(typeof loadAssignedJourneysForStudentV20 !== "function") return;

  try{
    const assigned = await loadAssignedJourneysForStudentV20();
    if(!assigned || !assigned.length) return;

    const rows = await supabaseRequest("rpc/get_my_learning_journey_progress_all", {
      method: "POST",
      body: JSON.stringify({})
    });

    const progressRows = Array.isArray(rows) ? rows : [];
    let chosenTemplate = null;
    let chosenProgress = null;

    if(progressRows.length){
      progressRows.sort((a,b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
      for(const row of progressRows){
        const hit = assigned.find(a => {
          const t = a.journey_template || a.learning_journey_templates || a;
          return String(t?.id) === String(row.learning_journey_template_id);
        });
        if(hit){
          chosenTemplate = hit.journey_template || hit.learning_journey_templates || hit;
          chosenProgress = row.progress_json;
          break;
        }
      }
    }

    if(!chosenTemplate){
      const first = assigned[0];
      chosenTemplate = first.journey_template || first.learning_journey_templates || first;
    }

    if(!chosenTemplate?.id) return;

    let journey = typeof normalizeTemplateToJourneyV20 === "function"
      ? normalizeTemplateToJourneyV20(chosenTemplate)
      : {
          id: chosenTemplate.id,
          title: chosenTemplate.title || chosenTemplate.journey_json?.title || "Lernreise",
          subject: chosenTemplate.subject || chosenTemplate.journey_json?.subject || "",
          goal: chosenTemplate.goal || chosenTemplate.journey_json?.goal || "",
          description: chosenTemplate.description || chosenTemplate.journey_json?.description || "",
          steps: chosenTemplate.journey_json?.steps || []
        };

    if(chosenProgress){
      journey = toniV40ApplyProgressToJourney(journey, chosenProgress);
    }else{
      const loaded = await toniV40LoadProgressForJourney(journey.id);
      if(loaded?.progress_json) journey = toniV40ApplyProgressToJourney(journey, loaded.progress_json);
    }

    if(typeof STATE !== "undefined"){
      STATE.learningJourneys = STATE.learningJourneys || [];
      const idx = STATE.learningJourneys.findIndex(j => String(j.id) === String(journey.id));
      if(idx >= 0) STATE.learningJourneys[idx] = journey;
      else STATE.learningJourneys.push(journey);
      STATE.activeJourneyId = journey.id;
      saveState?.(STATE);
    }

    if(typeof syncJourneyToDashboard === "function") syncJourneyToDashboard();
    if(typeof toniV24UpdateHeaderNow === "function") toniV24UpdateHeaderNow();
  }catch(error){
    console.warn("TONI V40 letzten Lernstand laden:", error);
  }
}

/* Bestehende Funktionen erweitern */

if(typeof window.syncJourneyToDashboard === "function"){
  const TONI_V40_ORIGINAL_SYNC = window.syncJourneyToDashboard;
  window.syncJourneyToDashboard = function(...args){
    const result = TONI_V40_ORIGINAL_SYNC.apply(this, args);
    toniV40DebouncedSave(false);
    return result;
  };
}

if(typeof window.saveSelectedTaskAnswer === "function"){
  const TONI_V40_ORIGINAL_SAVE_ANSWER = window.saveSelectedTaskAnswer;
  window.saveSelectedTaskAnswer = function(...args){
    const result = TONI_V40_ORIGINAL_SAVE_ANSWER.apply(this, args);
    toniV40DebouncedSave(true);
    return result;
  };
}

if(typeof window.openLearningTask === "function"){
  const TONI_V40_ORIGINAL_OPEN_TASK = window.openLearningTask;
  window.openLearningTask = function(...args){
    const result = TONI_V40_ORIGINAL_OPEN_TASK.apply(this, args);
    toniV40DebouncedSave(false);
    return result;
  };
}

if(typeof window.startSelectedLearningTask === "function"){
  const TONI_V40_ORIGINAL_START_TASK = window.startSelectedLearningTask;
  window.startSelectedLearningTask = function(...args){
    const result = TONI_V40_ORIGINAL_START_TASK.apply(this, args);
    toniV40DebouncedSave(true);
    return result;
  };
}

if(typeof window.completeLearningTask === "function"){
  const TONI_V40_ORIGINAL_COMPLETE_TASK = window.completeLearningTask;
  window.completeLearningTask = function(...args){
    const result = TONI_V40_ORIGINAL_COMPLETE_TASK.apply(this, args);
    toniV40DebouncedSave(true);
    return result;
  };
}

if(typeof window.completeSelectedLearningTask === "function"){
  const TONI_V40_ORIGINAL_COMPLETE_SELECTED = window.completeSelectedLearningTask;
  window.completeSelectedLearningTask = function(...args){
    const result = TONI_V40_ORIGINAL_COMPLETE_SELECTED.apply(this, args);
    toniV40DebouncedSave(true);
    return result;
  };
}

if(typeof window.closeLearningTask === "function"){
  const TONI_V40_ORIGINAL_CLOSE_TASK = window.closeLearningTask;
  window.closeLearningTask = function(...args){
    const result = TONI_V40_ORIGINAL_CLOSE_TASK.apply(this, args);
    toniV40DebouncedSave(true);
    return result;
  };
}

if(typeof window.openLearningJourney === "function"){
  const TONI_V40_ORIGINAL_OPEN_JOURNEY = window.openLearningJourney;
  window.openLearningJourney = async function(...args){
    const result = TONI_V40_ORIGINAL_OPEN_JOURNEY.apply(this, args);
    await toniV40ApplyProgressForActiveJourney();
    return result;
  };
}

if(typeof window.startAssignedJourneyV20 === "function"){
  const TONI_V40_ORIGINAL_START_ASSIGNED = window.startAssignedJourneyV20;
  window.startAssignedJourneyV20 = async function(index){
    const result = TONI_V40_ORIGINAL_START_ASSIGNED.apply(this, arguments);
    await toniV40ApplyProgressForActiveJourney();
    await toniV40SaveActiveProgressNow(false);
    return result;
  };
}

if(typeof window.assignJourneyFromCodeV20 === "function"){
  const TONI_V40_ORIGINAL_ASSIGN_CODE = window.assignJourneyFromCodeV20;
  window.assignJourneyFromCodeV20 = async function(...args){
    const result = await TONI_V40_ORIGINAL_ASSIGN_CODE.apply(this, args);
    setTimeout(toniV40LoadMostRecentAssignedProgress, 700);
    return result;
  };
}

/* Login/Logout: Laden oder Zurücksetzen */
["toniV10ShowAdminDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","applyRoleUI"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV40LoadMostRecentAssignedProgress, 800);
      setTimeout(toniV40ApplyProgressForActiveJourney, 1500);
      return result;
    };
  }
});

["logoutUser","signOut"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = async function(...args){
      clearTimeout(window.TONI_V40_PROGRESS_SAVE_TIMER);
      window.TONI_V40_LAST_SAVE_KEY = "";
      return await original.apply(this, args);
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV40LoadMostRecentAssignedProgress, 1200);
  setTimeout(toniV40ApplyProgressForActiveJourney, 2500);

  try{
    const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
    if(client?.auth?.onAuthStateChange && !window.TONI_V40_AUTH_LISTENER_INSTALLED){
      window.TONI_V40_AUTH_LISTENER_INSTALLED = true;
      client.auth.onAuthStateChange((event) => {
        if(event === "SIGNED_OUT"){
          clearTimeout(window.TONI_V40_PROGRESS_SAVE_TIMER);
          window.TONI_V40_LAST_SAVE_KEY = "";
        }
        if(event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED"){
          setTimeout(toniV40LoadMostRecentAssignedProgress, 700);
          setTimeout(toniV40ApplyProgressForActiveJourney, 1500);
        }
      });
    }
  }catch(error){
    console.warn("TONI V40 Auth-Listener:", error);
  }
});

/* TONI V41 – Admin sieht Bearbeitungsstand je Student und Lernreise */

function toniV41Escape(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function toniV41ClampPercent(value){
  const n = Number(value || 0);
  if(Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function toniV41ProgressStatusLabel(status, percent){
  percent = toniV41ClampPercent(percent);
  if(status === "completed" || percent >= 100) return "abgeschlossen";
  if(percent > 0) return "in Bearbeitung";
  return "noch nicht begonnen";
}

function toniV41ProgressHtml(assignment){
  const percent = toniV41ClampPercent(assignment.progress_percent);
  const status = assignment.progress_status || assignment.status || "assigned";
  const label = toniV41ProgressStatusLabel(status, percent);
  const doneClass = percent >= 100 || status === "completed" ? "done" : "";

  return `
    <div class="assigned-student-progress-v41" title="Bearbeitungsstand: ${percent}%">
      <div class="assigned-student-progress-head-v41">
        <span>Bearbeitungsstand</span>
        <span>${percent}%</span>
      </div>
      <div class="assigned-student-progress-track-v41">
        <div class="assigned-student-progress-fill-v41 ${doneClass}" style="width:${percent}%"></div>
      </div>
      <div class="assigned-student-progress-status-v41">${toniV41Escape(label)}</div>
    </div>
  `;
}

async function toniV41LoadAssignmentsWithProgress(){
  if(typeof supabaseRequest === "function"){
    try{
      const rows = await supabaseRequest("rpc/get_learning_journey_assignments_with_profiles_and_progress", {
        method: "POST",
        body: JSON.stringify({})
      });

      return (rows || []).map(row => ({
        id: row.id,
        learning_journey_template_id: row.learning_journey_template_id,
        student_profile_id: row.student_profile_id,
        student_email: row.student_email,
        student_first_name: row.student_first_name,
        student_last_name: row.student_last_name,
        student_display_name: row.student_display_name,
        student_class_name: row.student_class_name,
        student_avatar_data_url: row.student_avatar_data_url || "",
        assigned_by_profile_id: row.assigned_by_profile_id,
        status: row.assignment_status || row.status || "assigned",
        progress_percent: row.progress_percent ?? 0,
        progress_status: row.progress_status || "not_started",
        progress_updated_at: row.progress_updated_at || null,
        progress_last_opened_at: row.progress_last_opened_at || null,
        created_at: row.created_at,
        updated_at: row.updated_at,
        profiles: {
          id: row.student_profile_id,
          email: row.profile_email || row.student_email,
          display_name: row.profile_display_name || row.student_display_name,
          first_name: row.profile_first_name || row.student_first_name,
          last_name: row.profile_last_name || row.student_last_name,
          class_name: row.profile_class_name || row.student_class_name,
          avatar_data_url: row.student_avatar_data_url || ""
        }
      }));
    }catch(error){
      console.warn("TONI V41: RPC mit Fortschritt nicht verfügbar, nutze bisherigen Loader:", error);
    }
  }

  if(typeof toniV37LoadJourneyAssignmentsWithAvatars === "function"){
    const rows = await toniV37LoadJourneyAssignmentsWithAvatars();
    return (rows || []).map(r => ({...r, progress_percent: r.progress_percent ?? 0, progress_status: r.progress_status || "not_started"}));
  }

  if(typeof toniV36LoadJourneyAssignments === "function"){
    const rows = await toniV36LoadJourneyAssignments();
    return (rows || []).map(r => ({...r, progress_percent: 0, progress_status: "not_started"}));
  }

  if(typeof getLocalAssignmentsV18 === "function"){
    return getLocalAssignmentsV18().map(r => ({...r, progress_percent: 0, progress_status: "not_started"}));
  }

  return [];
}

function toniV41StudentFromAssignment(a){
  if(typeof toniV37StudentFromAssignment === "function"){
    return toniV37StudentFromAssignment(a);
  }
  if(typeof toniV36StudentFromAssignment === "function"){
    return toniV36StudentFromAssignment(a);
  }

  const p = a.profiles || {};
  const email = a.student_email || p.email || "";
  const first = a.student_first_name || p.first_name || "";
  const last = a.student_last_name || p.last_name || "";
  const display = a.student_display_name || p.display_name || `${first} ${last}`.trim() || email || "Student";
  const className = a.student_class_name || p.class_name || "";
  const avatar = a.student_avatar_data_url || p.avatar_data_url || "";
  return {display, email, className, avatar};
}

function toniV41StudentAvatarHtml(student){
  if(typeof toniV36StudentAvatarHtml === "function"){
    return toniV36StudentAvatarHtml(student);
  }
  return `<div class="assigned-student-avatar-v36"><span class="assigned-student-avatar-initials-v36">👤</span></div>`;
}

window.loadJourneyAssignmentTable = async function(){
  const tbody = document.getElementById("journey-assignment-table-body");
  if(!tbody) return;

  if(typeof toniV18CanManage === "function" && !toniV18CanManage()){
    tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">🔒 Nur Admins und Tutoren können Lernreisen verwalten.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">Lernreisen, Zuordnungen und Lernstände werden geladen …</div></td></tr>`;

  try{
    const journeys = typeof loadJourneyTemplatesForAssignmentsV18 === "function"
      ? await loadJourneyTemplatesForAssignmentsV18()
      : [];

    const assignments = await toniV41LoadAssignmentsWithProgress();

    window.TONI_JOURNEY_ASSIGNMENT_ROWS = journeys;
    window.TONI_JOURNEY_ASSIGNMENTS = assignments;

    if(!journeys.length){
      tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">Noch keine Lernreisen vorhanden. Lege zuerst im Bereich „Lernreisen verwalten“ eine Lernreise an.</div></td></tr>`;
      return;
    }

    const esc = typeof toniV36Escape === "function" ? toniV36Escape : toniV41Escape;

    tbody.innerHTML = journeys.map(journey => {
      const meta = typeof toniV36JourneyMetaFromRow === "function"
        ? toniV36JourneyMetaFromRow(journey)
        : {subject: journey.subject || "Ohne Fach", goal: journey.goal || "", steps: (journey.journey_json?.steps || []).length};

      const title = typeof toniV36JourneyTitleFromRow === "function"
        ? toniV36JourneyTitleFromRow(journey)
        : (journey.title || "Lernreise");

      const related = assignments.filter(a => String(a.learning_journey_template_id) === String(journey.id));

      const studentHtml = related.length
        ? `<div class="assigned-student-list">` + related.map(a => {
            const s = toniV41StudentFromAssignment(a);
            const avatarHtml = toniV41StudentAvatarHtml(s);

            return `
              <div class="assigned-student-pill">
                <div class="assigned-student-content-v36">
                  ${avatarHtml}
                  <div class="assigned-student-main">
                    <div class="assigned-student-name">${esc(s.display)}</div>
                    <div class="assigned-student-class">${esc(s.className || "ohne Klasse")} · ${esc(s.email || "ohne E-Mail")}</div>
                    ${toniV41ProgressHtml(a)}
                  </div>
                </div>
                <button class="assignment-remove-btn" title="Zuordnung löschen" onclick="deleteJourneyStudentAssignment('${a.id}')">×</button>
              </div>`;
          }).join("") + `</div>`
        : `<div class="assignment-empty">Noch keinem Studenten zugeordnet.</div>`;

      return `
        <tr>
          <td>
            <div class="assignment-journey-title">${esc(title)}</div>
            <div class="assignment-journey-meta">
              ${esc(meta.subject)} · ${meta.steps || 0} Station(en)<br>
              ${meta.goal ? "Ziel: " + esc(meta.goal) : ""}
            </div>
          </td>
          <td>${studentHtml}</td>
          <td>
            <button class="assignment-add-btn" title="QR-Code anzeigen" onclick="openAssignStudentModal('${journey.id}')">+</button>
          </td>
        </tr>
      `;
    }).join("");

    if(typeof updateAssignmentHeaderV20 === "function"){
      updateAssignmentHeaderV20();
    }
  }catch(error){
    console.error("TONI V41: Zuordnungstabelle konnte nicht geladen werden:", error);
    tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">⚠️ Tabelle konnte nicht geladen werden:<br>${toniV41Escape(error.message)}</div></td></tr>`;
  }
};

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if(document.getElementById("learning-journey-assignment-panel")?.classList.contains("visible")){
      loadJourneyAssignmentTable();
    }
  }, 1200);
});

/* TONI V42 – Responsive Nachkorrekturen */
function toniV42ApplyResponsiveFixes(){
  // Tabellenüberschrift nach Rendering erhalten
  if(typeof updateAssignmentHeaderV20 === "function"){
    try{ updateAssignmentHeaderV20(); }catch{}
  }

  // Falls ältere Funktionen feste Breiten inline setzen, bei Handy entspannen
  const isMobile = window.matchMedia("(max-width: 640px)").matches;

  if(isMobile){
    document.querySelectorAll(".assignment-table").forEach(table => {
      table.style.minWidth = "0";
    });

    document.querySelectorAll(".journey-admin-grid").forEach(grid => {
      grid.style.gridTemplateColumns = "1fr";
    });
  }
}

window.addEventListener("resize", () => {
  clearTimeout(window.TONI_V42_RESIZE_TIMER);
  window.TONI_V42_RESIZE_TIMER = setTimeout(toniV42ApplyResponsiveFixes, 120);
});

window.addEventListener("orientationchange", () => {
  setTimeout(toniV42ApplyResponsiveFixes, 250);
  setTimeout(() => {
    if(typeof updateLearningJourneyBar === "function") updateLearningJourneyBar();
  }, 450);
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV42ApplyResponsiveFixes, 300);
  setTimeout(toniV42ApplyResponsiveFixes, 1200);
  setTimeout(toniV42ApplyResponsiveFixes, 3000);
});

/* TONI V43 – Lernreise neu anlegen per RPC, damit RLS-Insert nicht scheitert */

async function toniV43SaveLearningJourneyViaRpc(){
  if(typeof canManageLearningJourneysV16 === "function" && !canManageLearningJourneysV16()){
    alert("Nur Admins und Tutoren können Lernreisen speichern.");
    return;
  }

  try{
    if(typeof syncJourneyBuilderToLegacyTextareaV17 === "function"){
      syncJourneyBuilderToLegacyTextareaV17();
    }

    if(typeof window.TONI_JOURNEY_BUILDER_STATIONS !== "undefined" &&
       Array.isArray(window.TONI_JOURNEY_BUILDER_STATIONS) &&
       window.TONI_JOURNEY_BUILDER_STATIONS.length === 0){
      alert("Bitte füge mindestens eine Station zur Lernreise hinzu.");
      return;
    }

    const editId = document.getElementById("journey-edit-id")?.value || "";
    const journey = buildJourneyFromFormV16(editId || null);

    const payload = {
      p_id: editId || journey.id,
      p_title: journey.title,
      p_subject: journey.subject || "",
      p_goal: journey.goal || "",
      p_description: journey.description || "",
      p_journey_json: journey
    };

    if(typeof supabaseRequest === "function"){
      await supabaseRequest("rpc/upsert_learning_journey_template_v43", {
        method: "POST",
        body: JSON.stringify(payload)
      });
    }else{
      // Offline-/Fallback-Modus wie bisher lokal speichern.
      const rows = typeof getLocalJourneysV16 === "function" ? getLocalJourneysV16() : [];
      const row = {
        id: editId || journey.id,
        owner_profile_id: typeof getJourneyOwnerIdV16 === "function" ? getJourneyOwnerIdV16() : null,
        title: journey.title,
        subject: journey.subject || "",
        goal: journey.goal || "",
        description: journey.description || "",
        journey_json: journey,
        updated_at: new Date().toISOString(),
        _source: "local"
      };
      const idx = rows.findIndex(r => String(r.id) === String(row.id));
      if(idx >= 0) rows[idx] = row;
      else rows.unshift(row);
      setLocalJourneysV16?.(rows);
    }

    resetJourneyEditor?.();
    await loadAdminLearningJourneys?.();
    await loadJourneyAssignmentTable?.();

    appendMsg?.("toni", "✅ Lernreise wurde gespeichert.", typeof time === "function" ? time() : "", "desktop");
  }catch(error){
    console.error("TONI V43 Lernreise speichern:", error);
    alert("Lernreise konnte nicht gespeichert werden:\n" + (error.message || error));
  }
}

// finale Überschreibung der bisherigen Speicherfunktion
window.saveAdminLearningJourney = toniV43SaveLearningJourneyViaRpc;

/* TONI V44 – Lernreise speichern: RPC-Schema-Cache-Fix + Fallback */

async function toniV44SaveLearningJourneyRobust(){
  if(typeof canManageLearningJourneysV16 === "function" && !canManageLearningJourneysV16()){
    alert("Nur Admins und Tutoren können Lernreisen speichern.");
    return;
  }

  try{
    if(typeof syncJourneyBuilderToLegacyTextareaV17 === "function"){
      syncJourneyBuilderToLegacyTextareaV17();
    }

    if(typeof window.TONI_JOURNEY_BUILDER_STATIONS !== "undefined" &&
       Array.isArray(window.TONI_JOURNEY_BUILDER_STATIONS) &&
       window.TONI_JOURNEY_BUILDER_STATIONS.length === 0){
      alert("Bitte füge mindestens eine Station zur Lernreise hinzu.");
      return;
    }

    const editId = document.getElementById("journey-edit-id")?.value || "";
    const journey = buildJourneyFromFormV16(editId || null);
    const ownerId = typeof getJourneyOwnerIdV16 === "function" ? getJourneyOwnerIdV16() : null;

    const rowData = {
      id: editId || journey.id,
      owner_profile_id: ownerId,
      title: journey.title,
      subject: journey.subject || "",
      goal: journey.goal || "",
      description: journey.description || "",
      journey_json: journey,
      updated_at: new Date().toISOString()
    };

    if(typeof supabaseRequest === "function"){
      let saved = false;
      let rpcError = null;

      // Neuer RPC mit nur einem JSONB-Parameter. Das ist stabiler für den PostgREST-Schema-Cache.
      try{
        await supabaseRequest("rpc/upsert_learning_journey_template_v44", {
          method: "POST",
          body: JSON.stringify({
            p_payload: {
              id: rowData.id,
              title: rowData.title,
              subject: rowData.subject,
              goal: rowData.goal,
              description: rowData.description,
              journey_json: rowData.journey_json
            }
          })
        });
        saved = true;
      }catch(error){
        rpcError = error;
        console.warn("TONI V44 RPC nicht verfügbar, versuche direkten Tabellenzugriff:", error);
      }

      // Fallback: direkter Tabellenzugriff. Funktioniert, wenn die RLS-Policy korrekt ist.
      if(!saved){
        if(editId){
          await supabaseRequest(`learning_journey_templates?id=eq.${encodeURIComponent(editId)}`, {
            method: "PATCH",
            headers: {"Prefer":"return=representation"},
            body: JSON.stringify({
              title: rowData.title,
              subject: rowData.subject,
              goal: rowData.goal,
              description: rowData.description,
              journey_json: rowData.journey_json,
              updated_at: rowData.updated_at
            })
          });
        }else{
          if(!ownerId){
            throw new Error("Kein angemeldetes Profil gefunden. Bitte melde dich erneut an.");
          }

          await supabaseRequest("learning_journey_templates", {
            method: "POST",
            headers: {"Prefer":"return=representation"},
            body: JSON.stringify([rowData])
          });
        }
      }
    }else{
      // Offline-/Fallback-Modus lokal
      const rows = typeof getLocalJourneysV16 === "function" ? getLocalJourneysV16() : [];
      const row = {...rowData, _source:"local", created_at:new Date().toISOString()};
      const idx = rows.findIndex(r => String(r.id) === String(row.id));
      if(idx >= 0) rows[idx] = row;
      else rows.unshift(row);
      setLocalJourneysV16?.(rows);
    }

    resetJourneyEditor?.();
    await loadAdminLearningJourneys?.();
    await loadJourneyAssignmentTable?.();

    appendMsg?.("toni", "✅ Lernreise wurde gespeichert.", typeof time === "function" ? time() : "", "desktop");
  }catch(error){
    console.error("TONI V44 Lernreise speichern:", error);
    alert("Lernreise konnte nicht gespeichert werden:\n" + (error.message || error));
  }
}

// Final überschreiben, damit ältere V43-Funktion nicht mehr greift.
window.saveAdminLearningJourney = toniV44SaveLearningJourneyRobust;

/* TONI V45 – Mobile Breitenkorrektur und Kopfbereich stabilisieren */
function toniV45IsMobile(){return window.matchMedia('(max-width: 700px)').matches;}
function toniV45ClampToViewport(){
  if(!toniV45IsMobile())return;
  const vw=window.innerWidth||document.documentElement.clientWidth;
  document.querySelectorAll('body *').forEach(el=>{
    const style=getComputedStyle(el);
    if(style.position==='fixed')return;
    if(el.classList.contains('lernreise')||el.closest('.lernreise-wrap'))return;
    const rect=el.getBoundingClientRect();
    if(rect.width>vw+4){el.style.maxWidth='100%';el.style.minWidth='0';if(style.display==='grid'||style.display==='flex')el.style.overflowX='hidden';}
  });
  document.querySelectorAll('.lernreise-wrap').forEach(wrap=>{wrap.style.maxWidth='100%';wrap.style.overflowX='auto';wrap.style.overflowY='hidden';});
  document.querySelectorAll('.topbar,.header,.app-header,.dashboard-header').forEach(header=>{header.style.maxWidth='100vw';header.style.width='100vw';header.style.overflow='visible';});
}
function toniV45AfterRender(){setTimeout(toniV45ClampToViewport,50);setTimeout(toniV45ClampToViewport,250);}
['syncJourneyToDashboard','updateLearningJourneyBar','renderLearningJourneyModal','loadJourneyAssignmentTable','applyRoleUI'].forEach(fnName=>{if(typeof window[fnName]==='function'){const original=window[fnName];window[fnName]=function(...args){const result=original.apply(this,args);toniV45AfterRender();return result;};}});
window.addEventListener('resize',()=>{clearTimeout(window.TONI_V45_RESIZE_TIMER);window.TONI_V45_RESIZE_TIMER=setTimeout(toniV45ClampToViewport,120);});
window.addEventListener('orientationchange',()=>{setTimeout(toniV45ClampToViewport,250);setTimeout(toniV45ClampToViewport,700);});
window.addEventListener('DOMContentLoaded',()=>{setTimeout(toniV45ClampToViewport,250);setTimeout(toniV45ClampToViewport,1000);setTimeout(toniV45ClampToViewport,2500);});

/* TONI V46 – Kopfbereich nach jedem Login/Logout mobil neu ausrichten */

function toniV46FixMobileHeader(){
  if(!window.matchMedia("(max-width:700px)").matches) return;

  const topbar = document.querySelector(".topbar");
  if(!topbar) return;

  topbar.style.height = "auto";
  topbar.style.minHeight = "0";
  topbar.style.overflow = "visible";

  const icons = document.querySelector(".topbar-icons");
  if(icons){
    icons.style.width = "100%";
    icons.style.maxWidth = "100%";
  }

  const auth = document.getElementById("auth-status");
  if(auth){
    auth.style.position = "static";
    auth.style.maxWidth = "100%";
  }

  const stats = document.querySelector(".stats-bar");
  if(stats){
    stats.style.marginTop = "0";
  }
}

["applyRoleUI","toniV10ShowAdminDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","toniV32RefreshTopAvatar","toniV33RefreshAfterAuthChange"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV46FixMobileHeader, 80);
      setTimeout(toniV46FixMobileHeader, 350);
      return result;
    };
  }
});

window.addEventListener("resize", () => {
  clearTimeout(window.TONI_V46_HEADER_TIMER);
  window.TONI_V46_HEADER_TIMER = setTimeout(toniV46FixMobileHeader, 120);
});

window.addEventListener("orientationchange", () => {
  setTimeout(toniV46FixMobileHeader, 250);
  setTimeout(toniV46FixMobileHeader, 700);
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV46FixMobileHeader, 250);
  setTimeout(toniV46FixMobileHeader, 1000);
  setTimeout(toniV46FixMobileHeader, 2500);
});

/* TONI V47 – Modernes Design für Lernreise-Editor aktivieren */

function toniV47IconizeFormGroups(){
  const iconMap = {
    "journey-title":"▤",
    "journey-subject":"▣",
    "journey-goal":"◎",
    "journey-description":"☷",
    "journey-cover-upload":"▧",
    "station-title":"⚑",
    "station-subtitle":"☷",
    "station-description":"☰",
    "task-type":"▾",
    "task-title":"✎",
    "task-description":"☷"
  };

  Object.entries(iconMap).forEach(([id, icon]) => {
    const field = document.getElementById(id);
    const group = field?.closest(".lr-form-group");
    if(group){
      group.dataset.v47Icon = icon;
    }
  });
}

function toniV47BuildModernJourneyEditor(){
  const panel = document.getElementById("journey-admin-panel");
  const aside = panel?.querySelector(".journey-admin-grid > aside.journey-admin-card");
  if(!aside) return;

  if(aside.dataset.v47ModernEditor === "1"){
    toniV47IconizeFormGroups();
    return;
  }

  aside.dataset.v47ModernEditor = "1";

  const title = document.getElementById("journey-editor-title");
  const hidden = document.getElementById("journey-edit-id");

  const basicsCard = document.createElement("div");
  basicsCard.className = "toni-v47-basics-card";

  const heading = document.createElement("div");
  heading.className = "toni-v47-editor-heading";
  heading.innerHTML = `
    <div class="toni-v47-editor-icon">📘</div>
    <div class="toni-v47-editor-title-wrap"></div>
  `;

  const titleWrap = heading.querySelector(".toni-v47-editor-title-wrap");
  if(title) titleWrap.appendChild(title);

  const subtitle = document.createElement("div");
  subtitle.className = "toni-v47-editor-subtitle";
  subtitle.textContent = "Erstelle eine neue Lernreise und definiere Ziele sowie Inhalte.";
  titleWrap.appendChild(subtitle);

  basicsCard.appendChild(heading);
  if(hidden) basicsCard.appendChild(hidden);

  ["journey-title","journey-subject","journey-goal","journey-description","journey-cover-upload"].forEach(id => {
    const field = document.getElementById(id);
    const group = field?.closest(".lr-form-group");
    if(group) basicsCard.appendChild(group);
  });

  const stationsCard = document.createElement("div");
  stationsCard.className = "toni-v47-stations-card";

  const stationsTitle = document.createElement("h3");
  stationsTitle.className = "toni-v47-stations-title";
  stationsTitle.textContent = "Stationen und Aufgaben";
  stationsCard.appendChild(stationsTitle);

  const builderField = document.getElementById("journey-builder-field");
  if(builderField) stationsCard.appendChild(builderField);

  const legacyStructure = document.getElementById("journey-structure")?.closest(".lr-form-group");
  if(legacyStructure) stationsCard.appendChild(legacyStructure);

  const toolbar = aside.querySelector(".journey-editor-toolbar");
  if(toolbar){
    const saveBtn = toolbar.querySelector(".lr-primary-btn");
    if(saveBtn) saveBtn.textContent = "✓ Lernreise speichern";
    stationsCard.appendChild(toolbar);
  }

  const help = aside.querySelector(".journey-editor-help");
  if(help) stationsCard.appendChild(help);

  aside.prepend(stationsCard);
  aside.prepend(basicsCard);

  // Buttontexte im Stationsbereich moderner machen, ohne Funktionen zu ändern
  const addTaskBtn = [...aside.querySelectorAll("button")].find(btn => (btn.textContent || "").includes("Aufgabe hinzufügen"));
  if(addTaskBtn) addTaskBtn.textContent = "+ Aufgabe hinzufügen";

  const addStationBtn = [...aside.querySelectorAll("button")].find(btn => (btn.textContent || "").includes("Station zur Lernreise hinzufügen"));
  if(addStationBtn) addStationBtn.textContent = "✓ Station speichern";

  const clearTaskBtn = [...aside.querySelectorAll("button")].find(btn => (btn.textContent || "").includes("Aufgabenfelder leeren"));
  if(clearTaskBtn) clearTaskBtn.textContent = "Felder leeren";

  const clearStationBtn = [...aside.querySelectorAll("button")].find(btn => (btn.textContent || "").includes("Stationsfelder leeren"));
  if(clearStationBtn) clearStationBtn.textContent = "Station leeren";

  toniV47IconizeFormGroups();
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV47BuildModernJourneyEditor, 200);
  setTimeout(toniV47BuildModernJourneyEditor, 1000);
  setTimeout(toniV47BuildModernJourneyEditor, 2500);
});

["showJourneyAdminPanelIfAllowedV16","loadAdminLearningJourneys","resetJourneyEditor"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV47BuildModernJourneyEditor, 80);
      return result;
    };
  }
});

/* TONI V48 – Statistikleiste in die Kopfzeile verschieben */

function toniV48MoveStatsIntoTopbar(){
  const topbar = document.querySelector(".topbar");
  const goal = document.querySelector(".topbar-goal");
  const week = document.querySelector(".topbar-week");
  const stats = document.querySelector(".stats-bar");

  if(!topbar || !goal || !week || !stats) return;

  stats.classList.add("topbar-stats-v48");

  // Genau zwischen „Dein aktuelles Ziel“ und „KW 20“ einfügen.
  if(stats.parentElement !== topbar || stats.nextElementSibling !== week){
    topbar.insertBefore(stats, week);
  }
}

// Nach jeder möglichen UI-Aktualisierung erneut sicherstellen.
["applyRoleUI","syncJourneyToDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV48MoveStatsIntoTopbar, 60);
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV48MoveStatsIntoTopbar, 50);
  setTimeout(toniV48MoveStatsIntoTopbar, 500);
  setTimeout(toniV48MoveStatsIntoTopbar, 1500);
});

/* TONI V49 – Elemente der Kopfzeile in links / mitte / rechts gruppieren */
function toniV49ArrangeTopbar(){
  const topbar = document.querySelector('.topbar');
  const logo = topbar?.querySelector('.toni-logo');
  const divider = topbar?.querySelector('.topbar-divider');
  const greeting = topbar?.querySelector('.topbar-greeting');
  const goal = topbar?.querySelector('.topbar-goal');
  const week = topbar?.querySelector('.topbar-week');
  const icons = topbar?.querySelector('.topbar-icons');
  const stats = document.querySelector('.stats-bar');
  if(!topbar || !logo || !greeting || !goal || !week || !icons || !stats) return;

  let left = topbar.querySelector('.topbar-left-group');
  let center = topbar.querySelector('.topbar-center-group');
  let right = topbar.querySelector('.topbar-right-group');

  if(!left){
    left = document.createElement('div');
    left.className = 'topbar-left-group';
    topbar.appendChild(left);
  }
  if(!center){
    center = document.createElement('div');
    center.className = 'topbar-center-group';
    topbar.appendChild(center);
  }
  if(!right){
    right = document.createElement('div');
    right.className = 'topbar-right-group';
    topbar.appendChild(right);
  }

  if(logo.parentElement !== left) left.appendChild(logo);
  if(divider && divider.parentElement !== left) left.appendChild(divider);
  if(greeting.parentElement !== left) left.appendChild(greeting);

  if(goal.parentElement !== center) center.appendChild(goal);
  if(stats.parentElement !== center) center.appendChild(stats);

  if(week.parentElement !== right) right.appendChild(week);
  if(icons.parentElement !== right) right.appendChild(icons);

  if(topbar.firstElementChild !== left) topbar.prepend(left);
  if(left.nextElementSibling !== center) topbar.insertBefore(center, left.nextElementSibling);
  if(center.nextElementSibling !== right) topbar.insertBefore(right, center.nextElementSibling);
}

['applyRoleUI','syncJourneyToDashboard','toniV12ApplyDashboard','toniV14ApplyCompletedProfile'].forEach(fnName => {
  if(typeof window[fnName] === 'function'){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV49ArrangeTopbar, 30);
      return result;
    };
  }
});

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(toniV49ArrangeTopbar, 50);
  setTimeout(toniV49ArrangeTopbar, 500);
  setTimeout(toniV49ArrangeTopbar, 1200);
});

/* TONI V50 – Im Bereich „Aktive Projekte/Aktivitäten“ alle Lernreisen anzeigen */

window.TONI_V50_ACTIVITY_RENDERING = false;
window.TONI_V50_ACTIVITY_CACHE = window.TONI_V50_ACTIVITY_CACHE || [];

function toniV50Escape(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function toniV50Role(){
  return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) || localStorage.getItem("toni_role") || "student";
}

function toniV50NormalizeTemplate(template){
  if(typeof normalizeTemplateToJourneyV20 === "function"){
    try{return normalizeTemplateToJourneyV20(template);}
    catch{}
  }

  const j = template?.journey_json || template || {};
  return {
    id: template?.id || j.id,
    title: template?.title || j.title || "Lernreise",
    subject: template?.subject || j.subject || "",
    goal: template?.goal || j.goal || "",
    description: template?.description || j.description || "Individuelle Lernreise mit Aufgaben, Praxisbezug und Reflexion.",
    steps: j.steps || []
  };
}

function toniV50RequiredTasks(journey){
  if(!journey?.steps) return [];
  return journey.steps.flatMap(step => (step.tasks || []).filter(task => task.required !== false));
}

function toniV50Progress(journey){
  try{
    if(typeof journeyProgress === "function") return journeyProgress(journey);
  }catch{}

  const required = toniV50RequiredTasks(journey);
  if(!required.length) return 0;
  return Math.round(required.filter(t => t.status === "done").length / required.length * 100);
}

function toniV50NextTaskTitle(journey){
  const tasks = (journey?.steps || []).flatMap(step => (step.tasks || []).map(task => ({...task, stepTitle: step.title})));
  const next = tasks.find(t => t.status === "todo" && t.required !== false) ||
               tasks.find(t => t.status === "in_progress") ||
               tasks.find(t => t.status === "todo");

  if(next) return next.title;

  return toniV50Progress(journey) >= 100 ? "Lernreise abgeschlossen" : "Lernreise öffnen";
}

function toniV50FindActivityCard(){
  const cards = [...document.querySelectorAll(".card")];
  return cards.find(card => {
    const title = card.querySelector(".card-title")?.textContent || "";
    return title.includes("Aktive Projekte") || title.includes("Aktivitäten");
  }) || null;
}

function toniV50EnsureActivityContainer(){
  const card = toniV50FindActivityCard();
  if(!card) return null;

  // Statische alte Lernreise-Einträge entfernen, damit nicht nur eine Beispiel-Lernreise sichtbar bleibt.
  [...card.querySelectorAll(".projekt-item")].forEach(item => {
    const name = item.querySelector(".projekt-name")?.textContent || "";
    if(name.includes("Lernreise")){
      item.remove();
    }
  });

  let container = document.getElementById("activity-learning-journeys-v50");
  if(!container){
    container = document.createElement("div");
    container.id = "activity-learning-journeys-v50";
    card.appendChild(container);
  }

  return container;
}

async function toniV50LoadStudentAssignedJourneys(){
  if(typeof loadAssignedJourneysForStudentV20 !== "function") return [];

  try{
    const rows = await loadAssignedJourneysForStudentV20();
    const journeys = rows
      .map(row => row.journey_template || row.learning_journey_templates || row)
      .filter(Boolean)
      .map(toniV50NormalizeTemplate);

    // Lernstände aus V40 direkt auf die Lernreisen anwenden, wenn verfügbar.
    if(typeof supabaseRequest === "function" && typeof toniV40ApplyProgressToJourney === "function"){
      try{
        const progressRows = await supabaseRequest("rpc/get_my_learning_journey_progress_all", {
          method:"POST",
          body:JSON.stringify({})
        });

        const progressByJourney = new Map((progressRows || []).map(row => [
          String(row.learning_journey_template_id),
          row.progress_json
        ]));

        return journeys.map(journey => {
          const progress = progressByJourney.get(String(journey.id));
          return progress ? toniV40ApplyProgressToJourney(journey, progress) : journey;
        });
      }catch(error){
        console.warn("TONI V50: Lernstände für Aktivitäten konnten nicht geladen werden:", error);
      }
    }

    return journeys;
  }catch(error){
    console.warn("TONI V50: Zugeordnete Lernreisen konnten nicht geladen werden:", error);
    return [];
  }
}

async function toniV50LoadAdminJourneys(){
  if(!(toniV50Role() === "admin" || toniV50Role() === "tutor")) return [];

  try{
    if(typeof loadJourneyTemplatesForAssignmentsV18 === "function"){
      const rows = await loadJourneyTemplatesForAssignmentsV18();
      return (rows || []).map(toniV50NormalizeTemplate);
    }

    if(typeof getLocalJourneysV16 === "function"){
      return getLocalJourneysV16().map(toniV50NormalizeTemplate);
    }
  }catch(error){
    console.warn("TONI V50: Admin-Lernreisen konnten nicht geladen werden:", error);
  }

  return [];
}

function toniV50StateJourneys(){
  try{
    if(typeof ensureLearningState === "function") ensureLearningState();
  }catch{}

  if(typeof STATE !== "undefined" && Array.isArray(STATE.learningJourneys)){
    return STATE.learningJourneys;
  }

  return [];
}

function toniV50DeduplicateJourneys(journeys){
  const map = new Map();

  journeys.filter(j => j && j.id).forEach(journey => {
    const key = String(journey.id);
    if(!map.has(key)){
      map.set(key, journey);
      return;
    }

    const existing = map.get(key);
    const existingPct = toniV50Progress(existing);
    const newPct = toniV50Progress(journey);

    // Version mit höherem/gespeichertem Fortschritt bevorzugen.
    if(newPct > existingPct || ((journey.steps || []).length > (existing.steps || []).length && existingPct === 0)){
      map.set(key, journey);
    }
  });

  return [...map.values()];
}

async function toniV50GetAllActivityJourneys(){
  const stateJourneys = toniV50StateJourneys();
  const assignedJourneys = await toniV50LoadStudentAssignedJourneys();
  const adminJourneys = await toniV50LoadAdminJourneys();

  const all = toniV50DeduplicateJourneys([
    ...stateJourneys,
    ...assignedJourneys,
    ...adminJourneys
  ]);

  // Aktive Lernreise zuerst anzeigen, danach alphabetisch.
  const activeId = typeof STATE !== "undefined" ? STATE.activeJourneyId : null;

  return all.sort((a,b) => {
    if(String(a.id) === String(activeId)) return -1;
    if(String(b.id) === String(activeId)) return 1;
    return String(a.title || "").localeCompare(String(b.title || ""), "de");
  });
}

function toniV50ActivityJourneyHtml(journey){
  const pct = toniV50Progress(journey);
  const active = typeof STATE !== "undefined" && String(STATE.activeJourneyId) === String(journey.id);
  const fillClass = pct >= 100 ? "p-green" : "p-blue";
  const subject = journey.subject || "Lernreise";
  const goal = journey.goal || journey.description || "Individuelle Lernreise mit Aufgaben, Praxisbezug und Reflexion.";
  const next = toniV50NextTaskTitle(journey);

  return `
    <div class="projekt-item activity-journey-item-v50 ${active ? "active" : ""}" onclick="toniV50OpenActivityJourney('${toniV50Escape(journey.id)}')">
      <div class="projekt-row">
        <div class="projekt-name">
          ⚡ ${toniV50Escape(journey.title || "Lernreise")}
          ${active ? '<span class="activity-journey-badge-v50">aktiv</span>' : ''}
        </div>
        <div class="projekt-pct">${pct}%</div>
      </div>
      <div class="projekt-desc">${toniV50Escape(subject)} · ${toniV50Escape(goal)}</div>
      <div class="projekt-track-wrap"><div class="projekt-fill ${fillClass}" style="width:${pct}%"></div></div>
      <div class="projekt-next">Nächster Schritt: ${toniV50Escape(next)} →</div>
    </div>
  `;
}

async function toniV50RenderAllJourneysInActivities(){
  if(window.TONI_V50_ACTIVITY_RENDERING) return;
  window.TONI_V50_ACTIVITY_RENDERING = true;

  try{
    const container = toniV50EnsureActivityContainer();
    if(!container) return;

    container.innerHTML = `<div class="activity-empty-v50">Lernreisen werden geladen …</div>`;

    const journeys = await toniV50GetAllActivityJourneys();
    window.TONI_V50_ACTIVITY_CACHE = journeys;

    if(!journeys.length){
      container.innerHTML = `<div class="activity-empty-v50">Noch keine Lernreisen vorhanden oder zugeordnet.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="activity-learning-heading-v50">
        Lernreisen <span class="activity-journey-count-v50">(${journeys.length})</span>
      </div>
      ${journeys.map(toniV50ActivityJourneyHtml).join("")}
    `;
  }finally{
    window.TONI_V50_ACTIVITY_RENDERING = false;
  }
}

window.toniV50OpenActivityJourney = async function(journeyId){
  const journey = (window.TONI_V50_ACTIVITY_CACHE || []).find(j => String(j.id) === String(journeyId));
  if(!journey) return;

  try{
    if(typeof ensureLearningState === "function") ensureLearningState();

    if(typeof STATE !== "undefined"){
      STATE.learningJourneys = STATE.learningJourneys || [];
      const pos = STATE.learningJourneys.findIndex(j => String(j.id) === String(journey.id));
      if(pos >= 0) STATE.learningJourneys[pos] = journey;
      else STATE.learningJourneys.push(journey);

      STATE.activeJourneyId = journey.id;
      saveState?.(STATE);
    }

    if(typeof toniV40ApplyProgressForActiveJourney === "function"){
      await toniV40ApplyProgressForActiveJourney();
    }

    syncJourneyToDashboard?.();

    if(typeof renderLearningJourneyModal === "function"){
      renderLearningJourneyModal();
      document.getElementById("lr-modal")?.classList.add("open");
    }

    setTimeout(toniV50RenderAllJourneysInActivities, 250);
  }catch(error){
    console.error("TONI V50: Lernreise aus Aktivitäten öffnen:", error);
    alert("Lernreise konnte nicht geöffnet werden:\\n" + (error.message || error));
  }
};

// Bestehende Dashboard-Aktualisierung erweitern.
if(typeof window.syncJourneyToDashboard === "function"){
  const TONI_V50_ORIGINAL_SYNC = window.syncJourneyToDashboard;
  window.syncJourneyToDashboard = function(...args){
    const result = TONI_V50_ORIGINAL_SYNC.apply(this, args);
    setTimeout(toniV50RenderAllJourneysInActivities, 120);
    return result;
  };
}

["applyRoleUI","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","startAssignedJourneyV20","assignJourneyFromCodeV20","loadAdminLearningJourneys"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      Promise.resolve(result).finally(() => {
        setTimeout(toniV50RenderAllJourneysInActivities, 300);
      });
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV50RenderAllJourneysInActivities, 500);
  setTimeout(toniV50RenderAllJourneysInActivities, 1600);
  setTimeout(toniV50RenderAllJourneysInActivities, 3200);
});

/* TONI V51 – Aktivitäten: nur zugeordnete, noch nicht abgeschlossene Lernreisen anzeigen */

async function toniV51LoadAssignedUnfinishedJourneysForStudent(){
  if(typeof loadAssignedJourneysForStudentV20 !== "function") return [];

  try{
    const rows = await loadAssignedJourneysForStudentV20();

    let journeys = rows
      .map(row => row.journey_template || row.learning_journey_templates || row)
      .filter(Boolean)
      .map(template => typeof toniV50NormalizeTemplate === "function"
        ? toniV50NormalizeTemplate(template)
        : {
            id: template.id,
            title: template.title || template.journey_json?.title || "Lernreise",
            subject: template.subject || template.journey_json?.subject || "",
            goal: template.goal || template.journey_json?.goal || "",
            description: template.description || template.journey_json?.description || "",
            steps: template.journey_json?.steps || []
          });

    // Gespeicherten Lernstand anwenden.
    if(typeof supabaseRequest === "function" && typeof toniV40ApplyProgressToJourney === "function"){
      try{
        const progressRows = await supabaseRequest("rpc/get_my_learning_journey_progress_all", {
          method:"POST",
          body:JSON.stringify({})
        });

        const progressByJourney = new Map((progressRows || []).map(row => [
          String(row.learning_journey_template_id),
          row.progress_json
        ]));

        journeys = journeys.map(journey => {
          const progress = progressByJourney.get(String(journey.id));
          return progress ? toniV40ApplyProgressToJourney(journey, progress) : journey;
        });
      }catch(error){
        console.warn("TONI V51: Lernstände konnten nicht geladen werden:", error);
      }
    }

    return journeys.filter(journey => {
      const pct = typeof toniV50Progress === "function" ? toniV50Progress(journey) : 0;
      return pct < 100;
    });
  }catch(error){
    console.warn("TONI V51: Zugeordnete offene Lernreisen konnten nicht geladen werden:", error);
    return [];
  }
}

async function toniV51LoadAssignedUnfinishedJourneysForAdmin(){
  // Admin/Tutor: nur Lernreisen anzeigen, die mindestens einem Studenten zugeordnet sind
  // und für mindestens einen Studenten noch nicht 100% erreicht haben.
  if(!(toniV50Role?.() === "admin" || toniV50Role?.() === "tutor")) return [];

  try{
    if(typeof toniV41LoadAssignmentsWithProgress !== "function"){
      return [];
    }

    const assignments = await toniV41LoadAssignmentsWithProgress();
    const unfinishedAssignments = (assignments || []).filter(a => Number(a.progress_percent || 0) < 100);

    if(!unfinishedAssignments.length) return [];

    const templates = typeof loadJourneyTemplatesForAssignmentsV18 === "function"
      ? await loadJourneyTemplatesForAssignmentsV18()
      : [];

    const neededIds = new Set(unfinishedAssignments.map(a => String(a.learning_journey_template_id)));

    return templates
      .filter(t => neededIds.has(String(t.id)))
      .map(t => typeof toniV50NormalizeTemplate === "function" ? toniV50NormalizeTemplate(t) : t)
      .filter(j => j && j.id);
  }catch(error){
    console.warn("TONI V51: Offene zugeordnete Lernreisen für Admin/Tutor konnten nicht geladen werden:", error);
    return [];
  }
}

// V50-Funktion gezielt ersetzen.
window.toniV50GetAllActivityJourneys = async function(){
  const role = typeof toniV50Role === "function" ? toniV50Role() : "student";

  let journeys = [];

  if(role === "student"){
    journeys = await toniV51LoadAssignedUnfinishedJourneysForStudent();
  }else{
    journeys = await toniV51LoadAssignedUnfinishedJourneysForAdmin();
  }

  if(typeof toniV50DeduplicateJourneys === "function"){
    journeys = toniV50DeduplicateJourneys(journeys);
  }

  const activeId = typeof STATE !== "undefined" ? STATE.activeJourneyId : null;

  return journeys.sort((a,b) => {
    if(String(a.id) === String(activeId)) return -1;
    if(String(b.id) === String(activeId)) return 1;
    return String(a.title || "").localeCompare(String(b.title || ""), "de");
  });
};

// Rendering leicht anpassen: leere Meldung klarer formulieren.
const TONI_V51_ORIGINAL_RENDER_ACTIVITIES = window.toniV50RenderAllJourneysInActivities;
window.toniV50RenderAllJourneysInActivities = async function(){
  if(window.TONI_V50_ACTIVITY_RENDERING) return;
  window.TONI_V50_ACTIVITY_RENDERING = true;

  try{
    const container = toniV50EnsureActivityContainer?.();
    if(!container) return;

    container.innerHTML = `<div class="activity-empty-v50">Zugeordnete offene Lernreisen werden geladen …</div>`;

    const journeys = await window.toniV50GetAllActivityJourneys();
    window.TONI_V50_ACTIVITY_CACHE = journeys;

    if(!journeys.length){
      container.innerHTML = `<div class="activity-empty-v50">Keine offenen zugeordneten Lernreisen vorhanden. Abgeschlossene Lernreisen mit 100% werden hier ausgeblendet.</div>`;
      return;
    }

    container.innerHTML = `
      <div class="activity-learning-heading-v50">
        Offene zugeordnete Lernreisen <span class="activity-journey-count-v50">(${journeys.length})</span>
      </div>
      ${journeys.map(toniV50ActivityJourneyHtml).join("")}
    `;
  }finally{
    window.TONI_V50_ACTIVITY_RENDERING = false;
  }
};

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => window.toniV50RenderAllJourneysInActivities?.(), 600);
  setTimeout(() => window.toniV50RenderAllJourneysInActivities?.(), 1800);
  setTimeout(() => window.toniV50RenderAllJourneysInActivities?.(), 3500);
});

/* TONI V52 – Reihenfolge:
   1. Aktive Projekte + Zusammenarbeit
   2. Wochenplanung über ganze Breite
   3. Aktive Lernreise mit Verlaufskreisen und Buttons
   „Mein Lernfortschritt“ wird ausgeblendet.
*/

function toniV52FindCardByTitle(titlePart){
  return [...document.querySelectorAll(".card")].find(card => {
    const title = card.querySelector(".card-title")?.textContent || "";
    return title.includes(titlePart);
  }) || null;
}

function toniV52ReorderDashboard(){
  const leftPanel = document.querySelector(".left-panel");
  if(!leftPanel) return;

  leftPanel.classList.add("v52-dashboard-order");

  const learningJourneyCard =
    [...leftPanel.querySelectorAll(".card")].find(card => card.querySelector(".lernreise-wrap")) ||
    toniV52FindCardByTitle("Deine Lernreise") ||
    toniV52FindCardByTitle("Lernreisen");

  const progressCard = toniV52FindCardByTitle("Mein Lernfortschritt");

  const kanbanCard =
    toniV52FindCardByTitle("Wochenplanung") ||
    [...document.querySelectorAll(".card")].find(card => card.querySelector(".kanban-outer"));

  const projectsRow = leftPanel.querySelector(".bottom-grid");

  // 1. Zeile: Aktive Projekte + Zusammenarbeit
  if(projectsRow){
    projectsRow.classList.add("v52-projects-row");
    if(projectsRow.parentElement !== leftPanel){
      leftPanel.appendChild(projectsRow);
    }
    leftPanel.insertBefore(projectsRow, leftPanel.firstElementChild);
  }

  // Mein Lernfortschritt entfällt
  if(progressCard){
    progressCard.classList.add("v52-progress-hidden");
  }

  // Kanban aus main-grid herauslösen und als eigene volle Zeile einfügen
  if(kanbanCard){
    kanbanCard.classList.add("v52-kanban-row");

    if(kanbanCard.parentElement !== leftPanel){
      if(projectsRow && projectsRow.nextElementSibling){
        leftPanel.insertBefore(kanbanCard, projectsRow.nextElementSibling);
      }else if(projectsRow){
        leftPanel.appendChild(kanbanCard);
      }else{
        leftPanel.insertBefore(kanbanCard, leftPanel.firstElementChild);
      }
    }else if(projectsRow && kanbanCard.previousElementSibling !== projectsRow){
      leftPanel.insertBefore(kanbanCard, projectsRow.nextElementSibling);
    }
  }

  // Leere main-grid ausblenden, wenn nur noch der entfernte Fortschritt darin liegt
  const mainGrid = leftPanel.querySelector(".main-grid");
  if(mainGrid){
    mainGrid.classList.add("v52-empty-main-grid");
  }

  // 3. Zeile: aktive Lernreise nach Kanban
  if(learningJourneyCard){
    learningJourneyCard.classList.add("v52-learning-journey-row");

    if(learningJourneyCard.parentElement !== leftPanel){
      leftPanel.appendChild(learningJourneyCard);
    }

    if(kanbanCard && kanbanCard.parentElement === leftPanel && learningJourneyCard.previousElementSibling !== kanbanCard){
      leftPanel.insertBefore(learningJourneyCard, kanbanCard.nextElementSibling);
    }else if(!kanbanCard && projectsRow && learningJourneyCard.previousElementSibling !== projectsRow){
      leftPanel.insertBefore(learningJourneyCard, projectsRow.nextElementSibling);
    }
  }
}

["syncJourneyToDashboard","updateLearningJourneyBar","applyRoleUI","toniV50RenderAllJourneysInActivities"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV52ReorderDashboard, 80);
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV52ReorderDashboard, 80);
  setTimeout(toniV52ReorderDashboard, 500);
  setTimeout(toniV52ReorderDashboard, 1600);
  setTimeout(toniV52ReorderDashboard, 3200);
});

window.addEventListener("resize", () => {
  clearTimeout(window.TONI_V52_REORDER_TIMER);
  window.TONI_V52_REORDER_TIMER = setTimeout(toniV52ReorderDashboard, 120);
});

/* TONI V53 – Lernreise-Strecke über gesamte Breite, Start- und Zielsymbol */
(function(){
  function toniV53Esc(v){
    return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function toniV53JourneySteps(j){
    if(!j) return [];
    if(Array.isArray(j.steps)) return j.steps;
    if(Array.isArray(j.stations)) return j.stations;
    return [];
  }

  function toniV53CurrentStationIndex(j, steps){
    try {
      if(typeof currentStepIndex === 'function'){
        const idx = currentStepIndex(j);
        if(Number.isFinite(idx)) return Math.max(0, Math.min(steps.length - 1, idx));
      }
    } catch(e) {}
    return 0;
  }

  function toniV53IsJourneyComplete(j){
    try {
      if(typeof journeyProgress === 'function') return Number(journeyProgress()) >= 100;
    } catch(e) {}
    try {
      const steps = toniV53JourneySteps(j);
      return steps.length > 0 && steps.every((s, i) => (typeof stepStatus === 'function' ? stepStatus(s, i, j) : '') === 'done');
    } catch(e) {}
    return false;
  }

  function toniV53BuildJourneyBar(){
    const wrap = document.querySelector('.lernreise-wrap');
    if(!wrap || typeof activeJourney !== 'function') return;

    const j = activeJourney();
    const steps = toniV53JourneySteps(j);
    if(!steps.length) return;

    const totalNodes = steps.length + 2; // Start + Stationen + Ziel
    const currentIdx = toniV53CurrentStationIndex(j, steps);
    const isComplete = toniV53IsJourneyComplete(j);
    const fillPct = isComplete ? 100 : Math.max(0, Math.min(100, ((currentIdx + 1) / (steps.length + 1)) * 100));

    const startHtml = `
      <div class="step v53-icon-step v53-start-step">
        <div class="step-circle">▶</div>
        <div class="step-label">Start</div>
        <div class="step-sublabel">Beginn</div>
      </div>`;

    const stepsHtml = steps.map((s, i) => {
      let st = 'locked';
      try {
        st = typeof stepStatus === 'function' ? stepStatus(s, i, j) : 'locked';
      } catch(e) {}

      let circleClass = 'locked';
      let circleContent = String(i + 1);
      if(st === 'done'){
        circleClass = 'done';
        circleContent = '✓';
      } else if(st === 'current'){
        circleClass = 'current';
        circleContent = String(i + 1);
      }

      const title = toniV53Esc(s.title || `Station ${i+1}`);
      const subtitle = toniV53Esc(s.subtitle || s.type || '');
      const currentBadge = st === 'current' ? '<div class="step-badge">Du bist hier</div>' : '';

      return `
        <div class="step">
          <div class="step-circle ${circleClass}">${circleContent}</div>
          <div class="step-label ${st === 'current' ? 'cur' : ''}">${title}</div>
          <div class="step-sublabel">${subtitle}</div>
          ${currentBadge}
        </div>`;
    }).join('');

    const goalHtml = `
      <div class="step v53-icon-step v53-goal-step ${isComplete ? 'done' : ''}">
        <div class="step-circle">🏁</div>
        <div class="step-label">Ziel</div>
        <div class="step-sublabel">Abschluss</div>
      </div>`;

    wrap.innerHTML = `
      <div class="v53-journey-shell" style="--v53-total:${totalNodes}">
        <div class="lr-line"></div>
        <div class="lr-fill" style="width:${fillPct}%"></div>
        <div class="lernreise v53-journey-grid">
          ${startHtml}
          ${stepsHtml}
          ${goalHtml}
        </div>
      </div>`;
  }

  const originalUpdate = window.updateLearningJourneyBar;
  window.updateLearningJourneyBar = function(){
    if(typeof originalUpdate === 'function'){
      try { originalUpdate.apply(this, arguments); } catch(e) {}
    }
    toniV53BuildJourneyBar();
    if (typeof window.toniV24UpdateHeaderNow === 'function') {
      window.toniV24UpdateHeaderNow();
    }
  };

  ['syncJourneyToDashboard','renderLearningJourneyModal','applyRoleUI'].forEach(fnName => {
    if(typeof window[fnName] === 'function'){
      const original = window[fnName];
      window[fnName] = function(){
        const r = original.apply(this, arguments);
        setTimeout(() => { try { toniV53BuildJourneyBar(); } catch(e) {} }, 60);
        return r;
      };
    }
  });

  window.addEventListener('DOMContentLoaded', () => {
    setTimeout(toniV53BuildJourneyBar, 120);
    setTimeout(toniV53BuildJourneyBar, 700);
    setTimeout(toniV53BuildJourneyBar, 1800);
  });

  window.addEventListener('resize', () => {
    clearTimeout(window.TONI_V53_RESIZE_TIMER);
    window.TONI_V53_RESIZE_TIMER = setTimeout(toniV53BuildJourneyBar, 120);
  });
})();

/* TONI V54 – Journey UI polish */
(function(){
  function toniV54Shorten(text, max){
    const t = String(text || '').trim();
    if(!t) return '';
    if(t.length <= max) return t;
    return t.slice(0, Math.max(0, max - 1)).trimEnd() + '…';
  }

  function toniV54StartSvg(){
    return `
      <svg class="v54-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="10" fill="rgba(34,197,94,.16)"></circle>
        <path d="M10 8.25L16 12L10 15.75V8.25Z" fill="currentColor"></path>
      </svg>`;
  }

  function toniV54GoalSvg(done){
    if(done){
      return `
        <svg class="v54-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M8 4H16V7C16 8.1 16.9 9 18 9H20V11C20 14.3 17.8 17.2 14.7 18.1L12 18.9L9.3 18.1C6.2 17.2 4 14.3 4 11V9H6C7.1 9 8 8.1 8 7V4Z" fill="currentColor" opacity=".18"></path>
          <path d="M8 4H16V7C16 8.1 16.9 9 18 9H20V11C20 14.3 17.8 17.2 14.7 18.1L12 18.9L9.3 18.1C6.2 17.2 4 14.3 4 11V9H6C7.1 9 8 8.1 8 7V4Z" stroke="currentColor" stroke-width="1.5"></path>
          <path d="M9.2 11.9L11.2 13.9L15.2 9.9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path>
        </svg>`;
    }
    return `
      <svg class="v54-icon-svg" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 4V20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
        <path d="M8 5H17L14.5 8L17 11H8V5Z" fill="currentColor" opacity=".18"></path>
        <path d="M8 5H17L14.5 8L17 11H8V5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"></path>
      </svg>`;
  }

  function toniV54EnhanceJourney(){
    const shells = document.querySelectorAll('.v53-journey-shell');
    if(!shells.length) return;
    const mobile = window.innerWidth <= 700;
    const tablet = window.innerWidth <= 1000;
    shells.forEach(shell => {
      shell.classList.add('v54-journey-shell');
      const steps = shell.querySelectorAll('.step');
      if(!steps.length) return;

      steps.forEach((step, idx) => {
        const isStart = idx === 0;
        const isGoal = idx === steps.length - 1;
        const label = step.querySelector('.step-label');
        const sub = step.querySelector('.step-sublabel');
        if(label){
          const full = label.dataset.fullText || label.textContent.trim();
          label.dataset.fullText = full;
          label.title = full;
          label.textContent = toniV54Shorten(full, mobile ? 15 : tablet ? 20 : 28);
        }
        if(sub){
          const fullSub = sub.dataset.fullText || sub.textContent.trim();
          sub.dataset.fullText = fullSub;
          sub.title = fullSub;
          sub.textContent = toniV54Shorten(fullSub, mobile ? 14 : tablet ? 18 : 24);
        }
        const circle = step.querySelector('.step-circle');
        if(circle && isStart){
          circle.innerHTML = toniV54StartSvg();
        }
        if(circle && isGoal){
          circle.innerHTML = toniV54GoalSvg(step.classList.contains('done'));
        }
      });
    });
  }

  let toniV54Timer = null;
  function toniV54Schedule(){
    clearTimeout(toniV54Timer);
    toniV54Timer = setTimeout(toniV54EnhanceJourney, 60);
  }

  document.addEventListener('DOMContentLoaded', () => {
    toniV54Schedule();
    setTimeout(toniV54Schedule, 300);
    setTimeout(toniV54Schedule, 1200);
  });
  window.addEventListener('resize', toniV54Schedule);

  const observer = new MutationObserver(() => toniV54Schedule());
  if(document.body){
    observer.observe(document.body, {childList:true, subtree:true});
  } else {
    window.addEventListener('load', () => observer.observe(document.body, {childList:true, subtree:true}));
  }
})();

/* TONI V83 – Student-Layout: Lernreise oben, offene und abgeschlossene Lernleisten */

(function(){
  window.TONI_V83_COMPLETED_OPEN = localStorage.getItem("toni_v83_completed_open") === "1";

  function role(){
    return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) ||
      localStorage.getItem("toni_role") ||
      "student";
  }

  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function progress(journey){
    try{
      if(typeof toniV50Progress === "function") return Number(toniV50Progress(journey) || 0);
    }catch{}
    try{
      const steps = journey?.steps || [];
      if(!steps.length) return 0;
      const done = steps.filter(s => s.status === "done" || s.done || s.completed).length;
      return Math.round(done / steps.length * 100);
    }catch{}
    return 0;
  }

  function normalizeTemplate(template){
    if(typeof toniV50NormalizeTemplate === "function"){
      return toniV50NormalizeTemplate(template);
    }

    return {
      id: template.id,
      title: template.title || template.journey_json?.title || "Lernreise",
      subject: template.subject || template.journey_json?.subject || "",
      goal: template.goal || template.journey_json?.goal || "",
      description: template.description || template.journey_json?.description || "",
      steps: template.journey_json?.steps || template.steps || []
    };
  }

  async function loadAssignedJourneysWithProgress(){
    if(typeof loadAssignedJourneysForStudentV20 !== "function") return [];

    try{
      const rows = await loadAssignedJourneysForStudentV20();

      let journeys = (rows || [])
        .map(row => row.journey_template || row.learning_journey_templates || row)
        .filter(Boolean)
        .map(normalizeTemplate);

      if(typeof supabaseRequest === "function" && typeof toniV40ApplyProgressToJourney === "function"){
        try{
          const progressRows = await supabaseRequest("rpc/get_my_learning_journey_progress_all", {
            method:"POST",
            body:JSON.stringify({})
          });

          const progressByJourney = new Map((progressRows || []).map(row => [
            String(row.learning_journey_template_id),
            row.progress_json
          ]));

          journeys = journeys.map(journey => {
            const saved = progressByJourney.get(String(journey.id));
            return saved ? toniV40ApplyProgressToJourney(journey, saved) : journey;
          });
        }catch(error){
          console.warn("TONI V83: Lernstände konnten nicht geladen werden:", error);
        }
      }

      if(typeof toniV50DeduplicateJourneys === "function"){
        journeys = toniV50DeduplicateJourneys(journeys);
      }

      return journeys;
    }catch(error){
      console.warn("TONI V83: Zugeordnete Lernreisen konnten nicht geladen werden:", error);
      return [];
    }
  }

  function findLearningJourneyCard(){
    const leftPanel = document.querySelector(".left-panel");
    if(!leftPanel) return null;

    return [...leftPanel.querySelectorAll(".card")]
      .find(card => card.querySelector(".lernreise-wrap")) ||
      [...document.querySelectorAll(".card")]
      .find(card => card.querySelector(".lernreise-wrap")) ||
      null;
  }

  function findProjectsRow(){
    const leftPanel = document.querySelector(".left-panel");
    if(!leftPanel) return null;

    return leftPanel.querySelector(".bottom-grid") ||
      [...document.querySelectorAll(".bottom-grid")]
        .find(row => (row.textContent || "").includes("Aktive Projekte")) ||
      null;
  }

  function findKanbanCard(){
    return [...document.querySelectorAll(".card")]
      .find(card => card.querySelector(".kanban-outer")) || null;
  }

  function reorderStudentDashboard(){
    const leftPanel = document.querySelector(".left-panel");
    if(!leftPanel) return;

    if(role() !== "student"){
      leftPanel.classList.remove("v83-student-order");
      return;
    }

    leftPanel.classList.add("v83-student-order");

    const journeyCard = findLearningJourneyCard();
    const projectsRow = findProjectsRow();
    const kanbanCard = findKanbanCard();

    if(journeyCard){
      journeyCard.classList.add("v52-learning-journey-row", "v83-student-journey-top");

      if(journeyCard.parentElement !== leftPanel){
        leftPanel.insertBefore(journeyCard, leftPanel.firstElementChild);
      }else if(leftPanel.firstElementChild !== journeyCard){
        leftPanel.insertBefore(journeyCard, leftPanel.firstElementChild);
      }
    }

    if(projectsRow){
      projectsRow.classList.add("v52-projects-row");

      if(projectsRow.parentElement !== leftPanel){
        if(journeyCard && journeyCard.parentElement === leftPanel){
          leftPanel.insertBefore(projectsRow, journeyCard.nextElementSibling);
        }else{
          leftPanel.insertBefore(projectsRow, leftPanel.firstElementChild);
        }
      }else if(journeyCard && projectsRow.previousElementSibling !== journeyCard){
        leftPanel.insertBefore(projectsRow, journeyCard.nextElementSibling);
      }
    }

    if(kanbanCard){
      kanbanCard.classList.add("v52-kanban-row");

      if(kanbanCard.parentElement !== leftPanel){
        if(projectsRow && projectsRow.parentElement === leftPanel){
          leftPanel.insertBefore(kanbanCard, projectsRow.nextElementSibling);
        }else if(journeyCard && journeyCard.parentElement === leftPanel){
          leftPanel.insertBefore(kanbanCard, journeyCard.nextElementSibling);
        }else{
          leftPanel.appendChild(kanbanCard);
        }
      }
    }

    const mainGrid = leftPanel.querySelector(".main-grid");
    if(mainGrid) mainGrid.classList.add("v52-empty-main-grid");
  }

  function completedJourneyHtml(journey){
    const pct = Math.max(100, progress(journey));
    const subject = journey.subject || "Lernreise";
    const goal = journey.goal || journey.description || "Abgeschlossene Lernreise.";
    const html = typeof toniV50ActivityJourneyHtml === "function"
      ? toniV50ActivityJourneyHtml(journey)
      : `
        <div class="projekt-item activity-journey-item-v50">
          <div class="projekt-row">
            <div class="projekt-name">✅ ${esc(journey.title || "Lernreise")}</div>
            <div class="projekt-pct">${pct}%</div>
          </div>
          <div class="projekt-desc">${esc(subject)} · ${esc(goal)}</div>
          <div class="projekt-track-wrap"><div class="projekt-fill p-green" style="width:${pct}%"></div></div>
        </div>
      `;

    return html
      .replace('activity-journey-item-v50', 'activity-journey-item-v50 activity-completed-item-v83')
      .replace('<div class="projekt-name">', '<div class="projekt-name">✅ ')
      .replace('<span class="activity-journey-badge-v50">aktiv</span>', '<span class="activity-journey-badge-v50">abgeschlossen</span>');
  }

  async function renderCompletedJourneys(){
    if(role() !== "student") return;

    const openContainer = document.getElementById("activity-learning-journeys-v50");
    if(!openContainer) return;

    let panel = document.getElementById("activity-completed-panel-v83");
    if(!panel){
      panel = document.createElement("div");
      panel.id = "activity-completed-panel-v83";
      panel.className = "activity-completed-panel-v83";
      openContainer.insertAdjacentElement("afterend", panel);
    }

    const journeys = await loadAssignedJourneysWithProgress();
    const completed = journeys
      .filter(journey => progress(journey) >= 100)
      .sort((a,b) => String(a.title || "").localeCompare(String(b.title || ""), "de"));

    if(!completed.length){
      panel.innerHTML = "";
      panel.style.display = "none";
      return;
    }

    panel.style.display = "";
    panel.classList.toggle("open", !!window.TONI_V83_COMPLETED_OPEN);

    panel.innerHTML = `
      <div class="activity-completed-header-v83" onclick="toniV83ToggleCompletedJourneys()">
        <div class="activity-completed-title-v83">
          Abgeschlossene Lernreisen <span>(${completed.length})</span>
        </div>
        <button type="button" class="activity-completed-toggle-v83" aria-label="Abgeschlossene Lernreisen anzeigen">
          ${window.TONI_V83_COMPLETED_OPEN ? "−" : "+"}
        </button>
      </div>
      <div class="activity-completed-body-v83">
        ${completed.map(completedJourneyHtml).join("")}
      </div>
    `;
  }

  window.toniV83ToggleCompletedJourneys = function(){
    window.TONI_V83_COMPLETED_OPEN = !window.TONI_V83_COMPLETED_OPEN;
    localStorage.setItem("toni_v83_completed_open", window.TONI_V83_COMPLETED_OPEN ? "1" : "0");

    const panel = document.getElementById("activity-completed-panel-v83");
    if(panel){
      panel.classList.toggle("open", !!window.TONI_V83_COMPLETED_OPEN);
      const btn = panel.querySelector(".activity-completed-toggle-v83");
      if(btn) btn.textContent = window.TONI_V83_COMPLETED_OPEN ? "−" : "+";
    }
  };

  function refreshV83(){
    setTimeout(reorderStudentDashboard, 50);
    setTimeout(renderCompletedJourneys, 120);
  }

  ["toniV52ReorderDashboard","toniV50RenderAllJourneysInActivities","syncJourneyToDashboard","updateLearningJourneyBar","applyAuthProfile","applyRoleUI","toniV8ApplyRoleClasses","toniV12ApplyDashboard"].forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV83Wrapped){
      const original = window[fnName];
      const wrapped = function(...args){
        const result = original.apply(this, args);
        refreshV83();
        return result;
      };
      wrapped.__toniV83Wrapped = true;
      window[fnName] = wrapped;
    }
  });

  window.toniV83ReorderStudentDashboard = reorderStudentDashboard;
  window.toniV83RenderCompletedJourneys = renderCompletedJourneys;

  window.addEventListener("DOMContentLoaded", () => {
    refreshV83();
    setTimeout(refreshV83, 700);
    setTimeout(refreshV83, 1800);
    setTimeout(refreshV83, 3600);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V83_LAYOUT_TIMER);
      window.TONI_V83_LAYOUT_TIMER = setTimeout(refreshV83, 120);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });

  window.addEventListener("resize", () => {
    clearTimeout(window.TONI_V83_RESIZE_TIMER);
    window.TONI_V83_RESIZE_TIMER = setTimeout(reorderStudentDashboard, 120);
  });
})();

/* TONI V85 – Fix: Fortschritt im Fenster „Lernreise wechseln“ wirklich rendern */
(function(){
  function esc(value){
    if(typeof toniV20Escape === "function") return toniV20Escape(value);
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function normalizeTemplate(template){
    if(typeof normalizeTemplateToJourneyV20 === "function"){
      try{return normalizeTemplateToJourneyV20(template);}
      catch{}
    }

    if(typeof toniV50NormalizeTemplate === "function"){
      try{return toniV50NormalizeTemplate(template);}
      catch{}
    }

    const j = template?.journey_json || template || {};
    return {
      id: template?.id || j.id,
      title: template?.title || j.title || "Lernreise",
      subject: template?.subject || j.subject || "Ohne Fach",
      goal: template?.goal || j.goal || "",
      description: template?.description || j.description || "",
      steps: j.steps || []
    };
  }

  function taskProgress(journey){
    const steps = Array.isArray(journey?.steps) ? journey.steps : [];
    const tasks = steps.flatMap(step => (step.tasks || []).filter(task => task.required !== false));

    if(tasks.length){
      const done = tasks.filter(task =>
        task.status === "done" ||
        task.status === "completed" ||
        task.done === true ||
        task.completed === true
      ).length;

      return Math.round(done / tasks.length * 100);
    }

    if(steps.length){
      const doneSteps = steps.filter(step =>
        step.status === "done" ||
        step.status === "completed" ||
        step.done === true ||
        step.completed === true
      ).length;

      return Math.round(doneSteps / steps.length * 100);
    }

    return 0;
  }

  function pctFromAny(row, template, journey, savedRow){
    const values = [
      savedRow?.progress_percent,
      savedRow?.progress_json?.progress_percent,
      savedRow?.progress?.progress_percent,
      row?.progress_percent,
      row?.assignment?.progress_percent,
      template?.progress_percent,
      template?.journey_json?.progress_percent
    ];

    for(const value of values){
      const n = Number(value);
      if(Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
    }

    // gespeicherten Journey-Stand anwenden, falls vorhanden
    try{
      const savedJson = savedRow?.progress_json || savedRow?.progress;
      if(savedJson && typeof toniV40ApplyProgressToJourney === "function"){
        journey = toniV40ApplyProgressToJourney(journey, savedJson);
      }
    }catch(error){
      console.warn("TONI V85: gespeicherter Fortschritt konnte nicht angewendet werden:", error);
    }

    try{
      if(typeof toniV50Progress === "function"){
        const n = Number(toniV50Progress(journey));
        if(Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
      }
    }catch{}

    return Math.max(0, Math.min(100, taskProgress(journey)));
  }

  function statusFor(pct){
    if(pct >= 100) return "Abgeschlossen";
    if(pct <= 0) return "Noch nicht begonnen";
    return "In Bearbeitung";
  }

  function clsFor(pct){
    if(pct >= 100) return "done";
    if(pct <= 0) return "todo";
    return "";
  }

  async function loadProgressMap(){
    const map = new Map();

    // 1. Primär: RPC mit gespeicherten Lernständen
    if(typeof supabaseRequest === "function"){
      try{
        const rows = await supabaseRequest("rpc/get_my_learning_journey_progress_all", {
          method:"POST",
          body:JSON.stringify({})
        });

        (Array.isArray(rows) ? rows : []).forEach(row => {
          const id = row.learning_journey_template_id || row.learning_journey_id || row.template_id;
          if(id) map.set(String(id), row);
        });
      }catch(error){
        console.warn("TONI V85: Fortschritts-RPC nicht verfügbar:", error);
      }
    }

    return map;
  }

  function buildSwitchItem(row, index, progressMap){
    const template = row.journey_template || row.learning_journey_templates || row || {};
    const rawJson = template.journey_json || {};
    const journey = normalizeTemplate(template);

    const templateId = template.id || rawJson.id || journey.id || "";
    const savedRow = progressMap.get(String(templateId));
    const pct = pctFromAny(row, template, journey, savedRow);
    const cls = clsFor(pct);
    const status = statusFor(pct);

    const title = template.title || rawJson.title || journey.title || "Lernreise";
    const subject = template.subject || rawJson.subject || journey.subject || "Ohne Fach";
    const goal = template.goal || rawJson.goal || journey.goal || "";
    const steps = (journey.steps || rawJson.steps || []).length;

    window["TONI_SWITCH_JOURNEY_" + index] = template;

    return `
      <div class="switch-item switch-item-v85">
        <div class="switch-content-v85">
          <div class="switch-title">${esc(title)}</div>
          <div class="switch-meta">
            ${esc(subject)} · ${steps} Station(en)<br>
            ${goal ? "Ziel: " + esc(goal) : ""}
          </div>

          <div class="switch-progress-wrap-v85" title="Bearbeitungszustand ${pct}%">
            <div class="switch-progress-track-v85">
              <div class="switch-progress-fill-v85 ${cls}" style="width:${pct}%"></div>
            </div>
            <div class="switch-progress-percent-v85 ${cls}">${pct}%</div>
          </div>
          <div class="switch-progress-status-v85 ${cls}">${status}</div>
        </div>

        <button class="switch-start-btn switch-start-btn-v85" onclick="startAssignedJourneyV20(${index})">Starten</button>
      </div>
    `;
  }

  async function openSwitchWithProgress(){
    const modal = document.getElementById("journey-switch-modal");
    const list = document.getElementById("journey-switch-list");

    modal?.classList.add("open");

    if(!list){
      return;
    }

    list.innerHTML = `<div class="assignment-empty">Lernreisen und Bearbeitungsstände werden geladen …</div>`;

    try{
      if(typeof loadAssignedJourneysForStudentV20 !== "function"){
        throw new Error("Funktion zum Laden zugeordneter Lernreisen fehlt.");
      }

      const rows = await loadAssignedJourneysForStudentV20();

      if(!rows || !rows.length){
        list.innerHTML = `<div class="assignment-empty">Dir ist noch keine Lernreise zugeordnet. Nutze „Lernreise hinzufügen“, um einen QR-Code zu scannen.</div>`;
        return;
      }

      const progressMap = await loadProgressMap();

      list.innerHTML = rows
        .map((row,index) => buildSwitchItem(row,index,progressMap))
        .join("");
    }catch(error){
      console.error("TONI V85 Lernreise wechseln:", error);
      list.innerHTML = `<div class="assignment-empty">⚠️ Lernreisen konnten nicht geladen werden:<br>${esc(error.message || error)}</div>`;
    }
  }

  function installSwitchInterceptors(){
    window.openJourneySwitchModal = openSwitchWithProgress;
    window.toniV85OpenJourneySwitchModal = openSwitchWithProgress;

    document.querySelectorAll('[onclick*="openJourneySwitchModal"]').forEach(btn => {
      if(btn.dataset.toniV85SwitchInstalled === "1") return;
      btn.dataset.toniV85SwitchInstalled = "1";
      btn.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        openSwitchWithProgress();
      }, true);
    });
  }

  // Falls alte Funktion das Modal schon ohne Fortschritt gefüllt hat: nachrendern.
  async function repairOpenSwitchModal(){
    const modal = document.getElementById("journey-switch-modal");
    const list = document.getElementById("journey-switch-list");

    if(!modal || !list) return;
    const isOpen = modal.classList.contains("open");
    const needsRepair = isOpen && list.querySelector(".switch-item:not(.switch-item-v85)");

    if(needsRepair){
      await openSwitchWithProgress();
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    installSwitchInterceptors();

    setTimeout(installSwitchInterceptors, 400);
    setTimeout(installSwitchInterceptors, 1200);
    setTimeout(installSwitchInterceptors, 2500);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V85_SWITCH_TIMER);
      window.TONI_V85_SWITCH_TIMER = setTimeout(() => {
        installSwitchInterceptors();
        repairOpenSwitchModal();
      }, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });
})();

/* TONI V86 – Abgeschlossene Lernreisen anklickbar öffnen und „Nächster Schritt“ entfernen */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function normalize(template){
    if(typeof normalizeTemplateToJourneyV20 === "function"){
      try{return normalizeTemplateToJourneyV20(template);}
      catch{}
    }

    if(typeof toniV50NormalizeTemplate === "function"){
      try{return toniV50NormalizeTemplate(template);}
      catch{}
    }

    const j = template?.journey_json || template || {};
    return {
      id: template?.id || j.id,
      title: template?.title || j.title || "Lernreise",
      subject: template?.subject || j.subject || "",
      goal: template?.goal || j.goal || "",
      description: template?.description || j.description || "",
      steps: j.steps || []
    };
  }

  function progress(journey){
    try{
      if(typeof toniV50Progress === "function") return Number(toniV50Progress(journey) || 0);
    }catch{}

    const tasks = (journey?.steps || []).flatMap(step => (step.tasks || []).filter(task => task.required !== false));
    if(tasks.length){
      const done = tasks.filter(task => task.status === "done" || task.done || task.completed).length;
      return Math.round(done / tasks.length * 100);
    }

    const steps = journey?.steps || [];
    if(steps.length){
      const done = steps.filter(step => step.status === "done" || step.done || step.completed).length;
      return Math.round(done / steps.length * 100);
    }

    return 0;
  }

  async function loadCompletedJourneysWithTemplates(){
    if(typeof loadAssignedJourneysForStudentV20 !== "function") return [];

    try{
      const rows = await loadAssignedJourneysForStudentV20();

      let progressByJourney = new Map();
      if(typeof supabaseRequest === "function"){
        try{
          const progressRows = await supabaseRequest("rpc/get_my_learning_journey_progress_all", {
            method:"POST",
            body:JSON.stringify({})
          });

          progressByJourney = new Map((progressRows || []).map(row => [
            String(row.learning_journey_template_id || row.learning_journey_id || row.template_id),
            row
          ]));
        }catch(error){
          console.warn("TONI V86: Lernstände konnten nicht geladen werden:", error);
        }
      }

      return (rows || [])
        .map(row => {
          const template = row.journey_template || row.learning_journey_templates || row;
          if(!template) return null;

          let journey = normalize(template);
          const saved = progressByJourney.get(String(template.id || journey.id));
          if(saved?.progress_json && typeof toniV40ApplyProgressToJourney === "function"){
            try{
              journey = toniV40ApplyProgressToJourney(journey, saved.progress_json);
            }catch{}
          }

          const pct = Number(saved?.progress_percent ?? saved?.progress_json?.progress_percent ?? progress(journey));
          return {
            row,
            template,
            journey,
            progress: Math.max(0, Math.min(100, Math.round(Number.isFinite(pct) ? pct : 0)))
          };
        })
        .filter(item => item && item.progress >= 100);
    }catch(error){
      console.warn("TONI V86: Abgeschlossene Lernreisen konnten nicht geladen werden:", error);
      return [];
    }
  }

  function completedItemHtml(item, index){
    const journey = item.journey;
    const subject = journey.subject || "Lernreise";
    const goal = journey.goal || journey.description || "Abgeschlossene Lernreise.";
    const title = journey.title || "Lernreise";

    window["TONI_COMPLETED_JOURNEY_V86_" + index] = item.template;

    return `
      <div class="projekt-item activity-journey-item-v50 activity-completed-item-v83 activity-completed-item-v86"
           role="button"
           tabindex="0"
           data-completed-index-v86="${index}"
           title="Lernreise öffnen">
        <div class="projekt-row">
          <div class="projekt-name">✅ ⚡ ${esc(title)}</div>
          <div class="projekt-pct">100%</div>
        </div>
        <div class="projekt-desc">${esc(subject)} · ${esc(goal)}</div>
        <div class="projekt-track-wrap">
          <div class="projekt-fill p-green" style="width:100%"></div>
        </div>
        <div class="activity-completed-open-hint-v86">Lernreise öffnen →</div>
      </div>
    `;
  }

  async function renderCompletedOpenable(){
    const openContainer = document.getElementById("activity-learning-journeys-v50");
    if(!openContainer) return;

    let panel = document.getElementById("activity-completed-panel-v83");
    if(!panel){
      panel = document.createElement("div");
      panel.id = "activity-completed-panel-v83";
      panel.className = "activity-completed-panel-v83";
      openContainer.insertAdjacentElement("afterend", panel);
    }

    const completed = await loadCompletedJourneysWithTemplates();

    if(!completed.length){
      panel.innerHTML = "";
      panel.style.display = "none";
      return;
    }

    panel.style.display = "";
    const isOpen = localStorage.getItem("toni_v83_completed_open") === "1";
    panel.classList.toggle("open", isOpen);

    panel.innerHTML = `
      <div class="activity-completed-header-v83" onclick="toniV83ToggleCompletedJourneys?.()">
        <div class="activity-completed-title-v83">
          Abgeschlossene Lernreisen <span>(${completed.length})</span>
        </div>
        <button type="button" class="activity-completed-toggle-v83" aria-label="Abgeschlossene Lernreisen anzeigen">
          ${isOpen ? "−" : "+"}
        </button>
      </div>
      <div class="activity-completed-body-v83">
        ${completed.map(completedItemHtml).join("")}
      </div>
    `;
  }

  function openCompletedJourney(index){
    const template = window["TONI_COMPLETED_JOURNEY_V86_" + index];
    if(!template) return;

    const journey = normalize(template);

    if(typeof ensureLearningState === "function") ensureLearningState();
    if(typeof STATE !== "undefined"){
      STATE.learningJourneys = STATE.learningJourneys || [];
      const pos = STATE.learningJourneys.findIndex(j => String(j.id) === String(journey.id));
      if(pos >= 0) STATE.learningJourneys[pos] = journey;
      else STATE.learningJourneys.push(journey);
      STATE.activeJourneyId = journey.id;
      if(typeof saveState === "function") saveState(STATE);
    }

    if(typeof syncJourneyToDashboard === "function") syncJourneyToDashboard();

    if(typeof renderLearningJourneyModal === "function"){
      renderLearningJourneyModal();
      document.getElementById("lr-modal")?.classList.add("open");
    }else if(typeof startAssignedJourneyV20 === "function"){
      window["TONI_SWITCH_JOURNEY_9986"] = template;
      startAssignedJourneyV20(9986);
    }

    if(typeof appendMsg === "function"){
      appendMsg("toni", `📚 Lernreise geöffnet: <strong>${esc(journey.title)}</strong>`, typeof time === "function" ? time() : "", "desktop");
    }
  }

  window.toniV86RenderCompletedJourneys = renderCompletedOpenable;
  window.toniV86OpenCompletedJourney = openCompletedJourney;

  // V83-Renderer ersetzen, damit kein „Nächster Schritt“ mehr auftaucht.
  window.toniV83RenderCompletedJourneys = renderCompletedOpenable;

  document.addEventListener("click", event => {
    const item = event.target.closest("[data-completed-index-v86]");
    if(!item) return;

    event.preventDefault();
    event.stopPropagation();

    openCompletedJourney(item.dataset.completedIndexV86);
  }, true);

  document.addEventListener("keydown", event => {
    if(event.key !== "Enter" && event.key !== " ") return;

    const item = event.target.closest("[data-completed-index-v86]");
    if(!item) return;

    event.preventDefault();
    openCompletedJourney(item.dataset.completedIndexV86);
  }, true);

  function refresh(){
    setTimeout(renderCompletedOpenable, 120);
  }

  ["toniV50RenderAllJourneysInActivities","syncJourneyToDashboard","startAssignedJourneyV20","applyAuthProfile","applyRoleUI","toniV8ApplyRoleClasses"].forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV86Wrapped){
      const original = window[fnName];
      const wrapped = function(...args){
        const result = original.apply(this, args);
        Promise.resolve(result).finally(refresh);
        return result;
      };
      wrapped.__toniV86Wrapped = true;
      window[fnName] = wrapped;
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(renderCompletedOpenable, 700);
    setTimeout(renderCompletedOpenable, 1800);
    setTimeout(renderCompletedOpenable, 3600);
  });
})();

/* TONI V87 – Abgeschlossene Lernreisen öffnen, ohne den Bearbeitungszustand zurückzusetzen */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function normalize(template){
    if(typeof normalizeTemplateToJourneyV20 === "function"){
      try{return normalizeTemplateToJourneyV20(template);}
      catch{}
    }

    if(typeof toniV50NormalizeTemplate === "function"){
      try{return toniV50NormalizeTemplate(template);}
      catch{}
    }

    const j = template?.journey_json || template || {};
    return {
      id: template?.id || j.id,
      title: template?.title || j.title || "Lernreise",
      subject: template?.subject || j.subject || "",
      goal: template?.goal || j.goal || "",
      description: template?.description || j.description || "",
      steps: j.steps || []
    };
  }

  function markJourneyCompleted(journey){
    const copy = JSON.parse(JSON.stringify(journey || {}));

    copy.status = "completed";
    copy.progress_percent = 100;

    if(Array.isArray(copy.steps)){
      copy.steps = copy.steps.map(step => ({
        ...step,
        status: step.status || "done",
        done: true,
        completed: true,
        tasks: (step.tasks || []).map(task => ({
          ...task,
          status: "done",
          done: true,
          completed: true
        }))
      }));
    }

    return copy;
  }

  async function loadSavedProgressForTemplate(templateId){
    if(!templateId || typeof supabaseRequest !== "function") return null;

    try{
      const rows = await supabaseRequest("rpc/get_my_learning_journey_progress_all", {
        method:"POST",
        body:JSON.stringify({})
      });

      const hit = (Array.isArray(rows) ? rows : []).find(row =>
        String(row.learning_journey_template_id || row.learning_journey_id || row.template_id) === String(templateId)
      );

      return hit || null;
    }catch(error){
      console.warn("TONI V87: gespeicherter Lernstand konnte nicht geladen werden:", error);
      return null;
    }
  }

  async function buildCompletedJourneyFromTemplate(template){
    let journey = normalize(template);
    const templateId = template?.id || journey?.id;

    const saved = await loadSavedProgressForTemplate(templateId);
    const savedJson = saved?.progress_json || saved?.progress || null;

    if(savedJson && typeof toniV40ApplyProgressToJourney === "function"){
      try{
        journey = toniV40ApplyProgressToJourney(journey, savedJson);
      }catch(error){
        console.warn("TONI V87: gespeicherter Lernstand konnte nicht angewendet werden:", error);
      }
    }else if(savedJson?.journey?.steps){
      journey = {
        ...journey,
        steps:savedJson.journey.steps
      };
    }

    // Entscheidend: Beim erneuten Öffnen darf die Lernreise nicht neu starten.
    // Falls der gespeicherte Stand fehlt oder unvollständig ist, bleibt sie dennoch sichtbar bei 100 %.
    journey = markJourneyCompleted(journey);

    return {journey, saved};
  }

  async function openCompletedJourneyPreservingProgress(index){
    const template = window["TONI_COMPLETED_JOURNEY_V86_" + index] ||
      window["TONI_COMPLETED_JOURNEY_V87_" + index];

    if(!template) return;

    const {journey} = await buildCompletedJourneyFromTemplate(template);

    if(typeof ensureLearningState === "function") ensureLearningState();

    if(typeof STATE !== "undefined"){
      STATE.learningJourneys = STATE.learningJourneys || [];

      const pos = STATE.learningJourneys.findIndex(j => String(j.id) === String(journey.id));
      if(pos >= 0){
        STATE.learningJourneys[pos] = {
          ...STATE.learningJourneys[pos],
          ...journey,
          progress_percent:100,
          status:"completed"
        };
      }else{
        STATE.learningJourneys.push({
          ...journey,
          progress_percent:100,
          status:"completed"
        });
      }

      STATE.activeJourneyId = journey.id;

      if(typeof saveState === "function") saveState(STATE);
    }

    if(typeof syncJourneyToDashboard === "function"){
      syncJourneyToDashboard();
    }

    if(typeof renderLearningJourneyModal === "function"){
      renderLearningJourneyModal();

      // Nach dem Rendern noch einmal sicherstellen, dass Fortschritt nicht auf 0 zurückspringt.
      setTimeout(() => {
        try{
          if(typeof STATE !== "undefined"){
            const pos = STATE.learningJourneys?.findIndex(j => String(j.id) === String(journey.id));
            if(pos >= 0){
              STATE.learningJourneys[pos] = {
                ...STATE.learningJourneys[pos],
                ...journey,
                progress_percent:100,
                status:"completed"
              };
              if(typeof saveState === "function") saveState(STATE);
            }
          }
          if(typeof syncJourneyToDashboard === "function") syncJourneyToDashboard();
        }catch(error){
          console.warn("TONI V87: Abschlussstatus konnte nach Rendern nicht erneut gesetzt werden:", error);
        }
      }, 120);

      document.getElementById("lr-modal")?.classList.add("open");
    }

    if(typeof appendMsg === "function"){
      appendMsg(
        "toni",
        `📚 Abgeschlossene Lernreise geöffnet: <strong>${esc(journey.title)}</strong><br><small>Der Bearbeitungszustand bleibt bei 100 %.</small>`,
        typeof time === "function" ? time() : "",
        "desktop"
      );
    }
  }

  window.toniV87OpenCompletedJourney = openCompletedJourneyPreservingProgress;
  window.toniV86OpenCompletedJourney = openCompletedJourneyPreservingProgress;

  // Zusätzlicher Sicherungs-Handler: V86 öffnet eventuell zuerst den Rohzustand.
  // V87 setzt danach denselben Eintrag sofort wieder auf den gespeicherten/abgeschlossenen Stand.
  document.addEventListener("click", event => {
    const item = event.target.closest("[data-completed-index-v86]");
    if(!item) return;

    event.preventDefault();
    setTimeout(() => {
      openCompletedJourneyPreservingProgress(item.dataset.completedIndexV86);
    }, 80);
  }, true);

  document.addEventListener("keydown", event => {
    if(event.key !== "Enter" && event.key !== " ") return;

    const item = event.target.closest("[data-completed-index-v86]");
    if(!item) return;

    event.preventDefault();
    setTimeout(() => {
      openCompletedJourneyPreservingProgress(item.dataset.completedIndexV86);
    }, 80);
  }, true);

  // Text der Hinweise vereinheitlichen: nicht „Starten“, sondern ansehen/öffnen.
  function updateCompletedHints(){
    document.querySelectorAll(".activity-completed-open-hint-v86").forEach(el => {
      el.textContent = "Abgeschlossene Lernreise öffnen →";
      el.classList.add("activity-completed-open-hint-v87");
    });
  }

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(updateCompletedHints, 600);
    setTimeout(updateCompletedHints, 1600);
    setTimeout(updateCompletedHints, 3200);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V87_COMPLETED_HINT_TIMER);
      window.TONI_V87_COMPLETED_HINT_TIMER = setTimeout(updateCompletedHints, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true
    });
  });
})();

/* TONI V88 – Fix: abgeschlossene Lernreisen öffnen ohne Rücksetzung auf 0 % */
(function(){
  window.TONI_V88_COMPLETED_VIEW_IDS = window.TONI_V88_COMPLETED_VIEW_IDS || new Set();
  window.TONI_V88_COMPLETED_JOURNEYS = window.TONI_V88_COMPLETED_JOURNEYS || new Map();

  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function deepClone(value){
    try{return structuredClone(value);}
    catch{return JSON.parse(JSON.stringify(value || {}));}
  }

  function normalizeTemplateV88(template){
    const raw = template?.journey_json || template || {};

    let base = null;
    if(typeof normalizeTemplateToJourneyV20 === "function"){
      try{base = normalizeTemplateToJourneyV20(template);}
      catch{}
    }
    if((!base || !Array.isArray(base.steps) || !base.steps.length) && typeof toniV50NormalizeTemplate === "function"){
      try{base = toniV50NormalizeTemplate(template);}
      catch{}
    }

    const steps =
      base?.steps?.length ? base.steps :
      raw.steps || raw.stations || raw.stationen || raw.items || [];

    return {
      ...(base || {}),
      id: template?.id || raw.id || base?.id,
      title: template?.title || raw.title || base?.title || "Lernreise",
      subject: template?.subject || raw.subject || base?.subject || "",
      goal: template?.goal || raw.goal || base?.goal || "",
      description: template?.description || raw.description || base?.description || "",
      steps: (Array.isArray(steps) ? steps : []).map((step, idx) => ({
        id: step.id || step.key || `step-${idx+1}`,
        title: step.title || step.name || `Station ${idx+1}`,
        subtitle: step.subtitle || step.subTitle || step.phase || "",
        description: step.description || step.text || "",
        ...step,
        tasks: (step.tasks || step.aufgaben || step.items || []).map((task, tidx) => ({
          id: task.id || task.key || `${step.id || "step"}-task-${tidx+1}`,
          title: task.title || task.name || `Aufgabe ${tidx+1}`,
          type: task.type || task.kind || "Aufgabe",
          required: task.required !== false && task.optional !== true,
          description: task.description || task.text || task.auftrag || "",
          content: task.content || task.inhalt || "",
          ...task
        }))
      }))
    };
  }

  function markCompletedV88(journey){
    const copy = deepClone(journey || {});
    copy.status = "completed";
    copy.progress_percent = 100;

    if(Array.isArray(copy.steps)){
      copy.steps = copy.steps.map(step => ({
        ...step,
        status:"done",
        done:true,
        completed:true,
        tasks:(step.tasks || []).map(task => ({
          ...task,
          required: task.required !== false && task.optional !== true,
          status:"done",
          done:true,
          completed:true
        }))
      }));
    }

    return copy;
  }

  async function loadSavedProgressV88(templateId){
    if(!templateId || typeof supabaseRequest !== "function") return null;

    try{
      const rows = await supabaseRequest("rpc/get_my_learning_journey_progress_all", {
        method:"POST",
        body:JSON.stringify({})
      });

      return (Array.isArray(rows) ? rows : []).find(row =>
        String(row.learning_journey_template_id || row.learning_journey_id || row.template_id) === String(templateId)
      ) || null;
    }catch(error){
      console.warn("TONI V88: gespeicherter Lernstand konnte nicht geladen werden:", error);
      return null;
    }
  }

  async function buildCompletedJourneyV88(template){
    let journey = normalizeTemplateV88(template);
    const templateId = template?.id || journey?.id;
    const saved = await loadSavedProgressV88(templateId);
    const savedJson = saved?.progress_json || saved?.progress || null;

    // Wenn Supabase einen gespeicherten Journey-Snapshot enthält, hat dieser Vorrang.
    if(savedJson?.journey){
      journey = {
        ...journey,
        ...savedJson.journey,
        id: journey.id || savedJson.journey.id,
        title: journey.title || savedJson.journey.title,
        subject: journey.subject || savedJson.journey.subject || "",
        goal: journey.goal || savedJson.journey.goal || "",
        description: journey.description || savedJson.journey.description || "",
        steps: savedJson.journey.steps || journey.steps || []
      };
    }else if(savedJson && typeof toniV40ApplyProgressToJourney === "function"){
      try{
        journey = toniV40ApplyProgressToJourney(journey, savedJson);
      }catch(error){
        console.warn("TONI V88: gespeicherter Lernstand konnte nicht angewendet werden:", error);
      }
    }

    // Entscheidend: abgeschlossen bleibt abgeschlossen.
    journey = markCompletedV88(journey);
    journey.id = templateId || journey.id;

    return journey;
  }

  function putCompletedJourneyIntoStateV88(journey){
    if(!journey?.id) return;

    if(typeof ensureLearningState === "function") ensureLearningState();

    if(typeof STATE !== "undefined"){
      STATE.learningJourneys = STATE.learningJourneys || [];

      const completed = markCompletedV88(journey);
      const pos = STATE.learningJourneys.findIndex(j => String(j.id) === String(completed.id));

      if(pos >= 0) STATE.learningJourneys[pos] = completed;
      else STATE.learningJourneys.push(completed);

      STATE.activeJourneyId = completed.id;

      if(typeof saveState === "function") saveState(STATE);
    }

    window.TONI_V88_COMPLETED_VIEW_IDS.add(String(journey.id));
    window.TONI_V88_COMPLETED_JOURNEYS.set(String(journey.id), markCompletedV88(journey));
  }

  function enforceCompletedDomV88(journey){
    if(!journey?.id) return;

    document.body.classList.add("toni-v88-completed-view");

    const number = document.getElementById("lr-progress-number");
    const fill = document.getElementById("lr-progress-fill");

    if(number) number.textContent = "100%";
    if(fill) fill.style.width = "100%";

    document.querySelectorAll("#lr-mini-list .lr-mini-dot").forEach(dot => {
      dot.textContent = "✓";
      dot.classList.remove("current","locked");
      dot.classList.add("done");
    });

    document.querySelectorAll("#lr-stations .lr-station-card").forEach(card => {
      card.classList.remove("current","locked");
      card.classList.add("done");
      const status = card.querySelector(".lr-station-status");
      if(status) status.textContent = "✓";
      const progress = card.querySelector(".lr-station-progress");
      if(progress){
        const match = progress.textContent.match(/\/\s*(\d+)/);
        const total = match ? Number(match[1]) : null;
        if(total !== null && Number.isFinite(total)){
          progress.textContent = `${total}/${total} Pflichtaufgaben`;
        }
      }
    });

    document.querySelectorAll("#lr-task-grid .lr-task-card").forEach(card => {
      card.classList.remove("todo","in_progress","locked");
      card.classList.add("done");
      const title = card.querySelector(".lr-task-title");
      if(title && !title.textContent.trim().startsWith("✅")){
        title.textContent = "✅ " + title.textContent.replace(/^[☐🟡✅]\s*/,"").trim();
      }
      if(!card.querySelector(".lr-task-tag.done")){
        const tags = card.querySelector(".lr-task-tags");
        if(tags){
          const span = document.createElement("span");
          span.className = "lr-task-tag done";
          span.textContent = "erledigt";
          tags.appendChild(span);
        }
      }
    });
  }

  function isCompletedActiveV88(){
    try{
      const j = typeof activeJourney === "function" ? activeJourney() : null;
      return !!(j?.id && window.TONI_V88_COMPLETED_VIEW_IDS.has(String(j.id)));
    }catch{
      return false;
    }
  }

  async function openCompletedJourneyV88(index){
    const template =
      window["TONI_COMPLETED_JOURNEY_V86_" + index] ||
      window["TONI_COMPLETED_JOURNEY_V87_" + index] ||
      window["TONI_COMPLETED_JOURNEY_V88_" + index];

    if(!template) return;

    const journey = await buildCompletedJourneyV88(template);
    putCompletedJourneyIntoStateV88(journey);

    // Original-Renderer darf laufen, bekommt aber vorher den 100%-State.
    if(typeof syncJourneyToDashboard === "function") syncJourneyToDashboard();

    if(typeof renderLearningJourneyModal === "function"){
      renderLearningJourneyModal();
      document.getElementById("lr-modal")?.classList.add("open");
      enforceCompletedDomV88(journey);

      // Einige ältere Funktionen rendern verzögert nach. Deshalb mehrfach absichern.
      setTimeout(() => { putCompletedJourneyIntoStateV88(journey); renderLearningJourneyModal?.(); enforceCompletedDomV88(journey); }, 120);
      setTimeout(() => { putCompletedJourneyIntoStateV88(journey); enforceCompletedDomV88(journey); syncJourneyToDashboard?.(); }, 400);
      setTimeout(() => { putCompletedJourneyIntoStateV88(journey); enforceCompletedDomV88(journey); }, 1000);
    }

    if(typeof appendMsg === "function"){
      appendMsg(
        "toni",
        `📚 Abgeschlossene Lernreise geöffnet: <strong>${esc(journey.title)}</strong><br><small>Der Bearbeitungszustand bleibt bei 100 %.</small>`,
        typeof time === "function" ? time() : "",
        "desktop"
      );
    }
  }

  // Alte Öffnungsfunktionen direkt überschreiben.
  window.toniV86OpenCompletedJourney = openCompletedJourneyV88;
  window.toniV87OpenCompletedJourney = openCompletedJourneyV88;
  window.toniV88OpenCompletedJourney = openCompletedJourneyV88;

  // Härtester Fix: window-capture läuft vor document-capture aus V86/V87 und verhindert den alten 0%-Pfad.
  window.addEventListener("click", event => {
    const item = event.target.closest?.("[data-completed-index-v86]");
    if(!item) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openCompletedJourneyV88(item.dataset.completedIndexV86);
  }, true);

  window.addEventListener("keydown", event => {
    if(event.key !== "Enter" && event.key !== " ") return;
    const item = event.target.closest?.("[data-completed-index-v86]");
    if(!item) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    openCompletedJourneyV88(item.dataset.completedIndexV86);
  }, true);

  // Globale Berechnungen für abgeschlossene Ansicht absichern.
  if(typeof window.journeyProgress === "function" && !window.journeyProgress.__toniV88Wrapped){
    const original = window.journeyProgress;
    window.journeyProgress = function(journey){
      if(journey?.id && window.TONI_V88_COMPLETED_VIEW_IDS.has(String(journey.id))) return 100;
      return original.apply(this, arguments);
    };
    window.journeyProgress.__toniV88Wrapped = true;
  }

  if(typeof window.stepStatus === "function" && !window.stepStatus.__toniV88Wrapped){
    const original = window.stepStatus;
    window.stepStatus = function(step, index, journey){
      const j = journey || (typeof activeJourney === "function" ? activeJourney() : null);
      if(j?.id && window.TONI_V88_COMPLETED_VIEW_IDS.has(String(j.id))) return "done";
      return original.apply(this, arguments);
    };
    window.stepStatus.__toniV88Wrapped = true;
  }

  if(typeof window.activeJourney === "function" && !window.activeJourney.__toniV88Wrapped){
    const original = window.activeJourney;
    window.activeJourney = function(){
      const j = original.apply(this, arguments);
      if(j?.id && window.TONI_V88_COMPLETED_VIEW_IDS.has(String(j.id))){
        return window.TONI_V88_COMPLETED_JOURNEYS.get(String(j.id)) || markCompletedV88(j);
      }
      return j;
    };
    window.activeJourney.__toniV88Wrapped = true;
  }

  if(typeof window.renderLearningJourneyModal === "function" && !window.renderLearningJourneyModal.__toniV88Wrapped){
    const original = window.renderLearningJourneyModal;
    window.renderLearningJourneyModal = function(){
      const jBefore = typeof activeJourney === "function" ? activeJourney() : null;
      if(jBefore?.id && window.TONI_V88_COMPLETED_VIEW_IDS.has(String(jBefore.id))){
        putCompletedJourneyIntoStateV88(markCompletedV88(jBefore));
      }

      const result = original.apply(this, arguments);

      const jAfter = typeof activeJourney === "function" ? activeJourney() : jBefore;
      if(jAfter?.id && window.TONI_V88_COMPLETED_VIEW_IDS.has(String(jAfter.id))){
        enforceCompletedDomV88(jAfter);
      }else{
        document.body.classList.remove("toni-v88-completed-view");
      }

      return result;
    };
    window.renderLearningJourneyModal.__toniV88Wrapped = true;
  }

  // Beim normalen Wechsel auf nicht abgeschlossene Lernreise Klasse entfernen.
  ["startAssignedJourneyV20","openJourneySwitchModal"].forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV88Wrapped){
      const original = window[fnName];
      window[fnName] = function(){
        document.body.classList.remove("toni-v88-completed-view");
        return original.apply(this, arguments);
      };
      window[fnName].__toniV88Wrapped = true;
    }
  });
})();

/* TONI V90 – Upload-Button sichtbar in die obere Lernreise-Karte setzen */
(function(){
  function ensureCoverUploadGroup(){
    const description = document.getElementById("journey-description");
    if(!description) return;

    const descGroup = description.closest(".lr-form-group");
    if(!descGroup) return;

    let group = document.querySelector(".journey-cover-upload-v89, .journey-cover-upload-v90");

    if(!group){
      group = document.createElement("div");
      group.className = "lr-form-group journey-cover-upload-v89 journey-cover-upload-v90";
      group.innerHTML = `
        <label class="lr-form-label" for="journey-cover-upload">
          Startbildschirm / Hintergrundbild <span class="optional-note-v89">optional</span>
        </label>
        <input type="hidden" id="journey-cover-image"/>
        <input type="hidden" id="journey-cover-name"/>
        <div class="cover-upload-box-v89">
          <div class="cover-upload-main-v89">
            <input class="cover-file-input-v89" id="journey-cover-upload" type="file" accept="image/*" onchange="toniV89HandleCoverUpload(event)"/>
            <label class="cover-upload-trigger-v90" for="journey-cover-upload">🖼️ Bild hochladen</label>
            <div class="cover-upload-note-v89">
              Lade optional ein Hintergrundbild für das Deckblatt der Lernreise hoch. Ohne Upload bleibt der Hintergrund weiß.
            </div>
          </div>
          <div class="cover-preview-v89 hidden" id="journey-cover-preview">
            <img id="journey-cover-preview-img" alt="Vorschau Hintergrundbild"/>
            <button type="button" class="cover-clear-btn-v89" onclick="toniV89ClearCoverImage()">Bild entfernen</button>
          </div>
        </div>
      `;
    }else{
      group.classList.add("journey-cover-upload-v90");

      let main = group.querySelector(".cover-upload-main-v89");
      const input = group.querySelector("#journey-cover-upload");
      if(main && input && !group.querySelector(".cover-upload-trigger-v90")){
        input.insertAdjacentHTML("afterend", `<label class="cover-upload-trigger-v90" for="journey-cover-upload">🖼️ Bild hochladen</label>`);
      }
    }

    // Direkt unter Beschreibung in der oberen Basics-Card platzieren.
    if(group.previousElementSibling !== descGroup){
      descGroup.insertAdjacentElement("afterend", group);
    }

    // Wichtig: Falls V47 das Feld als normales Eingabefeld iconisiert, Icon entfernen.
    delete group.dataset.v47Icon;
  }

  // Falls V47 schon gebaut wurde, danach verschieben; falls noch nicht, später erneut.
  function run(){
    ensureCoverUploadGroup();
  }

  const wrapNames = ["toniV47BuildModernJourneyEditor","resetJourneyEditor","editAdminJourney","showJourneyAdminPanelIfAllowedV16","loadAdminLearningJourneys"];
  wrapNames.forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV90Wrapped){
      const original = window[fnName];
      window[fnName] = function(...args){
        const result = original.apply(this, args);
        setTimeout(run, 60);
        setTimeout(run, 250);
        return result;
      };
      window[fnName].__toniV90Wrapped = true;
    }
  });

  window.toniV90EnsureCoverUploadGroup = run;

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(run, 100);
    setTimeout(run, 350);
    setTimeout(run, 1000);
    setTimeout(run, 2500);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V90_UPLOAD_TIMER);
      window.TONI_V90_UPLOAD_TIMER = setTimeout(run, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true
    });
  });
})();

/* TONI V91 – Bild nach Auswahl speichern und Vorschau neben dem Upload-Button anzeigen */
(function(){
  const DRAFT_KEY = "toni_v91_journey_cover_draft";

  function getCurrentJourneyEditId(){
    return document.getElementById("journey-edit-id")?.value || "new";
  }

  function dataUrlFromImageV91(file, maxSize = 1600, quality = 0.84){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          resolve(canvas.toDataURL("image/jpeg", quality));
        };

        img.onerror = () => reject(new Error("Das Bild konnte nicht gelesen werden."));
        img.src = reader.result;
      };

      reader.onerror = () => reject(new Error("Das Bild konnte nicht geladen werden."));
      reader.readAsDataURL(file);
    });
  }

  function ensurePreviewNextToButton(){
    const group = document.querySelector(".journey-cover-upload-v89, .journey-cover-upload-v90");
    if(!group) return null;

    const main = group.querySelector(".cover-upload-main-v89");
    if(!main) return null;

    let input = group.querySelector("#journey-cover-upload");
    let trigger = group.querySelector(".cover-upload-trigger-v90");

    if(input && !trigger){
      input.insertAdjacentHTML("afterend", `<label class="cover-upload-trigger-v90" for="journey-cover-upload">🖼️ Bild hochladen</label>`);
      trigger = group.querySelector(".cover-upload-trigger-v90");
    }

    let preview = group.querySelector("#journey-cover-preview");
    if(!preview){
      preview = document.createElement("div");
      preview.id = "journey-cover-preview";
      preview.className = "cover-preview-v89 cover-preview-v91 hidden";
      preview.innerHTML = `
        <img id="journey-cover-preview-img" alt="Vorschau Hintergrundbild"/>
        <button type="button" class="cover-clear-btn-v89 cover-clear-btn-v91" onclick="toniV91ClearCoverImage()" title="Bild entfernen" aria-label="Bild entfernen">×</button>
      `;
    }

    preview.classList.add("cover-preview-v91");

    // Vorschau direkt neben den Upload-Button verschieben.
    if(trigger && preview.previousElementSibling !== trigger){
      trigger.insertAdjacentElement("afterend", preview);
    }else if(!trigger && preview.parentElement !== main){
      main.appendChild(preview);
    }

    let status = group.querySelector(".cover-upload-status-v91");
    if(!status){
      status = document.createElement("div");
      status.className = "cover-upload-status-v91";
      status.textContent = "Bild gespeichert";
    }

    const note = group.querySelector(".cover-upload-note-v89");
    if(note){
      note.classList.add("cover-note-muted-v91");
    }

    return {group, main, input, trigger, preview, status};
  }

  function setHiddenCoverValues(dataUrl, name){
    let hidden = document.getElementById("journey-cover-image");
    let hiddenName = document.getElementById("journey-cover-name");

    const group = document.querySelector(".journey-cover-upload-v89, .journey-cover-upload-v90");
    if(group && !hidden){
      hidden = document.createElement("input");
      hidden.type = "hidden";
      hidden.id = "journey-cover-image";
      group.prepend(hidden);
    }

    if(group && !hiddenName){
      hiddenName = document.createElement("input");
      hiddenName.type = "hidden";
      hiddenName.id = "journey-cover-name";
      group.prepend(hiddenName);
    }

    if(hidden) hidden.value = dataUrl || "";
    if(hiddenName) hiddenName.value = name || "";
  }

  function saveCoverDraft(dataUrl, name){
    try{
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        editId:getCurrentJourneyEditId(),
        dataUrl:dataUrl || "",
        name:name || "",
        savedAt:new Date().toISOString()
      }));
    }catch(error){
      console.warn("TONI V91: Cover-Draft konnte nicht lokal gespeichert werden:", error);
    }
  }

  function updatePreview(dataUrl, name){
    const parts = ensurePreviewNextToButton();
    setHiddenCoverValues(dataUrl, name);

    if(!parts) return;

    const {preview, trigger} = parts;
    const img = preview?.querySelector("#journey-cover-preview-img") || preview?.querySelector("img");

    if(dataUrl){
      if(img) img.src = dataUrl;
      preview?.classList.remove("hidden");
      trigger?.classList.add("cover-has-image-v91");
      if(trigger) trigger.innerHTML = "🖼️ Bild ändern";
    }else{
      if(img) img.removeAttribute("src");
      preview?.classList.add("hidden");
      trigger?.classList.remove("cover-has-image-v91");
      if(trigger) trigger.innerHTML = "🖼️ Bild hochladen";
    }
  }

  window.toniV91HandleCoverUpload = async function(event){
    const input = event?.target;
    const file = input?.files?.[0];

    if(!file){
      updatePreview("", "");
      saveCoverDraft("", "");
      return;
    }

    if(!file.type || !file.type.startsWith("image/")){
      alert("Bitte wähle eine Bilddatei aus.");
      if(input) input.value = "";
      return;
    }

    try{
      const dataUrl = await dataUrlFromImageV91(file);
      const name = file.name || "Hintergrundbild";

      // Sofort speichern: im versteckten Formularfeld und zusätzlich lokal als Entwurf.
      updatePreview(dataUrl, name);
      saveCoverDraft(dataUrl, name);

      const note = document.querySelector(".cover-upload-note-v89");
      if(note){
        note.textContent = "Bild wurde übernommen und gespeichert. Es erscheint als Hintergrund des Deckblatts.";
      }
    }catch(error){
      console.error("TONI V91 Bild-Upload:", error);
      alert("Das Hintergrundbild konnte nicht übernommen werden:\n" + (error.message || error));
    }
  };

  window.toniV91ClearCoverImage = function(){
    const input = document.getElementById("journey-cover-upload");
    if(input) input.value = "";

    updatePreview("", "");
    saveCoverDraft("", "");

    const note = document.querySelector(".cover-upload-note-v89");
    if(note){
      note.textContent = "Lade optional ein Hintergrundbild für das Deckblatt der Lernreise hoch. Ohne Upload bleibt der Hintergrund weiß.";
    }
  };

  // Bestehende V89-Funktionen auf V91 umleiten.
  window.toniV89HandleCoverUpload = window.toniV91HandleCoverUpload;
  window.toniV89ClearCoverImage = window.toniV91ClearCoverImage;

  // Bestehende Vorschau-Funktion mit der neuen seitlichen Vorschau überschreiben.
  window.toniV89SetCoverPreview = updatePreview;

  // Beim Bearbeiten einer vorhandenen Lernreise Vorschau sichtbar neben den Button setzen.
  const wrapNames = ["editAdminJourney","resetJourneyEditor","toniV47BuildModernJourneyEditor","toniV90EnsureCoverUploadGroup"];
  wrapNames.forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV91Wrapped){
      const original = window[fnName];
      window[fnName] = function(...args){
        const result = original.apply(this, args);
        setTimeout(() => {
          ensurePreviewNextToButton();

          const dataUrl = document.getElementById("journey-cover-image")?.value || "";
          const name = document.getElementById("journey-cover-name")?.value || "";
          if(dataUrl) updatePreview(dataUrl, name);
        }, 120);
        return result;
      };
      window[fnName].__toniV91Wrapped = true;
    }
  });

  // Sicherstellen, dass das gespeicherte Bild beim Speichern wirklich in journey_json landet.
  if(typeof window.buildJourneyFromFormV16 === "function" && !window.buildJourneyFromFormV16.__toniV91Wrapped){
    const originalBuild = window.buildJourneyFromFormV16;
    window.buildJourneyFromFormV16 = function(...args){
      const journey = originalBuild.apply(this, args);
      return {
        ...journey,
        cover_image:document.getElementById("journey-cover-image")?.value || journey.cover_image || "",
        cover_image_name:document.getElementById("journey-cover-name")?.value || journey.cover_image_name || ""
      };
    };
    window.buildJourneyFromFormV16.__toniV91Wrapped = true;
  }

  function boot(){
    ensurePreviewNextToButton();

    const dataUrl = document.getElementById("journey-cover-image")?.value || "";
    const name = document.getElementById("journey-cover-name")?.value || "";
    if(dataUrl) updatePreview(dataUrl, name);
  }

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 100);
    setTimeout(boot, 500);
    setTimeout(boot, 1300);
    setTimeout(boot, 2800);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V91_COVER_TIMER);
      window.TONI_V91_COVER_TIMER = setTimeout(boot, 80);
    });

    observer.observe(document.body, {childList:true, subtree:true});
  });
})();

/* TONI V92 – Coverbild zuverlässig hochladen, speichern und beim Wiederöffnen laden */
(function(){
  const BUCKET = "learning-journey-covers";
  const DRAFT_KEY = "toni_v92_journey_cover_draft";

  function safeText(value){
    return String(value ?? "");
  }

  function slug(value){
    return safeText(value)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9._-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "cover";
  }

  function dataUrlToBlob(dataUrl){
    const [header, data] = String(dataUrl).split(",");
    const mime = (header.match(/data:([^;]+)/) || [,"image/jpeg"])[1];
    const binary = atob(data || "");
    const bytes = new Uint8Array(binary.length);
    for(let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], {type:mime});
  }

  function dataUrlFromImage(file, maxSize = 1800, quality = 0.86){
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const img = new Image();

        img.onload = () => {
          const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
          const width = Math.max(1, Math.round(img.width * scale));
          const height = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };

        img.onerror = () => reject(new Error("Das Bild konnte nicht gelesen werden."));
        img.src = reader.result;
      };

      reader.onerror = () => reject(new Error("Das Bild konnte nicht geladen werden."));
      reader.readAsDataURL(file);
    });
  }

  async function getAccessToken(){
    try{
      if(typeof getAuthAccessToken === "function"){
        const token = await getAuthAccessToken();
        if(token) return token;
      }
    }catch{}

    try{
      const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
      const {data} = await client?.auth?.getSession?.();
      if(data?.session?.access_token) return data.session.access_token;
    }catch{}

    return null;
  }

  function profileId(){
    return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.id) ||
      window.TONI_ACTIVE_PROFILE_ID ||
      localStorage.getItem("toni_profile_id") ||
      "unknown";
  }

  function currentJourneyId(){
    return document.getElementById("journey-edit-id")?.value ||
      "new-" + (sessionStorage.getItem("toni_v92_new_journey_tmp_id") ||
        (() => {
          const id = (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
          sessionStorage.setItem("toni_v92_new_journey_tmp_id", id);
          return id;
        })());
  }

  function ensureHidden(id){
    let el = document.getElementById(id);
    if(el) return el;

    const group = document.querySelector(".journey-cover-upload-v89, .journey-cover-upload-v90");
    el = document.createElement("input");
    el.type = "hidden";
    el.id = id;
    group?.prepend(el);
    return el;
  }

  function setCoverFields({url="", path="", name="", embedded=""} = {}){
    ensureHidden("journey-cover-image").value = url || embedded || "";
    ensureHidden("journey-cover-name").value = name || "";
    ensureHidden("journey-cover-storage-path").value = path || "";
    ensureHidden("journey-cover-embedded").value = embedded || "";
  }

  function readCoverFields(){
    return {
      cover_image: document.getElementById("journey-cover-image")?.value || "",
      cover_image_name: document.getElementById("journey-cover-name")?.value || "",
      cover_image_path: document.getElementById("journey-cover-storage-path")?.value || "",
      cover_image_embedded: document.getElementById("journey-cover-embedded")?.value || ""
    };
  }

  function ensureUploadUi(){
    const group = document.querySelector(".journey-cover-upload-v89, .journey-cover-upload-v90");
    if(!group) return null;

    group.classList.add("journey-cover-upload-v92");

    let main = group.querySelector(".cover-upload-main-v89");
    if(!main){
      main = document.createElement("div");
      main.className = "cover-upload-main-v89";
      group.appendChild(main);
    }

    let input = group.querySelector("#journey-cover-upload");
    if(!input){
      input = document.createElement("input");
      input.className = "cover-file-input-v89";
      input.id = "journey-cover-upload";
      input.type = "file";
      input.accept = "image/*";
      main.prepend(input);
    }

    input.onchange = window.toniV92HandleCoverUpload;

    let trigger = group.querySelector(".cover-upload-trigger-v90");
    if(!trigger){
      input.insertAdjacentHTML("afterend", `<label class="cover-upload-trigger-v90" for="journey-cover-upload">🖼️ Bild hochladen</label>`);
      trigger = group.querySelector(".cover-upload-trigger-v90");
    }

    let preview = group.querySelector("#journey-cover-preview");
    if(!preview){
      preview = document.createElement("div");
      preview.id = "journey-cover-preview";
      preview.className = "cover-preview-v89 cover-preview-v91 cover-preview-v92 hidden";
      preview.innerHTML = `
        <img id="journey-cover-preview-img" alt="Vorschau Hintergrundbild"/>
        <button type="button" class="cover-clear-btn-v89 cover-clear-btn-v92" onclick="toniV92ClearCoverImage()" title="Bild entfernen" aria-label="Bild entfernen"></button>
      `;
    }

    preview.classList.add("cover-preview-v92");

    let clearBtn = preview.querySelector("button");
    if(clearBtn){
      clearBtn.classList.add("cover-clear-btn-v92");
      clearBtn.textContent = "";
      clearBtn.onclick = window.toniV92ClearCoverImage;
      clearBtn.title = "Bild entfernen";
      clearBtn.setAttribute("aria-label", "Bild entfernen");
    }

    if(trigger && preview.previousElementSibling !== trigger){
      trigger.insertAdjacentElement("afterend", preview);
    }

    let state = group.querySelector(".cover-save-state-v92");
    if(!state){
      state = document.createElement("div");
      state.className = "cover-save-state-v92 hidden";
      state.style.display = "none";
      preview.insertAdjacentElement("afterend", state);
    }

    ensureHidden("journey-cover-image");
    ensureHidden("journey-cover-name");
    ensureHidden("journey-cover-storage-path");
    ensureHidden("journey-cover-embedded");

    return {group, main, input, trigger, preview, state};
  }

  function setState(text, mode="ok"){
    const ui = ensureUploadUi();
    const state = ui?.state;
    if(!state) return;

    state.textContent = text || "";
    state.className = "cover-save-state-v92" + (mode ? " " + mode : "");

    if(text){
      state.style.display = "inline-flex";
    }else{
      state.style.display = "none";
    }
  }

  function setPreview(src, name="", mode="ok"){
    const ui = ensureUploadUi();
    if(!ui) return;

    const img = ui.preview.querySelector("img");
    if(src){
      if(img) img.src = src;
      ui.preview.classList.remove("hidden");
      ui.trigger?.classList.add("cover-has-image-v91");
      if(ui.trigger) ui.trigger.innerHTML = "🖼️ Bild ändern";
      setState(mode === "fallback" ? "lokal gespeichert" : "gespeichert", mode);
    }else{
      if(img) img.removeAttribute("src");
      ui.preview.classList.add("hidden");
      ui.trigger?.classList.remove("cover-has-image-v91");
      if(ui.trigger) ui.trigger.innerHTML = "🖼️ Bild hochladen";
      setState("", "");
    }
  }

  async function uploadCoverToSupabase(dataUrl, fileName){
    const token = await getAccessToken();
    if(!token || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY){
      throw new Error("Keine Supabase-Sitzung für den Upload gefunden.");
    }

    const blob = dataUrlToBlob(dataUrl);
    const path = [
      slug(profileId()),
      slug(currentJourneyId()),
      Date.now() + "-" + slug(fileName || "cover.jpg")
    ].join("/");

    const uploadUrl = `${window.SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`;

    const response = await fetch(uploadUrl, {
      method:"POST",
      headers:{
        "apikey":window.SUPABASE_ANON_KEY,
        "Authorization":"Bearer " + token,
        "Content-Type":blob.type || "image/jpeg",
        "x-upsert":"true"
      },
      body:blob
    });

    if(!response.ok){
      const text = await response.text();
      throw new Error(`Cover-Upload fehlgeschlagen (${response.status}): ${text}`);
    }

    return {
      path,
      publicUrl:`${window.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
    };
  }

  function saveDraft(fields){
    try{
      localStorage.setItem(DRAFT_KEY, JSON.stringify({
        ...fields,
        editId:currentJourneyId(),
        savedAt:new Date().toISOString()
      }));
    }catch(error){
      console.warn("TONI V92: lokaler Cover-Entwurf konnte nicht gespeichert werden:", error);
    }
  }

  window.toniV92HandleCoverUpload = async function(event){
    const input = event?.target;
    const file = input?.files?.[0];

    if(!file){
      window.toniV92ClearCoverImage();
      return;
    }

    if(!file.type?.startsWith("image/")){
      alert("Bitte wähle eine Bilddatei aus.");
      if(input) input.value = "";
      return;
    }

    try{
      ensureUploadUi();
      setState("wird hochgeladen …", "uploading");

      const embedded = await dataUrlFromImage(file);
      setPreview(embedded, file.name, "uploading");
      setCoverFields({url:embedded, name:file.name, embedded});
      saveDraft(readCoverFields());

      try{
        const uploaded = await uploadCoverToSupabase(embedded, file.name);
        setCoverFields({
          url:uploaded.publicUrl,
          path:uploaded.path,
          name:file.name,
          embedded
        });
        setPreview(uploaded.publicUrl, file.name, "ok");
        saveDraft(readCoverFields());
      }catch(uploadError){
        // Fallback: Das Bild bleibt trotzdem sicher im JSON als komprimierte Data-URL.
        console.warn("TONI V92: Supabase Storage nicht verfügbar, speichere eingebettet im journey_json:", uploadError);
        setCoverFields({url:embedded, name:file.name, embedded});
        setPreview(embedded, file.name, "fallback");
        saveDraft(readCoverFields());
      }

      const note = document.querySelector(".cover-upload-note-v89");
      if(note){
        note.textContent = "Bild wurde übernommen und wird mit der Lernreise gespeichert.";
      }
    }catch(error){
      console.error("TONI V92 Bild-Upload:", error);
      setState("Fehler", "err");
      alert("Das Hintergrundbild konnte nicht übernommen werden:\n" + (error.message || error));
    }
  };

  window.toniV92ClearCoverImage = function(){
    const input = document.getElementById("journey-cover-upload");
    if(input) input.value = "";

    setCoverFields({url:"", path:"", name:"", embedded:""});
    setPreview("", "", "");
    saveDraft(readCoverFields());

    const note = document.querySelector(".cover-upload-note-v89");
    if(note){
      note.textContent = "Lade optional ein Hintergrundbild für das Deckblatt der Lernreise hoch. Ohne Upload bleibt der Hintergrund weiß.";
    }
  };

  // alte Handler auf den robusten Handler umleiten
  window.toniV91HandleCoverUpload = window.toniV92HandleCoverUpload;
  window.toniV89HandleCoverUpload = window.toniV92HandleCoverUpload;
  window.toniV91ClearCoverImage = window.toniV92ClearCoverImage;
  window.toniV89ClearCoverImage = window.toniV92ClearCoverImage;

  function coverFromAny(rowOrJourney){
    const j = rowOrJourney?.journey_json || rowOrJourney || {};
    return {
      cover_image: j.cover_image || rowOrJourney?.cover_image || "",
      cover_image_name: j.cover_image_name || rowOrJourney?.cover_image_name || "",
      cover_image_path: j.cover_image_path || rowOrJourney?.cover_image_path || "",
      cover_image_embedded: j.cover_image_embedded || rowOrJourney?.cover_image_embedded || ""
    };
  }

  function applyCoverToFormFromRow(row){
    const cover = coverFromAny(row);
    setCoverFields({
      url:cover.cover_image || cover.cover_image_embedded || "",
      path:cover.cover_image_path || "",
      name:cover.cover_image_name || "",
      embedded:cover.cover_image_embedded || ""
    });
    setPreview(cover.cover_image || cover.cover_image_embedded || "", cover.cover_image_name || "", cover.cover_image_path ? "ok" : (cover.cover_image ? "fallback" : ""));
  }

  function mergeCoverIntoJourney(journey){
    const fields = readCoverFields();
    return {
      ...journey,
      cover_image: fields.cover_image || fields.cover_image_embedded || journey.cover_image || "",
      cover_image_name: fields.cover_image_name || journey.cover_image_name || "",
      cover_image_path: fields.cover_image_path || journey.cover_image_path || "",
      cover_image_embedded: fields.cover_image_embedded || journey.cover_image_embedded || ""
    };
  }

  // buildJourneyFromFormV16 final absichern
  if(typeof window.buildJourneyFromFormV16 === "function" && !window.buildJourneyFromFormV16.__toniV92Wrapped){
    const originalBuild = window.buildJourneyFromFormV16;
    window.buildJourneyFromFormV16 = function(...args){
      return mergeCoverIntoJourney(originalBuild.apply(this, args));
    };
    window.buildJourneyFromFormV16.__toniV92Wrapped = true;
  }

  // rowToJourneyV16 final absichern
  if(typeof window.rowToJourneyV16 === "function" && !window.rowToJourneyV16.__toniV92Wrapped){
    const originalRowToJourney = window.rowToJourneyV16;
    window.rowToJourneyV16 = function(row){
      return {
        ...originalRowToJourney.apply(this, arguments),
        ...coverFromAny(row)
      };
    };
    window.rowToJourneyV16.__toniV92Wrapped = true;
  }

  // Speichern final absichern: Cover vor dem Speichern in JSON übernehmen.
  if(typeof window.saveAdminLearningJourney === "function" && !window.saveAdminLearningJourney.__toniV92Wrapped){
    const originalSave = window.saveAdminLearningJourney;
    window.saveAdminLearningJourney = async function(...args){
      const fieldsBefore = readCoverFields();

      // Falls Vorschau da ist, aber Hidden-Felder durch einen alten Renderer geleert wurden.
      if(!fieldsBefore.cover_image){
        try{
          const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null");
          if(draft?.cover_image && (!draft.editId || draft.editId === currentJourneyId())){
            setCoverFields({
              url:draft.cover_image,
              path:draft.cover_image_path || "",
              name:draft.cover_image_name || "",
              embedded:draft.cover_image_embedded || ""
            });
          }
        }catch{}
      }

      const result = await originalSave.apply(this, args);
      return result;
    };
    window.saveAdminLearningJourney.__toniV92Wrapped = true;
  }

  // Bearbeiten: Cover zuverlässig aus der geladenen Lernreise zurück ins Formular holen.
  if(typeof window.editAdminJourney === "function" && !window.editAdminJourney.__toniV92Wrapped){
    const originalEdit = window.editAdminJourney;
    window.editAdminJourney = function(id){
      const result = originalEdit.apply(this, arguments);
      setTimeout(() => {
        const row = typeof findAdminJourneyRowV16 === "function" ? findAdminJourneyRowV16(id) : null;
        if(row) applyCoverToFormFromRow(row);
      }, 150);
      return result;
    };
    window.editAdminJourney.__toniV92Wrapped = true;
  }

  // Reset: Cover bewusst löschen.
  if(typeof window.resetJourneyEditor === "function" && !window.resetJourneyEditor.__toniV92Wrapped){
    const originalReset = window.resetJourneyEditor;
    window.resetJourneyEditor = function(){
      const result = originalReset.apply(this, arguments);
      window.toniV92ClearCoverImage();
      return result;
    };
    window.resetJourneyEditor.__toniV92Wrapped = true;
  }

  function boot(){
    ensureUploadUi();
    const fields = readCoverFields();
    if(fields.cover_image || fields.cover_image_embedded){
      setPreview(fields.cover_image || fields.cover_image_embedded, fields.cover_image_name || "", fields.cover_image_path ? "ok" : "fallback");
    }
  }

  window.toniV92EnsureCoverUploadUi = boot;

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 100);
    setTimeout(boot, 500);
    setTimeout(boot, 1400);
    setTimeout(boot, 3000);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V92_COVER_TIMER);
      window.TONI_V92_COVER_TIMER = setTimeout(boot, 90);
    });

    observer.observe(document.body, {childList:true, subtree:true});
  });
})();

/* TONI V96 – Fix: Startbildschirm bei 0 % sicher anzeigen */
(function(){
  const startedInThisOpen = new Set();
  let modalWasOpen = false;
  let lastJourneyId = null;

  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV20Escape === "function") return toniV20Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function modal(){
    return document.getElementById("lr-modal");
  }

  function isModalOpen(){
    return modal()?.classList.contains("open");
  }

  function mainCard(){
    return document.querySelector("#lr-modal .lr-main-card");
  }

  function activeJ(){
    try{
      if(typeof activeJourney === "function") return activeJourney();
    }catch(error){
      console.warn("TONI V96: activeJourney nicht verfügbar:", error);
    }
    return null;
  }

  function domProgress(){
    const text = document.getElementById("lr-progress-number")?.textContent || "";
    const match = text.match(/(\d+)/);
    return match ? Number(match[1]) : null;
  }

  function journeyPct(journey){
    try{
      if(typeof journeyProgress === "function"){
        const n = Number(journeyProgress(journey));
        if(Number.isFinite(n)) return Math.max(0, Math.min(100, Math.round(n)));
      }
    }catch{}

    const d = domProgress();
    if(Number.isFinite(d)) return Math.max(0, Math.min(100, Math.round(d)));

    const steps = Array.isArray(journey?.steps) ? journey.steps : [];
    const tasks = steps.flatMap(step => (step.tasks || []).filter(task => task.required !== false));

    if(tasks.length){
      const done = tasks.filter(task =>
        task.status === "done" ||
        task.done === true ||
        task.completed === true
      ).length;
      return Math.round(done / tasks.length * 100);
    }

    return 0;
  }

  function coverImage(journey){
    return journey?.cover_image ||
      journey?.cover_image_embedded ||
      journey?.coverImage ||
      journey?.background_image ||
      journey?.backgroundImage ||
      "";
  }

  function removeOldFullCover(){
    document.querySelectorAll("#lr-modal .lr-modal-body > #lr-cover-screen-v89").forEach(el => el.remove());
    document.querySelector("#lr-modal .lr-detail-grid")?.classList.remove("v89-hidden-before-play");

    const body = document.querySelector("#lr-modal .lr-modal-body");
    if(body) body.dataset.v89Started = "1";
  }

  function removeCover(){
    document.getElementById("lr-start-cover-v96")?.remove();
    mainCard()?.classList.remove("v96-cover-active");
  }

  function htmlForCover(journey){
    const image = coverImage(journey);
    const hasImage = !!image;
    const style = hasImage ? `style="background-image:url('${String(image).replace(/'/g, "%27")}')"` : "";

    return `
      <div class="lr-start-cover-v96 ${hasImage ? "has-image" : "no-image"}" id="lr-start-cover-v96" ${style}>
        <div class="lr-start-cover-content-v96">
          <div>
            <div class="lr-start-cover-label-v96">📘 Startbildschirm</div>
            <h1 class="lr-start-cover-title-v96">${esc(journey?.title || "Lernreise")}</h1>
            <div class="lr-start-cover-subject-v96">${esc(journey?.subject || "Ohne Fach / Bereich")}</div>

            <div class="lr-start-cover-info-v96">
              <div class="lr-start-cover-block-v96">
                <div class="lr-start-cover-block-label-v96">Lernziel</div>
                <div class="lr-start-cover-block-text-v96">${esc(journey?.goal || "Kein Lernziel hinterlegt.")}</div>
              </div>
              <div class="lr-start-cover-block-v96">
                <div class="lr-start-cover-block-label-v96">Beschreibung</div>
                <div class="lr-start-cover-block-text-v96">${esc(journey?.description || "Keine Beschreibung hinterlegt.")}</div>
              </div>
            </div>
          </div>

          <div class="lr-start-cover-play-v96">
            <button type="button" class="lr-start-cover-play-btn-v96" onclick="toniV96StartJourneyFromCover()" aria-label="Lernreise starten">▶</button>
            <div class="lr-start-cover-hint-v96">Lernreise starten</div>
          </div>
        </div>
      </div>
    `;
  }

  function updateModalOpenState(journey){
    const open = isModalOpen();

    if(open && !modalWasOpen){
      startedInThisOpen.clear();
      lastJourneyId = null;
    }

    if(!open && modalWasOpen){
      startedInThisOpen.clear();
      lastJourneyId = null;
      removeCover();
    }

    modalWasOpen = open;

    if(open && journey?.id && String(journey.id) !== lastJourneyId){
      lastJourneyId = String(journey.id);
      startedInThisOpen.delete(String(journey.id));
      removeCover();
    }
  }

  function showCoverIfNeeded(){
    removeOldFullCover();

    const journey = activeJ();
    updateModalOpenState(journey);

    if(!isModalOpen() || !journey?.id){
      removeCover();
      return;
    }

    const currentPct = journeyPct(journey);
    const id = String(journey.id);

    if(currentPct !== 0){
      startedInThisOpen.add(id);
      removeCover();
      return;
    }

    if(startedInThisOpen.has(id)){
      removeCover();
      return;
    }

    const card = mainCard();
    if(!card) return;

    card.classList.add("v96-cover-active");

    const current = document.getElementById("lr-start-cover-v96");
    const html = htmlForCover(journey);

    if(current){
      current.outerHTML = html;
    }else{
      card.insertAdjacentHTML("beforeend", html);
    }
  }

  window.toniV96StartJourneyFromCover = function(){
    const journey = activeJ();
    if(journey?.id){
      startedInThisOpen.add(String(journey.id));
    }

    removeCover();

    const body = document.querySelector("#lr-modal .lr-modal-body");
    if(body) body.dataset.v89Started = "1";
  };

  window.toniV89StartLearningJourney = window.toniV96StartJourneyFromCover;

  function scheduleCoverCheck(){
    setTimeout(showCoverIfNeeded, 40);
    setTimeout(showCoverIfNeeded, 160);
    setTimeout(showCoverIfNeeded, 420);
  }

  [
    "renderLearningJourneyModal",
    "openAdminJourney",
    "startAssignedJourneyV20",
    "syncJourneyToDashboard",
    "openLearningTask",
    "completeLearningTask",
    "closeLearningTask"
  ].forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV96Wrapped){
      const original = window[fnName];
      window[fnName] = function(...args){
        const result = original.apply(this, args);
        scheduleCoverCheck();
        return result;
      };
      window[fnName].__toniV96Wrapped = true;
    }
  });

  if(typeof window.closeLearningJourney === "function" && !window.closeLearningJourney.__toniV96Wrapped){
    const originalClose = window.closeLearningJourney;
    window.closeLearningJourney = function(...args){
      startedInThisOpen.clear();
      lastJourneyId = null;
      removeCover();
      const result = originalClose.apply(this, args);
      scheduleCoverCheck();
      return result;
    };
    window.closeLearningJourney.__toniV96Wrapped = true;
  }

  window.toniV96ShowCoverIfNeeded = showCoverIfNeeded;

  window.addEventListener("DOMContentLoaded", () => {
    scheduleCoverCheck();
    setTimeout(showCoverIfNeeded, 900);
    setTimeout(showCoverIfNeeded, 1800);
    setTimeout(showCoverIfNeeded, 3200);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V96_COVER_TIMER);
      window.TONI_V96_COVER_TIMER = setTimeout(showCoverIfNeeded, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });
})();

/* TONI V97 – Stationen anklickbar, nur aktuelle Station bearbeitbar */
(function(){
  const selectedStepByJourney = new Map();
  let lastJourneyId = null;

  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV20Escape === "function") return toniV20Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function activeJ(){
    try{
      if(typeof activeJourney === "function") return activeJourney();
    }catch(error){
      console.warn("TONI V97: activeJourney nicht verfügbar:", error);
    }
    return null;
  }

  function actualCurrentIndex(journey){
    try{
      if(typeof currentStepIndex === "function") return currentStepIndex(journey);
    }catch{}

    try{
      const steps = journey?.steps || [];
      const idx = steps.findIndex((step, i) => {
        if(typeof stepStatus === "function") return stepStatus(step, i, journey) === "current";
        return false;
      });
      return idx >= 0 ? idx : 0;
    }catch{}

    return 0;
  }

  function statusOf(step, index, journey){
    try{
      if(typeof stepStatus === "function") return stepStatus(step, index, journey);
    }catch{}
    return index === actualCurrentIndex(journey) ? "current" : "locked";
  }

  function currentSelectedIndex(journey){
    if(!journey?.id) return actualCurrentIndex(journey);

    const id = String(journey.id);
    const actual = actualCurrentIndex(journey);

    if(lastJourneyId !== id){
      lastJourneyId = id;
      if(!selectedStepByJourney.has(id)){
        selectedStepByJourney.set(id, actual);
      }
    }

    const saved = selectedStepByJourney.get(id);
    const max = (journey.steps || []).length - 1;

    if(!Number.isFinite(saved) || saved < 0 || saved > max){
      selectedStepByJourney.set(id, actual);
      return actual;
    }

    return saved;
  }

  function setSelectedIndex(journey, index){
    if(!journey?.id) return;
    const max = (journey.steps || []).length - 1;
    const next = Math.max(0, Math.min(max, Number(index) || 0));
    selectedStepByJourney.set(String(journey.id), next);
  }

  function readonlyTaskCard(task, stepStatusValue){
    const titleIcon =
      task.status === "done" || task.done || task.completed ? "✅ " :
      task.status === "in_progress" ? "🟡 " :
      task.status === "locked" || stepStatusValue === "locked" ? "🔒 " :
      "☐ ";

    const doneTag = task.status === "done" || task.done || task.completed
      ? '<span class="lr-task-tag done">erledigt</span>'
      : "";

    const lockedTag = task.status === "locked" || stepStatusValue === "locked"
      ? '<span class="lr-task-tag optional">gesperrt</span>'
      : "";

    const hintClass = task.status === "done" || task.done || task.completed ? "done" : "";
    const hint = task.status === "done" || task.done || task.completed
      ? "Diese Aufgabe ist bereits erledigt. Sie wird hier nur zur Ansicht angezeigt."
      : "Nur die aktuelle Station kann bearbeitet werden.";

    return `
      <div class="lr-task-card v97-readonly ${esc(task.status || "")}">
        <div class="lr-task-title">${titleIcon}${esc(task.title || "Aufgabe")}</div>
        <div class="lr-task-desc">${esc(task.description || "")}</div>
        <div class="lr-task-tags">
          <span class="lr-task-tag">${esc(task.type || "Aufgabe")}</span>
          <span class="lr-task-tag ${task.required ? "required" : "optional"}">${task.required ? "Pflicht" : "optional"}</span>
          ${doneTag}
          ${lockedTag}
        </div>
        <div class="lr-readonly-hint-v97 ${hintClass}">${hint}</div>
      </div>
    `;
  }

  function renderSelectedStepTasks(){
    const journey = activeJ();
    if(!journey?.steps?.length) return;

    const selectedIndex = currentSelectedIndex(journey);
    const actualIndex = actualCurrentIndex(journey);
    const selectedStep = journey.steps[selectedIndex];
    if(!selectedStep) return;

    const st = statusOf(selectedStep, selectedIndex, journey);
    const isEditable = selectedIndex === actualIndex && st === "current";

    const title = document.getElementById("lr-current-title");
    if(title){
      title.innerHTML = `Aufgaben der Station: ${esc(selectedStep.title || "Station")}` +
        (isEditable
          ? ` <span class="lr-station-view-note-v97 current">aktuelle Station · bearbeitbar</span>`
          : ` <span class="lr-station-view-note-v97">nur Ansicht · Bearbeitung nur in aktueller Station</span>`);
    }

    const grid = document.getElementById("lr-task-grid");
    if(grid){
      const tasks = selectedStep.tasks || [];

      if(!tasks.length){
        grid.innerHTML = `<div class="assignment-empty">Diese Station enthält keine Aufgaben.</div>`;
      }else if(isEditable && typeof taskCardHtml === "function"){
        // Nur in der aktuellen Station dürfen die normalen Bearbeitungsbuttons erscheinen.
        grid.innerHTML = tasks
          .filter(task => task.status !== "locked")
          .map(task => taskCardHtml(task))
          .join("");
      }else{
        grid.innerHTML = tasks
          .map(task => readonlyTaskCard(task, st))
          .join("");
      }
    }

    decorateStationCards();
  }

  function decorateStationCards(){
    const journey = activeJ();
    if(!journey?.steps?.length) return;

    const selectedIndex = currentSelectedIndex(journey);
    const actualIndex = actualCurrentIndex(journey);

    document.querySelectorAll("#lr-stations .lr-station-card").forEach((card, index) => {
      card.dataset.v97StepIndex = String(index);
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("title", "Station anzeigen");

      card.classList.toggle("v97-selected", index === selectedIndex);
      card.classList.toggle("v97-actual-current", index === actualIndex);

      if(card.dataset.v97ClickInstalled !== "1"){
        card.dataset.v97ClickInstalled = "1";

        card.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();

          const j = activeJ();
          setSelectedIndex(j, index);
          renderSelectedStepTasks();
        });

        card.addEventListener("keydown", event => {
          if(event.key !== "Enter" && event.key !== " ") return;

          event.preventDefault();
          const j = activeJ();
          setSelectedIndex(j, index);
          renderSelectedStepTasks();
        });
      }
    });
  }

  function removeNextTaskButton(){
    document.querySelectorAll('#lr-modal button[onclick*="startNextLearningTask"]').forEach(btn => btn.remove());
  }

  function applyV97(){
    removeNextTaskButton();
    renderSelectedStepTasks();
  }

  if(typeof window.renderLearningJourneyModal === "function" && !window.renderLearningJourneyModal.__toniV97Wrapped){
    const originalRender = window.renderLearningJourneyModal;

    window.renderLearningJourneyModal = function(...args){
      const result = originalRender.apply(this, args);
      setTimeout(applyV97, 20);
      setTimeout(applyV97, 120);
      return result;
    };

    window.renderLearningJourneyModal.__toniV97Wrapped = true;
  }

  // Nach Statusänderungen die Auswahl sinnvoll halten:
  // Wenn eine Aufgabe erledigt wurde und dadurch eine neue Station aktuell wird,
  // springt die Ansicht automatisch auf die neue aktuelle Station.
  ["completeLearningTask","completeSelectedLearningTask","checkCurrentStation","syncJourneyToDashboard","openLearningJourney","openAdminJourney","startAssignedJourneyV20"].forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV97Wrapped){
      const original = window[fnName];

      window[fnName] = function(...args){
        const before = activeJ();
        const beforeActual = before ? actualCurrentIndex(before) : null;

        const result = original.apply(this, args);

        setTimeout(() => {
          const after = activeJ();
          if(after?.id){
            const afterActual = actualCurrentIndex(after);
            const id = String(after.id);

            if(before?.id === after.id && beforeActual !== null && afterActual !== beforeActual){
              selectedStepByJourney.set(id, afterActual);
            }
          }

          applyV97();
        }, 80);

        return result;
      };

      window[fnName].__toniV97Wrapped = true;
    }
  });

  // Direkte Sicherung: Falls irgendein späterer Renderer den Button wieder einfügt.
  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(applyV97, 400);
    setTimeout(applyV97, 1200);
    setTimeout(applyV97, 2500);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V97_TIMER);
      window.TONI_V97_TIMER = setTimeout(applyV97, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });

  window.toniV97SelectStation = function(index){
    const journey = activeJ();
    setSelectedIndex(journey, index);
    renderSelectedStepTasks();
  };
})();

/* TONI V98 – Station prüfen ersetzen und Lernreise neu starten */
(function(){
  const selectedStepByJourneyV98 = new Map();
  let lastJourneyIdV98 = null;

  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV20Escape === "function") return toniV20Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function activeJ(){
    try{
      if(typeof activeJourney === "function") return activeJourney();
    }catch(error){
      console.warn("TONI V98: activeJourney nicht verfügbar:", error);
    }
    return null;
  }

  function actualCurrentIndex(journey){
    try{
      if(typeof currentStepIndex === "function") return currentStepIndex(journey);
    }catch{}

    try{
      const steps = journey?.steps || [];
      const idx = steps.findIndex((step, i) => {
        if(typeof stepStatus === "function") return stepStatus(step, i, journey) === "current";
        return false;
      });
      return idx >= 0 ? idx : 0;
    }catch{}

    return 0;
  }

  function statusOf(step, index, journey){
    try{
      if(typeof stepStatus === "function") return stepStatus(step, index, journey);
    }catch{}
    return index === actualCurrentIndex(journey) ? "current" : (index < actualCurrentIndex(journey) ? "done" : "locked");
  }

  function selectedIndex(journey){
    if(!journey?.id) return actualCurrentIndex(journey);

    const id = String(journey.id);
    const actual = actualCurrentIndex(journey);

    if(lastJourneyIdV98 !== id){
      lastJourneyIdV98 = id;
      if(!selectedStepByJourneyV98.has(id)){
        selectedStepByJourneyV98.set(id, actual);
      }
    }

    const saved = selectedStepByJourneyV98.get(id);
    const max = (journey.steps || []).length - 1;

    if(!Number.isFinite(saved) || saved < 0 || saved > max){
      selectedStepByJourneyV98.set(id, actual);
      return actual;
    }

    return saved;
  }

  function setSelectedIndex(journey, index){
    if(!journey?.id) return;

    const max = (journey.steps || []).length - 1;
    const next = Math.max(0, Math.min(max, Number(index) || 0));
    selectedStepByJourneyV98.set(String(journey.id), next);
  }

  function readonlyTaskCard(task, stepStatusValue){
    const titleIcon =
      task.status === "done" || task.done || task.completed ? "✅ " :
      task.status === "in_progress" ? "🟡 " :
      task.status === "locked" || stepStatusValue === "locked" ? "🔒 " :
      "☐ ";

    const doneTag = task.status === "done" || task.done || task.completed
      ? '<span class="lr-task-tag done">erledigt</span>'
      : "";

    const lockedTag = task.status === "locked" || stepStatusValue === "locked"
      ? '<span class="lr-task-tag optional">gesperrt</span>'
      : "";

    const hintClass = task.status === "done" || task.done || task.completed ? "done" : "";

    return `
      <div class="lr-task-card v97-readonly ${esc(task.status || "")}">
        <div class="lr-task-title">${titleIcon}${esc(task.title || "Aufgabe")}</div>
        <div class="lr-task-desc">${esc(task.description || "")}</div>
        <div class="lr-task-tags">
          <span class="lr-task-tag">${esc(task.type || "Aufgabe")}</span>
          <span class="lr-task-tag ${task.required ? "required" : "optional"}">${task.required ? "Pflicht" : "optional"}</span>
          ${doneTag}
          ${lockedTag}
        </div>
        <div class="lr-readonly-hint-v97 ${hintClass}">Diese Station liegt nach der aktuellen Station und kann daher nur angesehen werden.</div>
      </div>
    `;
  }

  function renderSelectedStepTasksV98(){
    const journey = activeJ();
    if(!journey?.steps?.length) return;

    const selected = selectedIndex(journey);
    const actual = actualCurrentIndex(journey);
    const step = journey.steps[selected];
    if(!step) return;

    const st = statusOf(step, selected, journey);

    // Wichtig: abgeschlossene Stationen vor der aktuellen Station dürfen korrigiert/bearbeitet werden.
    // Nur Stationen NACH der aktuellen Station sind reine Ansicht.
    const isEditable = selected <= actual && st !== "locked";

    const title = document.getElementById("lr-current-title");
    if(title){
      title.innerHTML = `Aufgaben der Station: ${esc(step.title || "Station")}` +
        (isEditable
          ? ` <span class="lr-station-view-note-v98 editable">${selected < actual ? "abgeschlossen · korrigierbar" : "aktuelle Station · bearbeitbar"}</span>`
          : ` <span class="lr-station-view-note-v98 readonly">nur Ansicht · noch nicht freigeschaltet</span>`);
    }

    const grid = document.getElementById("lr-task-grid");
    if(grid){
      const tasks = step.tasks || [];

      if(!tasks.length){
        grid.innerHTML = `<div class="assignment-empty">Diese Station enthält keine Aufgaben.</div>`;
      }else if(isEditable && typeof taskCardHtml === "function"){
        grid.innerHTML = tasks
          .filter(task => task.status !== "locked" || selected < actual)
          .map(task => {
            // Bei abgeschlossenen Stationen alte gesperrte Einträge ebenfalls ansehen/bearbeiten lassen.
            if(selected < actual && task.status === "locked"){
              return taskCardHtml({...task, status:"todo"});
            }
            return taskCardHtml(task);
          })
          .join("");
      }else{
        grid.innerHTML = tasks.map(task => readonlyTaskCard(task, st)).join("");
      }
    }

    decorateStationCardsV98();
    replaceStationCheckWithRestart();
  }

  function decorateStationCardsV98(){
    const journey = activeJ();
    if(!journey?.steps?.length) return;

    const selected = selectedIndex(journey);
    const actual = actualCurrentIndex(journey);

    document.querySelectorAll("#lr-stations .lr-station-card").forEach((card, index) => {
      card.dataset.v98StepIndex = String(index);
      card.setAttribute("role", "button");
      card.setAttribute("tabindex", "0");
      card.setAttribute("title", index <= actual ? "Station anzeigen und bearbeiten" : "Station ansehen");

      card.classList.toggle("v97-selected", index === selected);
      card.classList.toggle("v98-editable-past", index <= actual);
      card.classList.toggle("v98-future-readonly", index > actual);

      if(card.dataset.v98ClickInstalled !== "1"){
        card.dataset.v98ClickInstalled = "1";

        card.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const j = activeJ();
          setSelectedIndex(j, index);
          renderSelectedStepTasksV98();
        });

        card.addEventListener("keydown", event => {
          if(event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          const j = activeJ();
          setSelectedIndex(j, index);
          renderSelectedStepTasksV98();
        });
      }
    });
  }

  function replaceStationCheckWithRestart(){
    document.querySelectorAll('#lr-modal .card-link[onclick*="checkCurrentStation"]').forEach(link => {
      link.textContent = "Lernreise neu starten";
      link.classList.add("v98-restart-link");
      link.setAttribute("onclick", "toniV98RestartLearningJourney()");
      link.onclick = function(event){
        event?.preventDefault?.();
        window.toniV98RestartLearningJourney();
      };
    });

    // Button „Nächste Aufgabe starten“ bleibt entfernt.
    document.querySelectorAll('#lr-modal button[onclick*="startNextLearningTask"]').forEach(btn => btn.remove());
  }

  function resetTask(task, isFirstStep){
    const reset = {
      ...task,
      status: isFirstStep ? "todo" : "locked",
      done:false,
      completed:false,
      answer:"",
      updated_at:null
    };

    // Pflicht/optional unverändert lassen.
    if(task.required === false || task.optional === true){
      reset.required = false;
    }

    return reset;
  }

  function resetJourney(journey){
    if(!journey?.steps) return journey;

    journey.steps = journey.steps.map((step, index) => ({
      ...step,
      status: index === 0 ? "current" : "locked",
      done:false,
      completed:false,
      tasks:(step.tasks || []).map(task => resetTask(task, index === 0))
    }));

    journey.status = "not_started";
    journey.progress_percent = 0;
    journey.current_station_index = 0;
    journey.active_step_index = 0;
    journey.active_step_id = journey.steps[0]?.id || null;

    return journey;
  }

  async function persistReset(){
    try{
      window.TONI_V40_LAST_SAVE_KEY = "";
      if(typeof toniV40SaveActiveProgressNow === "function"){
        await toniV40SaveActiveProgressNow(true);
      }else if(typeof toniV40DebouncedSave === "function"){
        toniV40DebouncedSave(true);
      }
    }catch(error){
      console.warn("TONI V98: Reset konnte nicht sofort in Supabase gespeichert werden:", error);
    }
  }

  window.toniV98RestartLearningJourney = async function(){
    const journey = activeJ();
    if(!journey) return;

    const title = journey.title || "diese Lernreise";
    const ok = confirm(
      `Soll die Lernreise „${title}“ wirklich neu gestartet werden?\n\n` +
      `Dabei werden alle erledigten Aufgaben, Antworten, Notizen und der Bearbeitungsstand dieser Lernreise auf 0 % zurückgesetzt.`
    );

    if(!ok) return;

    resetJourney(journey);

    if(typeof STATE !== "undefined"){
      STATE.selectedTaskId = null;
      STATE.activeJourneyId = journey.id;
      STATE.learningJourneys = STATE.learningJourneys || [];
      const pos = STATE.learningJourneys.findIndex(j => String(j.id) === String(journey.id));
      if(pos >= 0) STATE.learningJourneys[pos] = journey;
      if(typeof saveState === "function") saveState(STATE);
    }

    selectedStepByJourneyV98.set(String(journey.id), 0);

    try{
      if(typeof syncJourneyToDashboard === "function") syncJourneyToDashboard();
    }catch{}

    try{
      if(typeof renderLearningJourneyModal === "function") renderLearningJourneyModal();
    }catch{}

    renderSelectedStepTasksV98();
    await persistReset();

    if(typeof appendMsg === "function"){
      appendMsg("toni", `🔄 Die Lernreise <strong>${esc(title)}</strong> wurde neu gestartet.`, typeof time === "function" ? time() : "", "desktop");
    }

    // Startbildschirm bei 0 % nach Reset wieder anzeigen, sofern V96 vorhanden ist.
    setTimeout(() => {
      try{
        if(typeof toniV96ShowCoverIfNeeded === "function") toniV96ShowCoverIfNeeded();
      }catch{}
    }, 200);
  };

  function applyV98(){
    replaceStationCheckWithRestart();
    renderSelectedStepTasksV98();
  }

  if(typeof window.renderLearningJourneyModal === "function" && !window.renderLearningJourneyModal.__toniV98Wrapped){
    const originalRender = window.renderLearningJourneyModal;
    window.renderLearningJourneyModal = function(...args){
      const result = originalRender.apply(this, args);
      setTimeout(applyV98, 30);
      setTimeout(applyV98, 160);
      return result;
    };
    window.renderLearningJourneyModal.__toniV98Wrapped = true;
  }

  ["completeLearningTask","completeSelectedLearningTask","syncJourneyToDashboard","openLearningJourney","openAdminJourney","startAssignedJourneyV20"].forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV98Wrapped){
      const original = window[fnName];
      window[fnName] = function(...args){
        const before = activeJ();
        const beforeActual = before ? actualCurrentIndex(before) : null;
        const result = original.apply(this, args);

        setTimeout(() => {
          const after = activeJ();
          if(after?.id){
            const afterActual = actualCurrentIndex(after);
            if(before?.id === after.id && beforeActual !== null && afterActual !== beforeActual){
              selectedStepByJourneyV98.set(String(after.id), afterActual);
            }
          }
          applyV98();
        }, 90);

        return result;
      };
      window[fnName].__toniV98Wrapped = true;
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(applyV98, 500);
    setTimeout(applyV98, 1400);
    setTimeout(applyV98, 2800);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V98_TIMER);
      window.TONI_V98_TIMER = setTimeout(applyV98, 90);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });

  window.toniV98RenderSelectedStepTasks = renderSelectedStepTasksV98;
})();

/* TONI V99 – Passwort statt Sicherheitsabfrage für „Lernreise neu starten“ */
(function(){
  window.TONI_V99_RESTART_PENDING_JOURNEY_ID = null;

  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV20Escape === "function") return toniV20Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function activeJ(){
    try{
      if(typeof activeJourney === "function") return activeJourney();
    }catch(error){
      console.warn("TONI V99: activeJourney nicht verfügbar:", error);
    }
    return null;
  }

  function currentUserEmail(){
    return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.email) ||
      (window.TONI_AUTH_SESSION && window.TONI_AUTH_SESSION.user && window.TONI_AUTH_SESSION.user.email) ||
      localStorage.getItem("toni_email") ||
      "";
  }

  function currentRole(){
    return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) ||
      localStorage.getItem("toni_role") ||
      "student";
  }

  function setMessage(text, type="err"){
    const box = document.getElementById("restart-password-message-v99");
    if(!box) return;
    box.className = "restart-password-message-v99 visible " + type;
    box.innerHTML = text;
  }

  function clearMessage(){
    const box = document.getElementById("restart-password-message-v99");
    if(!box) return;
    box.className = "restart-password-message-v99";
    box.innerHTML = "";
  }

  function setBusy(isBusy){
    const btn = document.getElementById("restart-password-confirm-v99");
    const input = document.getElementById("restart-password-input-v99");
    if(btn){
      btn.disabled = !!isBusy;
      btn.textContent = isBusy ? "Prüfe Passwort …" : "Lernreise neu starten";
    }
    if(input) input.disabled = !!isBusy;
  }

  function getSupabaseAuthClient(){
    try{
      if(typeof getSupabaseClient === "function"){
        const client = getSupabaseClient();
        if(client?.auth) return client;
      }
    }catch{}

    try{
      if(window.supabase?.createClient && window.SUPABASE_URL && window.SUPABASE_ANON_KEY){
        return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      }
    }catch{}

    return null;
  }

  async function verifyPassword(password){
    const role = currentRole();
    const email = currentUserEmail();

    if(role === "superadmin"){
      return password === (window.SUPERADMIN_PASSWORD || "SuperAdmin#");
    }

    if(!email){
      throw new Error("Die E-Mail-Adresse des angemeldeten Nutzers wurde nicht gefunden.");
    }

    const client = getSupabaseAuthClient();
    if(!client?.auth?.signInWithPassword){
      throw new Error("Die Passwortprüfung ist nicht verfügbar.");
    }

    const {error} = await client.auth.signInWithPassword({
      email,
      password
    });

    if(error){
      return false;
    }

    return true;
  }

  function resetTask(task, isFirstStep){
    return {
      ...task,
      status: isFirstStep ? "todo" : "locked",
      done:false,
      completed:false,
      answer:"",
      updated_at:null
    };
  }

  function resetJourney(journey){
    if(!journey?.steps) return journey;

    journey.steps = journey.steps.map((step, index) => ({
      ...step,
      status:index === 0 ? "current" : "locked",
      done:false,
      completed:false,
      tasks:(step.tasks || []).map(task => resetTask(task, index === 0))
    }));

    journey.status = "not_started";
    journey.progress_percent = 0;
    journey.current_station_index = 0;
    journey.active_step_index = 0;
    journey.active_step_id = journey.steps[0]?.id || null;

    return journey;
  }

  async function persistReset(){
    try{
      window.TONI_V40_LAST_SAVE_KEY = "";
      if(typeof toniV40SaveActiveProgressNow === "function"){
        await toniV40SaveActiveProgressNow(true);
      }else if(typeof toniV40DebouncedSave === "function"){
        toniV40DebouncedSave(true);
      }
    }catch(error){
      console.warn("TONI V99: Reset konnte nicht sofort gespeichert werden:", error);
    }
  }

  async function performRestart(){
    const journey = activeJ();
    if(!journey) return;

    const title = journey.title || "diese Lernreise";

    resetJourney(journey);

    if(typeof STATE !== "undefined"){
      STATE.selectedTaskId = null;
      STATE.activeJourneyId = journey.id;
      STATE.learningJourneys = STATE.learningJourneys || [];
      const pos = STATE.learningJourneys.findIndex(j => String(j.id) === String(journey.id));
      if(pos >= 0) STATE.learningJourneys[pos] = journey;
      if(typeof saveState === "function") saveState(STATE);
    }

    try{
      if(typeof toniV97SelectStation === "function"){
        toniV97SelectStation(0);
      }
    }catch{}

    try{
      if(typeof syncJourneyToDashboard === "function") syncJourneyToDashboard();
    }catch{}

    try{
      if(typeof renderLearningJourneyModal === "function") renderLearningJourneyModal();
    }catch{}

    await persistReset();

    if(typeof appendMsg === "function"){
      appendMsg(
        "toni",
        `🔄 Die Lernreise <strong>${esc(title)}</strong> wurde nach Passwortbestätigung neu gestartet.`,
        typeof time === "function" ? time() : "",
        "desktop"
      );
    }

    setTimeout(() => {
      try{
        if(typeof toniV96ShowCoverIfNeeded === "function") toniV96ShowCoverIfNeeded();
      }catch{}
    }, 250);
  }

  window.toniV99OpenRestartPasswordModal = function(){
    const journey = activeJ();
    if(!journey) return;

    window.TONI_V99_RESTART_PENDING_JOURNEY_ID = journey.id;

    const modal = document.getElementById("restart-password-modal-v99");
    const sub = document.getElementById("restart-password-sub-v99");
    const input = document.getElementById("restart-password-input-v99");

    if(sub){
      sub.innerHTML = `Bitte bestätige den Neustart von <strong>${esc(journey.title || "dieser Lernreise")}</strong> durch Eingabe deines Passwortes.`;
    }

    clearMessage();
    setBusy(false);

    if(input){
      input.value = "";
      input.disabled = false;
    }

    modal?.classList.add("open");
    modal?.setAttribute("aria-hidden", "false");

    setTimeout(() => input?.focus(), 120);
  };

  window.toniV99CloseRestartPasswordModal = function(){
    const modal = document.getElementById("restart-password-modal-v99");
    const input = document.getElementById("restart-password-input-v99");

    if(input) input.value = "";
    clearMessage();
    setBusy(false);

    modal?.classList.remove("open");
    modal?.setAttribute("aria-hidden", "true");

    window.TONI_V99_RESTART_PENDING_JOURNEY_ID = null;
  };

  window.toniV99ConfirmRestartWithPassword = async function(){
    const journey = activeJ();
    const pendingId = window.TONI_V99_RESTART_PENDING_JOURNEY_ID;

    if(!journey || !pendingId || String(journey.id) !== String(pendingId)){
      setMessage("Die aktive Lernreise hat sich geändert. Bitte schließe das Fenster und versuche es erneut.", "err");
      return;
    }

    const input = document.getElementById("restart-password-input-v99");
    const password = input?.value || "";

    if(!password){
      setMessage("Bitte gib dein Passwort ein.", "err");
      input?.focus();
      return;
    }

    setBusy(true);
    clearMessage();

    try{
      const ok = await verifyPassword(password);

      if(!ok){
        setBusy(false);
        setMessage("Das Passwort ist nicht korrekt. Die Lernreise wurde nicht zurückgesetzt.", "err");
        input?.focus();
        input?.select();
        return;
      }

      setMessage("Passwort bestätigt. Die Lernreise wird neu gestartet …", "ok");

      await performRestart();

      window.toniV99CloseRestartPasswordModal();
    }catch(error){
      console.error("TONI V99 Passwortprüfung:", error);
      setBusy(false);
      setMessage("Die Passwortprüfung konnte nicht durchgeführt werden:<br>" + esc(error.message || error), "err");
    }
  };

  // V98-Funktion überschreiben: keine confirm-Abfrage mehr, sondern Passwortmodal.
  window.toniV98RestartLearningJourney = window.toniV99OpenRestartPasswordModal;

  function replaceRestartLink(){
    document.querySelectorAll('#lr-modal .card-link[onclick*="checkCurrentStation"], #lr-modal .card-link[onclick*="toniV98RestartLearningJourney"]').forEach(link => {
      link.textContent = "Lernreise neu starten";
      link.classList.add("v98-restart-link");
      link.setAttribute("onclick", "toniV99OpenRestartPasswordModal()");
      link.onclick = function(event){
        event?.preventDefault?.();
        window.toniV99OpenRestartPasswordModal();
      };
    });
  }

  function boot(){
    replaceRestartLink();

    // Modal bei Escape schließen
    if(document.body.dataset.toniV99EscInstalled !== "1"){
      document.body.dataset.toniV99EscInstalled = "1";
      document.addEventListener("keydown", event => {
        if(event.key === "Escape" && document.getElementById("restart-password-modal-v99")?.classList.contains("open")){
          window.toniV99CloseRestartPasswordModal();
        }
      });
    }
  }

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 200);
    setTimeout(boot, 900);
    setTimeout(boot, 1800);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V99_TIMER);
      window.TONI_V99_TIMER = setTimeout(boot, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });
})();

/* TONI V100 – Fix: Klick auf „Lernreise neu starten“ öffnet Passwortdialog */
(function(){
  window.TONI_V100_RESTART_PENDING_JOURNEY_ID = null;

  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV20Escape === "function") return toniV20Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function activeJ(){
    try{
      if(typeof activeJourney === "function") return activeJourney();
    }catch(error){
      console.warn("TONI V100: activeJourney nicht verfügbar:", error);
    }
    return null;
  }

  function currentUserEmail(){
    return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.email) ||
      (window.TONI_AUTH_SESSION && window.TONI_AUTH_SESSION.user && window.TONI_AUTH_SESSION.user.email) ||
      localStorage.getItem("toni_email") ||
      "";
  }

  function currentRole(){
    return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) ||
      localStorage.getItem("toni_role") ||
      "student";
  }

  function msg(text, type="err"){
    const box = document.getElementById("restart-password-message-v100");
    if(!box) return;
    box.className = "restart-password-message-v100 visible " + type;
    box.innerHTML = text;
  }

  function clearMsg(){
    const box = document.getElementById("restart-password-message-v100");
    if(!box) return;
    box.className = "restart-password-message-v100";
    box.innerHTML = "";
  }

  function busy(isBusy){
    const btn = document.getElementById("restart-password-confirm-v100");
    const input = document.getElementById("restart-password-input-v100");
    if(btn){
      btn.disabled = !!isBusy;
      btn.textContent = isBusy ? "Prüfe Passwort …" : "Lernreise neu starten";
    }
    if(input) input.disabled = !!isBusy;
  }

  function getClient(){
    try{
      if(typeof getSupabaseClient === "function"){
        const client = getSupabaseClient();
        if(client?.auth) return client;
      }
    }catch{}

    try{
      if(window.supabase?.createClient && window.SUPABASE_URL && window.SUPABASE_ANON_KEY){
        return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      }
    }catch{}

    return null;
  }

  async function verifyPassword(password){
    const role = currentRole();
    const email = currentUserEmail();

    if(role === "superadmin"){
      return password === (window.SUPERADMIN_PASSWORD || "SuperAdmin#");
    }

    if(!email){
      throw new Error("Die E-Mail-Adresse des angemeldeten Nutzers wurde nicht gefunden.");
    }

    const client = getClient();
    if(!client?.auth?.signInWithPassword){
      throw new Error("Die Passwortprüfung ist nicht verfügbar.");
    }

    const {error} = await client.auth.signInWithPassword({email, password});
    return !error;
  }

  function resetTask(task, isFirstStep){
    return {
      ...task,
      status:isFirstStep ? "todo" : "locked",
      done:false,
      completed:false,
      answer:"",
      updated_at:null
    };
  }

  function resetJourney(journey){
    if(!journey?.steps) return journey;

    journey.steps = journey.steps.map((step, index) => ({
      ...step,
      status:index === 0 ? "current" : "locked",
      done:false,
      completed:false,
      tasks:(step.tasks || []).map(task => resetTask(task, index === 0))
    }));

    journey.status = "not_started";
    journey.progress_percent = 0;
    journey.current_station_index = 0;
    journey.active_step_index = 0;
    journey.active_step_id = journey.steps[0]?.id || null;

    return journey;
  }

  async function persistReset(){
    try{
      window.TONI_V40_LAST_SAVE_KEY = "";
      if(typeof toniV40SaveActiveProgressNow === "function"){
        await toniV40SaveActiveProgressNow(true);
      }else if(typeof toniV40DebouncedSave === "function"){
        toniV40DebouncedSave(true);
      }
    }catch(error){
      console.warn("TONI V100: Reset konnte nicht sofort gespeichert werden:", error);
    }
  }

  async function performRestart(){
    const journey = activeJ();
    if(!journey) return;

    const title = journey.title || "diese Lernreise";
    resetJourney(journey);

    if(typeof STATE !== "undefined"){
      STATE.selectedTaskId = null;
      STATE.activeJourneyId = journey.id;
      STATE.learningJourneys = STATE.learningJourneys || [];
      const pos = STATE.learningJourneys.findIndex(j => String(j.id) === String(journey.id));
      if(pos >= 0) STATE.learningJourneys[pos] = journey;
      if(typeof saveState === "function") saveState(STATE);
    }

    try{
      if(typeof syncJourneyToDashboard === "function") syncJourneyToDashboard();
    }catch{}

    try{
      if(typeof renderLearningJourneyModal === "function") renderLearningJourneyModal();
    }catch{}

    try{
      if(typeof toniV97SelectStation === "function") toniV97SelectStation(0);
    }catch{}

    await persistReset();

    if(typeof appendMsg === "function"){
      appendMsg(
        "toni",
        `🔄 Die Lernreise <strong>${esc(title)}</strong> wurde nach Passwortbestätigung neu gestartet.`,
        typeof time === "function" ? time() : "",
        "desktop"
      );
    }

    setTimeout(() => {
      try{
        if(typeof toniV96ShowCoverIfNeeded === "function") toniV96ShowCoverIfNeeded();
      }catch{}
    }, 250);
  }

  window.toniV100OpenRestartPasswordModal = function(){
    const journey = activeJ();
    if(!journey) return;

    window.TONI_V100_RESTART_PENDING_JOURNEY_ID = journey.id;

    const modal = document.getElementById("restart-password-modal-v100");
    const sub = document.getElementById("restart-password-sub-v100");
    const input = document.getElementById("restart-password-input-v100");

    if(sub){
      sub.innerHTML = `Bitte bestätige den Neustart von <strong>${esc(journey.title || "dieser Lernreise")}</strong> durch Eingabe deines Passwortes.`;
    }

    clearMsg();
    busy(false);

    if(input){
      input.value = "";
      input.disabled = false;
    }

    modal?.classList.add("open");
    modal?.setAttribute("aria-hidden", "false");
    setTimeout(() => input?.focus(), 120);
  };

  window.toniV100CloseRestartPasswordModal = function(){
    const modal = document.getElementById("restart-password-modal-v100");
    const input = document.getElementById("restart-password-input-v100");

    if(input) input.value = "";
    clearMsg();
    busy(false);

    modal?.classList.remove("open");
    modal?.setAttribute("aria-hidden", "true");
    window.TONI_V100_RESTART_PENDING_JOURNEY_ID = null;
  };

  window.toniV100ConfirmRestartWithPassword = async function(){
    const journey = activeJ();
    const pendingId = window.TONI_V100_RESTART_PENDING_JOURNEY_ID;

    if(!journey || !pendingId || String(journey.id) !== String(pendingId)){
      msg("Die aktive Lernreise hat sich geändert. Bitte schließe das Fenster und versuche es erneut.", "err");
      return;
    }

    const input = document.getElementById("restart-password-input-v100");
    const password = input?.value || "";

    if(!password){
      msg("Bitte gib dein Passwort ein.", "err");
      input?.focus();
      return;
    }

    busy(true);
    clearMsg();

    try{
      const ok = await verifyPassword(password);

      if(!ok){
        busy(false);
        msg("Das Passwort ist nicht korrekt. Die Lernreise wurde nicht zurückgesetzt.", "err");
        input?.focus();
        input?.select();
        return;
      }

      msg("Passwort bestätigt. Die Lernreise wird neu gestartet …", "ok");
      await performRestart();
      window.toniV100CloseRestartPasswordModal();
    }catch(error){
      console.error("TONI V100 Passwortprüfung:", error);
      busy(false);
      msg("Die Passwortprüfung konnte nicht durchgeführt werden:<br>" + esc(error.message || error), "err");
    }
  };

  // Alte Neustartfunktionen auf den Passwortdialog umleiten.
  window.toniV98RestartLearningJourney = window.toniV100OpenRestartPasswordModal;
  window.toniV99OpenRestartPasswordModal = window.toniV100OpenRestartPasswordModal;

  function replaceRestartLink(){
    document.querySelectorAll('#lr-modal .card-link').forEach(link => {
      const txt = (link.textContent || "").trim();
      const on = link.getAttribute("onclick") || "";

      if(txt === "Station prüfen" || txt === "Lernreise neu starten" || on.includes("checkCurrentStation") || on.includes("toniV98RestartLearningJourney") || on.includes("toniV99OpenRestartPasswordModal")){
        link.textContent = "Lernreise neu starten";
        link.classList.add("v98-restart-link", "v100-restart-link");
        link.setAttribute("onclick", "toniV100OpenRestartPasswordModal()");
        link.onclick = function(event){
          event?.preventDefault?.();
          event?.stopPropagation?.();
          window.toniV100OpenRestartPasswordModal();
          return false;
        };
      }
    });
  }

  function boot(){
    replaceRestartLink();

    if(document.body.dataset.toniV100DelegationInstalled !== "1"){
      document.body.dataset.toniV100DelegationInstalled = "1";

      document.addEventListener("click", event => {
        const link = event.target.closest?.("#lr-modal .card-link, #lr-modal .v98-restart-link, #lr-modal .v100-restart-link");
        if(!link) return;

        const txt = (link.textContent || "").trim();
        const on = link.getAttribute("onclick") || "";

        if(txt === "Lernreise neu starten" || on.includes("toniV100OpenRestartPasswordModal") || on.includes("toniV98RestartLearningJourney") || on.includes("toniV99OpenRestartPasswordModal")){
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
          window.toniV100OpenRestartPasswordModal();
        }
      }, true);

      document.addEventListener("keydown", event => {
        if(event.key === "Escape" && document.getElementById("restart-password-modal-v100")?.classList.contains("open")){
          window.toniV100CloseRestartPasswordModal();
        }
      });
    }
  }

  ["renderLearningJourneyModal","syncJourneyToDashboard","openLearningJourney","openAdminJourney","startAssignedJourneyV20"].forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV100Wrapped){
      const original = window[fnName];
      window[fnName] = function(...args){
        const result = original.apply(this, args);
        setTimeout(boot, 40);
        setTimeout(boot, 180);
        return result;
      };
      window[fnName].__toniV100Wrapped = true;
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 200);
    setTimeout(boot, 900);
    setTimeout(boot, 1800);
    setTimeout(boot, 3200);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V100_TIMER);
      window.TONI_V100_TIMER = setTimeout(boot, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });
})();

/* TONI V101 – Fix: zu 100 % abgeschlossene Lernreisen sicher zurücksetzen */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV20Escape === "function") return toniV20Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function setMsg(text, type="err"){
    const box = document.getElementById("restart-password-message-v100");
    if(!box) return;
    box.className = "restart-password-message-v100 visible " + type;
    box.innerHTML = text;
  }

  function setBusy(isBusy, label){
    const btn = document.getElementById("restart-password-confirm-v100");
    const input = document.getElementById("restart-password-input-v100");
    if(btn){
      btn.disabled = !!isBusy;
      btn.textContent = label || (isBusy ? "Bitte warten …" : "Lernreise neu starten");
    }
    if(input) input.disabled = !!isBusy;
  }

  function currentRole(){
    return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) ||
      localStorage.getItem("toni_role") ||
      "student";
  }

  function currentEmail(){
    return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.email) ||
      (window.TONI_AUTH_SESSION && window.TONI_AUTH_SESSION.user && window.TONI_AUTH_SESSION.user.email) ||
      localStorage.getItem("toni_email") ||
      "";
  }

  function getClient(){
    try{
      if(typeof getSupabaseClient === "function"){
        const client = getSupabaseClient();
        if(client?.auth) return client;
      }
    }catch{}

    try{
      if(window.supabase?.createClient && window.SUPABASE_URL && window.SUPABASE_ANON_KEY){
        return window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
      }
    }catch{}

    return null;
  }

  async function verifyPasswordV101(password){
    if(currentRole() === "superadmin"){
      return password === (window.SUPERADMIN_PASSWORD || "SuperAdmin#");
    }

    const email = currentEmail();
    if(!email){
      throw new Error("Die E-Mail-Adresse des angemeldeten Nutzers wurde nicht gefunden.");
    }

    const client = getClient();
    if(!client?.auth?.signInWithPassword){
      throw new Error("Die Passwortprüfung ist nicht verfügbar.");
    }

    const {error} = await client.auth.signInWithPassword({email, password});
    return !error;
  }

  function rawActiveJourneyFromState(){
    try{
      if(typeof ensureLearningState === "function") ensureLearningState();
    }catch{}

    if(typeof STATE === "undefined") return null;

    STATE.learningJourneys = STATE.learningJourneys || [];
    return STATE.learningJourneys.find(j => String(j.id) === String(STATE.activeJourneyId)) || STATE.learningJourneys[0] || null;
  }

  function activeJourneyId(){
    const pending = window.TONI_V100_RESTART_PENDING_JOURNEY_ID || window.TONI_V99_RESTART_PENDING_JOURNEY_ID;
    if(pending) return String(pending);

    const raw = rawActiveJourneyFromState();
    if(raw?.id) return String(raw.id);

    try{
      const j = typeof activeJourney === "function" ? activeJourney() : null;
      if(j?.id) return String(j.id);
    }catch{}

    return "";
  }

  function stripCompletedOverrides(journeyId){
    if(!journeyId) return;

    try{ window.TONI_V88_COMPLETED_VIEW_IDS?.delete?.(String(journeyId)); }catch{}
    try{ window.TONI_V88_COMPLETED_JOURNEYS?.delete?.(String(journeyId)); }catch{}
    try{ window.TONI_V95_COVER_STARTED?.delete?.(String(journeyId)); }catch{}
    try{ window.TONI_V96_COVER_STARTED?.delete?.(String(journeyId)); }catch{}

    document.body?.classList?.remove("toni-v88-completed-view");

    // DOM-Sicherungen aus der harten 100%-Ansicht entfernen
    document.querySelectorAll(".lr-task-card.done").forEach(el => {
      // Klassen nicht blind entfernen, da später frisch gerendert wird.
    });
  }

  function resetTaskV101(task, isFirstStep){
    return {
      ...task,
      status: isFirstStep ? "todo" : "locked",
      done:false,
      completed:false,
      answer:"",
      updated_at:null
    };
  }

  function resetJourneyObject(journey){
    if(!journey) return journey;

    const copy = JSON.parse(JSON.stringify(journey));

    copy.status = "not_started";
    copy.progress_percent = 0;
    copy.current_station_index = 0;
    copy.active_step_index = 0;
    copy.selected_task_id = null;

    copy.steps = (copy.steps || []).map((step, index) => ({
      ...step,
      status:index === 0 ? "current" : "locked",
      done:false,
      completed:false,
      tasks:(step.tasks || []).map(task => resetTaskV101(task, index === 0))
    }));

    copy.active_step_id = copy.steps[0]?.id || null;

    return copy;
  }

  function putResetJourneyIntoState(resetJourney){
    if(!resetJourney?.id || typeof STATE === "undefined") return;

    STATE.learningJourneys = STATE.learningJourneys || [];
    const pos = STATE.learningJourneys.findIndex(j => String(j.id) === String(resetJourney.id));

    if(pos >= 0) STATE.learningJourneys[pos] = resetJourney;
    else STATE.learningJourneys.push(resetJourney);

    STATE.activeJourneyId = resetJourney.id;
    STATE.selectedTaskId = null;

    if(typeof saveState === "function") saveState(STATE);
  }

  async function saveResetToSupabase(resetJourney){
    if(!resetJourney?.id) return;

    try{
      // zuerst den V40-Cache zurücksetzen, sonst kann die Speicherroutine identische/alte States überspringen
      window.TONI_V40_LAST_SAVE_KEY = "";
      window.TONI_V40_PROGRESS_LOADING = false;

      if(typeof toniV40Snapshot === "function" && typeof supabaseRequest === "function" && typeof toniV40IsUuid === "function" && toniV40IsUuid(resetJourney.id)){
        const snapshot = toniV40Snapshot(resetJourney);
        snapshot.progress_percent = 0;
        snapshot.status = "not_started";
        snapshot.active_step_index = 0;
        snapshot.active_step_id = resetJourney.steps?.[0]?.id || null;
        snapshot.selected_task_id = null;

        await supabaseRequest("rpc/save_my_learning_journey_progress", {
          method:"POST",
          body:JSON.stringify({
            p_template_id: resetJourney.id,
            p_progress_json: snapshot,
            p_active_step_id: snapshot.active_step_id,
            p_active_step_index: 0,
            p_selected_task_id: null,
            p_progress_percent: 0,
            p_status: "not_started"
          })
        });

        window.TONI_V40_LAST_SAVE_KEY = "";
        if(typeof toniV40Indicator === "function") toniV40Indicator("Lernreise wurde auf 0 % zurückgesetzt", "ok");
        return;
      }

      if(typeof toniV40SaveActiveProgressNow === "function"){
        window.TONI_V40_LAST_SAVE_KEY = "";
        await toniV40SaveActiveProgressNow(true);
      }
    }catch(error){
      console.error("TONI V101 Reset speichern:", error);
      if(typeof toniV40Indicator === "function") toniV40Indicator("Reset konnte nicht gespeichert werden", "err");
      throw error;
    }
  }

  function rerenderAfterReset(resetJourney){
    stripCompletedOverrides(resetJourney.id);
    putResetJourneyIntoState(resetJourney);

    try{ if(typeof syncJourneyToDashboard === "function") syncJourneyToDashboard(); }catch{}
    stripCompletedOverrides(resetJourney.id);
    putResetJourneyIntoState(resetJourney);

    try{ if(typeof renderLearningJourneyModal === "function") renderLearningJourneyModal(); }catch{}
    stripCompletedOverrides(resetJourney.id);
    putResetJourneyIntoState(resetJourney);

    try{ if(typeof toniV97SelectStation === "function") toniV97SelectStation(0); }catch{}
    try{ if(typeof toniV98RenderSelectedStepTasks === "function") toniV98RenderSelectedStepTasks(); }catch{}

    // DOM direkt korrigieren, falls ältere Wrapper noch einmal 100 % injizieren
    const number = document.getElementById("lr-progress-number");
    const fill = document.getElementById("lr-progress-fill");
    if(number) number.textContent = "0%";
    if(fill) fill.style.width = "0%";

    document.body.classList.remove("toni-v88-completed-view");
  }

  async function performHardResetV101(){
    const id = activeJourneyId();
    if(!id) throw new Error("Die aktive Lernreise wurde nicht gefunden.");

    stripCompletedOverrides(id);

    const raw = rawActiveJourneyFromState();
    let source = raw;

    // Falls activeJourney wegen alter Wrapper noch 100 % liefert, trotzdem auf dem STATE-Original arbeiten.
    if(!source || String(source.id) !== String(id)){
      try{
        const maybe = typeof activeJourney === "function" ? activeJourney() : null;
        if(maybe?.id) source = maybe;
      }catch{}
    }

    if(!source) throw new Error("Die aktive Lernreise konnte nicht zurückgesetzt werden.");

    const resetJourney = resetJourneyObject(source);
    resetJourney.id = id;

    // Entscheidend: erst alle Completed-Overrides löschen, dann State setzen, dann speichern.
    stripCompletedOverrides(id);
    putResetJourneyIntoState(resetJourney);
    rerenderAfterReset(resetJourney);

    await saveResetToSupabase(resetJourney);

    // Nach dem Speichern erneut absichern, da V40/sync nochmal rendern kann.
    stripCompletedOverrides(id);
    putResetJourneyIntoState(resetJourney);
    rerenderAfterReset(resetJourney);

    setTimeout(() => {
      stripCompletedOverrides(id);
      putResetJourneyIntoState(resetJourney);
      rerenderAfterReset(resetJourney);
      try{ if(typeof toniV96ShowCoverIfNeeded === "function") toniV96ShowCoverIfNeeded(); }catch{}
    }, 250);

    setTimeout(() => {
      stripCompletedOverrides(id);
      putResetJourneyIntoState(resetJourney);
      const number = document.getElementById("lr-progress-number");
      const fill = document.getElementById("lr-progress-fill");
      if(number) number.textContent = "0%";
      if(fill) fill.style.width = "0%";
    }, 900);

    if(typeof appendMsg === "function"){
      appendMsg(
        "toni",
        `🔄 Die Lernreise <strong>${esc(resetJourney.title || "Lernreise")}</strong> wurde vollständig auf <strong>0 %</strong> zurückgesetzt.`,
        typeof time === "function" ? time() : "",
        "desktop"
      );
    }
  }

  window.toniV101ConfirmRestartWithPassword = async function(){
    const input = document.getElementById("restart-password-input-v100");
    const password = input?.value || "";

    if(!password){
      setMsg("Bitte gib dein Passwort ein.", "err");
      input?.focus();
      return;
    }

    setBusy(true, "Prüfe Passwort …");
    setMsg("Passwort wird geprüft …", "resetting-v101");

    try{
      const ok = await verifyPasswordV101(password);

      if(!ok){
        setBusy(false);
        setMsg("Das Passwort ist nicht korrekt. Die Lernreise wurde nicht zurückgesetzt.", "err");
        input?.focus();
        input?.select();
        return;
      }

      setBusy(true, "Setze zurück …");
      setMsg("Passwort bestätigt. Die Lernreise wird vollständig auf 0 % zurückgesetzt …", "resetting-v101");

      await performHardResetV101();

      if(typeof toniV100CloseRestartPasswordModal === "function"){
        toniV100CloseRestartPasswordModal();
      }else{
        document.getElementById("restart-password-modal-v100")?.classList.remove("open");
      }
    }catch(error){
      console.error("TONI V101 Neustart:", error);
      setBusy(false);
      setMsg("Die Lernreise konnte nicht sicher zurückgesetzt werden:<br>" + esc(error.message || error), "err");
    }
  };

  function patchRestartDialog(){
    const btn = document.getElementById("restart-password-confirm-v100");
    const input = document.getElementById("restart-password-input-v100");

    if(btn){
      btn.setAttribute("onclick", "toniV101ConfirmRestartWithPassword()");
      btn.onclick = function(event){
        event?.preventDefault?.();
        window.toniV101ConfirmRestartWithPassword();
      };
    }

    if(input){
      input.onkeydown = function(event){
        if(event.key === "Enter"){
          event.preventDefault();
          window.toniV101ConfirmRestartWithPassword();
        }
      };
    }
  }

  // Alle älteren Confirm-Funktionen auf die robuste V101-Funktion umleiten.
  window.toniV100ConfirmRestartWithPassword = window.toniV101ConfirmRestartWithPassword;
  window.toniV99ConfirmRestartWithPassword = window.toniV101ConfirmRestartWithPassword;

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(patchRestartDialog, 100);
    setTimeout(patchRestartDialog, 800);
    setTimeout(patchRestartDialog, 1800);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V101_TIMER);
      window.TONI_V101_TIMER = setTimeout(patchRestartDialog, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true
    });
  });
})();

/* TONI V102 – YouTube-Link bei Aufgabentyp Video prüfen, Vorschau anzeigen und speichern */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV17Escape === "function") return toniV17Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function uuid(){
    try{
      if(typeof toniV17Uuid === "function") return toniV17Uuid();
      if(typeof uuidLikeV16 === "function") return uuidLikeV16();
      return crypto.randomUUID();
    }catch{
      return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    }
  }

  function parseYouTubeUrl(value){
    const raw = String(value || "").trim();

    if(!raw){
      return {ok:false, reason:"Bitte füge einen YouTube-Link ein."};
    }

    let url;
    try{
      url = new URL(raw);
    }catch{
      return {ok:false, reason:"Der Link ist keine gültige URL."};
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    let id = "";

    if(host === "youtu.be"){
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    }else if(host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com"){
      const parts = url.pathname.split("/").filter(Boolean);

      if(url.pathname === "/watch"){
        id = url.searchParams.get("v") || "";
      }else if(parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live"){
        id = parts[1] || "";
      }
    }else{
      return {ok:false, reason:"Bitte verwende einen YouTube-Link, z. B. https://www.youtube.com/watch?v=VIDEOID."};
    }

    id = String(id || "").trim();

    if(!/^[A-Za-z0-9_-]{11}$/.test(id)){
      return {ok:false, reason:"Der YouTube-Link enthält keine gültige Video-ID."};
    }

    return {
      ok:true,
      id,
      url:`https://www.youtube.com/watch?v=${id}`,
      embed_url:`https://www.youtube.com/embed/${id}`,
      thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  }

  window.toniV102ParseYouTubeUrl = parseYouTubeUrl;

  function ensureVideoField(){
    const type = document.getElementById("task-type");
    const desc = document.getElementById("task-description");

    if(!type || !desc) return null;

    let field = document.getElementById("task-youtube-field-v102");

    if(!field){
      field = document.createElement("div");
      field.className = "youtube-task-field-v102";
      field.id = "task-youtube-field-v102";
      field.innerHTML = `
        <label class="lr-form-label" for="task-youtube-url-v102">YouTube-Link zum Video</label>
        <div class="youtube-input-row-v102">
          <input class="youtube-url-input-v102" id="task-youtube-url-v102" type="url" inputmode="url" placeholder="z. B. https://www.youtube.com/watch?v=VIDEOID"/>
          <button type="button" class="youtube-check-btn-v102" onclick="toniV102ValidateYouTubeField(true)">Link prüfen</button>
        </div>
        <div class="youtube-status-v102" id="task-youtube-status-v102">Bitte füge einen YouTube-Link ein.</div>
        <div class="youtube-preview-v102" id="task-youtube-preview-v102">
          <img id="task-youtube-thumb-v102" alt="YouTube-Vorschau"/>
          <div class="youtube-preview-info-v102">
            <strong>YouTube-Video erkannt</strong>
            <span id="task-youtube-id-v102"></span>
          </div>
        </div>
      `;

      const descGroup = desc.closest(".lr-form-group") || desc.parentElement;
      descGroup?.insertAdjacentElement("afterend", field);
    }

    if(type.dataset.v102Installed !== "1"){
      type.dataset.v102Installed = "1";
      type.addEventListener("change", updateVideoFieldVisibility);
    }

    const input = document.getElementById("task-youtube-url-v102");
    if(input && input.dataset.v102Installed !== "1"){
      input.dataset.v102Installed = "1";
      input.addEventListener("input", () => {
        clearTimeout(window.TONI_V102_YT_TIMER);
        window.TONI_V102_YT_TIMER = setTimeout(() => toniV102ValidateYouTubeField(false), 300);
      });
      input.addEventListener("blur", () => toniV102ValidateYouTubeField(false));
    }

    updateVideoFieldVisibility();
    return field;
  }

  function setStatus(text, type=""){
    const status = document.getElementById("task-youtube-status-v102");
    if(!status) return;
    status.textContent = text || "";
    status.className = "youtube-status-v102 " + type;
  }

  function setPreview(result){
    const preview = document.getElementById("task-youtube-preview-v102");
    const img = document.getElementById("task-youtube-thumb-v102");
    const idLabel = document.getElementById("task-youtube-id-v102");

    if(result?.ok){
      if(img) img.src = result.thumbnail;
      if(idLabel) idLabel.textContent = `Video-ID: ${result.id}`;
      preview?.classList.add("visible");
    }else{
      if(img) img.removeAttribute("src");
      if(idLabel) idLabel.textContent = "";
      preview?.classList.remove("visible");
    }
  }

  function updateVideoFieldVisibility(){
    const type = document.getElementById("task-type");
    const field = document.getElementById("task-youtube-field-v102");

    if(!type || !field) return;

    const visible = String(type.value || "").toLowerCase() === "video";
    field.classList.toggle("visible", visible);

    if(visible){
      toniV102ValidateYouTubeField(false);
    }
  }

  window.toniV102ValidateYouTubeField = function(showAlert=false){
    ensureVideoField();

    const type = document.getElementById("task-type")?.value || "";
    if(String(type).toLowerCase() !== "video"){
      setPreview(null);
      setStatus("", "");
      return {ok:true, notVideo:true};
    }

    const input = document.getElementById("task-youtube-url-v102");
    const result = parseYouTubeUrl(input?.value || "");

    if(result.ok){
      setStatus("Gültiger YouTube-Link. Die Vorschau wurde geladen.", "ok");
      setPreview(result);
      return result;
    }

    setStatus(result.reason, "err");
    setPreview(null);

    if(showAlert){
      alert(result.reason);
      input?.focus();
    }

    return result;
  };

  function clearVideoField(){
    const input = document.getElementById("task-youtube-url-v102");
    if(input) input.value = "";
    setStatus("Bitte füge einen YouTube-Link ein.", "");
    setPreview(null);
    updateVideoFieldVisibility();
  }

  function buildTaskFromForm(){
    const type = document.getElementById("task-type")?.value || "Aufgabe";
    const title = document.getElementById("task-title")?.value.trim();
    const description = document.getElementById("task-description")?.value.trim();
    const required = document.getElementById("task-required")?.checked !== false;

    if(!title){
      alert("Bitte gib einen Aufgabentitel ein.");
      return null;
    }

    const task = {
      id:"task-" + uuid(),
      title,
      type,
      description:description || "",
      content:description || title,
      required,
      status:"todo"
    };

    if(String(type).toLowerCase() === "video"){
      const yt = window.toniV102ValidateYouTubeField(true);

      if(!yt.ok){
        return null;
      }

      task.youtube_url = yt.url;
      task.youtube_video_id = yt.id;
      task.youtube_thumbnail = yt.thumbnail;
      task.youtube_embed_url = yt.embed_url;

      // Alias-Felder für spätere Auswertung/Kompatibilität
      task.video_url = yt.url;
      task.video_id = yt.id;
      task.video_thumbnail = yt.thumbnail;
      task.content = description || yt.url;
    }

    return task;
  }

  // Originale Funktion ersetzen, damit Video-Metadaten mit in die Aufgabe geschrieben werden.
  window.addTaskToStationBuilder = function(){
    ensureVideoField();

    const task = buildTaskFromForm();
    if(!task) return;

    window.TONI_CURRENT_STATION_TASKS = window.TONI_CURRENT_STATION_TASKS || [];
    window.TONI_CURRENT_STATION_TASKS.push(task);

    clearTaskBuilderV102();
    if(typeof renderTaskBuilderListV17 === "function") renderTaskBuilderListV17();
    if(typeof syncJourneyBuilderToLegacyTextareaV17 === "function") syncJourneyBuilderToLegacyTextareaV17();
  };

  function clearTaskBuilderV102(){
    const type = document.getElementById("task-type");
    const title = document.getElementById("task-title");
    const desc = document.getElementById("task-description");
    const req = document.getElementById("task-required");

    if(type) type.value = "Info";
    if(title) title.value = "";
    if(desc) desc.value = "";
    if(req) req.checked = true;

    clearVideoField();
  }

  window.clearTaskBuilder = clearTaskBuilderV102;

  window.renderTaskBuilderListV17 = function(){
    const wrap = document.getElementById("station-task-list");
    if(!wrap) return;

    const tasks = window.TONI_CURRENT_STATION_TASKS || [];

    if(!tasks.length){
      wrap.innerHTML = '<div class="journey-empty">Noch keine Aufgabe für diese Station hinzugefügt.</div>';
      return;
    }

    wrap.innerHTML = tasks.map((task,index) => {
      const isVideo = String(task.type || "").toLowerCase() === "video";
      const videoInfo = isVideo && task.youtube_url
        ? `<br><span class="youtube-chip-v102">▶ YouTube-Video gespeichert</span>`
        : "";

      return `
        <div class="station-task-chip">
          <div>
            <strong>${esc(task.type)} · ${esc(task.title)}</strong><br>
            ${task.required ? "Pflichtaufgabe" : "Optionale Aufgabe"}
            ${task.description ? " · " + esc(task.description) : ""}
            ${videoInfo}
          </div>
          <button type="button" class="station-small-btn" onclick="removeTaskFromStationBuilder(${index})">Entfernen</button>
        </div>
      `;
    }).join("");
  };

  // Direktes Speichern aus dem Builder, damit Video-Link nicht über das alte Textformat verloren geht.
  window.buildJourneyFromFormV16 = function(id){
    const title = document.getElementById("journey-title")?.value.trim();
    const subject = document.getElementById("journey-subject")?.value.trim();
    const goal = document.getElementById("journey-goal")?.value.trim();
    const description = document.getElementById("journey-description")?.value.trim();

    if(!title) throw new Error("Bitte gib einen Titel ein.");
    if(!goal) throw new Error("Bitte gib ein Lernziel ein.");

    let steps = [];

    if(Array.isArray(window.TONI_JOURNEY_BUILDER_STATIONS) && window.TONI_JOURNEY_BUILDER_STATIONS.length){
      steps = JSON.parse(JSON.stringify(window.TONI_JOURNEY_BUILDER_STATIONS));
    }else{
      const structure = document.getElementById("journey-structure")?.value.trim();
      if(!structure) throw new Error("Bitte lege Stationen und Aufgaben an.");
      steps = typeof parseJourneyStructureV16 === "function" ? parseJourneyStructureV16(structure) : [];
    }

    if(!steps.length){
      throw new Error("Bitte lege mindestens eine Station an.");
    }

    // Status konsistent setzen: erste Station todo, spätere Stationen locked.
    steps = steps.map((step, stepIndex) => ({
      ...step,
      id: step.id || "station-" + (stepIndex + 1) + "-" + uuid().slice(0,8),
      tasks:(step.tasks || []).map(task => ({
        ...task,
        id: task.id || "task-" + uuid(),
        status: stepIndex === 0 ? (task.status === "done" ? "done" : "todo") : (task.status === "done" ? "done" : "locked"),
        required: task.required !== false
      }))
    }));

    const cover = {
      cover_image: document.getElementById("journey-cover-image")?.value || "",
      cover_image_name: document.getElementById("journey-cover-name")?.value || "",
      cover_image_path: document.getElementById("journey-cover-storage-path")?.value || "",
      cover_image_embedded: document.getElementById("journey-cover-embedded")?.value || ""
    };

    return {
      id: id || (typeof uuidLikeV16 === "function" ? uuidLikeV16() : uuid()),
      title,
      subject,
      goal,
      description,
      ...cover,
      steps
    };
  };

  // Legacy-Textarea bleibt für Sichtbarkeit/Kompatibilität gefüllt, Video-Daten bleiben aber im Builder und in buildJourneyFromFormV16 erhalten.
  if(typeof window.syncJourneyBuilderToLegacyTextareaV17 === "function" && !window.syncJourneyBuilderToLegacyTextareaV17.__toniV102Wrapped){
    const originalSync = window.syncJourneyBuilderToLegacyTextareaV17;
    window.syncJourneyBuilderToLegacyTextareaV17 = function(){
      const result = originalSync.apply(this, arguments);

      // Keine JSON-Metadaten in das sichtbare Legacyformat schreiben, damit alte Parser nicht irritiert werden.
      return result;
    };
    window.syncJourneyBuilderToLegacyTextareaV17.__toniV102Wrapped = true;
  }

  // Lernreise-Aufgabenkarte um Video-Vorschau erweitern.
  if(typeof window.taskCardHtml === "function" && !window.taskCardHtml.__toniV102Wrapped){
    const originalTaskCardHtml = window.taskCardHtml;

    window.taskCardHtml = function(task){
      let html = originalTaskCardHtml.apply(this, arguments);

      const isVideo = String(task?.type || "").toLowerCase() === "video";
      const url = task?.youtube_url || task?.video_url || "";
      const thumb = task?.youtube_thumbnail || task?.video_thumbnail || (task?.youtube_video_id ? `https://img.youtube.com/vi/${task.youtube_video_id}/hqdefault.jpg` : "");

      if(isVideo && url){
        const videoBlock = `
          <div class="lr-task-video-v102">
            <div class="lr-task-video-preview-v102">
              ${thumb ? `<img src="${esc(thumb)}" alt="YouTube-Vorschau">` : ""}
              <div>
                <strong>YouTube-Video</strong><br>
                <a href="${esc(url)}" target="_blank" rel="noopener">Video öffnen ↗</a>
              </div>
            </div>
          </div>
        `;

        html = html.replace('<div class="lr-task-tags">', videoBlock + '<div class="lr-task-tags">');
      }

      return html;
    };

    window.taskCardHtml.__toniV102Wrapped = true;
  }

  function boot(){
    ensureVideoField();

    const type = document.getElementById("task-type");
    if(type) updateVideoFieldVisibility();
  }

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 200);
    setTimeout(boot, 900);
    setTimeout(boot, 1800);
    setTimeout(boot, 3200);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V102_TIMER);
      window.TONI_V102_TIMER = setTimeout(boot, 90);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true
    });
  });
})();

/* TONI V103 – Fix: YouTube-Vorschau anzeigen und Video-Aufgabe zuverlässig speichern */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV17Escape === "function") return toniV17Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function uuid(){
    try{
      if(typeof toniV17Uuid === "function") return toniV17Uuid();
      if(typeof uuidLikeV16 === "function") return uuidLikeV16();
      return crypto.randomUUID();
    }catch{
      return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    }
  }

  function parseYouTubeUrlV103(value){
    let raw = String(value || "").trim();

    // Häufige Kopierfehler abfangen: Klammern/Leerzeichen am Ende.
    raw = raw.replace(/[)\]\s]+$/g, "");

    if(!raw){
      return {ok:false, reason:"Bitte füge einen vollständigen YouTube-Link ein."};
    }

    // Falls nur youtube.com/... ohne Protokoll eingegeben wird.
    if(/^((www\.)?youtube\.com|youtu\.be)\//i.test(raw)){
      raw = "https://" + raw;
    }

    let url;
    try{
      url = new URL(raw);
    }catch{
      return {ok:false, reason:"Der Link ist keine gültige URL. Beispiel: https://www.youtube.com/watch?v=dQw4w9WgXcQ"};
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    let id = "";

    if(host === "youtu.be"){
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    }else if(["youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com"].includes(host)){
      const parts = url.pathname.split("/").filter(Boolean);

      if(url.pathname === "/watch"){
        id = url.searchParams.get("v") || "";
      }else if(["embed","shorts","live"].includes(parts[0])){
        id = parts[1] || "";
      }
    }else{
      return {ok:false, reason:"Bitte verwende einen YouTube-Link, z. B. youtube.com/watch?v=VIDEOID oder youtu.be/VIDEOID."};
    }

    id = String(id || "").trim();

    if(!id){
      return {ok:false, reason:"Der Link ist unvollständig. Bei youtube.com/watch muss hinter ?v= die Video-ID stehen."};
    }

    if(!/^[A-Za-z0-9_-]{11}$/.test(id)){
      return {ok:false, reason:"Die Video-ID hat nicht das erwartete YouTube-Format. Bitte prüfe den Link."};
    }

    return {
      ok:true,
      id,
      url:`https://www.youtube.com/watch?v=${id}`,
      embed_url:`https://www.youtube.com/embed/${id}`,
      thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  }

  window.toniV103ParseYouTubeUrl = parseYouTubeUrlV103;
  window.toniV102ParseYouTubeUrl = parseYouTubeUrlV103;

  function ensureField(){
    const type = document.getElementById("task-type");
    const desc = document.getElementById("task-description");
    if(!type || !desc) return null;

    let field = document.getElementById("task-youtube-field-v102");

    if(!field){
      field = document.createElement("div");
      field.className = "youtube-task-field-v102 youtube-task-field-v103";
      field.id = "task-youtube-field-v102";
      field.innerHTML = `
        <label class="lr-form-label" for="task-youtube-url-v102">YouTube-Link zum Video</label>
        <div class="youtube-input-row-v102">
          <input class="youtube-url-input-v102 youtube-url-input-v103" id="task-youtube-url-v102" type="url" inputmode="url" placeholder="z. B. https://www.youtube.com/watch?v=dQw4w9WgXcQ"/>
          <button type="button" class="youtube-check-btn-v102" id="task-youtube-check-v103">Link prüfen</button>
        </div>
        <div class="youtube-status-v102 youtube-status-v103 v103-hint" id="task-youtube-status-v102">
          Bitte füge einen vollständigen YouTube-Link ein.
        </div>
        <div class="youtube-preview-v102 youtube-preview-v103" id="task-youtube-preview-v102">
          <img id="task-youtube-thumb-v102" alt="YouTube-Vorschau"/>
          <div class="youtube-preview-info-v102">
            <strong>YouTube-Video erkannt</strong>
            <span id="task-youtube-id-v102"></span>
          </div>
        </div>
        <div class="youtube-help-v103">
          Zulässig sind vollständige Links wie <strong>youtube.com/watch?v=VIDEOID</strong>, <strong>youtu.be/VIDEOID</strong>, <strong>/embed/VIDEOID</strong> oder <strong>/shorts/VIDEOID</strong>.
        </div>
      `;

      const descGroup = desc.closest(".lr-form-group") || desc.parentElement;
      descGroup?.insertAdjacentElement("afterend", field);
    }

    field.classList.add("youtube-task-field-v103");

    const input = document.getElementById("task-youtube-url-v102");
    const check = document.getElementById("task-youtube-check-v103") || field.querySelector(".youtube-check-btn-v102");

    if(type.dataset.v103Installed !== "1"){
      type.dataset.v103Installed = "1";
      type.addEventListener("change", updateVisibility);
    }

    if(input && input.dataset.v103Installed !== "1"){
      input.dataset.v103Installed = "1";
      input.addEventListener("input", () => {
        clearTimeout(window.TONI_V103_YT_TIMER);
        window.TONI_V103_YT_TIMER = setTimeout(() => validate(false), 250);
      });
      input.addEventListener("paste", () => setTimeout(() => validate(false), 80));
      input.addEventListener("blur", () => validate(false));
    }

    if(check && check.dataset.v103Installed !== "1"){
      check.dataset.v103Installed = "1";
      check.addEventListener("click", event => {
        event.preventDefault();
        validate(true);
      });
    }

    updateVisibility();
    return field;
  }

  function setStatus(text, mode){
    const status = document.getElementById("task-youtube-status-v102");
    if(!status) return;
    status.textContent = text || "";
    status.className = "youtube-status-v102 youtube-status-v103 " + (mode ? "v103-" + mode : "");
  }

  function setPreview(result){
    const preview = document.getElementById("task-youtube-preview-v102");
    const img = document.getElementById("task-youtube-thumb-v102");
    const idLabel = document.getElementById("task-youtube-id-v102");

    if(result?.ok){
      if(img){
        img.src = result.thumbnail;
        img.onerror = () => {
          // Fallback-Thumbnail, falls hqdefault nicht vorhanden ist.
          img.src = `https://img.youtube.com/vi/${result.id}/mqdefault.jpg`;
        };
      }
      if(idLabel) idLabel.textContent = `Video-ID: ${result.id}`;
      preview?.classList.add("visible", "v103-visible");
    }else{
      if(img) img.removeAttribute("src");
      if(idLabel) idLabel.textContent = "";
      preview?.classList.remove("visible", "v103-visible");
    }
  }

  function markInput(result){
    const input = document.getElementById("task-youtube-url-v102");
    if(!input) return;
    input.classList.remove("v103-valid", "v103-invalid");
    if(!input.value.trim()) return;
    input.classList.add(result?.ok ? "v103-valid" : "v103-invalid");
  }

  function updateVisibility(){
    const type = document.getElementById("task-type");
    const field = document.getElementById("task-youtube-field-v102");
    if(!type || !field) return;

    const isVideo = String(type.value || "").toLowerCase() === "video";
    field.classList.toggle("visible", isVideo);

    if(isVideo){
      validate(false);
    }else{
      setPreview(null);
      setStatus("", "");
      markInput(null);
    }
  }

  function validate(showAlert=false){
    ensureField();

    const type = document.getElementById("task-type")?.value || "";
    if(String(type).toLowerCase() !== "video"){
      return {ok:true, notVideo:true};
    }

    const input = document.getElementById("task-youtube-url-v102");
    const result = parseYouTubeUrlV103(input?.value || "");

    markInput(result);

    if(result.ok){
      setStatus("Gültiger YouTube-Link. Die Vorschau wurde geladen.", "ok");
      setPreview(result);
      return result;
    }

    setStatus(result.reason, input?.value?.trim() ? "err" : "hint");
    setPreview(null);

    if(showAlert){
      input?.focus();
    }

    return result;
  }

  window.toniV103ValidateYouTubeField = validate;
  window.toniV102ValidateYouTubeField = validate;

  function clearTaskForm(){
    const type = document.getElementById("task-type");
    const title = document.getElementById("task-title");
    const desc = document.getElementById("task-description");
    const req = document.getElementById("task-required");
    const yt = document.getElementById("task-youtube-url-v102");

    if(type) type.value = "Info";
    if(title) title.value = "";
    if(desc) desc.value = "";
    if(req) req.checked = true;
    if(yt) yt.value = "";

    setPreview(null);
    setStatus("Bitte füge einen vollständigen YouTube-Link ein.", "hint");
    markInput(null);
    updateVisibility();
  }

  function buildTask(){
    const type = document.getElementById("task-type")?.value || "Aufgabe";
    const title = document.getElementById("task-title")?.value.trim();
    const description = document.getElementById("task-description")?.value.trim();
    const required = document.getElementById("task-required")?.checked !== false;

    if(!title){
      alert("Bitte gib einen Aufgabentitel ein.");
      document.getElementById("task-title")?.focus();
      return null;
    }

    const task = {
      id:"task-" + uuid(),
      title,
      type,
      description:description || "",
      content:description || title,
      required,
      status:"todo"
    };

    if(String(type).toLowerCase() === "video"){
      const yt = validate(true);

      if(!yt.ok){
        alert(yt.reason + "\n\nDie Video-Aufgabe wird erst gespeichert, wenn ein vollständiger gültiger YouTube-Link eingetragen ist.");
        document.getElementById("task-youtube-url-v102")?.focus();
        return null;
      }

      task.youtube_url = yt.url;
      task.youtube_video_id = yt.id;
      task.youtube_thumbnail = yt.thumbnail;
      task.youtube_embed_url = yt.embed_url;
      task.video_url = yt.url;
      task.video_id = yt.id;
      task.video_thumbnail = yt.thumbnail;
      task.content = description || yt.url;
    }

    return task;
  }

  window.addTaskToStationBuilder = function(){
    ensureField();

    const task = buildTask();
    if(!task) return;

    window.TONI_CURRENT_STATION_TASKS = window.TONI_CURRENT_STATION_TASKS || [];
    window.TONI_CURRENT_STATION_TASKS.push(task);

    clearTaskForm();

    if(typeof renderTaskBuilderListV17 === "function") renderTaskBuilderListV17();
    if(typeof syncJourneyBuilderToLegacyTextareaV17 === "function") syncJourneyBuilderToLegacyTextareaV17();
  };

  window.clearTaskBuilder = clearTaskForm;

  window.renderTaskBuilderListV17 = function(){
    const wrap = document.getElementById("station-task-list");
    if(!wrap) return;

    const tasks = window.TONI_CURRENT_STATION_TASKS || [];

    if(!tasks.length){
      wrap.innerHTML = '<div class="journey-empty">Noch keine Aufgabe für diese Station hinzugefügt.</div>';
      return;
    }

    wrap.innerHTML = tasks.map((task,index) => {
      const isVideo = String(task.type || "").toLowerCase() === "video";
      const videoInfo = isVideo && (task.youtube_url || task.video_url)
        ? `<br><span class="youtube-chip-v102 youtube-chip-v103">▶ YouTube-Video gespeichert</span>`
        : "";

      return `
        <div class="station-task-chip">
          <div>
            <strong>${esc(task.type)} · ${esc(task.title)}</strong><br>
            ${task.required ? "Pflichtaufgabe" : "Optionale Aufgabe"}
            ${task.description ? " · " + esc(task.description) : ""}
            ${videoInfo}
          </div>
          <button type="button" class="station-small-btn" onclick="removeTaskFromStationBuilder(${index})">Entfernen</button>
        </div>
      `;
    }).join("");
  };

  function normalizeBuilderSteps(){
    const stations = Array.isArray(window.TONI_JOURNEY_BUILDER_STATIONS)
      ? JSON.parse(JSON.stringify(window.TONI_JOURNEY_BUILDER_STATIONS))
      : [];

    return stations.map((step, stepIndex) => ({
      ...step,
      id:step.id || "station-" + (stepIndex + 1) + "-" + uuid().slice(0,8),
      tasks:(step.tasks || []).map(task => ({
        ...task,
        id:task.id || "task-" + uuid(),
        status: stepIndex === 0 ? (task.status === "done" ? "done" : "todo") : (task.status === "done" ? "done" : "locked"),
        required: task.required !== false
      }))
    }));
  }

  // Wichtig: Speichern direkt aus dem Builder, damit youtube_url nicht über das alte Textformat verloren geht.
  window.buildJourneyFromFormV16 = function(id){
    const title = document.getElementById("journey-title")?.value.trim();
    const subject = document.getElementById("journey-subject")?.value.trim();
    const goal = document.getElementById("journey-goal")?.value.trim();
    const description = document.getElementById("journey-description")?.value.trim();

    if(!title) throw new Error("Bitte gib einen Titel ein.");
    if(!goal) throw new Error("Bitte gib ein Lernziel ein.");

    let steps = normalizeBuilderSteps();

    if(!steps.length){
      const structure = document.getElementById("journey-structure")?.value.trim();
      if(!structure) throw new Error("Bitte lege Stationen und Aufgaben an.");
      steps = typeof parseJourneyStructureV16 === "function" ? parseJourneyStructureV16(structure) : [];
    }

    if(!steps.length){
      throw new Error("Bitte lege mindestens eine Station an.");
    }

    return {
      id:id || (typeof uuidLikeV16 === "function" ? uuidLikeV16() : uuid()),
      title,
      subject,
      goal,
      description,
      cover_image:document.getElementById("journey-cover-image")?.value || "",
      cover_image_name:document.getElementById("journey-cover-name")?.value || "",
      cover_image_path:document.getElementById("journey-cover-storage-path")?.value || "",
      cover_image_embedded:document.getElementById("journey-cover-embedded")?.value || "",
      steps
    };
  };

  if(typeof window.taskCardHtml === "function" && !window.taskCardHtml.__toniV103Wrapped){
    const original = window.taskCardHtml;

    window.taskCardHtml = function(task){
      let html = original.apply(this, arguments);

      const isVideo = String(task?.type || "").toLowerCase() === "video";
      const url = task?.youtube_url || task?.video_url || "";
      const id = task?.youtube_video_id || task?.video_id || "";
      const thumb = task?.youtube_thumbnail || task?.video_thumbnail || (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "");

      if(isVideo && url){
        const videoBlock = `
          <div class="lr-task-video-v102">
            <div class="lr-task-video-preview-v102">
              ${thumb ? `<img src="${esc(thumb)}" alt="YouTube-Vorschau">` : ""}
              <div>
                <strong>YouTube-Video</strong><br>
                <a href="${esc(url)}" target="_blank" rel="noopener">Video öffnen ↗</a>
              </div>
            </div>
          </div>
        `;

        html = html.replace('<div class="lr-task-tags">', videoBlock + '<div class="lr-task-tags">');
      }

      return html;
    };

    window.taskCardHtml.__toniV103Wrapped = true;
  }

  function boot(){
    ensureField();
    updateVisibility();
  }

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 100);
    setTimeout(boot, 500);
    setTimeout(boot, 1200);
    setTimeout(boot, 2500);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V103_TIMER);
      window.TONI_V103_TIMER = setTimeout(boot, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true
    });
  });
})();

/* TONI V104 – Fix: „Link prüfen“ reagiert zuverlässig und zeigt Vorschau */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV17Escape === "function") return toniV17Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function uuid(){
    try{
      if(typeof toniV17Uuid === "function") return toniV17Uuid();
      if(typeof uuidLikeV16 === "function") return uuidLikeV16();
      return crypto.randomUUID();
    }catch{
      return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    }
  }

  function parseYouTube(value){
    let raw = String(value || "").trim().replace(/[)\]\s]+$/g, "");

    if(!raw){
      return {ok:false, reason:"Bitte füge einen vollständigen YouTube-Link ein."};
    }

    if(/^((www\.)?youtube\.com|m\.youtube\.com|youtu\.be)\//i.test(raw)){
      raw = "https://" + raw;
    }

    let url;
    try{
      url = new URL(raw);
    }catch{
      return {ok:false, reason:"Der Link ist keine gültige URL. Beispiel: https://www.youtube.com/watch?v=dQw4w9WgXcQ"};
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    let id = "";

    if(host === "youtu.be"){
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    }else if(["youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com"].includes(host)){
      const parts = url.pathname.split("/").filter(Boolean);

      if(url.pathname === "/watch"){
        id = url.searchParams.get("v") || "";
      }else if(["embed","shorts","live"].includes(parts[0])){
        id = parts[1] || "";
      }
    }else{
      return {ok:false, reason:"Bitte verwende einen YouTube-Link, z. B. youtube.com/watch?v=VIDEOID oder youtu.be/VIDEOID."};
    }

    id = String(id || "").trim();

    if(!id){
      return {ok:false, reason:"Der Link ist unvollständig. Bei youtube.com/watch muss hinter ?v= die Video-ID stehen."};
    }

    if(!/^[A-Za-z0-9_-]{11}$/.test(id)){
      return {ok:false, reason:"Die Video-ID hat nicht das erwartete YouTube-Format. Bitte prüfe den Link."};
    }

    return {
      ok:true,
      id,
      url:`https://www.youtube.com/watch?v=${id}`,
      embed_url:`https://www.youtube.com/embed/${id}`,
      thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  }

  window.toniV104ParseYouTubeUrl = parseYouTube;
  window.toniV103ParseYouTubeUrl = parseYouTube;
  window.toniV102ParseYouTubeUrl = parseYouTube;

  function typeIsVideo(){
    return String(document.getElementById("task-type")?.value || "").toLowerCase() === "video";
  }

  function fieldHtml(existingValue=""){
    return `
      <label class="lr-form-label" for="task-youtube-url-v104">YouTube-Link zum Video</label>
      <div class="youtube-input-row-v104">
        <input class="youtube-url-input-v104" id="task-youtube-url-v104" type="url" inputmode="url"
               placeholder="z. B. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
               value="${esc(existingValue)}"/>
        <button type="button" class="youtube-check-btn-v104" id="task-youtube-check-v104">Link prüfen</button>
      </div>
      <div class="youtube-status-v104" id="task-youtube-status-v104">
        Bitte füge einen vollständigen YouTube-Link ein.
      </div>
      <div class="youtube-preview-v104" id="task-youtube-preview-v104">
        <img id="task-youtube-thumb-v104" alt="YouTube-Vorschau"/>
        <div class="youtube-preview-info-v104">
          <strong>YouTube-Video erkannt</strong>
          <span id="task-youtube-id-v104"></span>
        </div>
      </div>
      <div class="youtube-help-v104">
        Zulässig sind vollständige Links wie <strong>youtube.com/watch?v=VIDEOID</strong>,
        <strong>youtu.be/VIDEOID</strong>, <strong>/embed/VIDEOID</strong> oder <strong>/shorts/VIDEOID</strong>.
      </div>
    `;
  }

  function ensureField(){
    const type = document.getElementById("task-type");
    const desc = document.getElementById("task-description");

    if(!type || !desc) return null;

    let field = document.getElementById("task-youtube-field-v104");
    const oldField = document.getElementById("task-youtube-field-v102");
    const existingValue =
      document.getElementById("task-youtube-url-v104")?.value ||
      document.getElementById("task-youtube-url-v102")?.value ||
      "";

    if(!field){
      field = document.createElement("div");
      field.id = "task-youtube-field-v104";
      field.className = "youtube-task-field-v104";
      field.innerHTML = fieldHtml(existingValue);

      if(oldField){
        oldField.insertAdjacentElement("afterend", field);
        oldField.style.display = "none";
      }else{
        const descGroup = desc.closest(".lr-form-group") || desc.parentElement;
        descGroup?.insertAdjacentElement("afterend", field);
      }
    }else{
      // Falls alte Renderer etwas überschrieben haben, sichere Struktur reparieren.
      if(!document.getElementById("task-youtube-check-v104") || !document.getElementById("task-youtube-url-v104")){
        field.innerHTML = fieldHtml(existingValue);
      }
    }

    if(oldField && oldField !== field){
      oldField.style.display = "none";
      oldField.classList.remove("visible");
    }

    const input = document.getElementById("task-youtube-url-v104");
    const btn = document.getElementById("task-youtube-check-v104");

    if(input && input.dataset.v104Installed !== "1"){
      input.dataset.v104Installed = "1";
      input.addEventListener("input", () => {
        clearTimeout(window.TONI_V104_YT_TIMER);
        window.TONI_V104_YT_TIMER = setTimeout(() => validate(false), 220);
      });
      input.addEventListener("paste", () => setTimeout(() => validate(false), 80));
      input.addEventListener("blur", () => validate(false));
    }

    if(btn){
      btn.onclick = function(event){
        event.preventDefault();
        event.stopPropagation();
        validate(true);
        return false;
      };
    }

    if(type.dataset.v104Installed !== "1"){
      type.dataset.v104Installed = "1";
      type.addEventListener("change", updateVisibility);
    }

    updateVisibility();
    return field;
  }

  function setStatus(text, mode=""){
    const el = document.getElementById("task-youtube-status-v104");
    if(!el) return;
    el.textContent = text || "";
    el.className = "youtube-status-v104 " + mode;
  }

  function setPreview(result){
    const preview = document.getElementById("task-youtube-preview-v104");
    const img = document.getElementById("task-youtube-thumb-v104");
    const label = document.getElementById("task-youtube-id-v104");

    if(result?.ok){
      if(img){
        img.src = result.thumbnail;
        img.onerror = function(){
          if(!img.dataset.fallbackUsed){
            img.dataset.fallbackUsed = "1";
            img.src = `https://img.youtube.com/vi/${result.id}/mqdefault.jpg`;
          }
        };
      }
      if(label) label.textContent = `Video-ID: ${result.id}`;
      preview?.classList.add("visible");
    }else{
      if(img){
        img.removeAttribute("src");
        delete img.dataset.fallbackUsed;
      }
      if(label) label.textContent = "";
      preview?.classList.remove("visible");
    }
  }

  function markInput(result){
    const input = document.getElementById("task-youtube-url-v104");
    if(!input) return;

    input.classList.remove("valid", "invalid");

    if(!input.value.trim()) return;

    input.classList.add(result?.ok ? "valid" : "invalid");
  }

  function updateVisibility(){
    const field = document.getElementById("task-youtube-field-v104");
    if(!field) return;

    const show = typeIsVideo();
    field.classList.toggle("visible", show);

    if(show){
      validate(false);
    }else{
      setPreview(null);
      setStatus("", "");
      markInput(null);
    }
  }

  function validate(showAlert=false){
    ensureField();

    if(!typeIsVideo()){
      return {ok:true, notVideo:true};
    }

    const input = document.getElementById("task-youtube-url-v104");
    const result = parseYouTube(input?.value || "");

    markInput(result);

    if(result.ok){
      setStatus("Gültiger YouTube-Link. Die Vorschau wurde geladen.", "ok");
      setPreview(result);
      return result;
    }

    setStatus(result.reason, input?.value?.trim() ? "err" : "");
    setPreview(null);

    if(showAlert && input?.value?.trim()){
      // Kein störendes Alert bei leerem Feld, aber klare Markierung im Formular.
      input.focus();
    }

    return result;
  }

  window.toniV104ValidateYouTubeField = validate;
  window.toniV103ValidateYouTubeField = validate;
  window.toniV102ValidateYouTubeField = validate;

  function readYouTubeValue(){
    return document.getElementById("task-youtube-url-v104")?.value ||
      document.getElementById("task-youtube-url-v102")?.value ||
      "";
  }

  function clearTaskForm(){
    const type = document.getElementById("task-type");
    const title = document.getElementById("task-title");
    const desc = document.getElementById("task-description");
    const req = document.getElementById("task-required");
    const input = document.getElementById("task-youtube-url-v104");

    if(type) type.value = "Info";
    if(title) title.value = "";
    if(desc) desc.value = "";
    if(req) req.checked = true;
    if(input) input.value = "";

    setPreview(null);
    setStatus("Bitte füge einen vollständigen YouTube-Link ein.", "");
    markInput(null);
    updateVisibility();
  }

  function buildTask(){
    const type = document.getElementById("task-type")?.value || "Aufgabe";
    const title = document.getElementById("task-title")?.value.trim();
    const description = document.getElementById("task-description")?.value.trim();
    const required = document.getElementById("task-required")?.checked !== false;

    if(!title){
      alert("Bitte gib einen Aufgabentitel ein.");
      document.getElementById("task-title")?.focus();
      return null;
    }

    const task = {
      id:"task-" + uuid(),
      title,
      type,
      description:description || "",
      content:description || title,
      required,
      status:"todo"
    };

    if(String(type).toLowerCase() === "video"){
      const yt = parseYouTube(readYouTubeValue());

      markInput(yt);

      if(!yt.ok){
        setStatus(yt.reason, "err");
        setPreview(null);
        alert(yt.reason + "\n\nDie Video-Aufgabe kann erst gespeichert werden, wenn ein vollständiger gültiger YouTube-Link eingetragen ist.");
        document.getElementById("task-youtube-url-v104")?.focus();
        return null;
      }

      setStatus("Gültiger YouTube-Link. Die Vorschau wurde geladen.", "ok");
      setPreview(yt);

      task.youtube_url = yt.url;
      task.youtube_video_id = yt.id;
      task.youtube_thumbnail = yt.thumbnail;
      task.youtube_embed_url = yt.embed_url;
      task.video_url = yt.url;
      task.video_id = yt.id;
      task.video_thumbnail = yt.thumbnail;
      task.content = description || yt.url;
    }

    return task;
  }

  window.addTaskToStationBuilder = function(){
    ensureField();

    const task = buildTask();
    if(!task) return;

    window.TONI_CURRENT_STATION_TASKS = window.TONI_CURRENT_STATION_TASKS || [];
    window.TONI_CURRENT_STATION_TASKS.push(task);

    clearTaskForm();

    if(typeof renderTaskBuilderListV17 === "function") renderTaskBuilderListV17();
    if(typeof syncJourneyBuilderToLegacyTextareaV17 === "function") syncJourneyBuilderToLegacyTextareaV17();
  };

  window.clearTaskBuilder = clearTaskForm;

  window.renderTaskBuilderListV17 = function(){
    const wrap = document.getElementById("station-task-list");
    if(!wrap) return;

    const tasks = window.TONI_CURRENT_STATION_TASKS || [];

    if(!tasks.length){
      wrap.innerHTML = '<div class="journey-empty">Noch keine Aufgabe für diese Station hinzugefügt.</div>';
      return;
    }

    wrap.innerHTML = tasks.map((task,index) => {
      const isVideo = String(task.type || "").toLowerCase() === "video";
      const videoInfo = isVideo && (task.youtube_url || task.video_url)
        ? `<br><span class="youtube-chip-v104">▶ YouTube-Video gespeichert</span>`
        : "";

      return `
        <div class="station-task-chip">
          <div>
            <strong>${esc(task.type)} · ${esc(task.title)}</strong><br>
            ${task.required ? "Pflichtaufgabe" : "Optionale Aufgabe"}
            ${task.description ? " · " + esc(task.description) : ""}
            ${videoInfo}
          </div>
          <button type="button" class="station-small-btn" onclick="removeTaskFromStationBuilder(${index})">Entfernen</button>
        </div>
      `;
    }).join("");
  };

  // Direkter Builder-Speicherpfad, damit YouTube-Daten nicht über das alte Textformat verloren gehen.
  window.buildJourneyFromFormV16 = function(id){
    const title = document.getElementById("journey-title")?.value.trim();
    const subject = document.getElementById("journey-subject")?.value.trim();
    const goal = document.getElementById("journey-goal")?.value.trim();
    const description = document.getElementById("journey-description")?.value.trim();

    if(!title) throw new Error("Bitte gib einen Titel ein.");
    if(!goal) throw new Error("Bitte gib ein Lernziel ein.");

    let steps = Array.isArray(window.TONI_JOURNEY_BUILDER_STATIONS)
      ? JSON.parse(JSON.stringify(window.TONI_JOURNEY_BUILDER_STATIONS))
      : [];

    if(!steps.length){
      const structure = document.getElementById("journey-structure")?.value.trim();
      if(!structure) throw new Error("Bitte lege Stationen und Aufgaben an.");
      steps = typeof parseJourneyStructureV16 === "function" ? parseJourneyStructureV16(structure) : [];
    }

    if(!steps.length){
      throw new Error("Bitte lege mindestens eine Station an.");
    }

    steps = steps.map((step, stepIndex) => ({
      ...step,
      id:step.id || "station-" + (stepIndex + 1) + "-" + uuid().slice(0,8),
      tasks:(step.tasks || []).map(task => ({
        ...task,
        id:task.id || "task-" + uuid(),
        status: stepIndex === 0 ? (task.status === "done" ? "done" : "todo") : (task.status === "done" ? "done" : "locked"),
        required: task.required !== false
      }))
    }));

    return {
      id:id || (typeof uuidLikeV16 === "function" ? uuidLikeV16() : uuid()),
      title,
      subject,
      goal,
      description,
      cover_image:document.getElementById("journey-cover-image")?.value || "",
      cover_image_name:document.getElementById("journey-cover-name")?.value || "",
      cover_image_path:document.getElementById("journey-cover-storage-path")?.value || "",
      cover_image_embedded:document.getElementById("journey-cover-embedded")?.value || "",
      steps
    };
  };

  // Zusätzlicher globaler Capture-Handler: Auch wenn alte Buttons im DOM liegen, reagiert „Link prüfen“.
  document.addEventListener("click", event => {
    const btn = event.target.closest?.(".youtube-check-btn-v102, .youtube-check-btn-v103, .youtube-check-btn-v104, #task-youtube-check-v103, #task-youtube-check-v104");
    if(!btn) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    ensureField();

    // Wenn der alte Input befüllt wurde, Wert in das neue Feld übernehmen.
    const oldInput = document.getElementById("task-youtube-url-v102");
    const newInput = document.getElementById("task-youtube-url-v104");
    if(oldInput && newInput && !newInput.value && oldInput.value){
      newInput.value = oldInput.value;
    }

    validate(true);
  }, true);

  function boot(){
    ensureField();

    // Falls ein alter V102/V103-Bereich sichtbar ist, Wert übernehmen und neuen Bereich zeigen.
    const oldInput = document.getElementById("task-youtube-url-v102");
    const newInput = document.getElementById("task-youtube-url-v104");
    if(oldInput && newInput && !newInput.value && oldInput.value){
      newInput.value = oldInput.value;
    }

    updateVisibility();
  }

  window.toniV104EnsureYouTubeField = boot;

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 100);
    setTimeout(boot, 500);
    setTimeout(boot, 1200);
    setTimeout(boot, 2500);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V104_TIMER);
      window.TONI_V104_TIMER = setTimeout(boot, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true
    });
  });
})();

/* TONI V105 – finaler Fix: Link-prüfen-Button reagiert unabhängig von alten Feld-Versionen */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV17Escape === "function") return toniV17Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function uuid(){
    try{
      if(typeof toniV17Uuid === "function") return toniV17Uuid();
      if(typeof uuidLikeV16 === "function") return uuidLikeV16();
      return crypto.randomUUID();
    }catch{
      return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    }
  }

  function isVisible(el){
    if(!el) return false;
    const style = window.getComputedStyle(el);
    return style.display !== "none" && style.visibility !== "hidden" && el.getClientRects().length > 0;
  }

  function parseYouTubeV105(value){
    let raw = String(value || "").trim().replace(/[)\]\s]+$/g, "");

    if(!raw){
      return {ok:false, reason:"Bitte füge einen vollständigen YouTube-Link ein."};
    }

    if(/^((www\.)?youtube\.com|m\.youtube\.com|music\.youtube\.com|youtu\.be)\//i.test(raw)){
      raw = "https://" + raw;
    }

    let url;
    try{
      url = new URL(raw);
    }catch{
      return {ok:false, reason:"Der Link ist keine gültige URL. Beispiel: https://www.youtube.com/watch?v=dQw4w9WgXcQ"};
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    let id = "";

    if(host === "youtu.be"){
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    }else if(["youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com"].includes(host)){
      const parts = url.pathname.split("/").filter(Boolean);

      if(url.pathname === "/watch"){
        id = url.searchParams.get("v") || "";
      }else if(["embed","shorts","live"].includes(parts[0])){
        id = parts[1] || "";
      }
    }else{
      return {ok:false, reason:"Bitte verwende einen YouTube-Link, z. B. youtube.com/watch?v=VIDEOID oder youtu.be/VIDEOID."};
    }

    id = String(id || "").trim();

    if(!id){
      return {ok:false, reason:"Der Link ist unvollständig. Bei youtube.com/watch muss hinter ?v= die Video-ID stehen."};
    }

    if(!/^[A-Za-z0-9_-]{11}$/.test(id)){
      return {ok:false, reason:"Die Video-ID hat nicht das erwartete YouTube-Format. Bitte prüfe den Link."};
    }

    return {
      ok:true,
      id,
      url:`https://www.youtube.com/watch?v=${id}`,
      embed_url:`https://www.youtube.com/embed/${id}`,
      thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  }

  window.toniV105ParseYouTubeUrl = parseYouTubeV105;
  window.toniV104ParseYouTubeUrl = parseYouTubeV105;
  window.toniV103ParseYouTubeUrl = parseYouTubeV105;
  window.toniV102ParseYouTubeUrl = parseYouTubeV105;

  function typeIsVideo(){
    return String(document.getElementById("task-type")?.value || "").toLowerCase() === "video";
  }

  function allYoutubeFields(){
    const byId = [
      "task-youtube-field-v104",
      "task-youtube-field-v102",
      "task-youtube-field-v103"
    ].map(id => document.getElementById(id)).filter(Boolean);

    const byClass = Array.from(document.querySelectorAll(
      ".youtube-task-field-v104,.youtube-task-field-v103,.youtube-task-field-v102,[id*='youtube-field']"
    ));

    return Array.from(new Set([...byId, ...byClass]));
  }

  function visibleField(){
    const fields = allYoutubeFields();
    return fields.find(isVisible) || fields[0] || ensureFallbackField();
  }

  function ensureFallbackField(){
    const desc = document.getElementById("task-description");
    if(!desc) return null;

    let field = document.getElementById("task-youtube-field-force-v105");

    if(!field){
      field = document.createElement("div");
      field.id = "task-youtube-field-force-v105";
      field.className = "youtube-task-field-v104 visible";
      field.innerHTML = `
        <label class="lr-form-label" for="task-youtube-url-force-v105">YouTube-Link zum Video</label>
        <div class="youtube-input-row-v104">
          <input class="youtube-url-input-v104" id="task-youtube-url-force-v105" type="url" inputmode="url"
                 placeholder="z. B. https://www.youtube.com/watch?v=dQw4w9WgXcQ"/>
          <button type="button" class="youtube-check-btn-v104 youtube-check-btn-force-v105">Link prüfen</button>
        </div>
        <div class="youtube-status-force-v105">Bitte füge einen vollständigen YouTube-Link ein.</div>
        <div class="youtube-preview-force-v105">
          <img alt="YouTube-Vorschau"/>
          <div class="youtube-preview-text-v105">
            <strong>YouTube-Video erkannt</strong>
            <span></span>
          </div>
        </div>
      `;

      const descGroup = desc.closest(".lr-form-group") || desc.parentElement;
      descGroup?.insertAdjacentElement("afterend", field);
    }

    return field;
  }

  function currentInput(){
    const field = visibleField();

    if(field){
      const input = field.querySelector("input[type='url'], input[id*='youtube'], input");
      if(input) return input;
    }

    return document.getElementById("task-youtube-url-v104") ||
      document.getElementById("task-youtube-url-v102") ||
      document.getElementById("task-youtube-url-v103") ||
      document.getElementById("task-youtube-url-force-v105");
  }

  function ensureStatus(field){
    if(!field) return null;

    let status = field.querySelector(
      ".youtube-status-force-v105,#task-youtube-status-v104,#task-youtube-status-v102,#task-youtube-status-v103,.youtube-status-v104,.youtube-status-v103,.youtube-status-v102"
    );

    if(!status){
      status = document.createElement("div");
      status.className = "youtube-status-force-v105";
      const row = field.querySelector(".youtube-input-row-v104,.youtube-input-row-v102") || field.querySelector("input")?.parentElement || field;
      row.insertAdjacentElement("afterend", status);
    }

    status.classList.add("youtube-status-force-v105");
    return status;
  }

  function ensurePreview(field){
    if(!field) return null;

    let preview = field.querySelector(".youtube-preview-force-v105,#task-youtube-preview-v104,#task-youtube-preview-v102,#task-youtube-preview-v103,.youtube-preview-v104,.youtube-preview-v103,.youtube-preview-v102");

    if(!preview){
      preview = document.createElement("div");
      preview.className = "youtube-preview-force-v105";
      preview.innerHTML = `
        <img alt="YouTube-Vorschau"/>
        <div class="youtube-preview-text-v105">
          <strong>YouTube-Video erkannt</strong>
          <span></span>
        </div>
      `;
      const status = ensureStatus(field);
      status?.insertAdjacentElement("afterend", preview);
    }

    preview.classList.add("youtube-preview-force-v105");

    if(!preview.querySelector("img")){
      preview.insertAdjacentHTML("afterbegin", `<img alt="YouTube-Vorschau"/>`);
    }

    if(!preview.querySelector(".youtube-preview-text-v105")){
      preview.insertAdjacentHTML("beforeend", `
        <div class="youtube-preview-text-v105">
          <strong>YouTube-Video erkannt</strong>
          <span></span>
        </div>
      `);
    }

    return preview;
  }

  function setStatus(field, text, mode){
    const status = ensureStatus(field);
    if(!status) return;

    status.textContent = text || "";
    status.className = "youtube-status-force-v105 " + (mode || "");

    // Auch alte Statusfelder synchron halten, falls sichtbar.
    field.querySelectorAll(".youtube-status-v104,.youtube-status-v103,.youtube-status-v102").forEach(el => {
      if(el !== status){
        el.textContent = text || "";
        el.classList.remove("ok","err","v103-ok","v103-err");
        if(mode === "ok") el.classList.add("ok","v103-ok");
        if(mode === "err") el.classList.add("err","v103-err");
      }
    });
  }

  function setInputState(input, result){
    if(!input) return;

    input.classList.remove(
      "valid","invalid","v103-valid","v103-invalid","youtube-force-valid-v105","youtube-force-invalid-v105"
    );

    if(!input.value.trim()) return;

    input.classList.add(result?.ok ? "youtube-force-valid-v105" : "youtube-force-invalid-v105");
  }

  function setPreview(field, result){
    const preview = ensurePreview(field);
    if(!preview) return;

    const img = preview.querySelector("img");
    const text = preview.querySelector(".youtube-preview-text-v105 span") ||
      preview.querySelector("#task-youtube-id-v104") ||
      preview.querySelector("#task-youtube-id-v102") ||
      preview.querySelector("span");

    if(result?.ok){
      if(img){
        img.src = result.thumbnail;
        img.onerror = function(){
          if(!img.dataset.v105Fallback){
            img.dataset.v105Fallback = "1";
            img.src = `https://img.youtube.com/vi/${result.id}/mqdefault.jpg`;
          }
        };
      }
      if(text) text.textContent = `Video-ID: ${result.id}`;
      preview.classList.add("visible", "v103-visible");
      preview.style.display = "flex";
    }else{
      if(img){
        img.removeAttribute("src");
        delete img.dataset.v105Fallback;
      }
      if(text) text.textContent = "";
      preview.classList.remove("visible", "v103-visible");
      preview.style.display = "none";
    }
  }

  function validate(showAlert=false){
    if(!typeIsVideo()){
      return {ok:true, notVideo:true};
    }

    const field = visibleField();
    const input = currentInput();

    const result = parseYouTubeV105(input?.value || "");

    setInputState(input, result);

    if(result.ok){
      setStatus(field, "Gültiger YouTube-Link. Die Vorschau wurde geladen.", "ok");
      setPreview(field, result);
      return result;
    }

    setStatus(field, result.reason, input?.value?.trim() ? "err" : "");
    setPreview(field, null);

    if(showAlert){
      input?.focus();
    }

    return result;
  }

  window.toniV105ValidateYouTubeField = validate;
  window.toniV104ValidateYouTubeField = validate;
  window.toniV103ValidateYouTubeField = validate;
  window.toniV102ValidateYouTubeField = validate;

  function patchButtons(){
    allYoutubeFields().forEach(field => {
      // Wenn Video aktiv ist, sichtbare Felder anzeigen; versteckte alte Felder nicht erzwingen.
      if(typeIsVideo() && !isVisible(field)){
        // Fallback-Feld sichtbar, falls überhaupt kein Feld sichtbar ist.
        if(!allYoutubeFields().some(isVisible)){
          field.classList.add("visible");
          field.style.display = "block";
        }
      }

      field.querySelectorAll("button").forEach(btn => {
        if((btn.textContent || "").trim().toLowerCase().includes("link prüfen") || btn.className.includes("youtube-check")){
          btn.type = "button";
          btn.classList.add("youtube-check-btn-v105-patched");
          btn.setAttribute("onclick", "return window.toniV105ButtonClick(event)");
          btn.onclick = window.toniV105ButtonClick;
        }
      });

      field.querySelectorAll("input").forEach(input => {
        if(input.type === "url" || input.id.toLowerCase().includes("youtube")){
          if(input.dataset.v105Installed !== "1"){
            input.dataset.v105Installed = "1";
            input.addEventListener("input", () => {
              clearTimeout(window.TONI_V105_YT_TIMER);
              window.TONI_V105_YT_TIMER = setTimeout(() => validate(false), 220);
            });
            input.addEventListener("paste", () => setTimeout(() => validate(false), 80));
            input.addEventListener("blur", () => validate(false));
          }
        }
      });
    });

    const type = document.getElementById("task-type");
    if(type && type.dataset.v105Installed !== "1"){
      type.dataset.v105Installed = "1";
      type.addEventListener("change", () => setTimeout(syncVisibility, 50));
    }

    syncVisibility();
  }

  function syncVisibility(){
    const fields = allYoutubeFields();

    if(typeIsVideo()){
      let anyVisible = fields.some(isVisible);
      if(!anyVisible){
        ensureFallbackField()?.classList.add("visible");
      }
    }else{
      fields.forEach(field => {
        field.classList.remove("visible");
        if(field.id === "task-youtube-field-force-v105") field.style.display = "none";
      });
    }
  }

  window.toniV105ButtonClick = function(event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    patchButtons();
    validate(true);
    return false;
  };

  // Harte Event-Delegation: reagiert auch dann, wenn ein alter Button neu gerendert wird.
  document.addEventListener("pointerdown", event => {
    const btn = event.target.closest?.("button");
    if(!btn) return;
    if((btn.textContent || "").trim().toLowerCase() === "link prüfen" || btn.className.includes("youtube-check")){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.toniV105ButtonClick(event);
    }
  }, true);

  document.addEventListener("click", event => {
    const btn = event.target.closest?.("button");
    if(!btn) return;
    if((btn.textContent || "").trim().toLowerCase() === "link prüfen" || btn.className.includes("youtube-check")){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      window.toniV105ButtonClick(event);
    }
  }, true);

  function buildTaskV105(){
    const type = document.getElementById("task-type")?.value || "Aufgabe";
    const title = document.getElementById("task-title")?.value.trim();
    const description = document.getElementById("task-description")?.value.trim();
    const required = document.getElementById("task-required")?.checked !== false;

    if(!title){
      alert("Bitte gib einen Aufgabentitel ein.");
      document.getElementById("task-title")?.focus();
      return null;
    }

    const task = {
      id:"task-" + uuid(),
      title,
      type,
      description:description || "",
      content:description || title,
      required,
      status:"todo"
    };

    if(String(type).toLowerCase() === "video"){
      const yt = validate(true);

      if(!yt.ok){
        alert(yt.reason + "\n\nDie Video-Aufgabe kann erst gespeichert werden, wenn ein vollständiger gültiger YouTube-Link eingetragen ist.");
        currentInput()?.focus();
        return null;
      }

      task.youtube_url = yt.url;
      task.youtube_video_id = yt.id;
      task.youtube_thumbnail = yt.thumbnail;
      task.youtube_embed_url = yt.embed_url;
      task.video_url = yt.url;
      task.video_id = yt.id;
      task.video_thumbnail = yt.thumbnail;
      task.content = description || yt.url;
    }

    return task;
  }

  function clearTaskFormV105(){
    const type = document.getElementById("task-type");
    const title = document.getElementById("task-title");
    const desc = document.getElementById("task-description");
    const req = document.getElementById("task-required");

    if(type) type.value = "Info";
    if(title) title.value = "";
    if(desc) desc.value = "";
    if(req) req.checked = true;

    allYoutubeFields().forEach(field => {
      field.querySelectorAll("input").forEach(input => {
        if(input.type === "url" || input.id.toLowerCase().includes("youtube")){
          input.value = "";
          setInputState(input, null);
        }
      });
      setStatus(field, "Bitte füge einen vollständigen YouTube-Link ein.", "");
      setPreview(field, null);
    });

    syncVisibility();
  }

  window.addTaskToStationBuilder = function(){
    patchButtons();

    const task = buildTaskV105();
    if(!task) return;

    window.TONI_CURRENT_STATION_TASKS = window.TONI_CURRENT_STATION_TASKS || [];
    window.TONI_CURRENT_STATION_TASKS.push(task);

    clearTaskFormV105();

    if(typeof renderTaskBuilderListV17 === "function") renderTaskBuilderListV17();
    if(typeof syncJourneyBuilderToLegacyTextareaV17 === "function") syncJourneyBuilderToLegacyTextareaV17();
  };

  window.clearTaskBuilder = clearTaskFormV105;

  window.renderTaskBuilderListV17 = function(){
    const wrap = document.getElementById("station-task-list");
    if(!wrap) return;

    const tasks = window.TONI_CURRENT_STATION_TASKS || [];

    if(!tasks.length){
      wrap.innerHTML = '<div class="journey-empty">Noch keine Aufgabe für diese Station hinzugefügt.</div>';
      return;
    }

    wrap.innerHTML = tasks.map((task,index) => {
      const isVideo = String(task.type || "").toLowerCase() === "video";
      const videoInfo = isVideo && (task.youtube_url || task.video_url)
        ? `<br><span class="youtube-chip-v104">▶ YouTube-Video gespeichert</span>`
        : "";

      return `
        <div class="station-task-chip">
          <div>
            <strong>${esc(task.type)} · ${esc(task.title)}</strong><br>
            ${task.required ? "Pflichtaufgabe" : "Optionale Aufgabe"}
            ${task.description ? " · " + esc(task.description) : ""}
            ${videoInfo}
          </div>
          <button type="button" class="station-small-btn" onclick="removeTaskFromStationBuilder(${index})">Entfernen</button>
        </div>
      `;
    }).join("");
  };

  // Direkter Builder-Speicherpfad bleibt aktiv, damit YouTube-Daten nicht verloren gehen.
  window.buildJourneyFromFormV16 = function(id){
    const title = document.getElementById("journey-title")?.value.trim();
    const subject = document.getElementById("journey-subject")?.value.trim();
    const goal = document.getElementById("journey-goal")?.value.trim();
    const description = document.getElementById("journey-description")?.value.trim();

    if(!title) throw new Error("Bitte gib einen Titel ein.");
    if(!goal) throw new Error("Bitte gib ein Lernziel ein.");

    let steps = Array.isArray(window.TONI_JOURNEY_BUILDER_STATIONS)
      ? JSON.parse(JSON.stringify(window.TONI_JOURNEY_BUILDER_STATIONS))
      : [];

    if(!steps.length){
      const structure = document.getElementById("journey-structure")?.value.trim();
      if(!structure) throw new Error("Bitte lege Stationen und Aufgaben an.");
      steps = typeof parseJourneyStructureV16 === "function" ? parseJourneyStructureV16(structure) : [];
    }

    if(!steps.length){
      throw new Error("Bitte lege mindestens eine Station an.");
    }

    steps = steps.map((step, stepIndex) => ({
      ...step,
      id:step.id || "station-" + (stepIndex + 1) + "-" + uuid().slice(0,8),
      tasks:(step.tasks || []).map(task => ({
        ...task,
        id:task.id || "task-" + uuid(),
        status: stepIndex === 0 ? (task.status === "done" ? "done" : "todo") : (task.status === "done" ? "done" : "locked"),
        required: task.required !== false
      }))
    }));

    return {
      id:id || (typeof uuidLikeV16 === "function" ? uuidLikeV16() : uuid()),
      title,
      subject,
      goal,
      description,
      cover_image:document.getElementById("journey-cover-image")?.value || "",
      cover_image_name:document.getElementById("journey-cover-name")?.value || "",
      cover_image_path:document.getElementById("journey-cover-storage-path")?.value || "",
      cover_image_embedded:document.getElementById("journey-cover-embedded")?.value || "",
      steps
    };
  };

  function boot(){
    patchButtons();
  }

  window.toniV105PatchYouTubeButtons = boot;

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 50);
    setTimeout(boot, 250);
    setTimeout(boot, 800);
    setTimeout(boot, 1600);
    setTimeout(boot, 3000);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V105_TIMER);
      window.TONI_V105_TIMER = setTimeout(boot, 60);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });
})();

/* TONI V106 – doppelte YouTube-Felder entfernen und ein einziges Feld verwalten */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV17Escape === "function") return toniV17Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function uuid(){
    try{
      if(typeof toniV17Uuid === "function") return toniV17Uuid();
      if(typeof uuidLikeV16 === "function") return uuidLikeV16();
      return crypto.randomUUID();
    }catch{
      return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    }
  }

  function parseYouTube(value){
    let raw = String(value || "").trim().replace(/[)\]\s]+$/g, "");

    if(!raw){
      return {ok:false, reason:"Bitte füge einen vollständigen YouTube-Link ein."};
    }

    if(/^((www\.)?youtube\.com|m\.youtube\.com|music\.youtube\.com|youtu\.be)\//i.test(raw)){
      raw = "https://" + raw;
    }

    let url;
    try{
      url = new URL(raw);
    }catch{
      return {ok:false, reason:"Der Link ist keine gültige URL. Beispiel: https://www.youtube.com/watch?v=dQw4w9WgXcQ"};
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    let id = "";

    if(host === "youtu.be"){
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    }else if(["youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com"].includes(host)){
      const parts = url.pathname.split("/").filter(Boolean);

      if(url.pathname === "/watch"){
        id = url.searchParams.get("v") || "";
      }else if(["embed","shorts","live"].includes(parts[0])){
        id = parts[1] || "";
      }
    }else{
      return {ok:false, reason:"Bitte verwende einen YouTube-Link, z. B. youtube.com/watch?v=VIDEOID oder youtu.be/VIDEOID."};
    }

    id = String(id || "").trim();

    if(!id){
      return {ok:false, reason:"Der Link ist unvollständig. Bei youtube.com/watch muss hinter ?v= die Video-ID stehen."};
    }

    if(!/^[A-Za-z0-9_-]{11}$/.test(id)){
      return {ok:false, reason:"Die Video-ID hat nicht das erwartete YouTube-Format. Bitte prüfe den Link."};
    }

    return {
      ok:true,
      id,
      url:`https://www.youtube.com/watch?v=${id}`,
      embed_url:`https://www.youtube.com/embed/${id}`,
      thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  }

  window.toniV106ParseYouTubeUrl = parseYouTube;
  window.toniV105ParseYouTubeUrl = parseYouTube;
  window.toniV104ParseYouTubeUrl = parseYouTube;
  window.toniV103ParseYouTubeUrl = parseYouTube;
  window.toniV102ParseYouTubeUrl = parseYouTube;

  function isVideo(){
    return String(document.getElementById("task-type")?.value || "").toLowerCase() === "video";
  }

  function collectOldValues(){
    const ids = [
      "task-youtube-url-v106",
      "task-youtube-url-v104",
      "task-youtube-url-v102",
      "task-youtube-url-v103",
      "task-youtube-url-force-v105"
    ];

    for(const id of ids){
      const value = document.getElementById(id)?.value?.trim();
      if(value) return value;
    }

    const any = Array.from(document.querySelectorAll("input"))
      .find(input => input.id?.toLowerCase().includes("youtube") && input.value?.trim());

    return any?.value?.trim() || "";
  }

  function canonicalHtml(value=""){
    return `
      <label class="lr-form-label" for="task-youtube-url-v106">YouTube-Link zum Video</label>
      <div class="youtube-input-row-v106">
        <input id="task-youtube-url-v106" type="url" inputmode="url"
               placeholder="z. B. https://www.youtube.com/watch?v=dQw4w9WgXcQ"
               value="${esc(value)}"/>
        <button type="button" id="task-youtube-check-v106">Link prüfen</button>
      </div>
      <div id="task-youtube-status-v106">Bitte füge einen vollständigen YouTube-Link ein.</div>
      <div id="task-youtube-preview-v106">
        <img id="task-youtube-thumb-v106" alt="YouTube-Vorschau"/>
        <div class="youtube-preview-text-v106">
          <strong>YouTube-Video erkannt</strong>
          <span id="task-youtube-id-v106"></span>
        </div>
      </div>
      <div class="youtube-help-v106">
        Zulässig sind vollständige Links wie <strong>youtube.com/watch?v=VIDEOID</strong>,
        <strong>youtu.be/VIDEOID</strong>, <strong>/embed/VIDEOID</strong> oder <strong>/shorts/VIDEOID</strong>.
      </div>
    `;
  }

  function removeDuplicateFields(){
    const keep = document.getElementById("task-youtube-field-v106");

    [
      "task-youtube-field-v102",
      "task-youtube-field-v103",
      "task-youtube-field-v104",
      "task-youtube-field-force-v105"
    ].forEach(id => {
      const el = document.getElementById(id);
      if(el && el !== keep){
        el.remove();
      }
    });

    // Falls frühere Versionen Felder nur über Klassen erzeugt haben, entfernen.
    document.querySelectorAll(".youtube-task-field-v102,.youtube-task-field-v103,.youtube-task-field-v104").forEach(el => {
      if(el.id !== "task-youtube-field-v106"){
        el.remove();
      }
    });
  }

  function ensureField(){
    const desc = document.getElementById("task-description");
    if(!desc) return null;

    const value = collectOldValues();

    let field = document.getElementById("task-youtube-field-v106");

    if(!field){
      field = document.createElement("div");
      field.id = "task-youtube-field-v106";
      field.innerHTML = canonicalHtml(value);

      const descGroup = desc.closest(".lr-form-group") || desc.parentElement;
      descGroup?.insertAdjacentElement("afterend", field);
    }else if(!document.getElementById("task-youtube-url-v106") || !document.getElementById("task-youtube-check-v106")){
      field.innerHTML = canonicalHtml(value);
    }

    removeDuplicateFields();

    const type = document.getElementById("task-type");
    if(type && type.dataset.v106Installed !== "1"){
      type.dataset.v106Installed = "1";
      type.addEventListener("change", syncVisibility);
    }

    const input = document.getElementById("task-youtube-url-v106");
    if(input && input.dataset.v106Installed !== "1"){
      input.dataset.v106Installed = "1";
      input.addEventListener("input", () => {
        clearTimeout(window.TONI_V106_YT_TIMER);
        window.TONI_V106_YT_TIMER = setTimeout(() => validate(false), 220);
      });
      input.addEventListener("paste", () => setTimeout(() => validate(false), 80));
      input.addEventListener("blur", () => validate(false));
    }

    const button = document.getElementById("task-youtube-check-v106");
    if(button){
      button.onclick = function(event){
        event.preventDefault();
        event.stopPropagation();
        validate(true);
        return false;
      };
    }

    syncVisibility();
    return field;
  }

  function setStatus(text, mode=""){
    const status = document.getElementById("task-youtube-status-v106");
    if(!status) return;
    status.textContent = text || "";
    status.className = mode;
  }

  function setPreview(result){
    const preview = document.getElementById("task-youtube-preview-v106");
    const img = document.getElementById("task-youtube-thumb-v106");
    const label = document.getElementById("task-youtube-id-v106");

    if(result?.ok){
      if(img){
        img.src = result.thumbnail;
        img.onerror = function(){
          if(!img.dataset.v106Fallback){
            img.dataset.v106Fallback = "1";
            img.src = `https://img.youtube.com/vi/${result.id}/mqdefault.jpg`;
          }
        };
      }
      if(label) label.textContent = `Video-ID: ${result.id}`;
      preview?.classList.add("visible");
    }else{
      if(img){
        img.removeAttribute("src");
        delete img.dataset.v106Fallback;
      }
      if(label) label.textContent = "";
      preview?.classList.remove("visible");
    }
  }

  function markInput(result){
    const input = document.getElementById("task-youtube-url-v106");
    if(!input) return;

    input.classList.remove("valid", "invalid");

    if(!input.value.trim()) return;

    input.classList.add(result?.ok ? "valid" : "invalid");
  }

  function syncVisibility(){
    const field = document.getElementById("task-youtube-field-v106");
    if(!field) return;

    if(isVideo()){
      field.classList.add("visible");
      validate(false);
    }else{
      field.classList.remove("visible");
      setPreview(null);
      setStatus("", "");
      markInput(null);
    }
  }

  function validate(showAlert=false){
    ensureField();

    if(!isVideo()){
      return {ok:true, notVideo:true};
    }

    const input = document.getElementById("task-youtube-url-v106");
    const result = parseYouTube(input?.value || "");

    markInput(result);

    if(result.ok){
      setStatus("Gültiger YouTube-Link. Die Vorschau wurde geladen.", "ok");
      setPreview(result);
      return result;
    }

    setStatus(result.reason, input?.value?.trim() ? "err" : "");
    setPreview(null);

    if(showAlert){
      input?.focus();
    }

    return result;
  }

  window.toniV106ValidateYouTubeField = validate;
  window.toniV105ValidateYouTubeField = validate;
  window.toniV104ValidateYouTubeField = validate;
  window.toniV103ValidateYouTubeField = validate;
  window.toniV102ValidateYouTubeField = validate;

  function buildTask(){
    const type = document.getElementById("task-type")?.value || "Aufgabe";
    const title = document.getElementById("task-title")?.value.trim();
    const description = document.getElementById("task-description")?.value.trim();
    const required = document.getElementById("task-required")?.checked !== false;

    if(!title){
      alert("Bitte gib einen Aufgabentitel ein.");
      document.getElementById("task-title")?.focus();
      return null;
    }

    const task = {
      id:"task-" + uuid(),
      title,
      type,
      description:description || "",
      content:description || title,
      required,
      status:"todo"
    };

    if(String(type).toLowerCase() === "video"){
      const yt = validate(true);

      if(!yt.ok){
        alert(yt.reason + "\n\nDie Video-Aufgabe kann erst gespeichert werden, wenn ein vollständiger gültiger YouTube-Link eingetragen ist.");
        document.getElementById("task-youtube-url-v106")?.focus();
        return null;
      }

      task.youtube_url = yt.url;
      task.youtube_video_id = yt.id;
      task.youtube_thumbnail = yt.thumbnail;
      task.youtube_embed_url = yt.embed_url;
      task.video_url = yt.url;
      task.video_id = yt.id;
      task.video_thumbnail = yt.thumbnail;
      task.content = description || yt.url;
    }

    return task;
  }

  function clearTaskForm(){
    const type = document.getElementById("task-type");
    const title = document.getElementById("task-title");
    const desc = document.getElementById("task-description");
    const req = document.getElementById("task-required");
    const input = document.getElementById("task-youtube-url-v106");

    if(type) type.value = "Info";
    if(title) title.value = "";
    if(desc) desc.value = "";
    if(req) req.checked = true;
    if(input) input.value = "";

    setPreview(null);
    setStatus("Bitte füge einen vollständigen YouTube-Link ein.", "");
    markInput(null);
    syncVisibility();
  }

  window.addTaskToStationBuilder = function(){
    ensureField();

    const task = buildTask();
    if(!task) return;

    window.TONI_CURRENT_STATION_TASKS = window.TONI_CURRENT_STATION_TASKS || [];
    window.TONI_CURRENT_STATION_TASKS.push(task);

    clearTaskForm();

    if(typeof renderTaskBuilderListV17 === "function") renderTaskBuilderListV17();
    if(typeof syncJourneyBuilderToLegacyTextareaV17 === "function") syncJourneyBuilderToLegacyTextareaV17();
  };

  window.clearTaskBuilder = clearTaskForm;

  window.renderTaskBuilderListV17 = function(){
    const wrap = document.getElementById("station-task-list");
    if(!wrap) return;

    const tasks = window.TONI_CURRENT_STATION_TASKS || [];

    if(!tasks.length){
      wrap.innerHTML = '<div class="journey-empty">Noch keine Aufgabe für diese Station hinzugefügt.</div>';
      return;
    }

    wrap.innerHTML = tasks.map((task,index) => {
      const isVideoTask = String(task.type || "").toLowerCase() === "video";
      const videoInfo = isVideoTask && (task.youtube_url || task.video_url)
        ? `<br><span class="youtube-chip-v106">▶ YouTube-Video gespeichert</span>`
        : "";

      return `
        <div class="station-task-chip">
          <div>
            <strong>${esc(task.type)} · ${esc(task.title)}</strong><br>
            ${task.required ? "Pflichtaufgabe" : "Optionale Aufgabe"}
            ${task.description ? " · " + esc(task.description) : ""}
            ${videoInfo}
          </div>
          <button type="button" class="station-small-btn" onclick="removeTaskFromStationBuilder(${index})">Entfernen</button>
        </div>
      `;
    }).join("");
  };

  window.buildJourneyFromFormV16 = function(id){
    const title = document.getElementById("journey-title")?.value.trim();
    const subject = document.getElementById("journey-subject")?.value.trim();
    const goal = document.getElementById("journey-goal")?.value.trim();
    const description = document.getElementById("journey-description")?.value.trim();

    if(!title) throw new Error("Bitte gib einen Titel ein.");
    if(!goal) throw new Error("Bitte gib ein Lernziel ein.");

    let steps = Array.isArray(window.TONI_JOURNEY_BUILDER_STATIONS)
      ? JSON.parse(JSON.stringify(window.TONI_JOURNEY_BUILDER_STATIONS))
      : [];

    if(!steps.length){
      const structure = document.getElementById("journey-structure")?.value.trim();
      if(!structure) throw new Error("Bitte lege Stationen und Aufgaben an.");
      steps = typeof parseJourneyStructureV16 === "function" ? parseJourneyStructureV16(structure) : [];
    }

    if(!steps.length){
      throw new Error("Bitte lege mindestens eine Station an.");
    }

    steps = steps.map((step, stepIndex) => ({
      ...step,
      id:step.id || "station-" + (stepIndex + 1) + "-" + uuid().slice(0,8),
      tasks:(step.tasks || []).map(task => ({
        ...task,
        id:task.id || "task-" + uuid(),
        status: stepIndex === 0 ? (task.status === "done" ? "done" : "todo") : (task.status === "done" ? "done" : "locked"),
        required: task.required !== false
      }))
    }));

    return {
      id:id || (typeof uuidLikeV16 === "function" ? uuidLikeV16() : uuid()),
      title,
      subject,
      goal,
      description,
      cover_image:document.getElementById("journey-cover-image")?.value || "",
      cover_image_name:document.getElementById("journey-cover-name")?.value || "",
      cover_image_path:document.getElementById("journey-cover-storage-path")?.value || "",
      cover_image_embedded:document.getElementById("journey-cover-embedded")?.value || "",
      steps
    };
  };

  // Harte Delegation: Klick auf jeden sichtbaren „Link prüfen“-Button löst V106 aus.
  document.addEventListener("click", event => {
    const btn = event.target.closest?.("button");
    if(!btn) return;

    if((btn.textContent || "").trim().toLowerCase() === "link prüfen" || btn.id === "task-youtube-check-v106"){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      ensureField();
      validate(true);
    }
  }, true);

  function boot(){
    ensureField();
    removeDuplicateFields();
    syncVisibility();
  }

  window.toniV106EnsureSingleYouTubeField = boot;

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 50);
    setTimeout(boot, 250);
    setTimeout(boot, 800);
    setTimeout(boot, 1600);
    setTimeout(boot, 3000);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V106_TIMER);
      window.TONI_V106_TIMER = setTimeout(boot, 60);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });
})();

/* TONI V108 – Video-Vorschau nur einmal und Video-Kasten im Aufgabenmodal */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV17Escape === "function") return toniV17Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function findSelectedTask(){
    try{
      const id = (typeof STATE !== "undefined" && STATE.selectedTaskId) ? STATE.selectedTaskId : null;
      if(id && typeof findTask === "function") return findTask(id);
    }catch{}
    return null;
  }

  function videoData(task){
    const id = task?.youtube_video_id || task?.video_id || "";
    const url = task?.youtube_url || task?.video_url || (id ? `https://www.youtube.com/watch?v=${id}` : "");
    const embed = task?.youtube_embed_url || (id ? `https://www.youtube.com/embed/${id}` : "");
    const thumb = task?.youtube_thumbnail || task?.video_thumbnail || (id ? `https://img.youtube.com/vi/${id}/hqdefault.jpg` : "");

    return {
      isVideo:String(task?.type || "").toLowerCase() === "video" && !!(id || url),
      id,
      url,
      embed,
      thumb
    };
  }

  function videoThumbHtml(task){
    const v = videoData(task);
    if(!v.isVideo || !v.thumb) return "";

    return `
      <div class="lr-task-video-thumb-v108">
        <img src="${esc(v.thumb)}" alt="Video-Vorschau">
      </div>
    `;
  }

  function taskCardHtmlV108(task){
    const status = task?.status || "todo";
    const titleIcon = status === "done" ? "✅ " : status === "in_progress" ? "🟡 " : status === "locked" ? "🔒 " : "☐ ";
    const tags = `
      <div class="lr-task-tags">
        <span class="lr-task-tag">${esc(task?.type || "Aufgabe")}</span>
        <span class="lr-task-tag ${task?.required ? "required" : "optional"}">${task?.required ? "Pflicht" : "optional"}</span>
        ${status === "done" ? '<span class="lr-task-tag done">erledigt</span>' : ""}
      </div>
    `;

    const buttons = `
      <div class="lr-task-buttons">
        <button class="lr-secondary-btn" onclick="openLearningTask('${esc(task?.id || "")}')">Öffnen</button>
        ${status !== "done" && status !== "locked" ? `<button class="lr-success-btn" onclick="completeLearningTask('${esc(task?.id || "")}')">Erledigt</button>` : ""}
      </div>
    `;

    return `
      <div class="lr-task-card ${esc(status)}">
        <div class="lr-task-title">${titleIcon}${esc(task?.title || "Aufgabe")}</div>
        <div class="lr-task-desc">${esc(task?.description || "")}</div>
        ${videoThumbHtml(task)}
        ${tags}
        ${buttons}
      </div>
    `;
  }

  // Finale Aufgabenkarten-Ausgabe: entfernt zuverlässig doppelte Video-Blöcke/Text/Links.
  window.taskCardHtml = taskCardHtmlV108;

  function normalizeTaskModalBody(){
    const body = document.querySelector("#lr-task-modal .lr-modal-body");
    if(!body) return null;

    const oldLayout = body.querySelector(".lr-task-modal-layout-v108");
    if(oldLayout){
      const left = oldLayout.querySelector(".lr-task-modal-left-v108");
      if(left){
        ["lr-task-content","lr-answer","lr-task-hint"].forEach(id => {
          const el = left.querySelector("#" + id);
          if(el) body.appendChild(el);
        });

        const label = left.querySelector('label[for="lr-answer"]');
        if(label) body.insertBefore(label, document.getElementById("lr-answer"));

        const buttons = left.querySelector(".lr-task-buttons");
        if(buttons) body.appendChild(buttons);
      }

      oldLayout.remove();
    }

    body.querySelector(".lr-task-modal-video-box-v108")?.remove();

    return body;
  }

  function videoBoxHtml(task){
    const v = videoData(task);
    if(!v.isVideo) return "";

    const safeEmbed = v.embed ? v.embed + (v.embed.includes("?") ? "&" : "?") + "rel=0&modestbranding=1&autoplay=1" : "";

    return `
      <aside class="lr-task-modal-video-box-v108" id="lr-task-video-box-v108">
        <div class="lr-task-video-stage-v108" id="lr-task-video-stage-v108" data-embed="${esc(safeEmbed)}">
          ${v.thumb ? `<img src="${esc(v.thumb)}" alt="Video-Vorschau">` : ""}
          <button type="button" class="lr-task-video-play-v108" onclick="toniV108PlayTaskVideo()" aria-label="Video abspielen">▶</button>
          <button type="button" class="lr-task-video-fullscreen-v108" onclick="toniV108FullscreenTaskVideo()" aria-label="Vollbild">⛶</button>
        </div>
        <div class="lr-task-video-caption-v108">
          <strong>Video zur Aufgabe</strong><br>
          Starte das Video direkt in TONI. Über ⛶ wechselst du in den Vollbildmodus.
        </div>
      </aside>
    `;
  }

  function decorateTaskModal(){
    const found = findSelectedTask();
    const task = found?.task;
    const v = videoData(task);

    const body = normalizeTaskModalBody();
    if(!body) return;

    // Auftrag bereinigen: Bei Video-Aufgaben nur den eigentlichen Auftrag zeigen, nicht den Link.
    const content = document.getElementById("lr-task-content");
    if(content && task){
      content.innerHTML = `<strong>Auftrag:</strong><br>${esc(task.description || task.content || task.title || "")}`;
    }

    if(!v.isVideo){
      return;
    }

    const contentBox = document.getElementById("lr-task-content");
    const label = body.querySelector('label[for="lr-answer"]');
    const answer = document.getElementById("lr-answer");
    const hint = document.getElementById("lr-task-hint");
    const buttons = Array.from(body.children).find(el => el.classList?.contains("lr-task-buttons"));

    const layout = document.createElement("div");
    layout.className = "lr-task-modal-layout-v108";

    const left = document.createElement("div");
    left.className = "lr-task-modal-left-v108";

    [contentBox, label, answer, hint, buttons].filter(Boolean).forEach(el => left.appendChild(el));

    layout.appendChild(left);
    layout.insertAdjacentHTML("beforeend", videoBoxHtml(task));

    body.appendChild(layout);
  }

  window.toniV108PlayTaskVideo = function(){
    const stage = document.getElementById("lr-task-video-stage-v108");
    if(!stage) return;

    const embed = stage.dataset.embed || "";
    if(!embed) return;

    stage.innerHTML = `
      <iframe src="${esc(embed)}" title="YouTube-Video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      <button type="button" class="lr-task-video-fullscreen-v108" onclick="toniV108FullscreenTaskVideo()" aria-label="Vollbild">⛶</button>
    `;
  };

  window.toniV108FullscreenTaskVideo = function(){
    const stage = document.getElementById("lr-task-video-stage-v108");
    if(!stage) return;

    if(!stage.querySelector("iframe")){
      window.toniV108PlayTaskVideo();
    }

    const target = document.getElementById("lr-task-video-stage-v108");

    try{
      if(target.requestFullscreen) target.requestFullscreen();
      else if(target.webkitRequestFullscreen) target.webkitRequestFullscreen();
      else if(target.msRequestFullscreen) target.msRequestFullscreen();
    }catch(error){
      console.warn("TONI V108: Vollbildmodus konnte nicht geöffnet werden:", error);
    }
  };

  // Öffnen des Aufgabenmodals patchen
  if(typeof window.openLearningTask === "function" && !window.openLearningTask.__toniV108Wrapped){
    const originalOpenLearningTask = window.openLearningTask;
    window.openLearningTask = function(...args){
      const result = originalOpenLearningTask.apply(this, args);
      setTimeout(decorateTaskModal, 30);
      setTimeout(decorateTaskModal, 150);
      return result;
    };
    window.openLearningTask.__toniV108Wrapped = true;
  }

  if(typeof window.closeLearningTask === "function" && !window.closeLearningTask.__toniV108Wrapped){
    const originalCloseLearningTask = window.closeLearningTask;
    window.closeLearningTask = function(...args){
      normalizeTaskModalBody();
      return originalCloseLearningTask.apply(this, args);
    };
    window.closeLearningTask.__toniV108Wrapped = true;
  }

  // Nach jedem Rendern Karten bereinigen: falls alte Wrapper noch Video-Blöcke injizieren.
  function cleanDuplicateVideoCards(){
    document.querySelectorAll(".lr-task-card").forEach(card => {
      const oldBlocks = card.querySelectorAll(".lr-task-video-v102,.lr-task-video-preview-v102");
      oldBlocks.forEach(el => el.remove());

      // Falls durch alte Wrapper doch mehrere V108-Thumbnails entstehen: nur erstes behalten.
      const thumbs = card.querySelectorAll(".lr-task-video-thumb-v108");
      thumbs.forEach((el, index) => {
        if(index > 0) el.remove();
      });

      // Alte Textlinks entfernen, falls noch vorhanden.
      card.querySelectorAll("a").forEach(a => {
        if((a.textContent || "").includes("Video öffnen")){
          a.remove();
        }
      });

      Array.from(card.querySelectorAll("*")).forEach(el => {
        if((el.textContent || "").trim() === "YouTube-Video"){
          el.remove();
        }
      });
    });
  }

  ["renderLearningJourneyModal","syncJourneyToDashboard","toniV98RenderSelectedStepTasks","toniV97SelectStation"].forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV108Wrapped){
      const original = window[fnName];
      window[fnName] = function(...args){
        const result = original.apply(this, args);
        setTimeout(cleanDuplicateVideoCards, 20);
        setTimeout(cleanDuplicateVideoCards, 140);
        return result;
      };
      window[fnName].__toniV108Wrapped = true;
    }
  });

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(cleanDuplicateVideoCards, 300);
    setTimeout(cleanDuplicateVideoCards, 1200);
    setTimeout(cleanDuplicateVideoCards, 2600);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V108_TIMER);
      window.TONI_V108_TIMER = setTimeout(() => {
        cleanDuplicateVideoCards();
        if(document.getElementById("lr-task-modal")?.classList.contains("open")){
          decorateTaskModal();
        }
      }, 90);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true
    });
  });
})();

/* TONI V109 – Video responsive einpassen und horizontales Scrollen entfernen */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV17Escape === "function") return toniV17Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function fitVideoStage(){
    const modal = document.querySelector("#lr-task-modal .lr-modal");
    const body = document.querySelector("#lr-task-modal .lr-modal-body");
    const layout = document.querySelector(".lr-task-modal-layout-v108, .lr-task-modal-layout-v109");
    const box = document.querySelector(".lr-task-modal-video-box-v108, .lr-task-modal-video-box-v109");
    const stage = document.querySelector(".lr-task-video-stage-v108, .lr-task-video-stage-v109");

    if(modal){
      modal.style.overflowX = "hidden";
      modal.style.maxWidth = "calc(100vw - 32px)";
      modal.style.boxSizing = "border-box";
    }

    if(body){
      body.style.overflowX = "hidden";
      body.style.maxWidth = "100%";
      body.style.boxSizing = "border-box";
    }

    if(layout){
      layout.classList.add("lr-task-modal-layout-v109");
      layout.style.maxWidth = "100%";
      layout.style.minWidth = "0";
      layout.style.overflow = "hidden";
      layout.style.boxSizing = "border-box";
    }

    if(box){
      box.classList.add("lr-task-modal-video-box-v109");
      box.style.width = "100%";
      box.style.maxWidth = "100%";
      box.style.minWidth = "0";
      box.style.overflow = "hidden";
      box.style.boxSizing = "border-box";
    }

    if(stage){
      stage.classList.add("lr-task-video-stage-v109");
      stage.style.width = "100%";
      stage.style.maxWidth = "100%";
      stage.style.minWidth = "0";
      stage.style.overflow = "hidden";
      stage.style.aspectRatio = "16 / 9";
      stage.style.height = "auto";
      stage.style.boxSizing = "border-box";

      const width = Math.max(220, Math.floor(stage.clientWidth || box?.clientWidth || 320));
      const height = Math.round(width * 9 / 16);
      stage.style.height = height + "px";

      stage.querySelectorAll("iframe,img").forEach(el => {
        el.removeAttribute("width");
        el.removeAttribute("height");
        el.style.position = "absolute";
        el.style.inset = "0";
        el.style.width = "100%";
        el.style.height = "100%";
        el.style.maxWidth = "100%";
        el.style.maxHeight = "100%";
        el.style.minWidth = "0";
        el.style.minHeight = "0";
        el.style.border = "0";
        el.style.display = "block";
        el.style.boxSizing = "border-box";
        if(el.tagName === "IMG"){
          el.style.objectFit = "cover";
        }
      });
    }

    // Falls ein Browser/YouTube trotzdem horizontalen Überlauf verursacht, Modal zurücksetzen.
    const taskModal = document.getElementById("lr-task-modal");
    if(taskModal){
      taskModal.scrollLeft = 0;
    }
    if(body){
      body.scrollLeft = 0;
    }
  }

  const oldPlay = window.toniV108PlayTaskVideo;
  window.toniV108PlayTaskVideo = function(){
    if(typeof oldPlay === "function"){
      oldPlay.apply(this, arguments);
    }

    setTimeout(fitVideoStage, 20);
    setTimeout(fitVideoStage, 120);
    setTimeout(fitVideoStage, 500);
  };

  const oldFullscreen = window.toniV108FullscreenTaskVideo;
  window.toniV108FullscreenTaskVideo = function(){
    fitVideoStage();

    if(typeof oldFullscreen === "function"){
      oldFullscreen.apply(this, arguments);
    }
  };

  function boot(){
    fitVideoStage();
  }

  ["openLearningTask","renderLearningJourneyModal","syncJourneyToDashboard"].forEach(fnName => {
    if(typeof window[fnName] === "function" && !window[fnName].__toniV109Wrapped){
      const original = window[fnName];
      window[fnName] = function(...args){
        const result = original.apply(this, args);
        setTimeout(fitVideoStage, 40);
        setTimeout(fitVideoStage, 180);
        setTimeout(fitVideoStage, 600);
        return result;
      };
      window[fnName].__toniV109Wrapped = true;
    }
  });

  window.toniV109FitVideoStage = fitVideoStage;

  window.addEventListener("resize", () => {
    clearTimeout(window.TONI_V109_RESIZE_TIMER);
    window.TONI_V109_RESIZE_TIMER = setTimeout(fitVideoStage, 80);
  });

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 250);
    setTimeout(boot, 1200);
    setTimeout(boot, 2600);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V109_TIMER);
      window.TONI_V109_TIMER = setTimeout(fitVideoStage, 80);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });
})();

/* TONI V110 – Fix: „+ Aufgabe hinzufügen“ übernimmt Video-Aufgaben zuverlässig */
(function(){
  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    if(typeof toniV17Escape === "function") return toniV17Escape(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function uuid(){
    try{
      if(typeof toniV17Uuid === "function") return toniV17Uuid();
      if(typeof uuidLikeV16 === "function") return uuidLikeV16();
      return crypto.randomUUID();
    }catch{
      return String(Date.now()) + "-" + Math.random().toString(16).slice(2);
    }
  }

  function parseYouTube(value){
    let raw = String(value || "").trim().replace(/[)\]\s]+$/g, "");

    if(!raw){
      return {ok:false, reason:"Bitte füge einen vollständigen YouTube-Link ein."};
    }

    if(/^((www\.)?youtube\.com|m\.youtube\.com|music\.youtube\.com|youtu\.be)\//i.test(raw)){
      raw = "https://" + raw;
    }

    let url;
    try{
      url = new URL(raw);
    }catch{
      return {ok:false, reason:"Der Link ist keine gültige URL. Beispiel: https://www.youtube.com/watch?v=dQw4w9WgXcQ"};
    }

    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    let id = "";

    if(host === "youtu.be"){
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    }else if(["youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com"].includes(host)){
      const parts = url.pathname.split("/").filter(Boolean);

      if(url.pathname === "/watch"){
        id = url.searchParams.get("v") || "";
      }else if(["embed","shorts","live"].includes(parts[0])){
        id = parts[1] || "";
      }
    }else{
      return {ok:false, reason:"Bitte verwende einen YouTube-Link, z. B. youtube.com/watch?v=VIDEOID oder youtu.be/VIDEOID."};
    }

    id = String(id || "").trim();

    if(!id){
      return {ok:false, reason:"Der Link ist unvollständig. Bei youtube.com/watch muss hinter ?v= die Video-ID stehen."};
    }

    if(!/^[A-Za-z0-9_-]{11}$/.test(id)){
      return {ok:false, reason:"Die Video-ID hat nicht das erwartete YouTube-Format. Bitte prüfe den Link."};
    }

    return {
      ok:true,
      id,
      url:`https://www.youtube.com/watch?v=${id}`,
      embed_url:`https://www.youtube.com/embed/${id}`,
      thumbnail:`https://img.youtube.com/vi/${id}/hqdefault.jpg`
    };
  }

  window.toniV110ParseYouTubeUrl = parseYouTube;
  window.toniV107ParseYouTubeUrl = parseYouTube;
  window.toniV106ParseYouTubeUrl = parseYouTube;
  window.toniV105ParseYouTubeUrl = parseYouTube;
  window.toniV104ParseYouTubeUrl = parseYouTube;
  window.toniV103ParseYouTubeUrl = parseYouTube;
  window.toniV102ParseYouTubeUrl = parseYouTube;

  function isVideoType(){
    return String(document.getElementById("task-type")?.value || "").toLowerCase() === "video";
  }

  function ensureArrayState(){
    if(!Array.isArray(window.TONI_CURRENT_STATION_TASKS)){
      window.TONI_CURRENT_STATION_TASKS = [];
    }

    if(!Array.isArray(window.TONI_JOURNEY_BUILDER_STATIONS)){
      window.TONI_JOURNEY_BUILDER_STATIONS = [];
    }
  }

  function youtubeInput(){
    return document.getElementById("task-youtube-url-v106") ||
      document.getElementById("task-youtube-url-v104") ||
      document.getElementById("task-youtube-url-v102") ||
      document.getElementById("task-youtube-url-v103") ||
      document.getElementById("task-youtube-url-force-v105") ||
      Array.from(document.querySelectorAll("input")).find(input => input.id?.toLowerCase().includes("youtube"));
  }

  function setYoutubeStatus(text, mode=""){
    const status = document.getElementById("task-youtube-status-v106") ||
      document.querySelector(".youtube-status-force-v105,.youtube-status-v104,.youtube-status-v103,.youtube-status-v102");

    if(status){
      status.textContent = text || "";
      status.className = mode;
      if(status.id === "task-youtube-status-v106"){
        status.className = mode;
      }
    }
  }

  function setYoutubeInputState(result){
    const input = youtubeInput();
    if(!input) return;

    input.classList.remove("valid","invalid","youtube-force-valid-v105","youtube-force-invalid-v105","v103-valid","v103-invalid");

    if(!input.value.trim()) return;

    input.classList.add(result?.ok ? "valid" : "invalid");
  }

  function setYoutubePreview(result){
    const preview = document.getElementById("task-youtube-preview-v106") ||
      document.querySelector(".youtube-preview-force-v105,.youtube-preview-v104,.youtube-preview-v103,.youtube-preview-v102");
    if(!preview) return;

    const img = preview.querySelector("img");
    const label = document.getElementById("task-youtube-id-v106") ||
      preview.querySelector(".youtube-preview-text-v106 span") ||
      preview.querySelector("span");

    if(result?.ok){
      if(img){
        img.src = result.thumbnail;
        img.onerror = function(){
          if(!img.dataset.v110Fallback){
            img.dataset.v110Fallback = "1";
            img.src = `https://img.youtube.com/vi/${result.id}/mqdefault.jpg`;
          }
        };
      }

      if(label) label.textContent = `Video-ID: ${result.id}`;

      preview.classList.add("visible", "v103-visible");
      preview.style.display = "flex";
    }else{
      if(img){
        img.removeAttribute("src");
        delete img.dataset.v110Fallback;
      }
      if(label) label.textContent = "";
      preview.classList.remove("visible", "v103-visible");
      preview.style.display = "none";
    }
  }

  function validateYoutube(showFocus=false){
    if(!isVideoType()){
      return {ok:true, notVideo:true};
    }

    const input = youtubeInput();
    const result = parseYouTube(input?.value || "");

    setYoutubeInputState(result);

    if(result.ok){
      setYoutubeStatus("Gültiger YouTube-Link. Die Vorschau wurde geladen.", "ok");
      setYoutubePreview(result);
      return result;
    }

    setYoutubeStatus(result.reason, input?.value?.trim() ? "err" : "");
    setYoutubePreview(null);

    if(showFocus) input?.focus();

    return result;
  }

  window.toniV110ValidateYouTubeField = validateYoutube;
  window.toniV107ValidateYouTubeField = validateYoutube;
  window.toniV106ValidateYouTubeField = validateYoutube;
  window.toniV105ValidateYouTubeField = validateYoutube;
  window.toniV104ValidateYouTubeField = validateYoutube;
  window.toniV103ValidateYouTubeField = validateYoutube;
  window.toniV102ValidateYouTubeField = validateYoutube;

  function buildTaskFromVisibleForm(){
    const type = document.getElementById("task-type")?.value || "Aufgabe";
    const title = document.getElementById("task-title")?.value.trim();
    const description = document.getElementById("task-description")?.value.trim();
    const required = document.getElementById("task-required")?.checked !== false;

    if(!title){
      alert("Bitte gib einen Aufgabentitel ein.");
      document.getElementById("task-title")?.focus();
      return null;
    }

    const task = {
      id:"task-" + uuid(),
      title,
      type,
      description:description || "",
      content:description || title,
      required,
      status:"todo"
    };

    if(String(type).toLowerCase() === "video"){
      const yt = validateYoutube(true);

      if(!yt.ok){
        alert(yt.reason + "\n\nDie Video-Aufgabe kann erst gespeichert werden, wenn ein vollständiger gültiger YouTube-Link eingetragen ist.");
        youtubeInput()?.focus();
        return null;
      }

      task.youtube_url = yt.url;
      task.youtube_video_id = yt.id;
      task.youtube_thumbnail = yt.thumbnail;
      task.youtube_embed_url = yt.embed_url;

      task.video_url = yt.url;
      task.video_id = yt.id;
      task.video_thumbnail = yt.thumbnail;

      task.content = description || yt.url;
    }

    return task;
  }

  function renderCurrentTaskList(){
    const wrap = document.getElementById("station-task-list");
    if(!wrap) return;

    const tasks = Array.isArray(window.TONI_CURRENT_STATION_TASKS) ? window.TONI_CURRENT_STATION_TASKS : [];

    if(!tasks.length){
      wrap.innerHTML = '<div class="journey-empty">Noch keine Aufgabe für diese Station hinzugefügt.</div>';
      return;
    }

    wrap.innerHTML = tasks.map((task,index) => {
      const videoInfo = String(task.type || "").toLowerCase() === "video" && (task.youtube_url || task.video_url)
        ? `<br><span class="youtube-chip-v110">▶ YouTube-Video gespeichert</span>`
        : "";

      return `
        <div class="station-task-chip">
          <div>
            <strong>${esc(task.type)} · ${esc(task.title)}</strong><br>
            ${task.required ? "Pflichtaufgabe" : "Optionale Aufgabe"}
            ${task.description ? " · " + esc(task.description) : ""}
            ${videoInfo}
          </div>
          <button type="button" class="station-small-btn" onclick="removeTaskFromStationBuilder(${index})">Entfernen</button>
        </div>
      `;
    }).join("");
  }

  function syncLegacySafely(){
    try{
      if(typeof syncJourneyBuilderToLegacyTextareaV17 === "function"){
        syncJourneyBuilderToLegacyTextareaV17();
      }
    }catch(error){
      console.warn("TONI V110: Legacy-Sync übersprungen:", error);
    }
  }

  function clearTaskFieldsAfterAdd(){
    const type = document.getElementById("task-type");
    const title = document.getElementById("task-title");
    const desc = document.getElementById("task-description");
    const req = document.getElementById("task-required");
    const input = youtubeInput();

    if(type) type.value = "Info";
    if(title) title.value = "";
    if(desc) desc.value = "";
    if(req) req.checked = true;
    if(input) input.value = "";

    setYoutubePreview(null);
    setYoutubeStatus("", "");
    setYoutubeInputState(null);

    const field = document.getElementById("task-youtube-field-v106");
    if(field) field.classList.remove("visible");
  }

  function addTaskRobustly(){
    ensureArrayState();

    const task = buildTaskFromVisibleForm();
    if(!task) return false;

    window.TONI_CURRENT_STATION_TASKS.push(task);

    // Wichtig: Liste sofort aus genau diesem Array rendern – nicht über ältere V17/V102-Versionen.
    renderCurrentTaskList();
    syncLegacySafely();

    clearTaskFieldsAfterAdd();

    // Noch einmal verzögert rendern, falls ein alter MutationObserver dazwischenfunkt.
    setTimeout(renderCurrentTaskList, 80);
    setTimeout(renderCurrentTaskList, 250);

    return true;
  }

  window.addTaskToStationBuilder = addTaskRobustly;
  window.renderTaskBuilderListV17 = renderCurrentTaskList;
  window.clearTaskBuilder = clearTaskFieldsAfterAdd;

  function patchAddButtons(){
    document.querySelectorAll("button").forEach(btn => {
      const text = (btn.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

      if(text.includes("aufgabe hinzufügen") && document.getElementById("task-title")){
        btn.type = "button";
        btn.setAttribute("onclick", "return window.toniV110AddTaskFromBuilder(event)");
        btn.onclick = window.toniV110AddTaskFromBuilder;
      }
    });
  }

  window.toniV110AddTaskFromBuilder = function(event){
    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();
    return addTaskRobustly();
  };

  // Capture-Handler repariert auch Buttons, die später neu gerendert werden.
  document.addEventListener("click", event => {
    const btn = event.target.closest?.("button");
    if(!btn) return;

    const text = (btn.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();

    if(text.includes("aufgabe hinzufügen") && document.getElementById("task-title")){
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      addTaskRobustly();
    }
  }, true);

  function patchYoutubeInput(){
    const input = youtubeInput();
    if(input && input.dataset.v110Installed !== "1"){
      input.dataset.v110Installed = "1";
      input.addEventListener("input", () => {
        clearTimeout(window.TONI_V110_YT_TIMER);
        window.TONI_V110_YT_TIMER = setTimeout(() => validateYoutube(false), 180);
      });
      input.addEventListener("paste", () => setTimeout(() => validateYoutube(false), 80));
      input.addEventListener("blur", () => validateYoutube(false));
    }

    const type = document.getElementById("task-type");
    if(type && type.dataset.v110Installed !== "1"){
      type.dataset.v110Installed = "1";
      type.addEventListener("change", () => {
        const field = document.getElementById("task-youtube-field-v106");
        if(field) field.classList.toggle("visible", isVideoType());
        if(isVideoType()) validateYoutube(false);
      });
    }

    const field = document.getElementById("task-youtube-field-v106");
    if(field){
      field.querySelectorAll("button").forEach(btn => btn.remove());
      field.classList.toggle("visible", isVideoType());
    }
  }

  function boot(){
    ensureArrayState();
    patchAddButtons();
    patchYoutubeInput();

    // Alte Versionen können Funktionen wieder überschreiben. Hier final zurücksetzen.
    window.addTaskToStationBuilder = addTaskRobustly;
    window.renderTaskBuilderListV17 = renderCurrentTaskList;
    window.clearTaskBuilder = clearTaskFieldsAfterAdd;
  }

  window.toniV110BootAddTaskFix = boot;

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(boot, 50);
    setTimeout(boot, 250);
    setTimeout(boot, 800);
    setTimeout(boot, 1600);
    setTimeout(boot, 3000);

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V110_TIMER);
      window.TONI_V110_TIMER = setTimeout(boot, 70);
    });

    observer.observe(document.body, {
      childList:true,
      subtree:true,
      attributes:true,
      attributeFilter:["class","style"]
    });
  });
})();


/* ============================================================
   TONI – Lerninhalt V1
   Spezialisierter Render für Aufgabentyp "Lerninhalt"
   Unterstützt: Text (HTML), Bilder, Datei-Anhänge, Links
   Tutor: Upload-UI im Aufgaben-Builder
   ============================================================ */
(function(){

  // ── Hilfsfunktionen ────────────────────────────────────────
  function esc(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

  function isLerninhalt(type){
    const t = String(type||'').toLowerCase();
    return t==='lerninhalt'||t==='info'||t==='erklärung'||t==='material';
  }

  async function getToken(){
    return typeof toniV27GetAccessToken==='function' ? await toniV27GetAccessToken() : null;
  }

  // ── Lerninhalt-Modal rendern ────────────────────────────────
  function renderLerninhaltModal(task){
    const modal = document.getElementById('lr-task-modal');
    if(!modal) return;

    // Header
    document.getElementById('lr-task-title').textContent = task.title;
    document.getElementById('lr-task-sub').textContent = '📖 Lerninhalt · ' + (task.description||'');

    // Body
    const body = modal.querySelector('.lr-modal-body');
    if(!body) return;

    // Inhaltsblöcke parsen
    let textHtml = '';
    let images = [];
    let files = [];
    let links = [];

    try {
      if(task.lerninhalt_blocks) {
        const blocks = typeof task.lerninhalt_blocks === 'string'
          ? JSON.parse(task.lerninhalt_blocks)
          : task.lerninhalt_blocks;
        blocks.forEach(b => {
          if(b.type==='text') textHtml += b.html||'';
          if(b.type==='image') images.push(b);
          if(b.type==='file') files.push(b);
          if(b.type==='link') links.push(b);
        });
      } else {
        // Fallback: altes content-Feld
        textHtml = task.content || '';
      }
    } catch(e) {
      textHtml = task.content || '';
    }

    // Links aus altem links-Array
    if(task.links && Array.isArray(task.links)) links = [...links, ...task.links];
    // YouTube aus youtube_url
    if(task.youtube_url) links.push({url: task.youtube_url, title: 'Video-Link', youtube: true});

    // Render
    body.innerHTML = `
      <div style="max-width:100%">
        ${textHtml ? `<div class="lr-task-content-box" style="font-size:14px;line-height:1.7;color:var(--color-text-primary)">${textHtml}</div>` : ''}

        ${images.length ? `
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin:10px 0">
            ${images.map(img=>`
              <div style="border-radius:8px;overflow:hidden;border:0.5px solid var(--color-border-tertiary);max-width:100%">
                <img src="${esc(img.url)}" alt="${esc(img.alt||'Bild')}"
                  style="max-width:100%;max-height:300px;display:block;object-fit:contain">
              </div>`).join('')}
          </div>` : ''}

        ${files.length ? `
          <div style="margin:10px 0">
            <div style="font-size:12px;font-weight:500;color:var(--color-text-secondary);margin-bottom:6px">Anhänge</div>
            ${files.map(f=>`
              <a href="${esc(f.url)}" target="_blank" download
                style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:8px;margin-bottom:6px;text-decoration:none;color:var(--color-text-primary)">
                <span style="font-size:18px">📎</span>
                <span style="font-size:13px;flex:1">${esc(f.name||f.url.split('/').pop())}</span>
                <span style="font-size:11px;color:var(--color-text-tertiary)">Herunterladen</span>
              </a>`).join('')}
          </div>` : ''}

        ${links.length ? `
          <div style="margin:10px 0">
            <div style="font-size:12px;font-weight:500;color:var(--color-text-secondary);margin-bottom:6px">Links</div>
            ${links.map(l=>`
              <a href="${esc(l.url)}" target="_blank" rel="noopener"
                style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#E6F1FB;border:0.5px solid #B5D4F4;border-radius:8px;margin-bottom:6px;text-decoration:none;color:#0C447C">
                <span style="font-size:16px">${l.youtube?'▶️':'🔗'}</span>
                <span style="font-size:13px;flex:1">${esc(l.title||l.url)}</span>
                <span style="font-size:11px;opacity:.7">Öffnen →</span>
              </a>`).join('')}
          </div>` : ''}

        <div id="lr-toni-hint-lerninhalt" style="margin:10px 0"></div>

        <div style="margin-top:16px;display:flex;gap:8px;flex-wrap:wrap">
          <button onclick="completeSelectedLearningTask()"
            style="padding:10px 20px;background:#639922;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:500;cursor:pointer">
            ✅ Gelesen – weiter
          </button>
          <button onclick="showSelectedTaskHint()"
            style="padding:10px 16px;background:none;border:0.5px solid var(--color-border-secondary);border-radius:8px;font-size:13px;cursor:pointer;color:var(--color-text-secondary)">
            Hinweis von TONI
          </button>
        </div>
      </div>`;

    // TONI-Begrüßung
    if(typeof appendMsg==='function' && typeof time==='function'){
      appendMsg('toni', `📖 <strong>${esc(task.title)}</strong> – lies den Inhalt aufmerksam durch. Klicke danach auf "Gelesen – weiter".`, time(), 'desktop');
    }

    modal.classList.add('open');
  }

  // ── openLearningTask hooken ─────────────────────────────────
  function hookOpenTask(){
    if(window.openLearningTask?.__toniLerninhaltWrapped) return;
    const orig = window.openLearningTask;
    if(typeof orig !== 'function') return;

    window.openLearningTask = function(id){
      // Task finden
      const f = typeof findTask==='function' ? findTask(id) : null;
      const task = f?.task;

      if(task && isLerninhalt(task.type)){
        // Status auf in_progress setzen
        if(task.status==='todo') task.status='in_progress';
        STATE.selectedTaskId = id;
        renderLerninhaltModal(task);
        if(typeof syncJourneyToDashboard==='function') syncJourneyToDashboard();
        if(typeof renderLearningJourneyModal==='function') renderLearningJourneyModal();
        return;
      }
      return orig.apply(this, arguments);
    };
    window.openLearningTask.__toniLerninhaltWrapped = true;
    window.openLearningTask.__toniV108Wrapped = true; // Prevent double-wrap
  }

  // ── Tutor: Lerninhalt-Builder erweitern ─────────────────────
  function enhanceTaskBuilder(){
    const typeSelect = document.getElementById('task-type');
    if(!typeSelect || typeSelect.__toniLerninhaltEnhanced) return;
    typeSelect.__toniLerninhaltEnhanced = true;

    const container = typeSelect.closest('.lr-form-group')?.parentElement;
    if(!container) return;

    // Lerninhalt-Extras einfügen (erscheinen nur wenn Lerninhalt gewählt)
    const extras = document.createElement('div');
    extras.id = 'lerninhalt-extras';
    extras.style.cssText = 'display:none;margin-top:10px';
    extras.innerHTML = `
      <div style="background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:8px;padding:10px">
        <div style="font-size:12px;font-weight:500;color:var(--color-text-secondary);margin-bottom:8px">📖 Lerninhalt-Optionen</div>

        <div style="margin-bottom:8px">
          <label style="font-size:11px;color:var(--color-text-tertiary);display:block;margin-bottom:4px">Bild hinzufügen</label>
          <input type="file" id="lerninhalt-img-upload" accept="image/*"
            style="font-size:12px;width:100%"
            onchange="handleLerninhaltImageUpload(this)">
          <div id="lerninhalt-img-preview" style="margin-top:6px;display:flex;gap:6px;flex-wrap:wrap"></div>
        </div>

        <div style="margin-bottom:8px">
          <label style="font-size:11px;color:var(--color-text-tertiary);display:block;margin-bottom:4px">Datei-Anhang</label>
          <input type="file" id="lerninhalt-file-upload" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
            style="font-size:12px;width:100%"
            onchange="handleLerninhaltFileUpload(this)">
          <div id="lerninhalt-file-list" style="margin-top:4px"></div>
        </div>

        <div>
          <label style="font-size:11px;color:var(--color-text-tertiary);display:block;margin-bottom:4px">Link hinzufügen</label>
          <div style="display:flex;gap:6px">
            <input type="url" id="lerninhalt-link-url" placeholder="https://..." style="flex:1;padding:6px 8px;border:0.5px solid var(--color-border-secondary);border-radius:6px;font-size:12px;background:var(--color-background-primary);color:var(--color-text-primary)">
            <input type="text" id="lerninhalt-link-title" placeholder="Titel (optional)" style="flex:1;padding:6px 8px;border:0.5px solid var(--color-border-secondary);border-radius:6px;font-size:12px;background:var(--color-background-primary);color:var(--color-text-primary)">
            <button type="button" onclick="addLerninhaltLink()" style="padding:6px 10px;background:#185FA5;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer">+</button>
          </div>
          <div id="lerninhalt-links-list" style="margin-top:4px"></div>
        </div>
      </div>`;

    // Nach dem task-type-Select einfügen
    const taskDescGroup = container.querySelector('#task-description')?.closest('.lr-form-group');
    if(taskDescGroup) {
      taskDescGroup.parentElement.insertBefore(extras, taskDescGroup.nextSibling);
    } else {
      container.appendChild(extras);
    }

    typeSelect.addEventListener('change', () => {
      extras.style.display = isLerninhalt(typeSelect.value) ? 'block' : 'none';
    });
  }

  // State für Uploads
  window.TONI_LERNINHALT_IMAGES = [];
  window.TONI_LERNINHALT_FILES = [];
  window.TONI_LERNINHALT_LINKS = [];

  window.handleLerninhaltImageUpload = async function(input){
    const file = input.files?.[0];
    if(!file) return;
    const preview = document.getElementById('lerninhalt-img-preview');
    if(preview) preview.innerHTML = '<span style="font-size:12px;color:var(--color-text-tertiary)">Wird hochgeladen…</span>';
    try {
      const token = await getToken();
      const path = `tasks/img_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g,'_')}`;
      const res = await fetch(`${window.SUPABASE_URL}/storage/v1/object/learning-content/${path}`, {
        method:'POST',
        headers:{'apikey':window.SUPABASE_ANON_KEY,'Authorization':'Bearer '+token,'Content-Type':file.type,'x-upsert':'true'},
        body: file
      });
      if(!res.ok) throw new Error(await res.text());
      const url = `${window.SUPABASE_URL}/storage/v1/object/public/learning-content/${path}`;
      window.TONI_LERNINHALT_IMAGES.push({type:'image', url, alt:file.name});
      if(preview) preview.innerHTML = `<img src="${url}" style="max-height:80px;border-radius:6px;border:0.5px solid var(--color-border-tertiary)"><br><span style="font-size:11px;color:#27500A">✅ Hochgeladen</span>`;
    } catch(e) {
      if(preview) preview.innerHTML = `<span style="font-size:12px;color:#A32D2D">Fehler: ${esc(e.message)}</span>`;
    }
  };

  window.handleLerninhaltFileUpload = async function(input){
    const file = input.files?.[0];
    if(!file) return;
    const list = document.getElementById('lerninhalt-file-list');
    if(list) list.innerHTML = '<span style="font-size:12px;color:var(--color-text-tertiary)">Wird hochgeladen…</span>';
    try {
      const token = await getToken();
      const path = `tasks/files/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g,'_')}`;
      const res = await fetch(`${window.SUPABASE_URL}/storage/v1/object/learning-content/${path}`, {
        method:'POST',
        headers:{'apikey':window.SUPABASE_ANON_KEY,'Authorization':'Bearer '+token,'Content-Type':file.type,'x-upsert':'true'},
        body: file
      });
      if(!res.ok) throw new Error(await res.text());
      const url = `${window.SUPABASE_URL}/storage/v1/object/public/learning-content/${path}`;
      window.TONI_LERNINHALT_FILES.push({type:'file', url, name:file.name});
      if(list) list.innerHTML = `<span style="font-size:11px;color:#27500A">✅ ${esc(file.name)}</span>`;
    } catch(e) {
      if(list) list.innerHTML = `<span style="font-size:12px;color:#A32D2D">Fehler: ${esc(e.message)}</span>`;
    }
  };

  window.addLerninhaltLink = function(){
    const url = document.getElementById('lerninhalt-link-url')?.value.trim();
    const title = document.getElementById('lerninhalt-link-title')?.value.trim();
    if(!url) return;
    window.TONI_LERNINHALT_LINKS.push({type:'link', url, title:title||url});
    document.getElementById('lerninhalt-link-url').value = '';
    document.getElementById('lerninhalt-link-title').value = '';
    const list = document.getElementById('lerninhalt-links-list');
    if(list) list.innerHTML = window.TONI_LERNINHALT_LINKS.map(l=>
      `<div style="font-size:11px;color:var(--color-text-secondary);padding:2px 0">🔗 ${esc(l.title)}</div>`
    ).join('');
  };

  // Blocks direkt nach addTaskToStationBuilder in den letzten Task injizieren
  // Wir patchen den "+ Aufgabe hinzufügen" Button direkt
  function patchAddTaskButton(){
    // Alle Buttons mit "Aufgabe hinzufügen" Text finden und patchen
    document.querySelectorAll('button').forEach(btn => {
      if(btn.__toniLerninhaltPatched) return;
      const txt = btn.textContent||'';
      if(txt.includes('Aufgabe hinzufügen') || txt.includes('Aufgabe zur Station')) {
        btn.__toniLerninhaltPatched = true;
        const origOnclick = btn.onclick;
        btn.addEventListener('click', function(){
          // Nach kurzem Delay (damit orig-Handler fertig ist) Blocks injizieren
          setTimeout(() => {
            const blocks = [
              ...window.TONI_LERNINHALT_IMAGES,
              ...window.TONI_LERNINHALT_FILES,
              ...window.TONI_LERNINHALT_LINKS,
            ];
            if(!blocks.length) return;
            const tasks = window.TONI_CURRENT_STATION_TASKS;
            if(tasks?.length) {
              tasks[tasks.length-1].lerninhalt_blocks = blocks;
              console.log('✅ TONI Lerninhalt: Blocks injiziert', blocks);
            }
            // Reset
            window.TONI_LERNINHALT_IMAGES = [];
            window.TONI_LERNINHALT_FILES = [];
            window.TONI_LERNINHALT_LINKS = [];
            const preview = document.getElementById('lerninhalt-img-preview');
            const fileList = document.getElementById('lerninhalt-file-list');
            const linksList = document.getElementById('lerninhalt-links-list');
            if(preview) preview.innerHTML = '';
            if(fileList) fileList.innerHTML = '';
            if(linksList) linksList.innerHTML = '';
          }, 100);
        });
      }
    });
  }

  // Lerninhalt-Blocks in task einbauen wenn Aufgabe gespeichert wird
  const origAddTask = window.addTaskToStationBuilder;
  if(typeof origAddTask==='function' && !origAddTask.__toniLerninhaltWrapped){
    window.addTaskToStationBuilder = function(){
      origAddTask.apply(this, arguments);
      // Blocks in den letzten hinzugefügten Task einbauen
      const blocks = [
        ...window.TONI_LERNINHALT_IMAGES,
        ...window.TONI_LERNINHALT_FILES,
        ...window.TONI_LERNINHALT_LINKS,
      ];
      if(blocks.length){
        const tasks = window.TONI_CURRENT_STATION_TASKS;
        if(tasks?.length){
          tasks[tasks.length-1].lerninhalt_blocks = blocks;
          console.log('✅ TONI Lerninhalt: Blocks via wrapper injiziert', blocks);
        }
        window.TONI_LERNINHALT_IMAGES = [];
        window.TONI_LERNINHALT_FILES = [];
        window.TONI_LERNINHALT_LINKS = [];
        const preview = document.getElementById('lerninhalt-img-preview');
        const fileList = document.getElementById('lerninhalt-file-list');
        const linksList = document.getElementById('lerninhalt-links-list');
        if(preview) preview.innerHTML = '';
        if(fileList) fileList.innerHTML = '';
        if(linksList) linksList.innerHTML = '';
      }
    };
    window.addTaskToStationBuilder.__toniLerninhaltWrapped = true;
  }

  function init(){
    hookOpenTask();
    enhanceTaskBuilder();
    patchAddTaskButton();
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
    setTimeout(init, 500);
    setTimeout(init, 1500);
  }

  // Observer für dynamisch gerenderte Builder
  const obs = new MutationObserver(() => {
    if(document.getElementById('task-type') && !document.getElementById('task-type').__toniLerninhaltEnhanced){
      enhanceTaskBuilder();
      hookOpenTask();
    }
    patchAddTaskButton();
  });
  obs.observe(document.body, {childList:true, subtree:true});

})();

/* ============================================================
   TONI – Lerninhalt Blocks Fix
   Patcht toniV110AddTaskFromBuilder direkt nach dem Laden
   ============================================================ */
(function(){
  function injectBlocksAfterAdd(){
    const orig = window.toniV110AddTaskFromBuilder;
    if(!orig || orig.__toniBlocksWrapped) return;

    window.toniV110AddTaskFromBuilder = function(event){
      const result = orig.apply(this, arguments);
      // Nach dem Hinzufügen Blocks in letzten Task injizieren
      setTimeout(() => {
        const blocks = [
          ...(window.TONI_LERNINHALT_IMAGES||[]),
          ...(window.TONI_LERNINHALT_FILES||[]),
          ...(window.TONI_LERNINHALT_LINKS||[]),
        ];
        if(!blocks.length) return;
        const tasks = window.TONI_CURRENT_STATION_TASKS;
        if(tasks?.length){
          tasks[tasks.length-1].lerninhalt_blocks = [...blocks];
          console.log('✅ TONI Lerninhalt Blocks injiziert:', blocks.length, 'Blöcke');
        }
        window.TONI_LERNINHALT_IMAGES = [];
        window.TONI_LERNINHALT_FILES = [];
        window.TONI_LERNINHALT_LINKS = [];
        ['lerninhalt-img-preview','lerninhalt-file-list','lerninhalt-links-list'].forEach(id => {
          const el = document.getElementById(id);
          if(el) el.innerHTML = '';
        });
      }, 150);
      return result;
    };
    window.toniV110AddTaskFromBuilder.__toniBlocksWrapped = true;

    // Auch den capture-Handler patchen
    // Da document.addEventListener capture bereits gesetzt ist,
    // fügen wir einen eigenen capture-Handler hinzu der NACH dem Original läuft
  }

  // Polling bis toniV110AddTaskFromBuilder verfügbar ist
  let tries = 0;
  const poll = setInterval(() => {
    tries++;
    if(window.toniV110AddTaskFromBuilder && !window.toniV110AddTaskFromBuilder.__toniBlocksWrapped){
      injectBlocksAfterAdd();
    }
    if(tries > 30) clearInterval(poll);
  }, 300);

  // Auch document capture-listener patchen für den Fall dass Button direkt geklickt wird
  document.addEventListener('click', function(event){
    const btn = event.target.closest?.('button');
    if(!btn) return;
    const text = (btn.textContent||'').replace(/\s+/g,' ').trim().toLowerCase();
    if(text.includes('aufgabe hinzufügen') && document.getElementById('task-title')){
      setTimeout(() => {
        const blocks = [
          ...(window.TONI_LERNINHALT_IMAGES||[]),
          ...(window.TONI_LERNINHALT_FILES||[]),
          ...(window.TONI_LERNINHALT_LINKS||[]),
        ];
        if(!blocks.length) return;
        const tasks = window.TONI_CURRENT_STATION_TASKS;
        if(tasks?.length){
          tasks[tasks.length-1].lerninhalt_blocks = [...blocks];
          console.log('✅ TONI Lerninhalt Blocks via capture:', blocks.length, 'Blöcke');
        }
        window.TONI_LERNINHALT_IMAGES = [];
        window.TONI_LERNINHALT_FILES = [];
        window.TONI_LERNINHALT_LINKS = [];
        ['lerninhalt-img-preview','lerninhalt-file-list','lerninhalt-links-list'].forEach(id => {
          const el = document.getElementById(id);
          if(el) el.innerHTML = '';
        });
      }, 200);
    }
  }, false); // bubble phase – läuft NACH dem capture-Handler von V110

})();
