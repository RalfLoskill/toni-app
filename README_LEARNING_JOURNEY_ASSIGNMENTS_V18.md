# TONI V18 – Keine Lerngruppen mehr: Lernreisen direkt zuordnen

Änderungen:
- Die Ansicht „Lerngruppen verwalten“ wird ausgeblendet.
- Stattdessen gibt es die Ansicht „Lernreisen zuordnen“.
- Tabelle mit:
  1. Lernreise
  2. zugeordnete Studenten + Klasse
  3. Plus-Button zum Zuordnen eines neuen Studenten
- Jede Zuordnung kann über ein X gelöscht werden.

Einrichtung:
1. In Supabase `sql/learning_journey_assignments_v18.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.
5. Als Admin/Tutor anmelden.

Hinweis:
- Wenn ein Student bereits ein Profil hat, wird die Lernreise dem Profil zugeordnet.
- Wenn noch kein Profil existiert, wird die Zuordnung per E-Mail vorgemerkt.
