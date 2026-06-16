# Lernreisen-Themes

Dieser Ordner enthält die thematischen Darstellungen ("Themes") für TONI-Lernreisen.
Inhalt und Darstellung sind getrennt: Der Inhalt (steps/tasks) bleibt in der DB
unverändert, ein Theme bestimmt nur das Aussehen.

## Dateien

- `journey_theme.js` — Theme-Engine (Stufe 0 / Fundament). Registriert Themes,
  liefert den zentralen `classic`-Fallback und die Render-Brücke
  `window.toniRenderJourneyStations`. Muss VOR allen einzelnen Themes geladen werden.
- `journey_theme_space.js` — Theme "Weltall / Sternenroute" (Stufe 1+).
  Stationen als Planeten auf einer automatisch berechneten Flugbahn, Aufgaben als
  Monde im Orbit, Vollbild, thematisches Aufgaben-Modal, dezente Animationen.

## Einbindung (index.html)

Reihenfolge ist wichtig — Engine zuerst, dann die Themes:

```html
<script src="/journey.js?v=145"></script>
<script src="/journey/theme/journey_theme.js?v=2"></script>
<script src="/journey/theme/journey_theme_space.js?v=8"></script>
```

## Ein neues Theme hinzufügen

1. Neue Datei `journey_theme_<id>.js` in diesem Ordner anlegen.
2. Sich bei der Engine registrieren:
   ```js
   window.toniThemes.register({
     id: "<id>",
     label: "Anzeigename",
     description: "Kurzbeschreibung für die Editor-Galerie",
     renderStations: function (journey) { /* HTML-String zurückgeben */ }
   });
   ```
3. Skript-Tag in index.html nach der Engine ergänzen.
4. Lernreise bekommt im Feld `theme` den `<id>`. Fehlt/unbekannt -> Fallback `classic`.

## Assets

Themes referenzieren gemeinsame Assets über ABSOLUTE Pfade (z. B.
`/assets/toni-logo-face.png`), damit sie unabhängig vom Speicherort des Skripts
funktionieren.
