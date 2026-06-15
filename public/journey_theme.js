/* ============================================================
 * TONI – Lernreisen-Theme-Engine
 * Datei: journey_theme.js
 * Build: theme-v0-fundament
 *
 * STUFE 0 (Fundament): Diese Datei etabliert die Architektur für
 * thematische Lernreisen-Darstellungen ("Themes"), OHNE das sichtbare
 * Verhalten zu ändern. Solange nur das Theme "classic" registriert ist,
 * rendert TONI exakt wie bisher.
 *
 * Designprinzipien:
 *  - Inhalt (steps/tasks) bleibt unangetastet. Themes betreffen nur die
 *    DARSTELLUNG.
 *  - Diese Datei ist optional: Wird sie nicht geladen oder schlägt sie fehl,
 *    läuft journey.js über seinen eingebauten Fallback weiter wie heute.
 *  - Robustheit vor Effekt: Bei JEDEM Zweifel (unbekanntes Theme, Fehler im
 *    Renderer) fällt das System auf "classic" zurück. Lieber klassisch und
 *    korrekt als thematisch und kaputt.
 *
 * Andockpunkt in journey.js (Stufe 0 – eine Zeile):
 *   ALT:  document.getElementById('lr-stations').innerHTML = toniRenderJourneyTimeline(j);
 *   NEU:  document.getElementById('lr-stations').innerHTML = window.toniRenderJourneyStations
 *           ? window.toniRenderJourneyStations(j)
 *           : toniRenderJourneyTimeline(j);
 * ============================================================ */

(function () {
  "use strict";

  // Verhindert Doppel-Initialisierung bei mehrfachem Laden.
  if (window.__TONI_THEME_ENGINE__) {
    return;
  }
  window.__TONI_THEME_ENGINE__ = true;
  window.TONI_THEME_BUILD = "theme-v1-modalclass";

  /* ----------------------------------------------------------
   * Theme-Registry
   * Ein Theme ist ein Objekt:
   *   {
   *     id:        eindeutiger Name, z.B. "classic", "space"
   *     label:     Anzeigename für den Editor
   *     description: kurze Beschreibung (Editor-Galerie)
   *     renderStations(journey) -> HTML-String für die Stationsliste
   *   }
   * Weitere Felder (Animationen, Modal-Hülle) kommen in späteren Stufen.
   * -------------------------------------------------------- */
  const THEMES = Object.create(null);

  /**
   * Registriert ein Theme. Mehrfaches Registrieren desselben id überschreibt
   * (praktisch für Weiterentwicklung), warnt aber in der Konsole.
   */
  function registerTheme(theme) {
    if (!theme || typeof theme.id !== "string" || !theme.id) {
      console.warn("[TONI-Theme] Ungültiges Theme ignoriert (kein id).", theme);
      return;
    }
    if (typeof theme.renderStations !== "function") {
      console.warn(
        "[TONI-Theme] Theme '" + theme.id + "' hat keine renderStations-Funktion – ignoriert."
      );
      return;
    }
    if (THEMES[theme.id]) {
      console.warn("[TONI-Theme] Theme '" + theme.id + "' wird überschrieben.");
    }
    THEMES[theme.id] = theme;
  }

  /** Liefert die Liste registrierter Themes (für die spätere Editor-Galerie). */
  function listThemes() {
    return Object.keys(THEMES).map(function (id) {
      const t = THEMES[id];
      return { id: t.id, label: t.label || t.id, description: t.description || "" };
    });
  }

  /**
   * Ermittelt den effektiven Theme-Namen einer Lernreise.
   * Zentrale Fallback-Logik (gilt für DB-Laden UND Import):
   *  - kein Theme gesetzt        -> "classic"
   *  - Theme gesetzt, aber unbekannt (z.B. importierte Datei mit fremdem
   *    Theme, das diese TONI-Instanz nicht kennt) -> "classic"
   * So entsteht nie eine leere Darstellung.
   */
  function resolveThemeId(journey) {
    const raw = journey && typeof journey.theme === "string" ? journey.theme.trim() : "";
    if (raw && THEMES[raw]) {
      return raw;
    }
    if (raw && !THEMES[raw]) {
      // Bekannt machen, aber nicht laut: hilft beim Debuggen importierter Reisen.
      console.info(
        "[TONI-Theme] Unbekanntes Theme '" + raw + "' – falle auf 'classic' zurück."
      );
    }
    return "classic";
  }

  /**
   * Zentrale Render-Brücke. Wird von journey.js anstelle des direkten
   * toniRenderJourneyTimeline-Aufrufs verwendet.
   *
   * Sicherheitsnetz: Wirft ein Theme-Renderer einen Fehler, wird der Fehler
   * gefangen und auf den klassischen Renderer zurückgefallen – die Lernreise
   * ist dann immer noch voll bedienbar.
   */
  function renderJourneyStations(journey) {
    if (!journey) {
      return "";
    }
    const themeId = resolveThemeId(journey);
    const theme = THEMES[themeId];

    // Modal-Klasse setzen: erlaubt themenspezifisches Layout (z.B. Stationen
    // breit oben, Aufgaben darunter), ohne das klassische CSS anzufassen.
    applyModalThemeClass(themeId);

    // "classic" ohne eigenen Renderer -> der bewährte Original-Renderer.
    if (!theme || themeId === "classic") {
      return classicRender(journey);
    }

    try {
      const html = theme.renderStations(journey);
      // Defensive: Liefert ein Theme nichts Brauchbares, lieber klassisch.
      if (typeof html !== "string" || html.length === 0) {
        console.warn(
          "[TONI-Theme] Theme '" + themeId + "' lieferte leeres HTML – nutze 'classic'."
        );
        return classicRender(journey);
      }
      return html;
    } catch (err) {
      console.error(
        "[TONI-Theme] Fehler im Renderer von Theme '" + themeId + "' – nutze 'classic'.",
        err
      );
      return classicRender(journey);
    }
  }

  /**
   * Setzt am Lernreise-Modal eine Klasse "toni-theme-active-<id>", sodass
   * Themes ihr eigenes Layout greifen lassen können. Vorherige Theme-Klassen
   * werden zuvor entfernt, damit beim Wechsel nichts hängenbleibt.
   */
  function applyModalThemeClass(themeId) {
    const modal = document.getElementById("lr-modal");
    if (!modal) return;
    // alle toni-theme-active-* entfernen
    const toRemove = [];
    modal.classList.forEach(function (c) {
      if (c.indexOf("toni-theme-active-") === 0) toRemove.push(c);
    });
    toRemove.forEach(function (c) { modal.classList.remove(c); });
    modal.classList.add("toni-theme-active-" + themeId);
  }

  /**
   * Ruft den unveränderten Original-Renderer aus journey.js auf.
   * Dadurch ist das klassische Aussehen IMMER exakt wie bisher – wir
   * duplizieren keine Logik, wir delegieren.
   */
  function classicRender(journey) {
    if (typeof window.toniRenderJourneyTimeline === "function") {
      return window.toniRenderJourneyTimeline(journey);
    }
    // Sollte nie passieren (journey.js lädt vor dieser Datei), aber sicher ist sicher.
    console.error("[TONI-Theme] toniRenderJourneyTimeline nicht verfügbar.");
    return "";
  }

  /* ----------------------------------------------------------
   * Das "classic"-Theme: bewusst ohne eigenen Renderer.
   * Es ist nur als Registry-Eintrag vorhanden, damit der Editor es später
   * in der Galerie anzeigen kann ("Klassisch"). Das tatsächliche Rendern
   * übernimmt classicRender() über den Original-Code.
   * -------------------------------------------------------- */
  registerTheme({
    id: "classic",
    label: "Klassisch",
    description: "Die bewährte, ruhige Stationsliste – klar und übersichtlich.",
    // Markerfunktion: renderStations wird für "classic" nie aufgerufen
    // (renderJourneyStations delegiert direkt an classicRender), muss aber
    // existieren, damit registerTheme den Eintrag akzeptiert.
    renderStations: function (journey) {
      return classicRender(journey);
    }
  });

  /* ----------------------------------------------------------
   * Öffentliche API (an window gehängt, da TONI ohne Modul-System arbeitet)
   * -------------------------------------------------------- */
  window.toniThemes = {
    register: registerTheme,
    list: listThemes,
    resolveId: resolveThemeId,
    render: renderJourneyStations
  };

  // Die eine Funktion, die journey.js aufruft:
  window.toniRenderJourneyStations = renderJourneyStations;

  console.info(
    "[TONI-Theme] Engine geladen (" + window.TONI_THEME_BUILD +
      "). Registrierte Themes: " + listThemes().map(function (t) { return t.id; }).join(", ")
  );
})();
