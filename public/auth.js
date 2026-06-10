/* ============================================================
   TONI – auth.js
   Login, Registrierung, Profil, Passwort, SuperAdmin
   Ausgelagert aus index.html (V110)
   ============================================================ */

/* =========================================================
   TONI – AUTH V4 / BESTANDSNUTZER-PRÜFUNG
   ========================================================= */

function resetAuthForm() {
  const email = document.getElementById("auth-email");
  const pw = document.getElementById("auth-password");
  const area = document.getElementById("auth-password-area");
  const mode = document.getElementById("auth-login-mode");
  const btn = document.getElementById("auth-continue-btn");

  if (pw) pw.value = "";
  if (area) area.classList.remove("visible");
  if (btn) btn.style.display = "";
  if (mode) mode.textContent = "TONI prüft zuerst, ob zu dieser E-Mail bereits ein Profil existiert.";
  if (email) {
    email.disabled = false;
    email.focus();
  }

  const box = document.getElementById("auth-message");
  if (box) box.className = "auth-message";
}

async function checkProfileExistsByEmail(email) {
  try {
    const result = await supabaseRequest("rpc/check_profile_exists_by_email", {
      method: "POST",
      body: JSON.stringify({ p_email: email })
    });
    return !!result?.exists;
  } catch (error) {
    console.warn("Vorprüfung nicht möglich, Fallback auf Magic Link:", error);
    return false;
  }
}

async function continueLogin() {
  const emailEl = document.getElementById("auth-email");
  const email = emailEl.value.trim();

  if (!email) {
    setAuthMessage("Bitte gib eine E-Mail-Adresse ein.", "err");
    return;
  }

  const btn = document.getElementById("auth-continue-btn");
  const mode = document.getElementById("auth-login-mode");

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Prüfe E-Mail…";
    }

    const exists = await checkProfileExistsByEmail(email);

    if (exists) {
      showPasswordLogin(email);
    } else {
      // Keine offene Selbstregistrierung mehr: für unbekannte E-Mails wird KEIN Magic
      // Link mehr versendet. Neue Zugänge entstehen ausschließlich über den QR-Code
      // einer Lehrkraft/eines Tutors. Die Meldung ist bewusst NEUTRAL formuliert
      // (Konjunktiv), damit sie nicht verrät, ob die E-Mail existiert
      // (Datenschutz / keine account enumeration, v.a. bei minderjährigen Nutzern).
      // Passwort-Reset bleibt über den separaten Weg (sendPasswordReset) möglich.
      // Passwortfeld + Reset im NEUTRALEN Modus anzeigen (showPasswordLogin setzt dann
      // selbst KEINE existenz-verratende Meldung); unsere Meldung danach setzen.
      showPasswordLogin(email, true);
      setAuthMessage(
        "Falls zu dieser E-Mail-Adresse ein Account besteht, kannst du dich mit deinem " +
        "Passwort anmelden oder über „Passwort vergessen?“ ein neues Passwort setzen.<br><br>" +
        "Neue Zugänge zu TONI werden über den QR-Code deiner Lehrkraft bzw. deines Tutors erstellt.",
        "ok"
      );
    }
  } catch (error) {
    console.error(error);
    setAuthMessage("⚠️ Die E-Mail konnte nicht geprüft werden:<br>" + escapeHtml(error.message), "err");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Weiter";
    }
  }
}

function showPasswordLogin(email, neutral) {
  const emailEl = document.getElementById("auth-email");
  const area = document.getElementById("auth-password-area");
  const mode = document.getElementById("auth-login-mode");
  const btn = document.getElementById("auth-continue-btn");

  if (emailEl) emailEl.disabled = true;
  if (area) area.classList.add("visible");
  if (btn) btn.style.display = "none";

  if (neutral) {
    // Neutraler Modus: KEINE Aussage darüber, ob das Profil existiert (Datenschutz).
    // Meldung + Hinweistext werden vom Aufrufer (continueLogin) gesetzt.
    if (mode) {
      mode.innerHTML = `Melde dich mit deinem Passwort an oder nutze „Passwort vergessen?“.`;
    }
    setTimeout(() => document.getElementById("auth-password")?.focus(), 80);
    return;
  }

  if (mode) {
    mode.innerHTML = `Zu <strong>${escapeHtml(email)}</strong> existiert bereits ein TONI-Profil. Bitte melde dich mit Passwort an.`;
  }

  setAuthMessage("Profil gefunden. Der Magic Link wird nur für die Erstanmeldung oder als Fallback verwendet.", "ok");
  setTimeout(() => document.getElementById("auth-password")?.focus(), 80);
}

async function signInWithPassword() {
  const client = getSupabaseClient();
  const email = document.getElementById("auth-email").value.trim();
  const password = document.getElementById("auth-password").value;

  if (!email || !password) {
    setAuthMessage("Bitte gib E-Mail und Passwort ein.", "err");
    return;
  }

  try {
    const { error } = await client.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    setAuthMessage("✅ Anmeldung erfolgreich.", "ok");
    closeAuthModal();
    setTimeout(() => {
      if (typeof toniV73ShowLoader === "function") {
        toniV73ShowLoader(4000, "login");
      }
      // Lernreisen-Sektion nach Login explizit aufbauen, damit der
      // Lade-Koordinator zuverlässig „journeys fertig" gemeldet bekommt.
      if (typeof window.toniV50RenderAllJourneysInActivities === "function") {
        setTimeout(() => window.toniV50RenderAllJourneysInActivities(), 300);
      }
    }, 120);
  } catch (error) {
    console.error(error);
    setAuthMessage(
      "⚠️ Anmeldung mit Passwort fehlgeschlagen.<br>" +
      escapeHtml(error.message) +
      "<br><br>Falls du noch kein Passwort gesetzt hast, nutze einmalig den Magic Link.",
      "err"
    );
  }
}

// Override der bisherigen Magic-Link-Funktion:
// Sie wird nun nur noch nach Vorprüfung oder als expliziter Fallback genutzt.
async function sendMagicLink(force = false) {
  const client = getSupabaseClient();
  const email = document.getElementById("auth-email").value.trim();

  if (!email) {
    setAuthMessage("Bitte gib eine E-Mail-Adresse ein.", "err");
    return;
  }

  try {
    if (!force) {
      const exists = await checkProfileExistsByEmail(email);
      if (exists) {
        showPasswordLogin(email);
        return;
      }
    }

    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) throw error;

    setAuthMessage("✅ Magic Link wurde gesendet. Bitte prüfe dein E-Mail-Postfach.", "ok");
  } catch (error) {
    console.error(error);
    setAuthMessage("⚠️ Anmeldung konnte nicht gestartet werden:<br>" + escapeHtml(error.message), "err");
  }
}

// Nach Login: Admin-E-Mail wird automatisch über SQL-Funktion als Admin erkannt.
// Falls das Profil bereits existiert, lädt TONI die Rolle aus profiles.

/* =========================================================
   TONI – AUTH V5 / PASSWORT NACH MAGIC LINK
   ========================================================= */

function setPasswordMessage(text, type = "ok") {
  const box = document.getElementById("password-required-message");
  if (!box) return;
  box.className = "auth-message visible " + (type === "err" ? "err" : "ok");
  box.innerHTML = text;
}

function openPasswordRequiredModal() {
  const modal = document.getElementById("password-required-modal");
  if (modal) modal.classList.add("open");
  setTimeout(() => document.getElementById("new-password")?.focus(), 80);
}

function closePasswordRequiredModal() {
  const modal = document.getElementById("password-required-modal");
  if (modal) modal.classList.remove("open");
}

function checkNewPasswordStrength() {
  const pw = document.getElementById("new-password")?.value || "";
  const out = document.getElementById("password-strength");
  if (!out) return;

  if (pw.length >= 8) {
    out.className = "password-strength ok";
    out.textContent = "Passwortlänge ist ausreichend.";
  } else {
    out.className = "password-strength err";
    out.textContent = "Bitte mindestens 8 Zeichen verwenden.";
  }
}

async function setPasswordAfterMagicLink() {
  const client = getSupabaseClient();
  const pw1 = document.getElementById("new-password").value;
  const pw2 = document.getElementById("new-password-repeat").value;

  if (!pw1 || !pw2) {
    setPasswordMessage("Bitte gib das Passwort zweimal ein.", "err");
    return;
  }

  if (pw1.length < 8) {
    setPasswordMessage("Das Passwort sollte mindestens 8 Zeichen haben.", "err");
    return;
  }

  if (pw1 !== pw2) {
    setPasswordMessage("Die Passwörter stimmen nicht überein.", "err");
    return;
  }

  try {
    const { error } = await client.auth.updateUser({
      password: pw1
    });

    if (error) throw error;

    await supabaseRequest("rpc/mark_my_password_set", {
      method: "POST",
      body: JSON.stringify({})
    });

    if (TONI_AUTH_PROFILE) {
      TONI_AUTH_PROFILE.password_set = true;
    }

    setPasswordMessage("✅ Passwort gespeichert. Dein Konto ist vollständig eingerichtet.", "ok");

    setTimeout(() => {
      closePasswordRequiredModal();
      if (typeof appendMsg === "function") {
        appendMsg("toni", "✅ Dein Passwort wurde gespeichert. Beim nächsten Login kannst du dich direkt mit Passwort anmelden.", typeof time === "function" ? time() : "", "desktop");
      }
    }, 900);
  } catch (error) {
    console.error(error);
    setPasswordMessage("⚠️ Passwort konnte nicht gespeichert werden:<br>" + escapeHtml(error.message), "err");
  }
}

// V5: Prüfung gibt jetzt exists + password_set zurück.
async function checkProfileExistsByEmail(email) {
  try {
    const result = await supabaseRequest("rpc/check_profile_exists_by_email", {
      method: "POST",
      body: JSON.stringify({ p_email: email })
    });
    return {
      exists: !!result?.exists,
      password_set: !!result?.password_set
    };
  } catch (error) {
    console.warn("Vorprüfung nicht möglich, Fallback auf Magic Link:", error);
    return {
      exists: false,
      password_set: false
    };
  }
}

// V5: Profil existiert + password_set=true -> Passwortlogin.
// Profil existiert + password_set=false -> Magic Link zum Passwortsetzen.
// Kein Profil -> Magic Link zur Erstanmeldung.
async function continueLogin() {
  const emailEl = document.getElementById("auth-email");
  const email = emailEl.value.trim();

  if (!email) {
    setAuthMessage("Bitte gib eine E-Mail-Adresse ein.", "err");
    return;
  }

  const btn = document.getElementById("auth-continue-btn");
  const mode = document.getElementById("auth-login-mode");

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Prüfe E-Mail…";
    }

    const check = await checkProfileExistsByEmail(email);

    if (check.exists && check.password_set) {
      showPasswordLogin(email);
      return;
    }

    if (check.exists && !check.password_set) {
      if (mode) {
        mode.innerHTML = `Zu <strong>${escapeHtml(email)}</strong> existiert bereits ein Profil, aber noch kein Passwort. TONI sendet dir einen Magic Link, danach musst du ein Passwort festlegen.`;
      }
      await sendMagicLink(true);
      return;
    }

    if (mode) {
      mode.innerHTML = `Zu <strong>${escapeHtml(email)}</strong> existiert noch kein Profil. TONI sendet einen Magic Link zur Erstanmeldung. Danach musst du ein Passwort festlegen.`;
    }
    await sendMagicLink(true);
  } catch (error) {
    console.error(error);
    setAuthMessage("⚠️ Die E-Mail konnte nicht geprüft werden:<br>" + escapeHtml(error.message), "err");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Weiter";
    }
  }
}

// V5: Magic Link wird explizit nur dann versendet, wenn
// - kein Profil existiert oder
// - Profil existiert, aber noch kein Passwort gesetzt ist,
// oder als bewusster Fallback.
async function sendMagicLink(force = false) {
  const client = getSupabaseClient();
  const email = document.getElementById("auth-email").value.trim();

  if (!email) {
    setAuthMessage("Bitte gib eine E-Mail-Adresse ein.", "err");
    return;
  }

  try {
    if (!force) {
      const check = await checkProfileExistsByEmail(email);
      if (check.exists && check.password_set) {
        showPasswordLogin(email);
        return;
      }
    }

    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin
      }
    });

    if (error) throw error;

    setAuthMessage("✅ Magic Link wurde gesendet. Bitte prüfe dein E-Mail-Postfach. Nach dem Klick legst du ein Passwort fest.", "ok");
  } catch (error) {
    console.error(error);
    setAuthMessage("⚠️ Anmeldung konnte nicht gestartet werden:<br>" + escapeHtml(error.message), "err");
  }
}

// Nach erfolgreichem Magic-Link/Login: prüfen, ob Passwort gesetzt ist.
const toniV5OriginalApplyAuthProfile = window.applyAuthProfile;
window.applyAuthProfile = function(profile) {
  if (typeof toniV5OriginalApplyAuthProfile === "function") {
    toniV5OriginalApplyAuthProfile(profile);
  }

  if (profile && profile.password_set === false) {
    setTimeout(openPasswordRequiredModal, 500);
  }
};

// ensureProfileForUser soll password_set mitladen.
const toniV5OriginalEnsureProfileForUser = window.ensureProfileForUser;
window.ensureProfileForUser = async function(user) {
  if (!user) return null;

  try {
    const rows = await supabaseRequest(`profiles?id=eq.${user.id}&select=id,display_name,email,class_name,role,password_set&limit=1`);
    if (rows && rows.length) return rows[0];
  } catch (error) {
    console.warn("Profil konnte nicht mit password_set gelesen werden:", error);
  }

  if (typeof toniV5OriginalEnsureProfileForUser === "function") {
    const profile = await toniV5OriginalEnsureProfileForUser(user);
    if (profile && typeof profile.password_set === "undefined") profile.password_set = false;
    return profile;
  }

  return null;
};

/* =========================================================
   TONI – AUTH V6 / STARTPASSWORT + PASSWORT-RESET
   ========================================================= */
let LAST_CREATED_CREDENTIALS = null;

async function getCurrentAccessTokenForApi() {
  const client = getSupabaseClient();
  const { data } = await client.auth.getSession();
  return data?.session?.access_token || "";
}

// Neues Login-Verhalten: Passwort zuerst.
async function continueLogin() {
  return signInWithPassword();
}

async function signInWithPassword() {
  const client = getSupabaseClient();
  const email = document.getElementById("auth-email")?.value.trim();
  const password = document.getElementById("auth-password")?.value;

  if (!email || !password) {
    setAuthMessage("Bitte gib E-Mail-Adresse und Passwort ein.", "err");
    return;
  }

  try {
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    setAuthMessage("✅ Anmeldung erfolgreich.", "ok");
    closeAuthModal();
  } catch (error) {
    console.error(error);
    setAuthMessage(
      "⚠️ Anmeldung fehlgeschlagen:<br>" +
      escapeHtml(error.message) +
      "<br><br>Falls du dein Passwort vergessen hast, nutze „Passwort vergessen?“.",
      "err"
    );
  }
}

// Magic Link wird nicht mehr zur Anmeldung genutzt.
// Stattdessen: Passwort-Reset-Link.
async function sendPasswordReset() {
  const client = getSupabaseClient();
  const email = document.getElementById("auth-email")?.value.trim();

  if (!email) {
    setAuthMessage("Bitte gib zuerst deine E-Mail-Adresse ein.", "err");
    return;
  }

  try {
    const { error } = await client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin
    });

    if (error) throw error;

    setAuthMessage("✅ Link zum Zurücksetzen wurde gesendet. Bitte prüfe dein E-Mail-Postfach.", "ok");
  } catch (error) {
    console.error(error);
    setAuthMessage("⚠️ Reset-Link konnte nicht gesendet werden:<br>" + escapeHtml(error.message), "err");
  }
}

// Kompatibilität: Falls alte Buttons noch sendMagicLink aufrufen,
// wird daraus ebenfalls Passwort-Reset.
async function sendMagicLink() {
  return sendPasswordReset();
}

// Startpasswort erzeugen
function generateStartPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!?#";
  let pw = "";
  for (let i = 0; i < 12; i++) pw += chars[Math.floor(Math.random() * chars.length)];
  const input = document.getElementById("new-user-password");
  if (input) input.value = pw;
  return pw;
}

function setUserCreateMessage(text, type = "ok") {
  const box = document.getElementById("user-create-message");
  if (!box) return;
  box.className = "user-create-message visible " + (type === "err" ? "err" : "ok");
  box.innerHTML = text;
}

async function createUserWithStartPassword() {
  const name = document.getElementById("new-user-name")?.value.trim();
  const email = document.getElementById("new-user-email")?.value.trim();
  const className = document.getElementById("new-user-class")?.value.trim();
  const role = document.getElementById("new-user-role")?.value || "student";
  let password = document.getElementById("new-user-password")?.value.trim();

  if (!name || !email) {
    setUserCreateMessage("Bitte Name und E-Mail-Adresse angeben.", "err");
    return;
  }

  if (!password) {
    password = generateStartPassword();
  }

  if (password.length < 8) {
    setUserCreateMessage("Das Startpasswort muss mindestens 8 Zeichen haben.", "err");
    return;
  }

  try {
    const token = await getCurrentAccessTokenForApi();

    const response = await fetch("/api/create-user", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + token
      },
      body: JSON.stringify({
        display_name: name,
        email,
        class_name: className,
        role,
        password
      })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || "Nutzer konnte nicht angelegt werden.");
    }

    LAST_CREATED_CREDENTIALS = {
      name,
      email,
      password,
      role,
      className
    };

    document.getElementById("generated-password-box")?.classList.add("visible");
    document.getElementById("generated-password-value").textContent =
      `Name: ${name}\nE-Mail: ${email}\nStartpasswort: ${password}`;

    setUserCreateMessage(`✅ Nutzer <strong>${escapeHtml(name)}</strong> wurde angelegt.`, "ok");

    document.getElementById("new-user-name").value = "";
    document.getElementById("new-user-email").value = "";
    document.getElementById("new-user-class").value = "";
    document.getElementById("new-user-password").value = "";
    document.getElementById("new-user-role").value = "student";

    appendMsg?.("toni", `✅ Zugang für <strong>${escapeHtml(name)}</strong> wurde angelegt.`, time?.() || "", "desktop");
  } catch (error) {
    console.error(error);
    setUserCreateMessage("⚠️ " + escapeHtml(error.message), "err");
  }
}

async function copyCreatedCredentials() {
  if (!LAST_CREATED_CREDENTIALS) return;

  const text =
`TONI-Zugang

Name: ${LAST_CREATED_CREDENTIALS.name}
E-Mail: ${LAST_CREATED_CREDENTIALS.email}
Startpasswort: ${LAST_CREATED_CREDENTIALS.password}

Bitte melde dich bei TONI an und lege danach ein eigenes Passwort fest.`;

  try {
    await navigator.clipboard.writeText(text);
    appendMsg?.("toni", "✅ Zugangsdaten wurden kopiert.", time?.() || "", "desktop");
  } catch {
    prompt("Zugangsdaten kopieren:", text);
  }
}

// Passwortwechsel nach erstem Login oder Reset
function shouldForcePasswordChange(profile) {
  return !!(profile && (profile.force_password_change === true || profile.password_set === false));
}

// ensureProfileForUser soll neue Felder laden.
const toniV6OriginalEnsureProfileForUser = window.ensureProfileForUser;
window.ensureProfileForUser = async function(user) {
  if (!user) return null;

  try {
    const rows = await supabaseRequest(`profiles?id=eq.${user.id}&select=id,display_name,email,class_name,role,password_set,force_password_change&limit=1`);
    if (rows && rows.length) return rows[0];
  } catch (error) {
    console.warn("Profil konnte nicht mit Auth-V6-Feldern gelesen werden:", error);
  }

  if (typeof toniV6OriginalEnsureProfileForUser === "function") {
    const profile = await toniV6OriginalEnsureProfileForUser(user);
    if (profile) {
      if (typeof profile.password_set === "undefined") profile.password_set = false;
      if (typeof profile.force_password_change === "undefined") profile.force_password_change = true;
    }
    return profile;
  }

  return null;
};

const toniV6OriginalApplyAuthProfile = window.applyAuthProfile;
window.applyAuthProfile = function(profile) {
  if (typeof toniV6OriginalApplyAuthProfile === "function") {
    toniV6OriginalApplyAuthProfile(profile);
  }

  if (shouldForcePasswordChange(profile)) {
    setTimeout(openPasswordRequiredModal, 500);
  }
};

// Passwort speichern: mark_my_password_set setzt password_set=true und force_password_change=false.
async function setPasswordAfterMagicLink() {
  const client = getSupabaseClient();
  const pw1 = document.getElementById("new-password").value;
  const pw2 = document.getElementById("new-password-repeat").value;

  if (!pw1 || !pw2) {
    setPasswordMessage("Bitte gib das Passwort zweimal ein.", "err");
    return;
  }
  if (pw1.length < 8) {
    setPasswordMessage("Das Passwort sollte mindestens 8 Zeichen haben.", "err");
    return;
  }
  if (pw1 !== pw2) {
    setPasswordMessage("Die Passwörter stimmen nicht überein.", "err");
    return;
  }

  try {
    const { error } = await client.auth.updateUser({ password: pw1 });
    if (error) throw error;

    await supabaseRequest("rpc/mark_my_password_set", {
      method: "POST",
      body: JSON.stringify({})
    });

    if (TONI_AUTH_PROFILE) {
      TONI_AUTH_PROFILE.password_set = true;
      TONI_AUTH_PROFILE.force_password_change = false;
    }

    setPasswordMessage("✅ Passwort gespeichert. Dein Konto ist vollständig eingerichtet.", "ok");

    setTimeout(() => {
      closePasswordRequiredModal();
      appendMsg?.("toni", "✅ Dein Passwort wurde gespeichert. Beim nächsten Login meldest du dich direkt mit Passwort an.", time?.() || "", "desktop");
    }, 900);
  } catch (error) {
    console.error(error);
    setPasswordMessage("⚠️ Passwort konnte nicht gespeichert werden:<br>" + escapeHtml(error.message), "err");
  }
}

// Nach Passwort-Reset-Link kommt Supabase als Recovery-Session zurück.
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const client = getSupabaseClient();
    if (!client) return;

    client.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        setTimeout(openPasswordRequiredModal, 300);
      }
    });
  }, 1200);
});

// Role UI erweitern: Nutzerverwaltung nur für Tutor/Admin
const toniV6OriginalApplyRoleUI = window.applyRoleUI;
window.applyRoleUI = function() {
  if (typeof toniV6OriginalApplyRoleUI === "function") toniV6OriginalApplyRoleUI();

  const panel = document.getElementById("user-admin-panel");
  if (panel) {
    const role = typeof getCurrentRole === "function" ? getCurrentRole() : localStorage.getItem("toni_role");
    panel.classList.toggle("visible", role === "tutor" || role === "admin");
  }
};

/* =========================================================
   TONI – AUTH V7 / SELBSTREGISTRIERUNG + GRUPPEN-QR
   ========================================================= */
function setRegistrationMessage(text,type="ok"){const b=document.getElementById("registration-message");if(!b)return;b.className="auth-message visible "+(type==="err"?"err":"ok");b.innerHTML=text;}
function openRegistrationRequiredModal(){document.getElementById("registration-required-modal")?.classList.add("open");setTimeout(()=>document.getElementById("reg-first-name")?.focus(),80);}
function closeRegistrationRequiredModal(){document.getElementById("registration-required-modal")?.classList.remove("open");}
function checkRegistrationPasswordStrength(){const pw=document.getElementById("reg-password")?.value||"";const o=document.getElementById("registration-password-strength");if(!o)return;if(pw.length>=8){o.className="password-strength ok";o.textContent="Passwortlänge ist ausreichend.";}else{o.className="password-strength err";o.textContent="Bitte mindestens 8 Zeichen verwenden.";}}
function resetAuthForm(){const e=document.getElementById("auth-email"),p=document.getElementById("auth-password"),a=document.getElementById("auth-password-area"),btn=document.getElementById("auth-continue-btn"),n=document.getElementById("auth-login-note");if(p)p.value="";if(a)a.classList.remove("visible");if(btn)btn.style.display="";if(e){e.disabled=false;e.focus();}if(n)n.textContent="Existiert deine E-Mail bereits, meldest du dich mit Passwort an. Ist sie neu, erhältst du eine Verifizierungs-Mail. Danach gibst du deine personenbezogenen Daten ein und legst ein Passwort fest.";const box=document.getElementById("auth-message");if(box)box.className="auth-message";}
async function checkProfileExistsByEmail(email){try{const r=await supabaseRequest("rpc/check_profile_exists_by_email",{method:"POST",body:JSON.stringify({p_email:email})});return !!r?.exists;}catch(e){console.warn(e);return false;}}
function showPasswordLogin(email){const e=document.getElementById("auth-email"),a=document.getElementById("auth-password-area"),btn=document.getElementById("auth-continue-btn"),n=document.getElementById("auth-login-note");if(e)e.disabled=true;if(a)a.classList.add("visible");if(btn)btn.style.display="none";if(n)n.innerHTML=`Zu <strong>${escapeHtml(email)}</strong> existiert bereits ein vollständiger Zugang. Bitte melde dich mit Passwort an.`;setAuthMessage("Profil gefunden. Bitte Passwort eingeben.","ok");setTimeout(()=>document.getElementById("auth-password")?.focus(),80);}
async function continueLogin(){const email=document.getElementById("auth-email")?.value.trim();if(!email){setAuthMessage("Bitte gib eine E-Mail-Adresse ein.","err");return;}const btn=document.getElementById("auth-continue-btn"),note=document.getElementById("auth-login-note");try{if(btn){btn.disabled=true;btn.textContent="Prüfe E-Mail…";}const exists=await checkProfileExistsByEmail(email);if(exists){showPasswordLogin(email);return;}if(note)note.innerHTML=`Zu <strong>${escapeHtml(email)}</strong> existiert noch kein vollständiger Zugang. TONI sendet eine Verifizierungs-Mail.`;await sendVerificationMail(email);}catch(e){console.error(e);setAuthMessage("⚠️ Die E-Mail konnte nicht geprüft werden:<br>"+escapeHtml(e.message),"err");}finally{if(btn){btn.disabled=false;btn.textContent="Weiter";}}}
async function sendVerificationMail(email){const client=getSupabaseClient();try{const {error}=await client.auth.signInWithOtp({email,options:{emailRedirectTo:window.location.href}});if(error)throw error;setAuthMessage("✅ Verifizierungs-Mail wurde gesendet. Bitte öffne den Link. Danach schließt du deine Registrierung ab.","ok");}catch(e){console.error(e);setAuthMessage("⚠️ Verifizierungs-Mail konnte nicht gesendet werden:<br>"+escapeHtml(e.message),"err");}}
async function signInWithPassword(){const client=getSupabaseClient();const email=document.getElementById("auth-email")?.value.trim();const password=document.getElementById("auth-password")?.value;if(!email||!password){setAuthMessage("Bitte gib E-Mail-Adresse und Passwort ein.","err");return;}try{const {error}=await client.auth.signInWithPassword({email,password});if(error)throw error;setAuthMessage("✅ Anmeldung erfolgreich.","ok");closeAuthModal();}catch(e){console.error(e);setAuthMessage("⚠️ Anmeldung fehlgeschlagen:<br>"+escapeHtml(e.message)+"<br><br>Falls du dein Passwort vergessen hast, nutze „Passwort vergessen?“.","err");}}
async function sendPasswordReset(){const client=getSupabaseClient();const email=document.getElementById("auth-email")?.value.trim();if(!email){setAuthMessage("Bitte gib zuerst deine E-Mail-Adresse ein.","err");return;}try{const {error}=await client.auth.resetPasswordForEmail(email,{redirectTo:window.location.href});if(error)throw error;setAuthMessage("✅ Link zum Zurücksetzen wurde gesendet. Bitte prüfe dein E-Mail-Postfach.","ok");}catch(e){console.error(e);setAuthMessage("⚠️ Reset-Link konnte nicht gesendet werden:<br>"+escapeHtml(e.message),"err");}}
async function sendMagicLink(){const email=document.getElementById("auth-email")?.value.trim();if(!email){setAuthMessage("Bitte gib zuerst deine E-Mail-Adresse ein.","err");return;}return sendVerificationMail(email);}
function shouldCompleteRegistration(profile){return !!(profile&&profile.profile_complete===false);}
function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(label + " dauert zu lange. Bitte Verbindung prüfen und erneut versuchen.")), ms))
  ]);
}

async function completeSelfRegistration(){
  const client=getSupabaseClient();
  const first=document.getElementById("reg-first-name")?.value.trim();
  const last=document.getElementById("reg-last-name")?.value.trim();
  const cls=document.getElementById("reg-class-name")?.value.trim();
  const pw1=document.getElementById("reg-password")?.value||"";
  const pw2=document.getElementById("reg-password-repeat")?.value||"";
  const btn=[...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Registrierung abschließen" || b.textContent.trim()==="Speichere Registrierung…");

  if(!first||!last){setRegistrationMessage("Bitte gib Vorname und Nachname ein.","err");return;}
  if(pw1.length<8){setRegistrationMessage("Das Passwort muss mindestens 8 Zeichen haben.","err");return;}
  if(pw1!==pw2){setRegistrationMessage("Die Passwörter stimmen nicht überein.","err");return;}

  try{
    if(btn){btn.disabled=true;btn.textContent="Speichere Registrierung…";}
    setRegistrationMessage("1/3 Passwort wird gespeichert …","ok");

    const updateResult=await withTimeout(client.auth.updateUser({password:pw1}),15000,"Passwort speichern");
    if(updateResult.error) throw updateResult.error;

    setRegistrationMessage("2/3 Profil wird gespeichert …","ok");

    const sessionResult=await withTimeout(client.auth.getSession(),10000,"Session laden");
    const userId=sessionResult?.data?.session?.user?.id;
    if(!userId) throw new Error("Keine aktive Session gefunden. Bitte Seite neu laden und den Bestätigungslink erneut öffnen.");

    const displayName=(first+" "+last).trim();

    try{
      await withTimeout(
        supabaseRequest(`profiles?id=eq.${userId}`,{
          method:"PATCH",
          headers:{"Prefer":"return=representation"},
          body:JSON.stringify({
            first_name:first,
            last_name:last,
            display_name:displayName,
            class_name:cls||"",
            password_set:true,
            profile_complete:true,
            force_password_change:false,
            updated_at:new Date().toISOString()
          })
        }),
        15000,
        "Profil speichern"
      );
    }catch(patchError){
      console.warn("Direktes Profil-Update fehlgeschlagen, versuche RPC:",patchError);
      await withTimeout(
        supabaseRequest("rpc/complete_my_profile",{
          method:"POST",
          body:JSON.stringify({p_first_name:first,p_last_name:last,p_class_name:cls||""})
        }),
        15000,
        "Profil per RPC speichern"
      );
    }

    setRegistrationMessage("3/3 Registrierung abgeschlossen …","ok");

    window.TONI_SUPPRESS_REGISTRATION_MODAL=true;
    TONI_AUTH_PROFILE={
      ...(TONI_AUTH_PROFILE||{}),
      id:userId,
      first_name:first,
      last_name:last,
      display_name:displayName,
      class_name:cls||"",
      password_set:true,
      profile_complete:true,
      force_password_change:false,
      role:TONI_AUTH_PROFILE?.role||localStorage.getItem("toni_role")||"student"
    };

    localStorage.setItem("toni_profile_id",userId);
    localStorage.setItem("toni_role",TONI_AUTH_PROFILE.role||"student");
    window.TONI_ACTIVE_PROFILE_ID=userId;
    if(typeof applyRoleUI==="function")applyRoleUI();

    setTimeout(()=>{
      closeRegistrationRequiredModal();
      window.TONI_SUPPRESS_REGISTRATION_MODAL=false;
      handleJoinLinkAfterLogin?.();
      appendMsg?.("toni","✅ Deine Registrierung ist abgeschlossen.",time?.()||"","desktop");
    },800);

  }catch(e){
    console.error(e);
    setRegistrationMessage("⚠️ Registrierung konnte nicht abgeschlossen werden:<br>"+escapeHtml(e.message)+"<br><br>Bitte SQL-Datei V7.2 ausführen und erneut versuchen.","err");
  }finally{
    if(btn){btn.disabled=false;btn.textContent="Registrierung abschließen";}
  }
}

const toniV7OriginalEnsureProfileForUser=window.ensureProfileForUser;
window.ensureProfileForUser=async function(user){if(!user)return null;try{const rows=await supabaseRequest(`profiles?id=eq.${user.id}&select=id,display_name,email,class_name,role,password_set,profile_complete,force_password_change,first_name,last_name&limit=1`);if(rows&&rows.length)return rows[0];}catch(e){console.warn(e);}if(typeof toniV7OriginalEnsureProfileForUser==="function"){const p=await toniV7OriginalEnsureProfileForUser(user);if(p){if(typeof p.profile_complete==="undefined")p.profile_complete=false;if(typeof p.password_set==="undefined")p.password_set=false;}return p;}return null;};
const toniV7OriginalApplyAuthProfile=window.applyAuthProfile;
window.applyAuthProfile=function(profile){if(typeof toniV7OriginalApplyAuthProfile==="function")toniV7OriginalApplyAuthProfile(profile);if(!window.TONI_SUPPRESS_REGISTRATION_MODAL && shouldCompleteRegistration(profile))setTimeout(openRegistrationRequiredModal,500);};
window.addEventListener("DOMContentLoaded",()=>setTimeout(()=>{const client=getSupabaseClient();if(!client)return;client.auth.onAuthStateChange((event)=>{if(event==="PASSWORD_RECOVERY")setTimeout(openPasswordRequiredModal,300);});},1200));

/* =========================================================
   TONI – AUTH V7.3 / FIX: E-Mail-Prüfung bleibt hängen
   ========================================================= */

function toniTimeout(ms, label) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(label + " dauert zu lange.")), ms)
  );
}

async function toniFetchJsonWithTimeout(url, options, ms, label) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    const text = await response.text();

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return text ? JSON.parse(text) : null;
  } finally {
    clearTimeout(timer);
  }
}

// Direkte Prüfung ohne RPC-Hänger.
// Es wird nur gezählt, ob ein vollständiges Profil existiert.
async function checkProfileExistsByEmail(email) {
  const cleanEmail = String(email || "").trim().toLowerCase();

  if (!cleanEmail) return false;

  try {
    const url =
      `${window.SUPABASE_URL}/rest/v1/profiles` +
      `?email=eq.${encodeURIComponent(cleanEmail)}` +
      `&profile_complete=eq.true` +
      `&is_active=eq.true` +
      `&select=id` +
      `&limit=1`;

    const rows = await toniFetchJsonWithTimeout(
      url,
      {
        method: "GET",
        headers: {
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + window.SUPABASE_ANON_KEY,
          "Content-Type": "application/json"
        }
      },
      8000,
      "E-Mail-Prüfung"
    );

    return Array.isArray(rows) && rows.length > 0;
  } catch (error) {
    console.warn("Direkte E-Mail-Prüfung fehlgeschlagen:", error);

    // Fallback über RPC, ebenfalls mit Timeout
    try {
      const result = await Promise.race([
        supabaseRequest("rpc/check_profile_exists_by_email", {
          method: "POST",
          body: JSON.stringify({ p_email: cleanEmail })
        }),
        toniTimeout(8000, "E-Mail-Prüfung über Supabase")
      ]);

      return !!result?.exists;
    } catch (rpcError) {
      console.error("Auch RPC-Prüfung fehlgeschlagen:", rpcError);
      throw new Error(
        "Die E-Mail-Adresse konnte nicht geprüft werden. Bitte prüfe die Supabase-Verbindung und ob die SQL-Datei V7.3 ausgeführt wurde."
      );
    }
  }
}

// Login-spezifische Existenzprüfung: Existiert zu dieser E-Mail ein AKTIVER Account,
// mit dem man sich grundsätzlich einloggen kann? Bewusst OHNE profile_complete-Kriterium
// (anders als checkProfileExistsByEmail): In der DB existieren aktive Accounts mit
// profile_complete=false, die ein Passwort haben und einlogg-fähig sind.
// WICHTIG: Nutzt die SECURITY-DEFINER-RPC check_login_account_exists, weil ein direkter
// REST-Select auf profiles an der RLS scheitert (Anon-Key sieht fremde Profile nicht) –
// das hätte sonst ALLE normalen Accounts ausgesperrt.
async function checkLoginAccountExists(email) {
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail) return false;
  try {
    const result = await supabaseRequest("rpc/check_login_account_exists", {
      method: "POST",
      body: JSON.stringify({ p_email: cleanEmail })
    });
    return !!result?.exists;
  } catch (error) {
    console.warn("Login-E-Mail-Prüfung fehlgeschlagen, lasse Login-Versuch zu:", error);
    // Im Zweifel NICHT aussperren: true zurückgeben, damit der normale Passwort-Login
    // (mit seiner eigenen Fehlermeldung) greifen kann.
    return true;
  }
}
window.checkLoginAccountExists = checkLoginAccountExists;

// Weiter-Button mit Timeout, Rücksetzung des Button-Texts und klaren Fehlermeldungen.
async function continueLogin() {
  const emailEl = document.getElementById("auth-email");
  const email = emailEl?.value.trim();

  if (!email) {
    setAuthMessage("Bitte gib eine E-Mail-Adresse ein.", "err");
    return;
  }

  const btn = document.getElementById("auth-continue-btn");
  const note = document.getElementById("auth-login-note");

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Prüfe E-Mail…";
    }

    setAuthMessage("E-Mail wird geprüft …", "ok");

    const exists = await Promise.race([
      checkProfileExistsByEmail(email),
      toniTimeout(10000, "E-Mail-Prüfung")
    ]);

    if (exists) {
      showPasswordLogin(email);
      return;
    }

    if (note) {
      note.innerHTML =
        `Zu <strong>${escapeHtml(email)}</strong> existiert noch kein vollständiger Zugang. ` +
        `TONI sendet eine Verifizierungs-Mail.`;
    }

    setAuthMessage("E-Mail ist noch nicht vollständig registriert. Verifizierungs-Mail wird vorbereitet …", "ok");
    await sendVerificationMail(email);
  } catch (error) {
    console.error(error);
    setAuthMessage(
      "⚠️ Die E-Mail-Prüfung konnte nicht abgeschlossen werden:<br>" +
      escapeHtml(error.message) +
      "<br><br>Bitte lade die Seite neu. Wenn der Fehler bleibt: SQL V7.3 in Supabase ausführen.",
      "err"
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Weiter";
    }
  }
}

/* =========================================================
   TONI – AUTH V7.4 / FIX: Nach Verifizierungslink Registrierung öffnen
   ========================================================= */

async function toniGetSessionWithRetries(attempts = 6, delayMs = 600) {
  const client = getSupabaseClient();
  for (let i = 0; i < attempts; i++) {
    const { data, error } = await client.auth.getSession();
    if (error) console.warn("Session-Prüfung:", error);
    if (data?.session?.user) return data.session;
    await new Promise(resolve => setTimeout(resolve, delayMs));
  }
  return null;
}

async function toniLoadOrCreateProfileForSession(session) {
  if (!session?.user) return null;
  const user = session.user;

  try {
    const rows = await supabaseRequest(
      `profiles?id=eq.${user.id}&select=id,display_name,email,class_name,role,password_set,profile_complete,force_password_change,first_name,last_name&limit=1`
    );

    if (rows && rows[0]) return rows[0];
  } catch (error) {
    console.warn("Profil konnte nach Redirect nicht gelesen werden:", error);
  }

  // Falls der Trigger noch kein Profil angelegt hat, erstellt die App ein unvollständiges Eigenprofil.
  try {
    const fallbackName = user.email ? user.email.split("@")[0] : "Neuer Nutzer";
    const inserted = await supabaseRequest("profiles?on_conflict=id", {
      method: "POST",
      headers: {
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([{
        id: user.id,
        display_name: fallbackName,
        email: user.email,
        class_name: "",
        role: "student",
        password_set: false,
        profile_complete: false,
        force_password_change: true,
        is_active: true
      }])
    });

    if (inserted && inserted[0]) return inserted[0];
  } catch (insertError) {
    console.warn("Unvollständiges Profil konnte nicht erstellt werden:", insertError);
  }

  return {
    id: user.id,
    display_name: user.email ? user.email.split("@")[0] : "Neuer Nutzer",
    email: user.email,
    class_name: "",
    role: "student",
    password_set: false,
    profile_complete: false,
    force_password_change: true
  };
}

function toniApplyProfileLocally(profile) {
  if (!profile) return;

  TONI_AUTH_PROFILE = profile;
  localStorage.setItem("toni_profile_id", profile.id);
  localStorage.setItem("toni_role", profile.role || "student");
  window.TONI_ACTIVE_PROFILE_ID = profile.id;

  const name = profile.display_name || profile.email || "Nutzer";

  const greeting = document.querySelector(".topbar-greeting h2");
  if (greeting) greeting.innerHTML = `Hallo ${escapeHtml(String(name).split(" ")[0])}! 👋`;

  const sub = document.querySelector(".topbar-greeting p");
  if (sub) {
    const roleLabel = (typeof ROLE_CONFIG !== "undefined" && ROLE_CONFIG[profile.role]) ? ROLE_CONFIG[profile.role].label : profile.role;
    sub.textContent = `${roleLabel || "student"}${profile.class_name ? " · " + profile.class_name : ""}`;
  }

  const authName = document.getElementById("auth-user-name");
  const authRole = document.getElementById("auth-user-role");
  const loginBtn = document.getElementById("auth-login-btn");
  const logoutBtn = document.getElementById("auth-logout-btn");

  if (authName) authName.textContent = name;
  if (authRole) authRole.textContent = `${profile.role || "student"}${profile.class_name ? " · " + profile.class_name : ""}`;
  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "";

  if (typeof applyRoleUI === "function") applyRoleUI();
}

async function toniOpenRegistrationIfNeededAfterRedirect() {
  try {
    const session = await toniGetSessionWithRetries();

    if (!session?.user) return;

    const profile = await toniLoadOrCreateProfileForSession(session);
    toniApplyProfileLocally(profile);

    // Entscheidend: Nach Verifizierungslink immer prüfen, ob das Profil vollständig ist.
    if (profile && profile.profile_complete !== true) {
      window.TONI_SUPPRESS_REGISTRATION_MODAL = false;
      setTimeout(() => {
        openRegistrationRequiredModal();

        const msg = document.getElementById("registration-message");
        if (msg) {
          msg.className = "auth-message visible ok";
          msg.innerHTML = "✅ E-Mail-Adresse bestätigt. Bitte schließe nun deine Registrierung ab.";
        }
      }, 300);
    } else {
      handleJoinLinkAfterLogin?.();
    }
  } catch (error) {
    console.error("Registrierungsprüfung nach Redirect fehlgeschlagen:", error);
  }
}

// Auch Auth-Events explizit abfangen.
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const client = getSupabaseClient();
    if (!client) return;

    client.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION") {
        if (session?.user) {
          const profile = await toniLoadOrCreateProfileForSession(session);
          toniApplyProfileLocally(profile);
          if (profile && profile.profile_complete !== true) {
            setTimeout(openRegistrationRequiredModal, 250);
          }
        }
      }
    });

    toniOpenRegistrationIfNeededAfterRedirect();
  }, 1400);
});

/* =========================================================
   TONI – AUTH V7.6 / FIX: Passwort-Dialog schließt nach Reset
   ========================================================= */

function toniClosePasswordModalHard() {
  const modal = document.getElementById("password-required-modal");
  if (modal) {
    modal.classList.remove("open");
    modal.style.display = "";
  }

  const pw1 = document.getElementById("new-password");
  const pw2 = document.getElementById("new-password-repeat");
  if (pw1) pw1.value = "";
  if (pw2) pw2.value = "";

  const msg = document.getElementById("password-required-message");
  if (msg) msg.className = "auth-message";
}

function toniPromiseTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(label + " dauert zu lange.")), ms)
    )
  ]);
}

// Override: Passwort speichern und Modal zuverlässig schließen.
async function setPasswordAfterMagicLink() {
  const client = getSupabaseClient();
  const pw1 = document.getElementById("new-password").value;
  const pw2 = document.getElementById("new-password-repeat").value;

  const btn = [...document.querySelectorAll("#password-required-modal button")]
    .find(b => b.textContent.includes("Passwort speichern"));

  if (!pw1 || !pw2) {
    setPasswordMessage("Bitte gib das Passwort zweimal ein.", "err");
    return;
  }

  if (pw1.length < 8) {
    setPasswordMessage("Das Passwort sollte mindestens 8 Zeichen haben.", "err");
    return;
  }

  if (pw1 !== pw2) {
    setPasswordMessage("Die Passwörter stimmen nicht überein.", "err");
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Passwort wird gespeichert…";
    }

    setPasswordMessage("Passwort wird gespeichert …", "ok");

    const result = await toniPromiseTimeout(
      client.auth.updateUser({ password: pw1 }),
      15000,
      "Passwort speichern"
    );

    if (result.error) throw result.error;

    let currentProfile = null;

    try {
      await toniPromiseTimeout(
        supabaseRequest("rpc/mark_my_password_set", {
          method: "POST",
          body: JSON.stringify({})
        }),
        10000,
        "Profilstatus speichern"
      );
    } catch (rpcError) {
      console.warn("mark_my_password_set RPC fehlgeschlagen, versuche PATCH:", rpcError);

      const { data } = await client.auth.getSession();
      const userId = data?.session?.user?.id;

      if (userId) {
        await toniPromiseTimeout(
          supabaseRequest(`profiles?id=eq.${userId}`, {
            method: "PATCH",
            headers: { "Prefer": "return=representation" },
            body: JSON.stringify({
              password_set: true,
              force_password_change: false,
              updated_at: new Date().toISOString()
            })
          }),
          10000,
          "Profilstatus per PATCH speichern"
        );
      }
    }

    const { data } = await client.auth.getSession();

    if (typeof toniLoadProfileForCurrentSessionV75 === "function") {
      currentProfile = await toniLoadProfileForCurrentSessionV75(data?.session);
    }

    if (currentProfile) {
      TONI_AUTH_PROFILE = currentProfile;
    }

    if (TONI_AUTH_PROFILE) {
      TONI_AUTH_PROFILE.password_set = true;
      TONI_AUTH_PROFILE.force_password_change = false;
    }

    setPasswordMessage("✅ Passwort gespeichert.", "ok");

    setTimeout(() => {
      toniClosePasswordModalHard();

      if (currentProfile && currentProfile.profile_complete !== true) {
        setRecoveryBanner?.("Passwort gespeichert. Bitte vervollständige jetzt dein Profil.");
        window.TONI_SUPPRESS_REGISTRATION_MODAL = false;
        openRegistrationRequiredModal?.();
      } else {
        setRecoveryBanner?.("✅ Passwort wurde gespeichert. Du kannst TONI jetzt weiter nutzen.");
        appendMsg?.("toni", "✅ Dein neues Passwort wurde gespeichert.", time?.() || "", "desktop");
        handleJoinLinkAfterLogin?.();
      }
    }, 500);

  } catch (error) {
    console.error(error);
    setPasswordMessage("⚠️ Passwort konnte nicht gespeichert werden:<br>" + escapeHtml(error.message), "err");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Passwort speichern und fortfahren";
    }
  }
}

/* =========================================================
   TONI – AUTH V7.7 / FIX: Registrierung nach Verifizierungslink erzwingen
   ========================================================= */
window.TONI_REGISTRATION_CHECK_RUNNING=false;

async function toniV77GetSessionWithRetry(){
  const client=getSupabaseClient();
  for(let i=0;i<8;i++){
    try{
      const {data}=await client.auth.getSession();
      if(data?.session?.user)return data.session;
    }catch(e){console.warn("Session-Retry fehlgeschlagen:",e);}
    await new Promise(r=>setTimeout(r,500));
  }
  return null;
}

async function toniV77FetchOrCreateProfile(session){
  if(!session?.user)return null;
  const user=session.user;

  try{
    const rows=await supabaseRequest(`profiles?id=eq.${user.id}&select=id,display_name,email,class_name,role,password_set,profile_complete,force_password_change,first_name,last_name&limit=1`);
    if(rows&&rows[0])return rows[0];
  }catch(e){console.warn("Profil konnte nicht gelesen werden:",e);}

  try{
    const fallbackName=user.email?user.email.split("@")[0]:"Neuer Nutzer";
    const inserted=await supabaseRequest("profiles?on_conflict=id",{
      method:"POST",
      headers:{"Prefer":"resolution=merge-duplicates,return=representation"},
      body:JSON.stringify([{
        id:user.id,
        display_name:fallbackName,
        email:user.email,
        class_name:"",
        role:"student",
        password_set:false,
        profile_complete:false,
        force_password_change:true,
        is_active:true
      }])
    });
    if(inserted&&inserted[0])return inserted[0];
  }catch(e){console.warn("Unvollständiges Profil konnte nicht erstellt werden:",e);}

  return {
    id:user.id,
    display_name:user.email?user.email.split("@")[0]:"Neuer Nutzer",
    email:user.email,
    class_name:"",
    role:"student",
    password_set:false,
    profile_complete:false,
    force_password_change:true
  };
}

function toniV77ApplyProfile(profile){
  if(!profile)return;
  TONI_AUTH_PROFILE=profile;
  localStorage.setItem("toni_profile_id",profile.id);
  localStorage.setItem("toni_role",profile.role||"student");
  window.TONI_ACTIVE_PROFILE_ID=profile.id;

  const name=profile.display_name||profile.email||"Nutzer";
  const authName=document.getElementById("auth-user-name");
  const authRole=document.getElementById("auth-user-role");
  const loginBtn=document.getElementById("auth-login-btn");
  const logoutBtn=document.getElementById("auth-logout-btn");

  if(authName)authName.textContent=name;
  if(authRole)authRole.textContent=`${profile.role||"student"}${profile.class_name?" · "+profile.class_name:""}`;
  if(loginBtn)loginBtn.style.display="none";
  if(logoutBtn)logoutBtn.style.display="";

  const greeting=document.querySelector(".topbar-greeting h2");
  if(greeting)greeting.innerHTML=`Hallo ${escapeHtml(String(name).split(" ")[0])}! 👋`;

  if(typeof applyRoleUI==="function")applyRoleUI();
}

async function toniV77CheckAndOpenRegistration(reason="initial"){
  if(window.TONI_REGISTRATION_CHECK_RUNNING)return;
  window.TONI_REGISTRATION_CHECK_RUNNING=true;

  try{
    const session=await toniV77GetSessionWithRetry();
    if(!session?.user)return;

    const profile=await toniV77FetchOrCreateProfile(session);
    toniV77ApplyProfile(profile);

    if(profile && profile.profile_complete!==true){
      window.TONI_SUPPRESS_REGISTRATION_MODAL=false;

      if(typeof toniClosePasswordModalHard==="function"){
        toniClosePasswordModalHard();
      }

      setTimeout(()=>{
        openRegistrationRequiredModal();

        const msg=document.getElementById("registration-message");
        if(msg){
          msg.className="auth-message visible ok";
          msg.innerHTML="✅ Deine E-Mail-Adresse wurde bestätigt. Bitte vervollständige jetzt dein Profil und lege ein Passwort fest.";
        }

        console.log("TONI V7.7: Registrierung geöffnet nach",reason,profile);
      },350);
    }
  }catch(e){
    console.error("TONI V7.7 Registrierungsprüfung fehlgeschlagen:",e);
  }finally{
    window.TONI_REGISTRATION_CHECK_RUNNING=false;
  }
}

window.addEventListener("DOMContentLoaded",()=>{
  setTimeout(()=>toniV77CheckAndOpenRegistration("DOMContentLoaded-1"),900);
  setTimeout(()=>toniV77CheckAndOpenRegistration("DOMContentLoaded-2"),2200);
  setTimeout(()=>toniV77CheckAndOpenRegistration("DOMContentLoaded-3"),4200);

  setTimeout(()=>{
    const client=getSupabaseClient();
    if(!client)return;

    client.auth.onAuthStateChange(async(event,session)=>{
      if(event==="SIGNED_IN"||event==="INITIAL_SESSION"||event==="TOKEN_REFRESHED"){
        setTimeout(()=>toniV77CheckAndOpenRegistration("auth-"+event),250);
      }
    });
  },500);
});

/* =========================================================
   TONI – AUTH V8 / STABILISIERTER LOGIN- UND REGISTRIERUNGSFLOW
   =========================================================
   Ziele:
   1. Admin-Login aktualisiert Dashboard zuverlässig.
   2. Nach Verifizierungslink wird unvollständiges Profil zuverlässig erkannt.
   3. Registrierung öffnet sich automatisch, falls profile_complete=false.
   4. Nach Profilabschluss schließt Modal und Dashboard wird aktualisiert.
   ========================================================= */

window.TONI_V8_RUNNING = false;
window.TONI_V8_LAST_SESSION_ID = null;

function toniV8Sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toniV8Url() {
  return new URL(window.location.href);
}

function toniV8HasAuthReturnParams() {
  const url = toniV8Url();
  const hash = window.location.hash || "";
  return (
    url.searchParams.has("code") ||
    url.searchParams.has("token_hash") ||
    url.searchParams.has("type") ||
    hash.includes("access_token=") ||
    hash.includes("refresh_token=") ||
    hash.includes("type=")
  );
}

async function toniV8ExchangeCodeIfPresent() {
  const client = getSupabaseClient();
  const url = toniV8Url();
  const code = url.searchParams.get("code");

  if (!client || !code) return;

  try {
    const { error } = await client.auth.exchangeCodeForSession(code);
    if (error) console.warn("TONI V8 exchangeCodeForSession:", error);

    // code aus URL entfernen, join-Parameter aber behalten
    url.searchParams.delete("code");
    url.searchParams.delete("type");
    window.history.replaceState({}, "", url.toString());
  } catch (error) {
    console.warn("TONI V8 Code-Austausch fehlgeschlagen:", error);
  }
}

async function toniV8GetSession(retries = 10) {
  const client = getSupabaseClient();

  await toniV8ExchangeCodeIfPresent();

  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await client.auth.getSession();
      if (error) console.warn("TONI V8 getSession:", error);
      if (data?.session?.user) return data.session;
    } catch (error) {
      console.warn("TONI V8 Session Retry:", error);
    }
    await toniV8Sleep(450);
  }

  return null;
}

async function toniV8LoadOrCreateProfile(session) {
  if (!session?.user) return null;

  const user = session.user;

  try {
    const rows = await supabaseRequest(
      `profiles?id=eq.${user.id}&select=id,display_name,email,class_name,role,password_set,profile_complete,force_password_change,first_name,last_name,is_active&limit=1`
    );

    if (rows && rows[0]) return rows[0];
  } catch (error) {
    console.warn("TONI V8 Profil lesen fehlgeschlagen:", error);
  }

  // Fallback: Profil unvollständig anlegen, falls Trigger noch nicht geschrieben hat.
  try {
    const fallbackName = user.email ? user.email.split("@")[0] : "Neuer Nutzer";

    const inserted = await supabaseRequest("profiles?on_conflict=id", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{
        id: user.id,
        display_name: fallbackName,
        email: user.email,
        class_name: "",
        role: "student",
        password_set: false,
        profile_complete: false,
        force_password_change: true,
        is_active: true
      }])
    });

    if (inserted && inserted[0]) return inserted[0];
  } catch (error) {
    console.warn("TONI V8 Profil-Fallback-Anlage fehlgeschlagen:", error);
  }

  return {
    id: user.id,
    display_name: user.email ? user.email.split("@")[0] : "Neuer Nutzer",
    email: user.email,
    class_name: "",
    role: "student",
    password_set: false,
    profile_complete: false,
    force_password_change: true,
    is_active: true
  };
}

function toniV8SetAuthHeader(profile) {
  if (!profile) return;

  const name = profile.display_name || profile.email || "Angemeldet";
  const role = profile.role || "student";

  const authName = document.getElementById("auth-user-name");
  const authRole = document.getElementById("auth-user-role");
  const loginBtn = document.getElementById("auth-login-btn");
  const logoutBtn = document.getElementById("auth-logout-btn");

  if (authName) authName.textContent = name;
  if (authRole) authRole.textContent = `${role}${profile.class_name ? " · " + profile.class_name : ""}`;
  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "";

  const greeting = document.querySelector(".topbar-greeting h2");
  if (greeting) greeting.innerHTML = `Hallo ${escapeHtml(String(name).split(" ")[0])}! 👋`;

  const sub = document.querySelector(".topbar-greeting p");
  if (sub) {
    const label = (typeof ROLE_CONFIG !== "undefined" && ROLE_CONFIG[role]) ? ROLE_CONFIG[role].label : role;
    sub.textContent = `${label || role}${profile.class_name ? " · " + profile.class_name : ""}`;
  }

  const roleText = document.getElementById("role-info-text");
  if (roleText) {
    const cfg = (typeof ROLE_CONFIG !== "undefined" && ROLE_CONFIG[role]) ? ROLE_CONFIG[role] : null;
    roleText.textContent = `${cfg ? cfg.text : "Angemeldet."} Aktives Profil: ${name}.`;
  }
}

function toniV8ApplyRoleClasses(profile) {
  const role = profile?.role || localStorage.getItem("toni_role") || "student";

  document.body.classList.remove("role-student", "role-tutor", "role-admin");
  document.body.classList.add("role-" + role);

  // Basissichtbarkeit hart setzen, damit alte applyRoleUI-Konflikte überschrieben werden.
  document.querySelectorAll(".student-only").forEach(el => {
    el.style.display = role === "student" ? "" : "none";
  });
  document.querySelectorAll(".tutor-only").forEach(el => {
    el.style.display = (role === "tutor" || role === "admin") ? "" : "none";
  });
  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = role === "admin" ? "" : "none";
  });

  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) {
    adminPanel.style.display = role === "admin" ? "" : "none";
    adminPanel.classList.toggle("visible", role === "admin");
  }

  const groupPanel = document.getElementById("group-panel");
  if (groupPanel) {
    const show = role === "tutor" || role === "admin";
    groupPanel.style.display = show ? "" : "none";
    groupPanel.classList.toggle("visible", show);
  }

  const userAdminPanel = document.getElementById("user-admin-panel");
  if (userAdminPanel) {
    // In V7/V8 ist Selbstregistrierung der Normalweg; Panel bleibt ausgeblendet.
    userAdminPanel.style.display = "none";
    userAdminPanel.classList.remove("visible");
  }

  // Bestehende App-Logik dennoch aufrufen.
  try {
    if (typeof applyRoleUI === "function") applyRoleUI();
  } catch (error) {
    console.warn("TONI V8 applyRoleUI:", error);
  }

  // Nach applyRoleUI noch einmal überschreiben, weil ältere Funktionen Panels wieder verstecken können.
  if (adminPanel) {
    adminPanel.style.display = role === "admin" ? "" : "none";
    adminPanel.classList.toggle("visible", role === "admin");
  }
  if (groupPanel) {
    const show = role === "tutor" || role === "admin";
    groupPanel.style.display = show ? "" : "none";
    groupPanel.classList.toggle("visible", show);
  }
}

function toniV8ApplyProfile(profile) {
  if (!profile) return;

  TONI_AUTH_PROFILE = profile;
  localStorage.setItem("toni_profile_id", profile.id);
  localStorage.setItem("toni_role", profile.role || "student");
  window.TONI_ACTIVE_PROFILE_ID = profile.id;

  toniV8SetAuthHeader(profile);
  toniV8ApplyRoleClasses(profile);

  if (typeof STATE !== "undefined") {
    STATE.user = STATE.user || {};
    STATE.user.name = profile.display_name || STATE.user.name;
    STATE.user.class = profile.class_name || "";
    try { saveState?.(STATE); } catch {}
  }
}

function toniV8OpenRegistration(profile, reason) {
  if (!profile || profile.profile_complete === true) return;

  window.TONI_SUPPRESS_REGISTRATION_MODAL = false;

  if (typeof toniClosePasswordModalHard === "function") {
    toniClosePasswordModalHard();
  }

  setTimeout(() => {
    openRegistrationRequiredModal();

    const msg = document.getElementById("registration-message");
    if (msg) {
      msg.className = "auth-message visible ok";
      msg.innerHTML = "✅ Deine E-Mail-Adresse wurde bestätigt. Bitte vervollständige jetzt dein Profil und lege ein Passwort fest.";
    }

    console.log("TONI V8: Registrierung geöffnet:", reason, profile);
  }, 250);
}

async function toniV8RefreshAuthState(reason = "manual") {
  if (window.TONI_V8_RUNNING) return;
  window.TONI_V8_RUNNING = true;

  try {
    const session = await toniV8GetSession();

    if (!session?.user) {
      return;
    }

    window.TONI_V8_LAST_SESSION_ID = session.user.id;

    const profile = await toniV8LoadOrCreateProfile(session);
    toniV8ApplyProfile(profile);

    if (profile && profile.profile_complete !== true) {
      toniV8OpenRegistration(profile, reason);
    } else {
      // Vollständige Profile: Modale schließen, Dashboard aktualisieren.
      closeAuthModal?.();
      closeRegistrationRequiredModal?.();
      if (typeof toniClosePasswordModalHard === "function" && !window.TONI_PASSWORD_RECOVERY_MODE) {
        toniClosePasswordModalHard();
      }
      handleJoinLinkAfterLogin?.();
    }
  } catch (error) {
    console.error("TONI V8 Auth Refresh fehlgeschlagen:", error);
  } finally {
    window.TONI_V8_RUNNING = false;
  }
}

// Login mit Passwort überschreiben: Nach Erfolg sofort Dashboard aktualisieren.
async function signInWithPassword() {
  const client = getSupabaseClient();
  const email = document.getElementById("auth-email")?.value.trim();
  const password = document.getElementById("auth-password")?.value;

  if (!email || !password) {
    setAuthMessage("Bitte gib E-Mail-Adresse und Passwort ein.", "err");
    return;
  }

  try {
    setAuthMessage("Anmeldung läuft …", "ok");

    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;

    closeAuthModal();
    await toniV8RefreshAuthState("password-login");

    appendMsg?.("toni", "✅ Anmeldung erfolgreich.", time?.() || "", "desktop");
  } catch (error) {
    console.error(error);
    setAuthMessage(
      "⚠️ Anmeldung fehlgeschlagen:<br>" +
      escapeHtml(error.message) +
      "<br><br>Falls du dein Passwort vergessen hast, nutze „Passwort vergessen?“.",
      "err"
    );
  }
}

// Profilabschluss überschreiben: Nach Erfolg Modal schließen und Dashboard aktualisieren.
const TONI_V8_originalCompleteSelfRegistration = window.completeSelfRegistration;
window.completeSelfRegistration = async function() {
  const client = getSupabaseClient();

  const first = document.getElementById("reg-first-name")?.value.trim();
  const last = document.getElementById("reg-last-name")?.value.trim();
  const cls = document.getElementById("reg-class-name")?.value.trim();
  const pw1 = document.getElementById("reg-password")?.value || "";
  const pw2 = document.getElementById("reg-password-repeat")?.value || "";
  const btn = [...document.querySelectorAll("button")]
    .find(b => b.textContent.trim() === "Registrierung abschließen" || b.textContent.trim() === "Speichere Registrierung…");

  if (!first || !last) {
    setRegistrationMessage("Bitte gib Vorname und Nachname ein.", "err");
    return;
  }
  if (pw1.length < 8) {
    setRegistrationMessage("Das Passwort muss mindestens 8 Zeichen haben.", "err");
    return;
  }
  if (pw1 !== pw2) {
    setRegistrationMessage("Die Passwörter stimmen nicht überein.", "err");
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Speichere Registrierung…";
    }

    setRegistrationMessage("1/3 Passwort wird gespeichert …", "ok");

    const { error } = await client.auth.updateUser({ password: pw1 });
    if (error) throw error;

    setRegistrationMessage("2/3 Profil wird gespeichert …", "ok");

    const { data } = await client.auth.getSession();
    const userId = data?.session?.user?.id;
    if (!userId) throw new Error("Keine aktive Session gefunden.");

    const displayName = `${first} ${last}`.trim();

    try {
      await supabaseRequest(`profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          display_name: displayName,
          class_name: cls || "",
          password_set: true,
          profile_complete: true,
          force_password_change: false,
          updated_at: new Date().toISOString()
        })
      });
    } catch (patchError) {
      console.warn("TONI V8 PATCH fehlgeschlagen, nutze RPC:", patchError);
      await supabaseRequest("rpc/complete_my_profile", {
        method: "POST",
        body: JSON.stringify({
          p_first_name: first,
          p_last_name: last,
          p_class_name: cls || ""
        })
      });
    }

    setRegistrationMessage("3/3 Registrierung abgeschlossen …", "ok");

    const profile = await toniV8LoadOrCreateProfile(data.session);
    if (profile) {
      profile.profile_complete = true;
      profile.password_set = true;
      profile.force_password_change = false;
      profile.display_name = displayName;
      profile.class_name = cls || "";
    }

    toniV8ApplyProfile(profile);

    setTimeout(() => {
      closeRegistrationRequiredModal();
      // Join-/Journey-Code ggf. noch aus der URL einlösen, BEVOR wir die URL bereinigen.
      handleJoinLinkAfterLogin?.();
      // URL bereinigen: nach abgeschlossener Registrierung dürfen keine Onboarding-
      // Parameter (registration/code/token_hash/type) oder Magic-Link-Hash-Token mehr
      // in der Adresszeile stehen. Sonst landet der Student beim Reload erneut im
      // Magic-Link-Flow (toniV9IsRegistrationReturn würde wieder anschlagen).
      try {
        window.history.replaceState({}, "", toniV11CleanRedirectUrl());
      } catch (e) {
        console.warn("URL-Bereinigung nach Registrierung fehlgeschlagen:", e);
      }
      appendMsg?.("toni", "✅ Deine Registrierung ist abgeschlossen.", time?.() || "", "desktop");
    }, 600);

  } catch (error) {
    console.error(error);
    setRegistrationMessage("⚠️ Registrierung konnte nicht abgeschlossen werden:<br>" + escapeHtml(error.message), "err");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Registrierung abschließen";
    }
  }
};

// Verifizierungs-Mail mit klarer Redirect-URL senden.
async function sendVerificationMail(email) {
  const client = getSupabaseClient();
  const url = new URL(window.location.href);
  url.searchParams.set("registration", "1");

  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: url.toString()
      }
    });

    if (error) throw error;

    setAuthMessage("✅ Verifizierungs-Mail wurde gesendet. Bitte öffne den Link. Danach schließt du deine Registrierung ab.", "ok");
  } catch (error) {
    console.error(error);
    setAuthMessage("⚠️ Verifizierungs-Mail konnte nicht gesendet werden:<br>" + escapeHtml(error.message), "err");
  }
}

// Auth-Events und Page Load mehrfach absichern.
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => toniV8RefreshAuthState("load-1"), 600);
  setTimeout(() => toniV8RefreshAuthState("load-2"), 1600);
  setTimeout(() => toniV8RefreshAuthState("load-3"), 3500);

  setTimeout(() => {
    const client = getSupabaseClient();
    if (!client) return;

    client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setTimeout(() => toniV8RefreshAuthState("event-" + event), 200);
      }
    });
  }, 300);
});

/* =========================================================
   TONI – AUTH V9 / ROBUSTER LOGIN- UND REGISTRIERUNGSFLOW
   =========================================================
   Fixes:
   - Passwort-Login bleibt nicht mehr bei „Anmeldung läuft …“ hängen.
   - Admin-Modus wird nach Login zuverlässig aktiviert.
   - Verifizierungslink öffnet zuverlässig „Registrierung abschließen“.
   - Mehrere alte Auth-Handler werden durch finale V9-Funktionen überschrieben.
   ========================================================= */

window.TONI_AUTH_V9_ACTIVE = true;
window.TONI_AUTH_BUSY = false;

function toniV9Sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toniV9Timeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(label + " dauert zu lange. Bitte Verbindung prüfen und erneut versuchen.")), ms)
    )
  ]);
}

function toniV9CurrentUrl() {
  return new URL(window.location.href);
}

function toniV9IsRegistrationReturn() {
  const url = toniV9CurrentUrl();
  const hash = window.location.hash || "";
  return (
    url.searchParams.get("registration") === "1" ||
    url.searchParams.has("code") ||
    url.searchParams.has("token_hash") ||
    url.searchParams.has("type") ||
    hash.includes("access_token=") ||
    hash.includes("type=signup") ||
    hash.includes("type=magiclink")
  );
}

async function toniV9ExchangeCodeIfNeeded() {
  const client = getSupabaseClient();
  const url = toniV9CurrentUrl();
  const code = url.searchParams.get("code");

  if (!code || !client?.auth?.exchangeCodeForSession) return;

  try {
    const { error } = await toniV9Timeout(
      client.auth.exchangeCodeForSession(code),
      12000,
      "Verifizierungslink verarbeiten"
    );

    if (error) {
      console.warn("TONI V9 exchangeCodeForSession error:", error);
    }

    // URL bereinigen, aber join behalten
    url.searchParams.delete("code");
    url.searchParams.delete("type");
    window.history.replaceState({}, "", url.toString());
  } catch (error) {
    console.warn("TONI V9 exchangeCodeIfNeeded fehlgeschlagen:", error);
  }
}

async function toniV9GetSession(retries = 8) {
  const client = getSupabaseClient();

  await toniV9ExchangeCodeIfNeeded();

  for (let i = 0; i < retries; i++) {
    const result = await toniV9Timeout(
      client.auth.getSession(),
      8000,
      "Session laden"
    ).catch(error => {
      console.warn("TONI V9 getSession:", error);
      return null;
    });

    if (result?.data?.session?.user) return result.data.session;

    await toniV9Sleep(500);
  }

  return null;
}

async function toniV9Profile(session) {
  if (!session?.user) return null;
  const user = session.user;

  try {
    const rows = await toniV9Timeout(
      supabaseRequest(
        `profiles?id=eq.${user.id}&select=id,display_name,email,class_name,role,password_set,profile_complete,force_password_change,first_name,last_name,is_active&limit=1`
      ),
      10000,
      "Profil laden"
    );

    if (rows && rows[0]) return rows[0];
  } catch (error) {
    console.warn("TONI V9 Profil laden fehlgeschlagen:", error);
  }

  try {
    const fallbackName = user.email ? user.email.split("@")[0] : "Neuer Nutzer";
    const inserted = await toniV9Timeout(
      supabaseRequest("profiles?on_conflict=id", {
        method: "POST",
        headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
        body: JSON.stringify([{
          id: user.id,
          display_name: fallbackName,
          email: user.email,
          class_name: "",
          role: "student",
          password_set: false,
          profile_complete: false,
          force_password_change: true,
          is_active: true
        }])
      }),
      10000,
      "Profil anlegen"
    );

    if (inserted && inserted[0]) return inserted[0];
  } catch (error) {
    console.warn("TONI V9 Profil-Fallback fehlgeschlagen:", error);
  }

  return {
    id: user.id,
    display_name: user.email ? user.email.split("@")[0] : "Neuer Nutzer",
    email: user.email,
    class_name: "",
    role: "student",
    password_set: false,
    profile_complete: false,
    force_password_change: true,
    is_active: true
  };
}

function toniV9SetPanelVisibility(role) {
  const showTutor = role === "tutor" || role === "admin";
  const showAdmin = role === "admin";

  document.body.classList.remove("role-student", "role-tutor", "role-admin");
  document.body.classList.add("role-" + role);

  // Hard override: display and classes
  document.querySelectorAll(".student-only").forEach(el => {
    el.style.display = role === "student" ? "" : "none";
  });
  document.querySelectorAll(".tutor-only").forEach(el => {
    el.style.display = showTutor ? "" : "none";
    el.classList.toggle("visible", showTutor);
  });
  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = showAdmin ? "" : "none";
    el.classList.toggle("visible", showAdmin);
  });

  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) {
    adminPanel.style.display = showAdmin ? "" : "none";
    adminPanel.classList.toggle("visible", showAdmin);
  }

  const groupPanel = document.getElementById("group-panel");
  if (groupPanel) {
    groupPanel.style.display = showTutor ? "" : "none";
    groupPanel.classList.toggle("visible", showTutor);
  }

  const userAdminPanel = document.getElementById("user-admin-panel");
  if (userAdminPanel) {
    // In der Selbstregistrierungsvariante ausblenden.
    userAdminPanel.style.display = "none";
    userAdminPanel.classList.remove("visible");
  }

  // Falls ältere Handler wieder umschalten, nach 50ms nochmals setzen.
  setTimeout(() => {
    if (adminPanel) {
      adminPanel.style.display = showAdmin ? "" : "none";
      adminPanel.classList.toggle("visible", showAdmin);
    }
    if (groupPanel) {
      groupPanel.style.display = showTutor ? "" : "none";
      groupPanel.classList.toggle("visible", showTutor);
    }
  }, 50);
}

function toniV9ApplyProfile(profile) {
  if (!profile) return;

  const role = profile.role || "student";
  const name = profile.display_name || profile.email || "Angemeldet";

  TONI_AUTH_PROFILE = profile;
  localStorage.setItem("toni_profile_id", profile.id);
  localStorage.setItem("toni_role", role);
  window.TONI_ACTIVE_PROFILE_ID = profile.id;

  const authName = document.getElementById("auth-user-name");
  const authRole = document.getElementById("auth-user-role");
  const loginBtn = document.getElementById("auth-login-btn");
  const logoutBtn = document.getElementById("auth-logout-btn");

  if (authName) authName.textContent = name;
  if (authRole) authRole.textContent = `${role}${profile.class_name ? " · " + profile.class_name : ""}`;
  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "";

  const greeting = document.querySelector(".topbar-greeting h2");
  if (greeting) greeting.innerHTML = `Hallo ${escapeHtml(String(name).split(" ")[0])}! 👋`;

  const sub = document.querySelector(".topbar-greeting p");
  if (sub) {
    const label = (typeof ROLE_CONFIG !== "undefined" && ROLE_CONFIG[role]) ? ROLE_CONFIG[role].label : role;
    sub.textContent = `${label || role}${profile.class_name ? " · " + profile.class_name : ""}`;
  }

  const roleText = document.getElementById("role-info-text");
  if (roleText) {
    const cfg = (typeof ROLE_CONFIG !== "undefined" && ROLE_CONFIG[role]) ? ROLE_CONFIG[role] : null;
    roleText.textContent = `${cfg ? cfg.text : "Angemeldet."} Aktives Profil: ${name}.`;
  }

  toniV9SetPanelVisibility(role);

  try {
    if (typeof STATE !== "undefined") {
      STATE.user = STATE.user || {};
      STATE.user.name = name;
      STATE.user.class = profile.class_name || "";
      saveState?.(STATE);
    }
  } catch {}
}

function toniV9OpenRegistration(profile, reason) {
  if (!profile || profile.profile_complete === true) return;

  window.TONI_SUPPRESS_REGISTRATION_MODAL = false;

  closeAuthModal?.();

  if (typeof toniClosePasswordModalHard === "function") {
    toniClosePasswordModalHard();
  }

  setTimeout(() => {
    openRegistrationRequiredModal();

    const msg = document.getElementById("registration-message");
    if (msg) {
      msg.className = "auth-message visible ok";
      msg.innerHTML = "✅ Deine E-Mail-Adresse wurde bestätigt. Bitte vervollständige jetzt dein Profil und lege ein Passwort fest.";
    }

    console.log("TONI V9: Registrierung geöffnet:", reason, profile);
  }, 300);
}

async function toniV9Refresh(reason = "refresh") {
  if (window.TONI_AUTH_BUSY) return;
  window.TONI_AUTH_BUSY = true;

  try {
    const session = await toniV9GetSession();
    if (!session?.user) return null;

    const profile = await toniV9Profile(session);
    toniV9ApplyProfile(profile);

    if (profile && profile.profile_complete !== true) {
      toniV9OpenRegistration(profile, reason);
    } else {
      closeAuthModal?.();

      // Nur schließen, wenn kein Passwort-Recovery läuft.
      if (!window.TONI_PASSWORD_RECOVERY_MODE) {
        closeRegistrationRequiredModal?.();
      }

      handleJoinLinkAfterLogin?.();
    }

    return profile;
  } catch (error) {
    console.error("TONI V9 Refresh Fehler:", error);
    return null;
  } finally {
    window.TONI_AUTH_BUSY = false;
  }
}

// Passwort-Login vollständig neu und mit Timeout.
async function signInWithPassword() {
  const client = getSupabaseClient();
  const email = document.getElementById("auth-email")?.value.trim();
  const password = document.getElementById("auth-password")?.value;
  const btn = [...document.querySelectorAll("#auth-modal button")]
    .find(b => b.textContent.trim() === "Anmelden" || b.textContent.trim() === "Anmeldung läuft…");

  if (!email || !password) {
    setAuthMessage("Bitte gib E-Mail-Adresse und Passwort ein.", "err");
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Anmeldung läuft…";
    }

    setAuthMessage("Anmeldung läuft …", "ok");

    const result = await toniV9Timeout(
      client.auth.signInWithPassword({ email, password }),
      15000,
      "Anmeldung"
    );

    if (result.error) throw result.error;

    setAuthMessage("✅ Anmeldung erfolgreich.", "ok");
    closeAuthModal();

    await toniV9Refresh("password-login");

    appendMsg?.("toni", "✅ Anmeldung erfolgreich.", time?.() || "", "desktop");
  } catch (error) {
    console.error("TONI V9 Login Fehler:", error);
    setAuthMessage(
      "⚠️ Anmeldung fehlgeschlagen:<br>" +
      escapeHtml(error.message) +
      "<br><br>Falls du dein Passwort vergessen hast, nutze „Passwort vergessen?“.",
      "err"
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Anmelden";
    }
  }
}

// Verifizierungs-Mail mit Registrierungshinweis in URL.
async function sendVerificationMail(email) {
  const client = getSupabaseClient();
  const url = new URL(window.location.href);
  url.searchParams.set("registration", "1");

  try {
    const result = await toniV9Timeout(
      client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: url.toString() }
      }),
      15000,
      "Verifizierungs-Mail senden"
    );

    if (result.error) throw result.error;

    setAuthMessage("✅ Verifizierungs-Mail wurde gesendet. Bitte öffne den Link. Danach schließt du deine Registrierung ab.", "ok");
  } catch (error) {
    console.error("TONI V9 Verification Fehler:", error);
    setAuthMessage("⚠️ Verifizierungs-Mail konnte nicht gesendet werden:<br>" + escapeHtml(error.message), "err");
  }
}

// Profilabschluss finalisieren und Dashboard aktualisieren.
window.completeSelfRegistration = async function() {
  const client = getSupabaseClient();

  const first = document.getElementById("reg-first-name")?.value.trim();
  const last = document.getElementById("reg-last-name")?.value.trim();
  const cls = document.getElementById("reg-class-name")?.value.trim();
  const pw1 = document.getElementById("reg-password")?.value || "";
  const pw2 = document.getElementById("reg-password-repeat")?.value || "";
  const btn = [...document.querySelectorAll("button")]
    .find(b => b.textContent.trim() === "Registrierung abschließen" || b.textContent.trim() === "Speichere Registrierung…");

  if (!first || !last) {
    setRegistrationMessage("Bitte gib Vorname und Nachname ein.", "err");
    return;
  }
  if (pw1.length < 8) {
    setRegistrationMessage("Das Passwort muss mindestens 8 Zeichen haben.", "err");
    return;
  }
  if (pw1 !== pw2) {
    setRegistrationMessage("Die Passwörter stimmen nicht überein.", "err");
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Speichere Registrierung…";
    }

    setRegistrationMessage("1/3 Passwort wird gespeichert …", "ok");

    const passResult = await toniV9Timeout(
      client.auth.updateUser({ password: pw1 }),
      15000,
      "Passwort speichern"
    );

    if (passResult.error) throw passResult.error;

    setRegistrationMessage("2/3 Profil wird gespeichert …", "ok");

    const session = await toniV9GetSession();
    const userId = session?.user?.id;
    if (!userId) throw new Error("Keine aktive Session gefunden.");

    const displayName = `${first} ${last}`.trim();

    try {
      await toniV9Timeout(
        supabaseRequest(`profiles?id=eq.${userId}`, {
          method: "PATCH",
          headers: { "Prefer": "return=representation" },
          body: JSON.stringify({
            first_name: first,
            last_name: last,
            display_name: displayName,
            class_name: cls || "",
            password_set: true,
            profile_complete: true,
            force_password_change: false,
            updated_at: new Date().toISOString()
          })
        }),
        12000,
        "Profil speichern"
      );
    } catch (patchError) {
      console.warn("TONI V9 PATCH fehlgeschlagen, nutze RPC:", patchError);
      await toniV9Timeout(
        supabaseRequest("rpc/complete_my_profile", {
          method: "POST",
          body: JSON.stringify({
            p_first_name: first,
            p_last_name: last,
            p_class_name: cls || ""
          })
        }),
        12000,
        "Profil speichern"
      );
    }

    setRegistrationMessage("3/3 Registrierung abgeschlossen …", "ok");

    const profile = await toniV9Profile(session);
    if (profile) {
      profile.profile_complete = true;
      profile.password_set = true;
      profile.force_password_change = false;
      profile.display_name = displayName;
      profile.class_name = cls || "";
    }

    toniV9ApplyProfile(profile);

    setTimeout(() => {
      closeRegistrationRequiredModal();
      handleJoinLinkAfterLogin?.();
      appendMsg?.("toni", "✅ Deine Registrierung ist abgeschlossen.", time?.() || "", "desktop");
    }, 700);
  } catch (error) {
    console.error("TONI V9 Registrierung Fehler:", error);
    setRegistrationMessage("⚠️ Registrierung konnte nicht abgeschlossen werden:<br>" + escapeHtml(error.message), "err");
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Registrierung abschließen";
    }
  }
};

// Beim Laden und nach Auth-Events mehrfach prüfen.
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => toniV9Refresh("load-1"), 500);
  setTimeout(() => toniV9Refresh("load-2"), 1600);
  setTimeout(() => toniV9Refresh("load-3"), 3600);

  setTimeout(() => {
    const client = getSupabaseClient();
    if (!client) return;

    client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
        setTimeout(() => toniV9Refresh("event-" + event), 250);
      }
    });
  }, 250);
});

/* =========================================================
   TONI – AUTH V10 / FOKUS: ADMIN-LOGIN UND PASSWORT-RESET
   =========================================================
   Diese Schicht umgeht hängende Supabase-JS Login-Aufrufe beim Admin-Login
   und nutzt die Supabase Auth REST API direkt.
   ========================================================= */

window.TONI_ADMIN_AUTH_V10 = true;

function toniV10Timeout(ms, label) {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(label + " dauert zu lange. Bitte Verbindung prüfen.")), ms)
  );
}

async function toniV10FetchJson(url, options = {}, timeoutMs = 12000, label = "Anfrage") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }

    if (!res.ok) {
      const msg =
        (data && (data.msg || data.message || data.error_description || data.error)) ||
        text ||
        `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(label + " dauert zu lange. Bitte Verbindung prüfen und erneut versuchen.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function toniV10SaveDirectSession(session) {
  if (!session || !session.access_token) return;

  const stored = {
    access_token: session.access_token,
    refresh_token: session.refresh_token || "",
    expires_at: session.expires_at || Math.floor(Date.now() / 1000) + (session.expires_in || 3600),
    user: session.user || null
  };

  localStorage.setItem("toni_direct_session", JSON.stringify(stored));
  window.TONI_DIRECT_SESSION = stored;
}

function toniV10GetDirectSession() {
  if (window.TONI_DIRECT_SESSION?.access_token) return window.TONI_DIRECT_SESSION;

  try {
    const stored = JSON.parse(localStorage.getItem("toni_direct_session") || "null");
    if (stored?.access_token) {
      window.TONI_DIRECT_SESSION = stored;
      return stored;
    }
  } catch {}

  return null;
}

function toniV10ClearDirectSession() {
  window.TONI_DIRECT_SESSION = null;
  localStorage.removeItem("toni_direct_session");
}

// Wichtig: Supabase-REST-Anfragen sollen zuerst den direkten Admin-Token nutzen.
window.getAuthAccessToken = async function() {
  const direct = toniV10GetDirectSession();
  if (direct?.access_token) return direct.access_token;

  try {
    const client = getSupabaseClient();
    const { data } = await Promise.race([
      client.auth.getSession(),
      toniV10Timeout(5000, "Supabase-Session laden")
    ]);
    return data?.session?.access_token || null;
  } catch {
    return null;
  }
};

window.supabaseRequest = async function(path, options = {}) {
  const token = await window.getAuthAccessToken();
  const bearer = token || window.SUPABASE_ANON_KEY;

  return toniV10FetchJson(
    `${window.SUPABASE_URL}/rest/v1/${path}`,
    {
      ...options,
      headers: {
        "apikey": window.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + bearer,
        "Content-Type": "application/json",
        ...(options.headers || {})
      }
    },
    12000,
    "Supabase-Datenbankanfrage"
  );
};

async function toniV10LoginWithPassword(email, password) {
  const url = `${window.SUPABASE_URL}/auth/v1/token?grant_type=password`;

  const data = await toniV10FetchJson(
    url,
    {
      method: "POST",
      headers: {
        "apikey": window.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    },
    15000,
    "Admin-Anmeldung"
  );

  toniV10SaveDirectSession(data);

  // Supabase-JS Session zusätzlich setzen, aber nicht davon abhängig machen.
  try {
    const client = getSupabaseClient();
    if (client?.auth?.setSession && data.access_token && data.refresh_token) {
      client.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      }).catch(err => console.warn("TONI V10 setSession optional fehlgeschlagen:", err));
    }
  } catch (error) {
    console.warn("TONI V10 optional setSession Fehler:", error);
  }

  return data;
}

async function toniV10LoadProfile(userId) {
  const rows = await window.supabaseRequest(
    `profiles?id=eq.${userId}&select=id,display_name,email,class_name,role,password_set,profile_complete,force_password_change,first_name,last_name,is_active&limit=1`
  );

  if (!rows || !rows[0]) {
    throw new Error("Kein Profil zu diesem Nutzer gefunden. Bitte prüfe die Tabelle profiles.");
  }

  return rows[0];
}

function toniV10ShowAdminDashboard(profile) {
  const role = profile.role || "student";
  const isAdmin = role === "admin";
  const isTutor = role === "tutor" || isAdmin;
  const name = profile.display_name || profile.email || "Angemeldet";

  TONI_AUTH_PROFILE = profile;
  localStorage.setItem("toni_profile_id", profile.id);
  localStorage.setItem("toni_role", role);
  window.TONI_ACTIVE_PROFILE_ID = profile.id;

  document.body.classList.remove("role-student", "role-tutor", "role-admin");
  document.body.classList.add("role-" + role);

  const authName = document.getElementById("auth-user-name");
  const authRole = document.getElementById("auth-user-role");
  const loginBtn = document.getElementById("auth-login-btn");
  const logoutBtn = document.getElementById("auth-logout-btn");

  if (authName) authName.textContent = name;
  if (authRole) authRole.textContent = `${role}${profile.class_name ? " · " + profile.class_name : ""}`;
  if (loginBtn) loginBtn.style.display = "none";
  if (logoutBtn) logoutBtn.style.display = "";

  const greeting = document.querySelector(".topbar-greeting h2");
  if (greeting) greeting.innerHTML = `Hallo ${escapeHtml(String(name).split(" ")[0])}! 👋`;

  const sub = document.querySelector(".topbar-greeting p");
  if (sub) {
    sub.textContent = `${isAdmin ? "Admin" : role}${profile.class_name ? " · " + profile.class_name : ""}`;
  }

  document.querySelectorAll(".admin-only").forEach(el => {
    el.style.display = isAdmin ? "" : "none";
    el.classList.toggle("visible", isAdmin);
  });

  document.querySelectorAll(".tutor-only").forEach(el => {
    el.style.display = isTutor ? "" : "none";
    el.classList.toggle("visible", isTutor);
  });

  document.querySelectorAll(".student-only").forEach(el => {
    el.style.display = role === "student" ? "" : "none";
  });

  const adminPanel = document.getElementById("admin-panel");
  if (adminPanel) {
    adminPanel.style.display = isAdmin ? "" : "none";
    adminPanel.classList.toggle("visible", isAdmin);
  }

  const groupPanel = document.getElementById("group-panel");
  if (groupPanel) {
    groupPanel.style.display = isTutor ? "" : "none";
    groupPanel.classList.toggle("visible", isTutor);
  }

  // Selbstregistrierungsvariante: Nutzeranlage mit Startpasswort ausblenden.
  const userAdminPanel = document.getElementById("user-admin-panel");
  if (userAdminPanel) {
    userAdminPanel.style.display = "none";
    userAdminPanel.classList.remove("visible");
  }

  try {
    if (typeof STATE !== "undefined") {
      STATE.user = STATE.user || {};
      STATE.user.name = name;
      STATE.user.class = profile.class_name || "";
      saveState?.(STATE);
    }
  } catch {}

  closeAuthModal?.();
  closeRegistrationRequiredModal?.();

  if (typeof appendMsg === "function") {
    appendMsg("toni", `✅ Angemeldet als <strong>${escapeHtml(name)}</strong> (${escapeHtml(role)}).`, typeof time === "function" ? time() : "", "desktop");
  }
}

// FINALER Admin-/Passwort-Login
window.signInWithPassword = async function() {
  const email = document.getElementById("auth-email")?.value.trim();
  const password = document.getElementById("auth-password")?.value;
  const btn = [...document.querySelectorAll("#auth-modal button")]
    .find(b => b.textContent.trim() === "Anmelden" || b.textContent.includes("Anmeldung"));

  if (!email || !password) {
    setAuthMessage("Bitte gib E-Mail-Adresse und Passwort ein.", "err");
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Anmeldung läuft…";
    }

    setAuthMessage("Anmeldung läuft …", "ok");

    const session = await toniV10LoginWithPassword(email, password);
    const userId = session?.user?.id;

    if (!userId) {
      throw new Error("Anmeldung erfolgreich, aber keine User-ID erhalten.");
    }

    setAuthMessage("Profil wird geladen …", "ok");

    const profile = await toniV10LoadProfile(userId);

    if (profile.role !== "admin" && email.toLowerCase() === "ralf.loskill@googlemail.com") {
      throw new Error("Das Profil wurde gefunden, ist aber nicht als admin markiert. Bitte role='admin' in Supabase prüfen.");
    }

    toniV10ShowAdminDashboard(profile);
  } catch (error) {
    console.error("TONI V10 Login Fehler:", error);
    setAuthMessage(
      "⚠️ Anmeldung fehlgeschlagen:<br>" +
      escapeHtml(error.message) +
      "<br><br>Bitte prüfe zuerst in Supabase, ob dein Profil vollständig ist und role = admin hat.",
      "err"
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Anmelden";
    }
  }
};

// Logout ebenfalls mit direkter Session bereinigen.
window.signOutUser = async function() {
  // Gecachten Institutionsnamen verwerfen, damit der nächste Login nicht die
  // Institution des Vorgängers zeigt.
  window.TONI_INSTITUTION_NAME = null;
  window.TONI_INSTITUTION_NAME_LOADING = null;
  try {
    const token = toniV10GetDirectSession()?.access_token;
    if (token) {
      await toniV10FetchJson(
        `${window.SUPABASE_URL}/auth/v1/logout`,
        {
          method: "POST",
          headers: {
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + token
          }
        },
        8000,
        "Abmeldung"
      ).catch(() => {});
    }

    try {
      const client = getSupabaseClient();
      await Promise.race([client.auth.signOut(), toniV10Timeout(5000, "Abmeldung")]);
    } catch {}

    toniV10ClearDirectSession();

    localStorage.setItem("toni_role", "student");
    window.TONI_ACTIVE_PROFILE_ID = null;
    TONI_AUTH_PROFILE = null;

    const authName = document.getElementById("auth-user-name");
    const authRole = document.getElementById("auth-user-role");
    const loginBtn = document.getElementById("auth-login-btn");
    const logoutBtn = document.getElementById("auth-logout-btn");

    if (authName) authName.textContent = "Nicht angemeldet";
    if (authRole) authRole.textContent = "Student-Ansicht";
    if (loginBtn) loginBtn.style.display = "";
    if (logoutBtn) logoutBtn.style.display = "none";

    document.body.classList.remove("role-admin", "role-tutor");
    document.body.classList.add("role-student");

    document.querySelectorAll(".admin-only,.tutor-only").forEach(el => {
      el.style.display = "none";
      el.classList.remove("visible");
    });

    appendMsg?.("toni", "Du wurdest abgemeldet.", typeof time === "function" ? time() : "", "desktop");

    // Anmeldefelder leeren, damit nach dem Logout ein leerer Anmeldebildschirm
    // erscheint (keine vorausgefüllte E-Mail / kein Passwort).
    try{
      const emailEl = document.getElementById("auth-email");
      const pwEl = document.getElementById("auth-password");
      if(emailEl){ emailEl.value = ""; emailEl.disabled = false; }
      if(pwEl){ pwEl.value = ""; }
      // SuperAdmin-Login-Modus zurücksetzen
      const modal = document.getElementById("auth-modal");
      modal?.classList.remove("superadmin-login-mode-v77");
      // Standard-Anmeldebildschirm wiederherstellen: E-Mail UND Passwort
      // zugleich sichtbar (identisch zum Zustand nach einem Neuladen).
      // Frueher wurde "visible" hier entfernt, wodurch nach dem Logout nur
      // das E-Mail-Feld erschien und ein manueller Reload noetig war.
      const pwArea = document.getElementById("auth-password-area");
      pwArea?.classList.add("visible");
      const note = document.getElementById("auth-login-note");
      if(note) note.innerHTML = "";
      const msg = document.getElementById("auth-message");
      if(msg){ msg.textContent = ""; msg.className = "auth-message"; }
      const contBtn = document.getElementById("auth-continue-btn");
      if(contBtn){ contBtn.style.display = ""; contBtn.textContent = "Anmelden"; }
      // Startbildschirm wieder zeigen. Der SuperAdmin hatte keine Supabase-Sitzung,
      // daher feuert kein SIGNED_OUT-Event, das den Startbildschirm einblenden würde.
      try{
        const ss = document.getElementById("toni-startscreen");
        if(ss){ ss.style.display = ""; ss.classList.remove("hidden"); }
        if(typeof window.toniShowStartScreen === "function"){
          window.toniShowStartScreen();
        }
      }catch(e){ /* Startbildschirm optional */ }
    }catch(e){ console.warn("TONI Logout Felder-Reset:", e); }
  } catch (error) {
    console.warn("TONI V10 Logout Fehler:", error);
  }
};

// Passwort-Reset-Link senden: Fokus Admin-Prozess.
window.sendPasswordReset = async function() {
  const client = getSupabaseClient();
  const email = document.getElementById("auth-email")?.value.trim();

  if (!email) {
    setAuthMessage("Bitte gib zuerst deine E-Mail-Adresse ein.", "err");
    return;
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}?admin_recovery=1`;

  try {
    const result = await Promise.race([
      client.auth.resetPasswordForEmail(email, { redirectTo }),
      toniV10Timeout(15000, "Reset-Link senden")
    ]);

    if (result.error) throw result.error;

    setAuthMessage("✅ Link zum Zurücksetzen wurde gesendet. Bitte prüfe dein E-Mail-Postfach.", "ok");
  } catch (error) {
    console.error("TONI V10 Reset Fehler:", error);
    setAuthMessage("⚠️ Reset-Link konnte nicht gesendet werden:<br>" + escapeHtml(error.message), "err");
  }
};

async function toniV10HandleRecoveryReturn() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
  const isRecovery =
    url.searchParams.get("admin_recovery") === "1" ||
    url.searchParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery";

  if (!isRecovery) return;

  const client = getSupabaseClient();

  try {
    // Falls Supabase Token im Hash liefert
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken) {
      toniV10SaveDirectSession({
        access_token: accessToken,
        refresh_token: refreshToken || "",
        expires_in: Number(hashParams.get("expires_in") || 3600),
        user: null
      });

      if (refreshToken && client?.auth?.setSession) {
        client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken }).catch(() => {});
      }

      openPasswordRequiredModal?.();
      return;
    }

    // Falls Supabase PKCE-Code liefert
    const code = url.searchParams.get("code");
    if (code && client?.auth?.exchangeCodeForSession) {
      const result = await Promise.race([
        client.auth.exchangeCodeForSession(code),
        toniV10Timeout(12000, "Reset-Link verarbeiten")
      ]);

      if (result.error) throw result.error;

      if (result.data?.session) {
        toniV10SaveDirectSession(result.data.session);
      }

      openPasswordRequiredModal?.();

      url.searchParams.delete("code");
      window.history.replaceState({}, "", url.toString());
      return;
    }

    // Letzter Versuch: vorhandene Session
    const sessionResult = await Promise.race([
      client.auth.getSession(),
      toniV10Timeout(6000, "Session laden")
    ]);

    if (sessionResult.data?.session) {
      toniV10SaveDirectSession(sessionResult.data.session);
      openPasswordRequiredModal?.();
    }
  } catch (error) {
    console.error("TONI V10 Recovery Return Fehler:", error);
    openAuthModal?.();
    setAuthMessage("⚠️ Reset-Link konnte nicht verarbeitet werden:<br>" + escapeHtml(error.message), "err");
  }
}

// Neues Passwort nach Reset per direkter Auth API speichern.
window.setPasswordAfterMagicLink = async function() {
  const pw1 = document.getElementById("new-password")?.value || "";
  const pw2 = document.getElementById("new-password-repeat")?.value || "";

  if (!pw1 || !pw2) {
    setPasswordMessage("Bitte gib das Passwort zweimal ein.", "err");
    return;
  }
  if (pw1.length < 8) {
    setPasswordMessage("Das Passwort sollte mindestens 8 Zeichen haben.", "err");
    return;
  }
  if (pw1 !== pw2) {
    setPasswordMessage("Die Passwörter stimmen nicht überein.", "err");
    return;
  }

  try {
    setPasswordMessage("Passwort wird gespeichert …", "ok");

    const token = await window.getAuthAccessToken();

    if (!token) {
      throw new Error("Kein gültiger Reset-Token gefunden. Bitte Reset-Link erneut öffnen.");
    }

    const user = await toniV10FetchJson(
      `${window.SUPABASE_URL}/auth/v1/user`,
      {
        method: "PUT",
        headers: {
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ password: pw1 })
      },
      15000,
      "Passwort speichern"
    );

    const userId = user?.id || user?.user?.id;

    if (userId) {
      await window.supabaseRequest(`profiles?id=eq.${userId}`, {
        method: "PATCH",
        headers: { "Prefer": "return=representation" },
        body: JSON.stringify({
          password_set: true,
          force_password_change: false,
          updated_at: new Date().toISOString()
        })
      }).catch(err => console.warn("Profilstatus konnte nicht gesetzt werden:", err));
    }

    setPasswordMessage("✅ Passwort gespeichert.", "ok");

    setTimeout(() => {
      if (typeof toniClosePasswordModalHard === "function") {
        toniClosePasswordModalHard();
      } else {
        closePasswordRequiredModal?.();
      }
      appendMsg?.("toni", "✅ Dein neues Passwort wurde gespeichert.", typeof time === "function" ? time() : "", "desktop");
    }, 600);
  } catch (error) {
    console.error("TONI V10 Passwort speichern Fehler:", error);
    setPasswordMessage("⚠️ Passwort konnte nicht gespeichert werden:<br>" + escapeHtml(error.message), "err");
  }
};

// Beim Laden: vorhandene direkte Admin-Session reaktivieren und Recovery prüfen.
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(async () => {
    await toniV10HandleRecoveryReturn();

    const direct = toniV10GetDirectSession();
    if (direct?.user?.id) {
      try {
        const profile = await toniV10LoadProfile(direct.user.id);
        toniV10ShowAdminDashboard(profile);
      } catch (e) {
        console.warn("TONI V10 gespeicherte Session konnte nicht reaktiviert werden:", e);
      }
    }
  }, 700);
});

/* =========================================================
   TONI – AUTH V11 / FIX: ADMIN PASSWORT ZURÜCKSETZEN
   =========================================================
   Änderung:
   - redirectTo wird ohne Query-Parameter gesetzt.
   - Reset-Anforderung läuft zuerst direkt über /auth/v1/recover.
   - Supabase-JS bleibt nur Fallback.
   - Rückkehr über #type=recovery oder ?type=recovery öffnet Passwortdialog.
   ========================================================= */

function toniV11CleanRedirectUrl() {
  // Wichtig: exakt die URL verwenden, die in Supabase Redirect URLs eingetragen ist.
  // Keine Query wie ?admin_recovery=1, weil das je nach Allowlist/Template Probleme machen kann.
  return `${window.location.origin}${window.location.pathname}`;
}

async function toniV11FetchJsonOrText(url, options = {}, timeoutMs = 15000, label = "Anfrage") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();

    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!response.ok) {
      const msg =
        (data && (data.msg || data.message || data.error || data.error_description)) ||
        text ||
        `HTTP ${response.status}`;
      throw new Error(msg);
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(label + " dauert zu lange. Bitte Verbindung prüfen.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function toniV11RequestPasswordRecoveryDirect(email) {
  const redirectTo = toniV11CleanRedirectUrl();

  // Supabase GoTrue Recovery Endpoint.
  // redirect_to als Query-Parameter; Body enthält nur die E-Mail.
  return await toniV11FetchJsonOrText(
    `${window.SUPABASE_URL}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`,
    {
      method: "POST",
      headers: {
        "apikey": window.SUPABASE_ANON_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email })
    },
    15000,
    "Reset-Mail senden"
  );
}

// Finaler Passwort-Reset-Versand
window.sendPasswordReset = async function() {
  const client = getSupabaseClient();
  const email = document.getElementById("auth-email")?.value.trim();

  if (!email) {
    setAuthMessage("Bitte gib zuerst deine E-Mail-Adresse ein.", "err");
    return;
  }

  const btn = [...document.querySelectorAll("#auth-modal button, #auth-modal span")]
    .find(el => String(el.textContent || "").includes("Passwort vergessen"));

  try {
    if (btn) {
      btn.style.pointerEvents = "none";
      btn.style.opacity = ".6";
    }

    setAuthMessage("Reset-Mail wird angefordert …", "ok");

    try {
      await toniV11RequestPasswordRecoveryDirect(email);
    } catch (directError) {
      console.warn("Direkter Recovery-Endpunkt fehlgeschlagen, nutze Supabase-JS:", directError);

      const result = await Promise.race([
        client.auth.resetPasswordForEmail(email, {
          redirectTo: toniV11CleanRedirectUrl()
        }),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Reset-Link senden dauert zu lange.")), 15000))
      ]);

      if (result.error) throw result.error;
    }

    setAuthMessage(
      "✅ Passwort-Reset-Mail wurde angefordert. Bitte prüfe dein Postfach und auch den Spam-Ordner.<br><br>" +
      "<small>Falls keine Mail ankommt: In Brevo unter Transactional → Logs prüfen, ob die Mail von Supabase/Brevo angenommen wurde.</small>",
      "ok"
    );
  } catch (error) {
    console.error("TONI V11 Reset Fehler:", error);
    setAuthMessage(
      "⚠️ Reset-Mail konnte nicht angefordert werden:<br>" +
      escapeHtml(error.message) +
      "<br><br><small>Bitte prüfe in Supabase → Authentication → URL Configuration, ob deine TONI-URL als Redirect URL eingetragen ist.</small>",
      "err"
    );
  } finally {
    if (btn) {
      btn.style.pointerEvents = "";
      btn.style.opacity = "";
    }
  }
};

function toniV11UrlIndicatesRecovery() {
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));

  return (
    url.searchParams.get("type") === "recovery" ||
    hashParams.get("type") === "recovery" ||
    hashParams.has("access_token") ||
    url.searchParams.has("code")
  );
}

// Rückkehr nach Reset-Link: Passwortdialog zuverlässig öffnen.
async function toniV11HandleRecoveryReturn() {
  if (!toniV11UrlIndicatesRecovery()) return;

  const client = getSupabaseClient();
  const url = new URL(window.location.href);
  const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));

  try {
    // Implicit flow: Token im Hash
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken) {
      if (typeof toniV10SaveDirectSession === "function") {
        toniV10SaveDirectSession({
          access_token: accessToken,
          refresh_token: refreshToken || "",
          expires_in: Number(hashParams.get("expires_in") || 3600),
          user: null
        });
      }

      if (refreshToken && client?.auth?.setSession) {
        await client.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        }).catch(() => {});
      }

      window.history.replaceState({}, "", toniV11CleanRedirectUrl());
      openPasswordRequiredModal?.();
      return;
    }

    // PKCE flow: code in Query
    const code = url.searchParams.get("code");
    if (code && client?.auth?.exchangeCodeForSession) {
      const result = await Promise.race([
        client.auth.exchangeCodeForSession(code),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Reset-Link verarbeiten dauert zu lange.")), 15000))
      ]);

      if (result.error) throw result.error;

      if (result.data?.session && typeof toniV10SaveDirectSession === "function") {
        toniV10SaveDirectSession(result.data.session);
      }

      window.history.replaceState({}, "", toniV11CleanRedirectUrl());
      openPasswordRequiredModal?.();
      return;
    }

    // Fallback: vorhandene Supabase-Session
    const sessionResult = await Promise.race([
      client.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Session laden dauert zu lange.")), 8000))
    ]);

    if (sessionResult.data?.session) {
      if (typeof toniV10SaveDirectSession === "function") {
        toniV10SaveDirectSession(sessionResult.data.session);
      }
      openPasswordRequiredModal?.();
    }
  } catch (error) {
    console.error("TONI V11 Recovery Return Fehler:", error);
    openAuthModal?.();
    setAuthMessage("⚠️ Reset-Link konnte nicht verarbeitet werden:<br>" + escapeHtml(error.message), "err");
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV11HandleRecoveryReturn, 400);
  setTimeout(toniV11HandleRecoveryReturn, 1400);

  const client = getSupabaseClient?.();
  if (client?.auth?.onAuthStateChange) {
    client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setTimeout(toniV11HandleRecoveryReturn, 200);
      }
    });
  }
});

/* =========================================================
   TONI – AUTH V12 / FIX: SUPABASE LINK-RÜCKKEHR
   ========================================================= */
window.TONI_AUTH_CALLBACK_V12 = true;
window.TONI_AUTH_CALLBACK_HANDLED = false;

function toniV12Sleep(ms){ return new Promise(resolve => setTimeout(resolve, ms)); }

function toniV12HasCallbackParams(){
  const url = new URL(window.location.href);
  const hash = new URLSearchParams((window.location.hash || "").replace(/^#/,""));
  return (
    url.searchParams.has("code") ||
    url.searchParams.has("token_hash") ||
    url.searchParams.has("type") ||
    url.searchParams.get("registration") === "1" ||
    url.searchParams.get("admin_recovery") === "1" ||
    hash.has("access_token") ||
    hash.has("refresh_token") ||
    hash.has("type")
  );
}

function toniV12IsRecovery(){
  const url = new URL(window.location.href);
  const hash = new URLSearchParams((window.location.hash || "").replace(/^#/,""));
  return (
    url.searchParams.get("type") === "recovery" ||
    url.searchParams.get("admin_recovery") === "1" ||
    hash.get("type") === "recovery"
  );
}

function toniV12SaveSession(session){
  if(!session?.access_token) return;
  const stored = {
    access_token: session.access_token,
    refresh_token: session.refresh_token || "",
    expires_at: session.expires_at || Math.floor(Date.now()/1000) + (session.expires_in || 3600),
    user: session.user || null
  };
  localStorage.setItem("toni_direct_session", JSON.stringify(stored));
  window.TONI_DIRECT_SESSION = stored;
}

async function toniV12SetSessionFromHash(){
  const client = getSupabaseClient();
  const hash = new URLSearchParams((window.location.hash || "").replace(/^#/,""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");
  if(!accessToken) return null;

  let session = { access_token: accessToken, refresh_token: refreshToken || "", expires_in: Number(hash.get("expires_in") || 3600), user: null };

  if(refreshToken && client?.auth?.setSession){
    try{
      const result = await client.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if(result?.data?.session) session = result.data.session;
    }catch(error){ console.warn("TONI V12 setSession from hash:", error); }
  }
  toniV12SaveSession(session);
  return session;
}

async function toniV12ExchangeCode(){
  const client = getSupabaseClient();
  const url = new URL(window.location.href);
  const code = url.searchParams.get("code");
  if(!code || !client?.auth?.exchangeCodeForSession) return null;

  const result = await Promise.race([
    client.auth.exchangeCodeForSession(code),
    new Promise((_, reject) => setTimeout(() => reject(new Error("Verifizierungslink konnte nicht rechtzeitig verarbeitet werden.")), 15000))
  ]);
  if(result.error) throw result.error;
  if(result.data?.session){
    toniV12SaveSession(result.data.session);
    return result.data.session;
  }
  return null;
}

async function toniV12GetSessionAfterCallback(){
  const client = getSupabaseClient();

  const fromHash = await toniV12SetSessionFromHash();
  if(fromHash?.access_token) return fromHash;

  const fromCode = await toniV12ExchangeCode();
  if(fromCode?.access_token) return fromCode;

  for(let i=0; i<8; i++){
    const result = await Promise.race([
      client.auth.getSession(),
      new Promise(resolve => setTimeout(() => resolve(null), 4000))
    ]);
    if(result?.data?.session?.user){
      toniV12SaveSession(result.data.session);
      return result.data.session;
    }
    await toniV12Sleep(400);
  }

  if(typeof toniV10GetDirectSession === "function"){
    const direct = toniV10GetDirectSession();
    if(direct?.access_token) return direct;
  }
  return null;
}

async function toniV12AuthFetch(path, options={}){
  const token =
    (typeof getAuthAccessToken === "function" ? await getAuthAccessToken() : null) ||
    window.TONI_DIRECT_SESSION?.access_token ||
    window.SUPABASE_ANON_KEY;

  const response = await fetch(`${window.SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": window.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data = null;
  try{ data = text ? JSON.parse(text) : null; }catch{ data = text; }

  if(!response.ok){
    const msg = (data && (data.message || data.msg || data.error || data.details)) || text || `HTTP ${response.status}`;
    throw new Error(msg);
  }
  return data;
}

async function toniV12LoadOrCreateProfile(session){
  if(!session?.user && window.TONI_DIRECT_SESSION?.user) session.user = window.TONI_DIRECT_SESSION.user;

  if(!session?.user?.id){
    const token = window.TONI_DIRECT_SESSION?.access_token || session?.access_token;
    if(token){
      const userResponse = await fetch(`${window.SUPABASE_URL}/auth/v1/user`, {
        headers: { "apikey": window.SUPABASE_ANON_KEY, "Authorization": "Bearer " + token }
      });
      if(userResponse.ok){
        const user = await userResponse.json();
        session.user = user;
        if(window.TONI_DIRECT_SESSION) window.TONI_DIRECT_SESSION.user = user;
      }
    }
  }

  if(!session?.user?.id) throw new Error("Die Anmeldung wurde erkannt, aber es konnte kein Nutzer geladen werden.");

  const user = session.user;

  try{
    const rows = await toniV12AuthFetch(`profiles?id=eq.${user.id}&select=id,display_name,email,class_name,role,password_set,profile_complete,force_password_change,first_name,last_name,is_active&limit=1`);
    if(rows && rows[0]) return rows[0];
  }catch(error){ console.warn("TONI V12 Profil lesen:", error); }

  const fallbackName = user.email ? user.email.split("@")[0] : "Neuer Nutzer";
  try{
    const inserted = await toniV12AuthFetch("profiles?on_conflict=id", {
      method: "POST",
      headers: { "Prefer": "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([{
        id: user.id,
        display_name: fallbackName,
        email: user.email,
        class_name: "",
        role: "student",
        password_set: false,
        profile_complete: false,
        force_password_change: true,
        is_active: true
      }])
    });
    if(inserted && inserted[0]) return inserted[0];
  }catch(error){ console.warn("TONI V12 Profil anlegen:", error); }

  return {
    id: user.id,
    display_name: fallbackName,
    email: user.email,
    class_name: "",
    role: "student",
    password_set: false,
    profile_complete: false,
    force_password_change: true,
    is_active: true
  };
}

function toniV12ApplyDashboard(profile){
  if(!profile) return;

  const role = profile.role || "student";
  const name = profile.display_name || profile.email || "Angemeldet";
  const isAdmin = role === "admin";
  const isTutor = role === "tutor" || isAdmin;

  TONI_AUTH_PROFILE = profile;
  window.TONI_ACTIVE_PROFILE_ID = profile.id;
  localStorage.setItem("toni_profile_id", profile.id);
  localStorage.setItem("toni_role", role);

  const authName = document.getElementById("auth-user-name");
  const authRole = document.getElementById("auth-user-role");
  const loginBtn = document.getElementById("auth-login-btn");
  const logoutBtn = document.getElementById("auth-logout-btn");

  if(authName) authName.textContent = name;
  if(authRole) authRole.textContent = `${role}${profile.class_name ? " · " + profile.class_name : ""}`;
  if(loginBtn) loginBtn.style.display = "none";
  if(logoutBtn) logoutBtn.style.display = "";

  const greeting = document.querySelector(".topbar-greeting h2");
  if(greeting) greeting.innerHTML = `Hallo ${escapeHtml(String(name).split(" ")[0])}! 👋`;

  const sub = document.querySelector(".topbar-greeting p");
  if(sub) sub.textContent = `${role}${profile.class_name ? " · " + profile.class_name : ""}`;

  document.body.classList.remove("role-student","role-tutor","role-admin");
  document.body.classList.add("role-" + role);

  document.querySelectorAll(".admin-only").forEach(el => { el.style.display = isAdmin ? "" : "none"; el.classList.toggle("visible", isAdmin); });
  document.querySelectorAll(".tutor-only").forEach(el => { el.style.display = isTutor ? "" : "none"; el.classList.toggle("visible", isTutor); });
  document.querySelectorAll(".student-only").forEach(el => { el.style.display = role === "student" ? "" : "none"; });

  const adminPanel = document.getElementById("admin-panel");
  if(adminPanel){ adminPanel.style.display = isAdmin ? "" : "none"; adminPanel.classList.toggle("visible", isAdmin); }

  const groupPanel = document.getElementById("group-panel");
  if(groupPanel){ groupPanel.style.display = isTutor ? "" : "none"; groupPanel.classList.toggle("visible", isTutor); }
}

function toniV12OpenRegistration(profile){
  closeAuthModal?.();
  if(typeof toniClosePasswordModalHard === "function") toniClosePasswordModalHard();

  setTimeout(() => {
    openRegistrationRequiredModal?.();
    const msg = document.getElementById("registration-message");
    if(msg){
      msg.className = "auth-message visible ok";
      msg.innerHTML = "✅ Deine E-Mail-Adresse wurde bestätigt. Bitte vervollständige jetzt dein Profil und lege ein Passwort fest.";
    }
  }, 300);
}

async function toniV12HandleCallback(){
  if(window.TONI_AUTH_CALLBACK_HANDLED) return;
  if(!toniV12HasCallbackParams()) return;

  window.TONI_AUTH_CALLBACK_HANDLED = true;

  try{
    const isRecovery = toniV12IsRecovery();
    const session = await toniV12GetSessionAfterCallback();

    if(!session?.access_token && !window.TONI_DIRECT_SESSION?.access_token){
      throw new Error("Der Link wurde geöffnet, aber es konnte keine Sitzung erstellt werden.");
    }

    const profile = await toniV12LoadOrCreateProfile(session || window.TONI_DIRECT_SESSION);
    toniV12ApplyDashboard(profile);

    const clean = new URL(window.location.href);
    clean.searchParams.delete("code");
    clean.searchParams.delete("type");
    clean.searchParams.delete("token_hash");
    clean.searchParams.delete("registration");
    clean.searchParams.delete("admin_recovery");
    window.history.replaceState({}, "", clean.origin + clean.pathname + (clean.searchParams.toString() ? "?" + clean.searchParams.toString() : ""));

    if(isRecovery){
      openPasswordRequiredModal?.();
      return;
    }

    if(profile.profile_complete !== true){
      toniV12OpenRegistration(profile);
    }else{
      closeAuthModal?.();
      handleJoinLinkAfterLogin?.();
      appendMsg?.("toni", "✅ Anmeldung abgeschlossen.", typeof time === "function" ? time() : "", "desktop");
    }
  }catch(error){
    console.error("TONI V12 Callback Fehler:", error);
    openAuthModal?.();
    setAuthMessage("⚠️ Der Link konnte nicht verarbeitet werden:<br>" + escapeHtml(error.message), "err");
    window.TONI_AUTH_CALLBACK_HANDLED = false;
  }
}

window.sendVerificationMail = async function(email){
  const client = getSupabaseClient();
  const url = new URL(window.location.href);
  url.searchParams.set("registration", "1");

  try{
    const result = await Promise.race([
      client.auth.signInWithOtp({ email, options: { emailRedirectTo: url.toString() } }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Verifizierungs-Mail senden dauert zu lange.")), 15000))
    ]);
    if(result.error) throw result.error;
    setAuthMessage("✅ Verifizierungs-Mail wurde gesendet. Bitte öffne den Link. Danach schließt du deine Registrierung ab.", "ok");
  }catch(error){
    console.error("TONI V12 Verification Mail:", error);
    setAuthMessage("⚠️ Verifizierungs-Mail konnte nicht gesendet werden:<br>" + escapeHtml(error.message), "err");
  }
};

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV12HandleCallback, 100);
  setTimeout(toniV12HandleCallback, 800);
  setTimeout(toniV12HandleCallback, 1800);

  const client = getSupabaseClient?.();
  if(client?.auth?.onAuthStateChange){
    client.auth.onAuthStateChange((event) => {
      if(event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "PASSWORD_RECOVERY"){
        setTimeout(() => {
          window.TONI_AUTH_CALLBACK_HANDLED = false;
          toniV12HandleCallback();
        }, 250);
      }
    });
  }
});

/* =========================================================
   TONI – AUTH V13 / FIX: UNVOLLSTÄNDIGES PROFIL IMMER ÖFFNEN
   =========================================================
   Problem:
   Manche Supabase-Links landen bereits bereinigt auf der Dashboard-URL.
   Dann sind keine ?code=... oder #access_token=... Parameter mehr sichtbar.
   V13 prüft deshalb unabhängig vom Link bei jedem Seitenstart:
   - Gibt es eine aktive Session?
   - Gibt es ein Profil?
   - Ist profile_complete = false?
   Dann öffnet TONI automatisch „Registrierung abschließen“.
   ========================================================= */

window.TONI_V13_PROFILE_CHECK_RUNNING = false;

function toniV13Sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function toniV13GetActiveSession() {
  const client = getSupabaseClient();

  // 1. Falls V12 Callback-Parameter noch da sind, zuerst verarbeiten.
  if (typeof toniV12HandleCallback === "function" && typeof toniV12HasCallbackParams === "function" && toniV12HasCallbackParams()) {
    try {
      window.TONI_AUTH_CALLBACK_HANDLED = false;
      await toniV12HandleCallback();
    } catch (error) {
      console.warn("TONI V13: V12 Callback-Vorverarbeitung fehlgeschlagen:", error);
    }
  }

  // 2. Direkte Session aus V10/V12 lesen.
  try {
    if (typeof toniV10GetDirectSession === "function") {
      const direct = toniV10GetDirectSession();
      if (direct?.access_token) return direct;
    }
  } catch {}

  // 3. Supabase-JS Session mehrfach prüfen.
  for (let i = 0; i < 8; i++) {
    try {
      const { data } = await Promise.race([
        client.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Sessionprüfung Timeout")), 5000))
      ]);

      if (data?.session?.access_token) {
        if (typeof toniV12SaveSession === "function") {
          toniV12SaveSession(data.session);
        } else if (typeof toniV10SaveDirectSession === "function") {
          toniV10SaveDirectSession(data.session);
        }
        return data.session;
      }
    } catch (error) {
      console.warn("TONI V13 Sessionprüfung:", error);
    }

    await toniV13Sleep(450);
  }

  return null;
}

async function toniV13LoadProfile(session) {
  if (typeof toniV12LoadOrCreateProfile === "function") {
    return await toniV12LoadOrCreateProfile(session);
  }

  if (!session?.user?.id) {
    const token = session?.access_token || window.TONI_DIRECT_SESSION?.access_token;
    if (token) {
      const userResponse = await fetch(`${window.SUPABASE_URL}/auth/v1/user`, {
        headers: {
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + token
        }
      });
      if (userResponse.ok) {
        const user = await userResponse.json();
        session.user = user;
      }
    }
  }

  if (!session?.user?.id) return null;

  const token = session.access_token || window.TONI_DIRECT_SESSION?.access_token || window.SUPABASE_ANON_KEY;

  const response = await fetch(
    `${window.SUPABASE_URL}/rest/v1/profiles?id=eq.${session.user.id}&select=id,display_name,email,class_name,role,password_set,profile_complete,force_password_change,first_name,last_name,is_active&limit=1`,
    {
      headers: {
        "apikey": window.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json"
      }
    }
  );

  if (!response.ok) return null;

  const rows = await response.json();
  return rows?.[0] || null;
}

function toniV13ApplyDashboard(profile) {
  if (typeof toniV12ApplyDashboard === "function") {
    toniV12ApplyDashboard(profile);
    return;
  }
  if (typeof toniV10ShowAdminDashboard === "function") {
    toniV10ShowAdminDashboard(profile);
    return;
  }
}

function toniV13OpenRegistration(profile, reason) {
  console.log("TONI V13: öffne Registrierung", reason, profile);

  window.TONI_SUPPRESS_REGISTRATION_MODAL = false;

  closeAuthModal?.();

  if (typeof toniClosePasswordModalHard === "function") {
    toniClosePasswordModalHard();
  }

  setTimeout(() => {
    openRegistrationRequiredModal?.();

    const msg = document.getElementById("registration-message");
    if (msg) {
      msg.className = "auth-message visible ok";
      msg.innerHTML = "✅ Deine E-Mail-Adresse wurde bestätigt. Bitte vervollständige jetzt dein Profil und lege ein Passwort fest.";
    }

    const first = document.getElementById("reg-first-name");
    if (first) first.focus();
  }, 250);
}

async function toniV13CheckIncompleteProfile(reason = "load") {
  if (window.TONI_V13_PROFILE_CHECK_RUNNING) return;
  window.TONI_V13_PROFILE_CHECK_RUNNING = true;

  try {
    const session = await toniV13GetActiveSession();

    if (!session?.access_token) {
      console.log("TONI V13: keine aktive Session bei", reason);
      return;
    }

    const profile = await toniV13LoadProfile(session);

    if (!profile) {
      console.warn("TONI V13: keine Profilzeile gefunden/erzeugt bei", reason);
      return;
    }

    toniV13ApplyDashboard(profile);

    if (profile.profile_complete !== true) {
      toniV13OpenRegistration(profile, reason);
    } else {
      closeAuthModal?.();
      closeRegistrationRequiredModal?.();
      handleJoinLinkAfterLogin?.();
      console.log("TONI V13: Profil vollständig bei", reason, profile);
    }
  } catch (error) {
    console.error("TONI V13 Profilprüfung fehlgeschlagen:", error);
  } finally {
    window.TONI_V13_PROFILE_CHECK_RUNNING = false;
  }
}

// Wichtig: immer prüfen, auch wenn keine Callback-Parameter in der URL stehen.
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => toniV13CheckIncompleteProfile("DOMContentLoaded-0.5s"), 500);
  setTimeout(() => toniV13CheckIncompleteProfile("DOMContentLoaded-1.5s"), 1500);
  setTimeout(() => toniV13CheckIncompleteProfile("DOMContentLoaded-3.5s"), 3500);
  setTimeout(() => toniV13CheckIncompleteProfile("DOMContentLoaded-6s"), 6000);

  const client = getSupabaseClient?.();
  if (client?.auth?.onAuthStateChange) {
    client.auth.onAuthStateChange((event) => {
      if (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED" ||
        event === "PASSWORD_RECOVERY"
      ) {
        setTimeout(() => toniV13CheckIncompleteProfile("auth-" + event), 300);
      }
    });
  }
});

/* =========================================================
   TONI – AUTH V14 / FIX: REGISTRIERUNG DIREKT SPEICHERN
   =========================================================
   Problem:
   Das Fenster "Registrierung abschließen" öffnet, aber client.auth.updateUser()
   hängt bzw. läuft in einen Timeout.

   Lösung:
   - Passwort wird direkt über Supabase Auth REST API gespeichert:
     PUT /auth/v1/user
   - Profil wird direkt über REST PATCH/UPSERT gespeichert.
   - Supabase-JS wird nicht mehr als kritischer Pfad verwendet.
   ========================================================= */

window.TONI_AUTH_V14_DIRECT_SAVE = true;

function toniV14Delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function toniV14FetchJson(url, options = {}, timeoutMs = 15000, label = "Anfrage") {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = await response.text();

    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }

    if (!response.ok) {
      const msg =
        (data && (data.message || data.msg || data.error_description || data.error || data.details)) ||
        text ||
        `HTTP ${response.status}`;
      throw new Error(msg);
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error(label + " dauert zu lange. Bitte Verbindung prüfen und erneut versuchen.");
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function toniV14ReadStoredDirectSession() {
  try {
    const s = window.TONI_DIRECT_SESSION || JSON.parse(localStorage.getItem("toni_direct_session") || "null");
    if (s?.access_token) return s;
  } catch {}
  return null;
}

async function toniV14GetSessionTokenAndUser() {
  // 1. Direkte Session aus unseren bisherigen Flows
  let direct = toniV14ReadStoredDirectSession();

  if (direct?.access_token) {
    try {
      const user = await toniV14FetchJson(
        `${window.SUPABASE_URL}/auth/v1/user`,
        {
          method: "GET",
          headers: {
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + direct.access_token
          }
        },
        10000,
        "Nutzer laden"
      );

      direct.user = user;
      window.TONI_DIRECT_SESSION = direct;
      localStorage.setItem("toni_direct_session", JSON.stringify(direct));

      return {
        accessToken: direct.access_token,
        refreshToken: direct.refresh_token || "",
        user
      };
    } catch (error) {
      console.warn("TONI V14 direkte Session ungültig, versuche Supabase-Session:", error);
    }
  }

  // 2. Supabase-JS Session lesen, aber mit Timeout
  try {
    const client = getSupabaseClient();
    const result = await Promise.race([
      client.auth.getSession(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Session laden dauert zu lange.")), 8000))
    ]);

    if (result?.data?.session?.access_token) {
      const session = result.data.session;

      if (typeof toniV12SaveSession === "function") {
        toniV12SaveSession(session);
      } else if (typeof toniV10SaveDirectSession === "function") {
        toniV10SaveDirectSession(session);
      }

      return {
        accessToken: session.access_token,
        refreshToken: session.refresh_token || "",
        user: session.user
      };
    }
  } catch (error) {
    console.warn("TONI V14 Supabase-Session konnte nicht gelesen werden:", error);
  }

  // 3. Hash-Token aus URL, falls noch vorhanden
  const hash = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
  const accessToken = hash.get("access_token");
  const refreshToken = hash.get("refresh_token");

  if (accessToken) {
    const user = await toniV14FetchJson(
      `${window.SUPABASE_URL}/auth/v1/user`,
      {
        method: "GET",
        headers: {
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + accessToken
        }
      },
      10000,
      "Nutzer laden"
    );

    const directSession = {
      access_token: accessToken,
      refresh_token: refreshToken || "",
      expires_at: Math.floor(Date.now() / 1000) + Number(hash.get("expires_in") || 3600),
      user
    };

    window.TONI_DIRECT_SESSION = directSession;
    localStorage.setItem("toni_direct_session", JSON.stringify(directSession));

    return {
      accessToken,
      refreshToken: refreshToken || "",
      user
    };
  }

  throw new Error("Keine aktive Sitzung gefunden. Bitte öffne den Verifizierungslink erneut oder melde dich neu an.");
}

async function toniV14SavePasswordDirect(accessToken, password) {
  return await toniV14FetchJson(
    `${window.SUPABASE_URL}/auth/v1/user`,
    {
      method: "PUT",
      headers: {
        "apikey": window.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ password })
    },
    15000,
    "Passwort speichern"
  );
}

async function toniV14PatchProfileDirect(accessToken, user, profileData) {
  const patchResult = await toniV14FetchJson(
    `${window.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}`,
    {
      method: "PATCH",
      headers: {
        "apikey": window.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify(profileData)
    },
    15000,
    "Profil speichern"
  );

  if (Array.isArray(patchResult) && patchResult.length > 0) {
    return patchResult[0];
  }

  // Falls die Profilzeile durch Trigger/RLS noch nicht existiert, upsert.
  const upsertResult = await toniV14FetchJson(
    `${window.SUPABASE_URL}/rest/v1/profiles?on_conflict=id`,
    {
      method: "POST",
      headers: {
        "apikey": window.SUPABASE_ANON_KEY,
        "Authorization": "Bearer " + accessToken,
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=representation"
      },
      body: JSON.stringify([{
        id: user.id,
        email: user.email,
        role: "student",
        is_active: true,
        ...profileData
      }])
    },
    15000,
    "Profil anlegen"
  );

  return Array.isArray(upsertResult) ? upsertResult[0] : upsertResult;
}

function toniV14ApplyCompletedProfile(profile) {
  if (!profile) return;

  if (typeof toniV12ApplyDashboard === "function") {
    toniV12ApplyDashboard(profile);
  } else if (typeof toniV10ShowAdminDashboard === "function") {
    toniV10ShowAdminDashboard(profile);
  } else {
    TONI_AUTH_PROFILE = profile;
    localStorage.setItem("toni_profile_id", profile.id);
    localStorage.setItem("toni_role", profile.role || "student");
    window.TONI_ACTIVE_PROFILE_ID = profile.id;
  }
}

// Finale Überschreibung des Buttons "Registrierung abschließen"
window.completeSelfRegistration = async function() {
  const first = document.getElementById("reg-first-name")?.value.trim();
  const last = document.getElementById("reg-last-name")?.value.trim();
  const cls = document.getElementById("reg-class-name")?.value.trim();
  const pw1 = document.getElementById("reg-password")?.value || "";
  const pw2 = document.getElementById("reg-password-repeat")?.value || "";

  const btn = [...document.querySelectorAll("button")]
    .find(b =>
      b.textContent.trim() === "Registrierung abschließen" ||
      b.textContent.trim() === "Speichere Registrierung…" ||
      b.textContent.includes("Registrierung")
    );

  if (!first || !last) {
    setRegistrationMessage("Bitte gib Vorname und Nachname ein.", "err");
    return;
  }

  if (pw1.length < 8) {
    setRegistrationMessage("Das Passwort muss mindestens 8 Zeichen haben.", "err");
    return;
  }

  if (pw1 !== pw2) {
    setRegistrationMessage("Die Passwörter stimmen nicht überein.", "err");
    return;
  }

  try {
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Speichere Registrierung…";
    }

    setRegistrationMessage("1/3 Sitzung wird geprüft …", "ok");
    const { accessToken, user } = await toniV14GetSessionTokenAndUser();

    if (!user?.id || !user?.email) {
      throw new Error("Nutzer konnte nicht eindeutig geladen werden.");
    }

    setRegistrationMessage("2/3 Passwort wird gespeichert …", "ok");
    await toniV14SavePasswordDirect(accessToken, pw1);

    const displayName = `${first} ${last}`.trim();

    // Weg A: institution_id aus dem Einladungslink (?inst=…) übernehmen, damit der neue
    // Student der Institution des einladenden Tutors zugeordnet wird (sonst sieht ihn nur
    // der Admin). Nur setzen, wenn ein gültiger Wert vorliegt.
    const profilePatch = {
      first_name: first,
      last_name: last,
      display_name: displayName,
      class_name: cls || "",
      password_set: true,
      profile_complete: true,
      force_password_change: false,
      updated_at: new Date().toISOString()
    };
    try{
      const inst = new URL(window.location.href).searchParams.get("inst");
      // grobe UUID-Plausibilität, um Müll nicht zu speichern
      if(inst && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(inst)){
        profilePatch.institution_id = inst;
      }
    }catch(e){ console.warn("institution_id aus URL:", e); }

    setRegistrationMessage("3/3 Profil wird gespeichert …", "ok");
    const savedProfile = await toniV14PatchProfileDirect(accessToken, user, profilePatch);

    toniV14ApplyCompletedProfile(savedProfile);

    setRegistrationMessage("✅ Registrierung abgeschlossen.", "ok");

    setTimeout(() => {
      closeRegistrationRequiredModal?.();
      handleJoinLinkAfterLogin?.();
      appendMsg?.("toni", "✅ Deine Registrierung ist abgeschlossen.", typeof time === "function" ? time() : "", "desktop");
    }, 700);

  } catch (error) {
    console.error("TONI V14 Registrierung speichern Fehler:", error);
    setRegistrationMessage(
      "⚠️ Registrierung konnte nicht abgeschlossen werden:<br>" +
      escapeHtml(error.message) +
      "<br><br><small>Bitte öffne den Verifizierungslink erneut, falls die Sitzung abgelaufen ist.</small>",
      "err"
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "Registrierung abschließen";
    }
  }
};

/* TONI V26 – Profilfenster durch Klick auf eigenen Namen */
function toniV26GetProfileData(){
  const profile = window.TONI_AUTH_PROFILE || {};

  let first = profile.first_name || "";
  let last = profile.last_name || "";

  if((!first || !last) && profile.display_name){
    const parts = String(profile.display_name).trim().split(/\s+/);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  const className = profile.class_name || profile.class || "";

  return {
    first: first || "–",
    last: last || "–",
    className: className || "–"
  };
}

function openProfileDataModal(){
  const data = toniV26GetProfileData();

  const firstEl = document.getElementById("profile-data-first");
  const lastEl = document.getElementById("profile-data-last");
  const classEl = document.getElementById("profile-data-class");

  if(firstEl) firstEl.textContent = data.first;
  if(lastEl) lastEl.textContent = data.last;
  if(classEl) classEl.textContent = data.className;

  document.getElementById("profile-data-modal")?.classList.add("open");
}

function closeProfileDataModal(){
  document.getElementById("profile-data-modal")?.classList.remove("open");
}

function installProfileNameClickV26(){
  const nameEl =
    document.getElementById("auth-user-name") ||
    document.querySelector(".auth-user-name") ||
    document.querySelector(".user-name") ||
    document.querySelector(".profile-name");

  if(!nameEl) return;

  if(nameEl.dataset.profileClickV26 === "1") return;

  nameEl.dataset.profileClickV26 = "1";
  nameEl.title = "Meine Daten anzeigen";
  nameEl.setAttribute("role", "button");
  nameEl.setAttribute("tabindex", "0");
  nameEl.addEventListener("click", openProfileDataModal);
  nameEl.addEventListener("keydown", (event) => {
    if(event.key === "Enter" || event.key === " "){
      event.preventDefault();
      openProfileDataModal();
    }
  });
}

// Falls frühere Auth-Funktionen den Namen neu setzen, danach erneut anklicken aktivieren.
["toniV10ShowAdminDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","toniV12ApplyDashboard","toniV23RefreshLearningJourneyHeader"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(installProfileNameClickV26, 80);
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(installProfileNameClickV26, 300);
  setTimeout(installProfileNameClickV26, 1200);
  setTimeout(installProfileNameClickV26, 3000);

  document.addEventListener("keydown", (event) => {
    if(event.key === "Escape"){
      closeProfileDataModal();
    }
  });
});

/* TONI V27 – Profilfenster: Profildaten zuverlässig laden */

window.TONI_V27_PROFILE_CACHE = window.TONI_V27_PROFILE_CACHE || null;

function toniV27SetProfileModalValues(profile){
  profile = profile || {};

  let first = profile.first_name || "";
  let last = profile.last_name || "";
  let cls = profile.class_name || profile.class || "";

  if((!first || !last) && profile.display_name){
    const parts = String(profile.display_name).trim().split(/\s+/).filter(Boolean);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  // Fallback aus sichtbarer Anmeldung oben rechts
  if(!first || !last){
    const nameText = (
      document.getElementById("auth-user-name")?.textContent ||
      document.querySelector(".auth-user-name")?.textContent ||
      ""
    ).trim();

    if(nameText && nameText !== "Profil" && nameText !== "Anmelden"){
      const parts = nameText.split(/\s+/).filter(Boolean);
      if(!first) first = parts[0] || "";
      if(!last) last = parts.slice(1).join(" ") || "";
    }
  }

  if(!cls){
    const roleText = (
      document.getElementById("auth-user-role")?.textContent ||
      document.querySelector(".auth-user-role")?.textContent ||
      ""
    ).trim();

    if(roleText.includes("·")){
      cls = roleText.split("·").slice(1).join("·").trim();
    }else{
      const match = roleText.match(/\b(BS|BF|HBF|BVJ|ET|EEG|FOS|BOS|FS)[A-Za-zÄÖÜäöüß0-9\s-]*\b/i);
      if(match) cls = match[0].trim();
    }
  }

  const firstEl = document.getElementById("profile-data-first");
  const lastEl = document.getElementById("profile-data-last");
  const classEl = document.getElementById("profile-data-class");

  if(firstEl) firstEl.textContent = first || "–";
  if(lastEl) lastEl.textContent = last || "–";
  if(classEl) classEl.textContent = cls || "–";
}

async function toniV27GetAccessToken(){
  try{
    if(typeof getAuthAccessToken === "function"){
      const token = await getAuthAccessToken();
      if(token) return token;
    }
  }catch{}

  try{
    const direct = window.TONI_DIRECT_SESSION || JSON.parse(localStorage.getItem("toni_direct_session") || "null");
    if(direct?.access_token) return direct.access_token;
  }catch{}

  try{
    const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
    if(client?.auth?.getSession){
      const result = await Promise.race([
        client.auth.getSession(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Session Timeout")), 5000))
      ]);
      if(result?.data?.session?.access_token) return result.data.session.access_token;
    }
  }catch{}

  return null;
}

async function toniV27FetchFreshProfile(){
  let profile = {
    ...(window.TONI_AUTH_PROFILE || {}),
    ...(window.TONI_V27_PROFILE_CACHE || {})
  };

  const token = await toniV27GetAccessToken();

  // Falls keine ID/E-Mail im globalen Profil steht, Nutzer aus Auth laden.
  if(token && (!profile.id || !profile.email)){
    try{
      const userRes = await fetch(`${window.SUPABASE_URL}/auth/v1/user`, {
        headers:{
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + token
        }
      });
      if(userRes.ok){
        const user = await userRes.json();
        profile.id = profile.id || user.id;
        profile.email = profile.email || user.email;
      }
    }catch(error){
      console.warn("TONI V27: Auth-User konnte nicht geladen werden:", error);
    }
  }

  // Profil frisch aus Supabase laden.
  try{
    let rows = null;

    if(typeof supabaseRequest === "function"){
      if(profile.id){
        rows = await supabaseRequest(
          `profiles?id=eq.${encodeURIComponent(profile.id)}&select=id,email,display_name,first_name,last_name,class_name,role&limit=1`
        );
      }

      if((!rows || !rows.length) && profile.email){
        rows = await supabaseRequest(
          `profiles?email=eq.${encodeURIComponent(String(profile.email).toLowerCase())}&select=id,email,display_name,first_name,last_name,class_name,role&limit=1`
        );
      }
    }else if(token){
      let url = null;
      if(profile.id){
        url = `${window.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}&select=id,email,display_name,first_name,last_name,class_name,role&limit=1`;
      }else if(profile.email){
        url = `${window.SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(String(profile.email).toLowerCase())}&select=id,email,display_name,first_name,last_name,class_name,role&limit=1`;
      }

      if(url){
        const res = await fetch(url, {
          headers:{
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + token
          }
        });
        if(res.ok) rows = await res.json();
      }
    }

    if(rows && rows[0]){
      profile = {...profile, ...rows[0]};
    }
  }catch(error){
    console.warn("TONI V27: Profil konnte nicht frisch geladen werden:", error);
  }

  window.TONI_V27_PROFILE_CACHE = profile;
  window.TONI_AUTH_PROFILE = {...(window.TONI_AUTH_PROFILE || {}), ...profile};

  return profile;
}

async function openProfileDataModalV27(){
  document.getElementById("profile-data-modal")?.classList.add("open");

  // Erst sofort Fallback-Werte anzeigen, dann frische Daten nachladen.
  toniV27SetProfileModalValues(window.TONI_AUTH_PROFILE || window.TONI_V27_PROFILE_CACHE || {});

  try{
    const fresh = await toniV27FetchFreshProfile();
    toniV27SetProfileModalValues(fresh);
  }catch(error){
    console.warn("TONI V27: Profildaten konnten nicht vollständig aktualisiert werden:", error);
  }
}

// Globale Funktion ebenfalls ersetzen, falls Buttons/Handler sie direkt aufrufen.
window.openProfileDataModal = openProfileDataModalV27;

// Synchronous Fallback für den alten V26-Clickhandler:
window.toniV26GetProfileData = function(){
  const profile = window.TONI_AUTH_PROFILE || window.TONI_V27_PROFILE_CACHE || {};
  let first = profile.first_name || "";
  let last = profile.last_name || "";
  let className = profile.class_name || profile.class || "";

  if((!first || !last) && profile.display_name){
    const parts = String(profile.display_name).trim().split(/\s+/).filter(Boolean);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  if(!first || !last){
    const nameText = (document.getElementById("auth-user-name")?.textContent || "").trim();
    const parts = nameText.split(/\s+/).filter(Boolean);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  if(!className){
    const roleText = (document.getElementById("auth-user-role")?.textContent || "").trim();
    if(roleText.includes("·")) className = roleText.split("·").slice(1).join("·").trim();
  }

  // Im Hintergrund frische Daten nachladen und nachtragen.
  setTimeout(() => openProfileDataModalV27(), 80);

  return { first: first || "–", last: last || "–", className: className || "–" };
};

function installProfileNameClickV27(){
  const nameEl =
    document.getElementById("auth-user-name") ||
    document.querySelector(".auth-user-name") ||
    document.querySelector(".user-name") ||
    document.querySelector(".profile-name");

  if(!nameEl) return;

  nameEl.title = "Meine Daten anzeigen";
  nameEl.style.cursor = "pointer";
}

// Capture-Handler verhindert, dass alte Clickhandler zuerst mit leeren Daten arbeiten.
document.addEventListener("click", (event) => {
  const target = event.target.closest?.("#auth-user-name,.auth-user-name,.user-name,.profile-name");
  if(!target) return;

  event.preventDefault();
  event.stopPropagation();
  event.stopImmediatePropagation();
  openProfileDataModalV27();
}, true);

document.addEventListener("keydown", (event) => {
  const target = event.target.closest?.("#auth-user-name,.auth-user-name,.user-name,.profile-name");
  if(!target) return;

  if(event.key === "Enter" || event.key === " "){
    event.preventDefault();
    event.stopPropagation();
    openProfileDataModalV27();
  }
}, true);

["toniV10ShowAdminDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","applyRoleUI"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(() => {
        installProfileNameClickV27();
        toniV27FetchFreshProfile().catch(() => {});
      }, 120);
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(installProfileNameClickV27, 300);
  setTimeout(() => toniV27FetchFreshProfile().catch(() => {}), 1200);
  setTimeout(installProfileNameClickV27, 2500);
});

/* TONI V28 – Profilfenster bei Abmeldung/Neuanmeldung zurücksetzen */

window.TONI_V28_LAST_PROFILE_KEY = window.TONI_V28_LAST_PROFILE_KEY || "";

function toniV28ProfileKey(profile){
  profile = profile || window.TONI_AUTH_PROFILE || {};
  return String(profile.id || profile.email || localStorage.getItem("toni_profile_id") || "").toLowerCase();
}

function toniV28ClearProfileModalValues(){
  const firstEl = document.getElementById("profile-data-first");
  const lastEl = document.getElementById("profile-data-last");
  const classEl = document.getElementById("profile-data-class");

  if(firstEl) firstEl.textContent = "–";
  if(lastEl) lastEl.textContent = "–";
  if(classEl) classEl.textContent = "–";
}

function toniV28ResetProfileCache(){
  window.TONI_V27_PROFILE_CACHE = null;
  window.TONI_V28_LAST_PROFILE_KEY = "";
  toniV28ClearProfileModalValues();
}

function toniV28RefreshProfileIdentity(){
  const key = toniV28ProfileKey();

  if(key && window.TONI_V28_LAST_PROFILE_KEY && key !== window.TONI_V28_LAST_PROFILE_KEY){
    window.TONI_V27_PROFILE_CACHE = null;
    toniV28ClearProfileModalValues();
  }

  if(key){
    window.TONI_V28_LAST_PROFILE_KEY = key;
  }
}

const TONI_V28_ORIGINAL_OPEN_PROFILE_MODAL = window.openProfileDataModal;
window.openProfileDataModal = async function(){
  toniV28RefreshProfileIdentity();
  toniV28ClearProfileModalValues();

  if(typeof openProfileDataModalV27 === "function"){
    return openProfileDataModalV27();
  }

  if(typeof TONI_V28_ORIGINAL_OPEN_PROFILE_MODAL === "function"){
    return TONI_V28_ORIGINAL_OPEN_PROFILE_MODAL.apply(this, arguments);
  }
};

if(typeof window.openProfileDataModalV27 === "function"){
  const TONI_V28_ORIGINAL_OPEN_PROFILE_MODAL_V27 = window.openProfileDataModalV27;
  window.openProfileDataModalV27 = async function(){
    toniV28RefreshProfileIdentity();
    toniV28ClearProfileModalValues();
    return TONI_V28_ORIGINAL_OPEN_PROFILE_MODAL_V27.apply(this, arguments);
  };
}

// Bei Abmeldung: Cache und Felder sofort löschen.
if(typeof window.logoutUser === "function"){
  const TONI_V28_ORIGINAL_LOGOUT = window.logoutUser;
  window.logoutUser = async function(){
    toniV28ResetProfileCache();
    const result = await TONI_V28_ORIGINAL_LOGOUT.apply(this, arguments);
    toniV28ResetProfileCache();
    return result;
  };
}

if(typeof window.signOut === "function"){
  const TONI_V28_ORIGINAL_SIGNOUT = window.signOut;
  window.signOut = async function(){
    toniV28ResetProfileCache();
    const result = await TONI_V28_ORIGINAL_SIGNOUT.apply(this, arguments);
    toniV28ResetProfileCache();
    return result;
  };
}

// Logout-Button direkt abfangen, falls er eine andere Funktion nutzt.
document.addEventListener("click", (event) => {
  const el = event.target.closest?.("button,a,span");
  if(!el) return;

  const text = (el.textContent || "").trim().toLowerCase();
  const id = (el.id || "").toLowerCase();
  const cls = (el.className || "").toString().toLowerCase();

  if(text.includes("abmelden") || id.includes("logout") || cls.includes("logout")){
    toniV28ResetProfileCache();
  }
}, true);

// Bei Login/Profile-Wechsel: alte Felder löschen, danach Profil neu laden.
["toniV10ShowAdminDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","applyRoleUI"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const before = window.TONI_V28_LAST_PROFILE_KEY;
      const result = original.apply(this, args);

      setTimeout(() => {
        const now = toniV28ProfileKey();
        if(before && now && before !== now){
          window.TONI_V27_PROFILE_CACHE = null;
          toniV28ClearProfileModalValues();
        }
        if(now) window.TONI_V28_LAST_PROFILE_KEY = now;

        if(typeof toniV27FetchFreshProfile === "function"){
          toniV27FetchFreshProfile().then(profile => {
            window.TONI_V28_LAST_PROFILE_KEY = toniV28ProfileKey(profile);
          }).catch(() => {});
        }
      }, 120);

      return result;
    };
  }
});

// Supabase-Auth-Events beobachten.
window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    try{
      const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
      if(client?.auth?.onAuthStateChange && !window.TONI_V28_AUTH_LISTENER_INSTALLED){
        window.TONI_V28_AUTH_LISTENER_INSTALLED = true;

        client.auth.onAuthStateChange((event, session) => {
          if(event === "SIGNED_OUT"){
            toniV28ResetProfileCache();
            return;
          }

          if(event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED"){
            const incomingKey = String(session?.user?.id || session?.user?.email || "").toLowerCase();
            if(incomingKey && window.TONI_V28_LAST_PROFILE_KEY && incomingKey !== window.TONI_V28_LAST_PROFILE_KEY){
              window.TONI_V27_PROFILE_CACHE = null;
              toniV28ClearProfileModalValues();
            }
            if(incomingKey) window.TONI_V28_LAST_PROFILE_KEY = incomingKey;

            if(typeof toniV27FetchFreshProfile === "function"){
              toniV27FetchFreshProfile().then(profile => {
                window.TONI_V28_LAST_PROFILE_KEY = toniV28ProfileKey(profile);
              }).catch(() => {});
            }
          }
        });
      }
    }catch(error){
      console.warn("TONI V28 Auth-Listener konnte nicht installiert werden:", error);
    }
  }, 700);

  setTimeout(toniV28RefreshProfileIdentity, 1200);
});

/* TONI V29 – Vorname und Nachname im Profilfenster bearbeiten */

window.TONI_V29_PROFILE_EDITING = false;

function toniV29Escape(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function toniV29CurrentProfile(){
  return {
    ...(window.TONI_AUTH_PROFILE || {}),
    ...(window.TONI_V27_PROFILE_CACHE || {})
  };
}

function toniV29NameParts(profile){
  profile = profile || toniV29CurrentProfile();

  let first = profile.first_name || "";
  let last = profile.last_name || "";

  if((!first || !last) && profile.display_name){
    const parts = String(profile.display_name).trim().split(/\s+/).filter(Boolean);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  if(!first || !last){
    const nameText = (document.getElementById("auth-user-name")?.textContent || "").trim();
    const parts = nameText.split(/\s+/).filter(Boolean);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  return { first, last };
}

function toniV29RenderValueBox(id, value, editable){
  const el = document.getElementById(id);
  if(!el) return;

  if(editable){
    el.classList.add("editable-v29");
    el.innerHTML = `
      <span class="profile-data-text-v29">${toniV29Escape(value || "–")}</span>
      <button class="profile-edit-name-btn-v29" type="button" onclick="toniV29OpenNameEditor()" title="Vorname und Nachname bearbeiten" aria-label="Vorname und Nachname bearbeiten">✎</button>
    `;
  }else{
    el.classList.remove("editable-v29");
    el.textContent = value || "–";
  }
}

function toniV29RenderProfileValues(profile){
  profile = profile || toniV29CurrentProfile();

  const names = toniV29NameParts(profile);
  const cls = profile.class_name || profile.class || "–";

  toniV29RenderValueBox("profile-data-first", names.first || "–", true);
  toniV29RenderValueBox("profile-data-last", names.last || "–", true);
  toniV29RenderValueBox("profile-data-class", cls || "–", false);
}

function toniV29EnsureEditForm(){
  const body = document.querySelector("#profile-data-modal .profile-data-body");
  if(!body) return null;

  let form = document.getElementById("profile-edit-form-v29");
  if(form) return form;

  form = document.createElement("div");
  form.id = "profile-edit-form-v29";
  form.className = "profile-edit-form-v29 hidden";
  form.innerHTML = `
    <div class="lr-form-group">
      <label class="lr-form-label" for="profile-edit-first-v29">Vorname</label>
      <input class="lr-form-input" id="profile-edit-first-v29" placeholder="Vorname"/>
    </div>
    <div class="lr-form-group">
      <label class="lr-form-label" for="profile-edit-last-v29">Nachname</label>
      <input class="lr-form-input" id="profile-edit-last-v29" placeholder="Nachname"/>
    </div>
    <div class="profile-edit-status-v29 hidden" id="profile-edit-status-v29"></div>
    <div class="profile-edit-actions-v29">
      <button class="lr-secondary-btn" type="button" onclick="toniV29CancelNameEditor()">Abbrechen</button>
      <button class="lr-primary-btn" type="button" id="profile-edit-save-btn-v29" onclick="toniV29SaveProfileNames()">Namen speichern</button>
    </div>
  `;
  body.appendChild(form);
  return form;
}

function toniV29SetEditStatus(message, type=""){
  const status = document.getElementById("profile-edit-status-v29");
  if(!status) return;
  if(!message){
    status.className = "profile-edit-status-v29 hidden";
    status.textContent = "";
    return;
  }
  status.className = "profile-edit-status-v29 " + type;
  status.innerHTML = message;
}

function toniV29OpenNameEditor(){
  const form = toniV29EnsureEditForm();
  const names = toniV29NameParts();

  document.getElementById("profile-edit-first-v29").value = names.first || "";
  document.getElementById("profile-edit-last-v29").value = names.last || "";

  window.TONI_V29_PROFILE_EDITING = true;
  form?.classList.remove("hidden");
  toniV29SetEditStatus("");
  setTimeout(() => document.getElementById("profile-edit-first-v29")?.focus(), 80);
}

function toniV29CancelNameEditor(){
  window.TONI_V29_PROFILE_EDITING = false;
  document.getElementById("profile-edit-form-v29")?.classList.add("hidden");
  toniV29SetEditStatus("");
}

async function toniV29SaveProfileNames(){
  const first = document.getElementById("profile-edit-first-v29")?.value.trim() || "";
  const last = document.getElementById("profile-edit-last-v29")?.value.trim() || "";

  if(!first || !last){
    toniV29SetEditStatus("Bitte gib Vorname und Nachname ein.", "err");
    return;
  }

  const btn = document.getElementById("profile-edit-save-btn-v29");

  try{
    if(btn){
      btn.disabled = true;
      btn.textContent = "Speichere …";
    }

    toniV29SetEditStatus("Namen werden gespeichert …");

    let saved = null;

    if(typeof supabaseRequest === "function"){
      saved = await supabaseRequest("rpc/update_my_profile_names", {
        method: "POST",
        body: JSON.stringify({
          p_first_name: first,
          p_last_name: last
        })
      });
    }else{
      const token = typeof toniV27GetAccessToken === "function" ? await toniV27GetAccessToken() : null;
      const profile = toniV29CurrentProfile();
      if(!token || !profile.id) throw new Error("Keine aktive Sitzung gefunden.");

      const response = await fetch(`${window.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}`, {
        method: "PATCH",
        headers: {
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          first_name: first,
          last_name: last,
          display_name: `${first} ${last}`,
          updated_at: new Date().toISOString()
        })
      });

      if(!response.ok){
        const text = await response.text();
        throw new Error(text || "Profil konnte nicht gespeichert werden.");
      }

      const rows = await response.json();
      saved = rows?.[0] || null;
    }

    const profileUpdate = {
      ...(window.TONI_AUTH_PROFILE || {}),
      ...(window.TONI_V27_PROFILE_CACHE || {}),
      ...(saved || {}),
      first_name: first,
      last_name: last,
      display_name: `${first} ${last}`
    };

    window.TONI_AUTH_PROFILE = profileUpdate;
    window.TONI_V27_PROFILE_CACHE = profileUpdate;

    const nameEl = document.getElementById("auth-user-name");
    if(nameEl) nameEl.textContent = `${first} ${last}`;

    const greeting = document.querySelector(".topbar-greeting h2");
    if(greeting) greeting.innerHTML = `Hallo ${toniV29Escape(first)}! 👋`;

    toniV29RenderProfileValues(profileUpdate);
    toniV29SetEditStatus("✅ Namen wurden gespeichert.", "ok");

    setTimeout(() => {
      toniV29CancelNameEditor();
    }, 700);

  }catch(error){
    console.error("TONI V29 Namen speichern:", error);
    toniV29SetEditStatus("⚠️ Namen konnten nicht gespeichert werden:<br>" + toniV29Escape(error.message), "err");
  }finally{
    if(btn){
      btn.disabled = false;
      btn.textContent = "Namen speichern";
    }
  }
}

// Bestehende V27-Anzeige überschreiben, damit die kleinen Bearbeiten-Buttons erhalten bleiben.
window.toniV27SetProfileModalValues = function(profile){
  if(window.TONI_V29_PROFILE_EDITING) return;
  toniV29RenderProfileValues(profile);
};

// Öffnen-Funktion erweitern: Formular vorbereiten und aktuelle Daten anzeigen.
const TONI_V29_ORIGINAL_OPEN_PROFILE_MODAL = window.openProfileDataModal;
window.openProfileDataModal = async function(){
  toniV29EnsureEditForm();
  toniV29RenderProfileValues();

  if(typeof openProfileDataModalV27 === "function"){
    await openProfileDataModalV27();
  }else if(typeof TONI_V29_ORIGINAL_OPEN_PROFILE_MODAL === "function"){
    await TONI_V29_ORIGINAL_OPEN_PROFILE_MODAL.apply(this, arguments);
  }else{
    document.getElementById("profile-data-modal")?.classList.add("open");
  }

  toniV29EnsureEditForm();
  if(typeof toniV27FetchFreshProfile === "function"){
    try{
      const fresh = await toniV27FetchFreshProfile();
      toniV29RenderProfileValues(fresh);
    }catch{}
  }else{
    toniV29RenderProfileValues();
  }
};

// Wenn V27 direkt aufgerufen wird, Werte danach ebenfalls mit Buttons darstellen.
if(typeof window.openProfileDataModalV27 === "function"){
  const TONI_V29_ORIGINAL_OPEN_PROFILE_MODAL_V27 = window.openProfileDataModalV27;
  window.openProfileDataModalV27 = async function(){
    const result = await TONI_V29_ORIGINAL_OPEN_PROFILE_MODAL_V27.apply(this, arguments);
    toniV29EnsureEditForm();
    toniV29RenderProfileValues(window.TONI_V27_PROFILE_CACHE || window.TONI_AUTH_PROFILE || {});
    return result;
  };
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV29EnsureEditForm, 300);
});

/* TONI V31 – Profilbild in Kreisform anzeigen, aufnehmen und im Profil speichern */

window.TONI_V31_AVATAR_STREAM = null;
window.TONI_V31_AVATAR_DATA_URL = "";
window.TONI_V31_ORIGINAL_FETCH_PROFILE = window.TONI_V31_ORIGINAL_FETCH_PROFILE || window.toniV27FetchFreshProfile;

function toniV31Escape(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function toniV31Profile(){
  return {
    ...(window.TONI_AUTH_PROFILE || {}),
    ...(window.TONI_V27_PROFILE_CACHE || {})
  };
}

function toniV31Initials(profile){
  profile = profile || toniV31Profile();
  let first = profile.first_name || "";
  let last = profile.last_name || "";

  if((!first || !last) && profile.display_name){
    const parts = String(profile.display_name).trim().split(/\s+/).filter(Boolean);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  return ((first[0] || "") + (last[0] || "")).toUpperCase() || "👤";
}

function toniV31AvatarUrl(profile){
  profile = profile || toniV31Profile();
  return profile.avatar_data_url || profile.avatar_url || "";
}

function toniV31EnsureAvatarSection(){
  const body = document.querySelector("#profile-data-modal .profile-data-body");
  if(!body) return null;

  let section = document.getElementById("profile-avatar-section-v31");
  if(section) return section;

  section = document.createElement("div");
  section.className = "profile-avatar-section-v31";
  section.id = "profile-avatar-section-v31";
  section.innerHTML = `
    <div class="profile-avatar-circle-v31" id="profile-avatar-circle-v31"></div>
    <div class="profile-avatar-info-v31">
      <div class="profile-avatar-title-v31">Profilbild</div>
      <div class="profile-avatar-sub-v31">Dein Profilbild wird fest in deinem TONI-Profil gespeichert.</div>
      <div class="profile-avatar-actions-v31">
        <button class="lr-secondary-btn" type="button" onclick="toniV31OpenAvatarCamera()">Profilbild ändern</button>
      </div>
    </div>
  `;

  const grid = body.querySelector(".profile-data-grid");
  if(grid) body.insertBefore(section, grid);
  else body.prepend(section);

  return section;
}

function toniV31RenderAvatar(profile){
  toniV31EnsureAvatarSection();

  const circle = document.getElementById("profile-avatar-circle-v31");
  if(!circle) return;

  const avatar = toniV31AvatarUrl(profile);
  if(avatar){
    circle.innerHTML = `<img src="${avatar}" alt="Profilbild"/>`;
  }else{
    circle.innerHTML = `<div class="profile-avatar-placeholder-v31">${toniV31Escape(toniV31Initials(profile))}</div>`;
  }
}

async function toniV31FetchFreshProfileWithAvatar(){
  let profile = toniV31Profile();

  try{
    let token = null;
    if(typeof toniV27GetAccessToken === "function"){
      token = await toniV27GetAccessToken();
    }else if(typeof getAuthAccessToken === "function"){
      token = await getAuthAccessToken();
    }

    if(token && (!profile.id || !profile.email)){
      const userRes = await fetch(`${window.SUPABASE_URL}/auth/v1/user`, {
        headers:{
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + token
        }
      });
      if(userRes.ok){
        const user = await userRes.json();
        profile.id = profile.id || user.id;
        profile.email = profile.email || user.email;
      }
    }

    let rows = null;
    const select = "id,email,display_name,first_name,last_name,class_name,role,avatar_data_url";

    if(typeof supabaseRequest === "function"){
      if(profile.id){
        rows = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(profile.id)}&select=${select}&limit=1`);
      }
      if((!rows || !rows.length) && profile.email){
        rows = await supabaseRequest(`profiles?email=eq.${encodeURIComponent(String(profile.email).toLowerCase())}&select=${select}&limit=1`);
      }
    }else if(token){
      let url = null;
      if(profile.id){
        url = `${window.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}&select=${select}&limit=1`;
      }else if(profile.email){
        url = `${window.SUPABASE_URL}/rest/v1/profiles?email=eq.${encodeURIComponent(String(profile.email).toLowerCase())}&select=${select}&limit=1`;
      }

      if(url){
        const res = await fetch(url, {
          headers:{
            "apikey": window.SUPABASE_ANON_KEY,
            "Authorization": "Bearer " + token
          }
        });
        if(res.ok) rows = await res.json();
      }
    }

    if(rows && rows[0]){
      profile = {...profile, ...rows[0]};
    }
  }catch(error){
    console.warn("TONI V31: Profil mit Profilbild konnte nicht frisch geladen werden:", error);
  }

  window.TONI_AUTH_PROFILE = {...(window.TONI_AUTH_PROFILE || {}), ...profile};
  window.TONI_V27_PROFILE_CACHE = {...(window.TONI_V27_PROFILE_CACHE || {}), ...profile};

  return profile;
}

// V27-Fetch erweitern, damit avatar_data_url künftig immer mitgeladen wird.
window.toniV27FetchFreshProfile = async function(){
  return await toniV31FetchFreshProfileWithAvatar();
};

function toniV31SetAvatarStatus(message, type=""){
  const el = document.getElementById("avatar-status-v31");
  if(!el) return;
  el.className = "avatar-status-v31" + (type ? " " + type : "");
  el.innerHTML = message;
}

function toniV31OpenAvatarCamera(){
  document.getElementById("avatar-camera-modal-v31")?.classList.add("open");
  window.TONI_V31_AVATAR_DATA_URL = "";
  const preview = document.getElementById("avatar-preview-v31");
  if(preview) preview.classList.remove("visible");
  toniV31SetAvatarStatus("Klicke auf „Kamera starten“.");
}

async function toniV31StartAvatarCamera(){
  try{
    if(!navigator.mediaDevices?.getUserMedia){
      throw new Error("Dieser Browser erlaubt keinen Kamerazugriff.");
    }

    toniV31StopAvatarCamera();

    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "user",
        width: { ideal: 720 },
        height: { ideal: 720 }
      },
      audio: false
    });

    window.TONI_V31_AVATAR_STREAM = stream;
    const video = document.getElementById("profile-avatar-video-v31");
    if(video){
      video.srcObject = stream;
      await video.play();
    }

    toniV31SetAvatarStatus("Kamera aktiv. Richte dein Gesicht mittig aus und klicke auf „Foto aufnehmen“.", "ok");
  }catch(error){
    console.error("TONI V31 Kamera starten:", error);
    toniV31SetAvatarStatus("⚠️ Kamera konnte nicht gestartet werden:<br>" + toniV31Escape(error.message), "err");
  }
}

function toniV31StopAvatarCamera(){
  if(window.TONI_V31_AVATAR_STREAM){
    window.TONI_V31_AVATAR_STREAM.getTracks().forEach(track => track.stop());
    window.TONI_V31_AVATAR_STREAM = null;
  }

  const video = document.getElementById("profile-avatar-video-v31");
  if(video) video.srcObject = null;
}

function toniV31CaptureAvatarPhoto(){
  try{
    const video = document.getElementById("profile-avatar-video-v31");
    const canvas = document.getElementById("profile-avatar-canvas-v31");

    if(!video || !canvas || video.readyState < 2){
      throw new Error("Die Kamera ist noch nicht bereit.");
    }

    const size = 160; // V110.2: Profilbild auf Anzeigegroesse verkleinert (vorher 420).
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const side = Math.min(vw, vh);
    const sx = Math.floor((vw - side) / 2);
    const sy = Math.floor((vh - side) / 2);

    canvas.width = size;
    canvas.height = size;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);

    window.TONI_V31_AVATAR_DATA_URL = canvas.toDataURL("image/jpeg", 0.75);

    const preview = document.getElementById("avatar-preview-v31");
    const img = document.getElementById("avatar-preview-img-v31");
    if(img) img.src = window.TONI_V31_AVATAR_DATA_URL;
    if(preview) preview.classList.add("visible");

    toniV31SetAvatarStatus("✅ Foto aufgenommen. Klicke jetzt auf „Profilbild speichern“.", "ok");
  }catch(error){
    console.error("TONI V31 Foto aufnehmen:", error);
    toniV31SetAvatarStatus("⚠️ Foto konnte nicht aufgenommen werden:<br>" + toniV31Escape(error.message), "err");
  }
}

async function toniV31SaveAvatarPhoto(){
  if(!window.TONI_V31_AVATAR_DATA_URL){
    toniV31SetAvatarStatus("Bitte nimm zuerst ein Foto auf.", "err");
    return;
  }

  try{
    toniV31SetAvatarStatus("Profilbild wird gespeichert …");

    let saved = null;

    if(typeof supabaseRequest === "function"){
      saved = await supabaseRequest("rpc/update_my_profile_avatar", {
        method: "POST",
        body: JSON.stringify({
          p_avatar_data_url: window.TONI_V31_AVATAR_DATA_URL
        })
      });
    }else{
      const token = typeof toniV27GetAccessToken === "function" ? await toniV27GetAccessToken() : null;
      const profile = toniV31Profile();

      if(!token || !profile.id){
        throw new Error("Keine aktive Sitzung gefunden.");
      }

      const response = await fetch(`${window.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}`, {
        method: "PATCH",
        headers:{
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          avatar_data_url: window.TONI_V31_AVATAR_DATA_URL,
          updated_at: new Date().toISOString()
        })
      });

      if(!response.ok){
        const text = await response.text();
        throw new Error(text || "Profilbild konnte nicht gespeichert werden.");
      }

      const rows = await response.json();
      saved = rows?.[0] || null;
    }

    const updated = {
      ...toniV31Profile(),
      ...(saved || {}),
      avatar_data_url: window.TONI_V31_AVATAR_DATA_URL
    };

    window.TONI_AUTH_PROFILE = updated;
    window.TONI_V27_PROFILE_CACHE = updated;

    toniV31RenderAvatar(updated);
    toniV31SetAvatarStatus("✅ Profilbild wurde gespeichert.", "ok");

    setTimeout(() => {
      toniV31CloseAvatarCamera();
    }, 800);
  }catch(error){
    console.error("TONI V31 Profilbild speichern:", error);
    toniV31SetAvatarStatus("⚠️ Profilbild konnte nicht gespeichert werden:<br>" + toniV31Escape(error.message), "err");
  }
}

function toniV31CloseAvatarCamera(){
  toniV31StopAvatarCamera();
  document.getElementById("avatar-camera-modal-v31")?.classList.remove("open");
}

const TONI_V31_ORIGINAL_OPEN_PROFILE = window.openProfileDataModal;
window.openProfileDataModal = async function(){
  toniV31EnsureAvatarSection();
  toniV31RenderAvatar();

  if(typeof TONI_V31_ORIGINAL_OPEN_PROFILE === "function"){
    await TONI_V31_ORIGINAL_OPEN_PROFILE.apply(this, arguments);
  }else{
    document.getElementById("profile-data-modal")?.classList.add("open");
  }

  toniV31EnsureAvatarSection();

  try{
    const fresh = await toniV31FetchFreshProfileWithAvatar();
    toniV31RenderAvatar(fresh);
  }catch{
    toniV31RenderAvatar();
  }
};

if(typeof window.openProfileDataModalV27 === "function"){
  const TONI_V31_ORIGINAL_OPEN_PROFILE_V27 = window.openProfileDataModalV27;
  window.openProfileDataModalV27 = async function(){
    toniV31EnsureAvatarSection();
    const result = await TONI_V31_ORIGINAL_OPEN_PROFILE_V27.apply(this, arguments);
    const fresh = await toniV31FetchFreshProfileWithAvatar();
    toniV31RenderAvatar(fresh);
    return result;
  };
}

["toniV10ShowAdminDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","applyRoleUI"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(() => {
        toniV31EnsureAvatarSection();
        toniV31FetchFreshProfileWithAvatar().then(toniV31RenderAvatar).catch(() => toniV31RenderAvatar());
      }, 150);
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    toniV31EnsureAvatarSection();
    toniV31FetchFreshProfileWithAvatar().then(toniV31RenderAvatar).catch(() => toniV31RenderAvatar());
  }, 900);

  document.addEventListener("keydown", (event) => {
    if(event.key === "Escape"){
      toniV31CloseAvatarCamera();
    }
  });
});

/* TONI V32 – Obere Profilanzeige durch Profilbild ersetzen */

function toniV32Profile(){
  return {
    ...(window.TONI_AUTH_PROFILE || {}),
    ...(window.TONI_V27_PROFILE_CACHE || {})
  };
}

function toniV32Initials(profile){
  profile = profile || toniV32Profile();

  let first = profile.first_name || "";
  let last = profile.last_name || "";

  if((!first || !last) && profile.display_name){
    const parts = String(profile.display_name).trim().split(/\s+/).filter(Boolean);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  if(!first || !last){
    const visibleName = (document.getElementById("auth-user-name")?.textContent || "").trim();
    const parts = visibleName.split(/\s+/).filter(Boolean);
    if(!first) first = parts[0] || "";
    if(!last) last = parts.slice(1).join(" ") || "";
  }

  const initials = ((first[0] || "") + (last[0] || "")).toUpperCase();
  return initials || "👤";
}

function toniV32AvatarUrl(profile){
  profile = profile || toniV32Profile();
  return profile.avatar_data_url || profile.avatar_url || "";
}

function toniV32FindProfileHost(){
  const nameEl = document.getElementById("auth-user-name");
  const roleEl = document.getElementById("auth-user-role");

  if(nameEl){
    return nameEl.parentElement || nameEl.closest("div");
  }

  if(roleEl){
    return roleEl.parentElement || roleEl.closest("div");
  }

  const logoutBtn =
    document.getElementById("auth-logout-btn") ||
    [...document.querySelectorAll("button")].find(b => (b.textContent || "").trim().toLowerCase().includes("abmelden"));

  if(logoutBtn){
    return logoutBtn.parentElement || logoutBtn.closest("div");
  }

  return null;
}

function toniV32RenderTopAvatar(profile){
  profile = profile || toniV32Profile();

  const nameEl = document.getElementById("auth-user-name");
  const roleEl = document.getElementById("auth-user-role");

  const isLoggedIn =
    !!(profile.id || profile.email) ||
    (nameEl && !["profil", "anmelden", ""].includes((nameEl.textContent || "").trim().toLowerCase()));

  if(!isLoggedIn) return;

  const host = toniV32FindProfileHost();
  if(!host) return;

  host.classList.add("toni-profile-host-v32");

  if(nameEl) nameEl.classList.add("toni-profile-text-hidden-v32");
  if(roleEl) roleEl.classList.add("toni-profile-text-hidden-v32");

  let avatar = document.getElementById("toni-top-profile-avatar-v32");
  if(!avatar){
    avatar = document.createElement("button");
    avatar.type = "button";
    avatar.id = "toni-top-profile-avatar-v32";
    avatar.className = "toni-top-profile-avatar-v32";
    avatar.title = "Profil bearbeiten";
    avatar.setAttribute("aria-label", "Profil bearbeiten");
    avatar.onclick = function(){
      if(typeof openProfileDataModal === "function"){
        openProfileDataModal();
      }else if(typeof toniV31OpenAvatarCamera === "function"){
        toniV31OpenAvatarCamera();
      }
    };

    host.insertBefore(avatar, host.firstChild);
  }

  const url = toniV32AvatarUrl(profile);

  if(url){
    avatar.innerHTML = `<img src="${url}" alt="Profilbild"/>`;
  }else{
    avatar.innerHTML = `<span class="toni-top-profile-avatar-initials-v32">${toniV32Initials(profile)}</span>`;
  }
}

async function toniV32RefreshTopAvatar(){
  let profile = toniV32Profile();

  try{
    if(typeof toniV31FetchFreshProfileWithAvatar === "function"){
      profile = await toniV31FetchFreshProfileWithAvatar();
    }else if(typeof toniV27FetchFreshProfile === "function"){
      profile = await toniV27FetchFreshProfile();
    }
  }catch(error){
    console.warn("TONI V32: Profilbild oben konnte nicht frisch geladen werden:", error);
  }

  toniV32RenderTopAvatar(profile);
}

function toniV32ResetTopAvatar(){
  const avatar = document.getElementById("toni-top-profile-avatar-v32");
  if(avatar) avatar.remove();

  const nameEl = document.getElementById("auth-user-name");
  const roleEl = document.getElementById("auth-user-role");
  if(nameEl) nameEl.classList.remove("toni-profile-text-hidden-v32");
  if(roleEl) roleEl.classList.remove("toni-profile-text-hidden-v32");

  const host = document.querySelector(".toni-profile-host-v32");
  if(host) host.classList.remove("toni-profile-host-v32");
}

// Profilbild-Speichern erweitern: Nach Speicherung oben direkt aktualisieren.
if(typeof window.toniV31SaveAvatarPhoto === "function"){
  const TONI_V32_ORIGINAL_SAVE_AVATAR = window.toniV31SaveAvatarPhoto;
  window.toniV31SaveAvatarPhoto = async function(){
    const result = await TONI_V32_ORIGINAL_SAVE_AVATAR.apply(this, arguments);
    setTimeout(toniV32RefreshTopAvatar, 250);
    return result;
  };
}

// Profilnamen-Speichern erweitern: Initialen oben aktualisieren, falls kein Bild vorhanden.
if(typeof window.toniV30SaveInlineName === "function"){
  const TONI_V32_ORIGINAL_SAVE_NAME = window.toniV30SaveInlineName;
  window.toniV30SaveInlineName = async function(field){
    const result = await TONI_V32_ORIGINAL_SAVE_NAME.apply(this, arguments);
    setTimeout(toniV32RefreshTopAvatar, 250);
    return result;
  };
}

// Login-/UI-Funktionen erweitern
["toniV10ShowAdminDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","applyRoleUI"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV32RefreshTopAvatar, 180);
      return result;
    };
  }
});

// Abmeldung: Profilbild oben entfernen
["logoutUser","signOut"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = async function(...args){
      toniV32ResetTopAvatar();
      const result = await original.apply(this, args);
      toniV32ResetTopAvatar();
      return result;
    };
  }
});

document.addEventListener("click", (event) => {
  const el = event.target.closest?.("button,a,span");
  if(!el) return;

  const text = (el.textContent || "").trim().toLowerCase();
  const id = (el.id || "").toLowerCase();
  const cls = (el.className || "").toString().toLowerCase();

  if(text.includes("abmelden") || id.includes("logout") || cls.includes("logout")){
    toniV32ResetTopAvatar();
  }
}, true);

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV32RefreshTopAvatar, 500);
  setTimeout(toniV32RefreshTopAvatar, 1600);
  setTimeout(toniV32RefreshTopAvatar, 3500);

  try{
    const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
    if(client?.auth?.onAuthStateChange && !window.TONI_V32_AUTH_LISTENER_INSTALLED){
      window.TONI_V32_AUTH_LISTENER_INSTALLED = true;
      client.auth.onAuthStateChange((event) => {
        if(event === "SIGNED_OUT"){
          toniV32ResetTopAvatar();
        }
        if(event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED"){
          setTimeout(toniV32RefreshTopAvatar, 200);
        }
      });
    }
  }catch(error){
    console.warn("TONI V32 Auth-Listener konnte nicht installiert werden:", error);
  }
});

/* TONI V33 – Profiländerungen nur bei Anmeldung + Anzeige nach Login/Logout erneuern */

window.TONI_V33_LAST_AUTH_KEY = "";

function toniV33CurrentAuthKey(){
  const p = window.TONI_AUTH_PROFILE || {};
  const direct = (() => {
    try { return window.TONI_DIRECT_SESSION || JSON.parse(localStorage.getItem("toni_direct_session") || "null"); }
    catch { return null; }
  })();

  return String(
    p.id ||
    p.email ||
    direct?.user?.id ||
    direct?.user?.email ||
    localStorage.getItem("toni_profile_id") ||
    ""
  ).toLowerCase();
}

function toniV33IsLoggedIn(){
  const p = window.TONI_AUTH_PROFILE || {};
  const key = toniV33CurrentAuthKey();

  const nameText = (document.getElementById("auth-user-name")?.textContent || "").trim().toLowerCase();
  const logoutBtn = document.getElementById("auth-logout-btn");

  return !!(
    key ||
    p.id ||
    p.email ||
    (logoutBtn && logoutBtn.style.display !== "none" && logoutBtn.offsetParent !== null) ||
    (nameText && !["profil", "anmelden", "gast", ""].includes(nameText))
  );
}

function toniV33ClearProfileState(){
  window.TONI_AUTH_PROFILE = null;
  window.TONI_V27_PROFILE_CACHE = null;
  window.TONI_V31_AVATAR_DATA_URL = "";
  window.TONI_V28_LAST_PROFILE_KEY = "";
  window.TONI_V33_LAST_AUTH_KEY = "";

  try { localStorage.removeItem("toni_profile_id"); } catch {}
  try { localStorage.removeItem("toni_role"); } catch {}

  if(typeof toniV28ClearProfileModalValues === "function"){
    toniV28ClearProfileModalValues();
  }else{
    ["profile-data-first","profile-data-last","profile-data-class"].forEach(id => {
      const el = document.getElementById(id);
      if(el) el.textContent = "–";
    });
  }

  const modal = document.getElementById("profile-data-modal");
  if(modal) modal.classList.remove("open");

  const avatarModal = document.getElementById("avatar-camera-modal-v31");
  if(avatarModal) avatarModal.classList.remove("open");

  if(typeof toniV31StopAvatarCamera === "function"){
    toniV31StopAvatarCamera();
  }

  if(typeof toniV32ResetTopAvatar === "function"){
    toniV32ResetTopAvatar();
  }

  toniV33ApplyLoggedOutProfileLock();
}

function toniV33ApplyLoggedOutProfileLock(){
  const loggedIn = toniV33IsLoggedIn();

  const profileModal = document.getElementById("profile-data-modal");
  if(profileModal){
    profileModal.dataset.loggedIn = loggedIn ? "1" : "0";
  }

  const editButtons = [
    ...document.querySelectorAll(
      ".profile-edit-name-btn-v29,.profile-inline-btn-v30.edit,.profile-avatar-actions-v31 button"
    )
  ];

  editButtons.forEach(btn => {
    btn.disabled = !loggedIn;
    btn.classList.toggle("toni-profile-logged-out-hidden-v33", !loggedIn);
  });

  const avatarSection = document.getElementById("profile-avatar-section-v31");
  if(avatarSection){
    avatarSection.classList.toggle("toni-profile-logged-out-hidden-v33", !loggedIn);
  }

  let note = document.getElementById("profile-logged-out-note-v33");
  const body = document.querySelector("#profile-data-modal .profile-data-body");

  if(!loggedIn && body){
    if(!note){
      note = document.createElement("div");
      note.id = "profile-logged-out-note-v33";
      note.className = "profile-logged-out-note-v33";
      note.textContent = "Bitte melde dich zuerst an, um dein Profil anzusehen oder zu ändern.";
      body.prepend(note);
    }
  }else if(note){
    note.remove();
  }
}

async function toniV33RefreshAfterAuthChange(){
  const key = toniV33CurrentAuthKey();

  if(!key){
    toniV33ClearProfileState();
    return;
  }

  if(window.TONI_V33_LAST_AUTH_KEY && window.TONI_V33_LAST_AUTH_KEY !== key){
    window.TONI_V27_PROFILE_CACHE = null;
    if(typeof toniV28ClearProfileModalValues === "function"){
      toniV28ClearProfileModalValues();
    }
  }

  window.TONI_V33_LAST_AUTH_KEY = key;

  try{
    let fresh = null;
    if(typeof toniV31FetchFreshProfileWithAvatar === "function"){
      fresh = await toniV31FetchFreshProfileWithAvatar();
    }else if(typeof toniV27FetchFreshProfile === "function"){
      fresh = await toniV27FetchFreshProfile();
    }

    if(fresh){
      window.TONI_AUTH_PROFILE = {...(window.TONI_AUTH_PROFILE || {}), ...fresh};
      window.TONI_V27_PROFILE_CACHE = {...(window.TONI_V27_PROFILE_CACHE || {}), ...fresh};
    }
  }catch(error){
    console.warn("TONI V33: Profil nach Auth-Änderung konnte nicht frisch geladen werden:", error);
  }

  if(typeof toniV32RefreshTopAvatar === "function"){
    await toniV32RefreshTopAvatar();
  }else if(typeof toniV32RenderTopAvatar === "function"){
    toniV32RenderTopAvatar(window.TONI_AUTH_PROFILE || {});
  }

  if(document.getElementById("profile-data-modal")?.classList.contains("open")){
    if(typeof toniV31RenderAvatar === "function"){
      toniV31RenderAvatar(window.TONI_AUTH_PROFILE || {});
    }
    if(typeof toniV30RenderProfileValues === "function"){
      toniV30RenderProfileValues(window.TONI_AUTH_PROFILE || {});
    }else if(typeof toniV27SetProfileModalValues === "function"){
      toniV27SetProfileModalValues(window.TONI_AUTH_PROFILE || {});
    }
  }

  toniV33ApplyLoggedOutProfileLock();
}

function toniV33RequireLogin(actionName){
  if(toniV33IsLoggedIn()) return true;
  alert(`Bitte melde dich zuerst an, um ${actionName || "diese Profiländerung"} vorzunehmen.`);
  toniV33ClearProfileState();
  return false;
}

/* Öffnen des Profilfensters blockieren, wenn niemand angemeldet ist. */
const TONI_V33_ORIGINAL_OPEN_PROFILE = window.openProfileDataModal;
window.openProfileDataModal = async function(){
  if(!toniV33IsLoggedIn()){
    toniV33ClearProfileState();
    alert("Bitte melde dich zuerst an, um dein Profil anzusehen oder zu ändern.");
    return;
  }

  await toniV33RefreshAfterAuthChange();

  if(typeof TONI_V33_ORIGINAL_OPEN_PROFILE === "function"){
    const result = await TONI_V33_ORIGINAL_OPEN_PROFILE.apply(this, arguments);
    toniV33ApplyLoggedOutProfileLock();
    return result;
  }

  document.getElementById("profile-data-modal")?.classList.add("open");
  toniV33ApplyLoggedOutProfileLock();
};

/* Kamera / Profilbild / Namen speichern nur mit Anmeldung erlauben. */
if(typeof window.toniV31OpenAvatarCamera === "function"){
  const original = window.toniV31OpenAvatarCamera;
  window.toniV31OpenAvatarCamera = function(...args){
    if(!toniV33RequireLogin("dein Profilbild zu ändern")) return;
    return original.apply(this, args);
  };
}

if(typeof window.toniV31SaveAvatarPhoto === "function"){
  const original = window.toniV31SaveAvatarPhoto;
  window.toniV31SaveAvatarPhoto = async function(...args){
    if(!toniV33RequireLogin("dein Profilbild zu speichern")) return;
    const result = await original.apply(this, args);
    await toniV33RefreshAfterAuthChange();
    return result;
  };
}

if(typeof window.toniV30StartInlineEdit === "function"){
  const original = window.toniV30StartInlineEdit;
  window.toniV30StartInlineEdit = function(...args){
    if(!toniV33RequireLogin("deinen Namen zu ändern")) return;
    return original.apply(this, args);
  };
}

if(typeof window.toniV30SaveInlineName === "function"){
  const original = window.toniV30SaveInlineName;
  window.toniV30SaveInlineName = async function(...args){
    if(!toniV33RequireLogin("deinen Namen zu speichern")) return;
    const result = await original.apply(this, args);
    await toniV33RefreshAfterAuthChange();
    return result;
  };
}

/* Login-/UI-Funktionen: Anzeige nach Anmeldung erneuern. */
["toniV10ShowAdminDashboard","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","applyRoleUI"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV33RefreshAfterAuthChange, 150);
      setTimeout(toniV33RefreshAfterAuthChange, 700);
      return result;
    };
  }
});

/* Logout-Funktionen: Anzeige sofort erneuern/leeren. */
["logoutUser","signOut"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = async function(...args){
      toniV33ClearProfileState();
      const result = await original.apply(this, args);
      toniV33ClearProfileState();
      return result;
    };
  }
});

/* Abmelden-Button generisch abfangen. */
document.addEventListener("click", (event) => {
  const el = event.target.closest?.("button,a,span");
  if(!el) return;

  const text = (el.textContent || "").trim().toLowerCase();
  const id = (el.id || "").toLowerCase();
  const cls = (el.className || "").toString().toLowerCase();

  if(text.includes("abmelden") || id.includes("logout") || cls.includes("logout")){
    setTimeout(toniV33ClearProfileState, 0);
    setTimeout(toniV33ClearProfileState, 300);
  }
}, true);

/* Klick auf Top-Profilbild nur angemeldet erlauben. */
document.addEventListener("click", (event) => {
  const avatar = event.target.closest?.("#toni-top-profile-avatar-v32");
  if(!avatar) return;

  if(!toniV33IsLoggedIn()){
    event.preventDefault();
    event.stopPropagation();
    alert("Bitte melde dich zuerst an.");
    toniV33ClearProfileState();
  }
}, true);

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV33RefreshAfterAuthChange, 500);
  setTimeout(toniV33RefreshAfterAuthChange, 1600);
  setTimeout(toniV33RefreshAfterAuthChange, 3500);

  try{
    const client = typeof getSupabaseClient === "function" ? getSupabaseClient() : null;
    if(client?.auth?.onAuthStateChange && !window.TONI_V33_AUTH_LISTENER_INSTALLED){
      window.TONI_V33_AUTH_LISTENER_INSTALLED = true;
      client.auth.onAuthStateChange((event, session) => {
        if(event === "SIGNED_OUT"){
          toniV33ClearProfileState();
          return;
        }

        if(event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED"){
          if(session?.user?.id || session?.user?.email){
            window.TONI_V33_LAST_AUTH_KEY = String(session.user.id || session.user.email).toLowerCase();
          }
          setTimeout(toniV33RefreshAfterAuthChange, 120);
          setTimeout(toniV33RefreshAfterAuthChange, 700);
        }
      });
    }
  }catch(error){
    console.warn("TONI V33 Auth-Listener konnte nicht installiert werden:", error);
  }
});

/* TONI V34 – Button „Profilbild löschen“ ergänzen */

function toniV34InstallDeleteAvatarButton(){
  const actions = document.querySelector(".profile-avatar-actions-v31");
  if(!actions) return;

  if(document.getElementById("profile-avatar-delete-btn-v34")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.id = "profile-avatar-delete-btn-v34";
  btn.className = "profile-avatar-delete-btn-v34";
  btn.textContent = "Profilbild löschen";
  btn.onclick = toniV34DeleteProfileAvatar;

  actions.appendChild(btn);
}

async function toniV34DeleteProfileAvatar(){
  const profile = {
    ...(window.TONI_AUTH_PROFILE || {}),
    ...(window.TONI_V27_PROFILE_CACHE || {})
  };

  const hasAvatar = !!(profile.avatar_data_url || profile.avatar_url);

  if(!hasAvatar){
    alert("Es ist kein Profilbild gespeichert.");
    return;
  }

  if(!confirm("Profilbild wirklich löschen?")){
    return;
  }

  try{
    if(typeof toniV33RequireLogin === "function" && !toniV33RequireLogin("dein Profilbild zu löschen")){
      return;
    }

    if(typeof supabaseRequest === "function"){
      await supabaseRequest("rpc/delete_my_profile_avatar", {
        method: "POST",
        body: JSON.stringify({})
      });
    }else{
      const token = typeof toniV27GetAccessToken === "function" ? await toniV27GetAccessToken() : null;
      if(!token || !profile.id){
        throw new Error("Keine aktive Sitzung gefunden.");
      }

      const response = await fetch(`${window.SUPABASE_URL}/rest/v1/profiles?id=eq.${encodeURIComponent(profile.id)}`, {
        method: "PATCH",
        headers:{
          "apikey": window.SUPABASE_ANON_KEY,
          "Authorization": "Bearer " + token,
          "Content-Type": "application/json",
          "Prefer": "return=representation"
        },
        body: JSON.stringify({
          avatar_data_url: null,
          updated_at: new Date().toISOString()
        })
      });

      if(!response.ok){
        const text = await response.text();
        throw new Error(text || "Profilbild konnte nicht gelöscht werden.");
      }
    }

    const updated = {
      ...profile,
      avatar_data_url: null,
      avatar_url: null
    };

    window.TONI_AUTH_PROFILE = updated;
    window.TONI_V27_PROFILE_CACHE = updated;
    window.TONI_V31_AVATAR_DATA_URL = "";

    if(typeof toniV31RenderAvatar === "function"){
      toniV31RenderAvatar(updated);
    }

    if(typeof toniV32RefreshTopAvatar === "function"){
      await toniV32RefreshTopAvatar();
    }else if(typeof toniV32RenderTopAvatar === "function"){
      toniV32RenderTopAvatar(updated);
    }

    appendMsg?.("toni", "🗑️ Dein Profilbild wurde gelöscht.", typeof time === "function" ? time() : "", "desktop");
  }catch(error){
    console.error("TONI V34 Profilbild löschen:", error);
    alert("Profilbild konnte nicht gelöscht werden:\n" + error.message);
  }
}

// Bestehende Avatar-Section-Funktion erweitern.
if(typeof window.toniV31EnsureAvatarSection === "function"){
  const TONI_V34_ORIGINAL_ENSURE_AVATAR_SECTION = window.toniV31EnsureAvatarSection;
  window.toniV31EnsureAvatarSection = function(...args){
    const result = TONI_V34_ORIGINAL_ENSURE_AVATAR_SECTION.apply(this, args);
    setTimeout(toniV34InstallDeleteAvatarButton, 20);
    return result;
  };
}

// Öffnen des Profilfensters erweitern.
const TONI_V34_ORIGINAL_OPEN_PROFILE = window.openProfileDataModal;
window.openProfileDataModal = async function(...args){
  const result = typeof TONI_V34_ORIGINAL_OPEN_PROFILE === "function"
    ? await TONI_V34_ORIGINAL_OPEN_PROFILE.apply(this, args)
    : undefined;

  toniV34InstallDeleteAvatarButton();

  if(typeof toniV33ApplyLoggedOutProfileLock === "function"){
    toniV33ApplyLoggedOutProfileLock();
  }

  return result;
};

// Nach Speichern eines neuen Profilbildes Button weiter anzeigen.
if(typeof window.toniV31SaveAvatarPhoto === "function"){
  const TONI_V34_ORIGINAL_SAVE_AVATAR = window.toniV31SaveAvatarPhoto;
  window.toniV31SaveAvatarPhoto = async function(...args){
    const result = await TONI_V34_ORIGINAL_SAVE_AVATAR.apply(this, args);
    setTimeout(toniV34InstallDeleteAvatarButton, 100);
    return result;
  };
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV34InstallDeleteAvatarButton, 500);
  setTimeout(toniV34InstallDeleteAvatarButton, 1600);
});

/* TONI V36 – Profilbilder in „Zugeordnete Studenten / Klasse“ anzeigen */

function toniV36Escape(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function toniV36Initials(student){
  const display = String(student.display || student.email || "").trim();
  const parts = display.split(/\s+/).filter(Boolean);

  if(parts.length >= 2){
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  if(parts.length === 1){
    return parts[0].slice(0, 2).toUpperCase();
  }

  return "👤";
}

function toniV36StudentFromAssignment(a){
  const p = a.profiles || {};
  const email = a.student_email || p.email || "";
  const first = a.student_first_name || p.first_name || "";
  const last = a.student_last_name || p.last_name || "";
  const display = a.student_display_name || p.display_name || `${first} ${last}`.trim() || email || "Student";
  const className = a.student_class_name || p.class_name || "";
  const avatar = p.avatar_data_url || a.student_avatar_data_url || "";

  return {display, email, className, avatar};
}

function toniV36StudentAvatarHtml(student){
  if(student.avatar){
    return `
      <div class="assigned-student-avatar-v36">
        <img src="${student.avatar}" alt="Profilbild von ${toniV36Escape(student.display)}"/>
      </div>
    `;
  }

  return `
    <div class="assigned-student-avatar-v36">
      <span class="assigned-student-avatar-initials-v36">${toniV36Escape(toniV36Initials(student))}</span>
    </div>
  `;
}

async function toniV36LoadJourneyAssignments(){
  try{
    if(typeof supabaseRequest === "function"){
      try{
        // Explizite Verknüpfung über student_profile_id: es gibt mehrere
        // FK-Beziehungen zu profiles (u.a. assigned_by_profile_id), daher
        // muss die gewünschte Beziehung eindeutig benannt werden.
        const rows = await supabaseRequest(
          "learning_journey_assignments?select=*,profiles!student_profile_id(id,display_name,email,class_name,first_name,last_name,avatar_data_url)&order=created_at.desc"
        );
        return rows || [];
      }catch(errorWithAvatar){
        console.warn("TONI V36: Profilbilder konnten nicht mitgeladen werden, fallback ohne avatar_data_url:", errorWithAvatar);
        const rows = await supabaseRequest(
          "learning_journey_assignments?select=*,profiles!student_profile_id(id,display_name,email,class_name,first_name,last_name)&order=created_at.desc"
        );
        return rows || [];
      }
    }
  }catch(error){
    console.warn("TONI V36: Zuordnungen konnten nicht aus Supabase geladen werden, nutze lokale Daten:", error);
  }

  return typeof getLocalAssignmentsV18 === "function" ? getLocalAssignmentsV18() : [];
}

function toniV36JourneyTitleFromRow(row){
  if(typeof journeyTitleFromRowV18 === "function") return journeyTitleFromRowV18(row);
  const json = row.journey_json || {};
  return row.title || json.title || "Lernreise";
}

function toniV36JourneyMetaFromRow(row){
  if(typeof journeyMetaFromRowV18 === "function") return journeyMetaFromRowV18(row);
  const json = row.journey_json || {};
  return {
    subject: row.subject || json.subject || "Ohne Fach",
    goal: row.goal || json.goal || "",
    steps: (json.steps || []).length
  };
}

// ALT (auth.js V?) – stillgelegt: delegiert an die finale window-Version weiter unten,
// damit es nur EINEN Renderer gibt (mit Fortschritt + Lerngruppe). Egal ob über window.
// oder den lokalen Namen aufgerufen wird – beide landen bei derselben Funktion.
async function loadJourneyAssignmentTable(){
  if(window.loadJourneyAssignmentTable && window.loadJourneyAssignmentTable !== loadJourneyAssignmentTable){
    return window.loadJourneyAssignmentTable();
  }
}

// Nach Profilbildänderungen und nach Öffnen des Zuordnungsbereichs neu laden.
if(typeof window.toniV31SaveAvatarPhoto === "function"){
  const TONI_V36_ORIGINAL_SAVE_AVATAR = window.toniV31SaveAvatarPhoto;
  window.toniV31SaveAvatarPhoto = async function(...args){
    const result = await TONI_V36_ORIGINAL_SAVE_AVATAR.apply(this, args);
    setTimeout(() => {
      if(document.getElementById("learning-journey-assignment-panel")?.classList.contains("visible")){
        loadJourneyAssignmentTable();
      }
    }, 500);
    return result;
  };
}

if(typeof window.toniV34DeleteProfileAvatar === "function"){
  const TONI_V36_ORIGINAL_DELETE_AVATAR = window.toniV34DeleteProfileAvatar;
  window.toniV34DeleteProfileAvatar = async function(...args){
    const result = await TONI_V36_ORIGINAL_DELETE_AVATAR.apply(this, args);
    setTimeout(() => {
      if(document.getElementById("learning-journey-assignment-panel")?.classList.contains("visible")){
        loadJourneyAssignmentTable();
      }
    }, 500);
    return result;
  };
}

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if(document.getElementById("learning-journey-assignment-panel")?.classList.contains("visible")){
      loadJourneyAssignmentTable();
    }
  }, 1200);
});

/* TONI V37 – Profilbilder in Zuordnungstabelle zuverlässig laden
   Grund:
   Der eingebettete Join profiles(...) liefert je nach RLS/FK-Konfiguration nicht immer avatar_data_url.
   V37 nutzt deshalb bevorzugt eine SECURITY-DEFINER-RPC-Funktion.
*/

async function toniV37LoadJourneyAssignmentsWithAvatars(){
  // 1. Bevorzugt: RPC mit Profil-Join, Lerngruppe UND Fortschritt.
  if(typeof supabaseRequest === "function"){
    try{
      const rows = await supabaseRequest("rpc/get_learning_journey_assignments_with_profiles_and_progress", {
        method: "POST",
        body: JSON.stringify({})
      });

      return (rows || []).map(row => ({
        id: row.id,
        learning_journey_template_id: row.learning_journey_template_id,
        student_profile_id: row.student_profile_id,
        student_email: row.student_email,
        student_first_name: row.student_first_name,
        student_last_name: row.student_last_name,
        student_display_name: row.student_display_name,
        student_class_name: row.student_class_name,
        student_avatar_data_url: row.student_avatar_data_url || "",
        student_group_name: row.student_group_name || "",
        assigned_by_profile_id: row.assigned_by_profile_id,
        status: row.assignment_status || row.status,
        progress_percent: (row.progress_percent === null || row.progress_percent === undefined) ? null : row.progress_percent,
        progress_status: row.progress_status || "",
        created_at: row.created_at,
        updated_at: row.updated_at,
        profiles: {
          id: row.student_profile_id,
          email: row.profile_email || row.student_email,
          display_name: row.profile_display_name || row.student_display_name,
          first_name: row.profile_first_name || row.student_first_name,
          last_name: row.profile_last_name || row.student_last_name,
          class_name: row.profile_class_name || row.student_class_name,
          avatar_data_url: row.student_avatar_data_url || ""
        }
      }));
    }catch(error){
      console.warn("TONI V37: RPC mit Fortschritt nicht verfügbar, nutze Fallback:", error);
    }
  }

  // 2. Fallback: V36-Loader oder lokale Daten.
  if(typeof toniV36LoadJourneyAssignments === "function"){
    return await toniV36LoadJourneyAssignments();
  }

  if(typeof getLocalAssignmentsV18 === "function"){
    return getLocalAssignmentsV18();
  }

  return [];
}

function toniV37StudentFromAssignment(a){
  const p = a.profiles || {};
  const email = a.student_email || p.email || "";
  const first = a.student_first_name || p.first_name || "";
  const last = a.student_last_name || p.last_name || "";
  const display = a.student_display_name || p.display_name || `${first} ${last}`.trim() || email || "Student";
  const className = a.student_class_name || p.class_name || "";
  const avatar = a.student_avatar_data_url || p.avatar_data_url || "";
  const groupName = a.student_group_name || a.group_name || "";
  const progressPercent = (a.progress_percent === null || a.progress_percent === undefined) ? null : Number(a.progress_percent);
  const progressStatus = a.progress_status || "";

  return {display, email, className, avatar, groupName, progressPercent, progressStatus};
}

// V36-Funktion bewusst überschreiben: avatar_data_url wird jetzt zuverlässig berücksichtigt.
window.toniV36StudentFromAssignment = toniV37StudentFromAssignment;

// Zuordnungstabelle erneut überschreiben, damit der neue Loader sicher genutzt wird.
window.loadJourneyAssignmentTable = async function(){
  const tbody = document.getElementById("journey-assignment-table-body");
  if(!tbody) return;

  if(typeof toniV18CanManage === "function" && !toniV18CanManage()){
    tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">🔒 Nur Admins und Tutoren können Lernreisen zuordnen.</div></td></tr>`;
    return;
  }

  tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">Lernreisen und Zuordnungen werden geladen …</div></td></tr>`;

  try{
    const journeys = typeof loadJourneyTemplatesForAssignmentsV18 === "function"
      ? await loadJourneyTemplatesForAssignmentsV18()
      : [];

    const assignments = await toniV37LoadJourneyAssignmentsWithAvatars();

    window.TONI_JOURNEY_ASSIGNMENT_ROWS = journeys;
    window.TONI_JOURNEY_ASSIGNMENTS = assignments;

    if(!journeys.length){
      tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">Noch keine Lernreisen vorhanden. Lege zuerst im Bereich „Lernreisen verwalten“ eine Lernreise an.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = journeys.map(journey => {
      const meta = typeof toniV36JourneyMetaFromRow === "function"
        ? toniV36JourneyMetaFromRow(journey)
        : {subject: journey.subject || "Ohne Fach", goal: journey.goal || "", steps: (journey.journey_json?.steps || []).length};

      const title = typeof toniV36JourneyTitleFromRow === "function"
        ? toniV36JourneyTitleFromRow(journey)
        : (journey.title || "Lernreise");

      const related = assignments.filter(a => String(a.learning_journey_template_id) === String(journey.id));

      const studentHtml = related.length
        ? `<div class="assigned-student-list">` + related.map(a => {
            const s = toniV37StudentFromAssignment(a);
            const avatarHtml = typeof toniV36StudentAvatarHtml === "function"
              ? toniV36StudentAvatarHtml(s)
              : `<div class="assigned-student-avatar-v36"><span class="assigned-student-avatar-initials-v36">👤</span></div>`;

            return `
              <div class="assigned-student-pill">
                <div class="assigned-student-content-v36">
                  ${avatarHtml}
                  <div class="assigned-student-main">
                    <div class="assigned-student-name">${toniV36Escape ? toniV36Escape(s.display) : s.display}${(s.groupName || s.className) ? ` <span class="assigned-student-tags-v85">${[s.groupName, s.className].filter(Boolean).map(x=>`<span class="assigned-student-tag-v85">${toniV36Escape ? toniV36Escape(x) : x}</span>`).join("")}</span>` : ""}</div>
                    <div class="assigned-student-class">${toniV36Escape ? toniV36Escape(s.email || "ohne E-Mail") : (s.email || "ohne E-Mail")}</div>
                    ${(s.progressPercent !== null && typeof toniV41ProgressHtml === "function") ? toniV41ProgressHtml(a) : ""}
                  </div>
                </div>
                <button class="assignment-remove-btn" title="Zuordnung löschen" onclick="deleteJourneyStudentAssignment('${a.id}')">×</button>
              </div>`;
          }).join("") + `</div>`
        : `<div class="assignment-empty">Noch keinem Studenten zugeordnet.</div>`;

      const esc = typeof toniV36Escape === "function" ? toniV36Escape : (v => String(v ?? ""));

      return `
        <tr>
          <td>
            <div class="assignment-journey-title">${esc(title)}</div>
            <div class="assignment-journey-meta">
              ${esc(meta.subject)} · ${meta.steps || 0} Station(en)<br>
              ${meta.goal ? "Ziel: " + esc(meta.goal) : ""}
            </div>
          </td>
          <td>${studentHtml}</td>
          <td>
            <button class="assignment-add-btn" title="QR-Code anzeigen" onclick="openAssignStudentModal('${journey.id}')">+</button>
          </td>
        </tr>
      `;
    }).join("");

    if(typeof updateAssignmentHeaderV20 === "function"){
      updateAssignmentHeaderV20();
    }
  }catch(error){
    console.error("TONI V37: Zuordnungstabelle konnte nicht geladen werden:", error);
    const esc = typeof toniV36Escape === "function" ? toniV36Escape : (v => String(v ?? ""));
    tbody.innerHTML = `<tr><td colspan="3"><div class="assignment-empty">⚠️ Tabelle konnte nicht geladen werden:<br>${esc(error.message)}</div></td></tr>`;
  }
};

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if(document.getElementById("learning-journey-assignment-panel")?.classList.contains("visible")){
      loadJourneyAssignmentTable();
    }
  }, 1000);
});

/* TONI V77 – SuperAdmin Login-Fix und Adminverwaltung
   Korrektur: SuperAdmin ist kein E-Mail-Login und darf nicht in die Verifizierungs-Mail laufen. */

(function(){
  const SUPERADMIN_USERNAME = "SuperAdmin";
  const SUPERADMIN_PASSWORD = window.SUPERADMIN_PASSWORD || "SuperAdmin#";

  window.TONI_V77_SUPERADMIN_OPEN = sessionStorage.getItem("toni_section_superadmin_admins_open") === "1";

  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function isSuperAdminName(value){
    return String(value || "").trim() === SUPERADMIN_USERNAME;
  }

  function isSuperAdminPassword(value){
    return String(value || "") === SUPERADMIN_PASSWORD;
  }

  function setMsg(text, type="ok"){
    if(typeof setAuthMessage === "function"){
      setAuthMessage(text, type);
      return;
    }
    const box = document.getElementById("auth-message");
    if(box){
      box.className = "auth-message visible " + (type === "err" ? "err" : "ok");
      box.innerHTML = text;
    }
  }

  function showSuperAdminPassword(){
    const modal = document.getElementById("auth-modal");
    const emailEl = document.getElementById("auth-email");
    const area = document.getElementById("auth-password-area");
    const btn = document.getElementById("auth-continue-btn");
    const note = document.getElementById("auth-login-note");
    const pw = document.getElementById("auth-password");

    if(modal) modal.classList.add("superadmin-login-mode-v77");
    if(emailEl){
      emailEl.value = SUPERADMIN_USERNAME;
      emailEl.disabled = true;
    }
    if(area) area.classList.add("visible");
    // Button sichtbar lassen: er ruft toniSlimLogin(), das den SuperAdmin
    // korrekt zweistufig behandelt (erst Passwortfeld, dann Anmeldung).
    if(btn){ btn.style.display = ""; btn.textContent = "Anmelden"; }
    if(note){
      note.innerHTML = "SuperAdmin erkannt. Bitte gib das SuperAdmin-Passwort ein. Die Passwort-Vergessen-Funktion ist für diesen Zugang deaktiviert.";
    }

    document.querySelectorAll("#auth-modal .auth-reset-area, #auth-modal .auth-reset-link").forEach(el => {
      el.style.display = "none";
    });

    setMsg("SuperAdmin erkannt. Bitte Passwort eingeben.", "ok");
    setTimeout(() => pw?.focus(), 80);
  }

  function profile(){
    return {
      id:"superadmin",
      email:SUPERADMIN_USERNAME,
      display_name:"SuperAdmin",
      class_name:"",
      role:"superadmin",
      institution_name:"System",
      institution_code:"SYSTEM"
    };
  }

  function applySuperAdminVisibility(){
    const role =
      window.TONI_AUTH_PROFILE?.role ||
      localStorage.getItem("toni_role") ||
      "student";

    document.body.classList.remove("role-student","role-tutor","role-admin","role-superadmin");
    document.body.classList.add("role-" + role);

    document.querySelectorAll(".superadmin-only").forEach(el => {
      el.style.display = role === "superadmin" ? "" : "none";
      el.classList.toggle("visible", role === "superadmin");
    });

    if(role === "superadmin"){
      document.querySelectorAll(".student-only,.tutor-only,.admin-only").forEach(el => {
        el.style.display = "none";
        el.classList.remove("visible");
      });

      const tutors = document.getElementById("tutors-admin-panel");
      if(tutors){
        tutors.style.display = "none";
        tutors.classList.remove("visible");
      }

      const panel = document.getElementById("superadmin-admins-panel");
      if(panel){
        panel.style.display = "";
        panel.classList.add("visible");
      }

      applyAdminsPanelState();
    }
  }

  function setSuperAdminProfile(){
    const p = profile();

    window.TONI_AUTH_PROFILE = p;
    window.TONI_ACTIVE_PROFILE_ID = "superadmin";

    try{ TONI_AUTH_PROFILE = p; }catch{}
    try{ TONI_AUTH_SESSION = null; }catch{}

    localStorage.setItem("toni_role", "superadmin");
    localStorage.setItem("toni_profile_id", "superadmin");

    const greeting = document.querySelector(".topbar-greeting h2");
    if(greeting) greeting.innerHTML = "Hallo SuperAdmin! 👋";

    const sub = document.querySelector(".topbar-greeting p");
    if(sub) sub.textContent = "SuperAdmin · Systemverwaltung";

    if(typeof updateAuthUI === "function"){
      updateAuthUI({email:SUPERADMIN_USERNAME}, p);
    }else{
      const nameEl = document.getElementById("auth-user-name");
      const roleEl = document.getElementById("auth-user-role");
      const loginBtn = document.getElementById("auth-login-btn");
      const logoutBtn = document.getElementById("auth-logout-btn");
      if(nameEl) nameEl.textContent = "SuperAdmin";
      if(roleEl) roleEl.textContent = "SuperAdmin";
      if(loginBtn) loginBtn.style.display = "none";
      if(logoutBtn) logoutBtn.style.display = "";
    }

    applySuperAdminVisibility();

    const modal = document.getElementById("auth-modal");
    modal?.classList.remove("open");
    modal?.classList.remove("superadmin-login-mode-v77");

    if(typeof closeAuthModal === "function"){
      try{ closeAuthModal(); }catch{}
    }

    // WICHTIG: Der Login ist in den Startbildschirm eingebettet. Da der SuperAdmin
    // sich nicht über Supabase anmeldet, feuert kein SIGNED_IN-Event – der
    // Startbildschirm muss daher hier aktiv ausgeblendet werden, sonst bleibt
    // der SuperAdmin sichtbar "in der Anmeldung hängen".
    function toniHideStartScreenForSuperAdmin(){
      try{
        const ss = document.getElementById("toni-startscreen");
        if(ss){ ss.classList.add("hidden"); ss.style.display = "none"; }
        if(typeof window.toniHideStartScreen === "function"){
          try{ window.toniHideStartScreen(); }catch{}
        }
      }catch(e){ console.warn("SuperAdmin Startscreen:", e); }
    }
    toniHideStartScreenForSuperAdmin();
    // Mehrfach absichern, falls anderer Code (Loader/Listener) kurz dazwischenfunkt.
    setTimeout(toniHideStartScreenForSuperAdmin, 200);
    setTimeout(toniHideStartScreenForSuperAdmin, 800);

    if(typeof appendMsg === "function"){
      appendMsg("toni", "✅ SuperAdmin angemeldet.", typeof time === "function" ? time() : "", "desktop");
    }

    setTimeout(() => {
      if(typeof toniV73ShowLoader === "function"){
        toniV73ShowLoader(4000, "superadmin-login");
      }
    }, 120);
  }

  function trySuperAdminLogin(){
    const username = document.getElementById("auth-email")?.value.trim();
    const password = document.getElementById("auth-password")?.value || "";

    if(!isSuperAdminName(username)) return false;

    if(isSuperAdminPassword(password)){
      setMsg("✅ SuperAdmin-Anmeldung erfolgreich.", "ok");
      setSuperAdminProfile();
    }else{
      setMsg("⚠️ SuperAdmin-Anmeldung fehlgeschlagen.", "err");
    }

    return true;
  }

  function authValue(){
    return {
      p_username:SUPERADMIN_USERNAME,
      p_password:SUPERADMIN_PASSWORD
    };
  }

  async function callRpc(path, body){
    const headers = {
      "apikey": window.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + window.SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    };

    const response = await fetch(`${window.SUPABASE_URL}/rest/v1/${path}`, {
      method:"POST",
      headers,
      body:JSON.stringify(body || {})
    });

    if(!response.ok){
      const text = await response.text();
      throw new Error(`Supabase ${response.status}: ${text}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function initials(first, last, email){
    const a = String(first || "").trim();
    const b = String(last || "").trim();
    if(a && b) return (a[0] + b[0]).toUpperCase();
    return String(email || "AD").slice(0,2).toUpperCase();
  }

  function applyAdminsPanelState(){
    const body = document.getElementById("superadmin-admins-body");
    const note = document.getElementById("superadmin-admins-collapsed-note");
    const symbol = document.getElementById("superadmin-admins-toggle-symbol");

    if(body) body.classList.toggle("open", !!window.TONI_V77_SUPERADMIN_OPEN);
    if(note) note.classList.toggle("hidden", !!window.TONI_V77_SUPERADMIN_OPEN);
    if(symbol) symbol.textContent = window.TONI_V77_SUPERADMIN_OPEN ? "−" : "+";

    sessionStorage.setItem("toni_section_superadmin_admins_open", window.TONI_V77_SUPERADMIN_OPEN ? "1" : "0");
  }

  window.toniV76ToggleAdminsPanel = window.toniV77ToggleAdminsPanel = function(){
    window.TONI_V77_SUPERADMIN_OPEN = !window.TONI_V77_SUPERADMIN_OPEN;
    applyAdminsPanelState();

    if(window.TONI_V77_SUPERADMIN_OPEN){
      setTimeout(window.toniV77LoadAdmins, 80);
    }
  };

  window.toniV76LoadAdmins = window.toniV77LoadAdmins = async function(){
    const list = document.getElementById("superadmin-admin-list");
    if(!list) return;

    list.innerHTML = `<div class="assignment-empty">Admins werden geladen …</div>`;

    try{
      const result = await callRpc("rpc/superadmin_list_admins_v76", authValue());
      const admins = Array.isArray(result) ? result : (result?.admins || []);

      if(!admins.length){
        list.innerHTML = `<div class="assignment-empty">Noch keine Admins angelegt.</div>`;
        return;
      }

      list.innerHTML = admins.map(admin => {
        const name = `${admin.first_name || ""} ${admin.last_name || ""}`.trim() || admin.display_name || admin.email || "Admin";
        const inst = admin.institution_name || "Ohne Institution";
        const code = admin.institution_code || "—";
        return `
          <div class="superadmin-admin-card-v76">
            <div class="superadmin-admin-avatar-v76">${esc(initials(admin.first_name, admin.last_name, admin.email))}</div>
            <div class="superadmin-admin-info-v76">
              <div class="superadmin-admin-name-v76">${esc(name)}</div>
              <div class="superadmin-admin-meta-v76">${esc(admin.email || "")}</div>
              <div class="superadmin-institution-pill-v76">${esc(inst)} · ${esc(code)}</div>
            </div>
          </div>
        `;
      }).join("");
    }catch(error){
      console.error("TONI V77 Admins laden:", error);
      list.innerHTML = `<div class="assignment-empty">⚠️ Admins konnten nicht geladen werden:<br>${esc(error.message || error)}</div>`;
    }
  };

  window.toniV76OpenCreateAdminModal = window.toniV77OpenCreateAdminModal = function(event){
    event?.stopPropagation?.();
    document.getElementById("superadmin-create-admin-modal")?.classList.add("open");
    setTimeout(() => document.getElementById("superadmin-new-admin-email")?.focus(), 80);
  };

  window.toniV76CloseCreateAdminModal = window.toniV77CloseCreateAdminModal = function(){
    document.getElementById("superadmin-create-admin-modal")?.classList.remove("open");
  };

  function setCreateAdminMessage(text, type="ok"){
    const box = document.getElementById("superadmin-create-admin-message");
    if(!box) return;
    box.className = "auth-message visible " + (type === "err" ? "err" : "ok");
    box.innerHTML = text;
  }

  window.toniV76CreateAdmin = window.toniV77CreateAdmin = async function(){
    const email = document.getElementById("superadmin-new-admin-email")?.value.trim();
    const first = document.getElementById("superadmin-new-admin-first")?.value.trim();
    const last = document.getElementById("superadmin-new-admin-last")?.value.trim();
    const institution = document.getElementById("superadmin-new-admin-institution")?.value.trim();
    const password = document.getElementById("superadmin-new-admin-password")?.value || "";

    if(!email || !first || !last || !institution || !password){
      setCreateAdminMessage("Bitte fülle alle Felder aus.", "err");
      return;
    }

    try{
      const result = await callRpc("rpc/superadmin_create_admin_v81", {
        ...authValue(),
        p_email:email,
        p_first_name:first,
        p_last_name:last,
        p_institution_name:institution,
        p_admin_password:password
      });

      if(!result?.ok){
        throw new Error(result?.error || "Admin konnte nicht angelegt werden.");
      }

      setCreateAdminMessage(`✅ Admin wurde angelegt.<br>Institution: <strong>${esc(result.institution_name)}</strong><br>Kennung: <strong>${esc(result.institution_code)}</strong>`, "ok");

      ["superadmin-new-admin-email","superadmin-new-admin-first","superadmin-new-admin-last","superadmin-new-admin-password"].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.value = "";
      });

      await window.toniV77LoadAdmins();
    }catch(error){
      console.error("TONI V77 Admin anlegen:", error);
      setCreateAdminMessage("⚠️ Admin konnte nicht angelegt werden:<br>" + esc(error.message || error), "err");
    }
  };

  function interceptContinue(event){
    const username = document.getElementById("auth-email")?.value.trim();

    if(!isSuperAdminName(username)) return false;

    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();

    // Zweistufig: Solange das Passwortfeld noch nicht sichtbar ist oder noch kein
    // Passwort eingegeben wurde, erst das Passwortfeld zeigen. Sobald beides
    // vorliegt, die SuperAdmin-Anmeldung tatsächlich durchführen.
    const pwArea = document.getElementById("auth-password-area");
    const pwVisible = pwArea && pwArea.classList.contains("visible");
    const pw = document.getElementById("auth-password")?.value || "";

    if(!pwVisible || !pw){
      showSuperAdminPassword();
    }else{
      trySuperAdminLogin();
    }
    return true;
  }

  function interceptPasswordLogin(event){
    const username = document.getElementById("auth-email")?.value.trim();

    if(!isSuperAdminName(username)) return false;

    event?.preventDefault?.();
    event?.stopPropagation?.();
    event?.stopImmediatePropagation?.();

    return trySuperAdminLogin();
  }

  function installEventInterceptors(){
    const emailEl = document.getElementById("auth-email");
    const cont = document.getElementById("auth-continue-btn");
    const login = document.getElementById("auth-password-login-btn");

    if(emailEl && emailEl.dataset.toniV77InputFixed !== "1"){
      emailEl.dataset.toniV77InputFixed = "1";
      emailEl.setAttribute("type","text");
      emailEl.setAttribute("autocomplete","username");
      emailEl.setAttribute("placeholder","name@schule.de oder SuperAdmin");
      emailEl.addEventListener("keydown", event => {
        if(event.key === "Enter" && isSuperAdminName(emailEl.value)){
          interceptContinue(event);
        }
      }, true);
    }

    if(cont && cont.dataset.toniV77ContinueInstalled !== "1"){
      cont.dataset.toniV77ContinueInstalled = "1";
      cont.addEventListener("click", interceptContinue, true);
    }

    // Enter im Passwortfeld löst beim SuperAdmin die Anmeldung aus (zweistufige Logik).
    const pwEl = document.getElementById("auth-password");
    if(pwEl && pwEl.dataset.toniV77PwEnterInstalled !== "1"){
      pwEl.dataset.toniV77PwEnterInstalled = "1";
      pwEl.addEventListener("keydown", event => {
        if(event.key === "Enter" && isSuperAdminName(document.getElementById("auth-email")?.value)){
          interceptContinue(event);
        }
      }, true);
    }

    if(login && login.dataset.toniV77LoginInstalled !== "1"){
      login.dataset.toniV77LoginInstalled = "1";
      login.addEventListener("click", interceptPasswordLogin, true);
    }

    document.querySelectorAll("#auth-modal .auth-reset-link").forEach(reset => {
      if(reset.dataset.toniV77ResetInstalled !== "1"){
        reset.dataset.toniV77ResetInstalled = "1";
        reset.addEventListener("click", event => {
          const username = document.getElementById("auth-email")?.value.trim();
          if(isSuperAdminName(username)){
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            setMsg("Für den SuperAdmin ist die Passwort-Vergessen-Funktion deaktiviert.", "err");
          }
        }, true);
      }
    });
  }

  function wrapGlobalFunctions(){
    if(typeof window.continueLogin === "function" && !window.continueLogin.__toniV77Wrapped){
      const original = window.continueLogin;
      window.continueLogin = async function(...args){
        const username = document.getElementById("auth-email")?.value.trim();

        if(isSuperAdminName(username)){
          showSuperAdminPassword();
          return;
        }

        return await original.apply(this, args);
      };
      window.continueLogin.__toniV77Wrapped = true;
    }

    if(typeof window.signInWithPassword === "function" && !window.signInWithPassword.__toniV77Wrapped){
      const original = window.signInWithPassword;
      window.signInWithPassword = async function(...args){
        const username = document.getElementById("auth-email")?.value.trim();

        if(isSuperAdminName(username)){
          trySuperAdminLogin();
          return;
        }

        return await original.apply(this, args);
      };
      window.signInWithPassword.__toniV77Wrapped = true;
    }

    if(typeof window.sendPasswordReset === "function" && !window.sendPasswordReset.__toniV77Wrapped){
      const original = window.sendPasswordReset;
      window.sendPasswordReset = async function(...args){
        const username = document.getElementById("auth-email")?.value.trim();

        if(isSuperAdminName(username)){
          setMsg("Für den SuperAdmin ist die Passwort-Vergessen-Funktion deaktiviert.", "err");
          return;
        }

        return await original.apply(this, args);
      };
      window.sendPasswordReset.__toniV77Wrapped = true;
    }

    ["applyAuthProfile","toniV77ApplyProfile","toniV9ApplyProfile","toniV12ApplyDashboard","toniV14ApplyCompletedProfile","applyRoleUI","toniV8ApplyRoleClasses"].forEach(fnName => {
      if(typeof window[fnName] === "function" && !window[fnName].__toniV77RoleWrapped){
        const original = window[fnName];
        const wrapped = function(...args){
          const result = original.apply(this, args);
          setTimeout(applySuperAdminVisibility, 80);
          return result;
        };
        wrapped.__toniV77RoleWrapped = true;
        window[fnName] = wrapped;
      }
    });
  }

  window.toniV77SuperAdminLogin = {
    showSuperAdminPassword,
    setSuperAdminProfile,
    applySuperAdminVisibility,
    isSuperAdminName,
    trySuperAdminLogin
  };

  window.addEventListener("DOMContentLoaded", () => {
    installEventInterceptors();
    wrapGlobalFunctions();
    applySuperAdminVisibility();

    setTimeout(installEventInterceptors, 500);
    setTimeout(wrapGlobalFunctions, 500);
    setTimeout(applySuperAdminVisibility, 500);

    setTimeout(installEventInterceptors, 1500);
    setTimeout(wrapGlobalFunctions, 1500);
    setTimeout(applySuperAdminVisibility, 1500);

    if(localStorage.getItem("toni_role") === "superadmin"){
      setSuperAdminProfile();
    }

    const observer = new MutationObserver(() => {
      clearTimeout(window.TONI_V77_SUPERADMIN_TIMER);
      window.TONI_V77_SUPERADMIN_TIMER = setTimeout(() => {
        installEventInterceptors();
        wrapGlobalFunctions();
        applySuperAdminVisibility();
      }, 80);
    });

    observer.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["class","style"]});
  });
})();

/* TONI V79 – SuperAdmin Admin-Löschen stabilisieren und Formular verbessern */
(function(){
  const SUPERADMIN_USERNAME = "SuperAdmin";
  const SUPERADMIN_PASSWORD = window.SUPERADMIN_PASSWORD || "SuperAdmin#";

  function esc(value){
    if(typeof escapeHtml === "function") return escapeHtml(value);
    return String(value ?? "").replace(/[&<>"']/g, c => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#039;"
    }[c]));
  }

  function initials(first, last, email){
    const a = String(first || "").trim();
    const b = String(last || "").trim();
    if(a && b) return (a[0] + b[0]).toUpperCase();
    return String(email || "AD").slice(0,2).toUpperCase();
  }

  function authValue(){
    return {
      p_username:SUPERADMIN_USERNAME,
      p_password:SUPERADMIN_PASSWORD
    };
  }

  async function callRpc(path, body){
    const headers = {
      "apikey": window.SUPABASE_ANON_KEY,
      "Authorization": "Bearer " + window.SUPABASE_ANON_KEY,
      "Content-Type": "application/json"
    };

    const response = await fetch(`${window.SUPABASE_URL}/rest/v1/${path}`, {
      method:"POST",
      headers,
      body:JSON.stringify(body || {})
    });

    if(!response.ok){
      const text = await response.text();
      throw new Error(`Supabase ${response.status}: ${text}`);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : null;
  }

  function renderDeleteButton(admin){
    const id = String(admin.id || "");
    const name = `${admin.first_name || ""} ${admin.last_name || ""}`.trim() || admin.display_name || admin.email || "Admin";

    return `
      <button type="button"
              class="superadmin-delete-admin-btn-v79"
              title="Admin löschen"
              aria-label="Admin löschen"
              data-admin-id="${esc(id)}"
              data-admin-name="${esc(name)}">−</button>
    `;
  }

  async function loadAdminsWithRobustDelete(){
    const list = document.getElementById("superadmin-admin-list");
    if(!list) return;

    list.innerHTML = `<div class="assignment-empty">Admins werden geladen …</div>`;

    try{
      const result = await callRpc("rpc/superadmin_list_admins_v76", authValue());
      const admins = Array.isArray(result) ? result : (result?.admins || []);

      if(!admins.length){
        list.innerHTML = `<div class="assignment-empty">Noch keine Admins angelegt.</div>`;
        return;
      }

      list.innerHTML = admins.map(admin => {
        const name = `${admin.first_name || ""} ${admin.last_name || ""}`.trim() || admin.display_name || admin.email || "Admin";
        const inst = admin.institution_name || "Ohne Institution";
        const code = admin.institution_code || "—";

        return `
          <div class="superadmin-admin-card-v76">
            <div class="superadmin-admin-avatar-v76">${esc(initials(admin.first_name, admin.last_name, admin.email))}</div>
            <div class="superadmin-admin-info-v76">
              <div class="superadmin-admin-name-v76">${esc(name)}</div>
              <div class="superadmin-admin-meta-v76">${esc(admin.email || "")}</div>
              <div class="superadmin-institution-pill-v76">${esc(inst)} · ${esc(code)}</div>
            </div>
            ${renderDeleteButton(admin)}
          </div>
        `;
      }).join("");
    }catch(error){
      console.error("TONI V79 Admins laden:", error);
      list.innerHTML = `<div class="assignment-empty">⚠️ Admins konnten nicht geladen werden:<br>${esc(error.message || error)}</div>`;
    }
  }

  async function deleteAdmin(adminId, adminName){
    if(!adminId){
      alert("Admin-ID fehlt. Bitte die Admin-Liste aktualisieren.");
      return;
    }

    const label = adminName || "diesen Admin";
    const ok = confirm(
      `Soll ${label} wirklich gelöscht werden?\n\n` +
      `Der Admin-Zugang wird aus der Datenbank entfernt.`
    );

    if(!ok) return;

    try{
      const result = await callRpc("rpc/superadmin_delete_admin_v79", {
        ...authValue(),
        p_admin_id:adminId
      });

      if(!result?.ok){
        throw new Error(result?.error || "Admin konnte nicht gelöscht werden.");
      }

      appendMsg?.("toni", `🗑️ Admin <strong>${esc(label)}</strong> wurde gelöscht.`, typeof time === "function" ? time() : "", "desktop");

      await loadAdminsWithRobustDelete();
    }catch(error){
      console.error("TONI V79 Admin löschen:", error);
      alert("Admin konnte nicht gelöscht werden:\n" + (error.message || error));
    }
  }

  // Globale Funktion für alte Inline-Buttons erhalten.
  window.toniV78DeleteAdmin = deleteAdmin;
  window.toniV79DeleteAdmin = deleteAdmin;

  // Alle Admin-Ladefunktionen überschreiben.
  window.toniV76LoadAdmins = loadAdminsWithRobustDelete;
  window.toniV77LoadAdmins = loadAdminsWithRobustDelete;
  window.toniV78LoadAdmins = loadAdminsWithRobustDelete;
  window.toniV79LoadAdmins = loadAdminsWithRobustDelete;

  // Toggle-Funktionen ebenfalls absichern.
  const originalToggle76 = window.toniV76ToggleAdminsPanel;
  const originalToggle77 = window.toniV77ToggleAdminsPanel;

  function loadIfOpenSoon(){
    setTimeout(() => {
      const body = document.getElementById("superadmin-admins-body");
      if(body?.classList.contains("open")){
        loadAdminsWithRobustDelete();
      }
    }, 120);
  }

  window.toniV76ToggleAdminsPanel = function(...args){
    const result = typeof originalToggle76 === "function" ? originalToggle76.apply(this, args) : undefined;
    loadIfOpenSoon();
    return result;
  };

  window.toniV77ToggleAdminsPanel = function(...args){
    const result = typeof originalToggle77 === "function" ? originalToggle77.apply(this, args) : undefined;
    loadIfOpenSoon();
    return result;
  };

  // Event Delegation: reagiert auch dann, wenn Inline-onclick blockiert oder überschrieben wird.
  function installDeleteDelegation(){
    if(document.body.dataset.toniV79DeleteDelegation === "1") return;
    document.body.dataset.toniV79DeleteDelegation = "1";

    document.body.addEventListener("click", event => {
      const btn = event.target.closest(".superadmin-delete-admin-btn-v78, .superadmin-delete-admin-btn-v79");
      if(!btn) return;

      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();

      deleteAdmin(btn.dataset.adminId, btn.dataset.adminName);
    }, true);
  }

  window.addEventListener("DOMContentLoaded", () => {
    installDeleteDelegation();

    setTimeout(() => {
      if(localStorage.getItem("toni_role") === "superadmin"){
        loadAdminsWithRobustDelete();
      }
    }, 1200);

    setTimeout(() => {
      const body = document.getElementById("superadmin-admins-body");
      if(body?.classList.contains("open")){
        loadAdminsWithRobustDelete();
      }
    }, 2500);
  });
})();


/* ============================================================
   Projekte nach Login laden
   ============================================================ */
(function(){
  const _orig = window.applyAuthProfile;
  window.applyAuthProfile = function(profile) {
    if (typeof _orig === 'function') _orig(profile);
    // Profil ist gesetzt -> Lade-Koordinator informieren
    if (profile?.id && window.toniReady) {
      window.toniReady.done("profile");
    }
    // Projekte laden sobald Profil gesetzt ist
    if (profile?.id && typeof loadProjects === 'function') {
      setTimeout(loadProjects, 400);
    }
  };

  // Fallback: Polling falls applyAuthProfile bereits aufgerufen wurde
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (window.TONI_AUTH_PROFILE?.id && typeof loadProjects === 'function') {
      clearInterval(poll);
      loadProjects();
    }
    if (attempts > 20) clearInterval(poll); // max 10s
  }, 500);
})();
