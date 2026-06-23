/* ============================================================
 * TONI – Lernreisen-Theme: "Fußball / Weg zum Pokal"
 * Datei: journey_theme_football.js
 * Build: theme-football-v3-pro
 *
 * Schwester-Theme zu "Weltall". Stellt die Stationen einer Lernreise als
 * Spielstationen auf einem vertikalen Fußballplatz dar (Anstoß unten,
 * Tor + Pokal oben). Aufgaben einer Station erscheinen als Mitspieler-
 * Trikots mit Rückennummern, die sich nach Klick auf die Station
 * "freilaufen" (auffächern) und per window.openLearningTask(id) öffnen.
 *
 * Architektur identisch zum Weltall-Theme:
 *  - Auto-Layout für beliebige Stationszahl (Pass-Linie via Catmull-Rom).
 *  - Vollbild (randlos, alle Größen) + Body-Scroll-Lock, gegated über
 *    body.toni-football-fullscreen (eigenes Präfix, unabhängig vom Weltall).
 *  - Aufgaben-Detail (lr-task-modal) als Trainer-Taktiktafel; Inhalt bleibt
 *    ruhig lesbar (Variablen-Override, Renderer unangetastet).
 *  - Bewegung dezent; bei prefers-reduced-motion komplett aus.
 *
 * Farbwelt: Rasengrün, Linienweiß, Trikotrot-Akzent (#E2342B),
 * Flutlicht-Gelb (#FFD24A) für Highlights.
 * ============================================================ */

(function () {
  "use strict";

  if (!window.toniThemes || typeof window.toniThemes.register !== "function") {
    console.error("[TONI-Theme:football] Theme-Engine nicht gefunden – Theme wird nicht registriert.");
    return;
  }

  const ACCENT = "#E2342B";      // Trikotrot
  const LIGHT = "#FFD24A";       // Flutlicht-Gelb

  const TYPE_COLOR = {
    Lerninhalt: "#4DA6FF",
    Aufgabe: "#FF7A3C",
    Quiz: "#FFC857",
    Reflexion: "#3DDC97",
    Video: "#C66BFF"
  };

  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    // Ball für die aktuelle Station
    ball: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7l3.5 2.5-1.3 4.1h-4.4L8.5 9.5 12 7z" fill="currentColor" stroke="none"/></svg>',
    whistle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11a4 4 0 0 1 4-4h10l4-2v6a7 7 0 0 1-14 0z"/><circle cx="7" cy="13" r="1.5"/></svg>',
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

  /* ---- AUTO-LAYOUT (Pass-Linie) ---- */
  const VW = 1000;
  const FIELD_INSET = 90;        // Abstand der Außenlinie zum Bildschirmrand (vorher 20) -> schmaleres Feld, mehr Rand
  const MARGIN_X = 235;          // seitlicher Ausschlag der Stationen (etwas reduziert wg. schmalerem Feld)
  const STEP_GAP = 320;          // vertikaler Abstand der Stationen (vergrößert, da Trikots ~2x so groß)
  const PAD_TOP = 235;
  const PAD_BOTTOM = 225;

  function computeLayout(n) {
    const vh = PAD_TOP + PAD_BOTTOM + Math.max(1, n - 1) * STEP_GAP;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const y = vh - PAD_BOTTOM - i * STEP_GAP;
      const phase = Math.sin(i * 1.15 + 0.4);
      const x = VW / 2 + phase * MARGIN_X;
      pts.push({ x: Math.round(x), y: Math.round(y) });
    }
    const start = { x: VW / 2, y: vh - 55 };
    const goal = { x: VW / 2, y: PAD_TOP - 70 };
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

  /* ---- INTERAKTION: Station wählen + Mitspieler freilaufen lassen ---- */
  window.toniFootballToggleStation = function (index) {
    const root = document.querySelector(".toni-fb");
    if (!root) return;
    const player = root.querySelector('.toni-fb__player[data-step-index="' + index + '"]');
    if (!player || player.classList.contains("locked")) return;
    const already = player.classList.contains("expanded");
    root.querySelectorAll(".toni-fb__player.expanded").forEach(function (p) {
      p.classList.remove("expanded");
    });
    if (!already) player.classList.add("expanded");
    if (typeof window.toniTimelineSelect === "function") {
      try { window.toniTimelineSelect(index); } catch (e) { /* nicht kritisch */ }
    }
  };

  /* ---- KONFETTI: erscheint, sobald eine Station NEU abgeschlossen wurde ----
   * Wir merken uns die zuletzt gesehenen "done"-Stati. Wird beim erneuten
   * Render eine Station done, die es vorher nicht war, regnet Konfetti. */
  let _prevDone = null;            // Set der zuvor abgeschlossenen Indizes
  function triggerConfettiIfNewlyDone(states) {
    const nowDone = states
      .map(function (s, i) { return s === "done" ? i : -1; })
      .filter(function (i) { return i >= 0; });
    const nowSet = {};
    nowDone.forEach(function (i) { nowSet[i] = true; });

    let newly = false;
    if (_prevDone !== null) {
      for (let i = 0; i < nowDone.length; i++) {
        if (!_prevDone[nowDone[i]]) { newly = true; break; }
      }
    }
    _prevDone = nowSet;
    if (newly) {
      // kurz warten, bis das neue HTML im DOM ist
      setTimeout(rainConfetti, 60);
    }
  }

  function rainConfetti() {
    const root = document.querySelector(".toni-fb");
    if (!root) return;
    // evtl. alte Konfetti-Schicht entfernen (Ghost-Cleanup)
    const old = root.querySelector(".toni-fb__confetti-burst");
    if (old) old.remove();

    const cols = [ACCENT, LIGHT, "#4DA6FF", "#3DDC97", "#fff", "#FF7A3C"];
    const layer = document.createElement("div");
    layer.className = "toni-fb__confetti-burst";
    let pieces = "";
    for (let i = 0; i < 70; i++) {
      const left = (Math.random() * 100).toFixed(1);
      const delay = (Math.random() * 0.6).toFixed(2);
      const dur = (2.6 + Math.random() * 1.8).toFixed(2);
      const col = cols[i % cols.length];
      const w = (6 + Math.random() * 6).toFixed(0);
      const h = (9 + Math.random() * 8).toFixed(0);
      const rot = (Math.random() * 360).toFixed(0);
      pieces += `<i style="left:${left}%;width:${w}px;height:${h}px;background:${col};` +
                `animation-delay:${delay}s;animation-duration:${dur}s;` +
                `transform:rotate(${rot}deg)"></i>`;
    }
    layer.innerHTML = pieces;
    root.appendChild(layer);
    // nach der Animation aufräumen
    setTimeout(function () { if (layer && layer.parentNode) layer.remove(); }, 5200);
  }

  /* ---- CSS ---- */
  function injectStyles() {
    if (document.getElementById("toni-theme-football-css")) return;
    const css = `
/* ===== Spielfeld ===== */
.toni-fb{position:relative;width:100%;min-height:100%;border-radius:16px;overflow:hidden;
  background:
    repeating-linear-gradient(180deg,#1B7A3E 0,#1B7A3E 60px,#15692F 60px,#15692F 120px);}
.toni-fb__lines{position:absolute;inset:0;z-index:1;pointer-events:none;}
.toni-fb__crowd{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.16;
  background:radial-gradient(circle at 50% 0,rgba(255,255,255,.4),transparent 40%);}
.toni-fb__pitch{position:relative;z-index:2;width:100%;display:block;}
.toni-fb__pitch svg{display:block;width:100%;height:auto;}

/* ===== Tribünen links & rechts (je 4 Reihen Zuschauer) ===== */
.toni-fb__stand{position:absolute;top:0;bottom:0;width:84px;z-index:1;pointer-events:none;
  display:flex;flex-direction:column;
  background:linear-gradient(90deg,#0c2c1a,#0e3a1f);}
.toni-fb__stand.left{left:0;
  background:linear-gradient(90deg,#0b2616,#0e3a22);
  box-shadow:inset -10px 0 22px rgba(0,0,0,.45);}
.toni-fb__stand.right{right:0;
  background:linear-gradient(270deg,#0b2616,#0e3a22);
  box-shadow:inset 10px 0 22px rgba(0,0,0,.45);}
/* Sitzreihen-Struktur */
.toni-fb__stand::before{content:"";position:absolute;inset:0;
  background:repeating-linear-gradient(180deg,rgba(255,255,255,.05) 0 2px,transparent 2px 26px);}
.toni-fb__stand-rows{position:relative;display:flex;flex-direction:column;justify-content:center;
  gap:14px;height:100%;padding:0 6px;}
.toni-fb__stand-row{display:flex;justify-content:space-around;gap:3px;}
.toni-fb__fan{width:11px;height:11px;border-radius:50% 50% 45% 45%;flex:0 0 auto;
  box-shadow:0 1px 1px rgba(0,0,0,.4);}
/* dezente La-Ola-Welle */
@keyframes toniFanBob{0%,100%{transform:translateY(0);}50%{transform:translateY(-3px);}}
.toni-fb__fan{animation:toniFanBob 2.4s ease-in-out infinite;}

/* Flutlicht-Schimmer (langsame Wanderung) */
.toni-fb__floodlight{position:absolute;left:50%;top:0;width:80%;height:60%;z-index:1;
  transform:translateX(-50%);pointer-events:none;
  background:radial-gradient(ellipse at 50% 0,rgba(255,255,255,.18),transparent 70%);
  animation:toniFloodlight 12s ease-in-out infinite alternate;}
@keyframes toniFloodlight{from{opacity:.4;transform:translateX(-58%);}to{opacity:.85;transform:translateX(-42%);}}

/* ===== Spieler (Station) – ~doppelt so groß ===== */
.toni-fb__player{position:absolute;transform:translate(-50%,-50%);cursor:pointer;z-index:5;
  width:0;display:flex;flex-direction:column;align-items:center;text-align:center;}
.toni-fb__player:focus-visible{outline:none;}
.toni-fb__player:focus-visible .toni-fb__orb{outline:3px solid ${LIGHT};outline-offset:5px;}
.toni-fb__label{position:absolute;top:96px;width:230px;left:50%;transform:translateX(-50%);
  display:flex;flex-direction:column;align-items:center;pointer-events:none;}
.toni-fb__pname{margin-top:2px;font-size:16px;font-weight:750;color:#fff;line-height:1.25;
  text-shadow:0 1px 4px rgba(0,0,0,.85),0 0 8px rgba(0,0,0,.6);
  background:rgba(8,40,20,.55);padding:4px 12px;border-radius:10px;max-width:100%;word-wrap:break-word;}
.toni-fb__orb{width:150px;height:150px;border-radius:50%;position:relative;display:grid;place-items:center;
  background:radial-gradient(circle at 32% 28%,#3a4a3f,#1c2a22);
  box-shadow:0 0 0 5px rgba(255,255,255,.14),0 10px 30px rgba(0,0,0,.5);color:#fff;
  transition:transform .18s ease, box-shadow .18s ease;}
.toni-fb__player:hover .toni-fb__orb{transform:scale(1.05);}
.toni-fb__player.done .toni-fb__orb{background:radial-gradient(circle at 32% 28%,#2E8B57,#176235);}
.toni-fb__player.current .toni-fb__orb{background:radial-gradient(circle at 32% 28%,#2f6b4a,#16402f);
  box-shadow:0 0 0 6px rgba(255,210,74,.32),0 0 40px rgba(255,210,74,.55);}
.toni-fb__player.locked{opacity:.4;cursor:default;}
.toni-fb__player.expanded .toni-fb__orb{box-shadow:0 0 0 6px rgba(226,52,43,.42),0 0 44px rgba(226,52,43,.55);}
.toni-fb__ico{width:62px;height:62px;display:block;}
/* großer Fußball an der aktuellen Station – seitlich-unten platziert, überlappt das Label nicht */
.toni-fb__ballpulse{position:absolute;bottom:-34px;left:auto;right:-30px;transform:none;
  width:72px;height:72px;border-radius:50%;
  background:radial-gradient(circle at 36% 30%,#ffffff,#e9eef0 64%,#cfd6d8);
  box-shadow:0 0 0 3px #16402f,0 6px 16px rgba(0,0,0,.55);
  animation:toniBallPulse 1.6s ease-in-out infinite;z-index:7;
  background-repeat:no-repeat;}
/* Fußball-Pentagon-Muster */
.toni-fb__ballpulse::before{content:"";position:absolute;left:50%;top:50%;
  width:26px;height:26px;transform:translate(-50%,-50%);
  background:#15301f;
  clip-path:polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%);}
.toni-fb__ballpulse::after{content:"";position:absolute;inset:0;border-radius:50%;
  background:
    radial-gradient(circle at 50% -8%,#15301f 0 7px,transparent 8px),
    radial-gradient(circle at 92% 36%,#15301f 0 6px,transparent 7px),
    radial-gradient(circle at 8% 36%,#15301f 0 6px,transparent 7px),
    radial-gradient(circle at 26% 96%,#15301f 0 6px,transparent 7px),
    radial-gradient(circle at 74% 96%,#15301f 0 6px,transparent 7px);}
@keyframes toniBallPulse{0%,100%{transform:scale(1) rotate(0);}
  50%{transform:scale(1.1) rotate(8deg);}}
.toni-fb__tick{position:absolute;right:2px;top:2px;width:36px;height:36px;border-radius:50%;
  background:#3DDC97;color:#0b3b22;display:grid;place-items:center;
  box-shadow:0 2px 8px rgba(0,0,0,.4);}
.toni-fb__tick svg{width:22px;height:22px;}
.toni-fb__dots{margin-top:10px;display:flex;gap:5px;justify-content:center;flex-wrap:wrap;transition:opacity .18s;}
.toni-fb__dots span{width:10px;height:10px;border-radius:50%;display:inline-block;}
.toni-fb__player.expanded .toni-fb__dots{opacity:0;}

/* ===== Mitspieler (Aufgaben) als Trikots – größer ===== */
.toni-fb__squad{position:absolute;left:50%;top:50%;width:0;height:0;z-index:4;pointer-events:none;}
.toni-fb__ring{position:absolute;left:50%;top:50%;border-radius:50%;
  border:1.5px dashed rgba(255,255,255,.45);transform:translate(-50%,-50%);
  opacity:0;transition:opacity .25s ease;}
.toni-fb__player.expanded .toni-fb__ring{opacity:1;}
.toni-fb__mate{position:absolute;left:50%;top:50%;width:64px;height:70px;
  transform:translate(-50%,-50%) scale(.2);opacity:0;pointer-events:none;cursor:pointer;
  transition:transform .26s cubic-bezier(.34,1.4,.5,1),opacity .2s ease;}
.toni-fb__player.expanded .toni-fb__mate{opacity:1;pointer-events:auto;}
/* Trikot-Form */
.toni-fb__shirt{position:absolute;inset:0;display:grid;place-items:center;
  filter:drop-shadow(0 3px 6px rgba(0,0,0,.5));}
.toni-fb__shirt svg{width:100%;height:100%;}
.toni-fb__num{position:absolute;left:50%;top:54%;transform:translate(-50%,-50%);
  font-size:21px;font-weight:850;color:#fff;text-shadow:0 1px 3px rgba(0,0,0,.7);}
.toni-fb__typeico{position:absolute;left:50%;top:24%;transform:translate(-50%,-50%);
  width:20px;height:20px;color:#fff;opacity:.92;}
.toni-fb__mate:hover{transform:translate(var(--mx),var(--my)) scale(1.16) !important;z-index:9;}
.toni-fb__mate:focus-visible{outline:3px solid #fff;outline-offset:2px;}
.toni-fb__mlabel{position:absolute;top:72px;left:50%;transform:translateX(-50%);white-space:nowrap;
  font-size:12.5px;font-weight:650;color:#fff;background:rgba(8,40,20,.92);padding:3px 9px;border-radius:8px;
  opacity:0;pointer-events:none;transition:opacity .15s ease;box-shadow:0 2px 8px rgba(0,0,0,.45);}
.toni-fb__mate:hover .toni-fb__mlabel,.toni-fb__mate:focus-visible .toni-fb__mlabel{opacity:1;}
.toni-fb__matetick{position:absolute;right:-2px;bottom:10px;width:22px;height:22px;border-radius:50%;
  background:#3DDC97;color:#0b3b22;display:grid;place-items:center;border:2px solid #15692F;}
.toni-fb__matetick svg{width:14px;height:14px;}
.toni-fb__mate.locked{opacity:.4;cursor:default;filter:grayscale(.6);}

/* ===== Ziel: Tor + Pokal ===== */
.toni-fb__goaltext{position:absolute;transform:translate(-50%,-50%);z-index:4;text-align:center;
  color:${LIGHT};font-size:13px;font-weight:800;text-shadow:0 1px 6px rgba(0,0,0,.7);}

/* ===== Eckfahnen – 4x so groß ===== */
.toni-fb__flag{position:absolute;width:104px;height:136px;z-index:3;pointer-events:none;}
.toni-fb__flag.tl{top:18px;left:18px;}.toni-fb__flag.tr{top:18px;right:18px;}
.toni-fb__flag.bl{bottom:18px;left:18px;}.toni-fb__flag.br{bottom:18px;right:18px;}
.toni-fb__flag.tr .cloth,.toni-fb__flag.br .cloth{transform-origin:right center;}
.toni-fb__flag .cloth{transform-origin:left center;animation:toniFlagWave 2.2s ease-in-out infinite;}
@keyframes toniFlagWave{0%,100%{transform:skewX(0) scaleX(1);}50%{transform:skewX(-12deg) scaleX(.9);}}

/* ===== Konfetti-Regen bei NEU erreichter Station ===== */
.toni-fb__confetti-burst{position:absolute;inset:0;z-index:30;pointer-events:none;overflow:hidden;}
.toni-fb__confetti-burst i{position:absolute;top:-24px;width:9px;height:14px;border-radius:1px;
  opacity:0;animation:toniFbConfetti linear forwards;}
@keyframes toniFbConfetti{
  0%{opacity:0;transform:translateY(-20px) rotate(0);}
  8%{opacity:1;}
  100%{opacity:0;transform:translateY(105vh) rotate(680deg);}}

@media (prefers-reduced-motion: reduce){
  .toni-fb__floodlight,.toni-fb__ballpulse,.toni-fb__flag .cloth{animation:none;}
  .toni-fb__confetti-burst{display:none;}
}

/* ============================================================
 * VOLLBILD (randlos, alle Größen) + Body-Scroll-Lock
 * Gegated über body.toni-football-fullscreen (eigenes Präfix).
 * ============================================================ */
body.toni-football-fullscreen{overflow:hidden !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football.lr-modal-backdrop,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football{
  position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;
  max-width:none !important;max-height:none !important;margin:0 !important;
  padding:0 !important;border:none !important;border-radius:0 !important;
  box-shadow:none !important;overflow:hidden !important;
  background:#15692F !important;z-index:4000 !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-modal,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-modal-card,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football > div{
  max-width:none !important;width:100% !important;height:100% !important;
  border:none !important;border-radius:0 !important;background:transparent !important;
  box-shadow:none !important;overflow:hidden !important;display:flex !important;flex-direction:column !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-modal-body{
  padding:0 !important;margin:0 !important;background:transparent !important;
  border:none !important;border-radius:0 !important;box-shadow:none !important;
  flex:1 1 auto !important;height:auto !important;min-height:0 !important;max-height:none !important;
  overflow-y:auto !important;overflow-x:hidden !important;
  overscroll-behavior:contain !important;-webkit-overflow-scrolling:touch;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-detail-grid,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-main-card{
  padding:0 !important;margin:0 !important;background:transparent !important;
  border:none !important;border-radius:0 !important;box-shadow:none !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .toni-fb{
  overflow:visible !important;border-radius:0 !important;padding-bottom:120px !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-stations{
  padding-bottom:120px !important;}

.toni-theme-active-football .lr-top-split{
  grid-template-columns:1fr !important;grid-template-areas:"stations" "right" !important;}
.toni-theme-active-football .lr-top-split .lr-stations{
  background:transparent !important;padding:0 !important;}

/* Aufräumen wie beim Weltall: Untertitel, Aufgaben-Kacheln, Fortschritt, Deckblatt */
body.toni-football-fullscreen #lr-modal.toni-theme-active-football #lr-modal-sub,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-modal-sub{display:none !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-right-col,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football #lr-right-col{display:none !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-progress-big{display:none !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-cover-screen-v89{display:none !important;}

/* Kopfbereich transparent über dem Rasen, Titel weiß, Buttons hell */
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-modal-header{
  position:absolute !important;top:0 !important;left:0 !important;right:0 !important;
  z-index:30 !important;background:transparent !important;border:none !important;
  box-shadow:none !important;padding:14px 20px !important;
  display:flex !important;align-items:center !important;justify-content:space-between !important;
  pointer-events:none !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-modal-title,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football #lr-modal-title{
  color:#fff !important;background:transparent !important;border:none !important;box-shadow:none !important;
  text-shadow:0 2px 10px rgba(0,0,0,.85),0 0 16px rgba(0,0,0,.6) !important;pointer-events:auto !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-modal-actions{
  pointer-events:auto !important;display:flex !important;gap:8px !important;width:auto !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-modal-actions button,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-close-btn,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-journal-btn{
  background:rgba(8,40,20,.9) !important;color:#fff !important;
  border:1px solid ${LIGHT} !important;box-shadow:0 2px 12px rgba(0,0,0,.45) !important;
  backdrop-filter:blur(5px);}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-modal-actions button *,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-close-btn *,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-journal-btn *{
  color:#fff !important;fill:#fff !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-close-btn:hover,
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-journal-btn:hover{
  background:rgba(20,60,34,.95) !important;}
/* etwas Platz oben, damit erste Station nicht unter dem Header klebt */
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .toni-fb{
  padding-top:58px !important;}

/* z-index: Task-Modal über das Vollbild-Feld */
body.toni-football-fullscreen #lr-task-modal.lr-modal-backdrop,
body.toni-football-fullscreen #lr-task-modal{z-index:5000 !important;}

/* ============================================================
 * AUFGABEN-DETAIL als Trainer-Taktiktafel
 * ============================================================ */
body.toni-football-fullscreen #lr-task-modal{
  --color-background-primary:#0d3b22;
  --color-background-secondary:#134d2e;
  --color-text-primary:#EAF7EE;
  --color-text-secondary:#CFE8D8;
  --color-text-tertiary:#8FBFA1;
  --color-border-tertiary:#1f5a39;
  --color-border-secondary:#2a6e48;
}
body.toni-football-fullscreen #lr-task-modal .lr-modal,
body.toni-football-fullscreen #lr-task-modal .lr-modal-card,
body.toni-football-fullscreen #lr-task-modal > div{
  background:
    repeating-linear-gradient(180deg,#0e3f24 0,#0e3f24 38px,#0c3820 38px,#0c3820 76px) !important;
  color:#EAF7EE !important;border:1px solid #2a6e48 !important;
  box-shadow:0 0 0 1px rgba(255,210,74,.18),0 24px 60px rgba(0,0,0,.6) !important;}
body.toni-football-fullscreen #lr-task-modal .lr-modal-header{
  background:linear-gradient(90deg,rgba(15,64,37,.92),rgba(12,56,32,.6)) !important;
  border-bottom:1px solid rgba(255,210,74,.3) !important;}
body.toni-football-fullscreen #lr-task-modal .lr-modal-header *{color:#fff !important;}
body.toni-football-fullscreen #lr-task-modal #lr-task-content,
body.toni-football-fullscreen #lr-task-modal #lr-task-content *{color:#EAF7EE;}
body.toni-football-fullscreen #lr-task-modal #lr-task-content{
  background:rgba(8,40,20,.5);border:1px dashed rgba(255,255,255,.35);border-radius:12px;padding:14px 16px;}
body.toni-football-fullscreen #lr-task-modal #quiz-options button{
  background:linear-gradient(180deg,#13522f,#0e3f24) !important;border:1px solid #2a6e48 !important;
  color:#EAF7EE !important;box-shadow:inset 0 1px 0 rgba(255,255,255,.06);transition:border-color .15s,transform .1s;}
body.toni-football-fullscreen #lr-task-modal #quiz-options button:hover{
  border-color:${LIGHT} !important;transform:translateY(-1px);}
body.toni-football-fullscreen #lr-task-modal textarea,
body.toni-football-fullscreen #lr-task-modal input.toni-auf-input,
body.toni-football-fullscreen #lr-task-modal #lr-answer{
  background:rgba(8,40,20,.7) !important;color:#EAF7EE !important;
  border:1px solid #2a6e48 !important;border-radius:10px !important;}
body.toni-football-fullscreen #lr-task-modal textarea::placeholder,
body.toni-football-fullscreen #lr-task-modal input::placeholder{color:#7FB295 !important;}
body.toni-football-fullscreen #lr-task-modal .lr-iconbtn-start,
body.toni-football-fullscreen #lr-task-modal .lr-iconbtn-done,
body.toni-football-fullscreen #lr-task-modal .lr-secondary-btn,
body.toni-football-fullscreen #lr-task-modal .lr-success-btn{
  background:linear-gradient(180deg,#1a6b3f,#0e3f24) !important;
  border:1px solid ${LIGHT} !important;color:#FFF3CC !important;
  font-weight:750 !important;}
/* "Erledigt"-Button als FUSSBALL: weißer Ball mit Pentagon-Muster */
body.toni-football-fullscreen #lr-task-modal .lr-success-btn,
body.toni-football-fullscreen #lr-task-modal button.lr-iconbtn-done,
body.toni-football-fullscreen #lr-task-modal button[onclick*="markTaskDone"],
body.toni-football-fullscreen #lr-task-modal button[onclick*="Erledigt"]{
  position:relative !important;
  background:radial-gradient(circle at 38% 32%,#ffffff,#eef2f3 62%,#d3dadc) !important;
  color:#0e3f24 !important;border:2px solid #16402f !important;
  border-radius:14px !important;font-weight:850 !important;
  text-shadow:0 1px 0 rgba(255,255,255,.6) !important;
  box-shadow:0 4px 14px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.8) !important;
  overflow:hidden !important;}
/* Pentagon-Tupfen-Muster dezent im Button-Hintergrund */
body.toni-football-fullscreen #lr-task-modal .lr-success-btn::before,
body.toni-football-fullscreen #lr-task-modal button.lr-iconbtn-done::before,
body.toni-football-fullscreen #lr-task-modal button[onclick*="markTaskDone"]::before{
  content:"" !important;position:absolute !important;inset:0 !important;pointer-events:none !important;
  background:
    radial-gradient(circle at 14% 30%,#16402f 0 7px,transparent 8px),
    radial-gradient(circle at 86% 30%,#16402f 0 7px,transparent 8px),
    radial-gradient(circle at 50% 96%,#16402f 0 8px,transparent 9px);
  opacity:.14 !important;}
body.toni-football-fullscreen #lr-task-modal .lr-success-btn *,
body.toni-football-fullscreen #lr-task-modal button.lr-iconbtn-done *{
  color:#0e3f24 !important;position:relative;z-index:1;}
body.toni-football-fullscreen #lr-task-modal .lr-success-btn:hover{
  filter:brightness(1.04);transform:translateY(-1px);}

/* Aufgaben-Text und Notizfeld klar lesbar (höherer Kontrast als im Screenshot) */
body.toni-football-fullscreen #lr-task-modal #lr-task-content{
  background:rgba(7,34,18,.78) !important;border:1px solid rgba(255,255,255,.28) !important;
  color:#F2FBF5 !important;}
body.toni-football-fullscreen #lr-task-modal textarea,
body.toni-football-fullscreen #lr-task-modal input.toni-auf-input,
body.toni-football-fullscreen #lr-task-modal #lr-answer{
  background:rgba(6,28,15,.85) !important;color:#F4FCF7 !important;
  border:1.5px solid #2a6e48 !important;border-radius:10px !important;}
`;
    const el = document.createElement("style");
    el.id = "toni-theme-football-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---- Vollbild-Schalter ---- */
  function enableFullscreen() {
    document.body.classList.add("toni-football-fullscreen");
    watchModalClose();
  }
  function disableFullscreen() {
    document.body.classList.remove("toni-football-fullscreen");
  }
  let _obs = null;
  function watchModalClose() {
    if (_obs) return;
    const modal = document.getElementById("lr-modal");
    if (!modal || typeof MutationObserver !== "function") return;
    _obs = new MutationObserver(function () {
      const open = modal.classList.contains("open") ||
                   modal.style.display === "flex" || modal.style.display === "block";
      const stillFb = modal.className.indexOf("toni-theme-active-football") >= 0;
      if (!open || !stillFb) disableFullscreen();
    });
    _obs.observe(modal, { attributes: true, attributeFilter: ["class", "style"] });
  }

  /* ---- RENDER ---- */
  function renderStations(journey) {
    injectStyles();
    enableFullscreen();

    const steps = (journey && journey.steps) || [];
    const n = steps.length;
    if (n === 0) {
      return `<div class="toni-fb" style="padding:40px;text-align:center;color:#EAF7EE">` +
             `Diese Lernreise hat noch keine Stationen.</div>`;
    }

    const L = computeLayout(n);
    const states = steps.map((s, i) => stationStatus(s, i, journey));
    const curIdx = states.indexOf("current");
    const allDone = states.every(function (s) { return s === "done"; });

    const allPts = [L.start].concat(L.pts).concat([L.goal]);
    const fullD = spline(allPts);
    const walkedUpto = curIdx >= 0 ? curIdx : states.lastIndexOf("done");
    const walkedPts = [L.start].concat(L.pts.slice(0, Math.max(0, walkedUpto + 1)));
    const walkedD = walkedUpto >= 0 ? spline(walkedPts) : "";

    // Spielfeld-Linien als SVG (Mittelkreis, Mittellinie, Strafräume, Pass-Linie, Tore mit Netz)
    const cx = L.vw / 2;
    const FX = FIELD_INSET;                 // linker/rechter Linien-Abstand
    const fieldW = L.vw - FX * 2;
    const boxW = 360, boxH = 150;           // Strafraum
    const goalW = 150, goalNetH = 56;       // sichtbares Tor mit Netz
    function netLines(gx, gy, w, h, up) {
      // Netz-Gitter innerhalb des Tors. up=true: Netz nach oben (oberes Tor), sonst nach unten.
      const dir = up ? -1 : 1;
      let d = "";
      const cols = 8, rows = 4;
      for (let c = 0; c <= cols; c++) {
        const x = gx - w / 2 + (w / cols) * c;
        d += `M ${x} ${gy} L ${x} ${gy + dir * h} `;
      }
      for (let r = 0; r <= rows; r++) {
        const yy = gy + dir * (h / rows) * r;
        d += `M ${gx - w / 2} ${yy} L ${gx + w / 2} ${yy} `;
      }
      return d;
    }
    const svg =
      `<svg viewBox="0 0 ${L.vw} ${L.vh}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
        `<defs><linearGradient id="toniPass" x1="0" y1="1" x2="0" y2="0">` +
          `<stop offset="0" stop-color="${ACCENT}"/><stop offset="1" stop-color="${LIGHT}"/>` +
        `</linearGradient></defs>` +
        // Außenlinie (schmaler -> größerer Rand)
        `<rect x="${FX}" y="40" width="${fieldW}" height="${L.vh - 80}" fill="none" ` +
          `stroke="rgba(255,255,255,.6)" stroke-width="3"/>` +
        // Mittellinie + Mittelkreis
        `<line x1="${FX}" y1="${L.vh / 2}" x2="${L.vw - FX}" y2="${L.vh / 2}" ` +
          `stroke="rgba(255,255,255,.55)" stroke-width="3"/>` +
        `<circle cx="${cx}" cy="${L.vh / 2}" r="78" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"/>` +
        `<circle cx="${cx}" cy="${L.vh / 2}" r="7" fill="rgba(255,255,255,.65)"/>` +
        // Strafraum oben + unten
        `<rect x="${cx - boxW / 2}" y="40" width="${boxW}" height="${boxH}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"/>` +
        `<rect x="${cx - boxW / 2}" y="${L.vh - 40 - boxH}" width="${boxW}" height="${boxH}" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="3"/>` +
        // Pass-Linie
        `<path d="${fullD}" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="3.5" ` +
          `stroke-linecap="round" stroke-dasharray="2 14"/>` +
        (walkedD ? `<path d="${walkedD}" fill="none" stroke="url(#toniPass)" stroke-width="6" stroke-linecap="round"/>` : "") +
        // ===== OBERES TOR (Ziel) mit Netz =====
        `<g>` +
          `<path d="${netLines(cx, 40, goalW, goalNetH, true)}" stroke="rgba(255,255,255,.45)" stroke-width="1"/>` +
          `<rect x="${cx - goalW / 2}" y="${40 - goalNetH}" width="${goalW}" height="${goalNetH}" fill="rgba(255,255,255,.06)"/>` +
          `<path d="M ${cx - goalW / 2} 40 L ${cx - goalW / 2} ${40 - goalNetH} L ${cx + goalW / 2} ${40 - goalNetH} L ${cx + goalW / 2} 40" ` +
            `fill="none" stroke="#fff" stroke-width="4"/>` +
        `</g>` +
        // ===== UNTERES TOR (Anstoß) mit Netz =====
        `<g>` +
          `<path d="${netLines(cx, L.vh - 40, goalW, goalNetH, false)}" stroke="rgba(255,255,255,.45)" stroke-width="1"/>` +
          `<rect x="${cx - goalW / 2}" y="${L.vh - 40}" width="${goalW}" height="${goalNetH}" fill="rgba(255,255,255,.06)"/>` +
          `<path d="M ${cx - goalW / 2} ${L.vh - 40} L ${cx - goalW / 2} ${L.vh - 40 + goalNetH} L ${cx + goalW / 2} ${L.vh - 40 + goalNetH} L ${cx + goalW / 2} ${L.vh - 40}" ` +
            `fill="none" stroke="#fff" stroke-width="4"/>` +
        `</g>` +
        // Pokal im oberen Tor
        `<g transform="translate(${L.goal.x},${L.goal.y})">` +
          `<path d="M-10 6 h20 l-2.5 12 h-15 z M-15 6 h30 M-7 18 h14 v5 h-14 z" fill="${LIGHT}" stroke="#C9920F" stroke-width="1.2"/>` +
        `</g>` +
      `</svg>`;

    // Spieler + Mitspieler
    let playersHTML = "";
    for (let i = 0; i < n; i++) {
      const s = steps[i];
      const st = states[i];
      const p = L.pts[i];
      const leftPct = (p.x / L.vw * 100).toFixed(2);
      const topPct = (p.y / L.vh * 100).toFixed(2);
      const tasks = (s.tasks || []);

      const typeDots = tasks.slice(0, 6).map(function (t) {
        const c = TYPE_COLOR[normType(t.type)] || "#cbd5d0";
        return `<span style="background:${c}"></span>`;
      }).join("");

      const mateCount = tasks.length;
      const ringR = 78 + Math.min(3, Math.max(0, mateCount - 4)) * 10;
      let matesHTML = "";
      if (mateCount > 0) {
        matesHTML += `<div class="toni-fb__ring" style="width:${ringR * 2}px;height:${ringR * 2}px"></div>`;
        for (let m = 0; m < mateCount; m++) {
          const t = tasks[m];
          const tt = normType(t.type);
          const col = TYPE_COLOR[tt] || "#cbd5d0";
          const ang = (-90 + (360 / mateCount) * m) * Math.PI / 180;
          const mx = Math.cos(ang) * ringR;
          const my = Math.sin(ang) * ringR;
          const mateLocked = (st === "locked");
          const done = t.status === "done";
          const tick = done ? `<span class="toni-fb__matetick">${ICON.check}</span>` : "";
          const handlers = mateLocked
            ? `aria-disabled="true"`
            : `role="button" tabindex="0" ` +
              `onclick="event.stopPropagation();openLearningTask('${esc(t.id)}')" ` +
              `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();event.stopPropagation();openLearningTask('${esc(t.id)}');}"`;
          // Trikot-SVG, in Typfarbe eingefärbt
          const shirt =
            `<span class="toni-fb__shirt"><svg viewBox="0 0 40 40" fill="${col}">` +
              `<path d="M13 6 L20 10 L27 6 L36 12 L31 19 L31 36 L9 36 L9 19 L4 12 Z" ` +
                `stroke="rgba(255,255,255,.7)" stroke-width="1.5"/></svg></span>`;
          matesHTML +=
            `<div class="toni-fb__mate ${mateLocked ? "locked" : ""}" ` +
              `style="--mx:${mx.toFixed(1)}px;--my:${my.toFixed(1)}px;` +
              `transform:translate(${mx.toFixed(1)}px,${my.toFixed(1)}px);" ${handlers}>` +
              shirt +
              `<span class="toni-fb__typeico">${typeIcon(tt)}</span>` +
              `<span class="toni-fb__num">${m + 1}</span>` +
              tick +
              `<span class="toni-fb__mlabel">${m + 1}. ${esc(t.title)}</span>` +
            `</div>`;
        }
      }

      const orbIcon = st === "done" ? ICON.check : st === "locked" ? ICON.lock : ICON.whistle;
      const tick = st === "done" ? `<span class="toni-fb__tick">${ICON.check}</span>` : "";
      const ballPulse = st === "current" ? `<span class="toni-fb__ballpulse"></span>` : "";

      const interactive = st !== "locked";
      const handlers = interactive
        ? `role="button" tabindex="0" ` +
          `onclick="toniFootballToggleStation(${i})" ` +
          `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toniFootballToggleStation(${i});}"`
        : `aria-disabled="true"`;

      playersHTML +=
        `<div class="toni-fb__player ${st} toni-tl-nav" data-step-index="${i}" ` +
          `style="left:${leftPct}%;top:${topPct}%" ${handlers}>` +
          `<div class="toni-fb__squad">${matesHTML}</div>` +
          `<div class="toni-fb__orb"><span class="toni-fb__ico">${orbIcon}</span>${tick}${ballPulse}</div>` +
          `<div class="toni-fb__label">` +
            `<div class="toni-fb__pname">${esc(s.title)}</div>` +
            (typeDots ? `<div class="toni-fb__dots">${typeDots}</div>` : "") +
          `</div>` +
        `</div>`;
    }

    const goalLeft = (L.goal.x / L.vw * 100).toFixed(2);
    const goalTop = ((L.goal.y - 90) / L.vh * 100).toFixed(2);
    const goalText = `<div class="toni-fb__goaltext" style="left:${goalLeft}%;top:${goalTop}%">🏆 Tor &amp; Pokal</div>`;

    // Eckfahnen (4x so groß) – Tuchrichtung je Ecke
    function flag(pos) {
      const right = (pos === "tr" || pos === "br");
      const cloth = right
        ? `<path class="cloth" d="M23 12 L4 32 L23 56 Z" fill="${ACCENT}"/>`
        : `<path class="cloth" d="M12 12 L88 32 L12 56 Z" fill="${ACCENT}"/>`;
      const pole = right
        ? `<line x1="23" y1="8" x2="23" y2="136" stroke="#fff" stroke-width="6"/>`
        : `<line x1="12" y1="8" x2="12" y2="136" stroke="#fff" stroke-width="6"/>`;
      return `<div class="toni-fb__flag ${pos}"><svg viewBox="0 0 104 136">` +
        pole + cloth + `</svg></div>`;
    }

    // Tribünen links & rechts (4 Reihen Zuschauer)
    function stand(side) {
      const fanCols = ["#E2342B", "#4DA6FF", "#FFD24A", "#3DDC97", "#FF7A3C", "#C66BFF", "#fff", "#ff9eb5"];
      let rows = "";
      const ROWS = 4, PER = 5;
      for (let r = 0; r < ROWS; r++) {
        let fans = "";
        for (let c = 0; c < PER; c++) {
          const col = fanCols[(r * PER + c + (side === "right" ? 3 : 0)) % fanCols.length];
          const delay = (((r + c) % 6) * 0.4).toFixed(2);
          fans += `<span class="toni-fb__fan" style="background:${col};animation-delay:${delay}s"></span>`;
        }
        rows += `<div class="toni-fb__stand-row">${fans}</div>`;
      }
      return `<div class="toni-fb__stand ${side}"><div class="toni-fb__stand-rows">${rows}</div></div>`;
    }

    // Konfetti auslösen, falls seit letztem Render eine Station NEU abgeschlossen wurde
    triggerConfettiIfNewlyDone(states);

    return `<div class="toni-fb">` +
             `<div class="toni-fb__crowd"></div>` +
             stand("left") + stand("right") +
             `<div class="toni-fb__floodlight"></div>` +
             flag("tl") + flag("tr") + flag("bl") + flag("br") +
             `<div class="toni-fb__pitch">${svg}${playersHTML}${goalText}</div>` +
           `</div>`;
  }

  window.toniThemes.register({
    id: "football",
    label: "Fußball",
    description: "Der Weg zum Pokal über den Platz – Stationen als Spieler, Aufgaben als Mitspieler-Trikots.",
    renderStations: renderStations,
    renderPreview: function () {
      // Mini-Rasen mit Streifen, Mittelkreis, Pass-Linie, zwei Spielern, Tor.
      return '<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="fbPv" x1="0" y1="1" x2="0" y2="0">' +
        '<stop offset="0" stop-color="' + ACCENT + '"/><stop offset="1" stop-color="' + LIGHT + '"/></linearGradient></defs>' +
        '<rect width="160" height="100" rx="10" fill="#1B7A3E"/>' +
        '<rect y="0" width="160" height="25" fill="#15692F"/>' +
        '<rect y="50" width="160" height="25" fill="#15692F"/>' +
        '<rect x="6" y="6" width="148" height="88" rx="4" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="1.5"/>' +
        '<line x1="6" y1="50" x2="154" y2="50" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>' +
        '<circle cx="80" cy="50" r="14" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>' +
        '<rect x="56" y="6" width="48" height="14" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="1.5"/>' +
        '<path d="M40 84 C70 66 60 48 90 40" fill="none" stroke="url(#fbPv)" stroke-width="2.5" ' +
          'stroke-linecap="round" stroke-dasharray="2 5"/>' +
        '<circle cx="55" cy="62" r="8" fill="#2E8B57"/>' +
        '<circle cx="92" cy="40" r="8" fill="#2f6b4a"/>' +
        '<path d="M74 14 l4 6 6 -3 -6 8 0 -11 z" fill="' + LIGHT + '"/>' +
        '</svg>';
    }
  });

  console.info("[TONI-Theme:football] Fußball-Theme registriert (theme-football-v3-pro – Pro-Design).");
})();
