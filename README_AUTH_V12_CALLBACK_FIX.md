# TONI Auth V12 – Callback-/Verifizierungslink-Fix

Diese Version behebt den Fall:

- Verifizierungslink wird geöffnet.
- Nutzer landet nur im Dashboard.
- Profilvervollständigung öffnet nicht.
- Seite aktualisiert den Login-Zustand nicht.

Einrichtung:

1. In Supabase `sql/auth_callback_profile_v12.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden.
5. Für neue Tests möglichst neue Test-E-Mail verwenden oder alten unvollständigen Nutzer aus Auth/Profiles löschen.

Wichtig:
- In Supabase Authentication → URL Configuration muss die echte App-URL stehen, z. B.
  https://toni-app-bb9i.vercel.app
  und
  https://toni-app-bb9i.vercel.app/**
