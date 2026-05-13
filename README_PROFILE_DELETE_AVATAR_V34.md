# TONI V34 – Profilbild löschen

Neue Funktion:
- Neben „Profilbild ändern“ erscheint jetzt „Profilbild löschen“.
- Klick auf „Profilbild löschen“ entfernt das gespeicherte Profilbild aus dem Profil.
- Danach werden wieder die Initialen angezeigt.
- Die obere runde Profilanzeige wird ebenfalls aktualisiert.

Einrichtung:
1. In Supabase `sql/profile_delete_avatar_v34.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.
