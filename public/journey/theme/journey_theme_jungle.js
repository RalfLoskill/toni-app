/* ============================================================
 * TONI – Lernreisen-Theme: "Dschungel / Expedition"
 * Datei: journey_theme_jungle.js
 * Build: theme-jungle-v3-dickicht
 *
 * Schwester-Theme zu Weltall und Fußball. Stellt die Stationen einer
 * Lernreise als Rastplätze auf einem Zickzack-Trampelpfad durch einen
 * dichten Urwald dar (Start unten, Ziel oben). Aufgaben einer Station
 * erscheinen als kleine Holzschilder, die nach Klick auf die Station
 * auffächern und per window.openLearningTask(id) öffnen.
 *
 * Kulisse nach Nutzer-Vorlage: dichter geschichteter Urwald, Wasserstelle
 * mit zwei Elefanten (klein, unten), bunte Aras + Tukan + Affe (groß),
 * grüne Schlange, Schmetterlinge, Bananenstauden, Lichtstrahlen.
 *
 * Architektur identisch zu Weltall/Fußball:
 *  - Auto-Layout für beliebige Stationszahl (Zickzack via Sinus-Phase,
 *    Pfad als Catmull-Rom-Spline).
 *  - Vollbild randlos + Body-Scroll-Lock, gegated über
 *    body.toni-jungle-fullscreen (eigenes Präfix).
 *  - Aufgaben-Detail (lr-task-modal) ruhig lesbar (Variablen-Override).
 *  - Bewegung dezent; bei prefers-reduced-motion komplett aus.
 *
 * Farbwelt: sattes Urwaldgrün (#0B4326 → #7CC243), Tropenakzente
 * Hibiskus-Pink #FF4E8A, Papagei-Gelb #FFD23F, Ara-Blau #1CA7EC,
 * Orchideen-Violett #9B5DE5, Mango-Orange #FF8C42.
 * ============================================================ */

(function () {
  "use strict";

  if (!window.toniThemes || typeof window.toniThemes.register !== "function") {
    console.error("[TONI-Theme:jungle] Theme-Engine nicht gefunden – Theme wird nicht registriert.");
    return;
  }

  /* ---- Farbwelt ---- */
  const GREEN_DARK = "#0B4326";
  const GREEN_MID = "#1E7A36";
  const GREEN_LIGHT = "#7CC243";
  const ACCENT = "#FFD23F";   // Papagei-Gelb (Highlight)
  const PINK = "#FF4E8A";
  const BLUE = "#1CA7EC";
  const VIOLET = "#9B5DE5";
  const ORANGE = "#FF8C42";

  const TYPE_COLOR = {
    Lerninhalt: BLUE,
    Aufgabe: GREEN_LIGHT,
    Quiz: ACCENT,
    Reflexion: VIOLET,
    Video: PINK
  };

  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    leaf: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5 21c0-9 7-16 16-16 0 9-7 16-16 16z"/><path d="M5 21C9 14 14 9 21 5" fill="none" stroke="#0B4326" stroke-width="1.5"/></svg>',
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

  /* ---- AUTO-LAYOUT (Zickzack-Pfad, identisch zur Mechanik der Schwester-Themes) ---- */
  const VW = 1000;
  const MARGIN_X = 300;
  const STEP_GAP = 215;
  const PAD_TOP = 180;
  const PAD_BOTTOM = 200;

  function computeLayout(n) {
    const vh = PAD_TOP + PAD_BOTTOM + Math.max(1, n - 1) * STEP_GAP;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const y = vh - PAD_BOTTOM - i * STEP_GAP;
      const phase = Math.sin(i * 1.15 + 0.4);
      const x = VW / 2 + phase * MARGIN_X;
      pts.push({ x: Math.round(x), y: Math.round(y) });
    }
    const start = { x: VW / 2, y: vh - 60 };
    const goal = { x: VW / 2, y: PAD_TOP - 60 };
    return { vw: VW, vh: vh, pts: pts, start: start, goal: goal };
  }

  /* ---- Catmull-Rom-Spline (weicher Pfad durch die Punkte) ---- */
  function spline(points) {
    if (!points.length) return "";
    if (points.length < 3) {
      return "M" + points.map(function (p) { return p.x + " " + p.y; }).join(" L");
    }
    let d = "M" + points[0].x + " " + points[0].y;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i - 1] || points[i];
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[i + 2] || p2;
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;
      d += " C" + c1x.toFixed(1) + " " + c1y.toFixed(1) + " " +
        c2x.toFixed(1) + " " + c2y.toFixed(1) + " " + p2.x + " " + p2.y;
    }
    return d;
  }

  /* ---- Reduced Motion ---- */
  function reducedMotion() {
    return typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---- Stil-Block (einmalig injizieren) ---- */
  function injectStyles() {
    if (document.getElementById("toni-theme-jungle-css")) return;
    const css =
      ".toni-jungle{position:relative;width:100%;min-height:100%;overflow:visible;" +
        "padding-bottom:140px;font-family:Georgia,'Times New Roman',serif;}" +
      ".toni-jungle__voyage{position:relative;z-index:0;width:100%;display:block;}" +
      ".toni-jungle__voyage svg{display:block;width:100%;height:auto;}" +
      ".toni-jungle__scene{position:absolute;inset:0;width:100%;height:100%;z-index:0;}" +
      ".toni-jungle__scene svg{display:block;width:100%;height:100%;}" +
      ".toni-jungle__path{position:absolute;inset:0;width:100%;height:100%;z-index:1;pointer-events:none;}" +
      ".toni-jungle__path svg{display:block;width:100%;height:100%;}" +
      ".toni-jg__station{position:absolute;transform:translate(-50%,-50%);z-index:3;" +
        "cursor:pointer;text-align:center;}" +
      ".toni-jg__sign{position:relative;width:104px;min-height:66px;border-radius:10px;" +
        "background:#7A5230;border:3px solid #4A3018;box-shadow:0 6px 14px rgba(0,0,0,.35);" +
        "display:flex;align-items:center;justify-content:center;padding:6px;}" +
      ".toni-jg__sign .inner{width:100%;border-radius:6px;background:#B5814A;padding:6px 4px;" +
        "color:#3A2410;font-weight:bold;}" +
      ".toni-jg__num{font-size:26px;line-height:1;}" +
      ".toni-jg__title{display:block;font-size:11px;margin-top:3px;font-weight:normal;color:#2E1B0C;" +
        "max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".toni-jg__station.done .toni-jg__sign{background:#5C7A30;border-color:#37501C;}" +
      ".toni-jg__station.done .inner{background:#9ED36A;}" +
      ".toni-jg__station.locked .toni-jg__sign{background:#46402E;border-color:#2B2718;filter:grayscale(.5) brightness(.8);}" +
      ".toni-jg__station.locked .inner{background:#7E6240;color:#D9C7A8;}" +
      ".toni-jg__station.current .toni-jg__sign{box-shadow:0 0 0 4px rgba(255,210,63,.6),0 6px 16px rgba(0,0,0,.4);}" +
      ".toni-jg__badge{position:absolute;top:-12px;right:-12px;width:30px;height:30px;border-radius:50%;" +
        "display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3);}" +
      ".toni-jg__badge svg{width:18px;height:18px;}" +
      ".toni-jg__badge.done{background:#2E8B3D;}.toni-jg__badge.locked{background:#5F5E5A;}" +
      ".toni-jg__badge.current{background:" + ACCENT + ";color:#5A3D00;}" +
      ".toni-jg__tasks{position:absolute;left:50%;top:50%;z-index:4;pointer-events:none;}" +
      ".toni-jg__task{position:absolute;left:0;top:0;width:46px;height:40px;margin:-20px 0 0 -23px;" +
        "border-radius:7px;background:#7A5230;border:2px solid #4A3018;box-shadow:0 4px 9px rgba(0,0,0,.3);" +
        "display:flex;align-items:center;justify-content:center;color:#FFF3DA;pointer-events:none;cursor:pointer;" +
        "opacity:0;transform:translate(0,0) scale(.4);transition:transform .45s cubic-bezier(.34,1.56,.64,1),opacity .35s;}" +
      ".toni-jg__station.expanded .toni-jg__task{opacity:1;pointer-events:auto;" +
        "transform:translate(var(--tx,0),var(--ty,0)) scale(1);}" +
      ".toni-jg__station.expanded{z-index:20;}" +
      ".toni-jg__task svg{width:20px;height:20px;}" +
      ".toni-jg__task.done{background:#5C7A30;border-color:#37501C;}" +
      ".toni-jg__task.locked{filter:grayscale(.6) brightness(.8);cursor:default;}" +
      ".toni-jg__task .tk{position:absolute;top:-7px;right:-7px;width:18px;height:18px;border-radius:50%;" +
        "background:#2E8B3D;color:#fff;display:flex;align-items:center;justify-content:center;}" +
      ".toni-jg__task .tk svg{width:11px;height:11px;}" +
      ".toni-jg__toni{position:absolute;transform:translate(-50%,-92%);z-index:5;width:64px;pointer-events:none;}" +
      "@keyframes toniJgSway{0%,100%{transform:rotate(-3deg);}50%{transform:rotate(3deg);}}" +
      "@keyframes toniJgFloat{0%,100%{transform:translateY(0);}50%{transform:translateY(-7px);}}" +
      "@keyframes toniJgPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.08);}}" +
      ".toni-jg__sway{animation:toniJgSway 5s ease-in-out infinite;transform-origin:50% 100%;}" +
      ".toni-jg__float{animation:toniJgFloat 3.4s ease-in-out infinite;}" +
      ".toni-jg__station.current .toni-jg__sign{animation:toniJgPulse 2.6s ease-in-out infinite;}" +
      // ===== VOLLBILD (analog Weltall) =====
      "body.toni-jungle-fullscreen{overflow:hidden !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle.lr-modal-backdrop," +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle{" +
        "position:fixed !important;inset:0 !important;width:100vw !important;height:100vh !important;" +
        "max-width:none !important;max-height:none !important;margin:0 !important;" +
        "padding:0 !important;border:none !important;border-radius:0 !important;" +
        "box-shadow:none !important;overflow:hidden !important;" +
        "background:linear-gradient(180deg,#0B4326 0%,#06381E 100%) !important;z-index:4000 !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-modal," +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-modal-card," +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle > div{" +
        "max-width:none !important;width:100% !important;height:100% !important;" +
        "border:none !important;border-radius:0 !important;background:transparent !important;" +
        "box-shadow:none !important;overflow:hidden !important;display:flex !important;flex-direction:column !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-modal-body{" +
        "padding:0 !important;margin:0 !important;background:transparent !important;" +
        "border:none !important;border-radius:0 !important;box-shadow:none !important;" +
        "flex:1 1 auto !important;height:auto !important;min-height:0 !important;max-height:none !important;" +
        "overflow-y:auto !important;overflow-x:hidden !important;overscroll-behavior:contain !important;-webkit-overflow-scrolling:touch;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-detail-grid," +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-main-card{" +
        "padding:0 !important;margin:0 !important;background:transparent !important;" +
        "border:none !important;border-radius:0 !important;box-shadow:none !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .toni-jungle{" +
        "overflow:visible !important;border-radius:0 !important;padding-bottom:120px !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-stations{" +
        "padding-bottom:120px !important;}" +
      ".toni-theme-active-jungle .lr-top-split{" +
        "grid-template-columns:1fr !important;grid-template-areas:'stations' 'right' !important;}" +
      ".toni-theme-active-jungle .lr-top-split .lr-stations{background:transparent !important;padding:0 !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle #lr-modal-sub," +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-modal-sub{display:none !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-right-col," +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle #lr-right-col{display:none !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-progress-big{display:none !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-cover-screen-v89{display:none !important;}" +
      "body.toni-jungle-fullscreen #lr-task-modal.lr-modal-backdrop," +
      "body.toni-jungle-fullscreen #lr-task-modal{z-index:5000 !important;}" +
      // Punkt 6: Titel der Reise ausblenden, Header/Buttons transparent (wie Weltall)
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-modal-title{display:none !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-modal-header{" +
        "position:absolute !important;top:0 !important;left:0 !important;right:0 !important;" +
        "z-index:20 !important;background:transparent !important;border:none !important;" +
        "box-shadow:none !important;padding:10px 14px !important;display:flex !important;justify-content:flex-end !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-modal-actions{width:auto !important;gap:8px !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-modal-actions button{" +
        "flex:0 0 auto !important;background:rgba(11,67,38,.7) !important;color:#EAF7EE !important;" +
        "border:1px solid rgba(255,210,63,.6) !important;backdrop-filter:blur(4px);}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .lr-modal-actions button[onclick*=\"startNextLearningTask\"]{display:none !important;}" +
      "body.toni-jungle-fullscreen #lr-modal.toni-theme-active-jungle .card-header{display:none !important;}" +
      "@media (prefers-reduced-motion: reduce){" +
        ".toni-jg__sway,.toni-jg__float{animation:none !important;}" +
        ".toni-jungle__scene *{animation:none !important;}}";
    const el = document.createElement("style");
    el.id = "toni-theme-jungle-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---- Tier-Bausteine (groß & bunt) ---- */
  function elephantsSVG(cx, cy) {
    return '<g transform="translate(' + cx + ',' + cy + ') scale(0.8)">' +
      '<ellipse cx="40" cy="120" rx="96" ry="32" fill="#063318" opacity="0.3"/>' +
      '<ellipse cx="35" cy="70" rx="74" ry="56" fill="#8C8C92"/>' +
      '<ellipse cx="-12" cy="52" rx="28" ry="26" fill="#9A9AA0"/>' +
      '<path d="M-34 46 Q -56 30 -48 66 Q -38 58 -32 58 Z" fill="#9A9AA0"/>' +
      '<path d="M-20 58 Q -32 96 -22 116" fill="none" stroke="#8C8C92" stroke-width="10" stroke-linecap="round">' +
        '<animate attributeName="d" dur="3s" repeatCount="indefinite" values="M-20 58 Q -32 96 -22 116;M-20 58 Q -36 96 -18 114;M-20 58 Q -32 96 -22 116"/></path>' +
      '<circle cx="-16" cy="48" r="3.2" fill="#2A2A2E"/>' +
      '<rect x="8" y="118" width="14" height="24" rx="6" fill="#7A7A80"/><rect x="42" y="120" width="14" height="24" rx="6" fill="#7A7A80"/><rect x="62" y="116" width="14" height="24" rx="6" fill="#7A7A80"/>' +
      '<g transform="translate(96,84) scale(0.62)">' +
        '<ellipse cx="0" cy="0" rx="52" ry="42" fill="#9A9AA0"/>' +
        '<ellipse cx="-28" cy="-16" rx="20" ry="19" fill="#A6A6AC"/>' +
        '<path d="M-46 38 Q -40 58 -30 46" fill="none" stroke="#9A9AA0" stroke-width="8" stroke-linecap="round"/>' +
        '<circle cx="-32" cy="-18" r="2.6" fill="#2A2A2E"/></g>' +
      '</g>';
  }

  function arasSVG(vw, vh, still) {
    // 5 fliegende Papageien (Punkt 7) auf verschiedenen Flugbahnen
    function flyingParrot(pathD, dur, scale, bodyCol, wingCol) {
      const motion = still
        ? ''
        : '<animateMotion dur="' + dur + 's" repeatCount="indefinite" path="' + pathD + '"/>';
      const wing = still ? '' :
        '<animateTransform attributeName="transform" type="scale" dur="0.35s" repeatCount="indefinite" ' +
        'values="1 1;1 0.5;1 1" additive="sum"/>';
      return '<g>' + motion +
        '<g transform="scale(' + scale + ')">' +
        '<ellipse cx="0" cy="0" rx="13" ry="10" fill="' + bodyCol + '"/>' +
        '<circle cx="8" cy="-7" r="7" fill="' + bodyCol + '"/>' +
        '<path d="M14 -8 L26 -5 L14 -2 Z" fill="#FFD23F"/>' +
        '<circle cx="9" cy="-8" r="1.8" fill="#fff"/><circle cx="9" cy="-8" r="0.9" fill="#111"/>' +
        '<path d="M-14 4 Q -30 16 -34 32" fill="none" stroke="' + wingCol + '" stroke-width="3"/>' +
        '<g>' + wing + '<ellipse cx="-4" cy="-2" rx="11" ry="6" fill="' + wingCol + '"/></g>' +
        '</g></g>';
    }
    const parrots =
      flyingParrot("M-60 " + (vh * 0.2) + " C " + (vw * 0.3) + " " + (vh * 0.1) + ", " + (vw * 0.7) + " " + (vh * 0.28) + ", " + (vw + 60) + " " + (vh * 0.15), 13, 1.5, "#E0322B", "#1CA7EC") +
      flyingParrot("M" + (vw + 60) + " " + (vh * 0.34) + " C " + (vw * 0.7) + " " + (vh * 0.24) + ", " + (vw * 0.3) + " " + (vh * 0.42) + ", -60 " + (vh * 0.3), 16, 1.6, "#1CA7EC", "#FFD23F") +
      flyingParrot("M-60 " + (vh * 0.5) + " C " + (vw * 0.35) + " " + (vh * 0.58) + ", " + (vw * 0.65) + " " + (vh * 0.44) + ", " + (vw + 60) + " " + (vh * 0.52), 15, 1.4, "#FFD23F", "#E0322B") +
      flyingParrot("M" + (vw + 60) + " " + (vh * 0.66) + " C " + (vw * 0.6) + " " + (vh * 0.72) + ", " + (vw * 0.3) + " " + (vh * 0.6) + ", -60 " + (vh * 0.68), 18, 1.5, "#9B5DE5", "#FFD23F") +
      flyingParrot("M-60 " + (vh * 0.82) + " C " + (vw * 0.3) + " " + (vh * 0.76) + ", " + (vw * 0.7) + " " + (vh * 0.88) + ", " + (vw + 60) + " " + (vh * 0.8), 17, 1.5, "#FF8C42", "#1CA7EC");
    return parrots +
      '<g transform="translate(' + (vw * 0.16) + ',' + (vh * 0.12) + ') scale(1.5)">' +
        '<g class="toni-jg__float">' +
        '<ellipse cx="0" cy="0" rx="20" ry="17" fill="#E0322B"/><circle cx="-11" cy="-13" r="11" fill="#E0322B"/>' +
        '<path d="M-1 -16 C 7 -34 22 -28 13 -13" fill="none" stroke="#FFD23F" stroke-width="6"/>' +
        '<circle cx="-13" cy="-14" r="3" fill="#fff"/><circle cx="-13" cy="-14" r="1.5" fill="#111"/>' +
        '<path d="M13 -3 C 36 1 38 19 16 16" fill="#1CA7EC"/><path d="M10 12 C 30 22 30 40 12 34" fill="#FFD23F"/></g>' +
      '</g>' +
      '<g transform="translate(' + (vw * 0.8) + ',' + (vh * 0.16) + ') scale(1.6)">' +
        '<g class="toni-jg__float" style="animation-delay:.6s">' +
        '<ellipse cx="0" cy="0" rx="20" ry="17" fill="#1CA7EC"/><circle cx="10" cy="-13" r="11" fill="#1CA7EC"/>' +
        '<path d="M1 -16 C -7 -34 -22 -28 -13 -13" fill="none" stroke="#FFD23F" stroke-width="6"/>' +
        '<circle cx="13" cy="-14" r="3" fill="#fff"/><circle cx="13" cy="-14" r="1.5" fill="#111"/>' +
        '<path d="M-13 -3 C -36 1 -38 19 -16 16" fill="#FFD23F"/><path d="M-10 12 C -30 22 -30 40 -12 34" fill="#0B8BC9"/></g>' +
      '</g>' +
      '<g transform="translate(' + (vw * 0.62) + ',' + (vh * 0.08) + ') scale(1.4)">' +
        '<ellipse cx="0" cy="6" rx="17" ry="14" fill="#111"/><circle cx="-11" cy="-9" r="12" fill="#111"/>' +
        '<path d="M-3 -11 L22 -6 L-3 -1 Z" fill="#FF8C42" stroke="#C25A12" stroke-width="1"/>' +
        '<circle cx="-13" cy="-11" r="3.2" fill="#FFD23F"/><circle cx="-13" cy="-11" r="1.6" fill="#111"/>' +
        '<ellipse cx="2" cy="11" rx="11" ry="7" fill="#FFD23F"/></g>' +
      '<g transform="translate(' + (vw * 0.82) + ',' + (vh * 0.6) + ') scale(1.2)">' +
        '<g class="toni-jg__float" style="animation-delay:.3s">' +
        '<ellipse cx="0" cy="20" rx="22" ry="28" fill="#5A3A22"/>' +
        '<circle cx="0" cy="-8" r="18" fill="#6B4A2B"/><circle cx="0" cy="-2" r="11" fill="#C9A36A"/>' +
        '<circle cx="-7" cy="-8" r="3" fill="#2A1A0C"/><circle cx="7" cy="-8" r="3" fill="#2A1A0C"/>' +
        '<path d="M-8 2 Q 0 8 8 2" fill="none" stroke="#2A1A0C" stroke-width="2"/>' +
        '<circle cx="-19" cy="-12" r="8" fill="#5A3A22"/><circle cx="19" cy="-12" r="8" fill="#5A3A22"/></g>' +
      '</g>';
  }

  function snakeSVG(x, y) {
    return '<g transform="translate(' + x + ',' + y + ')">' +
      '<path d="M0 0 Q 70 -24 130 12 Q 178 36 130 60 Q 82 80 130 104 Q 178 124 144 146" ' +
        'fill="none" stroke="#7CC243" stroke-width="18" stroke-linecap="round"/>' +
      '<path d="M0 0 Q 70 -24 130 12 Q 178 36 130 60 Q 82 80 130 104 Q 178 124 144 146" ' +
        'fill="none" stroke="#3B8B1C" stroke-width="18" stroke-linecap="round" stroke-dasharray="5 18" opacity="0.6"/>' +
      '<g transform="translate(-2,-2)"><circle cx="0" cy="0" r="11" fill="#7CC243"/>' +
        '<circle cx="-4" cy="-3" r="2.4" fill="#111"/>' +
        '<path d="M-10 5 L-20 9 M-10 7 L-20 11" stroke="#FF4E8A" stroke-width="1.8"/></g>' +
      '</g>';
  }

  function bigLeavesSVG(vw, vh, still) {
    function leaf(x, y, sc, rot, delay) {
      const cls = still ? "" : ' class="toni-jg__sway" style="animation-delay:' + delay + 's"';
      return '<g transform="translate(' + x + ',' + y + ')"' + cls + '>' +
        '<g transform="scale(' + sc + ') rotate(' + rot + ')">' +
        '<path d="M0 0 C -26 -17 -54 -11 -45 10 C -30 1 -11 1 0 0 M0 0 C 26 -17 54 -11 45 10 C 30 1 11 1 0 0" fill="#2E9B3D"/>' +
        '<path d="M0 -2 L0 16" stroke="#0E5520" stroke-width="2"/></g></g>';
    }
    function bleaf(x, y, rot) {
      return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ')">' +
        '<path d="M0 0 C -12 60 -12 130 0 178 C 12 130 12 60 0 0 Z" fill="#2FA043"/>' +
        '<path d="M0 6 L0 170" stroke="#0C4A1C" stroke-width="2.5"/></g>';
    }
    return '<g opacity="0.92">' +
      bleaf(vw * 0.04, -14, 20) + bleaf(vw * 0.1, -14, 44) +
      bleaf(vw * 0.96, -14, -22) + bleaf(vw * 0.9, -14, -46) +
      bleaf(vw * 0.5, -28, 6) +
      leaf(vw * 0.09, vh * 0.27, 2.0, 0, 0) +
      leaf(vw * 0.19, vh * 0.19, 1.6, 40, 0.5) +
      leaf(vw * 0.84, vh * 0.23, 2.0, -30, 0.3) +
      leaf(vw * 0.05, vh * 0.5, 2.2, 55, 0.8) +
      leaf(vw * 0.95, vh * 0.6, 2.2, -50, 0.2) +
      leaf(vw * 0.22, vh * 0.85, 1.9, 35, 0.6) +
      leaf(vw * 0.8, vh * 0.88, 1.9, -35, 0.4) +
      '</g>';
  }

  /* ---- Kulisse zusammensetzen ---- */
  function sceneSVG(vw, vh) {
    const still = reducedMotion();
    const pondCY = vh - 150;
    return '' +
      '<svg viewBox="0 0 ' + vw + ' ' + vh + '" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="jgScSky" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#EAF7B0"/><stop offset="0.22" stop-color="#9FD64E"/>' +
          '<stop offset="0.5" stop-color="#2E8B36"/><stop offset="1" stop-color="' + GREEN_DARK + '"/>' +
        '</linearGradient>' +
        '<radialGradient id="jgScLight" cx="0.5" cy="0.04" r="0.5">' +
          '<stop offset="0" stop-color="#FFFDD8" stop-opacity="0.95"/><stop offset="1" stop-color="#FFFDD8" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<linearGradient id="jgScRay" x1="0" y1="0" x2="0.15" y2="1">' +
          '<stop offset="0" stop-color="#FFFEE0" stop-opacity="0.5"/><stop offset="1" stop-color="#FFFEE0" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<radialGradient id="jgScPond" cx="0.5" cy="0.4" r="0.6">' +
          '<stop offset="0" stop-color="#BFEFFF"/><stop offset="0.6" stop-color="#4FA9C9"/><stop offset="1" stop-color="#1E6E86"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<rect x="0" y="0" width="' + vw + '" height="' + vh + '" fill="url(#jgScSky)"/>' +
      '<rect x="0" y="0" width="' + vw + '" height="' + (vh * 0.5) + '" fill="url(#jgScLight)"/>' +
      '<g opacity="0.5">' +
        '<polygon points="' + (vw * 0.38) + ',0 ' + (vw * 0.5) + ',0 ' + (vw * 0.47) + ',' + (vh * 0.55) + '" fill="url(#jgScRay)"/>' +
        '<polygon points="' + (vw * 0.5) + ',0 ' + (vw * 0.66) + ',0 ' + (vw * 0.62) + ',' + (vh * 0.58) + '" fill="url(#jgScRay)"/>' +
        '<polygon points="' + (vw * 0.2) + ',0 ' + (vw * 0.3) + ',0 ' + (vw * 0.27) + ',' + (vh * 0.45) + '" fill="url(#jgScRay)"/>' +
      '</g>' +
      '<g opacity="0.34" fill="#052C16">' +
        '<ellipse cx="' + (vw * 0.1) + '" cy="110" rx="200" ry="130"/>' +
        '<ellipse cx="' + (vw * 0.9) + '" cy="90" rx="210" ry="140"/>' +
        '<ellipse cx="' + (vw * 0.5) + '" cy="60" rx="220" ry="110"/>' +
      '</g>' +
      '<g opacity="0.45" fill="#073A1C">' +
        '<rect x="' + (vw * 0.05) + '" y="0" width="34" height="' + (vh * 0.7) + '" rx="14"/>' +
        '<rect x="' + (vw * 0.7) + '" y="0" width="38" height="' + (vh * 0.72) + '" rx="15"/>' +
      '</g>' +
      '<ellipse cx="' + (vw / 2) + '" cy="' + pondCY + '" rx="230" ry="92" fill="url(#jgScPond)"/>' +
      '<ellipse cx="' + (vw / 2) + '" cy="' + pondCY + '" rx="230" ry="92" fill="none" stroke="#0C4A1C" stroke-width="6" opacity="0.5"/>' +
      // Punkt 4: animiertes Tier im Wasserloch (Krokodil, das auf-/abtaucht + Auge blinzelt)
      waterAnimalSVG(vw / 2 + 70, pondCY, still) +
      elephantsSVG(vw / 2 - 60, pondCY - 30) +
      arasSVG(vw, vh, still) +
      snakeSVG(vw * 0.08, vh * 0.5) +
      bigLeavesSVG(vw, vh, still) +
      cornerLeavesSVG(vw, vh, still) +
      grassSVG(vw, vh, still) +
      (still ? '' :
        '<g opacity="0.9">' +
        '<circle cx="' + (vw * 0.3) + '" cy="' + (vh * 0.5) + '" r="4" fill="#FFFDD8"><animate attributeName="opacity" dur="2s" repeatCount="indefinite" values="0.2;1;0.2"/></circle>' +
        '<circle cx="' + (vw * 0.62) + '" cy="' + (vh * 0.46) + '" r="3.5" fill="#FFFDD8"><animate attributeName="opacity" dur="2.6s" repeatCount="indefinite" values="1;0.2;1"/></circle>' +
        '</g>') +
      '</svg>';
  }

  /* ---- Punkt 4: Tier im Wasserloch (Krokodil, animiert) ---- */
  function waterAnimalSVG(x, y, still) {
    const bob = still ? "" :
      '<animateTransform attributeName="transform" type="translate" dur="4s" repeatCount="indefinite" ' +
      'values="' + x + ' ' + y + ';' + x + ' ' + (y - 8) + ';' + x + ' ' + y + '"/>';
    const blink = still ? "" :
      '<animate attributeName="ry" dur="3.5s" repeatCount="indefinite" values="5;1;5;5;5"/>';
    return '<g transform="translate(' + x + ',' + y + ')">' + bob +
      // Körper knapp über Wasser
      '<ellipse cx="0" cy="2" rx="78" ry="13" fill="#2E6B2A"/>' +
      '<path d="M-78 2 Q -40 -8 0 -4 Q 40 -8 78 2" fill="#3B8B34"/>' +
      // Augenhügel
      '<ellipse cx="40" cy="-8" rx="11" ry="9" fill="#3B8B34"/>' +
      '<ellipse cx="58" cy="-8" rx="11" ry="9" fill="#3B8B34"/>' +
      '<ellipse cx="40" cy="-10" rx="3.5" ry="5" fill="#FFD23F"><animate attributeName="ry" dur="3.5s" repeatCount="indefinite" values="5;5;1;5;5"/></ellipse>' +
      '<ellipse cx="58" cy="-10" rx="3.5" ry="5" fill="#FFD23F">' + blink + '</ellipse>' +
      '<circle cx="40" cy="-10" r="1.6" fill="#111"/><circle cx="58" cy="-10" r="1.6" fill="#111"/>' +
      // Zacken auf dem Rücken
      '<path d="M-40 -2 l6 -7 6 7 z M-24 -3 l6 -8 6 8 z M-8 -3 l6 -8 6 8 z" fill="#256322"/>' +
      // Wasserkreise
      (still ? '' :
        '<ellipse cx="0" cy="10" rx="80" ry="14" fill="none" stroke="#EAFBFF" stroke-width="2" opacity="0.4">' +
        '<animate attributeName="rx" dur="3s" repeatCount="indefinite" values="60;95;60"/>' +
        '<animate attributeName="opacity" dur="3s" repeatCount="indefinite" values="0.5;0;0.5"/></ellipse>') +
      '</g>';
  }

  /* ---- Vollbild-Schalter ---- */
  function enableFullscreen() {
    document.body.classList.add("toni-jungle-fullscreen");
    watchModalClose();
  }
  function disableFullscreen() {
    document.body.classList.remove("toni-jungle-fullscreen");
  }
  let _obs = null;
  function watchModalClose() {
    if (_obs) return;
    const modal = document.getElementById("lr-modal");
    if (!modal || typeof MutationObserver !== "function") return;
    _obs = new MutationObserver(function () {
      const open = modal.classList.contains("open") ||
        modal.classList.contains("toni-theme-active-jungle");
      const stillJungle = modal.classList.contains("toni-theme-active-jungle");
      if (!open || !stillJungle) disableFullscreen();
    });
    _obs.observe(modal, { attributes: true, attributeFilter: ["class"] });
  }

  /* ---- TONI-Entdecker (Forscher mit Tropenhut) ---- */
  function toniExplorerSVG() {
    return '<svg viewBox="0 0 64 80" xmlns="http://www.w3.org/2000/svg">' +
      '<ellipse cx="32" cy="76" rx="18" ry="4" fill="#063318" opacity="0.4"/>' +
      '<rect x="22" y="40" width="20" height="26" rx="8" fill="' + ORANGE + '"/>' +
      '<circle cx="32" cy="30" r="15" fill="#FFE0B5"/>' +
      '<path d="M14 26 Q 32 14 50 26 L50 30 Q 32 24 14 30 Z" fill="#8A5A2B"/>' +
      '<ellipse cx="32" cy="24" rx="13" ry="7" fill="#A56A33"/>' +
      '<circle cx="27" cy="30" r="2" fill="#2A1A0C"/><circle cx="37" cy="30" r="2" fill="#2A1A0C"/>' +
      '<path d="M27 36 Q 32 39 37 36" fill="none" stroke="#2A1A0C" stroke-width="1.6"/>' +
      '<rect x="16" y="44" width="8" height="18" rx="4" fill="#FFE0B5"/>' +
      '<rect x="40" y="44" width="8" height="18" rx="4" fill="#FFE0B5"/>' +
      '</svg>';
  }

  /* ---- Station auf-/zuklappen (benannte globale Funktion, wie Weltall) ---- */
  window.toniJungleToggleStation = function (index) {
    const root = document.querySelector(".toni-jungle");
    if (!root) return;
    const station = root.querySelector('.toni-jg__station[data-step-index="' + index + '"]');
    if (!station || station.classList.contains("locked")) return;
    const already = station.classList.contains("expanded");
    root.querySelectorAll('.toni-jg__station.expanded').forEach(function (s) {
      s.classList.remove("expanded");
    });
    if (!already) station.classList.add("expanded");
    if (typeof window.toniTimelineSelect === "function") {
      try { window.toniTimelineSelect(index); } catch (e) { /* nicht kritisch */ }
    }
  };

  /* ---- Punkt 2+5: 500 Gräser, die von außen hereinragen (dichtes Dickicht) ---- */
  function grassSVG(vw, vh, still) {
    const COUNT = 500;
    const greens = ["#1E7A36", "#2E9B3D", "#3FB34A", "#176B2A", "#5FB83B", "#7CC243"];
    let out = '<g class="toni-jg__grass">';
    // pseudo-zufällig, aber deterministisch (kein Math.random -> stabiles Markup)
    let seed = 1337;
    function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
    for (let i = 0; i < COUNT; i++) {
      const side = i % 4; // 0 unten,1 oben,2 links,3 rechts
      let x, y, baseRot, len;
      const r = rnd();
      len = 40 + rnd() * 90;
      if (side === 0) { x = rnd() * vw; y = vh + 6; baseRot = -8 + rnd() * 16; }
      else if (side === 1) { x = rnd() * vw; y = -6; baseRot = 180 + (-8 + rnd() * 16); }
      else if (side === 2) { x = -6; y = rnd() * vh; baseRot = 90 + (-10 + rnd() * 20); }
      else { x = vw + 6; y = rnd() * vh; baseRot = -90 + (-10 + rnd() * 20); }
      const col = greens[(i * 7) % greens.length];
      const w = 5 + rnd() * 5;
      const bend = (rnd() - 0.5) * 30;
      const blade =
        '<path d="M0 0 Q ' + bend.toFixed(0) + ' ' + (-len * 0.55).toFixed(0) + ' ' +
        (bend * 0.6).toFixed(0) + ' ' + (-len).toFixed(0) + '" ' +
        'fill="none" stroke="' + col + '" stroke-width="' + w.toFixed(1) + '" stroke-linecap="round"/>';
      const dur = (3.5 + rnd() * 3).toFixed(1);
      const delay = (rnd() * 3).toFixed(1);
      const swayDeg = 3 + rnd() * 5;
      const anim = still ? "" :
        '<animateTransform attributeName="transform" type="rotate" additive="sum" ' +
        'dur="' + dur + 's" repeatCount="indefinite" begin="-' + delay + 's" ' +
        'values="' + (-swayDeg) + ' 0 0;' + swayDeg + ' 0 0;' + (-swayDeg) + ' 0 0"/>';
      out += '<g transform="translate(' + x.toFixed(0) + ',' + y.toFixed(0) + ') rotate(' + baseRot.toFixed(0) + ')">' +
        '<g>' + anim + blade + '</g></g>';
    }
    out += '</g>';
    return out;
  }

  /* ---- Punkt 3: animierte Blätter an allen 4 Ecken ---- */
  function cornerLeavesSVG(vw, vh, still) {
    function cornerLeaf(x, y, rot, delay) {
      const cls = still ? "" : ' class="toni-jg__sway" style="animation-delay:' + delay + 's"';
      return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ')"' + cls + '>' +
        '<g transform="scale(2.2)">' +
        '<path d="M0 0 C -28 -18 -58 -12 -48 11 C -32 1 -12 1 0 0 M0 0 C 28 -18 58 -12 48 11 C 32 1 12 1 0 0" fill="#2E9B3D"/>' +
        '<path d="M0 -2 L0 18" stroke="#0E5520" stroke-width="2"/></g></g>';
    }
    // große Bananenblätter zusätzlich an allen Ecken
    function cornerBleaf(x, y, rot) {
      return '<g transform="translate(' + x + ',' + y + ') rotate(' + rot + ')">' +
        '<path d="M0 0 C -13 65 -13 140 0 192 C 13 140 13 65 0 0 Z" fill="#2FA043"/>' +
        '<path d="M0 6 L0 184" stroke="#0C4A1C" stroke-width="2.5"/></g>';
    }
    return '<g opacity="0.95">' +
      // oben links
      cornerBleaf(vw * 0.03, -16, 28) + cornerLeaf(vw * 0.09, vh * 0.05, 35, 0) +
      // oben rechts
      cornerBleaf(vw * 0.97, -16, -28) + cornerLeaf(vw * 0.91, vh * 0.05, -35, 0.5) +
      // unten links
      cornerLeaf(vw * 0.06, vh * 0.96, 145, 0.3) + cornerBleaf(vw * 0.02, vh + 10, 200) +
      // unten rechts
      cornerLeaf(vw * 0.94, vh * 0.96, -145, 0.7) + cornerBleaf(vw * 0.98, vh + 10, 160) +
      '</g>';
  }

  /* ---- Hauptrenderer ---- */
  function renderStations(journey) {
    injectStyles();
    enableFullscreen();

    const steps = (journey && journey.steps) || [];
    const n = steps.length;
    if (n === 0) {
      return '<div class="toni-jungle" style="padding:40px;text-align:center;color:#EAF7EE">' +
             'Diese Lernreise hat noch keine Stationen.</div>';
    }

    const L = computeLayout(n);
    const states = steps.map(function (s, i) { return stationStatus(s, i, journey); });
    const curIdx = states.indexOf("current");
    const walkedUpto = curIdx >= 0 ? curIdx : states.lastIndexOf("done");

    const allPts = [L.start].concat(L.pts).concat([L.goal]);
    const fullD = spline(allPts);
    const walkedPts = [L.start].concat(L.pts.slice(0, Math.max(0, walkedUpto + 1)));
    const walkedD = walkedUpto >= 0 ? spline(walkedPts) : "";

    // Pfad-SVG über der Kulisse (Trampelpfad)
    const pathSvg =
      '<svg viewBox="0 0 ' + L.vw + ' ' + L.vh + '" preserveAspectRatio="none" ' +
        'xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
        '<defs><linearGradient id="jgWalk" x1="0" y1="1" x2="0" y2="0">' +
          '<stop offset="0" stop-color="' + ACCENT + '"/><stop offset="1" stop-color="' + GREEN_LIGHT + '"/>' +
        '</linearGradient></defs>' +
        '<path d="' + fullD + '" fill="none" stroke="#6B4A2B" stroke-width="34" stroke-linecap="round" opacity="0.85"/>' +
        '<path d="' + fullD + '" fill="none" stroke="#C9A36A" stroke-width="18" stroke-linecap="round" stroke-dasharray="2 22" opacity="0.8"/>' +
        (walkedD ? '<path d="' + walkedD + '" fill="none" stroke="url(#jgWalk)" stroke-width="8" stroke-linecap="round" opacity="0.9"/>' : "") +
      '</svg>';

    // Stationen + Aufgaben-Schilder
    let stationsHTML = "";
    for (let i = 0; i < n; i++) {
      const s = steps[i];
      const st = states[i];
      const p = L.pts[i];
      const leftPct = (p.x / L.vw * 100).toFixed(2);
      const topPct = (p.y / L.vh * 100).toFixed(2);
      const tasks = (s.tasks || []);
      const num = i + 1;

      const badge = st === "done"
        ? '<span class="toni-jg__badge done">' + ICON.check + '</span>'
        : st === "locked"
          ? '<span class="toni-jg__badge locked">' + ICON.lock + '</span>'
          : '<span class="toni-jg__badge current">' + ICON.leaf + '</span>';

      const title = esc(s.title || ("Station " + num));

      // Aufgaben-Holzschilder, fächern beim Klick auf (Halbkreis nach oben)
      let tasksHTML = "";
      const m = tasks.length;
      if (m > 0) {
        const radius = 96 + Math.min(3, Math.max(0, m - 4)) * 12;
        for (let k = 0; k < m; k++) {
          const t = tasks[k];
          const tt = normType(t.type);
          const col = TYPE_COLOR[tt] || GREEN_LIGHT;
          const frac = m === 1 ? 0.5 : k / (m - 1);
          const ang = (-160 + frac * 140) * Math.PI / 180;
          const tx = Math.cos(ang) * radius;
          const ty = Math.sin(ang) * radius;
          const locked = (st === "locked");
          const done = t.status === "done";
          const tick = done ? '<span class="tk">' + ICON.check + '</span>' : "";
          const handlers = locked
            ? 'aria-disabled="true"'
            : 'role="button" tabindex="0" ' +
              'onclick="event.stopPropagation();openLearningTask(\'' + esc(t.id) + '\')" ' +
              'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();openLearningTask(\'' + esc(t.id) + '\');}"';
          tasksHTML +=
            '<div class="toni-jg__task ' + (done ? "done" : "") + ' ' + (locked ? "locked" : "") + '" ' +
              'style="--tx:' + tx.toFixed(1) + 'px;--ty:' + ty.toFixed(1) + 'px;transition-delay:' + (k * 45) + 'ms;" ' +
              'title="' + esc(t.title || tt) + '" ' + handlers + '>' +
              '<span style="color:' + col + '">' + typeIcon(tt) + '</span>' + tick +
            '</div>';
        }
      }

      const fanToggle = 'data-step-index="' + i + '" onclick="toniJungleToggleStation(' + i + ')"';
      stationsHTML +=
        '<div class="toni-jg__station ' + st + '" style="left:' + leftPct + '%;top:' + topPct + '%" ' + fanToggle + '>' +
          '<div class="toni-jg__tasks">' + tasksHTML + '</div>' +
          '<div class="toni-jg__sign">' + badge +
            '<div class="inner"><span class="toni-jg__num">' + num + '</span>' +
              '<span class="toni-jg__title">' + title + '</span></div>' +
          '</div>' +
        '</div>';
    }

    // TONI an der aktuellen (oder ersten offenen) Station
    let toniHTML = "";
    const toniIdx = curIdx >= 0 ? curIdx : (walkedUpto >= 0 ? walkedUpto : 0);
    if (L.pts[toniIdx]) {
      const tp = L.pts[toniIdx];
      const tl = (tp.x / L.vw * 100).toFixed(2);
      const tt2 = (tp.y / L.vh * 100).toFixed(2);
      toniHTML = '<div class="toni-jg__toni" style="left:' + tl + '%;top:' + tt2 + '%">' + toniExplorerSVG() + '</div>';
    }

    // Ziel-Schild
    const goalL = (L.goal.x / L.vw * 100).toFixed(2);
    const goalT = (L.goal.y / L.vh * 100).toFixed(2);
    const goalHTML =
      '<div class="toni-jg__station" style="left:' + goalL + '%;top:' + goalT + '%;cursor:default">' +
        '<div class="toni-jg__sign" style="background:' + ORANGE + ';border-color:#C25A12">' +
          '<div class="inner" style="background:' + ACCENT + '"><span class="toni-jg__num" style="font-size:18px">ZIEL</span></div>' +
        '</div>' +
      '</div>';

    // Höhen-Spacer-SVG (wie Weltall): bestimmt die Höhe per Seitenverhältnis,
    // Szene/Pfad/Stationen liegen absolut darüber. Kein padding-bottom-Trick.
    const spacer = '<svg class="toni-jungle__spacer" viewBox="0 0 ' + L.vw + ' ' + L.vh + '" ' +
      'xmlns="http://www.w3.org/2000/svg" aria-hidden="true" ' +
      'style="display:block;width:100%;height:auto;visibility:hidden;"></svg>';
    return '<div class="toni-jungle">' +
      '<div class="toni-jungle__voyage">' +
        spacer +
        '<div class="toni-jungle__scene">' + sceneSVG(L.vw, L.vh) + '</div>' +
        '<div class="toni-jungle__path">' + pathSvg + '</div>' +
        stationsHTML +
        goalHTML +
        toniHTML +
      '</div>' +
    '</div>';
  }

  /* ---- Registrierung ---- */
  window.toniThemes.register({
    id: "jungle",
    label: "Dschungel",
    description: "Expedition durch den Urwald – Stationen als Rastplätze, Aufgaben als Holzschilder, mit Wasserstelle, Elefanten und vielen Tieren.",
    renderStations: renderStations,
    renderPreview: function () {
      return '<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="jgPv" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#9FD64E"/><stop offset="0.5" stop-color="#2E8B36"/><stop offset="1" stop-color="' + GREEN_DARK + '"/>' +
        '</linearGradient></defs>' +
        '<rect width="160" height="100" rx="10" fill="url(#jgPv)"/>' +
        '<ellipse cx="80" cy="78" rx="46" ry="14" fill="#4FA9C9"/>' +
        '<ellipse cx="70" cy="68" rx="20" ry="14" fill="#8C8C92"/>' +
        '<ellipse cx="58" cy="60" rx="8" ry="7" fill="#9A9AA0"/>' +
        '<path d="M0 0 C 20 6 14 30 0 34 Z" fill="#2E9B3D"/>' +
        '<path d="M160 0 C 140 6 146 30 160 34 Z" fill="#2E9B3D"/>' +
        '<g transform="translate(36,22)"><ellipse cx="0" cy="0" rx="7" ry="6" fill="#E0322B"/><circle cx="-4" cy="-4" r="4" fill="#E0322B"/><path d="M5 -1 C 12 0 12 7 6 6 Z" fill="#1CA7EC"/></g>' +
        '<g transform="translate(124,26)"><ellipse cx="0" cy="0" rx="7" ry="6" fill="#1CA7EC"/><circle cx="4" cy="-4" r="4" fill="#1CA7EC"/><path d="M-5 -1 C -12 0 -12 7 -6 6 Z" fill="#FFD23F"/></g>' +
        '<path d="M2 18 C 6 6 4 2 12 1" fill="none" stroke="#FFD23F" stroke-width="1.5"/>' +
        '<rect x="68" y="44" width="24" height="16" rx="3" fill="#7A5230" stroke="#4A3018" stroke-width="1.5"/>' +
        '<rect x="71" y="47" width="18" height="10" rx="2" fill="#B5814A"/>' +
        '</svg>';
    }
  });

  console.info("[TONI-Theme:jungle] Dschungel-Theme registriert (theme-jungle-v3-dickicht).");
})();
