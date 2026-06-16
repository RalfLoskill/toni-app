/* ============================================================
 * TONI – Lernreisen-Theme: "Afrika"
 * Datei: journey_theme_afrika.js
 * Build: theme-afrika-v2-wander
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
 *  - Vollbild über eigenes Präfix body.toni-afrika-fullscreen.
 *
 * ANDOCKEN AN TONI (identisch zu haus/football/space):
 *  - Wegpunkt-Klick -> toniAfrikaToggleStop(i): wählt Station via
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
    console.warn("[TONI-Theme:afrika] Theme-Engine nicht gefunden – London-Theme inaktiv.");
    return;
  }

  /* ---------- Palette (aus dem Referenzbild) ---------- */
  const ACCENT   = "#E58A2E";   // Savannen-Ocker (Button/Akzent)
  const ROYAL    = "#3FB6C4";   // Fluss-Türkis
  const DONE_COL = "#5B9E3A";   // erledigt: Akaziengrün

  const TYPE_COLOR = {
    Lerninhalt: "#3FB6C4",
    Aufgabe:    "#E58A2E",
    Quiz:       "#F2C14E",
    Reflexion:  "#5B9E3A",
    Video:      "#C2603A"
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
  window.toniAfrikaToggleStop = function (index) {
    const root = document.querySelector(".toni-afrika");
    if (!root) return;
    const stop = root.querySelector('.toni-afrika__stop[data-step-index="' + index + '"]');
    if (!stop || stop.classList.contains("locked")) return;
    const already = stop.classList.contains("open");
    root.querySelectorAll(".toni-afrika__stop.open").forEach(function (r) {
      r.classList.remove("open");
    });
    if (already) { toniAfrikaCloseDock(); return; }
    stop.classList.add("open");

    const dock = document.getElementById("toni-afrika-dock");
    const dockBody = document.getElementById("toni-afrika-dock-body");
    const dockTitle = document.getElementById("toni-afrika-dock-title");
    const src = stop.querySelector(".toni-afrika__tasks");
    if (dock && dockBody) {
      dockBody.innerHTML = src ? src.innerHTML :
        '<div class="toni-afrika__dock-empty">Dieser Stopp hat noch keine Aufgaben.</div>';
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

  window.toniAfrikaCloseDock = function () {
    const dock = document.getElementById("toni-afrika-dock");
    if (dock) dock.classList.remove("open");
    const root = document.querySelector(".toni-afrika");
    if (root) root.querySelectorAll(".toni-afrika__stop.open").forEach(function (r) { r.classList.remove("open"); });
  };

  window.toniAfrikaGotoCurrent = function () {
    const c = document.querySelector(".toni-afrika__stop.current");
    if (c) c.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /* ---------------------------------------------------------- CSS (Szene) */
  function injectStyles() {
    if (document.getElementById("toni-theme-afrika-css")) return;
    const css = `
.toni-afrika{position:relative;width:100%;min-height:100%;overflow:hidden;
  --pink:${ACCENT};--royal:${ROYAL};--done:${DONE_COL};--ink:#16324f;--ink-soft:#3c5a78;
  --card:#ffffff;--line:#dfe8f2;
  background:linear-gradient(160deg,#FCE9DD 0%,#FBE3E8 55%,#F3E6F5 100%);
  font-family:inherit;color:var(--ink);}
.toni-afrika *{box-sizing:border-box;}

/* Sonne */
.toni-afrika__sun{position:absolute;top:-60px;right:-40px;width:170px;height:170px;border-radius:50%;
  background:radial-gradient(circle at 50% 50%,#FFE27A,#FFC34D);z-index:0;
  box-shadow:0 0 0 22px rgba(255,226,122,.35);}

/* Skyline-Band (feste animierte Kulisse) */
.toni-afrika__skyline{position:relative;z-index:1;width:100%;height:300px;}
.toni-afrika__skyline svg{display:block;width:100%;height:100%;}

/* Sonne pulsiert */
@keyframes afSun{0%,100%{opacity:.9;transform:scale(1)}50%{opacity:1;transform:scale(1.05)}}
.af-sun{transform-box:fill-box;transform-origin:center;animation:afSun 6s ease-in-out infinite;}
/* Löwe / Tiere atmen */
@keyframes afBreathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.04)}}
.af-breathe{transform-box:fill-box;animation:afBreathe 4s ease-in-out infinite;}
/* Figur wiegt sich leicht */
@keyframes afSway{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}
.af-sway{transform-box:fill-box;animation:afSway 5s ease-in-out infinite;}
/* Elefantenrüssel schwingt */
@keyframes afTrunk{0%,100%{transform:rotate(-6deg)}50%{transform:rotate(10deg)}}
.af-trunk{transform-box:fill-box;animation:afTrunk 4.5s ease-in-out infinite;}
/* Giraffe nickt */
@keyframes afNod{0%,100%{transform:rotate(-3deg)}50%{transform:rotate(4deg)}}
.af-nod{transform-box:fill-box;animation:afNod 5.5s ease-in-out infinite;}
/* Akazienkronen wiegen */
@keyframes afCanopy{0%,100%{transform:rotate(-1.5deg)}50%{transform:rotate(1.5deg)}}
.af-canopy{transform-box:fill-box;animation:afCanopy 6s ease-in-out infinite;}
/* Vogelschwarm zieht tiefer über die Szene */
@keyframes afBirds{0%{transform:translate(-120px,150px)}100%{transform:translate(1320px,95px)}}
.af-birds{transform-box:fill-box;animation:afBirds 22s linear infinite;}
/* Wandernde Tiere – laufen langsam durch, mit langer Pause (erscheinen "von Zeit zu Zeit") */
@keyframes afWalkLion{0%{transform:translate(-160px,196px)}18%{transform:translate(-160px,196px)}
  60%{transform:translate(1320px,196px)}100%{transform:translate(1320px,196px)}}
.af-walk-lion{transform-box:fill-box;animation:afWalkLion 34s ease-in-out infinite;}
@keyframes afWalkEleph{0%{transform:translate(1320px,150px)}30%{transform:translate(1320px,150px)}
  78%{transform:translate(-220px,150px)}100%{transform:translate(-220px,150px)}}
.af-walk-eleph{transform-box:fill-box;animation:afWalkEleph 40s ease-in-out infinite;}
@keyframes afWalkGiraffe{0%{transform:translate(-180px,40px)}45%{transform:translate(-180px,40px)}
  92%{transform:translate(1320px,40px)}100%{transform:translate(1320px,40px)}}
.af-walk-giraffe{transform-box:fill-box;animation:afWalkGiraffe 46s ease-in-out infinite;}

/* ===== Kopf ===== */
.toni-afrika__head{position:relative;z-index:10;display:flex;align-items:center;gap:13px;
  width:92%;max-width:520px;margin:14px auto 4px;padding:0 2px;}
.toni-afrika__keybtn{width:46px;height:46px;flex:0 0 46px;border-radius:13px;cursor:pointer;
  background:#fff;border:2px solid var(--royal);display:grid;place-items:center;color:var(--royal);
  box-shadow:0 4px 14px rgba(63,169,245,.25);transition:transform .12s ease;}
.toni-afrika__keybtn:active{transform:scale(.95);}
.toni-afrika__keybtn svg{width:23px;height:23px;}
.toni-afrika__htext .tk{font-size:10px;font-weight:850;letter-spacing:.14em;text-transform:uppercase;color:var(--pink);}
.toni-afrika__htext .tn{font-size:16px;font-weight:850;line-height:1.1;margin-top:2px;color:var(--ink);
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* Slogan-Band */
.toni-afrika__slogan{position:relative;z-index:6;width:92%;max-width:520px;margin:2px auto 0;
  font-size:11px;font-weight:850;letter-spacing:.22em;color:var(--ink);opacity:.7;}

/* ===== Wegpunkte (Stationen) ===== */
.toni-afrika__route{position:relative;z-index:3;width:92%;max-width:520px;margin:10px auto 0;
  display:flex;flex-direction:column;gap:14px;padding-bottom:150px;}
.toni-afrika__stop{position:relative;display:flex;align-items:center;gap:14px;cursor:pointer;
  background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px 14px;
  box-shadow:0 6px 18px rgba(22,50,79,.08);transition:transform .16s ease,box-shadow .3s ease,border-color .3s ease;}
.toni-afrika__stop:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(22,50,79,.14);}
.toni-afrika__stop:focus-visible{outline:3px solid var(--royal);outline-offset:3px;}
/* Marker (Pin in Kreis) */
.toni-afrika__marker{position:relative;flex:0 0 56px;width:56px;height:56px;border-radius:16px;
  display:grid;place-items:center;color:#fff;background:linear-gradient(160deg,var(--royal),#7B5BE0);
  box-shadow:0 6px 16px rgba(63,169,245,.35);}
.toni-afrika__marker svg{width:28px;height:28px;}
.toni-afrika__num{position:absolute;top:-6px;left:-6px;width:22px;height:22px;border-radius:50%;
  background:#fff;color:var(--ink);font-size:11px;font-weight:850;display:grid;place-items:center;
  box-shadow:0 2px 6px rgba(0,0,0,.18);}
.toni-afrika__body{flex:1;min-width:0;}
.toni-afrika__name{font-size:15px;font-weight:850;line-height:1.18;color:var(--ink);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.toni-afrika__chip{display:inline-flex;align-items:center;gap:5px;margin-top:6px;font-size:10px;
  font-weight:800;padding:3px 9px;border-radius:20px;background:#f1f5fb;color:var(--ink-soft);}
.toni-afrika__chev{flex:0 0 auto;color:#9fb3c8;font-size:18px;font-weight:800;}

/* Verbindungslinie zwischen Stopps (gestrichelte Route) */
.toni-afrika__stop::before{content:"";position:absolute;left:39px;top:-14px;height:14px;width:0;
  border-left:3px dashed #c7d6e6;}
.toni-afrika__stop:first-child::before{display:none;}

/* ZUSTAND done */
.toni-afrika__stop.done .toni-afrika__marker{background:linear-gradient(160deg,var(--done),#FF9A4D);
  box-shadow:0 6px 18px rgba(255,94,138,.4);}
.toni-afrika__stop.done{border-color:#FFD0DE;}
/* ZUSTAND current */
.toni-afrika__stop.current{border-color:var(--royal);box-shadow:0 0 0 3px rgba(63,169,245,.18),0 10px 26px rgba(22,50,79,.14);}
.toni-afrika__stop.current .toni-afrika__marker{animation:toniAfrikaBob 2s ease-in-out infinite;}
@keyframes toniAfrikaBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
/* ZUSTAND locked */
.toni-afrika__stop.locked{cursor:default;opacity:.7;}
.toni-afrika__stop.locked .toni-afrika__marker{background:#c2cdd9;color:#fff;box-shadow:none;}

/* versteckte Aufgaben-Quelle (wird ins Dock gespiegelt) */
.toni-afrika__tasks{display:none;}

/* ===== Dock (feste Aufgaben-Leiste unten) – Muster aus Haus ===== */
.toni-afrika__dock{position:fixed;left:0;right:0;bottom:0;z-index:4600;
  max-width:560px;margin:0 auto;background:#fff;border:1px solid var(--line);
  border-bottom:none;border-radius:20px 20px 0 0;box-shadow:0 -12px 40px rgba(22,50,79,.18);
  transform:translateY(110%);transition:transform .34s cubic-bezier(.22,1,.36,1);
  padding:8px 16px 18px;}
.toni-afrika__dock.open{transform:translateY(0);}
.toni-afrika__dock-head{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:6px 2px 10px;}
.toni-afrika__dock-title{font-size:15px;font-weight:850;color:var(--ink);}
.toni-afrika__dock-close{border:none;background:#f1f5fb;color:var(--ink);border-radius:9px;
  padding:7px 12px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;}
.toni-afrika__dock-close:hover{background:#e3ebf5;}
.toni-afrika__dock-body{display:flex;flex-wrap:wrap;gap:9px;max-height:42vh;overflow-y:auto;}
.toni-afrika__dock-empty{color:var(--ink-soft);font-size:13px;padding:6px 2px 10px;}

/* Aufgaben-Karten (Tasks) */
.toni-afrika__task{position:relative;display:flex;align-items:center;gap:10px;cursor:pointer;
  padding:10px 13px;border-radius:13px;background:#fff;border:1px solid var(--line);
  min-width:150px;transition:transform .1s ease,border-color .2s ease,box-shadow .2s ease;}
.toni-afrika__task:hover{transform:translateY(-2px);border-color:var(--royal);box-shadow:0 6px 16px rgba(63,169,245,.18);}
.toni-afrika__task:focus-visible{outline:3px solid var(--royal);outline-offset:2px;}
.toni-afrika__task.locked{cursor:default;opacity:.5;}
.toni-afrika__task.locked:hover{transform:none;border-color:var(--line);box-shadow:none;}
.toni-afrika__tico{width:34px;height:34px;flex:0 0 34px;border-radius:10px;display:grid;place-items:center;
  background:#f1f5fb;color:var(--cc,#6FB1FF);border:1px solid color-mix(in srgb,var(--cc,#888) 35%,transparent);}
.toni-afrika__tico svg{width:19px;height:19px;}
.toni-afrika__tmeta{min-width:0;}
.toni-afrika__tlabel{font-size:12px;font-weight:800;line-height:1.15;color:var(--ink);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.toni-afrika__ttype{font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;
  color:#9fb3c8;margin-top:1px;}
.toni-afrika__task.done .toni-afrika__tico{background:var(--done);color:#fff;border-color:var(--done);}
.toni-afrika__tnum{font-size:9px;font-weight:850;color:#9fb3c8;}

@media (prefers-reduced-motion: reduce){
  .toni-afrika *{animation:none !important;}
  .toni-afrika__bus{transform:translateX(480px);}
}
`;
    const el = document.createElement("style");
    el.id = "toni-theme-afrika-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------------------------------------------------------- Fullscreen-CSS
   * Gegated über body.toni-afrika-fullscreen (eigenes Präfix). Struktur 1:1
   * vom Haus-Theme übernommen, nur die Klassennamen sind london-spezifisch.
   * -------------------------------------------------------- */
  function injectFullscreenStyles() {
    if (document.getElementById("toni-theme-afrika-fs-css")) return;
    const css = `
body.toni-afrika-fullscreen{overflow:hidden !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika.lr-modal-backdrop,
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika{
  position:fixed !important;inset:0 !important;z-index:4000 !important;
  padding:0 !important;margin:0 !important;background:#FBE3E8 !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-modal,
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-modal-card,
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika > div{
  width:100vw !important;max-width:100vw !important;height:100vh !important;max-height:100vh !important;
  border-radius:0 !important;margin:0 !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-modal-body{
  padding:0 !important;height:100% !important;overflow-y:auto !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-detail-grid,
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-main-card{
  display:block !important;width:100% !important;max-width:100% !important;
  margin:0 !important;padding:0 !important;background:transparent !important;
  border:none !important;box-shadow:none !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .toni-afrika{min-height:100vh;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-stations{
  padding:0 !important;margin:0 !important;}
.toni-theme-active-afrika .lr-top-split{grid-template-columns:1fr !important;grid-template-areas:"stations" "right" !important;display:block !important;}
.toni-theme-active-afrika .lr-top-split .lr-stations{background:transparent !important;padding:0 !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .card-header{display:none !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-modal-title{display:none !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-modal-header{
  position:fixed !important;top:0 !important;right:0 !important;left:auto !important;
  background:transparent !important;border:none !important;box-shadow:none !important;
  padding:10px !important;z-index:4500 !important;width:auto !important;
  display:flex !important;justify-content:flex-end !important;align-items:center !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-modal-actions{
  gap:8px !important;display:flex !important;flex-direction:row !important;
  align-items:center !important;flex-wrap:nowrap !important;width:auto !important;position:static !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-modal-actions button{
  flex:0 0 auto !important;position:static !important;margin:0 !important;
  background:#fff !important;border:2px solid ${ROYAL} !important;color:${ROYAL} !important;backdrop-filter:blur(4px);}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-modal-actions button[onclick*="startNextLearningTask"]{display:none !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika #lr-modal-sub,
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-modal-sub{display:none !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-right-col,
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika #lr-right-col{display:none !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-progress-big{display:none !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-cover-screen-v89{display:none !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-close-btn{
  position:fixed !important;top:14px;right:14px;z-index:4700 !important;
  background:#fff !important;border:2px solid ${ACCENT} !important;color:${ACCENT} !important;}
body.toni-afrika-fullscreen #lr-modal.toni-theme-active-afrika .lr-close-btn:hover{background:#fff0f6 !important;}

/* Aufgaben-Detail im London-Look */
body.toni-afrika-fullscreen #lr-task-modal.lr-modal-backdrop,
body.toni-afrika-fullscreen #lr-task-modal{z-index:5000 !important;}
body.toni-afrika-fullscreen #lr-task-modal .lr-modal,
body.toni-afrika-fullscreen #lr-task-modal .lr-modal-card,
body.toni-afrika-fullscreen #lr-task-modal > div{
  border:1px solid #dfe8f2 !important;}
`;
    const el = document.createElement("style");
    el.id = "toni-theme-afrika-fs-css";
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
    '<linearGradient id="afSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D9A8"/><stop offset="0.6" stop-color="#E8A765"/><stop offset="1" stop-color="#D98A4A"/></linearGradient>' +
    '<radialGradient id="afSun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FBE08A"/><stop offset="1" stop-color="#F2B23D"/></radialGradient>' +
    '<linearGradient id="afRiver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#56C7D4"/><stop offset="1" stop-color="#2E97A6"/></linearGradient>' +
    '<linearGradient id="afGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A5230"/><stop offset="1" stop-color="#5A3A22"/></linearGradient>' +
  '</defs>' +
  // ferne Hügel
  '<path d="M0,210 Q300,170 620,200 T1220,192 L1220,300 L0,300 Z" fill="#D98A4A" opacity="0.6"/>' +
  // Sonne (pulsiert über .toni-afrika__sun-Klasse nicht nötig – eigene)
  '<circle class="af-sun" cx="610" cy="70" r="46" fill="url(#afSun)"/>' +
  // Wölkchen
  '<ellipse cx="230" cy="80" rx="70" ry="20" fill="#fff" opacity="0.35"/>' +
  '<ellipse cx="980" cy="70" rx="80" ry="22" fill="#fff" opacity="0.35"/>' +
  // Fluss + Uferband
  '<path d="M0,250 Q360,225 760,245 T1220,240 L1220,300 L0,300 Z" fill="url(#afRiver)"/>' +
  '<path d="M0,268 Q360,248 760,264 T1220,260 L1220,300 L0,300 Z" fill="url(#afGround)"/>' +
  // Akazienbäume (Ränder)
  acacia(70, 150) + acacia(1130, 160) +
  // großer runder Busch/Termitenhügel rechts
  '<ellipse cx="1000" cy="200" rx="90" ry="66" fill="#6B4A2B" opacity="0.55"/>' +
  // ===== Feste Szene-Objekte am Ufer =====
  // Akazienbaum, unter dem die Wasserträgerin steht (mittig-links)
  acacia(360, 150) +
  // Wasserträgerin (weiter links, weg von der Sonne; wiegt sich leicht)
  '<g class="af-sway" style="transform-origin:360px 250px">' +
    '<ellipse cx="360" cy="120" rx="22" ry="16" fill="#5A3A22"/>' + // Krug auf dem Kopf
    '<rect x="350" y="132" width="20" height="14" fill="#5B9E3A"/>' +
    '<circle cx="360" cy="158" r="16" fill="#6B4A2B"/>' + // Kopf
    '<rect x="350" y="172" width="20" height="40" rx="6" fill="#5A3A22"/>' +
    '<path d="M350 212 h20 l8 38 h-36 z" fill="#3E7D2A"/>' + // Wickelrock
    '<rect x="342" y="176" width="7" height="34" rx="3" fill="#6B4A2B"/><rect x="371" y="176" width="7" height="34" rx="3" fill="#6B4A2B"/>' +
  '</g>' +
  // Trommeln + Tonkrug am Ufer (fest sichtbar)
  '<g transform="translate(470,224)">' + // große Djembe
    '<path d="M0 0 h44 l-8 48 h-28 z" fill="#fff" stroke="#7A5230" stroke-width="3"/>' +
    '<ellipse cx="22" cy="0" rx="22" ry="6" fill="#C98A4A"/>' +
    '<line x1="2" y1="6" x2="14" y2="44" stroke="#7A5230" stroke-width="2"/><line x1="42" y1="6" x2="30" y2="44" stroke="#7A5230" stroke-width="2"/></g>' +
  '<g transform="translate(524,244)">' + // kleine Trommel
    '<path d="M0 0 h26 l-5 28 h-16 z" fill="#fff" stroke="#7A5230" stroke-width="2.5"/>' +
    '<ellipse cx="13" cy="0" rx="13" ry="4" fill="#C98A4A"/></g>' +
  '<g transform="translate(556,250)">' + // Tonkrug
    '<path d="M0 8 q14 -16 28 0 q4 18 -14 22 q-18 -4 -14 -22 z" fill="#9A6A38"/>' +
    '<ellipse cx="14" cy="6" rx="10" ry="4" fill="#7A5230"/></g>' +
  // ===== Wandernde Tiere (laufen von Zeit zu Zeit durchs Bild) =====
  // Löwe wandert
  '<g class="af-walk-lion">' +
    '<g style="transform-origin:center">' +
      '<ellipse cx="40" cy="26" rx="48" ry="22" fill="#C98A4A"/>' +
      '<rect x="28" y="40" width="6" height="16" rx="3" fill="#A06A2E"/><rect x="62" y="40" width="6" height="16" rx="3" fill="#A06A2E"/>' +
      '<rect x="44" y="40" width="6" height="16" rx="3" fill="#A06A2E"/><rect x="78" y="40" width="6" height="16" rx="3" fill="#A06A2E"/>' +
      '<circle cx="-2" cy="12" r="26" fill="#7A4A1E"/><circle cx="-2" cy="12" r="16" fill="#E0A44E"/>' +
      '<circle cx="-8" cy="9" r="2.5" fill="#3A2410"/><circle cx="4" cy="9" r="2.5" fill="#3A2410"/>' +
      '<path d="M86 18 q16 -4 18 8" stroke="#A06A2E" stroke-width="4" fill="none"/>' +
    '</g>' +
  '</g>' +
  // Elefant wandert
  '<g class="af-walk-eleph">' +
    '<ellipse cx="60" cy="46" rx="64" ry="40" fill="#8C8C92"/>' +
    '<rect x="20" y="74" width="14" height="26" rx="5" fill="#7A7A80"/><rect x="50" y="76" width="14" height="26" rx="5" fill="#7A7A80"/><rect x="78" y="74" width="14" height="26" rx="5" fill="#7A7A80"/>' +
    '<circle cx="6" cy="34" r="26" fill="#9A9AA0"/>' +
    '<path class="af-trunk" d="M-14 36 q-16 26 -2 44" stroke="#9A9AA0" stroke-width="11" fill="none" stroke-linecap="round" style="transform-origin:-14px 36px"/>' +
    '<path d="M-30 18 q-22 8 -14 36 q10 -6 20 -10 z" fill="#9A9AA0"/>' +
    '<circle cx="0" cy="28" r="3" fill="#3A2410"/>' +
  '</g>' +
  // Giraffe wandert
  '<g class="af-walk-giraffe">' +
    '<ellipse cx="40" cy="120" rx="34" ry="22" fill="#E0A94E"/>' +
    '<rect x="28" y="128" width="8" height="40" rx="3" fill="#C98A3A"/><rect x="50" y="128" width="8" height="40" rx="3" fill="#C98A3A"/>' +
    '<g class="af-nod" style="transform-origin:46px 120px">' +
      '<rect x="42" y="20" width="10" height="104" fill="#E0A94E"/>' +
      '<circle cx="47" cy="16" r="13" fill="#E0A94E"/>' +
      '<rect x="40" y="6" width="3" height="8" rx="1" fill="#7A5230"/><rect x="52" y="6" width="3" height="8" rx="1" fill="#7A5230"/>' +
      '<circle cx="43" cy="14" r="2" fill="#3A2410"/>' +
    '</g>' +
    '<circle cx="36" cy="116" r="4" fill="#C2603A"/><circle cx="56" cy="124" r="5" fill="#C2603A"/><circle cx="46" cy="108" r="4" fill="#C2603A"/>' +
  '</g>' +
  // Vögel (ziehen tiefer über die Szene)
  '<g class="af-birds">' +
    '<path d="M0 0 q8 -8 16 0 q8 -8 16 0" stroke="#5A3A22" stroke-width="3" fill="none"/>' +
    '<path d="M40 14 q6 -6 12 0 q6 -6 12 0" stroke="#5A3A22" stroke-width="2.5" fill="none"/>' +
  '</g>' +
'</svg>';
  }

  function acacia(x, baseY) {
    return '<g transform="translate(' + x + ',' + baseY + ')">' +
      '<rect x="-4" y="0" width="9" height="70" fill="#5A3A22"/>' +
      '<line x1="0" y1="20" x2="-22" y2="6" stroke="#5A3A22" stroke-width="5"/>' +
      '<line x1="0" y1="20" x2="22" y2="6" stroke="#5A3A22" stroke-width="5"/>' +
      '<ellipse class="af-canopy" cx="0" cy="-6" rx="46" ry="22" fill="#5B9E3A" style="transform-origin:0 -6px"/>' +
      '<ellipse cx="-30" cy="2" rx="22" ry="12" fill="#4E8A32"/><ellipse cx="30" cy="2" rx="22" ry="12" fill="#4E8A32"/>' +
    '</g>';
  }

  /* ---------------------------------------------------------- Render */
  function renderStations(journey) {
    injectStyles();
    injectFullscreenStyles();

    const steps = (journey && journey.steps) || [];
    const n = steps.length;
    if (n === 0) {
      return '<div class="toni-afrika" style="padding:40px;text-align:center;color:#16324f">' +
             'Diese Lernreise hat noch keine Stationen.</div>';
    }

    if (document.body && document.body.classList) {
      document.body.classList.add("toni-afrika-fullscreen");
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
      '<div class="toni-afrika">' +
        '<div class="toni-afrika__sun"></div>' +
        '<div class="toni-afrika__head">' +
          '<button type="button" class="toni-afrika__keybtn" title="Zum aktuellen Stopp" ' +
            'aria-label="Zum aktuellen Stopp" onclick="toniAfrikaGotoCurrent()">' + ICON.pin + '</button>' +
          '<div class="toni-afrika__htext">' +
            '<div class="tk">' + pct + '% erkundet · ' + doneCount + ' von ' + n + ' Stopps</div>' +
            '<div class="tn">Aktuell: ' + curTitle + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="toni-afrika__skyline">' + skylineSVG() + '</div>' +
        '<div class="toni-afrika__slogan">KULTUR • NATUR • RHYTHMUS • AFRIKA</div>' +
        '<div class="toni-afrika__route">' + stopsHTML + '</div>' +
        // Dock (feste Aufgaben-Leiste) – Muster aus Haus
        '<div class="toni-afrika__dock" id="toni-afrika-dock">' +
          '<div class="toni-afrika__dock-head">' +
            '<span class="toni-afrika__dock-title" id="toni-afrika-dock-title">Aufgaben</span>' +
            '<button type="button" class="toni-afrika__dock-close" ' +
              'onclick="toniAfrikaCloseDock()" aria-label="Aufgaben schließen">Schließen ✕</button>' +
          '</div>' +
          '<div class="toni-afrika__dock-body" id="toni-afrika-dock-body"></div>' +
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
        '<div class="toni-afrika__task ' + (done ? "done " : "") + (locked ? "locked" : "") + '" ' +
          'style="--cc:' + col + '" ' + handlers + '>' +
          '<span class="toni-afrika__tico">' + typeIcon(tt) + '</span>' +
          '<span class="toni-afrika__tmeta">' +
            '<span class="toni-afrika__tlabel">' + esc(t.title || tt) + '</span>' +
            '<span class="toni-afrika__ttype"><span class="toni-afrika__tnum">' + (m + 1) + '.</span> ' + tt + '</span>' +
          '</span>' +
        '</div>';
    });
    const tasksWrap = '<div class="toni-afrika__tasks">' + tasksHTML + '</div>';

    const markerIcon = state === "done" ? ICON.check
                     : state === "locked" ? ICON.lock
                     : ICON.pin;

    const chip = state === "done"
      ? '<span class="toni-afrika__chip">✅ Besucht</span>'
      : state === "current"
        ? '<span class="toni-afrika__chip">📍 Du bist hier</span>'
        : '<span class="toni-afrika__chip">🔒 Noch zu</span>';

    const interactive = state !== "locked";
    const handlers = interactive
      ? 'role="button" tabindex="0" ' +
        'onclick="toniAfrikaToggleStop(' + index + ')" ' +
        'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toniAfrikaToggleStop(' + index + ');}"'
      : 'aria-disabled="true"';

    const title = esc(step.title || ("Stopp " + (index + 1)));

    return '' +
      '<div class="toni-afrika__stop ' + state + ' toni-tl-nav" data-step-index="' + index + '" ' +
        'data-stop-title="' + title + '" aria-label="' + title + '" ' + handlers + '>' +
        '<div class="toni-afrika__marker"><span class="toni-afrika__num">' + (index + 1) + '</span>' +
          markerIcon + '</div>' +
        '<div class="toni-afrika__body">' +
          '<div class="toni-afrika__name">' + title + '</div>' +
          chip +
        '</div>' +
        '<div class="toni-afrika__chev">›</div>' +
        tasksWrap +
      '</div>';
  }

  /* ---------------------------------------------------------- Registrierung */
  window.toniThemes.register({
    id: "afrika",
    label: "Afrika",
    description: "Die Lernreise als Savannen-Tour – Stationen sind Wegpunkte am Fluss, Aufgaben erscheinen unten. Mit vielen animierten Tieren: Elefant, Giraffe, Löwe und mehr.",
    renderStations: renderStations,
    renderPreview: function () {
      // Mini-Savanne: warmer Himmel, Sonne, Fluss, Akazie, Tiere.
      return '<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="afPv" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#F6D9A8"/><stop offset="1" stop-color="#E59B5B"/>' +
        '</linearGradient></defs>' +
        '<rect width="160" height="100" rx="10" fill="url(#afPv)"/>' +
        '<circle cx="84" cy="26" r="15" fill="#F2B23D" opacity=".85"/>' +
        // Fluss
        '<path d="M0,74 Q50,64 90,72 T160,70 L160,100 L0,100 Z" fill="#3FB6C4"/>' +
        '<path d="M0,82 Q60,74 110,80 T160,80 L160,100 L0,100 Z" fill="#6B4A2B"/>' +
        // Akazie
        '<rect x="22" y="50" width="4" height="26" fill="#5A3A22"/>' +
        '<ellipse cx="24" cy="46" rx="18" ry="9" fill="#5B9E3A"/>' +
        // Elefant
        '<ellipse cx="74" cy="70" rx="16" ry="11" fill="#8C8C92"/>' +
        '<circle cx="60" cy="66" r="8" fill="#9A9AA0"/><path d="M54 68 q-6 8 0 12" stroke="#8C8C92" stroke-width="3" fill="none"/>' +
        // Giraffe
        '<rect x="128" y="44" width="5" height="30" fill="#E0A94E"/><circle cx="130" cy="42" r="6" fill="#E0A94E"/>' +
        '<ellipse cx="132" cy="74" rx="12" ry="7" fill="#E0A94E"/>' +
        '</svg>';
    }
  });

  console.info("[TONI-Theme:afrika] London-Theme registriert (theme-afrika-v2-wander).");
})();
