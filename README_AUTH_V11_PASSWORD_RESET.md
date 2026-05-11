# TONI Auth V11 – Admin Passwort-Reset Fix

Diese Version behebt den Passwort-Reset-Versand.

Wichtigste Änderung:
- Die Redirect-URL für den Passwort-Reset wird ohne Query-Parameter verwendet:
  https://toni-app.vercel.app

Warum:
- Die URL muss exakt in Supabase → Authentication → URL Configuration → Redirect URLs stehen.
- Query-Parameter wie ?admin_recovery=1 können je nach Allowlist/Template verhindern, dass die Recovery-Mail zuverlässig versendet wird.

Test:
1. public/index.html ersetzen.
2. Neu veröffentlichen.
3. Browser hart neu laden.
4. Bei Admin-Login auf „Passwort vergessen?“ klicken.
5. In Brevo → Transactional → Logs prüfen, ob die Mail verarbeitet wurde.
