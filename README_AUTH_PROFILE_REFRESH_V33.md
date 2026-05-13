# TONI V33 – Profiländerungen nur angemeldet + Anzeige aktualisieren

Korrekturen:
- Wenn niemand angemeldet ist, können keine Änderungen am Profil vorgenommen werden.
- Profilfenster und Kamera werden für nicht angemeldete Nutzer blockiert.
- Beim Abmelden werden Profilcache, Profilfenster und Profilbild-Anzeige geleert.
- Beim Anmelden oder Nutzerwechsel wird die Anzeige frisch aus dem aktuellen Profil geladen.
- Das runde Profilbild oben wird nach Login/Logout zuverlässig aktualisiert.

Einrichtung:
1. `public/index.html` ersetzen.
2. Neu veröffentlichen.
3. Browser hart neu laden.
