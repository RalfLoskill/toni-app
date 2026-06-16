/* ============================================================
 * TONI – Lernreisen-Theme: "Wissenshaus" (Energie- & Gebäudetechnik)
 * Datei: journey_theme_haus.js
 * Build: theme-haus-v2-empty-fix
 *
 * METAPHER (zugeschnitten auf Elektroniker EuG):
 *  - Eine Lernreise ist ein HAUS. Jede STATION ist ein RAUM.
 *  - Räume liegen in Geschossen, gearbeitet von UNTEN (Erdgeschoss, zuerst)
 *    nach OBEN (Dachgeschoss, zuletzt).
 *  - Die AUFGABEN einer Station sitzen als LICHTSCHALTER im Raum. Sie
 *    fächern erst nach Klick auf den Raum auf (wie Planet/Monde im Weltall,
 *    Spieler/Mitspieler im Fußball). Erledigte Aufgabe = Schalter AN.
 *  - Sind alle Pflichtaufgaben erledigt, ist der Raum "done" -> das Licht
 *    geht an, der Raum LEUCHTET warm (Glühbirne schwingt).
 *  - Bei aktivem Wissenshaus-Theme läuft die Lernreise im VOLLBILD
 *    (100vw/100vh) – ausschließlich für Haus-Reisen, eigenes Präfix
 *    body.toni-haus-fullscreen (unabhängig von Weltall/Fußball/Dschungel).
 *
 * ANDOCKEN AN TONI (identisch zum Muster von football/space):
 *  - Raum-Klick  -> toniHausToggleRoom(i): wählt Station via
 *    window.toniTimelineSelect(i) und fächert die Schalter auf.
 *  - Schalter-Klick -> window.openLearningTask(task.id) (bestehend).
 *  - Status der Station kommt aus window.stepStatus().
 *  - Aufgabentyp wird über window.toniNormalizeType() normalisiert.
 *
 * Robustheit: Wirft renderStations einen Fehler oder liefert leeres HTML,
 * fällt die Engine (journey_theme.js) automatisch auf "classic" zurück.
 * ============================================================ */

(function () {
  "use strict";

  if (!window.toniThemes || typeof window.toniThemes.register !== "function") {
    console.warn("[TONI-Theme:haus] Theme-Engine nicht gefunden – Haus-Theme inaktiv.");
    return;
  }

  /* ---------- Farbpalette (aus dem Prototyp übernommen) ---------- */
  const ACCENT = "#FFB838";   // Licht-Gelb (Akzent)
  const LIGHT  = "#FFD27A";   // warmes Licht (Raum an)

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
    // Raum-Icon für die aktuelle Station: Hausumriss
    home:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7M5 10v10h14V10"/><path d="M10 20v-6h4v6"/></svg>',
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
   * Geschoss-Aufteilung: Stationen von unten nach oben in Geschosse,
   * max. 3 Räume pro Vollgeschoss; die obersten 1–2 Räume ins Dachgeschoss.
   * Liefert Array von { type:'floor'|'attic', rooms:[{step,idx,state}] },
   * index 0 = Erdgeschoss (unten).
   * -------------------------------------------------------- */
  function splitFloors(rooms) {
    const n = rooms.length;
    if (n === 0) return [];
    const atticCount = n >= 7 ? 2 : 1;
    const lower = rooms.slice(0, Math.max(0, n - atticCount));
    const attic = rooms.slice(Math.max(0, n - atticCount));
    const perFloor = 3;
    const floors = [];
    for (let i = 0; i < lower.length; i += perFloor) {
      floors.push({ type: "floor", rooms: lower.slice(i, i + perFloor) });
    }
    if (attic.length) floors.push({ type: "attic", rooms: attic });
    return floors;
  }

  const FLOOR_NAMES = ["Erdgeschoss", "1. Obergeschoss", "2. Obergeschoss", "3. Obergeschoss"];

  /* ----------------------------------------------------------
   * INTERAKTION: Raum wählen + Lichtschalter (Aufgaben) auffächern.
   * Genau ein Raum ist gleichzeitig "open"; erneuter Klick schließt ihn.
   * -------------------------------------------------------- */
  window.toniHausToggleRoom = function (index) {
    const root = document.querySelector(".toni-haus");
    if (!root) return;
    const room = root.querySelector('.toni-haus__room[data-step-index="' + index + '"]');
    if (!room || room.classList.contains("locked")) return;
    const already = room.classList.contains("open");
    root.querySelectorAll(".toni-haus__room.open").forEach(function (r) {
      r.classList.remove("open");
    });
    if (!already) room.classList.add("open");
    if (typeof window.toniTimelineSelect === "function") {
      try { window.toniTimelineSelect(index); } catch (e) { /* nicht kritisch */ }
    }
  };

  // Zur aktuellen Station scrollen (Kopf-Button im Haus).
  window.toniHausGotoCurrent = function () {
    const c = document.querySelector(".toni-haus__room.current");
    if (c) c.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /* ---------------------------------------------------------- CSS */
  function injectStyles() {
    if (document.getElementById("toni-theme-haus-css")) return;
    const css = `
/* ===== Bühne ===== */
.toni-haus{position:relative;width:100%;min-height:100%;overflow:hidden;
  --night-0:#0B1228;--night-1:#14203F;--ground:#243018;--ground-2:#2E3A20;
  --wall:#6B5847;--wall-2:#5A4A3B;--wall-dark:#473a2f;--roof:#7A2E2A;--roof-2:#5E2420;
  --beam:#3E3228;--room-dark:#1C232E;--room-dark2:#232C3A;--light:${LIGHT};
  --light-glow:${ACCENT};--ink:#F3EEE6;--ink-soft:#C3B8A6;--ink-faint:#8A7F70;
  --line:#3A2F25;--accent:${ACCENT};
  background:linear-gradient(180deg,var(--night-0) 0%,var(--night-1) 70%,#1d2a1a 100%);
  color:var(--ink);font-family:inherit;}
.toni-haus *{box-sizing:border-box;}

/* Sterne + Mond */
.toni-haus__sky{position:absolute;top:0;left:0;right:0;height:340px;z-index:0;pointer-events:none;}
.toni-haus__sky i{position:absolute;background:#fff;border-radius:50%;opacity:.7;
  animation:toniHausTw 3.6s ease-in-out infinite;}
@keyframes toniHausTw{0%,100%{opacity:.2}50%{opacity:.9}}
.toni-haus__moon{position:absolute;top:38px;left:8%;width:48px;height:48px;border-radius:50%;z-index:0;
  background:radial-gradient(circle at 38% 36%,#FBF6E9,#E4D9B4);box-shadow:0 0 36px rgba(251,246,233,.35);}

/* ===== Das Haus ===== */
.toni-haus__building{position:relative;z-index:2;margin:26px auto 0;width:88%;max-width:440px;}

/* Dach */
.toni-haus__roof{position:relative;height:96px;z-index:3;}
.toni-haus__roof .tri{position:absolute;left:50%;transform:translateX(-50%);bottom:0;width:0;height:0;
  border-left:220px solid transparent;border-right:220px solid transparent;
  border-bottom:96px solid var(--roof);filter:drop-shadow(0 -2px 0 var(--roof-2));}
.toni-haus__roof .ridge{position:absolute;left:50%;transform:translateX(-50%);bottom:90px;
  width:14px;height:14px;background:var(--accent);border-radius:50%;
  box-shadow:0 0 14px var(--accent);z-index:4;}
.toni-haus__roof .chimney{position:absolute;right:64px;bottom:60px;width:26px;height:48px;
  background:var(--wall-dark);border:2px solid var(--beam);border-radius:3px 3px 0 0;z-index:2;}

/* Geschoss */
.toni-haus__floor{position:relative;background:linear-gradient(180deg,var(--wall),var(--wall-2));
  border-left:8px solid var(--beam);border-right:8px solid var(--beam);}
.toni-haus__floor .floorbase{height:12px;background:var(--beam);}
.toni-haus__floortag{position:absolute;left:-8px;top:8px;z-index:8;background:var(--beam);color:var(--ink);
  font-size:10px;font-weight:850;letter-spacing:.12em;text-transform:uppercase;
  padding:4px 10px 4px 12px;border-radius:0 8px 8px 0;}

/* Räume-Reihe */
.toni-haus__rooms{display:flex;gap:8px;padding:14px 12px;}
.toni-haus__room{position:relative;flex:1;min-width:0;border-radius:8px;cursor:pointer;
  border:2px solid var(--beam);background:linear-gradient(180deg,var(--room-dark2),var(--room-dark));
  aspect-ratio:1/1.12;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;
  transition:transform .18s ease,box-shadow .35s ease,background .5s ease,border-color .4s ease;}
.toni-haus__room:hover{transform:translateY(-3px);}
.toni-haus__room:focus-visible{outline:3px solid var(--accent);outline-offset:3px;}
.toni-haus__ricon{width:30px;height:30px;display:grid;place-items:center;color:var(--ink-faint);
  transition:color .4s ease;z-index:2;}
.toni-haus__ricon svg{width:28px;height:28px;}
.toni-haus__rname{font-size:10px;font-weight:800;line-height:1.12;text-align:center;color:var(--ink-soft);
  padding:0 4px;z-index:2;transition:color .4s ease;
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.toni-haus__pane{position:absolute;inset:0;z-index:1;pointer-events:none;
  background-image:linear-gradient(rgba(0,0,0,.18) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,.18) 1px,transparent 1px);
  background-size:50% 50%;opacity:.4;}
.toni-haus__tstrip{position:absolute;bottom:0;left:0;right:0;height:4px;z-index:2;opacity:.85;}

/* ZUSTAND: done -> Licht an */
.toni-haus__room.done{
  background:radial-gradient(circle at 50% 38%,var(--light) 0%,var(--light-glow) 55%,#C98A2A 100%);
  border-color:var(--light);box-shadow:0 0 26px rgba(255,184,56,.6),0 0 60px rgba(255,184,56,.25);
  animation:toniHausLightOn .6s ease;}
@keyframes toniHausLightOn{0%{box-shadow:0 0 0 rgba(255,184,56,0)}60%{box-shadow:0 0 40px rgba(255,184,56,.9)}100%{box-shadow:0 0 26px rgba(255,184,56,.6),0 0 60px rgba(255,184,56,.25)}}
.toni-haus__room.done .toni-haus__ricon{color:#5A3A0E;}
.toni-haus__room.done .toni-haus__rname{color:#5A3A0E;}
.toni-haus__room.done .toni-haus__pane{opacity:.25;
  background-image:linear-gradient(rgba(120,70,0,.4) 2px,transparent 2px),linear-gradient(90deg,rgba(120,70,0,.4) 2px,transparent 2px);}
.toni-haus__lamp{position:absolute;top:5px;left:50%;transform:translateX(-50%);z-index:3;font-size:13px;
  animation:toniHausSwing 3s ease-in-out infinite;}
@keyframes toniHausSwing{0%,100%{transform:translateX(-50%) rotate(-6deg)}50%{transform:translateX(-50%) rotate(6deg)}}

/* ZUSTAND: current -> in Arbeit */
.toni-haus__room.current{background:linear-gradient(180deg,#3a3320,#2a2415);border-color:var(--accent);
  box-shadow:0 0 22px rgba(255,184,56,.4);animation:toniHausPulse 2s ease-in-out infinite;}
@keyframes toniHausPulse{0%,100%{box-shadow:0 0 18px rgba(255,184,56,.35)}50%{box-shadow:0 0 30px rgba(255,184,56,.65)}}
.toni-haus__room.current .toni-haus__ricon{color:var(--accent);}
.toni-haus__room.current .toni-haus__rname{color:var(--light);}
.toni-haus__worktag{position:absolute;top:4px;right:4px;z-index:3;font-size:11px;
  animation:toniHausSwing 2.5s ease-in-out infinite;}

/* ZUSTAND: locked -> dunkel */
.toni-haus__room.locked{cursor:default;}
.toni-haus__room.locked .toni-haus__ricon{color:#3d4658;}
.toni-haus__room.locked .toni-haus__rname{color:#566275;}
.toni-haus__lockmini{position:absolute;top:5px;right:5px;z-index:3;color:#566275;}
.toni-haus__lockmini svg{width:13px;height:13px;}

/* Tür im Erdgeschoss */
.toni-haus__door{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:46px;height:62px;
  background:linear-gradient(180deg,#5a4632,#43342a);border:3px solid var(--beam);border-bottom:none;
  border-radius:8px 8px 0 0;z-index:6;}
.toni-haus__door::after{content:'';position:absolute;right:7px;top:28px;width:5px;height:5px;border-radius:50%;
  background:var(--accent);box-shadow:0 0 6px var(--accent);}

/* Boden/Wiese */
.toni-haus__ground{position:relative;z-index:1;height:46px;margin-top:-2px;
  background:linear-gradient(180deg,var(--ground-2),var(--ground));border-top:3px solid #3c4a26;}

/* ===== Lichtschalter (Aufgaben) – fächern bei .open auf ===== */
.toni-haus__switches{position:absolute;left:50%;top:100%;transform:translateX(-50%);
  z-index:20;margin-top:6px;width:max-content;max-width:280px;
  display:flex;flex-wrap:wrap;gap:7px;justify-content:center;
  background:linear-gradient(180deg,#1d1520,#120c16);border:1px solid rgba(255,184,56,.3);
  border-radius:14px;padding:10px;box-shadow:0 14px 40px rgba(0,0,0,.55);
  opacity:0;pointer-events:none;transform:translateX(-50%) translateY(-8px) scale(.96);
  transition:opacity .22s ease,transform .22s cubic-bezier(.22,1,.36,1);}
.toni-haus__room.open{z-index:25;}
.toni-haus__room.open .toni-haus__switches{opacity:1;pointer-events:auto;
  transform:translateX(-50%) translateY(0) scale(1);}
.toni-haus__switch{position:relative;width:62px;cursor:pointer;display:flex;flex-direction:column;
  align-items:center;gap:4px;padding:7px 4px 6px;border-radius:10px;
  background:#0a0710;border:1px solid var(--line);transition:transform .1s ease,border-color .2s ease;}
.toni-haus__switch:hover{transform:translateY(-2px);border-color:var(--accent);}
.toni-haus__switch:focus-visible{outline:3px solid var(--accent);outline-offset:2px;}
.toni-haus__switch.locked{cursor:default;opacity:.55;}
.toni-haus__switch.locked:hover{transform:none;border-color:var(--line);}
/* Kippschalter-Grafik */
.toni-haus__toggle{width:22px;height:32px;border-radius:5px;background:#2a2230;
  border:1.5px solid #4a3f33;position:relative;overflow:hidden;flex:0 0 auto;}
.toni-haus__toggle::after{content:'';position:absolute;left:3px;right:3px;height:13px;border-radius:3px;
  background:#5a5040;bottom:3px;transition:bottom .22s cubic-bezier(.22,1,.36,1),background .22s ease;}
.toni-haus__switch.done .toni-haus__toggle{border-color:var(--light);box-shadow:0 0 10px rgba(255,184,56,.55);}
.toni-haus__switch.done .toni-haus__toggle::after{bottom:16px;background:linear-gradient(180deg,var(--light),var(--light-glow));}
.toni-haus__sico{width:15px;height:15px;display:grid;place-items:center;color:var(--cc,#cbd5d0);}
.toni-haus__sico svg{width:15px;height:15px;}
.toni-haus__slabel{font-size:9px;font-weight:800;line-height:1.1;text-align:center;color:var(--ink-soft);
  display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:58px;}
.toni-haus__snum{position:absolute;top:3px;left:4px;font-size:8px;font-weight:850;color:var(--ink-faint);}

/* Kopf-Andeutung (Zur aktuellen Station) */
.toni-haus__head{position:relative;z-index:10;display:flex;align-items:center;gap:12px;
  width:88%;max-width:440px;margin:18px auto 0;padding:0 2px;}
.toni-haus__keybtn{width:46px;height:46px;flex:0 0 46px;border-radius:13px;cursor:pointer;
  background:#171019;border:1.5px solid var(--accent);display:grid;place-items:center;
  box-shadow:0 0 16px rgba(255,184,56,.3);transition:transform .12s ease;}
.toni-haus__keybtn:active{transform:scale(.95);}
.toni-haus__keybtn svg{width:24px;height:24px;}
.toni-haus__htext .tk{font-size:10px;font-weight:850;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);}
.toni-haus__htext .tn{font-size:16px;font-weight:850;line-height:1.1;margin-top:2px;}

@media (prefers-reduced-motion: reduce){
  .toni-haus *{animation:none !important;transition:none !important;}
}
`;
    const el = document.createElement("style");
    el.id = "toni-theme-haus-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------------------------------------------------------- Fullscreen-CSS
   * Gegated über body.toni-haus-fullscreen (eigenes Präfix). Analog
   * football/space: das Haus füllt das Lernreise-Modal vollständig,
   * fremde Spalten/Progress werden ausgeblendet. Das Aufgaben-Modal
   * (lr-task-modal) bleibt voll bedienbar, nur farblich eingepasst.
   * -------------------------------------------------------- */
  function injectFullscreenStyles() {
    if (document.getElementById("toni-theme-haus-fs-css")) return;
    const css = `
body.toni-haus-fullscreen{overflow:hidden !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus.lr-modal-backdrop,
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus{
  position:fixed !important;inset:0 !important;z-index:4000 !important;
  padding:0 !important;margin:0 !important;background:#0B1228 !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-modal,
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-modal-card,
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus > div{
  width:100vw !important;max-width:100vw !important;height:100vh !important;max-height:100vh !important;
  border-radius:0 !important;margin:0 !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-modal-body{
  padding:0 !important;height:100% !important;overflow-y:auto !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-detail-grid,
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-main-card{
  display:block !important;width:100% !important;max-width:100% !important;
  margin:0 !important;padding:0 !important;background:transparent !important;
  border:none !important;box-shadow:none !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .toni-haus{min-height:100vh;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-stations{
  padding:0 !important;margin:0 !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus #lr-modal-sub,
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-modal-sub{display:none !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-right-col,
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus #lr-right-col{display:none !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-progress-big{display:none !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-cover-screen-v89{display:none !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-close-btn{
  position:fixed !important;top:14px;right:14px;z-index:4500 !important;
  background:#171019 !important;border:1.5px solid ${ACCENT} !important;color:${ACCENT} !important;}
body.toni-haus-fullscreen #lr-modal.toni-theme-active-haus .lr-close-btn:hover{
  background:#241a10 !important;}

/* Aufgaben-Detail im Haus-Look (Hülle thematisieren, Inhalt lesbar lassen) */
body.toni-haus-fullscreen #lr-task-modal.lr-modal-backdrop,
body.toni-haus-fullscreen #lr-task-modal{z-index:5000 !important;}
body.toni-haus-fullscreen #lr-task-modal .lr-modal,
body.toni-haus-fullscreen #lr-task-modal .lr-modal-card,
body.toni-haus-fullscreen #lr-task-modal > div{
  background:linear-gradient(180deg,#1d1520,#120c16) !important;
  border:1px solid rgba(255,184,56,.3) !important;color:#F3EEE6 !important;}
body.toni-haus-fullscreen #lr-task-modal .lr-modal-header{background:transparent !important;}
body.toni-haus-fullscreen #lr-task-modal .lr-modal-header *{color:#fff !important;}
body.toni-haus-fullscreen #lr-task-modal #lr-task-content,
body.toni-haus-fullscreen #lr-task-modal #lr-task-content *{color:#F3EEE6;}
`;
    const el = document.createElement("style");
    el.id = "toni-theme-haus-fs-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---------------------------------------------------------- Render */
  function renderStations(journey) {
    injectStyles();
    injectFullscreenStyles();

    const steps = (journey && journey.steps) || [];
    const n = steps.length;
    if (n === 0) {
      return '<div class="toni-haus" style="padding:40px;text-align:center;color:#EAE0F0">' +
             'Diese Lernreise hat noch keine Stationen.</div>';
    }

    // Vollbild-Klasse für DIESES Theme setzen (Engine entfernt fremde).
    if (document.body && document.body.classList) {
      document.body.classList.add("toni-haus-fullscreen");
    }

    const states = steps.map(function (s, i) { return stationStatus(s, i, journey); });
    const doneCount = states.filter(function (st) { return st === "done"; }).length;
    const pct = Math.round(doneCount / n * 100);
    const curIdx = states.findIndex(function (st) { return st === "current"; });

    // Räume (Station + Index + Status) bauen, dann in Geschosse aufteilen.
    const rooms = steps.map(function (s, i) {
      return { step: s, idx: i, state: states[i] };
    });
    const floors = splitFloors(rooms);

    // Geschosse von OBEN (Dach) nach unten ins DOM; Daten: floors[last]=Dach.
    let floorsHTML = "";
    for (let fi = floors.length - 1; fi >= 0; fi--) {
      const f = floors[fi];
      const label = f.type === "attic"
        ? "Dachgeschoss"
        : (FLOOR_NAMES[fi] || (fi + ". OG"));

      let roomsHTML = "";
      f.rooms.forEach(function (r) {
        roomsHTML += renderRoom(r.step, r.idx, r.state);
      });

      const door = fi === 0 ? '<div class="toni-haus__door"></div>' : "";
      floorsHTML +=
        '<div class="toni-haus__floor' + (f.type === "attic" ? " attic" : "") + '">' +
          '<span class="toni-haus__floortag">' + esc(label) + '</span>' +
          '<div class="toni-haus__rooms">' + roomsHTML + '</div>' +
          door +
          '<div class="floorbase"></div>' +
        '</div>';
    }

    // Sterne
    let sky = "";
    for (let i = 0; i < 40; i++) {
      const sz = (Math.random() * 2 + 1).toFixed(1);
      sky += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;top:' +
             (Math.random() * 100).toFixed(1) + '%;width:' + sz + 'px;height:' + sz +
             'px;animation-delay:' + (Math.random() * 3.6).toFixed(1) + 's"></i>';
    }

    const curTitle = curIdx >= 0 ? esc(steps[curIdx].title || "") : "Reise abgeschlossen";

    return '' +
      '<div class="toni-haus">' +
        '<div class="toni-haus__sky">' + sky + '</div>' +
        '<div class="toni-haus__moon"></div>' +
        '<div class="toni-haus__head">' +
          '<button type="button" class="toni-haus__keybtn" title="Zur aktuellen Station" ' +
            'aria-label="Zur aktuellen Station" onclick="toniHausGotoCurrent()">' + ICON.home + '</button>' +
          '<div class="toni-haus__htext">' +
            '<div class="tk">' + pct + '% erhellt · ' + doneCount + ' von ' + n + ' Räumen</div>' +
            '<div class="tn">Aktuell: ' + curTitle + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="toni-haus__building">' +
          '<div class="toni-haus__roof"><div class="tri"></div><div class="ridge"></div>' +
            '<div class="chimney"></div></div>' +
          floorsHTML +
        '</div>' +
        '<div class="toni-haus__ground"></div>' +
      '</div>';
  }

  /* Ein Raum = eine Station, mit aufklappbaren Lichtschaltern (Aufgaben). */
  function renderRoom(step, index, state) {
    const tasks = (step.tasks || []);

    // Typ-Farbstreifen unten: nimmt den Typ der ersten Aufgabe (oder neutral).
    const firstType = tasks.length ? normType(tasks[0].type) : "Aufgabe";
    const stripCol = TYPE_COLOR[firstType] || "#cbd5d0";

    // Lichtschalter pro Aufgabe.
    let switchesHTML = "";
    if (tasks.length) {
      tasks.forEach(function (t, m) {
        const tt = normType(t.type);
        const col = TYPE_COLOR[tt] || "#cbd5d0";
        const done = t.status === "done";
        const locked = state === "locked";
        const handlers = locked
          ? 'aria-disabled="true"'
          : 'role="button" tabindex="0" ' +
            'onclick="event.stopPropagation();openLearningTask(\'' + esc(t.id) + '\')" ' +
            'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();openLearningTask(\'' + esc(t.id) + '\');}"';
        switchesHTML +=
          '<div class="toni-haus__switch ' + (done ? "done " : "") + (locked ? "locked" : "") + '" ' +
            'style="--cc:' + col + '" ' + handlers + '>' +
            '<span class="toni-haus__snum">' + (m + 1) + '</span>' +
            '<span class="toni-haus__toggle"></span>' +
            '<span class="toni-haus__sico">' + typeIcon(tt) + '</span>' +
            '<span class="toni-haus__slabel">' + esc(t.title || tt) + '</span>' +
          '</div>';
      });
    }
    const switchesWrap = switchesHTML
      ? '<div class="toni-haus__switches">' + switchesHTML + '</div>'
      : "";

    const roomIcon = state === "done" ? ICON.check
                   : state === "locked" ? ICON.lock
                   : ICON.home;

    const lamp = state === "done" ? '<span class="toni-haus__lamp">💡</span>' : "";
    const worktag = state === "current" ? '<span class="toni-haus__worktag">🔧</span>' : "";
    const lockmini = state === "locked"
      ? '<span class="toni-haus__lockmini">' + ICON.lock + '</span>' : "";

    const interactive = state !== "locked";
    const handlers = interactive
      ? 'role="button" tabindex="0" ' +
        'onclick="toniHausToggleRoom(' + index + ')" ' +
        'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toniHausToggleRoom(' + index + ');}"'
      : 'aria-disabled="true"';

    return '' +
      '<div class="toni-haus__room ' + state + ' toni-tl-nav" data-step-index="' + index + '" ' +
        'aria-label="' + esc(step.title || ("Station " + (index + 1))) + '" ' + handlers + '>' +
        '<span class="toni-haus__pane"></span>' +
        lamp + worktag + lockmini +
        '<span class="toni-haus__ricon">' + roomIcon + '</span>' +
        '<span class="toni-haus__rname">' + esc(step.title || ("Station " + (index + 1))) + '</span>' +
        '<span class="toni-haus__tstrip" style="background:' + stripCol + '"></span>' +
        switchesWrap +
      '</div>';
  }

  /* ---------------------------------------------------------- Registrierung */
  window.toniThemes.register({
    id: "haus",
    label: "Wissenshaus",
    description: "Die Lernreise als Haus – Stationen sind Räume, Aufgaben sind Lichtschalter. Jeder fertige Raum geht an und leuchtet.",
    renderStations: renderStations,
    renderPreview: function () {
      // Mini-Haus bei Nacht: ein erleuchtetes, ein dunkles Fenster, Dach, Mond.
      return '<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">' +
        '<rect width="160" height="100" rx="10" fill="#0B1228"/>' +
        '<circle cx="132" cy="22" r="9" fill="#E4D9B4"/>' +
        '<circle cx="26" cy="18" r="1.4" fill="#fff"/><circle cx="60" cy="14" r="1.2" fill="#fff"/>' +
        '<circle cx="98" cy="24" r="1.3" fill="#fff"/>' +
        '<rect y="86" width="160" height="14" fill="#243018"/>' +
        // Hauskörper
        '<rect x="46" y="46" width="68" height="40" fill="#6B5847"/>' +
        // Dach
        '<path d="M40 46 L80 22 L120 46 Z" fill="#7A2E2A"/>' +
        '<circle cx="80" cy="24" r="3" fill="' + ACCENT + '"/>' +
        // Fenster: links AN (leuchtet), rechts dunkel
        '<rect x="54" y="54" width="22" height="22" rx="3" fill="' + LIGHT + '"/>' +
        '<rect x="54" y="54" width="22" height="22" rx="3" fill="none" stroke="#C98A2A" stroke-width="1"/>' +
        '<rect x="84" y="54" width="22" height="22" rx="3" fill="#1C232E" stroke="#3E3228" stroke-width="1"/>' +
        // Tür
        '<rect x="74" y="72" width="12" height="14" rx="2" fill="#43342a"/>' +
        '</svg>';
    }
  });

  console.info("[TONI-Theme:haus] Wissenshaus-Theme registriert (theme-haus-v2-empty-fix).");
})();
