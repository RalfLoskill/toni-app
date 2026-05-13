# TONI V40 – Individuellen Lernstand speichern

Neue Funktion:
- Für jeden Studenten wird der Lernstand je Lernreise gespeichert.
- Gespeichert werden unter anderem:
  - aktive Lernreise
  - aktive Station
  - ausgewählte Aufgabe
  - Aufgabenstatus: offen, in Bearbeitung, erledigt, gesperrt
  - Antworten/Notizen der Aufgaben
  - Fortschritt in Prozent
  - Bearbeitungszeitpunkte
- Beim erneuten Login wird der zuletzt bearbeitete Lernstand geladen.
- Beim Wechsel einer Lernreise wird der gespeicherte Stand dieser Lernreise geladen.
- Beim Bearbeiten/Erledigen von Aufgaben wird der Stand automatisch gespeichert.

Einrichtung:
1. In Supabase `sql/learning_journey_progress_v40.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.

Test:
1. Als Student anmelden.
2. Lernreise öffnen.
3. Eine Aufgabe öffnen oder erledigen.
4. Abmelden.
5. Wieder anmelden.
6. Der Bearbeitungsstand sollte wiederhergestellt sein.
