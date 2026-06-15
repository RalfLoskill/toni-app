/* ============================================================
 * TONI – Lernreisen-Theme: "Weltall / Sternenroute"
 * Datei: journey_theme_space.js
 * Build: theme-space-v4-cleanup
 *
 * STUFE 1+ : Erweitertes Weltall-Theme.
 *  - Stationen als grosse Planeten auf einer automatisch berechneten
 *    Flugbahn (Start unten, Ziel = Heimatstern oben).
 *  - Die AUFGABEN einer Station sitzen als anklickbare MONDE in einem
 *    Orbit um den Planeten. Sie fächern erst nach Klick auf den Planeten
 *    auf; ein erneuter Klick (oder Klick auf einen anderen Planeten)
 *    schliesst sie. Klick auf einen Mond öffnet die Aufgabe über den
 *    bestehenden Mechanismus window.openLearningTask(id).
 *  - Bei aktivem Weltall-Theme läuft die Lernreise im VOLLBILD
 *    (100vw/100vh) – ausschliesslich für Space-Reisen.
 *  - Das Aufgaben-Detail (lr-task-modal) bekommt einen vollen
 *    Weltraum-Look inkl. Buttons/Feldern. Der eigentliche Inhaltstext
 *    bleibt gut lesbar – wir thematisieren die Hülle und färben die
 *    Bedien-Elemente über CSS-Variablen-Overrides, OHNE die fünf
 *    Inhalts-Renderer in journey.js anzufassen.
 *
 * Andocken an TONI:
 *  - Planet-Klick -> toniSpaceToggleStation(i) (lokal): wählt Station via
 *    window.toniTimelineSelect(i) und fächert die Monde auf.
 *  - Mond-Klick   -> window.openLearningTask(task.id) (bestehend).
 *  - Status der Station kommt aus window.stepStatus().
 *
 * Stufe 4 (lebhafte Animationen, prefers-reduced-motion-Abschaltung)
 * bleibt späteren Schritten vorbehalten; Bewegungen hier sind dezent.
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
    video: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3z"/></svg>'
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

  /* ----------------------------------------------------------
   * AUTOMATISCHES LAYOUT
   * -------------------------------------------------------- */
  const VW = 1000;
  const MARGIN_X = 300;
  const STEP_GAP = 215;
  const PAD_TOP = 170;
  const PAD_BOTTOM = 160;

  function computeLayout(n) {
    const vh = PAD_TOP + PAD_BOTTOM + Math.max(1, n - 1) * STEP_GAP;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const y = vh - PAD_BOTTOM - i * STEP_GAP;
      const phase = Math.sin(i * 1.15 + 0.4);
      const x = VW / 2 + phase * MARGIN_X;
      pts.push({ x: Math.round(x), y: Math.round(y) });
    }
    const start = { x: VW / 2 - MARGIN_X * 0.5, y: vh - 40 };
    const goal = { x: VW / 2, y: PAD_TOP - 40 };
    return { vw: VW, vh: vh, pts: pts, start: start, goal: goal };
  }

  function spline(pts) {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2] || pts[i + 1];
      d += ` C ${p1.x + (p2.x - p0.x) / 6} ${p1.y + (p2.y - p0.y) / 6}, ` +
           `${p2.x - (p3.x - p1.x) / 6} ${p2.y - (p3.y - p1.y) / 6}, ${p2.x} ${p2.y}`;
    }
    return d;
  }

  /* ----------------------------------------------------------
   * INTERAKTION: Station an-/auswählen + Monde auffächern
   * -------------------------------------------------------- */
  window.toniSpaceToggleStation = function (index) {
    const root = document.querySelector(".toni-space");
    if (!root) return;
    const planet = root.querySelector('.toni-space__planet[data-step-index="' + index + '"]');
    if (!planet || planet.classList.contains("locked")) return;

    const already = planet.classList.contains("expanded");
    root.querySelectorAll(".toni-space__planet.expanded").forEach(function (p) {
      p.classList.remove("expanded");
    });
    if (!already) {
      planet.classList.add("expanded");
    }
    if (typeof window.toniTimelineSelect === "function") {
      try { window.toniTimelineSelect(index); } catch (e) { /* nicht kritisch */ }
    }
  };

  /* ----------------------------------------------------------
   * CSS (einmalig injizieren)
   * -------------------------------------------------------- */
  function injectStyles() {
    if (document.getElementById("toni-theme-space-css")) return;
    const css = `
.toni-space{position:relative;width:100%;min-height:100%;border-radius:16px;overflow:hidden;
  background:radial-gradient(120% 80% at 80% 8%,rgba(124,92,255,.28),transparent 55%),
             radial-gradient(110% 70% at 12% 78%,rgba(51,214,224,.20),transparent 50%),
             linear-gradient(180deg,#0C1024 0%,#10163A 100%);}
.toni-space__stars{position:absolute;inset:0;z-index:0;pointer-events:none;}
.toni-space__stars i{position:absolute;background:#fff;border-radius:50%;opacity:.7;}
.toni-space__voyage{position:relative;z-index:2;width:100%;display:block;}
.toni-space__voyage svg{display:block;width:100%;height:auto;}

.toni-space__planet{position:absolute;transform:translate(-50%,-50%);cursor:pointer;z-index:5;
  width:0;display:flex;flex-direction:column;align-items:center;text-align:center;}
.toni-space__planet:focus-visible{outline:none;}
.toni-space__planet:focus-visible .toni-space__orb{outline:3px solid #FFC857;outline-offset:4px;}
.toni-space__label{position:absolute;top:52px;width:172px;left:50%;transform:translateX(-50%);
  display:flex;flex-direction:column;align-items:center;pointer-events:none;}
.toni-space__pname{margin-top:2px;font-size:13px;font-weight:650;color:#EAF0FF;line-height:1.25;
  text-shadow:0 1px 4px rgba(0,0,0,.7),0 0 8px rgba(12,16,36,.8);
  background:rgba(12,16,36,.35);padding:2px 8px;border-radius:8px;
  max-width:100%;word-wrap:break-word;}
.toni-space__orb{width:80px;height:80px;border-radius:50%;position:relative;display:grid;place-items:center;
  background:radial-gradient(circle at 32% 28%,#2A335E,#161B3C);
  box-shadow:0 0 0 3px rgba(255,255,255,.06),0 6px 20px rgba(0,0,0,.5);color:#fff;
  transition:transform .18s ease, box-shadow .18s ease;}
.toni-space__planet:hover .toni-space__orb{transform:scale(1.05);}
.toni-space__planet.done .toni-space__orb{background:radial-gradient(circle at 32% 28%,#2E6B52,#16402F);}
.toni-space__planet.current .toni-space__orb{background:radial-gradient(circle at 32% 28%,#3a4a86,#1c2550);
  box-shadow:0 0 0 4px rgba(255,200,87,.25),0 0 28px rgba(255,200,87,.45);}
.toni-space__planet.locked{opacity:.42;cursor:default;}
.toni-space__planet.expanded .toni-space__orb{box-shadow:0 0 0 4px rgba(77,166,255,.35),0 0 34px rgba(77,166,255,.5);}
.toni-space__ico{width:34px;height:34px;display:block;}
.toni-space__halo{position:absolute;width:80px;height:80px;border-radius:50%;
  border:2px solid #FFC857;opacity:.55;animation:toniSpacePulse 2.4s ease-out infinite;}
@keyframes toniSpacePulse{0%{transform:scale(.85);opacity:.7}100%{transform:scale(1.7);opacity:0}}
.toni-space__tick{position:absolute;right:-2px;top:-2px;width:22px;height:22px;border-radius:50%;
  background:#3DDC97;color:#0C1024;display:grid;place-items:center;}
.toni-space__tick svg{width:14px;height:14px;}

.toni-space__dots{margin-top:6px;display:flex;gap:3px;justify-content:center;flex-wrap:wrap;
  transition:opacity .18s ease;}
.toni-space__dots span{width:7px;height:7px;border-radius:50%;display:inline-block;}
.toni-space__planet.expanded .toni-space__dots{opacity:0;}

.toni-space__orbit{position:absolute;left:50%;top:50%;width:0;height:0;z-index:4;pointer-events:none;}
.toni-space__orbitring{position:absolute;left:50%;top:50%;border-radius:50%;
  border:1px dashed rgba(180,200,255,.28);transform:translate(-50%,-50%);
  opacity:0;transition:opacity .25s ease;}
.toni-space__planet.expanded .toni-space__orbitring{opacity:1;}
.toni-space__moon{position:absolute;left:50%;top:50%;width:44px;height:44px;border-radius:50%;
  transform:translate(-50%,-50%) scale(.2);opacity:0;pointer-events:none;
  display:grid;place-items:center;cursor:pointer;color:#0C1024;
  box-shadow:0 3px 10px rgba(0,0,0,.45);
  transition:transform .26s cubic-bezier(.34,1.4,.5,1),opacity .2s ease;}
.toni-space__planet.expanded .toni-space__moon{opacity:1;pointer-events:auto;}
.toni-space__moon svg{width:20px;height:20px;}
.toni-space__moon .toni-space__moontick{position:absolute;right:-3px;bottom:-3px;width:16px;height:16px;
  border-radius:50%;background:#3DDC97;color:#0C1024;display:grid;place-items:center;border:1.5px solid #10163A;}
.toni-space__moon .toni-space__moontick svg{width:10px;height:10px;}
.toni-space__moon .toni-space__mnum{position:absolute;left:-5px;top:-5px;min-width:17px;height:17px;
  padding:0 3px;border-radius:9px;background:#10163A;color:#FFD98A;border:1.5px solid #FFC857;
  font-size:11px;font-weight:800;line-height:14px;text-align:center;box-sizing:border-box;
  box-shadow:0 1px 4px rgba(0,0,0,.5);}
.toni-space__moon:hover{transform:translate(var(--mx),var(--my)) scale(1.18) !important;z-index:9;}
.toni-space__moon:focus-visible{outline:3px solid #fff;outline-offset:2px;}
.toni-space__moon .toni-space__mlabel{position:absolute;top:48px;left:50%;transform:translateX(-50%);
  white-space:nowrap;font-size:11px;font-weight:600;color:#EAF0FF;background:rgba(12,16,36,.82);
  padding:2px 7px;border-radius:7px;opacity:0;pointer-events:none;transition:opacity .15s ease;
  box-shadow:0 2px 8px rgba(0,0,0,.4);}
.toni-space__moon:hover .toni-space__mlabel,
.toni-space__moon:focus-visible .toni-space__mlabel{opacity:1;}
.toni-space__moon.locked{opacity:.4;cursor:default;filter:grayscale(.5);}

.toni-space__dest{position:absolute;transform:translate(-50%,-50%);z-index:4;text-align:center;
  color:#FFD98A;font-size:13px;font-weight:700;text-shadow:0 1px 6px rgba(0,0,0,.7);}

@media (prefers-reduced-motion: reduce){
  .toni-space__halo{animation:none;}
  .toni-space__moon{transition:opacity .15s ease;}
}

/* ===== VOLLBILD – nur bei aktivem Weltall-Theme ===== */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space{
  position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;
  max-width:none !important;max-height:none !important;margin:0 !important;border-radius:0 !important;
  z-index:4000 !important;}
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-card,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space > div{
  max-width:none !important;width:100% !important;height:100% !important;border-radius:0 !important;}

.toni-theme-active-space .lr-top-split{
  grid-template-columns:1fr !important;
  grid-template-areas:"stations" "right" !important;}
.toni-theme-active-space .lr-top-split .lr-stations{
  background:transparent !important;padding:0 !important;}

/* --- Aufräumen der Reise-Ansicht im Weltall-Theme --- */
/* Untertitel im Kopf entfernen (nur Titel + Journal/Schließen bleiben). */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space #lr-modal-sub,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-modal-sub{
  display:none !important;}
/* Aufgaben-Kacheln + "Aufgaben der Station"/"neu starten" (rechte Spalte) raus. */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-right-col,
body.toni-space-fullscreen #lr-modal.toni-theme-active-space #lr-right-col{
  display:none !important;}
/* Fortschrittsbalken ausblenden. */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-progress-big{
  display:none !important;}
/* Deckblatt-Kasten zwischen Space und Aufgaben (V89-Cover) entfällt. */
body.toni-space-fullscreen #lr-modal.toni-theme-active-space .lr-cover-screen-v89{
  display:none !important;}

/* z-index-Fix: das Aufgaben-Modal MUSS über dem Vollbild-Reise-Modal (4000)
   liegen, sonst öffnet es sich versteckt dahinter. */
body.toni-space-fullscreen #lr-task-modal.lr-modal-backdrop,
body.toni-space-fullscreen #lr-task-modal{
  z-index:5000 !important;}

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

  /* ----------------------------------------------------------
   * RENDER
   * -------------------------------------------------------- */
  function renderStations(journey) {
    injectStyles();
    enableFullscreen();

    const steps = (journey && journey.steps) || [];
    const n = steps.length;
    if (n === 0) {
      return `<div class="toni-space" style="padding:40px;text-align:center;color:#9FB0D9">` +
             `Diese Lernreise hat noch keine Stationen.</div>`;
    }

    const L = computeLayout(n);
    const states = steps.map((s, i) => stationStatus(s, i, journey));
    const curIdx = states.indexOf("current");

    const allPts = [L.start].concat(L.pts).concat([L.goal]);
    const fullD = spline(allPts);
    const walkedUpto = curIdx >= 0 ? curIdx : (states.lastIndexOf("done"));
    const walkedPts = [L.start].concat(L.pts.slice(0, Math.max(0, walkedUpto + 1)));
    const walkedD = walkedUpto >= 0 ? spline(walkedPts) : "";

    let starsHTML = "";
    const starCount = Math.min(120, 50 + n * 6);
    for (let i = 0; i < starCount; i++) {
      const sz = (Math.random() * 2 + 1).toFixed(1);
      starsHTML += `<i style="left:${(Math.random() * 100).toFixed(1)}%;` +
                   `top:${(Math.random() * 100).toFixed(1)}%;` +
                   `width:${sz}px;height:${sz}px"></i>`;
    }

    const svg =
      `<svg viewBox="0 0 ${L.vw} ${L.vh}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
        `<defs>` +
          `<linearGradient id="toniTrail" x1="0" y1="1" x2="0" y2="0">` +
            `<stop offset="0" stop-color="#FF7A3C"/><stop offset="1" stop-color="#FFC857"/>` +
          `</linearGradient>` +
        `</defs>` +
        `<path d="${fullD}" fill="none" stroke="#46527E" stroke-width="3.5" ` +
          `stroke-linecap="round" stroke-dasharray="1 14" opacity="0.8"/>` +
        (walkedD
          ? `<path d="${walkedD}" fill="none" stroke="url(#toniTrail)" stroke-width="4.5" stroke-linecap="round"/>`
          : "") +
        `<g transform="translate(${L.goal.x},${L.goal.y})">` +
          `<circle r="28" fill="#FFC857" opacity="0.25"/>` +
          `<path d="M0 -24 L7 -8 24 -8 10 3 15 21 0 10 -15 21 -10 3 -24 -8 -7 -8 Z" ` +
            `fill="#FFC857" stroke="#FF9D5C" stroke-width="1.5"/>` +
        `</g>` +
      `</svg>`;

    let planetsHTML = "";
    for (let i = 0; i < n; i++) {
      const s = steps[i];
      const st = states[i];
      const p = L.pts[i];
      const leftPct = (p.x / L.vw * 100).toFixed(2);
      const topPct = (p.y / L.vh * 100).toFixed(2);

      const tasks = (s.tasks || []);

      const typeColorDots = tasks.slice(0, 6).map(function (t) {
        const c = TYPE_COLOR[normType(t.type)] || "#9FB0D9";
        return `<span style="background:${c}"></span>`;
      }).join("");

      const moonCount = tasks.length;
      const orbitR = 78 + Math.min(3, Math.max(0, moonCount - 4)) * 10;
      let moonsHTML = "";
      if (moonCount > 0) {
        moonsHTML += `<div class="toni-space__orbitring" style="width:${orbitR * 2}px;height:${orbitR * 2}px"></div>`;
        for (let m = 0; m < moonCount; m++) {
          const t = tasks[m];
          const tt = normType(t.type);
          const col = TYPE_COLOR[tt] || "#9FB0D9";
          const ang = (-90 + (360 / moonCount) * m) * Math.PI / 180;
          const mx = Math.cos(ang) * orbitR;
          const my = Math.sin(ang) * orbitR;
          const taskDone = t.status === "done";
          const moonLocked = (st === "locked");
          const moonTick = taskDone
            ? `<span class="toni-space__moontick">${ICON.check}</span>` : "";
          const moonHandlers = moonLocked
            ? `aria-disabled="true"`
            : `role="button" tabindex="0" ` +
              `onclick="event.stopPropagation();openLearningTask('${esc(t.id)}')" ` +
              `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openLearningTask('${esc(t.id)}');}"`;
          moonsHTML +=
            `<div class="toni-space__moon ${moonLocked ? "locked" : ""}" ` +
              `style="--mx:${mx.toFixed(1)}px;--my:${my.toFixed(1)}px;` +
              `transform:translate(${mx.toFixed(1)}px,${my.toFixed(1)}px);` +
              `background:radial-gradient(circle at 34% 30%, #ffffff55, ${col});" ` +
              `${moonHandlers}>` +
              `<span class="toni-space__mnum">${m + 1}</span>` +
              typeIcon(tt) + moonTick +
              `<span class="toni-space__mlabel">${m + 1}. ${esc(t.title)}</span>` +
            `</div>`;
        }
      }

      const orbIcon = st === "done" ? ICON.check : st === "locked" ? ICON.lock : ICON.rocket;
      const tick = st === "done" ? `<span class="toni-space__tick">${ICON.check}</span>` : "";
      const halo = st === "current" ? `<span class="toni-space__halo"></span>` : "";

      const interactive = st !== "locked";
      const handlers = interactive
        ? `role="button" tabindex="0" ` +
          `onclick="toniSpaceToggleStation(${i})" ` +
          `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toniSpaceToggleStation(${i});}"`
        : `aria-disabled="true"`;

      planetsHTML +=
        `<div class="toni-space__planet ${st} toni-tl-nav" data-step-index="${i}" ` +
          `style="left:${leftPct}%;top:${topPct}%" ${handlers}>` +
          `<div class="toni-space__orbit">${moonsHTML}</div>` +
          halo +
          `<div class="toni-space__orb"><span class="toni-space__ico">${orbIcon}</span>${tick}</div>` +
          `<div class="toni-space__label">` +
            `<div class="toni-space__pname">${esc(s.title)}</div>` +
            (typeColorDots ? `<div class="toni-space__dots">${typeColorDots}</div>` : "") +
          `</div>` +
        `</div>`;
    }

    const destLeft = (L.goal.x / L.vw * 100).toFixed(2);
    const destTop = ((L.goal.y - 78) / L.vh * 100).toFixed(2);
    const destHTML = `<div class="toni-space__dest" style="left:${destLeft}%;top:${destTop}%">` +
                     `★ Ziel erreicht</div>`;

    return `<div class="toni-space">` +
             `<div class="toni-space__stars">${starsHTML}</div>` +
             `<div class="toni-space__voyage">${svg}${planetsHTML}${destHTML}</div>` +
           `</div>`;
  }

  window.toniThemes.register({
    id: "space",
    label: "Weltall",
    description: "Stationen als Planeten auf einer Flugbahn – Aufgaben als Monde im Orbit, Vollbild.",
    renderStations: renderStations
  });

  console.info("[TONI-Theme:space] Weltall-Theme registriert (theme-space-v4-cleanup).");
})();
