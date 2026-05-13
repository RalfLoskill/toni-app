# TONI V41 – Admin sieht Bearbeitungsstand der Lernreisen

Neue Funktion:
- In der Admin-/Tutor-Ansicht „Lernreisen verwalten“ erscheint neben jedem zugeordneten Studenten ein Fortschrittsbalken.
- Der Balken zeigt den aktuellen Bearbeitungszustand der jeweiligen Lernreise.
- Angezeigt werden:
  - Prozentwert
  - Fortschrittsbalken
  - Status: noch nicht begonnen / in Bearbeitung / abgeschlossen

Einrichtung:
1. In Supabase `sql/admin_progress_bars_v41.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.

Hinweis:
V40 (`learning_journey_progress_v40.sql`) muss bereits ausgeführt sein.
