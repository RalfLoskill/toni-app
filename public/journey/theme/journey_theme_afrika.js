/* ============================================================
 * TONI – Lernreisen-Theme: "Afrika"
 * Datei: journey_theme_afrika.js
 * Build: theme-afrika-v8-cascadefix
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
    lock:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    // Wegpunkt-Icon (current): Karten-Pin
    pin:     '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v12H8l-4 4z"/><path d="M8 9h8M8 13h5"/></svg>',
    task:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/></svg>',
    quiz:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .9-1 1.7"/><circle cx="12" cy="17" r=".7" fill="currentColor"/></svg>',
    reflect: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a7 7 0 0 0-4 12.7V18h8v-2.3A7 7 0 0 0 12 3z"/><path d="M9 21h6"/></svg>',
    video:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="3"/><path d="M11 9.5l4 2.5-4 2.5z" fill="currentColor"/></svg>'
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
  --pink:${ACCENT};--royal:${ROYAL};--done:${DONE_COL};--ink:#4A2E18;--ink-soft:#8A6A4A;
  --card:#FFF6E9;--line:#E4C9A0;
  background:linear-gradient(160deg,#FCE9DD 0%,#FBE3E8 55%,#F3E6F5 100%);
  font-family:inherit;color:var(--ink);}
.toni-afrika *{box-sizing:border-box;}

/* Sonne */
/* Skyline-Band (feste animierte Kulisse) */
.toni-afrika__skyline{position:relative;z-index:1;width:100%;
  height:clamp(300px,48vh,460px);overflow:hidden;}
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
/* Vogelschwarm zieht über die Szene (etwas höher) */
@keyframes afBirds{0%{transform:translate(-120px,70px)}100%{transform:translate(1320px,45px)}}
.af-birds{transform-box:fill-box;animation:afBirds 22s linear infinite;}
/* Wandernde Tiere – laufen langsam durch, mit langer Pause (erscheinen "von Zeit zu Zeit") */
@keyframes afWalkLion{0%{transform:translate(-160px,196px)}18%{transform:translate(-160px,196px)}
  60%{transform:translate(1320px,196px)}100%{transform:translate(1320px,196px)}}
.af-walk-lion{transform-box:fill-box;animation:afWalkLion 48s ease-in-out infinite;}
@keyframes afWalkEleph{
  0%{transform:translate(1320px,196px)}
  18%{transform:translate(1320px,196px)}
  42%{transform:translate(480px,196px)}
  62%{transform:translate(480px,196px)}
  90%{transform:translate(-220px,196px)}
  100%{transform:translate(-220px,196px)}}
.af-walk-eleph{transform-box:fill-box;animation:afWalkEleph 44s ease-in-out infinite;}
/* Rüssel: hebt/senkt sich genau während der Pause in der Mitte (gleiche Periode) */
@keyframes afTrunkLift{
  0%,46%{transform:rotate(0deg)}
  50%{transform:rotate(-42deg)}54%{transform:rotate(-8deg)}58%{transform:rotate(-42deg)}
  62%,100%{transform:rotate(0deg)}}
.af-walk-eleph .af-trunk{transform-box:fill-box;transform-origin:left top;
  animation:afTrunkLift 44s ease-in-out infinite;}
@keyframes afWalkGiraffe{0%{transform:translate(-180px,96px)}45%{transform:translate(-180px,96px)}
  92%{transform:translate(1320px,96px)}100%{transform:translate(1320px,96px)}}
.af-walk-giraffe{transform-box:fill-box;animation:afWalkGiraffe 46s ease-in-out infinite;}
/* Sonne geht auf, bleibt, geht unter (Bewegung + Helligkeit) */
@keyframes afSunRise{0%{transform:translateY(230px);opacity:.15}
  25%{transform:translateY(0);opacity:1}70%{transform:translateY(0);opacity:1}
  100%{transform:translateY(230px);opacity:.15}}
.af-sun-rise{transform-box:fill-box;transform-origin:center;animation:afSunRise 60s ease-in-out infinite;}
/* Himmel wird heller und wieder dunkler (Tageslauf) */
@keyframes afDay{0%{filter:brightness(.6)}25%{filter:brightness(1.08)}70%{filter:brightness(1.08)}100%{filter:brightness(.6)}}
.toni-afrika__skyline{animation:afDay 60s ease-in-out infinite;}
/* Zebra grast: Kopf senkt und hebt sich langsam */
@keyframes afGraze{0%,100%{transform:rotate(0deg)}40%{transform:rotate(12deg)}60%{transform:rotate(12deg)}}
.af-graze{transform-box:fill-box;animation:afGraze 7s ease-in-out infinite;}

@keyframes afCloud{0%{transform:translateX(-220px)}100%{transform:translateX(1340px)}}
.af-cloud-slow1{transform-box:fill-box;animation:afCloud 70s linear infinite;}
.af-cloud-slow2{transform-box:fill-box;animation:afCloud 86s linear infinite;animation-delay:-30s;}
.af-cloud-fast1{transform-box:fill-box;animation:afCloud 40s linear infinite;animation-delay:-12s;}
.af-cloud-fast2{transform-box:fill-box;animation:afCloud 48s linear infinite;animation-delay:-26s;}

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
  background:
    repeating-linear-gradient(45deg,rgba(229,138,46,.10) 0 8px,transparent 8px 16px),
    linear-gradient(160deg,#FFF6E9,#FBE6C8);
  border:2px solid var(--line);border-radius:16px;padding:12px 14px;
  box-shadow:0 6px 18px rgba(120,72,30,.14);transition:transform .16s ease,box-shadow .3s ease,border-color .3s ease;}
.toni-afrika__stop:hover{transform:translateY(-2px);box-shadow:0 10px 26px rgba(120,72,30,.22);}
.toni-afrika__stop:focus-visible{outline:3px solid var(--pink);outline-offset:3px;}
/* Marker (Pin in Kreis) – Savannen-Ocker mit Zickzack-Akzent */
.toni-afrika__marker{position:relative;flex:0 0 56px;width:56px;height:56px;border-radius:16px;
  display:grid;place-items:center;color:#fff;
  background:linear-gradient(160deg,#E58A2E,#C2603A);
  box-shadow:0 6px 16px rgba(194,96,58,.4);}
.toni-afrika__marker svg{width:28px;height:28px;}
.toni-afrika__num{position:absolute;top:-6px;left:-6px;width:22px;height:22px;border-radius:50%;
  background:#fff;color:var(--ink);font-size:11px;font-weight:850;display:grid;place-items:center;
  box-shadow:0 2px 6px rgba(0,0,0,.18);}
.toni-afrika__body{flex:1;min-width:0;}
.toni-afrika__name{font-size:15px;font-weight:850;line-height:1.18;color:var(--ink);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.toni-afrika__chip{display:inline-flex;align-items:center;gap:5px;margin-top:6px;font-size:10px;
  font-weight:800;padding:3px 9px;border-radius:20px;background:rgba(229,138,46,.16);color:#9A5A1E;}
.toni-afrika__chev{flex:0 0 auto;color:#C2603A;font-size:18px;font-weight:800;}

/* Verbindungslinie zwischen Stopps (gestrichelte Route) */
.toni-afrika__stop::before{content:"";position:absolute;left:39px;top:-14px;height:14px;width:0;
  border-left:3px dashed #D9A86A;}
.toni-afrika__stop:first-child::before{display:none;}

/* ZUSTAND done */
.toni-afrika__stop.done .toni-afrika__marker{background:linear-gradient(160deg,#5B9E3A,#3E7D2A);
  box-shadow:0 6px 18px rgba(91,158,58,.4);}
.toni-afrika__stop.done{border-color:#9FCF7A;}
/* ZUSTAND current */
.toni-afrika__stop.current{border-color:var(--pink);box-shadow:0 0 0 3px rgba(229,138,46,.22),0 10px 26px rgba(120,72,30,.2);}
.toni-afrika__stop.current .toni-afrika__marker{animation:toniAfrikaBob 2s ease-in-out infinite;}
@keyframes toniAfrikaBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
/* ZUSTAND locked */
.toni-afrika__stop.locked{cursor:default;opacity:.7;}
.toni-afrika__stop.locked .toni-afrika__marker{background:#c2cdd9;color:#fff;box-shadow:none;}

/* versteckte Aufgaben-Quelle (wird ins Dock gespiegelt) */
.toni-afrika__tasks{display:none;}

/* ===== Dock (feste Aufgaben-Leiste unten) – Muster aus Haus ===== */
.toni-afrika__dock{position:fixed;left:0;right:0;bottom:0;z-index:4600;
  max-width:560px;margin:0 auto;
  background:linear-gradient(180deg,#FFF6E9,#FBE6C8);border:2px solid var(--line);
  border-bottom:none;border-radius:20px 20px 0 0;box-shadow:0 -12px 40px rgba(120,72,30,.22);
  transform:translateY(110%);transition:transform .34s cubic-bezier(.22,1,.36,1);
  padding:8px 16px 18px;}
.toni-afrika__dock.open{transform:translateY(0);}
.toni-afrika__dock-head{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:6px 2px 10px;}
.toni-afrika__dock-title{font-size:15px;font-weight:850;color:var(--ink);}
.toni-afrika__dock-close{border:none;background:rgba(229,138,46,.18);color:#9A5A1E;border-radius:9px;
  padding:7px 12px;font-size:12px;font-weight:800;cursor:pointer;font-family:inherit;}
.toni-afrika__dock-close:hover{background:rgba(229,138,46,.32);}
.toni-afrika__dock-body{display:flex;flex-wrap:wrap;gap:9px;max-height:42vh;overflow-y:auto;}
.toni-afrika__dock-empty{color:var(--ink-soft);font-size:13px;padding:6px 2px 10px;}

/* Aufgaben-Karten (Tasks) – afrikanisch mit Muster, je Typ farbig */
.toni-afrika__task{position:relative;display:flex;align-items:center;gap:10px;cursor:pointer;
  padding:10px 13px;border-radius:13px;
  background:
    repeating-linear-gradient(45deg,color-mix(in srgb,var(--cc,#E58A2E) 14%,transparent) 0 7px,transparent 7px 14px),
    linear-gradient(160deg,#FFFBF2,#FBEAD2);
  border:2px solid color-mix(in srgb,var(--cc,#E58A2E) 55%,transparent);
  min-width:150px;transition:transform .1s ease,border-color .2s ease,box-shadow .2s ease;}
.toni-afrika__task:hover{transform:translateY(-2px);box-shadow:0 6px 16px color-mix(in srgb,var(--cc,#E58A2E) 35%,transparent);}
.toni-afrika__task:focus-visible{outline:3px solid var(--cc,#E58A2E);outline-offset:2px;}
.toni-afrika__task.locked{cursor:default;opacity:.5;}
.toni-afrika__task.locked:hover{transform:none;box-shadow:none;}
.toni-afrika__tico{width:36px;height:36px;flex:0 0 36px;border-radius:10px;display:grid;place-items:center;
  background:var(--cc,#E58A2E);color:#fff;
  border:2px solid color-mix(in srgb,var(--cc,#888) 70%,#000 12%);
  box-shadow:0 3px 8px color-mix(in srgb,var(--cc,#E58A2E) 45%,transparent);}
.toni-afrika__tico svg{width:21px;height:21px;}
.toni-afrika__tmeta{min-width:0;}
.toni-afrika__tlabel{font-size:12px;font-weight:800;line-height:1.15;color:var(--ink);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.toni-afrika__ttype{font-size:9px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;
  color:#9A6A3E;margin-top:1px;}
.toni-afrika__task.done .toni-afrika__tico{background:var(--done);color:#fff;border-color:var(--done);}
.toni-afrika__tnum{font-size:9px;font-weight:850;color:#9A6A3E;}

@media (prefers-reduced-motion: reduce){
  .toni-afrika *{animation:none !important;}
  .af-walk-eleph{transform:translate(480px,196px);}
  .af-walk-lion{transform:translate(600px,196px);}
  .af-walk-giraffe{transform:translate(900px,96px);}
  .af-sun-rise{transform:translateY(0);}
}
/* Handy hochkant: nur mittlerer Ausschnitt (Bäume+Tiere), ca. 1/3 Höhe.
   Am Block-Ende + erhöhte Spezifität + !important, damit nichts überschreibt. */
@media (max-width:640px){
  .toni-afrika .toni-afrika__skyline{height:34vh !important;min-height:200px !important;max-height:300px !important;}
  .toni-afrika .toni-afrika__skyline svg{
    position:absolute !important;left:50% !important;bottom:0 !important;top:auto !important;
    transform:translateX(-50%) !important;width:auto !important;height:115% !important;min-width:560px !important;}
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

/* Aufgaben-Detail (Modal) im tiefdunklen Afrika-Look */
body.toni-afrika-fullscreen #lr-task-modal.lr-modal-backdrop,
body.toni-afrika-fullscreen #lr-task-modal{z-index:5000 !important;}
body.toni-afrika-fullscreen #lr-task-modal .lr-modal,
body.toni-afrika-fullscreen #lr-task-modal .lr-modal-card,
body.toni-afrika-fullscreen #lr-task-modal > div{
  border:2px solid #5A3A22 !important;}
/* Kopfbereich (farbige Fläche oben) tiefdunkel-erdig */
body.toni-afrika-fullscreen #lr-task-modal .lr-modal-header,
body.toni-afrika-fullscreen #lr-task-modal .lr-task-head,
body.toni-afrika-fullscreen #lr-task-modal [class*="header"]{
  background:linear-gradient(135deg,#3E2A18,#5A3A22) !important;border-bottom:3px solid ${ACCENT} !important;}
body.toni-afrika-fullscreen #lr-task-modal .lr-modal-header *,
body.toni-afrika-fullscreen #lr-task-modal .lr-task-head *,
body.toni-afrika-fullscreen #lr-task-modal [class*="header"] *{color:#FFF6E9 !important;}
/* Schließen-Button im Kopf bleibt lesbar (heller Knopf, dunkle Schrift) */
body.toni-afrika-fullscreen #lr-task-modal .lr-modal-header button,
body.toni-afrika-fullscreen #lr-task-modal .lr-close-btn{
  background:#FFF6E9 !important;border:1px solid ${ACCENT} !important;}
body.toni-afrika-fullscreen #lr-task-modal .lr-modal-header button,
body.toni-afrika-fullscreen #lr-task-modal .lr-modal-header button *,
body.toni-afrika-fullscreen #lr-task-modal .lr-close-btn,
body.toni-afrika-fullscreen #lr-task-modal .lr-close-btn *{color:#3E2A18 !important;}
/* farbige Icon-/Badge-Flächen tiefdunkel-erdig */
body.toni-afrika-fullscreen #lr-task-modal [class*="badge"],
body.toni-afrika-fullscreen #lr-task-modal .lr-task-typeicon,
body.toni-afrika-fullscreen #lr-task-modal [class*="icon-wrap"]{
  background:linear-gradient(135deg,#5A3A22,#7A4A1E) !important;color:#FFF6E9 !important;}
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
'<svg viewBox="0 -80 1220 380" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">' +
  '<defs>' +
    '<linearGradient id="afSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D9A8"/><stop offset="0.6" stop-color="#E8A765"/><stop offset="1" stop-color="#D98A4A"/></linearGradient>' +
    '<radialGradient id="afSun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#FBE08A"/><stop offset="1" stop-color="#F2B23D"/></radialGradient>' +
    '<linearGradient id="afRiver" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#56C7D4"/><stop offset="1" stop-color="#2E97A6"/></linearGradient>' +
    '<linearGradient id="afGround" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7A5230"/><stop offset="1" stop-color="#5A3A22"/></linearGradient>' +
  '</defs>' +
  // ferne Hügel
  '<path d="M0,210 Q300,170 620,200 T1220,192 L1220,300 L0,300 Z" fill="#D98A4A" opacity="0.6"/>' +
  // Sonne geht auf/unter (Gruppe wird animiert)
  '<g class="af-sun-rise"><circle class="af-sun" cx="610" cy="70" r="46" fill="url(#afSun)"/></g>' +
  // Wolken: zwei langsame, zwei schnellere – ziehen von links nach rechts
  '<g class="af-cloud-slow1">' + cloud(0, 70) + '</g>' +
  '<g class="af-cloud-slow2">' + cloud(0, 120) + '</g>' +
  '<g class="af-cloud-fast1">' + cloud(0, 50) + '</g>' +
  '<g class="af-cloud-fast2">' + cloud(0, 100) + '</g>' +
  // Fluss + Uferband
  '<path d="M0,250 Q360,225 760,245 T1220,240 L1220,300 L0,300 Z" fill="url(#afRiver)"/>' +
  '<path d="M0,268 Q360,248 760,264 T1220,260 L1220,300 L0,300 Z" fill="url(#afGround)"/>' +
  // Akazienbäume (Ränder)
  acacia(70, 150) + acacia(1130, 160) +
  // Zwei größere Bäume links und rechts der Mitte
  bigTree(470, 120) + bigTree(770, 120) +
  // Zebra grast unter dem rechten Baum (Blick nach links) – aufwändig, nach Vorbild
  '<g transform="translate(770,188)">' +
    // hinteres Bein-Paar
    '<rect x="22" y="58" width="9" height="30" rx="4" fill="#F2EFE9"/><rect x="34" y="58" width="9" height="30" rx="4" fill="#EDE8E0"/>' +
    '<rect x="20" y="82" width="13" height="7" rx="2" fill="#2E2A26"/><rect x="33" y="82" width="12" height="7" rx="2" fill="#2E2A26"/>' +
    // Körper (rundlich)
    '<ellipse cx="6" cy="42" rx="44" ry="26" fill="#F7F4EE"/>' +
    // geschwungene Körperstreifen: Sichelformen, dünn->dick->dünn
    '<g fill="#2E2A26">' +
      '<path d="M-26 22 q5 20 1 40 q-4 -2 -6 -3 q3 -19 -1 -36 q3 -1 6 -1 z"/>' +
      '<path d="M-14 19 q6 22 1 44 q-5 -1 -8 -3 q4 -21 -1 -40 q4 -1 8 -1 z"/>' +
      '<path d="M0 18 q7 23 1 46 q-6 -1 -9 -2 q5 -22 -1 -43 q5 -1 9 -1 z"/>' +
      '<path d="M15 19 q6 22 1 43 q-5 -1 -8 -2 q4 -21 -1 -40 q4 -1 8 -1 z"/>' +
      '<path d="M29 22 q5 19 1 38 q-4 -1 -6 -2 q3 -18 -1 -35 q3 -1 6 -1 z"/>' +
    '</g>' +
    // vorderes Bein-Paar
    '<rect x="-24" y="58" width="9" height="30" rx="4" fill="#F2EFE9"/><rect x="-12" y="58" width="9" height="30" rx="4" fill="#EDE8E0"/>' +
    '<rect x="-26" y="82" width="13" height="7" rx="2" fill="#2E2A26"/><rect x="-13" y="82" width="12" height="7" rx="2" fill="#2E2A26"/>' +
    // buschiger Schweif mit schwarzer Quaste
    '<path d="M48 30 q18 8 16 30" stroke="#F2EFE9" stroke-width="5" fill="none"/>' +
    '<path d="M60 50 q6 8 3 20 q-7 -2 -9 -10 q2 -6 6 -10 z" fill="#2E2A26"/>' +
    // Hals + Kopf grasend nach links unten (animiert)
    '<g class="af-graze" style="transform-origin:-34px 30px">' +
      // Hals
      '<path d="M-30 26 q-18 6 -30 30 q6 8 14 6 q10 -18 24 -22 z" fill="#F7F4EE"/>' +
      // Halsstreifen (Mähnenansatz)
      '<g fill="#2E2A26">' +
        '<path d="M-30 22 q-3 8 -6 14 q-3 -1 -5 -2 q3 -6 5 -13 q3 0 6 1 z"/>' +
        '<path d="M-40 30 q-3 8 -7 14 q-3 -1 -4 -2 q4 -6 6 -13 q3 0 5 1 z"/>' +
      '</g>' +
      // Stehmähne
      '<path d="M-28 18 l4 -10 l3 9 l3 -10 l3 10 l3 -9 l3 10 q-10 2 -19 0 z" fill="#2E2A26"/>' +
      // Kopf
      '<ellipse cx="-60" cy="54" rx="18" ry="14" fill="#F7F4EE" transform="rotate(28 -60 54)"/>' +
      // Schnauze dunkel
      '<ellipse cx="-72" cy="62" rx="9" ry="7" fill="#3A332E" transform="rotate(28 -72 62)"/>' +
      // Ohren (zwei)
      '<path d="M-50 40 l-2 -14 l10 8 z" fill="#F7F4EE"/><path d="M-49 39 l-1 -9 l6 5 z" fill="#C9A0C0"/>' +
      '<path d="M-40 44 l4 -13 l8 10 z" fill="#F7F4EE"/><path d="M-39 43 l2 -8 l5 6 z" fill="#C9A0C0"/>' +
      // Kopfstreifen
      '<g fill="#2E2A26">' +
        '<path d="M-54 44 q-2 6 -5 10 q-2 -1 -3 -2 q3 -4 5 -9 q2 0 3 1 z"/>' +
        '<path d="M-48 46 q-2 6 -4 10 q-2 -1 -3 -2 q2 -4 4 -9 q2 0 3 1 z"/>' +
      '</g>' +
      // großes freundliches Auge
      '<circle cx="-58" cy="50" r="4.2" fill="#2E2A26"/><circle cx="-59.4" cy="48.6" r="1.5" fill="#fff"/>' +
      // Nüstern
      '<circle cx="-78" cy="62" r="1.6" fill="#1c1814"/>' +
    '</g>' +
    '<path d="M-78 90 l3 -12 l3 12 M-70 90 l3 -14 l3 14" stroke="#5B9E3A" stroke-width="3" fill="none"/>' +
  '</g>' +
  // ===== Feste Szene-Objekte am Ufer =====
  // Akazienbaum, unter dem die Wasserträgerin steht
  acacia(430, 150) +
  // Wasserträgerin (etwas weiter rechts; wiegt sich leicht)
  '<g class="af-sway" style="transform-origin:430px 250px">' +
    '<ellipse cx="430" cy="120" rx="22" ry="16" fill="#5A3A22"/>' + // Krug auf dem Kopf
    '<rect x="420" y="132" width="20" height="14" fill="#5B9E3A"/>' +
    '<circle cx="430" cy="158" r="16" fill="#6B4A2B"/>' + // Kopf
    '<rect x="420" y="172" width="20" height="40" rx="6" fill="#5A3A22"/>' +
    '<path d="M420 212 h20 l8 38 h-36 z" fill="#3E7D2A"/>' + // Wickelrock
    '<rect x="412" y="176" width="7" height="34" rx="3" fill="#6B4A2B"/><rect x="441" y="176" width="7" height="34" rx="3" fill="#6B4A2B"/>' +
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
  // Löwe wandert (gespiegelt, damit Kopf in Laufrichtung zeigt)
  '<g class="af-walk-lion">' +
    '<g transform="translate(100,0) scale(-1,1)">' +
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
    '<path class="af-trunk" d="M-14 36 q-16 26 -2 44" stroke="#9A9AA0" stroke-width="11" fill="none" stroke-linecap="round"/>' +
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

  // Größerer, runder Laubbaum (kräftige Krone)
  function bigTree(x, baseY) {
    return '<g transform="translate(' + x + ',' + baseY + ')">' +
      '<rect x="-7" y="0" width="14" height="96" rx="3" fill="#5A3A22"/>' +
      '<line x1="0" y1="40" x2="-26" y2="22" stroke="#5A3A22" stroke-width="6"/>' +
      '<line x1="0" y1="40" x2="26" y2="22" stroke="#5A3A22" stroke-width="6"/>' +
      '<ellipse class="af-canopy" cx="0" cy="-14" rx="60" ry="46" fill="#5B9E3A" style="transform-origin:0 -14px"/>' +
      '<ellipse cx="-40" cy="6" rx="30" ry="22" fill="#4E8A32"/><ellipse cx="40" cy="6" rx="30" ry="22" fill="#4E8A32"/>' +
      '<ellipse cx="0" cy="-26" rx="36" ry="26" fill="#6BB048" opacity=".7"/>' +
    '</g>';
  }

  // Wolke (mehrere weiche Ballen)
  function cloud(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')" opacity="0.55">' +
      '<ellipse cx="0" cy="0" rx="34" ry="18" fill="#fff"/>' +
      '<ellipse cx="28" cy="6" rx="30" ry="16" fill="#fff"/>' +
      '<ellipse cx="-26" cy="6" rx="26" ry="14" fill="#fff"/>' +
      '<ellipse cx="6" cy="-10" rx="22" ry="14" fill="#fff"/>' +
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

  console.info("[TONI-Theme:afrika] London-Theme registriert (theme-afrika-v8-cascadefix).");
})();
