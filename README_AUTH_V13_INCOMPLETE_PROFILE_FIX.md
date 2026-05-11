# TONI Auth V13 – Profilvervollständigung öffnet immer

Diese Version behebt den Fall, dass nach dem Öffnen des Verifizierungslinks zwar das Dashboard erscheint,
aber „Registrierung abschließen“ nicht geöffnet wird.

V13 prüft unabhängig von URL-Parametern bei jedem Seitenstart:
- aktive Session vorhanden?
- Profil vorhanden?
- profile_complete = false?

Wenn ja, öffnet sich automatisch „Registrierung abschließen“.

Einrichtung:
1. In Supabase `sql/auth_incomplete_profile_v13.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.
5. Testnutzer ggf. vorher aus auth.users und profiles löschen und frisch testen.
