# TONI V37 – Profilbilder in der Zuordnungstabelle zuverlässig anzeigen

Behebt:
- Profilbilder wurden in „Zugeordnete Studenten / Klasse“ nicht angezeigt.

Grund:
Der direkte profiles-Join aus dem Browser liefert avatar_data_url je nach RLS/FK-Konfiguration nicht zuverlässig.

Lösung:
- Neue Supabase-Funktion `get_learning_journey_assignments_with_profiles()`.
- Die Tabelle lädt Zuordnungen inklusive Profilbild jetzt über diese Funktion.
- Falls kein Bild vorhanden ist, werden weiterhin Initialen angezeigt.

Einrichtung:
1. In Supabase `sql/assignment_student_avatars_v37.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.
