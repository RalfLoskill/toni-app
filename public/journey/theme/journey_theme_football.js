/* ============================================================
 * TONI – Lernreisen-Theme: "Fußball / Weg zum Pokal"
 * Datei: journey_theme_football.js
 * Build: theme-football-v2-preview
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

  /* ---- AUTO-LAYOUT (identisch zum Weltall: Pass-Linie statt Flugbahn) ---- */
  const VW = 1000;
  const MARGIN_X = 290;
  const STEP_GAP = 215;
  const PAD_TOP = 175;
  const PAD_BOTTOM = 165;

  function computeLayout(n) {
    const vh = PAD_TOP + PAD_BOTTOM + Math.max(1, n - 1) * STEP_GAP;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const y = vh - PAD_BOTTOM - i * STEP_GAP;
      const phase = Math.sin(i * 1.15 + 0.4);
      const x = VW / 2 + phase * MARGIN_X;
      pts.push({ x: Math.round(x), y: Math.round(y) });
    }
    const start = { x: VW / 2, y: vh - 40 };
    const goal = { x: VW / 2, y: PAD_TOP - 50 };
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

  /* ---- CSS ---- */
  function injectStyles() {
    if (document.getElementById("toni-theme-football-css")) return;
    const css = `
/* ===== Spielfeld ===== */
.toni-fb{position:relative;width:100%;min-height:100%;border-radius:16px;overflow:visible;
  background:
    repeating-linear-gradient(180deg,#1B7A3E 0,#1B7A3E 60px,#15692F 60px,#15692F 120px);}
.toni-fb__lines{position:absolute;inset:0;z-index:1;pointer-events:none;}
.toni-fb__crowd{position:absolute;inset:0;z-index:0;pointer-events:none;opacity:.16;
  background:radial-gradient(circle at 50% 0,rgba(255,255,255,.4),transparent 40%);}
.toni-fb__pitch{position:relative;z-index:2;width:100%;display:block;}
.toni-fb__pitch svg{display:block;width:100%;height:auto;}

/* Flutlicht-Schimmer (langsame Wanderung) */
.toni-fb__floodlight{position:absolute;left:50%;top:0;width:80%;height:60%;z-index:1;
  transform:translateX(-50%);pointer-events:none;
  background:radial-gradient(ellipse at 50% 0,rgba(255,255,255,.18),transparent 70%);
  animation:toniFloodlight 12s ease-in-out infinite alternate;}
@keyframes toniFloodlight{from{opacity:.4;transform:translateX(-58%);}to{opacity:.85;transform:translateX(-42%);}}

/* ===== Spieler (Station) ===== */
.toni-fb__player{position:absolute;transform:translate(-50%,-50%);cursor:pointer;z-index:5;
  width:0;display:flex;flex-direction:column;align-items:center;text-align:center;}
.toni-fb__player:focus-visible{outline:none;}
.toni-fb__player:focus-visible .toni-fb__orb{outline:3px solid ${LIGHT};outline-offset:4px;}
.toni-fb__label{position:absolute;top:54px;width:176px;left:50%;transform:translateX(-50%);
  display:flex;flex-direction:column;align-items:center;pointer-events:none;}
.toni-fb__pname{margin-top:2px;font-size:13px;font-weight:650;color:#fff;line-height:1.25;
  text-shadow:0 1px 4px rgba(0,0,0,.8),0 0 8px rgba(0,0,0,.5);
  background:rgba(8,40,20,.4);padding:2px 8px;border-radius:8px;max-width:100%;word-wrap:break-word;}
.toni-fb__orb{width:80px;height:80px;border-radius:50%;position:relative;display:grid;place-items:center;
  background:radial-gradient(circle at 32% 28%,#3a4a3f,#1c2a22);
  box-shadow:0 0 0 3px rgba(255,255,255,.12),0 6px 20px rgba(0,0,0,.45);color:#fff;
  transition:transform .18s ease, box-shadow .18s ease;}
.toni-fb__player:hover .toni-fb__orb{transform:scale(1.05);}
.toni-fb__player.done .toni-fb__orb{background:radial-gradient(circle at 32% 28%,#2E8B57,#176235);}
.toni-fb__player.current .toni-fb__orb{background:radial-gradient(circle at 32% 28%,#2f6b4a,#16402f);
  box-shadow:0 0 0 4px rgba(255,210,74,.3),0 0 28px rgba(255,210,74,.5);}
.toni-fb__player.locked{opacity:.4;cursor:default;}
.toni-fb__player.expanded .toni-fb__orb{box-shadow:0 0 0 4px rgba(226,52,43,.4),0 0 32px rgba(226,52,43,.5);}
.toni-fb__ico{width:34px;height:34px;display:block;}
/* pulsierender Ball am aktuellen Spieler */
.toni-fb__ballpulse{position:absolute;bottom:-6px;left:50%;transform:translateX(-50%);width:22px;height:22px;
  border-radius:50%;background:#fff;box-shadow:0 0 0 2px #16402f,0 2px 6px rgba(0,0,0,.5);
  animation:toniBallPulse 1.6s ease-in-out infinite;}
.toni-fb__ballpulse::before{content:"";position:absolute;inset:4px;border-radius:50%;
  background:conic-gradient(#000 0 12%,transparent 12% 88%,#000 88%);opacity:.5;}
@keyframes toniBallPulse{0%,100%{transform:translateX(-50%) scale(1);}50%{transform:translateX(-50%) scale(1.18);}}
.toni-fb__tick{position:absolute;right:-2px;top:-2px;width:22px;height:22px;border-radius:50%;
  background:#3DDC97;color:#0b3b22;display:grid;place-items:center;}
.toni-fb__tick svg{width:14px;height:14px;}
.toni-fb__dots{margin-top:6px;display:flex;gap:3px;justify-content:center;flex-wrap:wrap;transition:opacity .18s;}
.toni-fb__dots span{width:7px;height:7px;border-radius:50%;display:inline-block;}
.toni-fb__player.expanded .toni-fb__dots{opacity:0;}

/* ===== Mitspieler (Aufgaben) als Trikots ===== */
.toni-fb__squad{position:absolute;left:50%;top:50%;width:0;height:0;z-index:4;pointer-events:none;}
.toni-fb__ring{position:absolute;left:50%;top:50%;border-radius:50%;
  border:1px dashed rgba(255,255,255,.4);transform:translate(-50%,-50%);
  opacity:0;transition:opacity .25s ease;}
.toni-fb__player.expanded .toni-fb__ring{opacity:1;}
.toni-fb__mate{position:absolute;left:50%;top:50%;width:46px;height:50px;
  transform:translate(-50%,-50%) scale(.2);opacity:0;pointer-events:none;cursor:pointer;
  transition:transform .26s cubic-bezier(.34,1.4,.5,1),opacity .2s ease;}
.toni-fb__player.expanded .toni-fb__mate{opacity:1;pointer-events:auto;}
/* Trikot-Form */
.toni-fb__shirt{position:absolute;inset:0;display:grid;place-items:center;
  filter:drop-shadow(0 3px 6px rgba(0,0,0,.45));}
.toni-fb__shirt svg{width:100%;height:100%;}
.toni-fb__num{position:absolute;left:50%;top:54%;transform:translate(-50%,-50%);
  font-size:15px;font-weight:800;color:#fff;text-shadow:0 1px 2px rgba(0,0,0,.6);}
.toni-fb__typeico{position:absolute;left:50%;top:24%;transform:translate(-50%,-50%);
  width:14px;height:14px;color:#fff;opacity:.92;}
.toni-fb__mate:hover{transform:translate(var(--mx),var(--my)) scale(1.16) !important;z-index:9;}
.toni-fb__mate:focus-visible{outline:3px solid #fff;outline-offset:2px;}
.toni-fb__mlabel{position:absolute;top:52px;left:50%;transform:translateX(-50%);white-space:nowrap;
  font-size:11px;font-weight:600;color:#fff;background:rgba(8,40,20,.9);padding:2px 7px;border-radius:7px;
  opacity:0;pointer-events:none;transition:opacity .15s ease;box-shadow:0 2px 8px rgba(0,0,0,.4);}
.toni-fb__mate:hover .toni-fb__mlabel,.toni-fb__mate:focus-visible .toni-fb__mlabel{opacity:1;}
.toni-fb__matetick{position:absolute;right:-2px;bottom:8px;width:16px;height:16px;border-radius:50%;
  background:#3DDC97;color:#0b3b22;display:grid;place-items:center;border:1.5px solid #15692F;}
.toni-fb__matetick svg{width:10px;height:10px;}
.toni-fb__mate.locked{opacity:.4;cursor:default;filter:grayscale(.6);}

/* ===== Ziel: Tor + Pokal ===== */
.toni-fb__goaltext{position:absolute;transform:translate(-50%,-50%);z-index:4;text-align:center;
  color:${LIGHT};font-size:13px;font-weight:800;text-shadow:0 1px 6px rgba(0,0,0,.7);}

/* ===== Eckfahnen ===== */
.toni-fb__flag{position:absolute;width:26px;height:34px;z-index:3;pointer-events:none;}
.toni-fb__flag.tl{top:8px;left:8px;}.toni-fb__flag.tr{top:8px;right:8px;}
.toni-fb__flag.bl{bottom:8px;left:8px;}.toni-fb__flag.br{bottom:8px;right:8px;}
.toni-fb__flag .cloth{transform-origin:left center;animation:toniFlagWave 2.2s ease-in-out infinite;}
@keyframes toniFlagWave{0%,100%{transform:skewX(0) scaleX(1);}50%{transform:skewX(-12deg) scaleX(.9);}}

/* ===== Rollender Ball + TONI im Trikot ===== */
.toni-fb__roller{position:absolute;top:24%;left:-50px;z-index:6;width:30px;height:30px;opacity:0;
  pointer-events:none;animation:toniBallRoll 22s linear infinite;}
.toni-fb__roller svg{width:100%;height:100%;animation:toniBallSpin 1s linear infinite;}
@keyframes toniBallSpin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes toniBallRoll{0%{opacity:0;transform:translate(0,0);}4%{opacity:1;}46%{opacity:1;}
  52%{opacity:0;transform:translate(112vw,40vh);}100%{opacity:0;transform:translate(112vw,40vh);}}
.toni-fb__toni{position:absolute;top:58%;right:-90px;z-index:6;width:62px;height:62px;opacity:0;
  pointer-events:none;animation:toniDribble 30s linear infinite;animation-delay:9s;}
.toni-fb__toni .tn-shirt{position:absolute;left:50%;bottom:0;transform:translateX(-50%);width:54px;height:34px;}
.toni-fb__toni .tn-head{position:absolute;left:50%;top:0;transform:translateX(-50%);width:34px;height:34px;
  border-radius:50%;overflow:hidden;background:#0C1024;border:2px solid ${LIGHT};
  box-shadow:0 0 8px rgba(255,210,74,.5);}
.toni-fb__toni .tn-head img{width:100%;height:100%;object-fit:cover;display:block;}
.toni-fb__toni .tn-ball{position:absolute;left:-6px;bottom:-2px;width:16px;height:16px;border-radius:50%;
  background:#fff;box-shadow:0 0 0 1.5px #16402f;animation:toniBallSpin 1s linear infinite;}
@keyframes toniDribble{0%{opacity:0;transform:translate(0,0);}5%{opacity:1;}48%{opacity:1;}
  55%{opacity:0;transform:translate(-122vw,-26vh);}100%{opacity:0;transform:translate(-122vw,-26vh);}}

/* ===== Konfetti am Ziel (nur wenn Reise abgeschlossen) ===== */
.toni-fb__confetti{position:absolute;left:50%;top:4%;width:60%;height:20%;z-index:3;transform:translateX(-50%);
  pointer-events:none;}
.toni-fb__confetti i{position:absolute;width:8px;height:12px;opacity:0;border-radius:1px;
  animation:toniConfetti 3.4s linear infinite;}
@keyframes toniConfetti{0%{opacity:0;transform:translateY(-10px) rotate(0);}10%{opacity:1;}
  100%{opacity:0;transform:translateY(160px) rotate(420deg);}}

@media (prefers-reduced-motion: reduce){
  .toni-fb__floodlight,.toni-fb__ballpulse,.toni-fb__flag .cloth,
  .toni-fb__roller,.toni-fb__toni,.toni-fb__roller svg,.toni-fb__toni .tn-ball{animation:none;}
  .toni-fb__roller,.toni-fb__toni,.toni-fb__confetti{display:none;}
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

/* Schließen-/Journal-Button lesbar auf dem Rasen */
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-close-btn{
  background:rgba(8,40,20,.92) !important;color:#fff !important;border:1px solid ${LIGHT} !important;}
body.toni-football-fullscreen #lr-modal.toni-theme-active-football .lr-close-btn:hover{
  background:rgba(20,60,34,.95) !important;}

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
  border:1px solid ${LIGHT} !important;color:#FFF3CC !important;}
body.toni-football-fullscreen #lr-task-modal .lr-success-btn{border-color:#3DDC97 !important;color:#BFF3DD !important;}
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

    // Spielfeld-Linien als SVG (Mittelkreis, Mittellinie, Strafräume, Pass-Linie, Tor)
    const cx = L.vw / 2;
    const svg =
      `<svg viewBox="0 0 ${L.vw} ${L.vh}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">` +
        `<defs><linearGradient id="toniPass" x1="0" y1="1" x2="0" y2="0">` +
          `<stop offset="0" stop-color="${ACCENT}"/><stop offset="1" stop-color="${LIGHT}"/>` +
        `</linearGradient></defs>` +
        // Außenlinie
        `<rect x="20" y="20" width="${L.vw - 40}" height="${L.vh - 40}" fill="none" ` +
          `stroke="rgba(255,255,255,.55)" stroke-width="3"/>` +
        // Mittellinie + Mittelkreis
        `<line x1="20" y1="${L.vh / 2}" x2="${L.vw - 20}" y2="${L.vh / 2}" ` +
          `stroke="rgba(255,255,255,.5)" stroke-width="3"/>` +
        `<circle cx="${cx}" cy="${L.vh / 2}" r="70" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="3"/>` +
        `<circle cx="${cx}" cy="${L.vh / 2}" r="6" fill="rgba(255,255,255,.6)"/>` +
        // Strafraum oben (Tor) und unten
        `<rect x="${cx - 150}" y="20" width="300" height="110" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="3"/>` +
        `<rect x="${cx - 150}" y="${L.vh - 130}" width="300" height="110" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="3"/>` +
        // Pass-Linie
        `<path d="${fullD}" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="3.5" ` +
          `stroke-linecap="round" stroke-dasharray="2 13"/>` +
        (walkedD ? `<path d="${walkedD}" fill="none" stroke="url(#toniPass)" stroke-width="5" stroke-linecap="round"/>` : "") +
        // Tor + Pokal
        `<g transform="translate(${L.goal.x},${L.goal.y})">` +
          `<rect x="-46" y="-30" width="92" height="40" fill="none" stroke="#fff" stroke-width="3"/>` +
          `<path d="M-46 -30 h92 M-46 -30 v40 M46 -30 v40" stroke="#fff" stroke-width="1" opacity=".5"/>` +
          `<path d="M-8 12 h16 l-2 10 h-12 z M-12 12 h24 M-6 22 h12 v4 h-12 z" fill="${LIGHT}" stroke="#C9920F" stroke-width="1"/>` +
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
    const goalTop = ((L.goal.y - 64) / L.vh * 100).toFixed(2);
    const goalText = `<div class="toni-fb__goaltext" style="left:${goalLeft}%;top:${goalTop}%">⚽ Tor &amp; Pokal</div>`;

    // Eckfahnen
    function flag(pos) {
      return `<div class="toni-fb__flag ${pos}"><svg viewBox="0 0 26 34">` +
        `<line x1="3" y1="2" x2="3" y2="34" stroke="#fff" stroke-width="2"/>` +
        `<path class="cloth" d="M3 3 L22 8 L3 14 Z" fill="${ACCENT}"/></svg></div>`;
    }

    // Konfetti nur bei abgeschlossener Reise
    let confettiHTML = "";
    if (allDone) {
      const cols = [ACCENT, LIGHT, "#4DA6FF", "#3DDC97", "#fff"];
      let pieces = "";
      for (let i = 0; i < 26; i++) {
        pieces += `<i style="left:${(Math.random() * 100).toFixed(1)}%;` +
                  `background:${cols[i % cols.length]};` +
                  `animation-delay:${(Math.random() * 3).toFixed(2)}s"></i>`;
      }
      confettiHTML = `<div class="toni-fb__confetti">${pieces}</div>`;
    }

    // TONI im Trikot (Logo) + rollender Ball
    const toniShip =
      `<div class="toni-fb__toni">` +
        `<span class="tn-shirt"><svg viewBox="0 0 54 34" fill="${ACCENT}">` +
          `<path d="M16 2 L27 7 L38 2 L52 9 L46 17 L46 32 L8 32 L8 17 L2 9 Z" ` +
            `stroke="rgba(255,255,255,.8)" stroke-width="1.5"/></svg></span>` +
        `<span class="tn-head"><img src="/assets/toni-logo-face.png" alt="TONI"></span>` +
        `<span class="tn-ball"></span>` +
      `</div>`;
    const roller = `<div class="toni-fb__roller">${ICON.ball}</div>`;

    return `<div class="toni-fb">` +
             `<div class="toni-fb__crowd"></div>` +
             `<div class="toni-fb__floodlight"></div>` +
             flag("tl") + flag("tr") + flag("bl") + flag("br") +
             roller + toniShip + confettiHTML +
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

  console.info("[TONI-Theme:football] Fußball-Theme registriert (theme-football-v2-preview).");
})();
