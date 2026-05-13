# TONI V27 – Profilfenster lädt Daten zuverlässig

Behebt:
- Im Fenster „Meine Daten“ wurden Vorname, Nachname und Klasse teilweise nur als „–“ angezeigt.

Änderung:
- Beim Öffnen des Fensters werden die Profilinformationen frisch aus Supabase geladen.
- Falls Supabase verzögert antwortet, werden zunächst die sichtbaren Daten aus dem Anmeldebereich genutzt.
- Angezeigt werden:
  - Vorname
  - Nachname
  - Klasse

Einrichtung:
1. `public/index.html` ersetzen.
2. Neu veröffentlichen.
3. Browser hart neu laden.
