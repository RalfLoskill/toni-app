# TONI V31 – Profilbild aufnehmen und speichern

Neue Funktion:
- In der Profilanzeige wird ein Profilbild in Kreisform angezeigt.
- Wenn noch kein Profilbild vorhanden ist, werden Initialen angezeigt.
- Über „Profilbild ändern“ startet die Kamera.
- Der Nutzer kann ein Foto aufnehmen.
- Das Foto wird als Profilbild im Profil gespeichert.

Einrichtung:
1. In Supabase `sql/profile_avatar_v31.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.

Hinweis:
Das Profilbild wird als Data-URL in der Spalte `avatar_data_url` der Tabelle `profiles` gespeichert.
Für eine spätere Produktivversion wäre Supabase Storage die sauberere Lösung.
