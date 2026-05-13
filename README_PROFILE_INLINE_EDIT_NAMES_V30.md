# TONI V30 – Vorname und Nachname direkt im vorhandenen Feld bearbeiten

Änderung:
- Vorname und Nachname werden jeweils einzeln bearbeitet.
- Klick auf den kleinen Stift im jeweiligen Feld macht genau dieses Feld editierbar.
- Speichern erfolgt über den Haken direkt im Feld.
- Abbrechen erfolgt über das X direkt im Feld.
- Die alte gemeinsame Bearbeitungsfläche wird ausgeblendet.
- Die Namen werden im Profil gespeichert.

Einrichtung:
1. `public/index.html` ersetzen.
2. Neu veröffentlichen.
3. Browser hart neu laden.

Hinweis:
Die SQL-Funktion aus V29 (`profile_update_names_v29.sql`) wird weiterhin verwendet.
Falls sie noch nicht ausgeführt wurde, bitte einmal in Supabase ausführen.
