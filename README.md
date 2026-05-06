# TONI Dashboard Profile / Rollen V2

## Einrichtung

1. In Supabase `sql/profiles_roles_v2.sql` ausführen.
2. `public/index.html` in dein Vercel-Projekt kopieren.
3. Neu veröffentlichen.
4. Browser: `localStorage.clear()` ausführen und neu laden.

## Funktionen

- Profile werden aus Supabase geladen.
- Das aktive Profil bestimmt die Rolle.
- Student sieht keinen Lernreise-Editor.
- Tutor und Admin können Lernreisen anlegen/bearbeiten.
- Admin sieht den Admin-Bereich.
