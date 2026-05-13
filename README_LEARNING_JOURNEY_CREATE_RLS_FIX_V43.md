# TONI V43 – Fehler beim Anlegen neuer Lernreisen beheben

Behebt:
`new row violates row-level security policy for table "learning_journey_templates"`

Ursache:
Bestehende Lernreisen konnten geändert werden, aber neue Lernreisen wurden per direktem INSERT gespeichert.
Dabei konnte die Row-Level-Security von Supabase blockieren.

Lösung:
- Neue Lernreisen werden nun über die sichere Funktion `upsert_learning_journey_template_v43(...)` gespeichert.
- Beim Neuanlegen wird `owner_profile_id` serverseitig korrekt auf den angemeldeten Nutzer gesetzt.
- Bestehende Lernreisen können weiterhin bearbeitet werden.
- Admins können alle Lernreisen bearbeiten, Tutoren ihre eigenen.

Einrichtung:
1. In Supabase `sql/learning_journey_create_rls_fix_v43.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.
5. Neue Lernreise anlegen testen.
