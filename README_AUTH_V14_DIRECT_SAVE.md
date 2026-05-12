# TONI Auth V14 – Registrierung direkt speichern

Diese Version behebt den Fehler:
"Passwort speichern dauert zu lange"

Ursache:
client.auth.updateUser() hängt in manchen Rückkehr-/Magic-Link-Sessions.

Änderung:
- Passwortspeicherung direkt über Supabase Auth REST API:
  PUT /auth/v1/user
- Profilspeicherung direkt über REST:
  PATCH /rest/v1/profiles
- Kein kritischer Pfad mehr über client.auth.updateUser()

Einrichtung:
1. In Supabase `sql/auth_registration_direct_save_v14.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.
5. Testnutzer bei Bedarf aus auth.users und profiles löschen und frisch testen.
