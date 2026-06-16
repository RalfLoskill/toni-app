/* ============================================================
 * TONI – Lernreisen-Theme: "Friseursalon / Atelier Hair Lounge"
 * Datei: journey_theme_salon.js
 * Build: theme-salon-v1
 *
 * Schwester-Theme zu Weltall/Fußball/Dschungel/Wissenshaus. Stellt die
 * Stationen einer Lernreise als Styling-Plätze in einem hellen, stylischen
 * Friseursalon dar. Aufgaben einer Station erscheinen – wie beim Wissenshaus –
 * in einer festen Leiste am unteren Bildschirmrand (mit Schließen-Button).
 *
 * Optik nach Nutzer-Vorlage (index.html/styles.css "Atelier Hair Lounge"):
 * heller, cremefarbener Salon, beleuchteter Spiegel (animierter Glow),
 * brauner Lederstuhl, viele Friseur-Details. Akzente: Rosa #FF8FAB,
 * Koralle #FF7B54, Gold #FFD166.
 *
 * Architektur identisch zu den anderen Themes:
 *  - Auto-Layout für beliebige Stationszahl.
 *  - Vollbild randlos + Body-Scroll-Lock, gegated über
 *    body.toni-salon-fullscreen (eigenes Präfix). Engine entfernt fremde.
 *  - Aufgaben-Dock am unteren Rand (toniSalonToggleStation / CloseDock).
 *  - Anklickbare, animierte Elemente (Spiegellicht, Föhn, Schere ...).
 *  - Bewegung dezent; bei prefers-reduced-motion komplett aus.
 * ============================================================ */

(function () {
  "use strict";

  if (!window.toniThemes || typeof window.toniThemes.register !== "function") {
    console.error("[TONI-Theme:salon] Theme-Engine nicht gefunden – Theme wird nicht registriert.");
    return;
  }

  /* ---- Farbwelt (aus der Vorlage) ---- */
  const PINK = "#FF8FAB";
  const CORAL = "#FF7B54";
  const PEACH = "#FF9F68";
  const GOLD = "#FFD166";
  const LEATHER = "#8A7462";
  const LEATHER_DK = "#7D6859";
  const CREAM = "#FFF8F1";

  const TYPE_COLOR = {
    Lerninhalt: "#5BB0E0",
    Aufgabe: CORAL,
    Quiz: GOLD,
    Reflexion: PINK,
    Video: PEACH
  };

  const ICON = {
    check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12l5 5L20 6"/></svg>',
    lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
    scissors: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 21 18M8.1 15.9 21 6"/></svg>',
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

  function reducedMotion() {
    return typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  /* ---- Interaktion: Station wählen + Aufgaben in Bottom-Dock (wie Wissenshaus) ---- */
  window.toniSalonToggleStation = function (index) {
    const root = document.querySelector(".toni-salon");
    if (!root) return;
    const seat = root.querySelector('.toni-salon__seat[data-step-index="' + index + '"]');
    if (!seat || seat.classList.contains("locked")) return;
    const already = seat.classList.contains("open");
    root.querySelectorAll(".toni-salon__seat.open").forEach(function (s) { s.classList.remove("open"); });
    if (already) { toniSalonCloseDock(); return; }
    seat.classList.add("open");
    const dock = document.getElementById("toni-salon-dock");
    const dockBody = document.getElementById("toni-salon-dock-body");
    const dockTitle = document.getElementById("toni-salon-dock-title");
    const src = seat.querySelector(".toni-salon__tasks");
    if (dock && dockBody) {
      dockBody.innerHTML = src ? src.innerHTML :
        '<div class="toni-salon__dock-empty">Dieser Platz hat noch keine Aufgaben.</div>';
      if (dockTitle) {
        dockTitle.textContent = seat.getAttribute("data-seat-title") || ("Platz " + (index + 1));
      }
      dock.classList.add("open");
    }
    if (typeof window.toniTimelineSelect === "function") {
      try { window.toniTimelineSelect(index); } catch (e) { /* nicht kritisch */ }
    }
  };

  window.toniSalonCloseDock = function () {
    const dock = document.getElementById("toni-salon-dock");
    if (dock) dock.classList.remove("open");
    const root = document.querySelector(".toni-salon");
    if (root) root.querySelectorAll(".toni-salon__seat.open").forEach(function (s) { s.classList.remove("open"); });
  };

  window.toniSalonGotoCurrent = function () {
    const c = document.querySelector(".toni-salon__seat.current");
    if (c) c.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  /* ---- Spielerei: anklickbare Deko-Elemente reagieren (Toggle einer Klasse) ---- */
  window.toniSalonPoke = function (el) {
    if (!el) return;
    el.classList.toggle("poked");
  };

  /* ---- Stil-Block (Salon-Optik + Animationen) ---- */
  function injectStyles() {
    if (document.getElementById("toni-theme-salon-css")) return;
    const css =
      ".toni-salon{position:relative;width:100%;min-height:100%;overflow:hidden;border-radius:16px;" +
        "font-family:'Segoe UI',system-ui,sans-serif;color:#4A3B30;" +
        "background:linear-gradient(180deg,#FFFEFB 0%,#FFF6E9 60%,#FFE9D6 100%);}" +
      // Sonnenlicht / Ambient
      ".toni-salon__glow{position:absolute;top:-8%;left:50%;transform:translateX(-50%);" +
        "width:70%;height:46%;border-radius:50%;filter:blur(40px);z-index:0;" +
        "background:radial-gradient(circle,rgba(255,255,255,.95),rgba(255,243,229,0) 70%);" +
        "animation:toniSalonGlow 6s ease-in-out infinite;}" +
      ".toni-salon__ambient{position:absolute;top:0;bottom:0;width:22%;z-index:0;pointer-events:none;}" +
      ".toni-salon__ambient.l{left:0;background:linear-gradient(90deg,rgba(255,143,171,.16),transparent);}" +
      ".toni-salon__ambient.r{right:0;background:linear-gradient(270deg,rgba(255,123,84,.16),transparent);}" +
      // Markenschild
      ".toni-salon__brand{position:absolute;top:14px;left:50%;transform:translateX(-50%);z-index:3;" +
        "font-family:Georgia,serif;font-size:clamp(18px,3vw,30px);letter-spacing:1px;color:" + CORAL + ";" +
        "text-shadow:0 1px 0 #fff,0 2px 8px rgba(255,123,84,.25);font-weight:700;}" +
      // Spiegel mit animiertem Glow
      ".toni-salon__mirror{position:absolute;top:64px;left:50%;transform:translateX(-50%);z-index:1;" +
        "width:min(46%,360px);aspect-ratio:3/4;border-radius:160px 160px 26px 26px;" +
        "background:linear-gradient(180deg,#FFFFFF,#F3F8FC);border:8px solid #EBD9C6;" +
        "box-shadow:inset 0 8px 30px rgba(0,0,0,.06),0 18px 40px rgba(0,0,0,.12);overflow:hidden;}" +
      ".toni-salon__mirror::before{content:'';position:absolute;inset:-26px;border-radius:inherit;z-index:-1;" +
        "background:radial-gradient(circle at 50% 30%,rgba(255,231,170,.95),rgba(255,209,102,.4) 55%,transparent 72%);" +
        "filter:blur(16px);animation:toniSalonMirror 4.5s ease-in-out infinite;}" +
      // Glühbirnen um den Spiegel
      ".toni-salon__bulbs{position:absolute;inset:0;z-index:2;pointer-events:none;}" +
      ".toni-salon__bulbs i{position:absolute;width:13px;height:13px;border-radius:50%;" +
        "background:radial-gradient(circle at 40% 35%,#FFFDF0,#FFD166);box-shadow:0 0 10px rgba(255,209,102,.9);" +
        "animation:toniSalonBulb 2.4s ease-in-out infinite;}" +
      // Reflexion im Spiegel
      ".toni-salon__refl{position:absolute;inset:14px;border-radius:inherit;opacity:.5;" +
        "background:linear-gradient(180deg,rgba(255,255,255,.7),rgba(255,240,225,.3));}" +
      ".toni-salon__refl .chairblur{position:absolute;left:28%;right:28%;bottom:8%;height:46%;" +
        "border-radius:40px 40px 16px 16px;background:rgba(141,116,98,.4);filter:blur(4px);}" +
      // Theke
      ".toni-salon__counter{position:absolute;left:4%;right:4%;bottom:0;height:30%;z-index:2;" +
        "background:linear-gradient(180deg,#FFFFFF,#FBEFE2);border-top:3px solid " + GOLD + ";" +
        "border-radius:20px 20px 0 0;box-shadow:0 -10px 30px rgba(0,0,0,.07);}" +
      ".toni-salon__counter-lip{position:absolute;top:-6px;left:0;right:0;height:8px;border-radius:6px;" +
        "background:linear-gradient(90deg," + PINK + "," + GOLD + "," + CORAL + ");opacity:.85;}" +
      // Stuhl (Leder, Rückansicht)
      ".toni-salon__chair{position:absolute;left:50%;bottom:2%;transform:translateX(-50%);z-index:2;width:200px;}" +
      ".toni-salon__chair .back{height:150px;border-radius:60px 60px 28px 28px;" +
        "background:linear-gradient(180deg," + LEATHER + "," + LEATHER_DK + ");" +
        "box-shadow:inset 0 6px 18px rgba(255,255,255,.18),0 12px 26px rgba(0,0,0,.22);position:relative;}" +
      ".toni-salon__chair .back::after{content:'';position:absolute;left:50%;top:14px;bottom:14px;width:2px;" +
        "transform:translateX(-50%);background:rgba(0,0,0,.18);}" +
      ".toni-salon__chair .plate{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);" +
        "width:46px;height:10px;border-radius:5px;background:linear-gradient(90deg,#D9D2C8,#B8AEA0);}" +
      ".toni-salon__chair .base{width:120px;height:14px;margin:6px auto 0;border-radius:50%;" +
        "background:rgba(0,0,0,.16);filter:blur(3px);}" +
      // Stationen (Styling-Plätze = beleuchtete Spiegel-Schilder)
      ".toni-salon__seat{position:absolute;transform:translate(-50%,-50%);z-index:5;cursor:pointer;" +
        "width:120px;text-align:center;transition:transform .12s ease;}" +
      ".toni-salon__seat:hover{transform:translate(-50%,-52%);}" +
      ".toni-salon__seat .frame{position:relative;border-radius:60px 60px 14px 14px;padding:14px 10px 12px;" +
        "background:linear-gradient(180deg,#FFFFFF,#FFF1E6);border:3px solid " + GOLD + ";" +
        "box-shadow:0 10px 24px rgba(0,0,0,.14);}" +
      ".toni-salon__seat .num{font-size:24px;font-weight:800;color:" + CORAL + ";line-height:1;}" +
      ".toni-salon__seat .name{display:block;margin-top:4px;font-size:11px;color:#6B5848;" +
        "max-width:104px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}" +
      ".toni-salon__seat.done .frame{border-color:#7CCB8A;background:linear-gradient(180deg,#F3FFF4,#E2F7E6);}" +
      ".toni-salon__seat.current .frame{box-shadow:0 0 0 4px rgba(255,209,102,.55),0 10px 24px rgba(0,0,0,.18);" +
        "animation:toniSalonPulse 2.4s ease-in-out infinite;}" +
      ".toni-salon__seat.locked{cursor:default;}" +
      ".toni-salon__seat.locked .frame{filter:grayscale(.5) brightness(.95);border-color:#D8CCC0;}" +
      ".toni-salon__seat.locked .num{color:#B6A698;}" +
      ".toni-salon__badge{position:absolute;top:-12px;right:-10px;width:30px;height:30px;border-radius:50%;" +
        "display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.25);}" +
      ".toni-salon__badge svg{width:18px;height:18px;}" +
      ".toni-salon__badge.done{background:#3FB36A;}.toni-salon__badge.locked{background:#B6A698;}" +
      ".toni-salon__badge.current{background:" + GOLD + ";color:#7A5300;}" +
      // Aufgaben (Datenquelle, versteckt; erscheinen im Dock)
      ".toni-salon__tasks{display:none !important;}" +
      ".toni-salon__task{position:relative;width:88px;border-radius:12px;padding:10px 6px 8px;cursor:pointer;" +
        "display:flex;flex-direction:column;align-items:center;gap:4px;text-align:center;" +
        "background:#FFFFFF;border:2px solid var(--cc,#ddd);box-shadow:0 4px 10px rgba(0,0,0,.1);" +
        "color:#4A3B30;transition:transform .12s;}" +
      ".toni-salon__task:hover{transform:translateY(-3px);}" +
      ".toni-salon__task .sico{width:24px;height:24px;color:var(--cc,#777);}" +
      ".toni-salon__task .sico svg{width:24px;height:24px;}" +
      ".toni-salon__task .slabel{font-size:11px;line-height:1.2;max-width:80px;overflow:hidden;}" +
      ".toni-salon__task.done{border-color:#7CCB8A;background:#F1FBF3;}" +
      ".toni-salon__task.locked{filter:grayscale(.5);opacity:.6;cursor:default;}" +
      ".toni-salon__task .tk{position:absolute;top:-8px;right:-8px;width:20px;height:20px;border-radius:50%;" +
        "background:#3FB36A;color:#fff;display:flex;align-items:center;justify-content:center;}" +
      ".toni-salon__task .tk svg{width:12px;height:12px;}" +
      // anklickbare Deko (Föhn, Schere ...): kleine Reaktion
      ".toni-salon__deco{position:absolute;z-index:4;cursor:pointer;transition:transform .2s ease;}" +
      ".toni-salon__deco:hover{transform:scale(1.12);}" +
      ".toni-salon__deco.poked{animation:toniSalonShake .5s ease;}" +
      // Kopfleiste
      ".toni-salon__head{position:absolute;top:0;left:0;right:0;z-index:6;display:flex;align-items:center;gap:12px;" +
        "padding:12px 16px;}" +
      ".toni-salon__keybtn{width:44px;height:44px;flex:0 0 44px;border-radius:13px;cursor:pointer;" +
        "background:#fff;border:2px solid " + CORAL + ";display:grid;place-items:center;color:" + CORAL + ";" +
        "box-shadow:0 4px 12px rgba(255,123,84,.25);}" +
      ".toni-salon__htext .tk{font-size:12px;font-weight:700;color:" + CORAL + ";letter-spacing:.4px;}" +
      ".toni-salon__htext .tn{font-size:15px;font-weight:700;color:#4A3B30;}" +
      // Aufgaben-Dock (wie Wissenshaus)
      ".toni-salon__dock{position:fixed;left:0;right:0;bottom:0;z-index:4600;" +
        "background:linear-gradient(180deg,rgba(255,255,255,.97),rgba(255,244,234,.99));" +
        "border-top:3px solid " + GOLD + ";box-shadow:0 -10px 30px rgba(0,0,0,.16);" +
        "transform:translateY(110%);transition:transform .32s cubic-bezier(.34,1.1,.5,1);" +
        "padding:12px 18px calc(14px + env(safe-area-inset-bottom));}" +
      ".toni-salon__dock.open{transform:translateY(0);}" +
      ".toni-salon__dock-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}" +
      ".toni-salon__dock-title{color:" + CORAL + ";font-weight:800;font-size:15px;}" +
      ".toni-salon__dock-close{flex:0 0 auto;background:#fff;color:" + CORAL + ";border:2px solid " + CORAL + ";" +
        "border-radius:10px;padding:7px 14px;font-size:13px;font-weight:700;cursor:pointer;}" +
      ".toni-salon__dock-close:hover{background:#FFF1EA;}" +
      ".toni-salon__dock-body{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;" +
        "max-height:38vh;overflow-y:auto;overscroll-behavior:contain;padding-bottom:4px;}" +
      ".toni-salon__dock-empty{color:#8A7462;padding:14px;text-align:center;width:100%;}" +
      // Animationen
      "@keyframes toniSalonGlow{0%,100%{opacity:.7;}50%{opacity:1;}}" +
      "@keyframes toniSalonMirror{0%,100%{opacity:.7;transform:scale(1);}50%{opacity:1;transform:scale(1.04);}}" +
      "@keyframes toniSalonBulb{0%,100%{opacity:.65;box-shadow:0 0 6px rgba(255,209,102,.7);}50%{opacity:1;box-shadow:0 0 14px rgba(255,209,102,1);}}" +
      "@keyframes toniSalonPulse{0%,100%{transform:scale(1);}50%{transform:scale(1.05);}}" +
      "@keyframes toniSalonShake{0%,100%{transform:rotate(0);}25%{transform:rotate(-12deg);}75%{transform:rotate(12deg);}}" +
      "@media (prefers-reduced-motion: reduce){" +
        ".toni-salon__glow,.toni-salon__mirror::before,.toni-salon__bulbs i,.toni-salon__seat.current .frame{animation:none !important;}}";
    const el = document.createElement("style");
    el.id = "toni-theme-salon-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---- Vollbild (vollständig wie Weltall/Wissenshaus, inkl. lr-top-split einspaltig) ---- */
  function injectFullscreenStyles() {
    if (document.getElementById("toni-theme-salon-fs-css")) return;
    const css =
      "body.toni-salon-fullscreen{overflow:hidden !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon.lr-modal-backdrop," +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon{" +
        "position:fixed !important;inset:0 !important;z-index:4000 !important;width:100vw !important;height:100vh !important;" +
        "max-width:none !important;max-height:none !important;padding:0 !important;margin:0 !important;" +
        "border:none !important;border-radius:0 !important;box-shadow:none !important;overflow:hidden !important;" +
        "background:linear-gradient(180deg,#FFFEFB,#FFE9D6) !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-modal," +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-modal-card," +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon > div{" +
        "width:100vw !important;max-width:100vw !important;height:100vh !important;max-height:100vh !important;" +
        "border-radius:0 !important;margin:0 !important;background:transparent !important;border:none !important;" +
        "box-shadow:none !important;overflow:hidden !important;display:flex !important;flex-direction:column !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-modal-body{" +
        "padding:0 !important;margin:0 !important;background:transparent !important;border:none !important;" +
        "flex:1 1 auto !important;height:auto !important;min-height:0 !important;max-height:none !important;" +
        "overflow-y:auto !important;overflow-x:hidden !important;overscroll-behavior:contain !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-detail-grid," +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-main-card{" +
        "display:block !important;width:100% !important;max-width:100% !important;margin:0 !important;padding:0 !important;" +
        "background:transparent !important;border:none !important;box-shadow:none !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .toni-salon{min-height:100vh;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-stations{" +
        "padding:0 !important;margin:0 !important;width:100% !important;max-width:none !important;}" +
      ".toni-theme-active-salon .lr-top-split{" +
        "grid-template-columns:1fr !important;grid-template-areas:\"stations\" \"right\" !important;}" +
      ".toni-theme-active-salon .lr-top-split .lr-stations{background:transparent !important;padding:0 !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .card-header{display:none !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-modal-title{display:none !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon #lr-modal-sub," +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-modal-sub{display:none !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-right-col," +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon #lr-right-col{display:none !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-progress-big{display:none !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-cover-screen-v89{display:none !important;}" +
      // Kopf-Buttons transparent + nebeneinander
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-modal-header{" +
        "position:absolute !important;top:0 !important;left:0 !important;right:0 !important;z-index:20 !important;" +
        "background:transparent !important;border:none !important;box-shadow:none !important;" +
        "padding:10px 14px !important;display:flex !important;justify-content:flex-end !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-modal-actions{" +
        "width:auto !important;gap:8px !important;display:flex !important;flex-direction:row !important;" +
        "align-items:center !important;flex-wrap:nowrap !important;position:static !important;}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-modal-actions button{" +
        "flex:0 0 auto !important;position:static !important;margin:0 !important;" +
        "background:rgba(255,255,255,.8) !important;color:" + CORAL + " !important;" +
        "border:1px solid " + CORAL + " !important;backdrop-filter:blur(4px);}" +
      "body.toni-salon-fullscreen #lr-modal.toni-theme-active-salon .lr-modal-actions button[onclick*=\"startNextLearningTask\"]{display:none !important;}" +
      // Task-Modal
      "body.toni-salon-fullscreen #lr-task-modal.lr-modal-backdrop," +
      "body.toni-salon-fullscreen #lr-task-modal{z-index:5000 !important;}" +
      "body.toni-salon-fullscreen #lr-task-modal .lr-modal-header button," +
      "body.toni-salon-fullscreen #lr-task-modal .lr-modal-header button *," +
      "body.toni-salon-fullscreen #lr-task-modal .lr-close-btn,"+
      "body.toni-salon-fullscreen #lr-task-modal .lr-close-btn *{color:#111 !important;}";
    const el = document.createElement("style");
    el.id = "toni-theme-salon-fs-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  /* ---- Auto-Layout: Stationen in sanftem Bogen über die Fläche ---- */
  const VW = 1000;
  function computeLayout(n) {
    const COLS = n <= 3 ? n : (n <= 8 ? Math.ceil(n / 2) : Math.ceil(n / 3));
    const rows = Math.ceil(n / COLS);
    const vh = 360 + rows * 210;
    const pts = [];
    for (let i = 0; i < n; i++) {
      const row = Math.floor(i / COLS);
      const col = i % COLS;
      const inRow = Math.min(COLS, n - row * COLS);
      const x = (VW / (inRow + 1)) * (col + 1);
      const y = 250 + row * 210 + (col % 2 === 0 ? 0 : 28); // leichtes Versetzen
      pts.push({ x: Math.round(x), y: Math.round(y) });
    }
    return { vw: VW, vh: vh, pts: pts };
  }

  /* ---- Aufgaben einer Station (Datenquelle fürs Dock) ---- */
  function tasksMarkup(tasks, state) {
    if (!tasks.length) return "";
    let out = "";
    tasks.forEach(function (t) {
      const tt = normType(t.type);
      const col = TYPE_COLOR[tt] || "#bbb";
      const done = t.status === "done";
      const locked = state === "locked";
      const tick = done ? '<span class="tk">' + ICON.check + '</span>' : "";
      const handlers = locked
        ? 'aria-disabled="true"'
        : 'role="button" tabindex="0" ' +
          'onclick="event.stopPropagation();openLearningTask(\'' + esc(t.id) + '\')" ' +
          'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();event.stopPropagation();openLearningTask(\'' + esc(t.id) + '\');}"';
      out +=
        '<div class="toni-salon__task ' + (done ? "done " : "") + (locked ? "locked" : "") + '" ' +
          'style="--cc:' + col + '" ' + handlers + '>' +
          '<span class="sico">' + typeIcon(tt) + '</span>' +
          '<span class="slabel">' + esc(t.title || tt) + '</span>' + tick +
        '</div>';
    });
    return '<div class="toni-salon__tasks">' + out + '</div>';
  }

  /* ---- Anklickbare, animierte Deko (Föhn, Schere, Föhn-Glühen ...) ---- */
  function decoSVG() {
    return '' +
      // Föhn (links auf der Theke)
      '<svg class="toni-salon__deco" style="left:8%;bottom:9%;width:64px" viewBox="0 0 64 48" ' +
        'onclick="toniSalonPoke(this)" role="button" tabindex="0" aria-label="Föhn">' +
        '<path d="M6 18 H40 a14 14 0 0 1 0 14 H6 Z" fill="' + PINK + '"/>' +
        '<rect x="26" y="30" width="12" height="20" rx="4" fill="' + CORAL + '"/>' +
        '<circle cx="14" cy="25" r="7" fill="#fff" opacity=".7"/>' +
        '<path d="M40 20 l16 -6 v24 l-16 -6 Z" fill="' + PEACH + '"/></svg>' +
      // Schere (rechts)
      '<svg class="toni-salon__deco" style="right:9%;bottom:11%;width:52px" viewBox="0 0 48 48" ' +
        'onclick="toniSalonPoke(this)" role="button" tabindex="0" aria-label="Schere">' +
        '<circle cx="10" cy="12" r="6" fill="none" stroke="' + GOLD + '" stroke-width="3"/>' +
        '<circle cx="10" cy="36" r="6" fill="none" stroke="' + GOLD + '" stroke-width="3"/>' +
        '<path d="M14 14 L42 38 M14 34 L42 10" stroke="#9a8" stroke-width="3" stroke-linecap="round"/></svg>' +
      // Parfum/Spray (Mitte rechts)
      '<svg class="toni-salon__deco" style="right:22%;bottom:9%;width:34px" viewBox="0 0 34 54" ' +
        'onclick="toniSalonPoke(this)" role="button" tabindex="0" aria-label="Spray">' +
        '<rect x="8" y="16" width="18" height="34" rx="5" fill="' + CORAL + '"/>' +
        '<rect x="12" y="6" width="10" height="12" rx="2" fill="#caa"/>' +
        '<circle cx="17" cy="33" r="6" fill="#fff" opacity=".5"/></svg>';
  }

  /* ---- Hauptrenderer ---- */
  function renderStations(journey) {
    injectStyles();
    injectFullscreenStyles();

    const steps = (journey && journey.steps) || [];
    const n = steps.length;
    if (n === 0) {
      return '<div class="toni-salon" style="padding:40px;text-align:center;color:#8A7462">' +
             'Diese Lernreise hat noch keine Stationen.</div>';
    }
    if (document.body && document.body.classList) {
      document.body.classList.add("toni-salon-fullscreen");
    }

    const L = computeLayout(n);
    const states = steps.map(function (s, i) { return stationStatus(s, i, journey); });
    const doneCount = states.filter(function (st) { return st === "done"; }).length;
    const pct = Math.round(doneCount / n * 100);
    const curIdx = states.findIndex(function (st) { return st === "current"; });
    const curTitle = curIdx >= 0 ? esc(steps[curIdx].title || "") : "Reise abgeschlossen";

    // Glühbirnen um den Spiegel
    let bulbs = "";
    for (let i = 0; i < 12; i++) {
      const ang = (i / 12) * Math.PI; // Halbkreis oben
      const bx = 50 + Math.cos(Math.PI - ang) * 46;
      const by = 6 + Math.sin(ang) * 4;
      bulbs += '<i style="left:' + bx.toFixed(1) + '%;top:' + by.toFixed(1) + '%;animation-delay:' + (i * 0.18).toFixed(2) + 's"></i>';
    }

    // Stationen (Styling-Plätze)
    let seatsHTML = "";
    for (let i = 0; i < n; i++) {
      const s = steps[i];
      const st = states[i];
      const p = L.pts[i];
      const leftPct = (p.x / L.vw * 100).toFixed(2);
      const topPct = (p.y / L.vh * 100).toFixed(2);
      const num = i + 1;
      const badge = st === "done"
        ? '<span class="toni-salon__badge done">' + ICON.check + '</span>'
        : st === "locked"
          ? '<span class="toni-salon__badge locked">' + ICON.lock + '</span>'
          : '<span class="toni-salon__badge current">' + ICON.scissors + '</span>';
      const title = esc(s.title || ("Platz " + num));
      const interactive = st !== "locked";
      const handlers = interactive
        ? 'role="button" tabindex="0" onclick="toniSalonToggleStation(' + i + ')" ' +
          'onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();toniSalonToggleStation(' + i + ');}"'
        : 'aria-disabled="true"';
      seatsHTML +=
        '<div class="toni-salon__seat ' + st + '" data-step-index="' + i + '" ' +
          'data-seat-title="' + title + '" aria-label="' + title + '" ' +
          'style="left:' + leftPct + '%;top:' + topPct + '%" ' + handlers + '>' +
          '<div class="frame">' + badge +
            '<span class="num">' + num + '</span>' +
            '<span class="name">' + title + '</span>' +
          '</div>' +
          tasksMarkup(s.tasks || [], st) +
        '</div>';
    }

    const aspect = (L.vh / L.vw * 100).toFixed(2);
    return '<div class="toni-salon">' +
      '<div class="toni-salon__glow"></div>' +
      '<div class="toni-salon__ambient l"></div><div class="toni-salon__ambient r"></div>' +
      '<div class="toni-salon__head">' +
        '<button type="button" class="toni-salon__keybtn" title="Zur aktuellen Station" ' +
          'aria-label="Zur aktuellen Station" onclick="toniSalonGotoCurrent()">' + ICON.scissors + '</button>' +
        '<div class="toni-salon__htext">' +
          '<div class="tk">' + pct + '% fertig · ' + doneCount + ' von ' + n + ' Plätzen</div>' +
          '<div class="tn">Aktuell: ' + curTitle + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="toni-salon__brand">Atelier Hair Lounge</div>' +
      '<div class="toni-salon__mirror"><div class="toni-salon__refl"><div class="chairblur"></div></div>' +
        '<div class="toni-salon__bulbs">' + bulbs + '</div></div>' +
      // Bühne mit Stationen
      '<div style="position:relative;width:100%;padding-bottom:' + aspect + '%;">' +
        seatsHTML +
      '</div>' +
      '<div class="toni-salon__counter"><div class="toni-salon__counter-lip"></div></div>' +
      '<div class="toni-salon__chair"><div class="back"><div class="plate"></div></div><div class="base"></div></div>' +
      decoSVG() +
      // Aufgaben-Dock unten (wie Wissenshaus)
      '<div class="toni-salon__dock" id="toni-salon-dock">' +
        '<div class="toni-salon__dock-head">' +
          '<span class="toni-salon__dock-title" id="toni-salon-dock-title">Aufgaben</span>' +
          '<button type="button" class="toni-salon__dock-close" onclick="toniSalonCloseDock()" ' +
            'aria-label="Aufgaben schließen">Schließen ✕</button>' +
        '</div>' +
        '<div class="toni-salon__dock-body" id="toni-salon-dock-body"></div>' +
      '</div>' +
    '</div>';
  }

  /* ---- Registrierung ---- */
  window.toniThemes.register({
    id: "salon",
    label: "Friseursalon",
    description: "Die Lernreise als heller Friseursalon – Stationen sind Styling-Plätze, Aufgaben klappen unten auf. Mit beleuchtetem Spiegel und anklickbaren Details.",
    renderStations: renderStations,
    renderPreview: function () {
      return '<svg viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">' +
        '<defs><linearGradient id="slPv" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#FFFEFB"/><stop offset="1" stop-color="#FFE9D6"/>' +
        '</linearGradient></defs>' +
        '<rect width="160" height="100" rx="10" fill="url(#slPv)"/>' +
        // Spiegel mit Glow
        '<rect x="58" y="14" width="44" height="54" rx="20" fill="#fff" stroke="#EBD9C6" stroke-width="3"/>' +
        '<ellipse cx="80" cy="20" rx="30" ry="8" fill="#FFD166" opacity=".5"/>' +
        // Glühbirnen
        '<circle cx="62" cy="14" r="2.5" fill="#FFD166"/><circle cx="80" cy="10" r="2.5" fill="#FFD166"/><circle cx="98" cy="14" r="2.5" fill="#FFD166"/>' +
        // Theke + Stuhl
        '<rect x="10" y="78" width="140" height="22" rx="6" fill="#FBEFE2"/>' +
        '<rect x="10" y="76" width="140" height="4" rx="2" fill="#FFD166"/>' +
        '<rect x="64" y="58" width="32" height="30" rx="12" fill="#8A7462"/>' +
        // Akzent-Tools
        '<circle cx="28" cy="40" r="6" fill="#FF8FAB"/><rect x="120" y="34" width="8" height="20" rx="3" fill="#FF7B54"/>' +
        '</svg>';
    }
  });

  console.info("[TONI-Theme:salon] Friseursalon-Theme registriert (theme-salon-v1).");
})();
