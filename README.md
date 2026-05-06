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


## Fix in dieser Version

- Profil-Schalter wird sofort mit Demo-Profilen gefüllt.
- `escapeHtml()` wird bereitgestellt, falls es im Dashboard fehlt.
- `supabaseRequest()` wird bereitgestellt, damit Profile aus Supabase geladen werden können.
- Supabase URL und Publishable Key sind eingetragen.


# TONI Auth / Login V3

## Einrichtung

1. In Supabase SQL Editor `sql/auth_login_v3.sql` ausführen.
2. In Supabase unter Authentication → URL Configuration:
   - Site URL: deine Vercel-URL, z. B. https://toni-app.vercel.app
   - Redirect URLs: deine Vercel-URL ebenfalls hinzufügen.
3. `public/index.html` in dein Vercel-Projekt kopieren.
4. Neu veröffentlichen.
5. Seite öffnen und mit E-Mail anmelden.
6. Nach dem ersten Login in Supabase deine Rolle setzen:

```sql
update profiles
set role = 'admin', display_name = 'Ralf Loskill'
where email = 'DEINE_EMAIL_ADRESSE';
```

Neue Nutzer starten automatisch als `student`.

# TONI Lerngruppen / QR-Beitritt V4

1. In Supabase `sql/learning_groups_qr_v4.sql` ausführen.
2. `public/index.html` ersetzen und veröffentlichen.
3. Als Tutor/Admin anmelden, Lerngruppe anlegen, QR-Code anzeigen.
4. Student scannt Link und wird nach Login automatisch zugeordnet.
