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


# TONI Auth V4 – Bestandsnutzer-Prüfung

## Ziel

- Vor dem Magic Link wird geprüft, ob zur E-Mail bereits ein Profil existiert.
- Wenn Profil existiert: Passwort-Login anzeigen.
- Wenn kein Profil existiert: Magic Link als Erstanmeldung senden.
- Admin-E-Mail `ralf.loskill@googlemail.com` wird beim ersten Login automatisch Admin.

## Einrichtung

1. In Supabase SQL Editor `sql/auth_existing_user_check_v4.sql` ausführen.
2. `public/index.html` in dein Vercel-Projekt kopieren.
3. Neu veröffentlichen.
4. Browser neu laden.

## Wichtig

Damit Magic Link wirklich nur für die Erstanmeldung nötig ist, brauchen bestehende Nutzer ein Passwort.
Falls ein Bestandsnutzer noch kein Passwort gesetzt hat, kann er den Magic Link weiterhin als Fallback nutzen.


# TONI Auth V5 – Passwort nach Magic Link erforderlich

## Ziel

Nach jedem Magic-Link-Login prüft TONI, ob das Profil bereits ein Passwort gesetzt hat.

- Kein Profil vorhanden → Magic Link zur Erstanmeldung → danach Passwort festlegen
- Profil vorhanden, aber `password_set = false` → Magic Link → danach Passwort festlegen
- Profil vorhanden und `password_set = true` → Passwort-Login

## Einrichtung

1. In Supabase SQL Editor `sql/auth_password_required_v5.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Beim nächsten Magic-Link-Login Passwort festlegen.

## Wichtig

Supabase speichert Passwörter intern in Auth. Die App speichert nur den Status `password_set = true` in `profiles`.
