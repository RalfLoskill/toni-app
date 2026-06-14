/* ============================================================
 * TONI – Lernreisen-Theme: "Weltall / Sternenroute"
 * Datei: journey_theme_space.js
 * Build: theme-space-v1
 *
 * STUFE 1: Erstes echtes Theme. Stellt die Stationen einer Lernreise
 * als Planeten auf einer geschwungenen Flugbahn dar (Start unten,
 * Ziel = Heimatstern oben). Registriert sich bei der Theme-Engine
 * (journey_theme.js) unter der id "space".
 *
 * Grundlage: Design-Prototyp 4_Sternenroute_Weltall.html.
 * Wesentlicher Unterschied zum Prototyp: Die Planetenpositionen werden
 * AUTOMATISCH für beliebig viele Stationen berechnet (der Prototyp hatte
 * sie von Hand gesetzt).
 *
 * Andocken an TONI:
 *  - Ein Planet = eine STATION (j.steps[i]). Klick öffnet die Aufgaben
 *    über den bestehenden Mechanismus window.toniTimelineSelect(i).
 *  - Der Status (done/current/locked) kommt aus stepStatus() von journey.js.
 *  - Die in einer Station enthaltenen Aufgaben-Typen werden als kleine
 *    farbige Punkte am Planeten angedeutet.
 *
 * Stufe 1 bewusst OHNE aufwändige Bewegung: dezentes, statisches Sternen-
 * feld. Lebhafte Animationen (driftende Sterne, Schiff im Orbit) folgen in
 * Stufe 4 – inkl. prefers-reduced-motion-Abschaltung.
 * ============================================================ */

(function () {
  "use strict";

  // Engine muss vorhanden sein (journey_theme.js lädt davor).
  if (!window.toniThemes || typeof window.toniThemes.register !== "function") {
    console.error("[TONI-Theme:space] Theme-Engine nicht gefunden – Theme wird nicht registriert.");
    return;
  }

  /* ---- Typ-Farben (entsprechen dem Prototyp / TONI-Farbcodierung) ---- */
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
    rocket: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3c2.5 2 4 5 4 9l1.5 1.5v1.5l-2.5-1-1 2h-4l-1-2-2.5 1v-1.5L8 12c0-4 1.5-7 4-9z"/><circle cx="12" cy="9" r="1.4"/></svg>'
  };

  // HTML-Escaping (lokal, um nicht von journey.js abzuhängen)
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  // Normalisiert einen Task-Typ auf TONI-Standard (nutzt journey.js, mit Fallback).
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

  // Status einer Station: nutzt journey.js' stepStatus (mit defensivem Fallback).
  function stationStatus(step, index, journey) {
    if (typeof window.stepStatus === "function") {
      try { return window.stepStatus(step, index, journey); } catch (e) { /* fällt durch */ }
    }
    return "current";
  }

  /* ----------------------------------------------------------
   * AUTOMATISCHES LAYOUT
   * Berechnet Planetenpositionen für N Stationen im SVG-Raum.
   * - Start unten (großer y), Ziel oben (kleiner y) – wie im Prototyp.
   * - x pendelt sinusförmig um die Mitte -> geschwungene Zickzack-Bahn.
   * -------------------------------------------------------- */
  const VW = 1000;             // SVG-Breite (Koordinatensystem)
  const MARGIN_X = 230;        // Auslenkung der Bahn nach links/rechts
  const STEP_GAP = 210;        // vertikaler Abstand zwischen zwei Stationen (mehr Luft für Titel)
  const PAD_TOP = 160;         // Platz oben für den Zielstern
  const PAD_BOTTOM = 150;      // Platz unten für den Start

  function computeLayout(n) {
    // Gesamthöhe wächst mit der Stationszahl -> funktioniert für 3 wie für 12.
    const vh = PAD_TOP + PAD_BOTTOM + Math.max(1, n - 1) * STEP_GAP;
    const pts = [];
    for (let i = 0; i < n; i++) {
      // i=0 unten, i=n-1 oben
      const y = vh - PAD_BOTTOM - i * STEP_GAP;
      // Sinus-Pendel: wechselt sanft die Seite; Amplitude = MARGIN_X
      const phase = Math.sin(i * 0.9);
      const x = VW / 2 + phase * MARGIN_X;
      pts.push({ x: Math.round(x), y: Math.round(y) });
    }
    const start = { x: VW / 2 - MARGIN_X * 0.5, y: vh - 40 };
    const goal = { x: VW / 2, y: PAD_TOP - 40 };
    return { vw: VW, vh: vh, pts: pts, start: start, goal: goal };
  }

  // Catmull-Rom-Spline -> weiche SVG-Pfad-Kurve (aus Prototyp übernommen).
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
   * CSS (einmalig injizieren)
   * -------------------------------------------------------- */
  function injectStyles() {
    if (document.getElementById("toni-theme-space-css")) return;
    const css = `
.toni-space{position:relative;width:100%;border-radius:16px;overflow:hidden;
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
.toni-space__label{position:absolute;top:38px;width:160px;left:50%;transform:translateX(-50%);
  display:flex;flex-direction:column;align-items:center;pointer-events:none;}
.toni-space__pname{margin-top:2px;font-size:13px;font-weight:650;color:#EAF0FF;line-height:1.25;
  text-shadow:0 1px 4px rgba(0,0,0,.7),0 0 8px rgba(12,16,36,.8);
  background:rgba(12,16,36,.35);padding:2px 8px;border-radius:8px;
  max-width:100%;word-wrap:break-word;}
.toni-space__orb{width:58px;height:58px;border-radius:50%;position:relative;display:grid;place-items:center;
  background:radial-gradient(circle at 32% 30%,#2A335E,#161B3C);
  box-shadow:0 0 0 3px rgba(255,255,255,.06),0 6px 18px rgba(0,0,0,.45);color:#fff;}
.toni-space__planet.done .toni-space__orb{background:radial-gradient(circle at 32% 30%,#2E6B52,#16402F);}
.toni-space__planet.current .toni-space__orb{background:radial-gradient(circle at 32% 30%,#3a4a86,#1c2550);
  box-shadow:0 0 0 4px rgba(255,200,87,.25),0 0 24px rgba(255,200,87,.45);}
.toni-space__planet.locked{opacity:.42;cursor:default;}
.toni-space__ico{width:26px;height:26px;display:block;}
.toni-space__halo{position:absolute;width:58px;height:58px;border-radius:50%;
  border:2px solid #FFC857;opacity:.55;animation:toniSpacePulse 2.4s ease-out infinite;}
@keyframes toniSpacePulse{0%{transform:scale(.85);opacity:.7}100%{transform:scale(1.7);opacity:0}}
.toni-space__tick{position:absolute;right:-3px;top:-3px;width:20px;height:20px;border-radius:50%;
  background:#3DDC97;color:#0C1024;display:grid;place-items:center;}
.toni-space__tick svg{width:13px;height:13px;}
.toni-space__dots{margin-top:4px;display:flex;gap:3px;justify-content:center;flex-wrap:wrap;}
.toni-space__dots span{width:7px;height:7px;border-radius:50%;display:inline-block;}
.toni-space__dest{position:absolute;transform:translate(-50%,-50%);z-index:4;text-align:center;
  color:#FFD98A;font-size:12px;font-weight:700;text-shadow:0 1px 6px rgba(0,0,0,.7);}
.toni-space__ship{position:absolute;z-index:7;transform:translate(-50%,-50%);pointer-events:none;
  width:30px;height:30px;color:#FF9D5C;}
@media (prefers-reduced-motion: reduce){
  .toni-space__halo{animation:none;}
}`;
    const el = document.createElement("style");
    el.id = "toni-theme-space-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ----------------------------------------------------------
   * RENDER
   * -------------------------------------------------------- */
  function renderStations(journey) {
    injectStyles();
    const steps = (journey && journey.steps) || [];
    const n = steps.length;
    if (n === 0) {
      return `<div class="toni-space" style="padding:40px;text-align:center;color:#9FB0D9">` +
             `Diese Lernreise hat noch keine Stationen.</div>`;
    }

    const L = computeLayout(n);

    // Status je Station + Index des aktuellen
    const states = steps.map((s, i) => stationStatus(s, i, journey));
    const curIdx = states.indexOf("current");

    // Flugbahn: Start -> alle Stationen -> Ziel
    const allPts = [L.start].concat(L.pts).concat([L.goal]);
    const fullD = spline(allPts);
    // begangener Teil: Start bis einschließlich aktueller Station
    const walkedUpto = curIdx >= 0 ? curIdx : (states.lastIndexOf("done"));
    const walkedPts = [L.start].concat(L.pts.slice(0, Math.max(0, walkedUpto + 1)));
    const walkedD = walkedUpto >= 0 ? spline(walkedPts) : "";

    // Sterne (statisch gestreut, deterministisch genug über Math.random beim Build)
    let starsHTML = "";
    const starCount = Math.min(90, 40 + n * 5);
    for (let i = 0; i < starCount; i++) {
      const sz = (Math.random() * 2 + 1).toFixed(1);
      starsHTML += `<i style="left:${(Math.random() * 100).toFixed(1)}%;` +
                   `top:${(Math.random() * 100).toFixed(1)}%;` +
                   `width:${sz}px;height:${sz}px"></i>`;
    }

    // SVG mit Flugbahn + Zielstern
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
          `<circle r="26" fill="#FFC857" opacity="0.25"/>` +
          `<path d="M0 -22 L6 -7 22 -7 9 3 14 19 0 9 -14 19 -9 3 -22 -7 -6 -7 Z" ` +
            `fill="#FFC857" stroke="#FF9D5C" stroke-width="1.5"/>` +
        `</g>` +
      `</svg>`;

    // Planeten (HTML, prozentual über dem SVG positioniert)
    let planetsHTML = "";
    for (let i = 0; i < n; i++) {
      const s = steps[i];
      const st = states[i];
      const p = L.pts[i];
      const leftPct = (p.x / L.vw * 100).toFixed(2);
      const topPct = (p.y / L.vh * 100).toFixed(2);

      // Aufgaben-Typen der Station als farbige Punkte
      const tasks = (s.tasks || []);
      const typeColorDots = tasks.slice(0, 6).map(function (t) {
        const c = TYPE_COLOR[normType(t.type)] || "#9FB0D9";
        return `<span style="background:${c}"></span>`;
      }).join("");

      const orbIcon = st === "done" ? ICON.check : st === "locked" ? ICON.lock : ICON.rocket;
      const tick = st === "done" ? `<span class="toni-space__tick">${ICON.check}</span>` : "";
      const halo = st === "current" ? `<span class="toni-space__halo"></span>` : "";

      // Klick nur, wenn nicht gesperrt – nutzt den bestehenden TONI-Mechanismus.
      const interactive = st !== "locked";
      const handlers = interactive
        ? `role="button" tabindex="0" ` +
          `onclick="toniTimelineSelect(${i})" ` +
          `onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toniTimelineSelect(${i});}"`
        : `aria-disabled="true"`;

      planetsHTML +=
        `<div class="toni-space__planet ${st} toni-tl-nav" data-step-index="${i}" ` +
          `style="left:${leftPct}%;top:${topPct}%" ${handlers}>` +
          halo +
          `<div class="toni-space__orb"><span class="toni-space__ico">${orbIcon}</span>${tick}</div>` +
          `<div class="toni-space__label">` +
            `<div class="toni-space__pname">${esc(s.title)}</div>` +
            (typeColorDots ? `<div class="toni-space__dots">${typeColorDots}</div>` : "") +
          `</div>` +
        `</div>`;
    }

    // Zielbeschriftung
    const destLeft = (L.goal.x / L.vw * 100).toFixed(2);
    const destTop = ((L.goal.y - 70) / L.vh * 100).toFixed(2);
    const destHTML = `<div class="toni-space__dest" style="left:${destLeft}%;top:${destTop}%">` +
                     `★ Ziel erreicht</div>`;

    return `<div class="toni-space">` +
             `<div class="toni-space__stars">${starsHTML}</div>` +
             `<div class="toni-space__voyage">${svg}${planetsHTML}${destHTML}</div>` +
           `</div>`;
  }

  /* ---- Registrierung bei der Engine ---- */
  window.toniThemes.register({
    id: "space",
    label: "Weltall",
    description: "Stationen als Planeten auf einer Flugbahn durchs All – Ziel ist der Heimatstern.",
    renderStations: renderStations
  });

  console.info("[TONI-Theme:space] Weltall-Theme registriert (theme-space-v1).");
})();
