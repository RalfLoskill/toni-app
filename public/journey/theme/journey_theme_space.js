/* ============================================================
 * TONI – Lernreisen-Theme: "Weltall / Cockpit"
 * Datei: journey_theme_space.js
 * Build: theme-space-v10-cockpit
 *
 * NEUKONZEPT (Cockpit-Ansicht):
 *  - Läuft IMMER im Vollbild (100vw/100vh), randlos.
 *  - In der Mitte: das COCKPIT eines Raumschiffs (schlicht per SVG/CSS).
 *  - Auf dem Cockpit ein zentraler BILDSCHIRM, auf dem die Stationen
 *    als kleine KACHELN erscheinen (Status: done / current / locked).
 *  - Hintergrund: rotierendes Sternenfeld.
 *  - Hintergrund: eine grosse, farbenfrohe ERDE (blau), die sich langsam dreht.
 *  - Die AUFGABEN einer Station erscheinen im DOCK UNTEN (wie Metall/
 *    Baumaschine): Klick auf eine Stations-Kachel öffnet das Dock mit
 *    den Aufgaben dieser Station.
 *
 * Andocken an TONI:
 *  - Kachel-Klick   -> toniSpaceSelectStation(i): wählt Station via
 *                      window.toniTimelineSelect(i) und öffnet das Dock.
 *  - Aufgabe-Klick  -> window.openLearningTask(task.id) (bestehend).
 *  - Status der Station kommt aus window.stepStatus().
 * ============================================================ */

(function () {
  "use strict";

  if (!window.toniThemes || typeof window.toniThemes.register !== "function") {
    console.error("[TONI-Theme:space] Theme-Engine nicht gefunden – Theme wird nicht registriert.");
    return;
  }

  /* ---- Typ-Farben (TONI-Farbcodierung) ---- */
  const TYPE_COLOR = {
    Lerninhalt: "#4DA6FF",
    Aufgabe: "#FF7A3C",
    Quiz: "#FFC857",
    Reflexion: "#3DDC97",
    Video: "#C66BFF"
  };

  /* ---- SVG-Icons (schlank, inline) ---- */
  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c2.5 2 4 5 4 9l1.5 1.5v1.5l-2.5-1-1 2h-4l-1-2-2.5 1v-1.5L8 12c0-4 1.5-7 4-9z"/><circle cx="12" cy="9" r="1.4"/></svg>',
    info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5v.01"/></svg>',
    task: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h10"/></svg>',
    quiz: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 9a3 3 0 1 1 4 2.8c-.9.4-1 .9-1 1.7v.5M12 17.5v.01"/></svg>',
    reflect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.5 8.5 0 1 1-4-7.2L21 4v4h-4"/></svg>',
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
  };

  function typeIcon(t) {
    if (t === "Lerninhalt") return ICON.info;
    if (t === "Aufgabe") return ICON.task;
    if (t === "Quiz") return ICON.quiz;
    if (t === "Reflexion") return ICON.reflect;
    if (t === "Video") return ICON.video;
    return ICON.task;
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function normType(type) {
    if (typeof window.toniNormalizeType === "function") {
      return window.toniNormalizeType(type);
    }
    const t = String(type || "").toLowerCase();
    if (["info", "erklärung", "material", "lerninhalt"].includes(t)) return "Lerninhalt";
    if (["übung", "praxis", "aufgabe"].includes(t)) return "Aufgabe";
    if (t === "quiz") return "Quiz";
    if (t === "video") return "Video";
    if (t === "reflexion") return "Reflexion";
    return "Aufgabe";
  }

  function stationStatus(step, index, journey) {
    if (typeof window.stepStatus === "function") {
      try { return window.stepStatus(step, index, journey); } catch (e) { /* fällt durch */ }
    }
    return "current";
  }

  /* Zuletzt gerenderte Reise merken (für Dock-Aufbau bei Klick). */
  let _journey = null;

  /* ----------------------------------------------------------
   * INTERAKTION: Station wählen -> Dock unten mit Aufgaben
   * -------------------------------------------------------- */
  window.toniSpaceSelectStation = function (index) {
    const root = document.querySelector(".toni-space");
    if (!root) return;
    const tile = root.querySelector('.toni-space__tile[data-step-index="' + index + '"]');
    if (!tile || tile.classList.contains("locked")) return;

    // aktive Kachel markieren
    root.querySelectorAll(".toni-space__tile.active").forEach(function (t) {
      t.classList.remove("active");
    });
    tile.classList.add("active");

    // TONI-Timeline informieren
    if (typeof window.toniTimelineSelect === "function") {
      try { window.toniTimelineSelect(index); } catch (e) { /* nicht kritisch */ }
    }

    openDock(index);
  };

  window.toniSpaceCloseDock = function () {
    const root = document.querySelector(".toni-space");
    if (!root) return;
    const dock = root.querySelector(".toni-space__dock");
    if (dock) dock.classList.remove("open");
    root.querySelectorAll(".toni-space__tile.active").forEach(function (t) {
      t.classList.remove("active");
    });
  };

  function openDock(index) {
    const root = document.querySelector(".toni-space");
    if (!root || !_journey) return;
    const steps = _journey.steps || [];
    const step = steps[index];
    if (!step) return;

    const dock = root.querySelector(".toni-space__dock");
    if (!dock) return;

    const st = stationStatus(step, index, _journey);
    const tasks = step.tasks || [];

    let body = "";
    if (tasks.length === 0) {
      body = `<div class="toni-space__dock-empty">Diese Station hat noch keine Aufgaben.</div>`;
    } else {
      body = `<div class="toni-space__dock-list">`;
      for (let m = 0; m < tasks.length; m++) {
        const t = tasks[m];
        const tt = normType(t.type);
        const col = TYPE_COLOR[tt] || "#9FB0D9";
        const taskDone = t.status === "done";
        const locked = (st === "locked");
        const tick = taskDone
          ? `<span class="toni-space__tasktick">${ICON.check}</span>` : "";
        const handlers = locked
          ? `aria-disabled="true"`
          : `role="button" tabindex="0" ` +
            `onclick="event.stopPropagation();openLearningTask('${esc(t.id)}')" ` +
            `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openLearningTask('${esc(t.id)}');}"`;
        body +=
          `<div class="toni-space__task ${locked ? "locked" : ""} ${taskDone ? "done" : ""}" ` +
            `style="--cc:${col}" ${handlers}>` +
            `<span class="toni-space__tnum">${m + 1}</span>` +
            `<span class="toni-space__tico" style="color:${col}">${typeIcon(tt)}</span>` +
            `<span class="toni-space__tbody">` +
              `<span class="toni-space__ttitle">${esc(t.title)}</span>` +
              `<span class="toni-space__ttype">${esc(tt)}</span>` +
            `</span>` +
            tick +
            `<span class="toni-space__tchev">${ICON.chevron}</span>` +
          `</div>`;
      }
      body += `</div>`;
    }

    dock.innerHTML =
      `<div class="toni-space__dock-head">` +
        `<span class="toni-space__dock-title">${ICON.rocket}<span>${esc(step.title)}</span></span>` +
        `<button type="button" class="toni-space__dock-close" ` +
          `onclick="toniSpaceCloseDock()" aria-label="Schließen">${ICON.close}</button>` +
      `</div>` +
      body;
    dock.classList.add("open");
  }

  window.toniSpaceGotoCurrent = function () {
    const root = document.querySelector(".toni-space");
    if (!root || !_journey) return;
    const steps = _journey.steps || [];
    let idx = -1;
    for (let i = 0; i < steps.length; i++) {
      if (stationStatus(steps[i], i, _journey) === "current") { idx = i; break; }
    }
    if (idx < 0) {
      for (let i = steps.length - 1; i >= 0; i--) {
        if (stationStatus(steps[i], i, _journey) === "done") { idx = i; break; }
      }
    }
    if (idx >= 0) window.toniSpaceSelectStation(idx);
  };

  /* ----------------------------------------------------------
   * CSS (einmalig injizieren)
   * -------------------------------------------------------- */
  function injectStyles() {
    if (document.getElementById("toni-theme-space-css")) return;
    const css = `
.toni-space{position:relative;width:100%;min-height:100%;border-radius:16px;overflow:hidden;
  background:radial-gradient(120% 80% at 80% 8%,rgba(124,92,255,.28),transparent 55%),
             radial-gradient(110% 70% at 12% 78%,rgba(51,214,224,.18),transparent 50%),
             linear-gradient(180deg,#070A1C 0%,#0C1230 55%,#0A0E26 100%);
  display:flex;flex-direction:column;}

/* ---- Hintergrund-Sterne (statisch) ---- */
.toni-space__stars{position:absolute;inset:0;z-index:0;pointer-events:none;}
.toni-space__stars i{position:absolute;background:#fff;border-radius:50%;opacity:.7;}

/* ---- Hintergrund-Sterne (rotierend) ---- */
.toni-space__starspin{position:absolute;left:50%;top:50%;width:200%;height:200%;
  transform:translate(-50%,-50%);z-index:0;pointer-events:none;
  animation:toniSpaceRotate 120s linear infinite;transform-origin:center;}
.toni-space__starspin i{position:absolute;background:#fff;border-radius:50%;}
@keyframes toniSpaceRotate{from{transform:translate(-50%,-50%) rotate(0deg);}
  to{transform:translate(-50%,-50%) rotate(360deg);}}

/* ---- Grosse, langsam drehende Erde im Hintergrund ---- */
.toni-space__earth{position:absolute;z-index:1;pointer-events:none;
  width:min(70vw,560px);height:min(70vw,560px);
  left:50%;top:8%;transform:translateX(-50%);
  filter:drop-shadow(0 0 60px rgba(60,130,255,.45));opacity:.95;}
.toni-space__earth svg{display:block;width:100%;height:100%;}
.toni-space__earth .earth-spin{transform-origin:130px 130px;
  animation:toniEarthSpin 80s linear infinite;}
@keyframes toniEarthSpin{from{transform:rotate(0deg);}to{transform:rotate(360deg);}}
/* Wolken-Schicht etwas schneller, gegenläufig für Tiefe */
.toni-space__earth .earth-clouds{transform-origin:130px 130px;
  animation:toniEarthClouds 60s linear infinite;}
@keyframes toniEarthClouds{from{transform:rotate(0deg);}to{transform:rotate(-360deg);}}

/* ---- Sternschnuppen ---- */
.toni-space__shooting{position:absolute;top:0;left:0;width:140px;height:2px;z-index:1;
  background:linear-gradient(90deg,rgba(255,255,255,0),#fff);border-radius:2px;
  opacity:0;transform:rotate(28deg);animation:toniShoot 9s ease-in infinite;}
.toni-space__shooting.s2{animation-delay:4.5s;top:24%;}
@keyframes toniShoot{
  0%{opacity:0;transform:translate(-10vw,-6vh) rotate(28deg);}
  3%{opacity:1;}9%{opacity:1;}
  14%{opacity:0;transform:translate(60vw,34vh) rotate(28deg);}
  100%{opacity:0;transform:translate(60vw,34vh) rotate(28deg);}}

/* ============================================================
 * COCKPIT (Bühne) – nimmt den Hauptraum ein, Bildschirm in der Mitte
 * ============================================================ */
.toni-space__stage{position:relative;z-index:3;flex:1 1 auto;
  display:flex;align-items:center;justify-content:center;
  padding:24px 20px 28px;min-height:0;}
.toni-space__cockpit{position:relative;width:min(94vw,1040px);
  margin:0 auto;}
.toni-space__cockpit-svg{position:absolute;inset:-6% -2% -2%;width:104%;height:112%;z-index:2;
  pointer-events:none;filter:drop-shadow(0 0 18px rgba(10,16,40,.6));}
/* Slogan über dem Bildschirm */
.toni-space__slogan{position:relative;z-index:4;text-align:center;
  font-size:12px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;
  color:#7FE9FF;text-shadow:0 0 12px rgba(80,200,255,.5);margin:0 0 10px;}

/* ---- Der Bildschirm im Cockpit ---- */
.toni-space__screen{position:relative;z-index:3;
  margin:0 auto;width:min(86vw,820px);
  border-radius:18px;padding:18px 18px 20px;
  background:
    radial-gradient(120% 100% at 50% 0%,rgba(90,160,255,.18),transparent 60%),
    linear-gradient(180deg,rgba(10,16,42,.92),rgba(6,10,28,.96));
  border:2px solid rgba(120,180,255,.45);
  box-shadow:0 0 0 6px rgba(8,12,30,.6),0 0 38px rgba(70,150,255,.35),
             inset 0 0 60px rgba(40,90,200,.18),inset 0 2px 0 rgba(255,255,255,.06);}
/* feine Scanlines auf dem Screen */
.toni-space__screen::before{content:"";position:absolute;inset:0;border-radius:16px;
  background:repeating-linear-gradient(180deg,rgba(120,180,255,.05) 0 2px,transparent 2px 4px);
  pointer-events:none;opacity:.5;}
.toni-space__screen-head{position:relative;display:flex;align-items:center;justify-content:space-between;
  margin:0 2px 12px;color:#AFE3FF;font-size:12px;font-weight:700;letter-spacing:.06em;}
.toni-space__screen-head .dot{display:inline-block;width:8px;height:8px;border-radius:50%;
  background:#3DDC97;box-shadow:0 0 8px #3DDC97;margin-right:6px;vertical-align:middle;}
.toni-space__screen-prog{font-size:11px;color:#7FB6FF;font-weight:800;letter-spacing:.04em;}

/* ---- Stations-Kacheln auf dem Bildschirm ---- */
.toni-space__tiles{position:relative;display:grid;gap:10px;
  grid-template-columns:repeat(auto-fill,minmax(150px,1fr));}
.toni-space__tile{position:relative;display:flex;flex-direction:column;gap:7px;
  padding:12px 12px 11px;border-radius:13px;cursor:pointer;text-align:left;
  background:linear-gradient(180deg,rgba(28,40,86,.85),rgba(18,26,60,.9));
  border:1.5px solid rgba(120,170,255,.28);color:#EAF0FF;
  box-shadow:0 6px 16px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.05);
  transition:transform .14s ease,border-color .14s ease,box-shadow .14s ease;}
.toni-space__tile:hover{transform:translateY(-2px);border-color:rgba(150,200,255,.6);
  box-shadow:0 10px 24px rgba(20,60,160,.4),inset 0 1px 0 rgba(255,255,255,.08);}
.toni-space__tile:focus-visible{outline:3px solid #FFC857;outline-offset:3px;}
.toni-space__tile.active{border-color:#7FE9FF;
  box-shadow:0 0 0 2px rgba(127,233,255,.4),0 12px 26px rgba(20,80,200,.45);}
.toni-space__tile-top{display:flex;align-items:center;gap:9px;}
.toni-space__tile-badge{flex:0 0 auto;width:34px;height:34px;border-radius:10px;
  display:grid;place-items:center;font-weight:900;font-size:15px;color:#fff;
  background:radial-gradient(circle at 32% 28%,#3a4a86,#1c2550);
  box-shadow:inset 0 0 0 1px rgba(255,255,255,.08);}
.toni-space__tile-badge svg{width:18px;height:18px;}
.toni-space__tile.done .toni-space__tile-badge{background:radial-gradient(circle at 32% 28%,#2E8B62,#16402F);}
.toni-space__tile.current .toni-space__tile-badge{background:radial-gradient(circle at 32% 28%,#FFC857,#E08A1E);
  color:#241500;box-shadow:0 0 0 3px rgba(255,200,87,.28),0 0 18px rgba(255,200,87,.5);}
.toni-space__tile.locked{opacity:.5;cursor:default;}
.toni-space__tile.locked .toni-space__tile-badge{background:radial-gradient(circle at 32% 28%,#3a3f5c,#23263c);}
.toni-space__tile-title{font-size:13.5px;font-weight:750;line-height:1.25;flex:1 1 auto;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.toni-space__tile-meta{display:flex;align-items:center;justify-content:space-between;gap:8px;
  margin-top:1px;}
.toni-space__tile-state{font-size:10.5px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;
  padding:2px 8px;border-radius:20px;}
.toni-space__tile.done .toni-space__tile-state{background:rgba(61,220,151,.16);color:#7CF0C0;}
.toni-space__tile.current .toni-space__tile-state{background:rgba(255,200,87,.18);color:#FFD98A;}
.toni-space__tile.locked .toni-space__tile-state{background:rgba(159,176,217,.14);color:#AEBBDD;}
.toni-space__tile-dots{display:flex;gap:3px;flex-wrap:wrap;}
.toni-space__tile-dots span{width:7px;height:7px;border-radius:50%;display:inline-block;}

/* ============================================================
 * DOCK (Aufgaben unten – wie Metall/Baumaschine)
 * ============================================================ */
.toni-space__dock{position:relative;z-index:6;margin:0;flex:0 0 auto;
  max-height:0;overflow:hidden;
  background:linear-gradient(180deg,rgba(14,20,48,.96),rgba(8,12,30,.98));
  border-top:2px solid rgba(120,180,255,.4);
  box-shadow:0 -14px 40px rgba(20,60,160,.3);
  transition:max-height .3s ease;}
.toni-space__dock.open{max-height:46vh;overflow-y:auto;overscroll-behavior:contain;
  -webkit-overflow-scrolling:touch;}
.toni-space__dock-head{position:sticky;top:0;display:flex;align-items:center;justify-content:space-between;
  padding:12px 18px;background:linear-gradient(180deg,rgba(18,26,60,.98),rgba(12,18,44,.96));
  border-bottom:1px solid rgba(120,180,255,.22);z-index:2;}
.toni-space__dock-title{display:flex;align-items:center;gap:9px;color:#EAF0FF;
  font-size:15px;font-weight:800;}
.toni-space__dock-title svg{width:20px;height:20px;color:#FFC857;}
.toni-space__dock-close{border:none;background:rgba(120,180,255,.16);color:#EAF0FF;
  width:32px;height:32px;border-radius:9px;cursor:pointer;display:grid;place-items:center;
  transition:background .14s ease;}
.toni-space__dock-close svg{width:18px;height:18px;}
.toni-space__dock-close:hover{background:rgba(120,180,255,.32);}
.toni-space__dock-empty{padding:22px 18px;color:#9FB0D9;text-align:center;font-size:14px;}

.toni-space__dock-list{display:flex;flex-direction:column;gap:9px;padding:14px 18px 22px;}
.toni-space__task{position:relative;display:flex;align-items:center;gap:11px;
  padding:11px 13px;border-radius:12px;cursor:pointer;
  background:linear-gradient(180deg,rgba(26,36,78,.82),rgba(16,24,56,.9));
  border:1.5px solid rgba(120,170,255,.24);color:#EAF0FF;
  box-shadow:0 4px 12px rgba(0,0,0,.34);
  transition:transform .12s ease,border-color .14s ease,box-shadow .14s ease;}
.toni-space__task:hover{transform:translateY(-2px);border-color:var(--cc,#7FB6FF);
  box-shadow:0 8px 20px rgba(20,60,160,.34);}
.toni-space__task:focus-visible{outline:3px solid #FFC857;outline-offset:2px;}
.toni-space__task.locked{opacity:.5;cursor:default;filter:grayscale(.3);}
.toni-space__tnum{flex:0 0 auto;width:24px;height:24px;border-radius:8px;
  display:grid;place-items:center;font-size:12px;font-weight:850;
  background:rgba(10,16,40,.8);color:#FFD98A;border:1px solid rgba(255,200,87,.4);}
.toni-space__tico{flex:0 0 auto;width:26px;height:26px;display:grid;place-items:center;}
.toni-space__tico svg{width:22px;height:22px;}
.toni-space__tbody{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;}
.toni-space__ttitle{font-size:14px;font-weight:700;line-height:1.25;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.toni-space__ttype{font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;
  color:#8FA1CC;margin-top:1px;}
.toni-space__tasktick{flex:0 0 auto;width:22px;height:22px;border-radius:50%;
  background:#3DDC97;color:#08230F;display:grid;place-items:center;}
.toni-space__tasktick svg{width:14px;height:14px;}
.toni-space__tchev{flex:0 0 auto;color:#7FB6FF;display:grid;place-items:center;}
.toni-space__tchev svg{width:18px;height:18px;}
.toni-space__task.locked .toni-space__tchev{opacity:0;}

/* ---- leere Reise ---- */
.toni-space__empty{position:relative;z-index:3;padding:46px 24px;text-align:center;color:#9FB0D9;}

@media (prefers-reduced-motion: reduce){
  .toni-space__starspin{animation:none;}
  .toni-space__earth .earth-spin,.toni-space__earth .earth-clouds{animation:none;}
  .toni-space__shooting{display:none;}
}

/* ============================================================
 * VOLLBILD (randlos) – nur bei aktivem Weltall-Theme
 * ============================================================ */
body.toni-space-fullscreen{overflow:hidden !important;}
body.toni-space-fullscreen #lr-modal.toni-theme-active-space.lr-modal-backdrop,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space{
  position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;
  max-width:none !important;max-height:none !important;margin:0 !important;
  padding:0 !important;border:none !important;border-radius:0 !important;
  box-shadow:none !important;overflow:hidden !important;
  background:linear-gradient(180deg,#070A1C 0%,#0A0E26 100%) !important;
  z-index:4000 !important;}
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-card,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space > div{
  max-width:none !important;width:100% !important;height:100% !important;
  border:none !important;border-radius:0 !important;background:transparent !important;
  box-shadow:none !important;overflow:hidden !important;display:flex !important;
  flex-direction:column !important;}
/* Body füllt, eigener Scroll nur falls nötig; das Theme selbst regelt Scroll im Dock. */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-body{
  padding:0 !important;margin:0 !important;background:transparent !important;
  border:none !important;border-radius:0 !important;box-shadow:none !important;
  flex:1 1 auto !important;height:100% !important;min-height:0 !important;max-height:none !important;
  overflow:hidden !important;display:flex !important;flex-direction:column !important;}
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-detail-grid,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-main-card,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-top-split{
  padding:0 !important;margin:0 !important;background:transparent !important;
  border:none !important;border-radius:0 !important;box-shadow:none !important;
  flex:1 1 auto !important;height:100% !important;min-height:0 !important;
  display:flex !important;flex-direction:column !important;}
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .toni-space{
  overflow:hidden !important;border-radius:0 !important;flex:1 1 auto !important;min-height:0 !important;
  height:100% !important;}

/* ===== KOPFBEREICH: schwebt transparent ÜBER dem Weltraum (Desktop + Mobile) ===== */
/* Der Header bekommt keinen eigenen weißen Balken mehr, sondern liegt absolut
   über dem Sternenhimmel. So füllt der Weltraum den kompletten Bildschirm. */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-header{
  position:absolute !important;top:0 !important;left:0 !important;right:0 !important;
  z-index:30 !important;background:transparent !important;border:none !important;
  box-shadow:none !important;padding:14px 20px !important;
  display:flex !important;align-items:center !important;justify-content:space-between !important;
  pointer-events:none !important;}
/* Titel der Lernreise: weiß, ohne Hintergrundfeld, mit dezentem Schatten für Lesbarkeit. */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-title,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space #lr-modal-title{
  color:#FFFFFF !important;background:transparent !important;border:none !important;
  box-shadow:none !important;text-shadow:0 2px 10px rgba(0,0,0,.8),0 0 18px rgba(10,16,40,.7) !important;
  pointer-events:auto !important;}
/* Buttons (Journal/Schließen) wieder klickbar + hell auf dunklem Glas. */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-actions{
  pointer-events:auto !important;display:flex !important;gap:8px !important;width:auto !important;}
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-actions button,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-close-btn,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-journal-btn{
  background:rgba(20,26,58,.85) !important;color:#EAF0FF !important;
  border:1px solid rgba(255,200,87,.6) !important;
  box-shadow:0 2px 12px rgba(0,0,0,.45) !important;backdrop-filter:blur(5px);}
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-actions button *,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-close-btn *,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-journal-btn *{
  color:#EAF0FF !important;fill:#EAF0FF !important;}
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-actions button:hover,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-close-btn:hover,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-journal-btn:hover{
  background:rgba(36,48,102,.95) !important;}
/* Platz schaffen, damit die erste Bildschirm-Zeile nicht unter dem Header klebt. */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .toni-space__stage{
  padding-top:64px !important;}
/* "Stationen der Lernreise / Aktualisieren"-Kartenkopf ausblenden (alle Größen). */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .card-header{display:none !important;}

.toni-theme-active-space .lr-top-split{
  grid-template-columns:1fr !important;
  grid-template-areas:"stations" "right" !important;}
.toni-theme-active-space .lr-top-split .lr-stations{
  background:transparent !important;padding:0 !important;}
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-stations{
  flex:1 1 auto !important;height:100% !important;min-height:0 !important;
  display:flex !important;flex-direction:column !important;}

/* Aufräumen der Reise-Ansicht: Untertitel, rechte Spalte, Fortschrittsbalken, Cover raus. */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space #lr-modal-sub,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-sub,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-right-col,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space #lr-right-col,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-progress-big,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-cover-screen-v89,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-reset-btn,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space button[onclick*="resetLearningJourney"],
body.toni-space-fullscreen #lr-modal.toni-theme-active-space button[onclick*="reset"],
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-stations-refresh,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-stations-head{
  display:none !important;}

/* Aufgaben-Modal über dem Vollbild-Reise-Modal. */
body.toni-space-fullscreen #lr-task-modal.lr-modal-backdrop,
body.toni-space-fullscreen #lr-task-modal{z-index:5000 !important;}

/* ===== AUFGABEN-DETAIL (lr-task-modal) im Weltraum-Look ===== */
body.toni-space-fullscreen #lr-task-modal{
  --color-background-primary:#0C1024;
  --color-background-secondary:#1A2148;
  --color-text-primary:#EAF0FF;
  --color-text-secondary:#C6D2F2;
  --color-text-tertiary:#8FA1CC;
  --color-border-tertiary:#2C3870;
  --color-border-secondary:#34427E;
}
body.toni-space-fullscreen #lr-task-modal .lr-modal,
body.toni-space-fullscreen #lr-task-modal .lr-modal-card,
body.toni-space-fullscreen #lr-task-modal > div{
  background:radial-gradient(120% 70% at 85% 0%,rgba(124,92,255,.22),transparent 55%),
             linear-gradient(180deg,#0C1024 0%,#10163A 100%) !important;
  color:#EAF0FF !important;border:1px solid #2C3870 !important;
  box-shadow:0 0 0 1px rgba(255,200,87,.18),0 24px 60px rgba(0,0,0,.6) !important;}
body.toni-space-fullscreen #lr-task-modal .lr-modal-header{
  background:linear-gradient(90deg,rgba(26,33,72,.9),rgba(16,22,58,.6)) !important;
  border-bottom:1px solid rgba(255,200,87,.25) !important;}
body.toni-space-fullscreen #lr-task-modal .lr-modal-header *{color:#EAF0FF !important;}
body.toni-space-fullscreen #lr-task-modal #lr-task-content,
body.toni-space-fullscreen #lr-task-modal #lr-task-content *{color:#EAF0FF;}
body.toni-space-fullscreen #lr-task-modal #lr-task-content{
  background:rgba(20,26,58,.55);border:1px solid #2C3870;border-radius:12px;padding:14px 16px;}
body.toni-space-fullscreen #lr-task-modal #quiz-options button{
  background:linear-gradient(180deg,#1C2450,#161C3E) !important;
  border:1px solid #34427E !important;color:#EAF0FF !important;
  box-shadow:inset 0 1px 0 rgba(255,255,255,.05);transition:border-color .15s,transform .1s;}
body.toni-space-fullscreen #lr-task-modal #quiz-options button:hover{
  border-color:#FFC857 !important;transform:translateY(-1px);}
body.toni-space-fullscreen #lr-task-modal textarea,
body.toni-space-fullscreen #lr-task-modal input.toni-auf-input,
body.toni-space-fullscreen #lr-task-modal #lr-answer{
  background:rgba(12,16,36,.7) !important;color:#EAF0FF !important;
  border:1px solid #34427E !important;border-radius:10px !important;}
body.toni-space-fullscreen #lr-task-modal textarea::placeholder,
body.toni-space-fullscreen #lr-task-modal input::placeholder{color:#7E8FB8 !important;}
body.toni-space-fullscreen #lr-task-modal .lr-iconbtn-start,
body.toni-space-fullscreen #lr-task-modal .lr-iconbtn-done,
body.toni-space-fullscreen #lr-task-modal .lr-secondary-btn,
body.toni-space-fullscreen #lr-task-modal .lr-success-btn{
  background:linear-gradient(180deg,#243066,#1A2148) !important;
  border:1px solid #FFC857 !important;color:#FFE8B0 !important;}
body.toni-space-fullscreen #lr-task-modal .lr-success-btn{
  border-color:#3DDC97 !important;color:#BFF3DD !important;}
body.toni-space-fullscreen #lr-task-modal .lr-close-btn,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-close-btn{
  background:rgba(20,26,58,.92) !important;color:#EAF0FF !important;
  border:1px solid #FFC857 !important;}
body.toni-space-fullscreen #lr-task-modal .lr-close-btn:hover,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-close-btn:hover{
  background:rgba(36,48,102,.95) !important;}

/* ===== MOBILE ===== */
@media (max-width:760px){
  body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-header{
    padding:10px 12px !important;}
  body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-title{
    font-size:16px !important;max-width:60vw !important;
    white-space:nowrap !important;overflow:hidden !important;text-overflow:ellipsis !important;}
  body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-actions button{
    flex:0 0 auto !important;font-size:12px !important;padding:7px 10px !important;}
  body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-actions button[onclick*="startNextLearningTask"]{
    display:none !important;}
  body.toni-space-fullscreen #lr-modal.toni-theme-active-space .toni-space__stage{
    padding:54px 10px 16px !important;}
  .toni-space__earth{top:2%;width:min(90vw,420px);height:min(90vw,420px);}
  .toni-space__tiles{grid-template-columns:repeat(auto-fill,minmax(132px,1fr));gap:8px;}
  .toni-space__dock.open{max-height:54vh;}
}
`;
    const el = document.createElement("style");
    el.id = "toni-theme-space-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---- Vollbild-Schalter ---- */
  function enableFullscreen() {
    document.body.classList.add("toni-space-fullscreen");
    watchModalClose();
  }
  function disableFullscreen() {
    document.body.classList.remove("toni-space-fullscreen");
  }
  let _obs = null;
  function watchModalClose() {
    if (_obs) return;
    const modal = document.getElementById("lr-modal");
    if (!modal || typeof MutationObserver !== "function") return;
    _obs = new MutationObserver(function () {
      const open = modal.classList.contains("open") ||
                   modal.style.display === "flex" || modal.style.display === "block";
      const stillSpace = modal.className.indexOf("toni-theme-active-space") >= 0;
      if (!open || !stillSpace) disableFullscreen();
    });
    _obs.observe(modal, { attributes: true, attributeFilter: ["class", "style"] });
  }

  /* ---- Erde (SVG): farbenfroh, drehende Kontinente + Wolken ---- */
  function earthSVG() {
    return `<svg viewBox="0 0 260 260" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<defs>` +
        `<radialGradient id="toniEarthOcean" cx="38%" cy="32%" r="75%">` +
          `<stop offset="0" stop-color="#6FC6FF"/>` +
          `<stop offset="45%" stop-color="#2E7DE0"/>` +
          `<stop offset="100%" stop-color="#0B2F73"/>` +
        `</radialGradient>` +
        `<radialGradient id="toniEarthGlow" cx="50%" cy="50%" r="50%">` +
          `<stop offset="78%" stop-color="rgba(120,200,255,0)"/>` +
          `<stop offset="92%" stop-color="rgba(120,200,255,.5)"/>` +
          `<stop offset="100%" stop-color="rgba(120,200,255,0)"/>` +
        `</radialGradient>` +
        `<radialGradient id="toniEarthShade" cx="62%" cy="60%" r="68%">` +
          `<stop offset="60%" stop-color="rgba(0,0,0,0)"/>` +
          `<stop offset="100%" stop-color="rgba(0,6,30,.55)"/>` +
        `</radialGradient>` +
        `<clipPath id="toniEarthClip"><circle cx="130" cy="130" r="98"/></clipPath>` +
      `</defs>` +
      // Atmosphäre
      `<circle cx="130" cy="130" r="112" fill="url(#toniEarthGlow)"/>` +
      // Ozean
      `<circle cx="130" cy="130" r="98" fill="url(#toniEarthOcean)"/>` +
      // drehende Kontinente
      `<g clip-path="url(#toniEarthClip)">` +
        `<g class="earth-spin">` +
          `<path d="M40,96 q24,-22 52,-14 q20,6 14,26 q-8,24 -34,22 q-30,-2 -38,-18 q-6,-12 6,-16 z" fill="#3DB36B" opacity="0.95"/>` +
          `<path d="M120,70 q30,-6 44,12 q12,16 -4,30 q-22,16 -44,4 q-18,-12 -10,-30 q6,-14 14,-16 z" fill="#48C46E"/>` +
          `<path d="M150,150 q28,-8 40,12 q10,20 -10,34 q-26,16 -44,-2 q-14,-16 -2,-34 q6,-16 16,-10 z" fill="#36A862"/>` +
          `<path d="M62,168 q22,-12 40,2 q12,12 0,26 q-18,18 -40,8 q-16,-10 -10,-24 q4,-10 10,-12 z" fill="#41BE6A"/>` +
          `<circle cx="92" cy="120" r="6" fill="#2E944F"/>` +
          `<circle cx="176" cy="96" r="5" fill="#2E944F"/>` +
          // Eiskappen
          `<ellipse cx="130" cy="36" rx="40" ry="14" fill="#EAF6FF" opacity="0.85"/>` +
          `<ellipse cx="130" cy="224" rx="46" ry="16" fill="#EAF6FF" opacity="0.8"/>` +
        `</g>` +
        // gegenläufige Wolkenschicht
        `<g class="earth-clouds" opacity="0.55">` +
          `<ellipse cx="80" cy="84" rx="34" ry="12" fill="#ffffff"/>` +
          `<ellipse cx="170" cy="120" rx="40" ry="13" fill="#ffffff"/>` +
          `<ellipse cx="110" cy="178" rx="36" ry="12" fill="#ffffff"/>` +
          `<ellipse cx="200" cy="170" rx="22" ry="9" fill="#ffffff"/>` +
        `</g>` +
        // Schattierung für Plastizität
        `<circle cx="130" cy="130" r="98" fill="url(#toniEarthShade)"/>` +
      `</g>` +
      // Rand-Glanz
      `<circle cx="130" cy="130" r="98" fill="none" stroke="rgba(180,225,255,.5)" stroke-width="1.5"/>` +
    `</svg>`;
  }

  /* ---- Cockpit (SVG): Rahmen, Streben, Konsole ---- */
  function cockpitSVG() {
    return `<svg class="toni-space__cockpit-svg" viewBox="0 0 1000 560" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
      `<defs>` +
        `<linearGradient id="toniCockMetal" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="0" stop-color="#2A3566"/><stop offset="0.5" stop-color="#1A2350"/>` +
          `<stop offset="1" stop-color="#0E1638"/>` +
        `</linearGradient>` +
        `<linearGradient id="toniCockEdge" x1="0" y1="0" x2="0" y2="1">` +
          `<stop offset="0" stop-color="#6E86D6"/><stop offset="1" stop-color="#2C3A78"/>` +
        `</linearGradient>` +
      `</defs>` +
      // Fensterrahmen oben (Bogen) – rahmt den Blick ins All
      `<path d="M0,0 H1000 V84 Q500,-24 0,84 Z" fill="url(#toniCockMetal)"/>` +
      `<path d="M0,84 Q500,-24 1000,84" fill="none" stroke="url(#toniCockEdge)" stroke-width="5" opacity="0.9"/>` +
      // seitliche Streben (breiter, opak)
      `<path d="M0,0 V560 H150 Q78,300 138,84 Q70,30 0,46 Z" fill="url(#toniCockMetal)"/>` +
      `<path d="M1000,0 V560 H850 Q922,300 862,84 Q930,30 1000,46 Z" fill="url(#toniCockMetal)"/>` +
      `<path d="M150,560 Q78,300 138,84" fill="none" stroke="url(#toniCockEdge)" stroke-width="4" opacity="0.85"/>` +
      `<path d="M850,560 Q922,300 862,84" fill="none" stroke="url(#toniCockEdge)" stroke-width="4" opacity="0.85"/>` +
      // Konsole unten (Dashboard)
      `<path d="M0,560 V456 Q500,384 1000,456 V560 Z" fill="url(#toniCockMetal)"/>` +
      `<path d="M0,456 Q500,384 1000,456" fill="none" stroke="url(#toniCockEdge)" stroke-width="5" opacity="0.9"/>` +
      // Konsolen-Lichter
      `<g opacity="0.9">` +
        `<circle cx="150" cy="512" r="7" fill="#3DDC97"/>` +
        `<circle cx="185" cy="512" r="7" fill="#FFC857"/>` +
        `<circle cx="220" cy="512" r="7" fill="#4DA6FF"/>` +
        `<rect x="800" y="505" width="60" height="8" rx="4" fill="#4DA6FF" opacity="0.8"/>` +
        `<rect x="800" y="520" width="44" height="8" rx="4" fill="#3DDC97" opacity="0.8"/>` +
      `</g>` +
      // Nieten am Rahmen
      `<g fill="#7F93D8" opacity="0.7">` +
        `<circle cx="60" cy="120" r="3"/><circle cx="60" cy="200" r="3"/><circle cx="60" cy="280" r="3"/>` +
        `<circle cx="60" cy="360" r="3"/><circle cx="60" cy="440" r="3"/>` +
        `<circle cx="940" cy="120" r="3"/><circle cx="940" cy="200" r="3"/><circle cx="940" cy="280" r="3"/>` +
        `<circle cx="940" cy="360" r="3"/><circle cx="940" cy="440" r="3"/>` +
      `</g>` +
    `</svg>`;
  }

  /* ----------------------------------------------------------
   * RENDER
   * -------------------------------------------------------- */
  function renderStations(journey) {
    injectStyles();
    enableFullscreen();
    _journey = journey;

    const steps = (journey && journey.steps) || [];
    const n = steps.length;
    if (n === 0) {
      return `<div class="toni-space">` +
             `<div class="toni-space__stars"></div>` +
             `<div class="toni-space__empty">Diese Lernreise hat noch keine Stationen.</div>` +
             `</div>`;
    }

    const states = steps.map((s, i) => stationStatus(s, i, journey));
    const doneCount = states.filter(x => x === "done").length;
    const prog = Math.round(doneCount / n * 100);

    // statische Sterne
    let starsHTML = "";
    const starCount = Math.min(440, 220 + n * 18);
    for (let i = 0; i < starCount; i++) {
      const sz = (Math.random() * 2.6 + 1.4).toFixed(1);
      const op = (Math.random() * 0.7 + 0.3).toFixed(2);
      starsHTML += `<i style="left:${(Math.random() * 100).toFixed(1)}%;` +
                   `top:${(Math.random() * 100).toFixed(1)}%;` +
                   `width:${sz}px;height:${sz}px;opacity:${op}"></i>`;
    }
    // rotierende Sterne
    let spinStarsHTML = "";
    const spinCount = Math.min(280, 140 + n * 12);
    for (let i = 0; i < spinCount; i++) {
      const sz = (Math.random() * 2.4 + 1.2).toFixed(1);
      const op = (Math.random() * 0.6 + 0.3).toFixed(2);
      spinStarsHTML += `<i style="left:${(Math.random() * 100).toFixed(1)}%;` +
                       `top:${(Math.random() * 100).toFixed(1)}%;` +
                       `width:${sz}px;height:${sz}px;opacity:${op}"></i>`;
    }

    // Stations-Kacheln
    let tilesHTML = "";
    for (let i = 0; i < n; i++) {
      const s = steps[i];
      const st = states[i];
      const tasks = s.tasks || [];
      const dots = tasks.slice(0, 6).map(function (t) {
        const c = TYPE_COLOR[normType(t.type)] || "#9FB0D9";
        return `<span style="background:${c}"></span>`;
      }).join("");

      const badge = st === "done" ? ICON.check : st === "locked" ? ICON.lock : (i + 1);
      const stateLabel = st === "done" ? "Erledigt" : st === "locked" ? "Gesperrt" : "Dran";

      const interactive = st !== "locked";
      const handlers = interactive
        ? `role="button" tabindex="0" ` +
          `onclick="toniSpaceSelectStation(${i})" ` +
          `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toniSpaceSelectStation(${i});}"`
        : `aria-disabled="true"`;

      tilesHTML +=
        `<div class="toni-space__tile ${st}" data-step-index="${i}" ${handlers}>` +
          `<div class="toni-space__tile-top">` +
            `<span class="toni-space__tile-badge">${badge}</span>` +
            `<span class="toni-space__tile-title">${esc(s.title)}</span>` +
          `</div>` +
          `<div class="toni-space__tile-meta">` +
            `<span class="toni-space__tile-state">${stateLabel}</span>` +
            (dots ? `<span class="toni-space__tile-dots">${dots}</span>` : `<span></span>`) +
          `</div>` +
        `</div>`;
    }

    return `<div class="toni-space">` +
             `<div class="toni-space__starspin">${spinStarsHTML}</div>` +
             `<div class="toni-space__stars">${starsHTML}</div>` +
             `<div class="toni-space__earth">${earthSVG()}</div>` +
             `<div class="toni-space__shooting"></div>` +
             `<div class="toni-space__shooting s2"></div>` +
             `<div class="toni-space__stage">` +
               `<div class="toni-space__cockpit">` +
                 cockpitSVG() +
                 `<div class="toni-space__slogan">Lernreise · Bordcomputer</div>` +
                 `<div class="toni-space__screen">` +
                   `<div class="toni-space__screen-head">` +
                     `<span><span class="dot"></span>NAVIGATIONS-DISPLAY</span>` +
                     `<span class="toni-space__screen-prog">${prog}% · ${doneCount}/${n} Stationen</span>` +
                   `</div>` +
                   `<div class="toni-space__tiles">${tilesHTML}</div>` +
                 `</div>` +
               `</div>` +
             `</div>` +
             `<div class="toni-space__dock"></div>` +
           `</div>`;
  }

  window.toniThemes.register({
    id: "space",
    label: "Weltall",
    description: "Cockpit-Ansicht im Vollbild: Stationen als Kacheln auf dem Bordcomputer-Bildschirm, rotierende Sterne und eine drehende Erde im Hintergrund. Aufgaben erscheinen im Dock unten.",
    renderStations: renderStations,
    renderPreview: function () {
      let stars = "";
      for (let i = 0; i < 20; i++) {
        stars += '<circle cx="' + (Math.random() * 160).toFixed(0) + '" cy="' +
                 (Math.random() * 100).toFixed(0) + '" r="' + (Math.random() * 1.2 + 0.5).toFixed(1) +
                 '" fill="#fff" opacity="' + (Math.random() * 0.6 + 0.3).toFixed(2) + '"/>';
      }
      return '<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">' +
        '<defs>' +
          '<radialGradient id="spEarth" cx="40%" cy="35%" r="75%">' +
            '<stop offset="0" stop-color="#6FC6FF"/><stop offset="55%" stop-color="#2E7DE0"/>' +
            '<stop offset="100%" stop-color="#0B2F73"/></radialGradient>' +
        '</defs>' +
        '<rect width="160" height="100" rx="10" fill="#070A1C"/>' +
        stars +
        // Erde oben
        '<circle cx="80" cy="30" r="22" fill="url(#spEarth)"/>' +
        '<path d="M64,28 q10,-8 20,-2 q8,6 -2,12 q-12,6 -20,-2 q-4,-6 2,-8 z" fill="#41BE6A" opacity="0.9"/>' +
        // Cockpit-Bildschirm
        '<rect x="40" y="58" width="80" height="34" rx="6" fill="#0A1230" stroke="#5A8AE0" stroke-width="2"/>' +
        '<rect x="48" y="66" width="20" height="18" rx="3" fill="#2E6B52"/>' +
        '<rect x="70" y="66" width="20" height="18" rx="3" fill="#E0A020"/>' +
        '<rect x="92" y="66" width="20" height="18" rx="3" fill="#23314f"/>' +
        // Konsole unten
        '<path d="M20,100 V92 Q80,84 140,92 V100 Z" fill="#1A2350"/>' +
        '</svg>';
    }
  });

  console.info("[TONI-Theme:space] Weltall-Cockpit-Theme registriert (theme-space-v10-cockpit).");
})();
