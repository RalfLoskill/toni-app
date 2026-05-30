/* ============================================================
   TONI – V111 / Moderner Lernreisen-Editor
   Zweispaltige Werkstatt: Bauspalte + Live-Vorschau (Schüleransicht)

   ANDOCKPRINZIP (wichtig – nicht ändern):
   - Arbeitet auf demselben Array window.TONI_JOURNEY_BUILDER_STATIONS wie V17.
   - Ruft syncJourneyBuilderToLegacyTextareaV17() auf, damit die bestehende
     Speicherkette (V43/V44/V92 -> buildJourneyFromFormV16) unverändert greift.
   - Liest/schreibt die vorhandenen versteckten Felder journey-title/-goal/etc.
   - Greift NICHT in die Speicherfunktionen ein. Rein additiv.
   ============================================================ */
(function(){
  "use strict";

  // ---- Konstanten: Aufgabentypen (gespiegelt aus toniNormalizeType/toniTypeIcon) ----
  const TASK_TYPES = [
    { key:"Lerninhalt", icon:"📖", color:"#185FA5", bg:"#E6F1FB", border:"#B5D4F4", text:"#0C447C" },
    { key:"Aufgabe",    icon:"✏️", color:"#854F0B", bg:"#FAEEDA", border:"#FAC775", text:"#633806" },
    { key:"Quiz",       icon:"🎯", color:"#0F6E56", bg:"#E1F5EE", border:"#9FE1CB", text:"#085041" },
    { key:"Video",      icon:"🎬", color:"#993C1D", bg:"#FAECE7", border:"#F5C4B3", text:"#712B13" },
    { key:"Reflexion",  icon:"💬", color:"#534AB7", bg:"#EEEDFE", border:"#CECBF6", text:"#3C3489" }
  ];
  function typeMeta(type){
    const t = normType(type);
    return TASK_TYPES.find(x=>x.key===t) || TASK_TYPES[1];
  }
  // Eigene, von toniNormalizeType unabhängige Normalisierung (gleiche Regeln),
  // damit der Editor auch ohne geladenes Hauptskript testbar ist.
  function normType(type){
    const t = String(type||"").toLowerCase();
    if(["info","erklärung","erklaerung","material","lerninhalt"].includes(t)) return "Lerninhalt";
    if(["übung","uebung","praxis","aufgabe","rechenaufgabe","analyse","projekt"].includes(t)) return "Aufgabe";
    if(t==="quiz") return "Quiz";
    if(t==="video") return "Video";
    if(t==="reflexion") return "Reflexion";
    return "Aufgabe";
  }

  function esc(value){
    if(typeof escapeHtml==="function") return escapeHtml(value);
    return String(value??"").replace(/[&<>"']/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
  }
  function uuid(){
    if(typeof window!=="undefined" && window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return "id-"+Date.now()+"-"+Math.random().toString(16).slice(2);
  }

  // ---- Datenzugriff: das gemeinsame Stations-Array ----
  function stations(){
    if(typeof window==="undefined") return [];
    if(!Array.isArray(window.TONI_JOURNEY_BUILDER_STATIONS)) window.TONI_JOURNEY_BUILDER_STATIONS = [];
    return window.TONI_JOURNEY_BUILDER_STATIONS;
  }
  function setStations(arr){ if(typeof window!=="undefined") window.TONI_JOURNEY_BUILDER_STATIONS = arr; }

  // ---- Sync zur bestehenden Speicherkette ----
  function syncToLegacy(){
    if(typeof syncJourneyBuilderToLegacyTextareaV17==="function") syncJourneyBuilderToLegacyTextareaV17();
  }

  // ============================================================
  //  REINE LOGIK (ohne DOM) – hier getestet
  // ============================================================

  // Station verschieben (Reorder per Index)
  function moveItem(arr, from, to){
    if(from===to || from<0 || to<0 || from>=arr.length || to>=arr.length) return arr;
    const copy = arr.slice();
    const [item] = copy.splice(from,1);
    copy.splice(to,0,item);
    return copy;
  }

  // Leere Station mit einer Standardaufgabe
  function makeStation(title){
    return {
      id: "station-"+uuid(),
      title: title || "Neue Station",
      subtitle: "",
      description: "",
      tasks: []
    };
  }
  function makeTask(type, title){
    return {
      id: "task-"+uuid(),
      title: title || "Neue Aufgabe",
      type: normType(type),
      description: "",
      content: "",
      required: true,
      status: "todo"
    };
  }

  // Statuslogik für die Vorschau (gespiegelt aus stepStatus im Hauptskript)
  function previewStepStatus(steps, i){
    const prev = steps.slice(0,i);
    const prevDone = prev.every(p => (p.tasks||[]).filter(t=>t.required).every(t=>t.status==="done"));
    if(!prevDone) return "locked";
    const req = (steps[i].tasks||[]).filter(t=>t.required);
    if(req.length && req.every(t=>t.status==="done")) return "done";
    return i===0 ? "current" : (prevDone ? "current" : "locked");
  }

  // Das Legacy-Textformat exakt wie V17 erzeugen (für Konsistenz-Test)
  function toLegacyText(arr){
    return (arr||[]).map(station=>{
      const head = `Station: ${station.title||""} | ${station.subtitle||""} | ${station.description||""}`;
      const tasks = (station.tasks||[]).map(task=>`- [${task.required?"Pflicht":"Optional"}] ${task.type||"Aufgabe"} | ${task.title||""} | ${task.description||task.content||""}`);
      return [head,...tasks].join("\n");
    }).join("\n\n");
  }

  // ============================================================
  //  Export für Tests (Node) und Browser
  // ============================================================
  const api = { TASK_TYPES, normType, typeMeta, moveItem, makeStation, makeTask, previewStepStatus, toLegacyText, uuid, esc };
  if(typeof module!=="undefined" && module.exports){ module.exports = api; }
  if(typeof window!=="undefined"){ window.TONI_EDITOR_V111 = api; }
})();

/* ============================================================
   TONI – V111 / UI-Schicht (Browser)
   Wird nur aktiv, wenn das DOM vorhanden ist.
   ============================================================ */
(function(){
  "use strict";
  if(typeof window==="undefined" || typeof document==="undefined") return;
  const E = window.TONI_EDITOR_V111;
  if(!E) return;

  const HOST_ID = "toni-v111-editor";          // Container, den wir einhängen
  const LEGACY_FIELD_ID = "journey-structure";  // verstecktes Feld der Speicherkette

  // ---- State nur für die UI (Datenwahrheit bleibt TONI_JOURNEY_BUILDER_STATIONS) ----
  const ui = { openStation: 0, editing: null /* {s, t|null} */, dragFrom: null };

  function stations(){
    if(!Array.isArray(window.TONI_JOURNEY_BUILDER_STATIONS)) window.TONI_JOURNEY_BUILDER_STATIONS=[];
    return window.TONI_JOURNEY_BUILDER_STATIONS;
  }
  function commit(){
    if(typeof syncJourneyBuilderToLegacyTextareaV17==="function") syncJourneyBuilderToLegacyTextareaV17();
    render();
  }
  function field(id){ return document.getElementById(id); }

  // ---- Einhängen: Editor-Host in den sichtbaren Editor-Bereich setzen ----
  // Reale index.html: es gibt einen kompletten V17-Stationsbuilder (sichtbar)
  // plus ein bereits per CSS verstecktes #journey-structure-Textarea.
  // Wir blenden den alten sichtbaren Builder aus und hängen die neue Werkstatt
  // an dieselbe Stelle. Das versteckte Textarea bleibt unberührt als Datenträger.
  function ensureHost(){
    let host = document.getElementById(HOST_ID);
    if(host) return host;
    const legacy = field(LEGACY_FIELD_ID);
    if(!legacy) return null;

    // Den sichtbaren Alt-Builder finden. Bevorzugt über die feste Wrapper-ID
    // (#journey-builder-field), sonst über die enthaltenen Stationsfelder.
    let oldBuilder = field("journey-builder-field");
    if(!oldBuilder){
      const preview = field("journey-station-preview") || field("station-task-list");
      if(preview) oldBuilder = preview.closest(".lr-form-group") || preview.parentElement;
    }

    // Die Formulargruppe des Legacy-Textareas (eigener Block, Geschwister des Builders)
    const legacyGroup = legacy.closest(".lr-form-group") || legacy.parentElement;

    // Ankerpunkt: bevorzugt der alte Builder, sonst die Textarea-Gruppe
    const anchor = oldBuilder || legacyGroup;
    if(!anchor || !anchor.parentElement) return null;

    // Beide Alt-Bereiche ausblenden (nicht löschen → Rückbau jederzeit möglich).
    // Das Textarea bleibt als Datenträger für die Speicherkette erhalten.
    if(oldBuilder) oldBuilder.style.display = "none";
    if(legacyGroup) legacyGroup.style.display = "none";

    host = document.createElement("div");
    host.id = HOST_ID;
    anchor.parentElement.insertBefore(host, anchor);
    return host;
  }

  // ---- Hauptrender ----
  function render(){
    const host = ensureHost();
    if(!host) return;
    const arr = stations();
    host.innerHTML =
      `<div class="v111-wrap">
        <div class="v111-col">
          <div class="v111-coltitle">Bauspalte</div>
          ${arr.map((s,i)=>stationCardHtml(s,i)).join("")}
          <div class="v111-addstation" onclick="TONI_EDITOR_V111_UI.addStation()">+ Station hinzufügen</div>
        </div>
        <div class="v111-col">
          <div class="v111-coltitle">Live-Vorschau · Schüleransicht</div>
          ${previewHtml(arr)}
        </div>
      </div>
      ${ui.editing ? taskPanelHtml() : ""}`;
  }

  function stationCardHtml(s, i){
    const open = ui.openStation===i;
    const tasks = s.tasks||[];
    return `<div class="v111-station ${open?'open':''}" draggable="true"
        ondragstart="TONI_EDITOR_V111_UI.dragStart(${i})"
        ondragover="event.preventDefault()"
        ondrop="TONI_EDITOR_V111_UI.dropStation(${i})">
      <div class="v111-stationhead" onclick="TONI_EDITOR_V111_UI.toggle(${i})">
        <span class="v111-grip">⠿</span>
        <span class="v111-stationtitle">${i+1} · ${E.esc(s.title||"Station")}</span>
        ${!open?`<span class="v111-count">${tasks.length} Aufg.</span>`:""}
        <span class="v111-chev">${open?'▾':'▸'}</span>
      </div>
      ${open?`<div class="v111-stationbody">
        <input class="v111-inp" value="${E.esc(s.title||"")}" placeholder="Stationstitel"
          oninput="TONI_EDITOR_V111_UI.editStation(${i},'title',this.value)">
        <input class="v111-inp v111-sub" value="${E.esc(s.subtitle||"")}" placeholder="Untertitel (optional)"
          oninput="TONI_EDITOR_V111_UI.editStation(${i},'subtitle',this.value)">
        <div class="v111-tasks">
          ${tasks.map((t,j)=>taskRowHtml(t,i,j)).join("")}
        </div>
        <div class="v111-addtask" onclick="TONI_EDITOR_V111_UI.addTask(${i})">+ Aufgabe hinzufügen</div>
        <div class="v111-stationactions">
          <button class="v111-sbtn" onclick="TONI_EDITOR_V111_UI.delStation(${i})">Station löschen</button>
        </div>
      </div>`:""}
    </div>`;
  }

  function taskRowHtml(t, si, ti){
    const m = E.typeMeta(t.type);
    return `<div class="v111-taskrow" draggable="true"
        ondragstart="event.stopPropagation();TONI_EDITOR_V111_UI.dragTask(${si},${ti})"
        ondragover="event.preventDefault();event.stopPropagation()"
        ondrop="event.stopPropagation();TONI_EDITOR_V111_UI.dropTask(${si},${ti})"
        onclick="TONI_EDITOR_V111_UI.openTask(${si},${ti})">
      <span class="v111-grip v111-grip-sm">⠿</span>
      <span class="v111-taskname" style="color:${m.text}">${m.icon} ${E.esc(t.title||"Aufgabe")}</span>
      <span class="v111-taskmeta">${t.required?'Pflicht':'optional'}</span>
    </div>`;
  }

  // ---- Vorschau (Schüleransicht) ----
  function previewHtml(arr){
    if(!arr.length) return `<div class="v111-empty">Noch keine Station. Lege links los.</div>`;
    const title = field("journey-title")?.value || "Lernreise";
    const goal  = field("journey-goal")?.value || "";
    const route = arr.map((s,i)=>{
      const st = E.previewStepStatus(arr,i);
      const isLast = i===arr.length-1;
      const dot = st==="done"?'✓':isLast?'🏆':(i+1);
      const cls = st==="done"?'done':st==="current"?'current':isLast?'trophy':'locked';
      return `<div class="v111-routedot ${cls}">${dot}</div>${!isLast?'<div class="v111-routeline"></div>':''}`;
    }).join("");
    const cur = arr[Math.max(0, arr.findIndex((s,i)=>E.previewStepStatus(arr,i)==="current"))] || arr[0];
    const curTasks = (cur.tasks||[]).map(t=>{
      const m=E.typeMeta(t.type);
      return `<div class="v111-pvtask"><span style="color:${m.text}">${m.icon} ${E.esc(t.title||"")}</span>
        <span class="v111-pvmeta">${t.required?'Pflicht':'optional'} · ${E.esc(E.normType(t.type))}</span></div>`;
    }).join("");
    return `<div class="v111-preview">
      <div class="v111-pvtitle">${E.esc(title)}</div>
      ${goal?`<div class="v111-pvgoal">${E.esc(goal)}</div>`:""}
      <div class="v111-route">${route}</div>
      <div class="v111-pvstation">${E.esc(cur.title||"")}</div>
      ${curTasks||'<div class="v111-empty">Keine Aufgaben in dieser Station.</div>'}
    </div>`;
  }

  // ---- Typgerechtes Aufgaben-Panel ----
  function taskPanelHtml(){
    const {si,ti} = ui.editing;
    const t = stations()[si]?.tasks[ti];
    if(!t) return "";
    const typeBtns = E.TASK_TYPES.map(tt=>{
      const active = E.normType(t.type)===tt.key;
      return `<span class="v111-typebtn ${active?'active':''}"
        style="${active?`background:${tt.bg};border-color:${tt.color};color:${tt.text}`:''}"
        onclick="TONI_EDITOR_V111_UI.setTaskType(${si},${ti},'${tt.key}')">${tt.icon} ${tt.key}</span>`;
    }).join("");
    return `<div class="v111-panel">
      <div class="v111-panelhead">✏️ Aufgabe bearbeiten</div>
      <div class="v111-flabel">Aufgabentyp</div>
      <div class="v111-typerow">${typeBtns}</div>
      <div class="v111-flabel">Titel</div>
      <input class="v111-inp" value="${E.esc(t.title||"")}" oninput="TONI_EDITOR_V111_UI.editTask(${si},${ti},'title',this.value)">
      <div class="v111-flabel">Beschreibung / Inhalt</div>
      <textarea class="v111-inp v111-ta" oninput="TONI_EDITOR_V111_UI.editTask(${si},${ti},'description',this.value)">${E.esc(t.description||t.content||"")}</textarea>
      ${typeSpecificHtml(t,si,ti)}
      <div class="v111-panelfoot">
        <label class="v111-toggle">
          <input type="checkbox" ${t.required?'checked':''} onchange="TONI_EDITOR_V111_UI.editTask(${si},${ti},'required',this.checked)">
          Pflichtaufgabe
        </label>
        <div>
          <button class="v111-sbtn" onclick="TONI_EDITOR_V111_UI.delTask(${si},${ti})">Löschen</button>
          <button class="v111-pbtn" onclick="TONI_EDITOR_V111_UI.closeTask()">Übernehmen</button>
        </div>
      </div>
    </div>`;
  }

  // Felder je nach Typ (Video -> YouTube-ID, Quiz -> Hinweis, etc.)
  function typeSpecificHtml(t,si,ti){
    const type = E.normType(t.type);
    if(type==="Video"){
      return `<div class="v111-flabel">YouTube-Video-ID oder URL</div>
        <input class="v111-inp" value="${E.esc(t.youtube_video_id||t.video_id||"")}"
          placeholder="z. B. dQw4w9WgXcQ"
          oninput="TONI_EDITOR_V111_UI.editTask(${si},${ti},'youtube_video_id',this.value)">`;
    }
    if(type==="Quiz"){
      const n = (t.quiz_data&&t.quiz_data.questions&&t.quiz_data.questions.length)||0;
      return `<div class="v111-hint">🎯 ${n} Frage(n) hinterlegt. Der ausführliche Quiz-Editor folgt – Fragen können vorerst im Inhaltsfeld notiert werden.</div>`;
    }
    if(type==="Reflexion"){
      return `<div class="v111-flabel">Reflexionsfrage</div>
        <input class="v111-inp" value="${E.esc(t.reflexion_prompt||"")}"
          placeholder="z. B. Was hast du heute gelernt?"
          oninput="TONI_EDITOR_V111_UI.editTask(${si},${ti},'reflexion_prompt',this.value)">`;
    }
    return `<div class="v111-hint">📎 Material (Bild, Datei, Link) kann nach dem Speichern in der Aufgabe ergänzt werden.</div>`;
  }

  // ============================================================
  //  Event-Handler (öffentlich)
  // ============================================================
  const UI = {
    toggle(i){ ui.openStation = ui.openStation===i ? -1 : i; ui.editing=null; render(); },
    addStation(){ const a=stations(); a.push(E.makeStation("Station "+(a.length+1))); ui.openStation=a.length-1; commit(); },
    delStation(i){ const a=stations(); if(!confirm(`Station „${a[i]?.title||''}“ löschen?`))return; a.splice(i,1); ui.openStation=Math.min(ui.openStation,a.length-1); commit(); },
    editStation(i,key,val){ const s=stations()[i]; if(s){ s[key]=val; if(typeof syncJourneyBuilderToLegacyTextareaV17==="function")syncJourneyBuilderToLegacyTextareaV17(); updatePreviewOnly(); } },
    addTask(i){ const s=stations()[i]; if(!s)return; s.tasks=s.tasks||[]; s.tasks.push(E.makeTask("Aufgabe","Neue Aufgabe")); ui.editing={si:i,ti:s.tasks.length-1}; commit(); },
    openTask(si,ti){ ui.editing={si,ti}; render(); },
    closeTask(){ ui.editing=null; commit(); },
    editTask(si,ti,key,val){ const t=stations()[si]?.tasks[ti]; if(t){ t[key]=val; if(key==="description")t.content=val; if(typeof syncJourneyBuilderToLegacyTextareaV17==="function")syncJourneyBuilderToLegacyTextareaV17(); updatePreviewOnly(); } },
    setTaskType(si,ti,type){ const t=stations()[si]?.tasks[ti]; if(t){ t.type=type; commit(); } },
    delTask(si,ti){ const s=stations()[si]; if(s){ s.tasks.splice(ti,1); ui.editing=null; commit(); } },
    // Drag & Drop – Stationen
    dragStart(i){ ui.dragFrom={type:"station",i}; },
    dropStation(to){ if(ui.dragFrom?.type==="station"){ setStationsArr(E.moveItem(stations(),ui.dragFrom.i,to)); ui.dragFrom=null; commit(); } },
    // Drag & Drop – Aufgaben (innerhalb einer Station)
    dragTask(si,ti){ ui.dragFrom={type:"task",si,ti}; },
    dropTask(si,to){ if(ui.dragFrom?.type==="task" && ui.dragFrom.si===si){ const s=stations()[si]; s.tasks=E.moveItem(s.tasks,ui.dragFrom.ti,to); ui.dragFrom=null; commit(); } }
  };
  function setStationsArr(arr){ window.TONI_JOURNEY_BUILDER_STATIONS=arr; }
  function updatePreviewOnly(){ render(); }
  window.TONI_EDITOR_V111_UI = UI;

  // ---- Styles ----
  function injectStyles(){
    if(document.getElementById("v111-styles")) return;
    const css = document.createElement("style");
    css.id="v111-styles";
    css.textContent = `
      .v111-wrap{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      @media(max-width:700px){.v111-wrap{grid-template-columns:1fr}}
      .v111-coltitle{font-size:11px;font-weight:500;color:var(--color-text-tertiary);text-transform:uppercase;letter-spacing:.05em;margin-bottom:8px}
      .v111-station{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:8px;margin-bottom:6px;overflow:hidden}
      .v111-station.open{border-color:#B5D4F4}
      .v111-stationhead{display:flex;align-items:center;gap:8px;padding:9px 10px;cursor:pointer}
      .v111-grip{color:var(--color-text-tertiary);cursor:grab;font-size:13px}
      .v111-grip-sm{font-size:11px}
      .v111-stationtitle{flex:1;font-size:13px;font-weight:500;color:var(--color-text-primary)}
      .v111-count{font-size:11px;color:var(--color-text-tertiary)}
      .v111-chev{color:var(--color-text-tertiary);font-size:12px}
      .v111-stationbody{padding:0 10px 10px}
      .v111-inp{width:100%;box-sizing:border-box;padding:7px 9px;border:0.5px solid var(--color-border-secondary);border-radius:7px;font-size:13px;background:var(--color-background-primary);color:var(--color-text-primary);margin-bottom:6px;font-family:inherit}
      .v111-sub{font-size:12px}
      .v111-ta{min-height:60px;resize:vertical;line-height:1.5}
      .v111-tasks{margin:4px 0}
      .v111-taskrow{display:flex;align-items:center;gap:7px;padding:6px 8px;border-radius:6px;cursor:pointer;background:var(--color-background-secondary);margin-bottom:4px}
      .v111-taskrow:hover{background:var(--color-border-tertiary)}
      .v111-taskname{flex:1;font-size:12px;font-weight:500}
      .v111-taskmeta{font-size:11px;color:var(--color-text-tertiary)}
      .v111-addtask,.v111-addstation{display:flex;align-items:center;justify-content:center;gap:5px;font-size:12px;color:#185FA5;border:0.5px dashed var(--color-border-secondary);border-radius:7px;padding:7px;cursor:pointer;margin-top:4px}
      .v111-addtask:hover,.v111-addstation:hover{background:#E6F1FB}
      .v111-stationactions{margin-top:8px;text-align:right}
      .v111-sbtn{font-size:12px;color:var(--color-text-secondary);background:none;border:0.5px solid var(--color-border-secondary);border-radius:6px;padding:5px 10px;cursor:pointer}
      .v111-pbtn{font-size:12px;color:#fff;background:#639922;border:none;border-radius:6px;padding:6px 12px;cursor:pointer;margin-left:6px}
      .v111-preview{background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);border-radius:8px;padding:12px}
      .v111-pvtitle{font-size:13px;font-weight:500;color:var(--color-text-primary)}
      .v111-pvgoal{font-size:11px;color:var(--color-text-secondary);margin-bottom:10px}
      .v111-route{display:flex;align-items:center;gap:2px;margin:10px 0 12px}
      .v111-routedot{width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;background:var(--color-background-secondary);color:var(--color-text-tertiary)}
      .v111-routedot.done{background:#639922;color:#fff}
      .v111-routedot.current{background:#185FA5;color:#fff;width:26px;height:26px;font-size:12px;font-weight:500}
      .v111-routeline{flex:1;height:2px;background:var(--color-border-tertiary)}
      .v111-pvstation{font-size:12px;font-weight:500;color:var(--color-text-primary);margin-bottom:6px}
      .v111-pvtask{display:flex;flex-direction:column;background:var(--color-background-secondary);border-radius:7px;padding:8px 10px;margin-bottom:5px}
      .v111-pvtask>span:first-child{font-size:12px;font-weight:500}
      .v111-pvmeta{font-size:11px;color:var(--color-text-secondary);margin-top:2px}
      .v111-empty{font-size:12px;color:var(--color-text-tertiary);padding:10px;text-align:center}
      .v111-panel{background:var(--color-background-secondary);border:0.5px solid var(--color-border-tertiary);border-radius:10px;padding:14px;margin-top:12px}
      .v111-panelhead{font-size:14px;font-weight:500;color:var(--color-text-primary);margin-bottom:12px;padding-bottom:10px;border-bottom:0.5px solid var(--color-border-tertiary)}
      .v111-flabel{font-size:11px;color:var(--color-text-tertiary);margin-bottom:5px}
      .v111-typerow{display:flex;gap:5px;flex-wrap:wrap;margin-bottom:10px}
      .v111-typebtn{font-size:12px;padding:5px 10px;border-radius:7px;background:var(--color-background-primary);border:0.5px solid var(--color-border-tertiary);color:var(--color-text-secondary);cursor:pointer}
      .v111-typebtn.active{border-width:2px}
      .v111-hint{background:#FAEEDA;border-radius:7px;padding:8px 11px;font-size:12px;color:#633806;margin-bottom:10px}
      .v111-panelfoot{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:4px}
      .v111-toggle{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--color-text-secondary);cursor:pointer}
    `;
    document.head.appendChild(css);
  }

  // ---- Initialisierung: nach V17-Setup einhängen ----
  function init(){
    if(!field(LEGACY_FIELD_ID)) return false;
    injectStyles();
    render();
    return true;
  }

  // Bei Reset/Edit/Beispiel mitrendern (umwickelt bestehende Funktionen additiv)
  function wrap(name){
    if(typeof window[name]!=="function" || window[name].__v111) return;
    const orig = window[name];
    window[name] = function(...a){ const r=orig.apply(this,a); ui.editing=null; ui.openStation=0; setTimeout(render,30); return r; };
    window[name].__v111 = true;
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      if(init() || tries>20){
        clearInterval(timer);
        ["resetJourneyEditor","editAdminJourney","fillJourneyExample"].forEach(wrap);
      }
    }, 400);
  });

  window.TONI_EDITOR_V111.initUI = init;
  window.TONI_EDITOR_V111.render = render;
})();
