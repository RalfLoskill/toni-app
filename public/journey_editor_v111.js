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
      `<div class="v111-single">
        ${journeyHeadHtml()}
        ${arr.map((s,i)=>stationCardHtml(s,i)).join("")}
        <div class="v111-addstation" onclick="TONI_EDITOR_V111_UI.addStation()">+ Station hinzufügen</div>
      </div>
      ${ui.editing ? taskPanelHtml() : ""}`;
  }

  // Titel-/Ziel-Box oben in der Bauspalte (schreibt in die vorhandenen Felder)
  function journeyHeadHtml(){
    const title = field("journey-title")?.value || "";
    const goal  = field("journey-goal")?.value || "";
    return `<div class="v111-head">
      <input class="v111-headtitle" value="${E.esc(title)}" placeholder="Titel der Lernreise"
        oninput="TONI_EDITOR_V111_UI.editHead('journey-title',this.value)">
      <input class="v111-headgoal" value="${E.esc(goal)}" placeholder="Ziel der Lernreise"
        oninput="TONI_EDITOR_V111_UI.editHead('journey-goal',this.value)">
    </div>`;
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
      const lineCls = st==="done"?'done':'';
      return `<div class="v111-routedot ${cls}">${dot}</div>${!isLast?`<div class="v111-routeline ${lineCls}"></div>`:''}`;
    }).join("");
    const cur = arr[Math.max(0, arr.findIndex((s,i)=>E.previewStepStatus(arr,i)==="current"))] || arr[0];
    const curTasks = (cur.tasks||[]).map(t=>{
      const m=E.typeMeta(t.type);
      return `<div class="v111-pvtask"><span style="color:${m.text}">${m.icon} ${E.esc(t.title||"")}</span>
        <span class="v111-pvmeta">${t.required?'Pflicht':'optional'} · ${E.esc(E.normType(t.type))}</span></div>`;
    }).join("");
    // Medien-Vorschau der gerade bearbeiteten Aufgabe (Bild / YouTube-Video)
    let mediaPreview = "";
    if(ui.editing){
      const et = stations()[ui.editing.si]?.tasks[ui.editing.ti];
      const blocks = et && Array.isArray(et.blocks) ? et.blocks : [];
      const ytId = et ? String(et.youtube_video_id||et.video_id||"") : "";
      const parts = [];
      if(/^[A-Za-z0-9_-]{11}$/.test(ytId)){
        parts.push(`<div class="v111-pvembed"><iframe src="https://www.youtube.com/embed/${ytId}" frameborder="0" allowfullscreen></iframe></div>`);
      }
      blocks.forEach(b=>{
        if(b.type==="image" && b.url) parts.push(`<img class="v111-pvimg" src="${E.esc(b.url)}" alt="${E.esc(b.alt||"")}">`);
        else if(b.type==="link" && b.youtube && b.url){ const mm=String(b.url).match(/[A-Za-z0-9_-]{11}/); if(mm) parts.push(`<div class="v111-pvembed"><iframe src="https://www.youtube.com/embed/${mm[0]}" frameborder="0" allowfullscreen></iframe></div>`); }
      });
      if(parts.length) mediaPreview = `<div class="v111-pvmedia">${parts.join("")}</div>`;
    }
    return `<div class="v111-preview">
      <div class="v111-pvtitle">${E.esc(title)}</div>
      ${goal?`<div class="v111-pvgoal">${E.esc(goal)}</div>`:""}
      <div class="v111-route">${route}</div>
      <div class="v111-pvstation">${E.esc(cur.title||"")}</div>
      ${mediaPreview}
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
      ${materialHtml(t,si,ti)}
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
      const id = String(t.youtube_video_id||t.video_id||"").trim();
      const valid = /^[A-Za-z0-9_-]{11}$/.test(id);
      const preview = valid
        ? `<div class="v111-ytok"><img src="https://img.youtube.com/vi/${id}/hqdefault.jpg" alt="Vorschau" class="v111-ytthumb"><span>✅ Video erkannt (ID: ${E.esc(id)})</span></div>`
        : (id ? `<div class="v111-yterr">⚠️ Noch keine gültige YouTube-ID erkannt</div>` : "");
      return `<div class="v111-flabel">YouTube-Link oder Video-ID</div>
        <input class="v111-inp" value="${E.esc(t._youtube_input||(valid?`https://www.youtube.com/watch?v=${id}`:id))}"
          placeholder="z. B. https://www.youtube.com/watch?v=VIDEOID"
          oninput="TONI_EDITOR_V111_UI.setVideo(${si},${ti},this.value)">
        ${preview}`;
    }
    if(type==="Quiz"){
      return quizEditorHtml(t,si,ti);
    }
    if(type==="Reflexion"){
      return reflexionEditorHtml(t,si,ti);
    }
    if(type==="Aufgabe"){
      return aufgabeEditorHtml(t,si,ti);
    }
    return "";
  }

  // Aufgabe-Editor: optionale Ergebnisprüfung (Ergebnis + Einheit) und Musterlösung
  function aufgabeEditorHtml(t,si,ti){
    return `<div class="v111-aufgabe">
      <div class="v111-rxcard">
        <div class="v111-flabel" style="margin-bottom:8px">🎯 Automatische Ergebnisprüfung (optional)</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <input class="v111-inp" style="flex:2;margin:0" value="${E.esc(t.expected_answer||"")}"
            placeholder="Erwartetes Ergebnis, z. B. 12"
            oninput="TONI_EDITOR_V111_UI.editTask(${si},${ti},'expected_answer',this.value)">
          <input class="v111-inp" style="flex:1;margin:0" value="${E.esc(t.expected_unit||"")}"
            placeholder="Einheit, z. B. Ω"
            oninput="TONI_EDITOR_V111_UI.editTask(${si},${ti},'expected_unit',this.value)">
        </div>
        <div style="font-size:11px;color:var(--v111-t3);margin-top:6px">Leer lassen für offene Aufgaben ohne automatische Prüfung. Nach 3 Fehlversuchen wird die Musterlösung empfohlen.</div>
      </div>
      <div class="v111-rxcard">
        <div class="v111-flabel" style="margin-bottom:8px">💡 Musterlösung (optional)</div>
        <textarea class="v111-inp" style="min-height:90px;resize:vertical" placeholder="Musterlösung oder Bewertungskriterien – wird dem Schüler nach einem Versuch aufklappbar angezeigt."
          oninput="TONI_EDITOR_V111_UI.editTask(${si},${ti},'solution',this.value)">${E.esc(t.solution||"")}</textarea>
        <div style="font-size:11px;color:var(--v111-t3);margin-top:6px">Nach dem Aufklappen kann sich der Schüler selbst einschätzen (stimmt / teilweise / nochmal).</div>
      </div>
    </div>`;
  }

  // Reflexions-Editor: Leitfrage, mehrere Sterne-Skalen, Hilfsfragen,
  // offene Rückmeldung mit Mindestzeichenzahl
  function reflexionEditorHtml(t,si,ti){
    // Migration alt -> neu: einzelne Skala in Array überführen
    if(!Array.isArray(t.reflexion_scales)){
      if(t.reflexion_scale === false) t.reflexion_scales = [];
      else t.reflexion_scales = [{label: t.reflexion_scale_label || "Wie gut verstehst du das Thema?"}];
    }
    const scales = t.reflexion_scales;
    const helpers = Array.isArray(t.reflexion_helpers) ? t.reflexion_helpers : [];
    const minLen = parseInt(t.reflexion_min_length,10) || 0;

    const scaleRows = scales.map((sc,xi)=>`
      <div class="v111-qopt">
        <span style="font-size:16px">⭐</span>
        <input class="v111-inp" style="margin:0" value="${E.esc(sc.label||"")}" placeholder="Frage zur Selbsteinschätzung ${xi+1}"
          oninput="TONI_EDITOR_V111_UI.reflexionEditScale(${si},${ti},${xi},this.value)">
        <button class="v111-matdel" title="Entfernen" onclick="TONI_EDITOR_V111_UI.reflexionDelScale(${si},${ti},${xi})">✕</button>
      </div>`).join("");

    const helperRows = helpers.map((h,hi)=>`
      <div class="v111-qopt">
        <span style="color:var(--v111-t3)">•</span>
        <input class="v111-inp" style="margin:0" value="${E.esc(h)}" placeholder="Hilfsfrage ${hi+1}"
          oninput="TONI_EDITOR_V111_UI.reflexionEditHelper(${si},${ti},${hi},this.value)">
        <button class="v111-matdel" title="Entfernen" onclick="TONI_EDITOR_V111_UI.reflexionDelHelper(${si},${ti},${hi})">✕</button>
      </div>`).join("");

    return `<div class="v111-reflex">
      <div class="v111-flabel">Leitfrage / Impuls</div>
      <input class="v111-inp" value="${E.esc(t.reflexion_prompt||"")}"
        placeholder="z. B. Was hast du heute verstanden? Was war schwierig?"
        oninput="TONI_EDITOR_V111_UI.editTask(${si},${ti},'reflexion_prompt',this.value)">

      <div class="v111-rxcard">
        <div class="v111-flabel" style="margin-bottom:8px">Selbsteinschätzungen (Sterne 1–5)</div>
        <div class="v111-qopts">${scaleRows||'<div class="v111-empty" style="padding:6px">Keine Skala. Füge eine hinzu.</div>'}</div>
        <button class="v111-qaddopt" onclick="TONI_EDITOR_V111_UI.reflexionAddScale(${si},${ti})">+ Selbsteinschätzung</button>
      </div>

      <div class="v111-rxcard">
        <div class="v111-flabel" style="margin-bottom:8px">Hilfsfragen (optional)</div>
        <div class="v111-qopts">${helperRows}</div>
        <button class="v111-qaddopt" onclick="TONI_EDITOR_V111_UI.reflexionAddHelper(${si},${ti})">+ Hilfsfrage</button>
      </div>

      <div class="v111-rxcard">
        <div class="v111-flabel" style="margin-bottom:6px">Offene Rückmeldung</div>
        <div class="v111-rxrow" style="font-weight:400">
          <span style="font-size:12px;color:var(--v111-t2)">Mindestzeichen (0 = keine Vorgabe)</span>
          <input class="v111-inp" type="number" min="0" style="margin:0;width:90px" value="${minLen}"
            oninput="TONI_EDITOR_V111_UI.editTask(${si},${ti},'reflexion_min_length',this.value)">
        </div>
        ${minLen>0?`<div style="font-size:11px;color:var(--v111-t3);margin-top:6px">Bei Pflichtaufgaben muss der Schüler mindestens ${minLen} Zeichen schreiben, um fortzufahren.</div>`:""}
      </div>
    </div>`;
  }

  // Frageformat: { question, options:[], correct_index, explanation }
  function quizEditorHtml(t,si,ti){
    if(!t.quiz_data || !Array.isArray(t.quiz_data.questions)) t.quiz_data = { questions: [] };
    const qs = t.quiz_data.questions;
    const questions = qs.map((q,qi)=>{
      const opts = Array.isArray(q.options)?q.options:[];
      const optRows = opts.map((opt,oi)=>`
        <div class="v111-qopt">
          <button class="v111-qcorrect ${q.correct_index===oi?'on':''}"
            title="Als richtige Antwort markieren"
            onclick="TONI_EDITOR_V111_UI.quizSetCorrect(${si},${ti},${qi},${oi})">${q.correct_index===oi?'●':'○'}</button>
          <input class="v111-inp" style="margin:0" value="${E.esc(opt)}"
            placeholder="Antwort ${String.fromCharCode(65+oi)}"
            oninput="TONI_EDITOR_V111_UI.quizEditOption(${si},${ti},${qi},${oi},this.value)">
          <button class="v111-matdel" title="Antwort entfernen"
            onclick="TONI_EDITOR_V111_UI.quizDelOption(${si},${ti},${qi},${oi})">✕</button>
        </div>`).join("");
      return `<div class="v111-qcard">
        <div class="v111-qhead">
          <span class="v111-qnum">Frage ${qi+1}</span>
          <button class="v111-matdel" title="Frage löschen"
            onclick="TONI_EDITOR_V111_UI.quizDelQuestion(${si},${ti},${qi})">✕</button>
        </div>
        <input class="v111-inp" value="${E.esc(q.question||"")}" placeholder="Fragetext"
          oninput="TONI_EDITOR_V111_UI.quizEditQuestion(${si},${ti},${qi},'question',this.value)">
        <div class="v111-qopts">${optRows}</div>
        <button class="v111-qaddopt" onclick="TONI_EDITOR_V111_UI.quizAddOption(${si},${ti},${qi})">+ Antwort</button>
        <input class="v111-inp" style="margin-top:6px" value="${E.esc(q.explanation||"")}"
          placeholder="Erklärung (optional, erscheint nach dem Antworten)"
          oninput="TONI_EDITOR_V111_UI.quizEditQuestion(${si},${ti},${qi},'explanation',this.value)">
      </div>`;
    }).join("");
    return `<div class="v111-quiz">
      <div class="v111-flabel">🎯 Quiz-Fragen</div>
      ${questions||'<div class="v111-empty">Noch keine Frage. Lege unten los.</div>'}
      <button class="v111-qadd" onclick="TONI_EDITOR_V111_UI.quizAddQuestion(${si},${ti})">+ Frage hinzufügen</button>
    </div>`;
  }

  // schreibt aber direkt in task.blocks der aktuellen Aufgabe.
  function materialHtml(t,si,ti){
    const blocks = Array.isArray(t.blocks) ? t.blocks : [];
    const items = blocks.map((b,bi)=>{
      const icon = b.type==="image"?"🖼️":b.type==="file"?"📄":"🔗";
      const label = b.alt||b.name||b.title||b.url||"Medium";
      return `<div class="v111-matitem">
        <span>${icon} ${E.esc(label)}</span>
        <button class="v111-matdel" onclick="TONI_EDITOR_V111_UI.delMaterial(${si},${ti},${bi})" title="Entfernen">✕</button>
      </div>`;
    }).join("");
    return `<div class="v111-material">
      <div class="v111-flabel">📎 Material (Bild, Datei, Link)</div>
      <div class="v111-matrow">
        <label class="v111-matbtn">🖼️ Bild
          <input type="file" accept="image/*" style="display:none"
            onchange="TONI_EDITOR_V111_UI.uploadImage(${si},${ti},this)">
        </label>
        <label class="v111-matbtn">📄 Datei
          <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" style="display:none"
            onchange="TONI_EDITOR_V111_UI.uploadFile(${si},${ti},this)">
        </label>
      </div>
      <div class="v111-matrow">
        <input class="v111-inp" id="v111-link-url" placeholder="https://… (Link)" style="flex:2;margin:0">
        <input class="v111-inp" id="v111-link-title" placeholder="Titel" style="flex:1;margin:0">
        <button class="v111-sbtn" onclick="TONI_EDITOR_V111_UI.addLink(${si},${ti})">+ Link</button>
      </div>
      <div class="v111-matstatus" id="v111-matstatus"></div>
      ${items?`<div class="v111-matlist">${items}</div>`:""}
      ${mediaPreviewHtml(t)}
    </div>`;
  }

  // Inline-Vorschau für Bild / YouTube-Video direkt im Panel
  function mediaPreviewHtml(t){
    const parts = [];
    const ytId = String(t.youtube_video_id||t.video_id||"");
    if(/^[A-Za-z0-9_-]{11}$/.test(ytId)){
      parts.push(`<div class="v111-pvembed"><iframe src="https://www.youtube.com/embed/${ytId}" frameborder="0" allowfullscreen></iframe></div>`);
    }
    (Array.isArray(t.blocks)?t.blocks:[]).forEach(b=>{
      if(b.type==="image" && b.url) parts.push(`<img class="v111-pvimg" src="${E.esc(b.url)}" alt="${E.esc(b.alt||"")}">`);
      else if(b.type==="link" && b.youtube && b.url){ const mm=String(b.url).match(/[A-Za-z0-9_-]{11}/); if(mm) parts.push(`<div class="v111-pvembed"><iframe src="https://www.youtube.com/embed/${mm[0]}" frameborder="0" allowfullscreen></iframe></div>`); }
    });
    return parts.length ? `<div class="v111-pvmedia" style="margin-top:8px">${parts.join("")}</div>` : "";
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
    editHead(fieldId,val){ const f=field(fieldId); if(f){ f.value=val; updatePreviewOnly(); } },
    delTask(si,ti){ const s=stations()[si]; if(s){ s.tasks.splice(ti,1); ui.editing=null; commit(); } },
    // Drag & Drop – Stationen
    dragStart(i){ ui.dragFrom={type:"station",i}; },
    dropStation(to){ if(ui.dragFrom?.type==="station"){ setStationsArr(E.moveItem(stations(),ui.dragFrom.i,to)); ui.dragFrom=null; commit(); } },
    // Drag & Drop – Aufgaben (innerhalb einer Station)
    dragTask(si,ti){ ui.dragFrom={type:"task",si,ti}; },
    dropTask(si,to){ if(ui.dragFrom?.type==="task" && ui.dragFrom.si===si){ const s=stations()[si]; s.tasks=E.moveItem(s.tasks,ui.dragFrom.ti,to); ui.dragFrom=null; commit(); } },
    // Material: Upload über Supabase Storage (gleicher Pfad wie TONI-Bestand)
    async uploadImage(si,ti,input){ await uploadMedia(si,ti,input,"image"); },
    async uploadFile(si,ti,input){ await uploadMedia(si,ti,input,"file"); },
    addLink(si,ti){
      const url=(document.getElementById("v111-link-url")?.value||"").trim();
      const title=(document.getElementById("v111-link-title")?.value||"").trim();
      if(!url) return;
      const t=stations()[si]?.tasks[ti]; if(!t) return;
      t.blocks=Array.isArray(t.blocks)?t.blocks:[];
      const yt=/(?:youtube\.com|youtu\.be)/i.test(url);
      t.blocks.push({type:"link",url,title:title||url,youtube:yt});
      commit();
    },
    delMaterial(si,ti,bi){ const t=stations()[si]?.tasks[ti]; if(t&&Array.isArray(t.blocks)){ t.blocks.splice(bi,1); commit(); } },
    // Quiz-Editor
    quizAddQuestion(si,ti){ const t=stations()[si]?.tasks[ti]; if(!t)return; if(!t.quiz_data||!Array.isArray(t.quiz_data.questions))t.quiz_data={questions:[]}; t.quiz_data.questions.push({question:"",options:["",""],correct_index:0,explanation:""}); commit(); },
    quizDelQuestion(si,ti,qi){ const t=stations()[si]?.tasks[ti]; if(t?.quiz_data?.questions){ t.quiz_data.questions.splice(qi,1); commit(); } },
    quizEditQuestion(si,ti,qi,key,val){ const q=stations()[si]?.tasks[ti]?.quiz_data?.questions[qi]; if(q){ q[key]=val; syncOnly(); } },
    quizAddOption(si,ti,qi){ const q=stations()[si]?.tasks[ti]?.quiz_data?.questions[qi]; if(q){ q.options=Array.isArray(q.options)?q.options:[]; q.options.push(""); commit(); } },
    quizEditOption(si,ti,qi,oi,val){ const q=stations()[si]?.tasks[ti]?.quiz_data?.questions[qi]; if(q&&q.options){ q.options[oi]=val; syncOnly(); } },
    quizDelOption(si,ti,qi,oi){ const q=stations()[si]?.tasks[ti]?.quiz_data?.questions[qi]; if(q&&q.options){ q.options.splice(oi,1); if(q.correct_index>=q.options.length)q.correct_index=Math.max(0,q.options.length-1); commit(); } },
    quizSetCorrect(si,ti,qi,oi){ const q=stations()[si]?.tasks[ti]?.quiz_data?.questions[qi]; if(q){ q.correct_index=oi; commit(); } },
    // Reflexions-Editor
    reflexionAddScale(si,ti){ const t=stations()[si]?.tasks[ti]; if(t){ t.reflexion_scales=Array.isArray(t.reflexion_scales)?t.reflexion_scales:[]; t.reflexion_scales.push({label:""}); renderPanelOnly(); syncOnly(); } },
    reflexionEditScale(si,ti,xi,val){ const t=stations()[si]?.tasks[ti]; if(t&&Array.isArray(t.reflexion_scales)&&t.reflexion_scales[xi]){ t.reflexion_scales[xi].label=val; syncOnly(); } },
    reflexionDelScale(si,ti,xi){ const t=stations()[si]?.tasks[ti]; if(t&&Array.isArray(t.reflexion_scales)){ t.reflexion_scales.splice(xi,1); renderPanelOnly(); syncOnly(); } },
    reflexionAddHelper(si,ti){ const t=stations()[si]?.tasks[ti]; if(t){ t.reflexion_helpers=Array.isArray(t.reflexion_helpers)?t.reflexion_helpers:[]; t.reflexion_helpers.push(""); renderPanelOnly(); syncOnly(); } },
    reflexionEditHelper(si,ti,hi,val){ const t=stations()[si]?.tasks[ti]; if(t&&Array.isArray(t.reflexion_helpers)){ t.reflexion_helpers[hi]=val; syncOnly(); } },
    reflexionDelHelper(si,ti,hi){ const t=stations()[si]?.tasks[ti]; if(t&&Array.isArray(t.reflexion_helpers)){ t.reflexion_helpers.splice(hi,1); renderPanelOnly(); syncOnly(); } },
    // Video: extrahiert echte 11-stellige YouTube-ID aus URL oder roher ID
    setVideo(si,ti,raw){
      const t=stations()[si]?.tasks[ti]; if(!t) return;
      t._youtube_input = raw;
      const id = extractYouTubeId(raw);
      const wasValid = /^[A-Za-z0-9_-]{11}$/.test(String(t.youtube_video_id||""));
      t.youtube_video_id = id || "";
      if(id){ t.video_id = id; t.video_thumbnail = `https://img.youtube.com/vi/${id}/hqdefault.jpg`; }
      syncOnly();
      const nowValid = /^[A-Za-z0-9_-]{11}$/.test(id||"");
      // Panel neu rendern, wenn sich Gültigkeit ändert (Vorschau ein/aus erscheint)
      if(nowValid !== wasValid) renderPanelOnly();
    }
  };

  // Gemeinsamer Upload: nutzt window.SUPABASE_URL/-Token wie die TONI-Funktionen
  async function uploadMedia(si,ti,input,kind){
    const file=input.files&&input.files[0]; if(!file) return;
    const t=stations()[si]?.tasks[ti]; if(!t) return;
    const status=document.getElementById("v111-matstatus");
    if(status) status.textContent="Wird hochgeladen…";
    try{
      const token=(typeof toniV27GetAccessToken==="function") ? await toniV27GetAccessToken() : null;
      const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"_");
      const path=(kind==="image"?`tasks/img_${Date.now()}_${safe}`:`tasks/files/${Date.now()}_${safe}`);
      const res=await fetch(`${window.SUPABASE_URL}/storage/v1/object/learning-content/${path}`,{
        method:"POST",
        headers:{ "apikey":window.SUPABASE_ANON_KEY, "Authorization":"Bearer "+token, "Content-Type":file.type, "x-upsert":"true" },
        body:file
      });
      if(!res.ok) throw new Error(await res.text());
      const url=`${window.SUPABASE_URL}/storage/v1/object/public/learning-content/${path}`;
      t.blocks=Array.isArray(t.blocks)?t.blocks:[];
      if(kind==="image") t.blocks.push({type:"image",url,alt:file.name});
      else t.blocks.push({type:"file",url,name:file.name});
      if(status) status.textContent="✅ Hochgeladen";
      commit();
    }catch(e){
      if(status) status.textContent="Fehler: "+(e.message||e);
    }
  }

  function setStationsArr(arr){ window.TONI_JOURNEY_BUILDER_STATIONS=arr; }
  function syncOnly(){ if(typeof syncJourneyBuilderToLegacyTextareaV17==="function") syncJourneyBuilderToLegacyTextareaV17(); }

  // YouTube-ID-Extraktion (gespiegelt aus TONIs Validierung)
  function extractYouTubeId(raw){
    const s = String(raw||"").trim();
    if(!s) return "";
    if(/^[A-Za-z0-9_-]{11}$/.test(s)) return s; // schon eine reine ID
    let url;
    try{ url = new URL(s); }catch{ return ""; }
    const host = url.hostname.replace(/^www\./i,"").toLowerCase();
    let id = "";
    if(host==="youtu.be"){
      id = url.pathname.split("/").filter(Boolean)[0] || "";
    }else if(["youtube.com","m.youtube.com","music.youtube.com","youtube-nocookie.com"].includes(host)){
      const parts = url.pathname.split("/").filter(Boolean);
      if(url.pathname==="/watch") id = url.searchParams.get("v") || "";
      else if(["embed","shorts","live"].includes(parts[0])) id = parts[1] || "";
    }
    id = String(id||"").trim();
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : "";
  }

  // Nur das Aufgaben-Panel neu rendern (Bauspalte bleibt, Fokus dort erhalten)
  function renderPanelOnly(){
    if(!ui.editing) return;
    const old = document.querySelector("#toni-v111-editor .v111-panel");
    if(!old){ render(); return; }
    const tmp = document.createElement("div");
    tmp.innerHTML = taskPanelHtml();
    const fresh = tmp.firstElementChild;
    if(fresh) old.replaceWith(fresh);
    else render();
  }
  function updatePreviewOnly(){
    // Vorschau-Spalte wurde entfernt – beim Tippen ist keine Aktualisierung nötig.
    // (Medien-Vorschau im Panel wird gezielt über renderPanelOnly aktualisiert.)
  }
  window.TONI_EDITOR_V111_UI = UI;

  // ---- Styles (abgehärtet: #toni-v111-editor-Scope + !important gegen TONI-Stile) ----
  function injectStyles(){
    if(document.getElementById("v111-styles")) return;
    const css = document.createElement("style");
    css.id="v111-styles";
    const S = "#toni-v111-editor";
    css.textContent = `
      ${S}{
        --v111-t1:#1a1a18; --v111-t2:#5f5e5a; --v111-t3:#888780;
        --v111-b1:rgba(0,0,0,.12); --v111-b2:rgba(0,0,0,.22);
        --v111-bg1:#ffffff; --v111-bg2:#f7f6f2;
        color-scheme:light!important;
      }
      ${S} input, ${S} textarea, ${S} select, ${S} button{ color-scheme:light!important; }
      ${S} *{box-sizing:border-box!important}
      ${S} .v111-single{display:block!important;width:100%!important}
      ${S} .v111-coltitle{font-size:11px!important;font-weight:500!important;color:var(--v111-t3)!important;text-transform:uppercase!important;letter-spacing:.05em!important;margin:0 0 8px!important}
      ${S} .v111-head{background:var(--v111-bg1)!important;border:0.5px solid var(--v111-b1)!important;border-radius:12px!important;padding:12px 14px!important;margin-bottom:8px!important}
      ${S} .v111-headtitle{width:100%!important;border:none!important;background:none!important;padding:0!important;margin:0 0 4px!important;font-size:14px!important;font-weight:500!important;color:var(--v111-t1)!important;font-family:inherit!important;outline:none!important}
      ${S} .v111-headgoal{width:100%!important;border:none!important;background:none!important;padding:0!important;margin:0!important;font-size:12px!important;color:var(--v111-t2)!important;font-family:inherit!important;outline:none!important}
      ${S} .v111-station{background:var(--v111-bg1)!important;border:0.5px solid var(--v111-b1)!important;border-radius:12px!important;margin-bottom:8px!important;overflow:hidden!important}
      ${S} .v111-station.open{border-color:#B5D4F4!important}
      ${S} .v111-stationhead{display:flex!important;align-items:center!important;gap:8px!important;padding:11px 12px!important;cursor:pointer!important}
      ${S} .v111-grip{color:var(--v111-t3)!important;cursor:grab!important;font-size:14px!important;line-height:1!important}
      ${S} .v111-grip-sm{font-size:12px!important}
      ${S} .v111-stationtitle{flex:1!important;font-size:13px!important;font-weight:500!important;color:var(--v111-t1)!important}
      ${S} .v111-count{font-size:11px!important;color:var(--v111-t3)!important}
      ${S} .v111-chev{color:var(--v111-t3)!important;font-size:12px!important}
      ${S} .v111-stationbody{padding:0 12px 12px!important}
      ${S} .v111-inp{width:100%!important;box-sizing:border-box!important;padding:8px 10px!important;border:0.5px solid var(--v111-b2)!important;border-radius:8px!important;font-size:13px!important;background:var(--v111-bg1)!important;color:var(--v111-t1)!important;margin-bottom:6px!important;font-family:inherit!important;outline:none!important}
      ${S} .v111-sub{font-size:12px!important}
      ${S} .v111-ta{min-height:60px!important;resize:vertical!important;line-height:1.5!important}
      ${S} .v111-tasks{margin:4px 0!important}
      ${S} .v111-taskrow{display:flex!important;align-items:center!important;gap:7px!important;padding:7px 9px!important;border-radius:8px!important;cursor:pointer!important;background:var(--v111-bg2)!important;margin-bottom:4px!important}
      ${S} .v111-taskname{flex:1!important;font-size:12px!important;font-weight:500!important}
      ${S} .v111-taskmeta{font-size:11px!important;color:var(--v111-t3)!important}
      ${S} .v111-addtask,${S} .v111-addstation{display:flex!important;align-items:center!important;justify-content:center!important;gap:5px!important;font-size:12px!important;color:#185FA5!important;border:0.5px dashed var(--v111-b2)!important;border-radius:8px!important;padding:9px!important;cursor:pointer!important;margin-top:4px!important;background:none!important}
      ${S} .v111-stationactions{margin-top:8px!important;text-align:right!important}
      ${S} .v111-sbtn{font-size:12px!important;color:var(--v111-t2)!important;background:none!important;border:0.5px solid var(--v111-b2)!important;border-radius:8px!important;padding:6px 11px!important;cursor:pointer!important;font-family:inherit!important}
      ${S} .v111-pbtn{font-size:12px!important;color:#fff!important;background:#639922!important;border:none!important;border-radius:8px!important;padding:7px 13px!important;cursor:pointer!important;margin-left:6px!important;font-family:inherit!important}
      ${S} .v111-preview{background:var(--v111-bg1)!important;border:0.5px solid var(--v111-b1)!important;border-radius:12px!important;padding:14px!important}
      ${S} .v111-pvtitle{font-size:13px!important;font-weight:500!important;color:var(--v111-t1)!important;margin:0!important}
      ${S} .v111-pvgoal{font-size:11px!important;color:var(--v111-t2)!important;margin:2px 0 10px!important}
      ${S} .v111-route{display:flex!important;align-items:center!important;gap:3px!important;margin:10px 0 14px!important}
      ${S} .v111-routedot{width:24px!important;height:24px!important;border-radius:50%!important;display:flex!important;align-items:center!important;justify-content:center!important;font-size:11px!important;flex-shrink:0!important;background:var(--v111-bg2)!important;color:var(--v111-t3)!important}
      ${S} .v111-routedot.done{background:#639922!important;color:#fff!important}
      ${S} .v111-routedot.current{background:#185FA5!important;color:#fff!important;width:28px!important;height:28px!important;font-size:12px!important;font-weight:500!important}
      ${S} .v111-routedot.trophy{background:var(--v111-bg2)!important}
      ${S} .v111-routeline{flex:1!important;height:2px!important;background:var(--v111-b1)!important;min-width:12px!important}
      ${S} .v111-routeline.done{background:#639922!important}
      ${S} .v111-pvstation{font-size:12px!important;font-weight:500!important;color:var(--v111-t1)!important;margin-bottom:6px!important}
      ${S} .v111-pvtask{display:flex!important;flex-direction:column!important;background:var(--v111-bg2)!important;border-radius:8px!important;padding:9px 11px!important;margin-bottom:5px!important}
      ${S} .v111-pvtask>span:first-child{font-size:12px!important;font-weight:500!important}
      ${S} .v111-pvmeta{font-size:11px!important;color:var(--v111-t2)!important;margin-top:2px!important}
      ${S} .v111-empty{font-size:12px!important;color:var(--v111-t3)!important;padding:10px!important;text-align:center!important}
      ${S} .v111-panel{background:var(--v111-bg2)!important;border:0.5px solid var(--v111-b1)!important;border-radius:12px!important;padding:14px!important;margin-top:12px!important}
      ${S} .v111-panelhead{font-size:14px!important;font-weight:500!important;color:var(--v111-t1)!important;margin-bottom:12px!important;padding-bottom:10px!important;border-bottom:0.5px solid var(--v111-b1)!important}
      ${S} .v111-flabel{font-size:11px!important;color:var(--v111-t3)!important;margin-bottom:5px!important}
      ${S} .v111-typerow{display:flex!important;gap:5px!important;flex-wrap:wrap!important;margin-bottom:10px!important}
      ${S} .v111-typebtn{font-size:12px!important;padding:6px 11px!important;border-radius:8px!important;background:var(--v111-bg1)!important;border:0.5px solid var(--v111-b1)!important;color:var(--v111-t2)!important;cursor:pointer!important}
      ${S} .v111-typebtn.active{border-width:2px!important}
      ${S} .v111-hint{background:#FAEEDA!important;border-radius:8px!important;padding:9px 12px!important;font-size:12px!important;color:#633806!important;margin-bottom:10px!important}
      ${S} .v111-panelfoot{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:10px!important;margin-top:4px!important}
      ${S} .v111-toggle{display:flex!important;align-items:center!important;gap:7px!important;font-size:12px!important;color:var(--v111-t2)!important;cursor:pointer!important}
      ${S} .v111-material{margin-bottom:10px!important}
      ${S} .v111-matrow{display:flex!important;gap:6px!important;margin-bottom:6px!important;align-items:center!important}
      ${S} .v111-matbtn{display:inline-flex!important;align-items:center!important;gap:5px!important;font-size:12px!important;color:var(--v111-t2)!important;background:var(--v111-bg1)!important;border:0.5px dashed var(--v111-b2)!important;border-radius:8px!important;padding:7px 11px!important;cursor:pointer!important}
      ${S} .v111-matstatus{font-size:11px!important;color:var(--v111-t3)!important;min-height:14px!important}
      ${S} .v111-matlist{margin-top:6px!important}
      ${S} .v111-matitem{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;background:var(--v111-bg1)!important;border:0.5px solid var(--v111-b1)!important;border-radius:8px!important;padding:6px 10px!important;margin-bottom:4px!important;font-size:12px!important;color:var(--v111-t1)!important}
      ${S} .v111-matdel{background:none!important;border:none!important;color:var(--v111-t3)!important;cursor:pointer!important;font-size:13px!important;padding:0 4px!important}
      ${S} .v111-quiz{margin-bottom:10px!important}
      ${S} .v111-qcard{background:var(--v111-bg1)!important;border:0.5px solid var(--v111-b1)!important;border-radius:10px!important;padding:10px!important;margin-bottom:8px!important}
      ${S} .v111-qhead{display:flex!important;align-items:center!important;justify-content:space-between!important;margin-bottom:6px!important}
      ${S} .v111-qnum{font-size:12px!important;font-weight:500!important;color:var(--v111-t1)!important}
      ${S} .v111-qopts{margin:6px 0!important}
      ${S} .v111-qopt{display:flex!important;align-items:center!important;gap:6px!important;margin-bottom:5px!important}
      ${S} .v111-qcorrect{flex-shrink:0!important;width:26px!important;height:26px!important;border-radius:50%!important;border:0.5px solid var(--v111-b2)!important;background:var(--v111-bg1)!important;color:var(--v111-t3)!important;cursor:pointer!important;font-size:13px!important;display:flex!important;align-items:center!important;justify-content:center!important}
      ${S} .v111-qcorrect.on{background:#639922!important;border-color:#639922!important;color:#fff!important}
      ${S} .v111-qaddopt,${S} .v111-qadd{font-size:12px!important;color:#185FA5!important;background:none!important;border:0.5px dashed var(--v111-b2)!important;border-radius:8px!important;padding:6px 11px!important;cursor:pointer!important}
      ${S} .v111-qadd{display:block!important;width:100%!important;margin-top:4px!important;padding:8px!important}
      ${S} .v111-ytok{display:flex!important;align-items:center!important;gap:8px!important;font-size:12px!important;color:#27500A!important;margin-top:6px!important}
      ${S} .v111-ytthumb{width:64px!important;height:36px!important;object-fit:cover!important;border-radius:6px!important;flex-shrink:0!important}
      ${S} .v111-yterr{font-size:12px!important;color:#854F0B!important;margin-top:6px!important}
      ${S} .v111-reflex{margin-bottom:10px!important}
      ${S} .v111-rxcard{background:var(--v111-bg1)!important;border:0.5px solid var(--v111-b1)!important;border-radius:10px!important;padding:11px!important;margin-top:8px!important}
      ${S} .v111-rxrow{display:flex!important;align-items:center!important;justify-content:space-between!important;font-size:12px!important;font-weight:500!important;color:var(--v111-t1)!important;cursor:pointer!important}
      ${S} .v111-pvmedia{margin:8px 0!important}
      ${S} .v111-pvimg{max-width:100%!important;border-radius:8px!important;margin-bottom:6px!important;display:block!important}
      ${S} .v111-pvembed{position:relative!important;padding-bottom:56.25%!important;height:0!important;overflow:hidden!important;border-radius:8px!important;background:#000!important;margin-bottom:6px!important}
      ${S} .v111-pvembed iframe{position:absolute!important;top:0!important;left:0!important;width:100%!important;height:100%!important;border:0!important}
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

  // KERN-FIX: Speicherung verlustfrei machen.
  // Die bestehende buildJourneyFromFormV16 parst die Stationen aus dem Textfeld,
  // wodurch quiz_data, youtube_video_id, blocks und reflexion_* verloren gehen.
  // Wir überschreiben sie additiv: liegt das reiche Array vor, nutzen wir dessen
  // steps direkt (mit allen Feldern). So bleiben alle Aufgabentypen erhalten.
  function installRichBuildOverride(){
    if(typeof window.buildJourneyFromFormV16!=="function" || window.buildJourneyFromFormV16.__v111Rich) return;
    const orig = window.buildJourneyFromFormV16;
    window.buildJourneyFromFormV16 = function(id){
      const journey = orig.apply(this, arguments); // Titel/Ziel/Validierung wie gehabt
      const rich = window.TONI_JOURNEY_BUILDER_STATIONS;
      if(Array.isArray(rich) && rich.length){
        // steps aus dem reichen Array übernehmen, Status-/Reihenfolge-Logik beibehalten
        journey.steps = rich.map((s,si)=>({
          ...s,
          tasks: (s.tasks||[]).map((t,ti)=>({
            ...t,
            status: t.status || (si===0 ? "todo" : "locked")
          }))
        }));
      }
      return journey;
    };
    window.buildJourneyFromFormV16.__v111Rich = true;
  }

  window.addEventListener("DOMContentLoaded", ()=>{
    let tries=0;
    const timer=setInterval(()=>{
      tries++;
      installRichBuildOverride();
      if(init() || tries>20){
        clearInterval(timer);
        ["resetJourneyEditor","editAdminJourney","fillJourneyExample"].forEach(wrap);
        installRichBuildOverride();
      }
    }, 400);
  });

  window.TONI_EDITOR_V111.initUI = init;
  window.TONI_EDITOR_V111.render = render;
  window.TONI_EDITOR_V111.installRichBuildOverride = installRichBuildOverride;
})();
