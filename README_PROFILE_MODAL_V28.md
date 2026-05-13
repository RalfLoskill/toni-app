# TONI V28 – Profilfenster nach Abmeldung/Neuanmeldung zurücksetzen

Behebt:
- Nach Abmeldung oder Anmeldung mit einem anderen Nutzer konnten im Fenster „Meine Daten“ noch alte Daten angezeigt werden.

Änderung:
- Profilcache wird bei Abmeldung gelöscht.
- Beim Wechsel des angemeldeten Nutzers werden die Felder sofort geleert.
- Beim Öffnen des Profilfensters werden die Daten neu aus dem aktuellen Profil geladen.
- Supabase-Auth-Events SIGNED_OUT und SIGNED_IN werden berücksichtigt.

Einrichtung:
1. `public/index.html` ersetzen.
2. Neu veröffentlichen.
3. Browser hart neu laden.
