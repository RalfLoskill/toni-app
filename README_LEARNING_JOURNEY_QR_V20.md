# TONI V20 – Lernreise-Zuordnung per QR-Code

Neue Funktionen:

Admin/Tutor:
- Klick auf das Pluszeichen einer Lernreise zeigt nur noch einen QR-Code.
- Der QR-Code enthält die Lernreise-ID im Format `TONI-JOURNEY:<id>`.
- Der QR-Code bleibt für dieselbe Lernreise gleich.
- Klick auf den QR-Code oder auf „QR-Code herunterladen“ lädt ihn herunter.
- Das QR-Fenster kann über ein kleines X geschlossen werden.

Student:
- In „Deine Lernreise“ gibt es die Buttons:
  - „Lernreise hinzufügen“
  - „Lernreise wechseln“
- „Lernreise hinzufügen“ öffnet die Kamera und scannt den QR-Code.
- Nach Prüfung wird die Lernreise dem Student zugeordnet.
- „Lernreise wechseln“ zeigt alle zugeordneten Lernreisen und erlaubt Start/Wechsel.

Einrichtung:
1. In Supabase `sql/learning_journey_qr_assignments_v20.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.
