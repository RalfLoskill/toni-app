export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return res.status(500).json({
      error: "Server ist nicht vollständig konfiguriert. SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY fehlen."
    });
  }

  const authHeader = req.headers.authorization || "";
  const userJwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";

  if (!userJwt) {
    return res.status(401).json({ error: "Nicht angemeldet." });
  }

  try {
    const requesterResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${userJwt}`
      }
    });

    if (!requesterResponse.ok) {
      return res.status(401).json({ error: "Anmeldung konnte nicht geprüft werden." });
    }

    const requester = await requesterResponse.json();

    const requesterProfileResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?id=eq.${requester.id}&select=id,role,email&limit=1`,
      {
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`
        }
      }
    );

    const requesterProfiles = await requesterProfileResponse.json();
    const requesterProfile = requesterProfiles?.[0];

    if (!requesterProfile || !["tutor", "admin"].includes(requesterProfile.role)) {
      return res.status(403).json({ error: "Nur Tutor oder Admin dürfen Nutzer anlegen." });
    }

    const { email, password, display_name, class_name, role } = req.body || {};

    if (!email || !password || !display_name) {
      return res.status(400).json({ error: "Name, E-Mail und Startpasswort sind erforderlich." });
    }

    const targetRole = role || "student";

    if (requesterProfile.role !== "admin" && targetRole !== "student") {
      return res.status(403).json({ error: "Tutor dürfen nur Studenten anlegen." });
    }

    if (!["student", "tutor", "admin"].includes(targetRole)) {
      return res.status(400).json({ error: "Ungültige Rolle." });
    }

    const createAuthResponse = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name
        }
      })
    });

    const authResult = await createAuthResponse.json();

    if (!createAuthResponse.ok) {
      const message = authResult?.msg || authResult?.message || authResult?.error_description || "Nutzer konnte nicht angelegt werden.";
      return res.status(createAuthResponse.status).json({ error: message });
    }

    const user = authResult.user || authResult;

    const upsertProfileResponse = await fetch(`${SUPABASE_URL}/rest/v1/profiles?on_conflict=id`, {
      method: "POST",
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([{
        id: user.id,
        display_name,
        email,
        class_name: class_name || "",
        role: targetRole,
        password_set: true,
        force_password_change: true,
        is_active: true
      }])
    });

    const profiles = await upsertProfileResponse.json();

    if (!upsertProfileResponse.ok) {
      return res.status(upsertProfileResponse.status).json({
        error: "Auth-Nutzer wurde angelegt, Profil konnte aber nicht gespeichert werden.",
        details: profiles
      });
    }

    return res.status(200).json({
      ok: true,
      user: {
        id: user.id,
        email,
        display_name,
        class_name: class_name || "",
        role: targetRole
      }
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "Unbekannter Serverfehler."
    });
  }
}
