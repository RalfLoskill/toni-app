/* ============================================================
 * TONI – Theme-Auswahl im Lernreisen-Editor (Stufe 2)
 * Datei: journey_theme_picker.js
 * Build: theme-picker-v1
 *
 * Stellt im "Neue Lernreise"-Formular einen Auswahl-Button ("Erscheinungs-
 * bild") bereit. Klick öffnet ein Modal mit einem Karten-Raster aller
 * registrierten Themes (Mini-Vorschau oben, Titel klein darunter). Nach
 * Auswahl zeigt die Kachel im Formular das Mini-Vorschaubild des gewählten
 * Themes; die Auswahl landet im Hidden-Feld #journey-theme (das journey.js
 * beim Speichern mitschreibt) und ist jederzeit änderbar.
 *
 * Speist sich vollständig aus window.toniThemes.list() – neue Themes
 * erscheinen automatisch, ohne dass dieses Modul angefasst werden muss.
 *
 * Erwartete DOM-Anker (in index.html ergänzt):
 *   #journey-theme            (hidden input – speichert die Theme-id)
 *   #journey-theme-trigger    (die klickbare Kachel im Formular)
 * ============================================================ */

(function () {
  "use strict";

  if (!window.toniThemes || typeof window.toniThemes.list !== "function") {
    console.warn("[TONI-Theme-Picker] Theme-Engine nicht gefunden – Picker inaktiv.");
    return;
  }

  const DEFAULT_ID = "classic";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  function injectStyles() {
    if (document.getElementById("toni-theme-picker-css")) return;
    const css = `
.toni-tp-trigger{display:flex;align-items:center;gap:12px;width:100%;box-sizing:border-box;
  padding:10px 12px;border:0.5px solid var(--border,#e2e8f0);border-radius:12px;background:#fff;
  cursor:pointer;text-align:left;font-family:inherit;transition:border-color .15s,box-shadow .15s;}
.toni-tp-trigger:hover{border-color:#185FA5;box-shadow:0 2px 10px rgba(24,95,165,.08);}
.toni-tp-thumb{width:64px;height:40px;border-radius:8px;overflow:hidden;flex-shrink:0;
  box-shadow:0 1px 4px rgba(0,0,0,.18);background:#eef2f7;}
.toni-tp-thumb svg{display:block;width:100%;height:100%;}
.toni-tp-meta{flex:1;min-width:0;}
.toni-tp-meta .toni-tp-label{font-size:11px;color:#64748b;font-weight:600;text-transform:uppercase;letter-spacing:.03em;}
.toni-tp-meta .toni-tp-name{font-size:14px;color:#0f172a;font-weight:700;margin-top:1px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.toni-tp-change{font-size:12px;color:#185FA5;font-weight:700;flex-shrink:0;}

/* Modal */
.toni-tp-backdrop{position:fixed;inset:0;background:rgba(15,23,42,.5);z-index:6000;
  display:none;align-items:center;justify-content:center;padding:20px;}
.toni-tp-backdrop.open{display:flex;}
.toni-tp-modal{background:#fff;border-radius:18px;width:min(640px,100%);max-height:88vh;
  overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 70px rgba(15,23,42,.3);}
.toni-tp-head{display:flex;align-items:center;justify-content:space-between;gap:12px;
  padding:16px 18px;border-bottom:1px solid var(--border,#e2e8f0);}
.toni-tp-title{font-size:16px;font-weight:800;color:#0f172a;}
.toni-tp-close{border:none;background:#f1f5f9;color:#334155;border-radius:9px;
  padding:8px 12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;}
.toni-tp-close:hover{background:#e2e8f0;}
.toni-tp-grid{padding:16px 18px;overflow-y:auto;display:grid;
  grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px;}
.toni-tp-card{border:2px solid transparent;border-radius:14px;padding:8px;cursor:pointer;
  background:#f8fafc;transition:border-color .15s,transform .1s,box-shadow .15s;text-align:center;}
.toni-tp-card:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(15,23,42,.1);}
.toni-tp-card.selected{border-color:#185FA5;background:#eef5fc;}
.toni-tp-card-thumb{width:100%;aspect-ratio:16/10;border-radius:9px;overflow:hidden;
  box-shadow:0 1px 4px rgba(0,0,0,.15);position:relative;background:#eef2f7;}
.toni-tp-card-thumb svg{display:block;width:100%;height:100%;}
.toni-tp-card-name{font-size:13px;font-weight:700;color:#0f172a;margin-top:7px;}
.toni-tp-card-check{position:absolute;top:6px;right:6px;width:22px;height:22px;border-radius:50%;
  background:#185FA5;color:#fff;display:none;align-items:center;justify-content:center;font-size:13px;}
.toni-tp-card.selected .toni-tp-card-check{display:flex;}
@media(max-width:520px){.toni-tp-grid{grid-template-columns:repeat(auto-fill,minmax(120px,1fr));}}
`;
    const el = document.createElement("style");
    el.id = "toni-theme-picker-css";
    el.textContent = css;
    document.head.appendChild(el);
  }

  // Aktuell gewählte Theme-id aus dem Hidden-Feld (Fallback: classic).
  function currentId() {
    const hidden = document.getElementById("journey-theme");
    const v = hidden && typeof hidden.value === "string" ? hidden.value.trim() : "";
    return v || DEFAULT_ID;
  }

  function themeById(id) {
    const all = window.toniThemes.list();
    return all.find(function (t) { return t.id === id; }) ||
           all.find(function (t) { return t.id === DEFAULT_ID; }) ||
           all[0] || { id: DEFAULT_ID, label: "Klassisch" };
  }

  // Aktualisiert die Kachel im Formular auf den aktuell gewählten Wert.
  function refreshTrigger() {
    const trigger = document.getElementById("journey-theme-trigger");
    if (!trigger) return;
    const t = themeById(currentId());
    const preview = (typeof window.toniThemes.previewFor === "function")
      ? window.toniThemes.previewFor(t.id) : (t.preview || "");
    trigger.innerHTML =
      '<div class="toni-tp-thumb">' + preview + '</div>' +
      '<div class="toni-tp-meta">' +
        '<div class="toni-tp-label">Erscheinungsbild</div>' +
        '<div class="toni-tp-name">' + esc(t.label || t.id) + '</div>' +
      '</div>' +
      '<div class="toni-tp-change">Ändern ▾</div>';
  }

  // Setzt die Auswahl, aktualisiert Hidden-Feld + Kachel.
  function select(id) {
    const hidden = document.getElementById("journey-theme");
    if (hidden) hidden.value = id;
    refreshTrigger();
  }

  function buildModal() {
    if (document.getElementById("toni-tp-backdrop")) return;
    const backdrop = document.createElement("div");
    backdrop.className = "toni-tp-backdrop";
    backdrop.id = "toni-tp-backdrop";
    backdrop.innerHTML =
      '<div class="toni-tp-modal" role="dialog" aria-label="Erscheinungsbild wählen">' +
        '<div class="toni-tp-head">' +
          '<div class="toni-tp-title">Erscheinungsbild wählen</div>' +
          '<button type="button" class="toni-tp-close" id="toni-tp-close">Schließen</button>' +
        '</div>' +
        '<div class="toni-tp-grid" id="toni-tp-grid"></div>' +
      '</div>';
    document.body.appendChild(backdrop);

    // Schließen über Button + Klick auf Hintergrund.
    document.getElementById("toni-tp-close").addEventListener("click", closeModal);
    backdrop.addEventListener("click", function (e) {
      if (e.target === backdrop) closeModal();
    });
  }

  function renderGrid() {
    const grid = document.getElementById("toni-tp-grid");
    if (!grid) return;
    const sel = currentId();
    const themes = window.toniThemes.list();
    grid.innerHTML = themes.map(function (t) {
      const preview = (typeof window.toniThemes.previewFor === "function")
        ? window.toniThemes.previewFor(t.id) : (t.preview || "");
      const isSel = t.id === sel ? " selected" : "";
      return '<div class="toni-tp-card' + isSel + '" data-theme-id="' + esc(t.id) + '" ' +
               'role="button" tabindex="0">' +
               '<div class="toni-tp-card-thumb">' + preview +
                 '<span class="toni-tp-card-check">✓</span></div>' +
               '<div class="toni-tp-card-name">' + esc(t.label || t.id) + '</div>' +
             '</div>';
    }).join("");

    // Klick auf eine Karte: auswählen + schließen.
    grid.querySelectorAll(".toni-tp-card").forEach(function (card) {
      const id = card.getAttribute("data-theme-id");
      function choose() { select(id); closeModal(); }
      card.addEventListener("click", choose);
      card.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); choose(); }
      });
    });
  }

  function openModal() {
    injectStyles();
    buildModal();
    renderGrid();
    document.getElementById("toni-tp-backdrop").classList.add("open");
  }
  function closeModal() {
    const b = document.getElementById("toni-tp-backdrop");
    if (b) b.classList.remove("open");
  }

  // Öffentliche Hooks (vom Trigger-onclick in index.html aufgerufen).
  window.toniOpenThemePicker = openModal;
  window.toniRefreshThemeTrigger = refreshTrigger;
  // Beim Bearbeiten ruft journey.js dies auf, um Vorbelegung anzuzeigen.
  window.toniSetEditorTheme = function (id) { select(id || DEFAULT_ID); };

  // Initiales Rendern der Kachel, sobald DOM bereit ist.
  function init() {
    injectStyles();
    refreshTrigger();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  console.info("[TONI-Theme-Picker] geladen (theme-picker-v1).");
})();
