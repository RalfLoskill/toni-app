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


# TONI Auth V6 – Startpasswort + Passwort-Reset

## Ziel

Magic Link wird nicht mehr zur Anmeldung verwendet.

Normalfall:
- Tutor/Admin legt Nutzer mit Startpasswort an.
- Nutzer meldet sich mit E-Mail + Startpasswort an.
- Nutzer muss beim ersten Login ein eigenes Passwort setzen.

Sonderfall:
- Passwort vergessen → Reset-Link per E-Mail.

## Einrichtung

1. In Supabase SQL Editor `sql/auth_start_password_v6.sql` ausführen.
2. In Vercel Environment Variables setzen:
   - SUPABASE_URL
   - SUPABASE_SERVICE_ROLE_KEY
3. `public/index.html` ersetzen.
4. `api/create-user.js` in dein Projekt übernehmen.
5. Neu veröffentlichen.

## Sicherheit

Der Service Role Key darf niemals in die index.html.
Er wird nur serverseitig in `api/create-user.js` verwendet.

# TONI Auth V7 – Selbstregistrierung + Lerngruppen-QR

Tutor:
1. Tutor meldet sich an.
2. Tutor wählt eine Lerngruppe aus.
3. Tutor klickt „Neuer Student · QR-Code anzeigen“.
4. QR-Code kann von mehreren Studenten genutzt werden.

Student:
1. Student scannt QR-Code.
2. Student gibt E-Mail-Adresse ein.
3. TONI prüft, ob die E-Mail bereits vollständig registriert ist.
4. Falls ja: Passwort-Login.
5. Falls nein: Verifizierungs-Mail.
6. Nach E-Mail-Bestätigung: Vorname, Nachname, Klasse/Kurs und Passwort festlegen.
7. Student ist registriert und wird automatisch der Lerngruppe zugeordnet.

Einrichtung:
1. `sql/auth_self_registration_group_qr_v7.sql` in Supabase ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.


# TONI Auth V7.1 – Fix Registrierung abschließen

Diese Version behebt das Hängenbleiben beim Button „Registrierung abschließen“.

Wichtig:
1. In Supabase unbedingt `sql/auth_self_registration_group_qr_v7_1.sql` ausführen.
2. Danach `public/index.html` ersetzen und neu veröffentlichen.
3. Browser neu laden.

Der Button zeigt jetzt Statusmeldungen und gibt eine sichtbare Fehlermeldung aus, falls die Supabase-Funktion `complete_my_profile` noch fehlt.


# TONI Auth V7.2 – Fix Registrierung bleibt hängen

Diese Version behebt das Hängenbleiben bei „Speichere Registrierung…“.

Einrichtung:
1. In Supabase `sql/auth_self_registration_group_qr_v7_2.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Seite hart neu laden.


# TONI Auth V7.3 – Fix E-Mail-Prüfung bleibt hängen

Diese Version behebt das Hängenbleiben bei „Prüfe E-Mail…“.

Wichtig:
1. In Supabase `sql/auth_email_check_v7_3.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Browser hart neu laden oder `localStorage.clear()` ausführen.


# TONI Auth V7.4 – Fix nach Verifizierungslink

Diese Version öffnet nach dem Klick auf den Verifizierungslink zuverlässig den Dialog
„Registrierung abschließen“, sobald das Profil noch nicht vollständig ist.

Einrichtung:
1. In Supabase `sql/auth_redirect_registration_v7_4.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Seite hart neu laden.

# TONI Auth V7.5 – Passwort-Reset Flow Fix

Nach Klick auf den Passwort-Reset-Link:
- vollständiges Profil → neues Passwort festlegen
- unvollständiges Profil → Passwort festlegen → Profil vervollständigen

Einrichtung:
1. In Supabase `sql/auth_password_recovery_flow_v7_5.sql` ausführen.
2. `public/index.html` ersetzen.
3. Neu veröffentlichen.
4. Supabase Authentication → URL Configuration prüfen.
