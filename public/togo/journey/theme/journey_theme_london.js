/* ============================================================
 * TONI – Lernreisen-Theme: "London"
 * Datei: journey_theme_london.js
 * Build: theme-london-v3-buttons
 *
 * TECHNISCHE GRUNDLAGE: 1:1 das Muster des Wissenshaus-Themes
 * (theme-haus-v4-dock-moon) – gleiche Engine-Anbindung, gleiches
 * Dock-System (feste Aufgaben-Leiste unten), gleiche Status-/Vollbild-Logik.
 * Nur die KULISSE und die Stations-Darstellung sind London-spezifisch.
 *
 * METAPHER:
 *  - Eine Lernreise ist eine London-Sightseeing-Tour. Jede STATION ist ein
 *    WEGPUNKT (London-Marker) entlang eines Pfades über die Hügel der Stadt.
 *  - Im Hintergrund die ikonische, ANIMIERTE Skyline: Big Ben, London Eye
 *    (dreht sich langsam), rote Telefonzelle, Tower Bridge, Doppeldeckerbus
 *    (fährt ab und zu von links nach rechts), wehende Union-Jack-Flagge,
 *    Sonne, Pastellhimmel, geschwungene Hügel.
 *  - Die AUFGABEN einer Station erscheinen – wie beim Haus – in der festen
 *    Bottom-Leiste ("Dock") nach Klick auf den Wegpunkt. Erledigte Aufgabe
 *    = abgehakt. Erledigter Wegpunkt = Marker leuchtet/gesetzt.
 *  - Vollbild über eigenes Präfix body.toni-london-fullscreen.
 *
 * ANDOCKEN AN TONI (identisch zu haus/football/space):
 *  - Wegpunkt-Klick -> toniLondonToggleStop(i): wählt Station via
 *    window.toniTimelineSelect(i) und spiegelt die Aufgaben ins Dock.
 *  - Aufgabe-Klick -> window.openLearningTask(task.id).
 *  - Status der Station kommt aus window.stepStatus().
 *  - Aufgabentyp wird über window.toniNormalizeType() normalisiert.
 *
 * Robustheit: Fehler/leeres HTML -> Engine fällt auf "classic" zurück.
 * ============================================================ */

(function () {
  "use strict";

  if (!window.toniThemes || typeof window.toniThemes.register !== "function") {
    console.warn("[TONI-Theme:london] Theme-Engine nicht gefunden – London-Theme inaktiv.");
    return;
  }

  /* ---------- Palette (aus dem Referenzbild) ---------- */
  const ACCENT   = "#E8479B";   // London-Pink (Button/Akzent)
  const ROYAL    = "#3FA9F5";   // Eye-/Hügel-Blau
  const DONE_COL = "#FF5E8A";   // erledigt: warmes Pink-Rot

  const TYPE_COLOR = {
    Lerninhalt: "#6FB1FF",
    Aufgabe:    "#FF9B4D",
    Quiz:       "#FFD23D",
    Reflexion:  "#48D6B0",
    Video:      "#C88BFF"
  };

  const ICON = {
    check:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>',
    lock:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    // Wegpunkt-Icon (current): Karten-Pin
    pin:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v12H8l-4 4z"/><path d="M8 9h8M8 13h5"/></svg>',
    task:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
    quiz:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7"/><circle cx="12" cy="17" r=".7" fill="currentColor"/></svg>',
    reflect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a7 7 0 0 0-4 12.7V18h8v-2.3A7 7 0 0 0 12 3z"/><path d="M9 21h6"/></svg>',
    video:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M11 9.5l4 2.5-4 2.5z" fill="currentColor"/></svg>'
  };

  function typeIcon(t) {
    if (t === "Lerninhalt") return ICON.info;
    if (t === "Aufgabe")    return ICON.task;
    if (t === "Quiz")       return ICON.quiz;
    if (t === "Reflexion")  return ICON.reflect;
    if (t === "Video")      return ICON.video;
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
   * INTERAKTION: Wegpunkt wählen + Aufgaben ins Dock spiegeln.
   * (1:1 übernommen vom Haus-Dock-System.)
   * -------------------------------------------------------- */
  window.toniLondonToggleStop = function (index) {
    const root = document.querySelector(".toni-london");
    if (!root) return;
    const stop = root.querySelector('.toni-london__stop[data-step-index="' + index + '"]');
    if (!stop || stop.classList.contains("locked")) return;
    const already = stop.classList.contains("open");
    root.querySelectorAll(".toni-london__stop.open").forEach(function (r) {
      r.classList.remove("open");
    });
    if (already) { toniLondonCloseDock(); return; }
    stop.classList.add("open");

    const dock = document.getElementById("toni-london-dock");
    const dockBody = document.getElementById("toni-london-dock-body");
    const dockTitle = document.getElementById("toni-london-dock-title");
    const src = stop.querySelector(".toni-london__tasks");
    if (dock && dockBody) {
      dockBody.innerHTML = src ? src.innerHTML :
        '<div class="toni-london__dock-empty">Dieser Stopp hat noch keine Aufgaben.</div>';
      if (dockTitle) {
        const label = stop.getAttribute("data-stop-title") || ("Stopp " + (index + 1));
        dockTitle.textContent = label;
      }
      dock.classList.add("open");
    }
    if (typeof window.toniTimelineSelect === "function") {
      try { window.toniTimelineSelect(index); } catch (e) { /* nicht kritisch */ }
    }
  };

  window.toniLondonCloseDock = function () {
    const dock = document.getElementById("toni-london-dock");
    if (dock) dock.classList.remove("open");
    const root = document.querySelector(".toni-london");
    if (root) root.querySelectorAll(".toni-london__stop.open").forEach(function (r) { r.classList.remove("open"); });
  };

  window.toniLondonGotoCurrent = function () {
    const c = document.querySelector(".toni-london__stop.current");
    if (c) c.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /* ---------------------------------------------------------- CSS (Szene) */
  function injectStyles() {
    if (document.getElementById("toni-theme-london-css")) return;
    const css = `
.toni-london{position:relative;width:100%;min-height:100%;overflow:hidden;
  --pink:${ACCENT};--royal:${ROYAL};--done:${DONE_COL};--ink:#16324f;--ink-soft:#3c5a78;
  --card:#ffffff;--line:#dfe8f2;
  background:linear-gradient(160deg,#FCE9DD 0%,#FBE3E8 55%,#F3E6F5 100%);
  font-family:inherit;color:var(--ink);}
.toni-london *{box-sizing:border-box;}

/* Sonne */
.toni-london__sun{position:absolute;top:-60px;right:-40px;width:170px;height:170px;border-radius:50%;
  background:radial-gradient(circle at 50% 50%,#FFE27A,#FFC34D);z-index:0;
  box-shadow:0 0 0 22px rgba(255,226,122,.35);}

/* Skyline-Band (feste animierte Kulisse) */
.toni-london__skyline{position:relative;z-index:1;width:100%;height:300px;}
.toni-london__skyline svg{display:block;width:100%;height:100%;}

/* Drehendes London Eye */
@keyframes toniLondonEye{from{transform:rotate(0)}to{transform:rotate(360deg)}}
.toni-london__eye{transform-box:fill-box;transform-origin:center;
  animation:toniLondonEye 26s linear infinite;}
/* Wehende Flagge */
@keyframes toniLondonFlag{0%,100%{transform:skewY(0) scaleX(1)}25%{transform:skewY(-5deg) scaleX(.97)}
  50%{transform:skewY(3deg) scaleX(1)}75%{transform:skewY(-2deg) scaleX(.98)}}
.toni-london__flag{transform-box:fill-box;transform-origin:left center;
  animation:toniLondonFlag 3.2s ease-in-out infinite;}
/* Fahrender Bus */
@keyframes toniLondonBus{0%{transform:translateX(-220px)}12%{transform:translateX(-220px)}
  55%{transform:translateX(1320px)}100%{transform:translateX(1320px)}}
.toni-london__bus{transform-box:fill-box;animation:toniLondonBus 15s ease-in-out infinite;}
/* Sonne pulsiert dezent */
@keyframes toniLondonSun{0%,100%{opacity:.9}50%{opacity:1}}
.toni-london__sun{animation:toniLondonSun 6s ease-in-out infinite;}

/* ===== Kopf ===== */
.toni-london__head{position:relative;z-index:10;display:flex;align-items:center;gap:13px;
  width:92%;max-width:520px;margin:14px auto 4px;padding:0 2px;}
.toni-london__keybtn{width:46px;height:46px;flex:0 0 46px;border-radius:13px;cursor:pointer;
  background:#fff;border:2px solid var(--royal);display:grid;place-items:center;color:var(--royal);
  box-shadow:0 4px 14px rgba(63,169,245,.25);transition:transform .12s ease;}
.toni-london__keybtn:active{transform:scale(.95);}
.toni-london__keybtn svg{width:23px;height:23px;}
.toni-london__htext .tk{font-size:10px;font-weight:850;letter-spacing:.14em;text-transform:uppercase;color:var(--pink);}
.toni-london__htext .tn{font-size:16px;font-weight:850;line-height:1.1;margin-top:2px;color:var(--ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* Slogan-Band */
.toni-london__slogan{position:relative;z-index:6;width:92%;max-width:520px;margin:2px auto 0;
  font-size:11px;font-weight:850;letter-spacing:.22em;color:var(--ink);opacity:.7;}

/* ===== Wegpunkte (Stationen) ===== */
.toni-london__route{position:relative;z-index:3;width:92%;max-width:520px;margin:10px auto 0;
  display:flex;flex-direction:column;gap:14px;padding-bottom:150px;}
.toni-london__stop{position:relative;display:flex;align-items:center;gap:14px;cursor:pointer;
  background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;
  box-shadow:0 6px 18px rgba(22,50,79,.08);transition:transform .16s ease,box-shadow .3s ease,border-color .3s ease;}
.toni-london__stop:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(22,50,79,.14);}
.toni-london__stop:focus-visible{outline:3px solid var(--royal);outline-offset:3px;}
/* Marker (Pin in Kreis) */
.toni-london__marker{position:relative;flex:0 0 56px;width:56px;height:56px;border-radius:16px;
  display:grid;place-items:center;color:#fff;background:linear-gradient(160deg,var(--royal),#7B5BE0);
  box-shadow:0 6px 16px rgba(63,169,245,.35);}
.toni-london__marker svg{width:28px;height:28px;}
.toni-london__num{position:absolute;top:-6px;left:-6px;width:22px;height:22px;border-radius:50%;
  background:#fff;color:var(--ink);font-size:11px;font-weight:850;display:grid;place-items:center;
  box-shadow:0 2px 6px rgba(0,0,0,.18);}
.toni-london__body{flex:1;min-width:0;}
.toni-london__name{font-size:15px;font-weight:850;line-height:1.18;color:var(--ink);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.toni-london__chip{display:inline-flex;align-items:center;gap:5px;margin-top:6px;font-size:10px;
  font-weight:800;padding:3px 9px;border-radius:20px;background:#f1f5fb;color:var(--ink-soft);}
.toni-london__chev{flex:0 0 auto;color:#9fb3c8;font-size:18px;font-weight:800;}

/* Verbindungslinie zwischen Stopps (gestrichelte Route) */
.toni-london__stop::before{content:"";position:absolute;left:39px;top:-14px;height:14px;width:0;
  border-left:3px dashed #c7d6e6;}
.toni-london__stop:first-child::before{display:none;}

/* ZUSTAND done */
.toni-london__stop.done .toni-london__marker{background:linear-gradient(160deg,var(--done),#FF9A4D);
  box-shadow:0 6px 18px rgba(255,94,138,.4);}
.toni-london__stop.done{border-color:#FFD0DE;}
/* ZUSTAND current */
.toni-london__stop.current{border-color:var(--royal);box-shadow:0 0 0 3px rgba(63,169,245,.18),0 10px 26px rgba(22,50,79,.14);}
.toni-london__stop.current .toni-london__marker{animation:toniLondonBob 2s ease-in-out infinite;}
@keyframes toniLondonBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
/* ZUSTAND locked */
.toni-london__stop.locked{cursor:default;opacity:.7;}
.toni-london__stop.locked .toni-london__marker{background:#c2cdd9;color:#fff;box-shadow:none;}

/* versteckte Aufgaben-Quelle (wird ins Dock gespiegelt) */
.toni-london__tasks{display:none;}

/* ===== Dock (feste Aufgaben-Leiste unten) – Muster aus Haus ===== */
.toni-london__dock{position:fixed;left:0;right:0;bottom:0;z-index:4600;
  max-width:560px;margin:0 auto;background:#fff;border:1px solid var(--line);
  border-bottom:none;border-radius:20px 20px 0 0;box-shadow:0 -12px 40px rgba(22,50,79,.18);
  transform:translateY(110%);transition:transform .34s cubic-bezier(.22,1,.36,1);
  padding:8px 16px 18px;}
.toni-london__dock.open{transform:translateY(0);}
.toni-london__dock-head{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:6px 2px 10px;}
.toni-london__dock-title{font-size:15px;font-weight:850;color:var(--ink);}
.toni-london__dock-close{border:none;background:#f1f5fb;color:var(--ink);border-radius:9px;
  padding:7px 12px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;}
.toni-london__dock-close:hover{background:#e3ebf5;}
.toni-london__dock-body{display:flex;flex-wrap:wrap;gap:9px;max-height:42vh;overflow-y:auto;}
.toni-london__dock-empty{color:var(--ink-soft);font-size:13px;padding:6px 2px 10px;}

/* Aufgaben-Karten (Tasks) */
.toni-london__task{position:relative;display:flex;align-items:center;gap:10px;cursor:pointer;
  padding:10px 13px;border-radius:13px;background:#fff;border:1px solid var(--line);
  min-width:150px;transition:transform .1s ease,border-color .2s ease,box-shadow .2s ease;}
.toni-london__task:hover{transform:translateY(-2px);border-color:var(--royal);box-shadow:0 6px 16px rgba(63,169,245,.18);}
.toni-london__task:focus-visible{outline:3px solid var(--royal);outline-offset:2px;}
.toni-london__task.locked{cursor:default;opacity:.5;}
.toni-london__task.locked:hover{transform:none;border-color:var(--line);box-shadow:none;}
.toni-london__tico{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;
  background:#f1f5fb;color:var(--cc,#6FB1FF);border:1px solid color-mix(in srgb,var(--cc,#888) 35%,transparent);}
.toni-london__tico svg{width:19px;height:19px;}
.toni-london__tmeta{min-width:0;}
.toni-london__tlabel{font-size:12px;font-weight:800;line-height:1.15;color:var(--ink);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.toni-london__ttype{font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;
  color:#9fb3c8;margin-top:1px;}
.toni-london__task.done .toni-london__tico{background:var(--done);color:#fff;border-color:var(--done);}
.toni-london__tnum{font-size:9px;font-weight:850;color:#9fb3c8;}

@media (prefers-reduced-motion: reduce){
  .toni-london *{animation:none !important;}
  .toni-london__bus{transform:translateX(480px);}
}
`;
    const el = document.createElement("style");
    el.id = "toni-theme-london-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------------------------------------------------------- Fullscreen-CSS
   * Gegated über body.toni-london-fullscreen (eigenes Präfix). Struktur 1:1
   * vom Haus-Theme übernommen, nur die Klassennamen sind london-spezifisch.
   * -------------------------------------------------------- */
  function injectFullscreenStyles() {
    if (document.getElementById("toni-theme-london-fs-css")) return;
    const css = `
body.toni-london-fullscreen{overflow:hidden !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london.lr-modal-backdrop,
body.toni-london-fullscreen #lr-modal.toni-theme-active-london{
  position:fixed !important;inset:0 !important;z-index:4000 !important;
  padding:0 !important;margin:0 !important;background:#FBE3E8 !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-modal,
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-modal-card,
body.toni-london-fullscreen #lr-modal.toni-theme-active-london > div{
  width:100vw !important;max-width:100vw !important;height:100vh !important;max-height:100vh !important;
  border-radius:0 !important;margin:0 !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-modal-body{
  padding:0 !important;height:100% !important;overflow-y:auto !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-detail-grid,
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-main-card{
  display:block !important;width:100% !important;max-width:100% !important;
  margin:0 !important;padding:0 !important;background:transparent !important;
  border:none !important;box-shadow:none !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .toni-london{min-height:100vh;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-stations{
  padding:0 !important;margin:0 !important;}
.toni-theme-active-london .lr-top-split{grid-template-columns:1fr !important;grid-template-areas:"stations" "right" !important;display:block !important;}
.toni-theme-active-london .lr-top-split .lr-stations{background:transparent !important;padding:0 !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .card-header{display:none !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-modal-title{display:none !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-modal-header{
  position:fixed !important;top:0 !important;right:0 !important;left:auto !important;
  background:transparent !important;border:none !important;box-shadow:none !important;
  padding:10px !important;z-index:4500 !important;width:auto !important;
  display:flex !important;justify-content:flex-end !important;align-items:center !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-modal-actions{
  gap:8px !important;display:flex !important;flex-direction:row !important;
  align-items:center !important;flex-wrap:nowrap !important;width:auto !important;position:static !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-modal-actions button{
  flex:0 0 auto !important;position:static !important;margin:0 !important;
  background:#fff !important;border:2px solid ${ROYAL} !important;color:${ROYAL} !important;backdrop-filter:blur(4px);}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-modal-actions button[onclick*="startNextLearningTask"]{display:none !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london #lr-modal-sub,
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-modal-sub{display:none !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-right-col,
body.toni-london-fullscreen #lr-modal.toni-theme-active-london #lr-right-col{display:none !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-progress-big{display:none !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-cover-screen-v89{display:none !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-close-btn{
  position:fixed !important;top:14px;right:14px;z-index:4700 !important;
  background:#fff !important;border:2px solid ${ACCENT} !important;color:${ACCENT} !important;}
body.toni-london-fullscreen #lr-modal.toni-theme-active-london .lr-close-btn:hover{background:#fff0f6 !important;}

/* Aufgaben-Detail im London-Look */
body.toni-london-fullscreen #lr-task-modal.lr-modal-backdrop,
body.toni-london-fullscreen #lr-task-modal{z-index:5000 !important;}
body.toni-london-fullscreen #lr-task-modal .lr-modal,
body.toni-london-fullscreen #lr-task-modal .lr-modal-card,
body.toni-london-fullscreen #lr-task-modal > div{
  border:1px solid #dfe8f2 !important;}
`;
    const el = document.createElement("style");
    el.id = "toni-theme-london-fs-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------------------------------------------------------- Skyline-SVG
   * Feste, animierte Kulisse (Big Ben, Eye, Telefonzelle, Tower Bridge,
   * Bus, Flagge, Hügel). viewBox 1220x300; skaliert auf die volle Breite.
   * -------------------------------------------------------- */
  function skylineSVG() {
    return '' +
'<svg viewBox="0 0 1220 300" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax slice">' +
  '<defs>' +
    '<linearGradient id="lonBen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD24A"/><stop offset="0.5" stop-color="#FF9A4D"/><stop offset="1" stop-color="#FF5E8A"/></linearGradient>' +
    '<linearGradient id="lonTower" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FA9F5"/><stop offset="1" stop-color="#7B5BE0"/></linearGradient>' +
    '<linearGradient id="lonEye" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5BC0F8"/><stop offset="1" stop-color="#3F8FE0"/></linearGradient>' +
    '<linearGradient id="lonHill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4FC3F7"/><stop offset="1" stop-color="#3FA0E8"/></linearGradient>' +
    '<linearGradient id="lonHill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6FD0F9"/><stop offset="1" stop-color="#4FB4F2"/></linearGradient>' +
    '<linearGradient id="lonBus" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF5A5A"/><stop offset="1" stop-color="#E23030"/></linearGradient>' +
    '<linearGradient id="lonBox" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF5A5A"/><stop offset="1" stop-color="#D62828"/></linearGradient>' +
    '<clipPath id="lonFlagClip"><rect x="150" y="20" width="96" height="58" rx="3"/></clipPath>' +
  '</defs>' +
  // Hügel
  '<path d="M0,200 Q300,150 620,185 T1220,175 L1220,300 L0,300 Z" fill="url(#lonHill2)"/>' +
  '<path d="M0,235 Q360,190 760,220 T1220,214 L1220,300 L0,300 Z" fill="url(#lonHill1)"/>' +
  // weiße Wölkchen
  '<ellipse cx="210" cy="170" rx="80" ry="34" fill="#fff" opacity="0.5"/>' +
  '<ellipse cx="1010" cy="172" rx="84" ry="34" fill="#fff" opacity="0.5"/>' +
  // Big Ben
  '<polygon points="100,30 70,84 130,84" fill="url(#lonBen)"/>' +
  '<rect x="70" y="82" width="60" height="46" rx="6" fill="url(#lonBen)"/>' +
  '<circle cx="100" cy="120" r="14" fill="#fff"/><line x1="100" y1="120" x2="108" y2="111" stroke="#333" stroke-width="3"/>' +
  '<rect x="66" y="128" width="68" height="54" rx="6" fill="url(#lonBen)"/>' +
  '<circle cx="100" cy="160" r="14" fill="#fff"/><line x1="100" y1="160" x2="108" y2="151" stroke="#333" stroke-width="3"/>' +
  '<rect x="60" y="182" width="80" height="40" rx="4" fill="url(#lonBen)"/>' +
  // Union Jack (Mast + wehende Flagge)
  '<line x1="150" y1="14" x2="150" y2="150" stroke="#9aa3ad" stroke-width="4"/>' +
  '<circle cx="150" cy="14" r="5" fill="#FFD24A"/>' +
  '<g class="toni-london__flag">' +
    '<g clip-path="url(#lonFlagClip)">' +
      '<rect x="150" y="20" width="96" height="58" fill="#0A2A66"/>' +
      '<line x1="150" y1="20" x2="246" y2="78" stroke="#fff" stroke-width="12"/>' +
      '<line x1="246" y1="20" x2="150" y2="78" stroke="#fff" stroke-width="12"/>' +
      '<line x1="150" y1="20" x2="246" y2="78" stroke="#CF142B" stroke-width="6"/>' +
      '<line x1="246" y1="20" x2="150" y2="78" stroke="#CF142B" stroke-width="6"/>' +
      '<rect x="189" y="20" width="18" height="58" fill="#fff"/>' +
      '<rect x="150" y="40" width="96" height="18" fill="#fff"/>' +
      '<rect x="193" y="20" width="10" height="58" fill="#CF142B"/>' +
      '<rect x="150" y="44" width="96" height="10" fill="#CF142B"/>' +
    '</g>' +
  '</g>' +
  // London Eye (dreht)
  '<line x1="540" y1="150" x2="520" y2="240" stroke="#3F8FE0" stroke-width="10"/>' +
  '<line x1="540" y1="150" x2="564" y2="240" stroke="#5BC0F8" stroke-width="8"/>' +
  '<g class="toni-london__eye">' +
    '<circle cx="540" cy="150" r="100" fill="none" stroke="url(#lonEye)" stroke-width="12"/>' +
    eyeSpokes(540, 150, 100) +
    '<circle cx="540" cy="150" r="11" fill="#FF4FA3"/>' +
  '</g>' +
  // Telefonzelle
  '<rect x="700" y="150" width="56" height="12" rx="3" fill="#C81E1E"/>' +
  '<rect x="704" y="162" width="48" height="60" rx="4" fill="url(#lonBox)"/>' +
  phoneGrid(708, 168) +
  // Tower Bridge
  '<rect x="854" y="118" width="220" height="12" rx="4" fill="#FFD24A"/>' +
  '<rect x="854" y="130" width="220" height="7" fill="#FFB84D"/>' +
  '<path d="M884,200 Q964,172 1044,200" stroke="#C9D6E8" stroke-width="6" fill="none"/>' +
  towerPillar(854) + towerPillar(1030) +
  // Doppeldeckerbus (fährt)
  '<g class="toni-london__bus">' +
    '<rect x="0" y="196" width="156" height="62" rx="12" fill="url(#lonBus)"/>' +
    '<rect x="12" y="180" width="132" height="20" rx="7" fill="url(#lonBus)"/>' +
    busWindows() +
    '<rect x="126" y="222" width="22" height="30" rx="3" fill="#FFE9A8"/>' +
    '<circle cx="40" cy="260" r="14" fill="#222"/><circle cx="40" cy="260" r="6" fill="#fff"/>' +
    '<circle cx="120" cy="260" r="14" fill="#222"/><circle cx="120" cy="260" r="6" fill="#fff"/>' +
  '</g>' +
'</svg>';
  }

  function eyeSpokes(cx, cy, r) {
    let out = "";
    for (let k = 0; k < 12; k++) {
      const a = k * 30 * Math.PI / 180;
      const sx = cx + Math.cos(a) * r, sy = cy + Math.sin(a) * r;
      out += '<line x1="' + cx + '" y1="' + cy + '" x2="' + sx.toFixed(1) + '" y2="' + sy.toFixed(1) +
             '" stroke="url(#lonEye)" stroke-width="6"/>' +
             '<rect x="' + (sx - 10).toFixed(1) + '" y="' + (sy - 6).toFixed(1) +
             '" width="20" height="12" rx="6" fill="#FFE08A" stroke="#3F8FE0" stroke-width="2"/>';
    }
    return out;
  }
  function phoneGrid(x, y) {
    let out = "";
    for (let gx = 0; gx < 3; gx++)
      for (let gy = 0; gy < 5; gy++)
        out += '<rect x="' + (x + gx * 14) + '" y="' + (y + gy * 11) + '" width="10" height="8" fill="#fff" opacity="0.85"/>';
    return out;
  }
  function towerPillar(x) {
    let out = '<polygon points="' + (x + 22) + ',92 ' + (x + 4) + ',124 ' + (x + 40) + ',124" fill="#FF6B6B"/>' +
              '<rect x="' + x + '" y="124" width="44" height="98" rx="5" fill="url(#lonTower)"/>';
    for (let wy = 0; wy < 3; wy++)
      for (let wx = 0; wx < 3; wx++)
        out += '<rect x="' + (x + 6 + wx * 12) + '" y="' + (138 + wy * 22) + '" width="8" height="14" fill="#BFE3FF" opacity="0.8"/>';
    return out;
  }
  function busWindows() {
    let out = "";
    for (let i = 0; i < 5; i++)
      out += '<rect x="' + (18 + i * 26) + '" y="206" width="18" height="16" rx="3" fill="#FFE9A8"/>';
    out += '<rect x="18" y="230" width="36" height="22" rx="3" fill="#BFE3FF"/>';
    return out;
  }

  /* ---------------------------------------------------------- Render */
  function renderStations(journey) {
    injectStyles();
    injectFullscreenStyles();

    const steps = (journey && journey.steps) || [];
    const n = steps.length;
    if (n === 0) {
      return '<div class="toni-london" style="padding:40px;text-align:center;color:#16324f">' +
             'Diese Lernreise hat noch keine Stationen.</div>';
    }

    if (document.body && document.body.classList) {
      document.body.classList.add("toni-london-fullscreen");
    }

    const states = steps.map(function (s, i) { return stationStatus(s, i, journey); });
    const doneCount = states.filter(function (st) { return st === "done"; }).length;
    const pct = Math.round(doneCount / n * 100);
    const curIdx = states.findIndex(function (st) { return st === "current"; });
    const curTitle = curIdx >= 0 ? esc(steps[curIdx].title || "") : "Tour abgeschlossen";

    let stopsHTML = "";
    for (let i = 0; i < n; i++) {
      stopsHTML += renderStop(steps[i], i, states[i]);
    }

    return '' +
      '<div class="toni-london">' +
        '<div class="toni-london__sun"></div>' +
        '<div class="toni-london__head">' +
          '<button type="button" class="toni-london__keybtn" title="Zum aktuellen Stopp" ' +
            'aria-label="Zum aktuellen Stopp" onclick="toniLondonGotoCurrent()">' + ICON.pin + '</button>' +
          '<div class="toni-london__htext">' +
            '<div class="tk">' + pct + '% erkundet · ' + doneCount + ' von ' + n + ' Stopps</div>' +
            '<div class="tn">Aktuell: ' + curTitle + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="toni-london__skyline">' + skylineSVG() + '</div>' +
        '<div class="toni-london__slogan">DISCOVER • EXPLORE • ENJOY</div>' +
        '<div class="toni-london__route">' + stopsHTML + '</div>' +
        // Dock (feste Aufgaben-Leiste) – Muster aus Haus
        '<div class="toni-london__dock" id="toni-london-dock">' +
          '<div class="toni-london__dock-head">' +
            '<span class="toni-london__dock-title" id="toni-london-dock-title">Aufgaben</span>' +
            '<button type="button" class="toni-london__dock-close" ' +
              'onclick="toniLondonCloseDock()" aria-label="Aufgaben schließen">Schließen ✕</button>' +
          '</div>' +
          '<div class="toni-london__dock-body" id="toni-london-dock-body"></div>' +
        '</div>' +
      '</div>';
  }

  /* Ein Wegpunkt = eine Station. Aufgaben liegen versteckt bereit (.tasks). */
  function renderStop(step, index, state) {
    const tasks = (step.tasks || []);

    let tasksHTML = "";
    tasks.forEach(function (t, m) {
      const tt = normType(t.type);
      const col = TYPE_COLOR[tt] || "#6FB1FF";
      const done = t.status === "done";
      const locked = state === "locked";
      const handlers = locked
        ? 'aria-disabled="true"'
        : 'role="button" tabindex="0" ' +
          'onclick="event.stopPropagation();openLearningTask(\'' + esc(t.id) + '\')" ' +
          'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();openLearningTask(\'' + esc(t.id) + '\');}"';
      tasksHTML +=
        '<div class="toni-london__task ' + (done ? "done " : "") + (locked ? "locked" : "") + '" ' +
          'style="--cc:' + col + '" ' + handlers + '>' +
          '<span class="toni-london__tico">' + typeIcon(tt) + '</span>' +
          '<span class="toni-london__tmeta">' +
            '<span class="toni-london__tlabel">' + esc(t.title || tt) + '</span>' +
            '<span class="toni-london__ttype"><span class="toni-london__tnum">' + (m + 1) + '.</span> ' + tt + '</span>' +
          '</span>' +
        '</div>';
    });
    const tasksWrap = '<div class="toni-london__tasks">' + tasksHTML + '</div>';

    const markerIcon = state === "done" ? ICON.check
                     : state === "locked" ? ICON.lock
                     : ICON.pin;

    const chip = state === "done"
      ? '<span class="toni-london__chip">✅ Besucht</span>'
      : state === "current"
        ? '<span class="toni-london__chip">📍 Du bist hier</span>'
        : '<span class="toni-london__chip">🔒 Noch zu</span>';

    const interactive = state !== "locked";
    const handlers = interactive
      ? 'role="button" tabindex="0" ' +
        'onclick="toniLondonToggleStop(' + index + ')" ' +
        'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toniLondonToggleStop(' + index + ');}"'
      : 'aria-disabled="true"';

    const title = esc(step.title || ("Stopp " + (index + 1)));

    return '' +
      '<div class="toni-london__stop ' + state + ' toni-tl-nav" data-step-index="' + index + '" ' +
        'data-stop-title="' + title + '" aria-label="' + title + '" ' + handlers + '>' +
        '<div class="toni-london__marker"><span class="toni-london__num">' + (index + 1) + '</span>' +
          markerIcon + '</div>' +
        '<div class="toni-london__body">' +
          '<div class="toni-london__name">' + title + '</div>' +
          chip +
        '</div>' +
        '<div class="toni-london__chev">›</div>' +
        tasksWrap +
      '</div>';
  }

  /* ---------------------------------------------------------- Registrierung */
  window.toniThemes.register({
    id: "london",
    label: "London",
    description: "Die Lernreise als London-Tour – Stationen sind Wegpunkte, Aufgaben erscheinen unten. Mit drehendem Riesenrad, wehender Flagge und fahrendem Bus.",
    renderStations: renderStations,
    renderPreview: function () {
      // Mini-London: Pastellhimmel, Big Ben, Eye, Bus, Hügel.
      return '<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="160" height="100" rx="10" fill="#FBE3E8"/>' +
        '<circle cx="138" cy="16" r="13" fill="#FFD27A"/>' +
        '<path d="M0,72 Q50,60 90,70 T160,66 L160,100 L0,100 Z" fill="#4FB4F2"/>' +
        // Big Ben
        '<polygon points="26,16 18,30 34,30" fill="#FF9A4D"/>' +
        '<rect x="18" y="29" width="16" height="40" rx="2" fill="#FF7E66"/>' +
        '<circle cx="26" cy="42" r="4" fill="#fff"/>' +
        // Eye
        '<circle cx="78" cy="42" r="24" fill="none" stroke="#3FA0E8" stroke-width="4"/>' +
        '<line x1="78" y1="18" x2="78" y2="66" stroke="#3FA0E8" stroke-width="2"/>' +
        '<line x1="54" y1="42" x2="102" y2="42" stroke="#3FA0E8" stroke-width="2"/>' +
        '<circle cx="78" cy="42" r="3" fill="#FF4FA3"/>' +
        // Bus
        '<rect x="112" y="64" width="34" height="16" rx="4" fill="#E23030"/>' +
        '<rect x="116" y="58" width="26" height="8" rx="3" fill="#E23030"/>' +
        '<circle cx="120" cy="82" r="4" fill="#222"/><circle cx="138" cy="82" r="4" fill="#222"/>' +
        '</svg>';
    }
  });

  console.info("[TONI-Theme:london] London-Theme registriert (theme-london-v3-buttons).");
})();
