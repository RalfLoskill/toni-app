# TONI V36 – Profilbilder in der Lernreise-Zuordnung

Änderung:
- In der Spalte „Zugeordnete Studenten / Klasse“ werden nun die Profilbilder der zugeordneten Studenten angezeigt.
- Falls kein Profilbild gespeichert ist, werden Initialen angezeigt.
- Name, Klasse und E-Mail bleiben sichtbar.
- Der Löschen-Button für die Zuordnung bleibt erhalten.

Einrichtung:
1. `public/index.html` ersetzen.
2. Neu veröffentlichen.
3. Browser hart neu laden.

Hinweis:
Die SQL aus V31 (`profile_avatar_v31.sql`) muss ausgeführt sein, damit `avatar_data_url` verfügbar ist.
