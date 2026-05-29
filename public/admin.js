/* ============================================================
   TONI – admin.js
   Tutor-Verwaltung, QR-Einladung, Admin-Verwaltung
   Ausgelagert aus index.html (V110)
   ============================================================ */

/* TONI V59 – aufklappbares Admin-Feld „Tutoren“ */

window.TONI_V59_TUTORS_OPEN = sessionStorage.getItem("toni_section_tutors_open") === "1";

function toniV59Role(){
  return (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) ||
         localStorage.getItem("toni_role") ||
         "student";
}

function toniV59ApplyTutorsVisibility(){
  const panel = document.getElementById("tutors-admin-panel");
  if(!panel) return;

  const show = toniV59Role() === "admin";
  panel.style.display = show ? "" : "none";
  panel.classList.toggle("visible", show);

  if(show){
    toniV59ApplyTutorsState();
  }
}

function toniV59ApplyTutorsState(){
  const body = document.getElementById("tutors-admin-panel-body");
  const note = document.getElementById("tutors-admin-panel-collapsed-note");
  const symbol = document.getElementById("tutors-admin-panel-toggle-symbol");

  if(body) body.classList.toggle("open", !!window.TONI_V59_TUTORS_OPEN);
  if(note) note.classList.toggle("hidden", !!window.TONI_V59_TUTORS_OPEN);
  if(symbol) symbol.textContent = window.TONI_V59_TUTORS_OPEN ? "−" : "+";

  sessionStorage.setItem("toni_section_tutors_open", window.TONI_V59_TUTORS_OPEN ? "1" : "0");
}

function toniV59ToggleTutorsPanel(){
  window.TONI_V59_TUTORS_OPEN = !window.TONI_V59_TUTORS_OPEN;
  toniV59ApplyTutorsState();

  if(window.TONI_V59_TUTORS_OPEN){
    setTimeout(toniV59LoadTutors, 80);
  }
}

function toniV59Escape(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function toniV59Initials(name, email){
  const source = String(name || email || "Tutor").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if(parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return source.slice(0,2).toUpperCase();
}

async function toniV59LoadTutors(){
  const list = document.getElementById("tutors-admin-list");
  if(!list) return;

  list.innerHTML = `<div class="assignment-empty">Tutoren werden geladen …</div>`;

  try{
    let tutors = [];

    if(typeof supabaseRequest === "function"){
      try{
        tutors = await supabaseRequest(
          "profiles?select=id,display_name,email,class_name,role&role=eq.tutor&order=display_name.asc"
        );
      }catch(error){
        console.warn("TONI V59: Tutoren konnten nicht aus Supabase geladen werden, nutze lokalen Fallback:", error);
      }
    }

    if((!tutors || !tutors.length) && Array.isArray(window.TONI_PROFILES)){
      tutors = window.TONI_PROFILES.filter(p => p.role === "tutor");
    }

    if((!tutors || !tutors.length) && Array.isArray(window.TONI_PROFILE_FALLBACKS)){
      tutors = window.TONI_PROFILE_FALLBACKS.filter(p => p.role === "tutor");
    }

    if(!tutors || !tutors.length){
      list.innerHTML = `<div class="assignment-empty">Noch keine Tutoren angelegt.</div>`;
      return;
    }

    list.innerHTML = tutors.map(tutor => {
      const name = tutor.display_name || tutor.email || "Tutor";
      const email = tutor.email || "";
      const klass = tutor.class_name || "";
      return `
        <div class="tutor-card-v59">
          <div class="tutor-avatar-v59">${toniV59Escape(toniV59Initials(name, email))}</div>
          <div class="tutor-info-v59">
            <div class="tutor-name-v59">${toniV59Escape(name)}</div>
            <div class="tutor-meta-v59">${toniV59Escape(email)}${klass ? " · " + toniV59Escape(klass) : ""}</div>
          </div>
          <span class="tutor-role-pill-v59">Tutor</span>
        </div>
      `;
    }).join("");
  }catch(error){
    console.error("TONI V59 Tutoren laden:", error);
    list.innerHTML = `<div class="assignment-empty">⚠️ Tutoren konnten nicht geladen werden:<br>${toniV59Escape(error.message || error)}</div>`;
  }
}

["applyRoleUI","toniV8ApplyRoleClasses","toniV12ApplyDashboard","toniV14ApplyCompletedProfile"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV59ApplyTutorsVisibility, 100);
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV59ApplyTutorsVisibility, 400);
  setTimeout(toniV59ApplyTutorsVisibility, 1200);
  setTimeout(toniV59ApplyTutorsVisibility, 3000);

  if(window.TONI_V59_TUTORS_OPEN){
    setTimeout(toniV59LoadTutors, 1300);
  }
});

/* TONI V60 – Tutoren per QR-Code einladen und löschen */

window.TONI_V60_CURRENT_TUTOR_INVITE_LINK = "";
window.TONI_V60_CURRENT_TUTOR_INVITE_QR = "";

function toniV60IsAdmin(){
  const role = (window.TONI_AUTH_PROFILE && window.TONI_AUTH_PROFILE.role) ||
    localStorage.getItem("toni_role") ||
    "student";
  return role === "admin";
}

function toniV60Escape(value){
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function toniV60InstallTutorHeaderButton(){
  const panel = document.getElementById("tutors-admin-panel");
  const header = panel?.querySelector(".card-header");
  if(!header || document.getElementById("tutor-add-btn-v60")) return;

  const roleBadge = header.querySelector(".role-badge");
  const actions = document.createElement("div");
  actions.className = "tutors-header-actions-v60";
  actions.innerHTML = `
    <button class="tutor-add-btn-v60" id="tutor-add-btn-v60" title="Tutor per QR-Code einladen" onclick="toniV60CreateTutorInviteQr(event)">+</button>
  `;

  if(roleBadge){
    roleBadge.replaceWith(actions);
    actions.appendChild(roleBadge);
  }else{
    header.appendChild(actions);
  }
}

function toniV60QrImageUrl(payload, size=640){
  if(typeof qrImageUrlV20 === "function"){
    try{return qrImageUrlV20(payload, size);}
    catch{}
  }
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(payload)}`;
}

function toniV60TutorInviteLink(inviteId){
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set("tutor_invite", inviteId);
  return url.toString();
}

function toniV60SetTutorInviteMessage(text, type="ok"){
  const box = document.getElementById("tutor-invite-message-v60");
  if(!box) return;
  box.className = "auth-message visible " + (type === "err" ? "err" : "ok");
  box.innerHTML = text;
}

async function toniV60CreateTutorInviteQr(event){
  event?.stopPropagation?.();

  if(!toniV60IsAdmin()){
    alert("Nur Admins können Tutoren einladen.");
    return;
  }

  try{
    const result = await supabaseRequest("rpc/create_tutor_invite_v60", {
      method:"POST",
      body:JSON.stringify({})
    });

    const inviteId =
      result?.invite_id ||
      result?.id ||
      result?.[0]?.invite_id ||
      result?.[0]?.id;

    if(!inviteId) throw new Error("Die Einladungs-ID konnte nicht erzeugt werden.");

    const link = toniV60TutorInviteLink(inviteId);
    const qr = toniV60QrImageUrl(link, 640);

    window.TONI_V60_CURRENT_TUTOR_INVITE_LINK = link;
    window.TONI_V60_CURRENT_TUTOR_INVITE_QR = qr;

    document.getElementById("tutor-invite-link-v60").textContent = link;
    document.getElementById("tutor-invite-qr-v60").src = qr;
    document.getElementById("tutor-invite-modal-v60")?.classList.add("open");

    toniV60SetTutorInviteMessage("✅ Tutor-Einladung wurde erzeugt. Der QR-Code kann jetzt weitergegeben werden.");
  }catch(error){
    console.error("TONI V60 Tutor-Einladung:", error);
    alert("Tutor-Einladung konnte nicht erzeugt werden:\n" + (error.message || error));
  }
}

function toniV60CloseTutorInviteModal(){
  document.getElementById("tutor-invite-modal-v60")?.classList.remove("open");
}

async function toniV60CopyTutorInviteLink(){
  try{
    await navigator.clipboard.writeText(window.TONI_V60_CURRENT_TUTOR_INVITE_LINK || "");
    toniV60SetTutorInviteMessage("✅ Link wurde kopiert.");
  }catch{
    toniV60SetTutorInviteMessage("⚠️ Link konnte nicht automatisch kopiert werden.", "err");
  }
}

function toniV60DownloadTutorInviteQr(){
  const qr = window.TONI_V60_CURRENT_TUTOR_INVITE_QR;
  if(!qr) return;

  const a = document.createElement("a");
  a.href = qr;
  a.download = "toni-tutor-einladung-qr.png";
  a.target = "_blank";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

async function toniV60DeleteTutor(profileId, name){
  if(!toniV60IsAdmin()){
    alert("Nur Admins können Tutoren löschen.");
    return;
  }

  if(!profileId){
    alert("Tutor-ID fehlt.");
    return;
  }

  const label = name || "diesen Tutor";
  if(!confirm(`Soll ${label} wirklich aus der Datenbank gelöscht werden?`)){
    return;
  }

  try{
    await supabaseRequest("rpc/delete_tutor_v60", {
      method:"POST",
      body:JSON.stringify({p_profile_id:profileId})
    });

    appendMsg?.("toni", "🗑️ Tutor wurde gelöscht.", typeof time === "function" ? time() : "", "desktop");
    await toniV59LoadTutors();
  }catch(error){
    console.error("TONI V60 Tutor löschen:", error);
    alert("Tutor konnte nicht gelöscht werden:\n" + (error.message || error));
  }
}

// V59-Ladefunktion überschreiben: zusätzlich Minuszeichen hinter jedem Tutor.
window.toniV59LoadTutors = async function(){
  const list = document.getElementById("tutors-admin-list");
  if(!list) return;

  list.innerHTML = `<div class="assignment-empty">Tutoren werden geladen …</div>`;

  try{
    let tutors = [];

    if(typeof supabaseRequest === "function"){
      tutors = await supabaseRequest(
        "profiles?select=id,display_name,email,class_name,role&role=eq.tutor&order=display_name.asc"
      );
    }

    if(!tutors || !tutors.length){
      list.innerHTML = `<div class="assignment-empty">Noch keine Tutoren angelegt.</div>`;
      return;
    }

    list.innerHTML = tutors.map(tutor => {
      const name = tutor.display_name || tutor.email || "Tutor";
      const email = tutor.email || "";
      const klass = tutor.class_name || "";

      const initials = typeof toniV59Initials === "function"
        ? toniV59Initials(name, email)
        : String(name || email || "TU").slice(0,2).toUpperCase();

      return `
        <div class="tutor-card-v59">
          <div class="tutor-avatar-v59">${toniV60Escape(initials)}</div>
          <div class="tutor-info-v59">
            <div class="tutor-name-v59">${toniV60Escape(name)}</div>
            <div class="tutor-meta-v59">${toniV60Escape(email)}${klass ? " · " + toniV60Escape(klass) : ""}</div>
          </div>
          <span class="tutor-role-pill-v59">Tutor</span>
          <button class="tutor-delete-btn-v60" title="Tutor löschen" onclick="toniV60DeleteTutor('${toniV60Escape(tutor.id)}','${toniV60Escape(name)}')">−</button>
        </div>
      `;
    }).join("");
  }catch(error){
    console.error("TONI V60 Tutoren laden:", error);
    list.innerHTML = `<div class="assignment-empty">⚠️ Tutoren konnten nicht geladen werden:<br>${toniV60Escape(error.message || error)}</div>`;
  }
};

function toniV60GetTutorInviteFromUrl(){
  try{
    return new URL(window.location.href).searchParams.get("tutor_invite");
  }catch{
    return null;
  }
}

function toniV60SetPendingTutorInvite(inviteId){
  if(inviteId){
    localStorage.setItem("toni_pending_tutor_invite", inviteId);
  }
}

function toniV60GetPendingTutorInvite(){
  return toniV60GetTutorInviteFromUrl() ||
    localStorage.getItem("toni_pending_tutor_invite") ||
    "";
}

function toniV60ApplyTutorInviteLanding(){
  const inviteId = toniV60GetTutorInviteFromUrl();
  if(!inviteId) return;

  toniV60SetPendingTutorInvite(inviteId);

  const note = document.getElementById("auth-login-note");
  if(note){
    note.innerHTML = "Du wurdest als <strong>Tutor</strong> eingeladen. Gib deine E-Mail-Adresse ein. Ist die Adresse neu, sendet TONI eine Verifizierungs-Mail. Danach vervollständigst du dein Profil.";
  }

  setTimeout(() => {
    if(typeof openAuthModal === "function"){
      openAuthModal();
      setAuthMessage?.("Tutor-Einladung erkannt. Bitte gib deine E-Mail-Adresse ein.", "ok");
    }
  }, 650);
}

// Verifizierungslink für Tutor-Einladungen immer mit tutor_invite-Parameter erzeugen.
if(typeof window.sendVerificationMail === "function"){
  const TONI_V60_ORIGINAL_SEND_VERIFICATION = window.sendVerificationMail;
  window.sendVerificationMail = async function(email){
    const inviteId = toniV60GetPendingTutorInvite();

    if(!inviteId){
      return TONI_V60_ORIGINAL_SEND_VERIFICATION.apply(this, arguments);
    }

    const client = getSupabaseClient();
    try{
      const redirectTo = toniV60TutorInviteLink(inviteId);
      const {error} = await client.auth.signInWithOtp({
        email,
        options:{emailRedirectTo:redirectTo}
      });
      if(error) throw error;

      setAuthMessage?.("✅ Verifizierungs-Mail für die Tutor-Registrierung wurde gesendet. Bitte öffne den Link und vervollständige anschließend dein Profil.", "ok");
    }catch(error){
      console.error(error);
      setAuthMessage?.("⚠️ Verifizierungs-Mail konnte nicht gesendet werden:<br>" + escapeHtml(error.message), "err");
    }
  };
}

async function toniV60AcceptTutorInviteIfPresent(){
  const inviteId = toniV60GetPendingTutorInvite();
  if(!inviteId || !window.TONI_AUTH_PROFILE?.id) return;

  try{
    const result = await supabaseRequest("rpc/accept_tutor_invite_v60", {
      method:"POST",
      body:JSON.stringify({p_invite_id:inviteId})
    });

    localStorage.removeItem("toni_pending_tutor_invite");

    window.TONI_AUTH_PROFILE = {
      ...(window.TONI_AUTH_PROFILE || {}),
      role:"tutor",
      profile_complete:true,
      password_set:true
    };

    localStorage.setItem("toni_role", "tutor");

    if(typeof toniV77ApplyProfile === "function"){
      toniV77ApplyProfile(window.TONI_AUTH_PROFILE);
    }else{
      applyAuthProfile?.(window.TONI_AUTH_PROFILE);
      applyRoleUI?.();
    }

    appendMsg?.("toni", "✅ Deine Tutor-Registrierung ist abgeschlossen. Du hast jetzt Tutor-Rechte.", typeof time === "function" ? time() : "", "desktop");
  }catch(error){
    console.warn("TONI V60 Tutor-Einladung konnte noch nicht angenommen werden:", error);
  }
}

// Nach Abschluss der normalen Registrierung Tutor-Einladung annehmen.
if(typeof window.completeSelfRegistration === "function"){
  const TONI_V60_ORIGINAL_COMPLETE_REGISTRATION = window.completeSelfRegistration;
  window.completeSelfRegistration = async function(...args){
    const result = await TONI_V60_ORIGINAL_COMPLETE_REGISTRATION.apply(this, args);
    setTimeout(toniV60AcceptTutorInviteIfPresent, 900);
    setTimeout(toniV60AcceptTutorInviteIfPresent, 2200);
    return result;
  };
}

// Auch bei bestehendem Nutzer nach Login versuchen.
["applyAuthProfile","toniV77ApplyProfile","toniV9ApplyProfile"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV60AcceptTutorInviteIfPresent, 700);
      return result;
    };
  }
});

["applyRoleUI","toniV8ApplyRoleClasses","toniV12ApplyDashboard","toniV14ApplyCompletedProfile"].forEach(fnName => {
  if(typeof window[fnName] === "function"){
    const original = window[fnName];
    window[fnName] = function(...args){
      const result = original.apply(this, args);
      setTimeout(toniV60InstallTutorHeaderButton, 100);
      return result;
    };
  }
});

window.addEventListener("DOMContentLoaded", () => {
  setTimeout(toniV60InstallTutorHeaderButton, 400);
  setTimeout(toniV60InstallTutorHeaderButton, 1200);
  setTimeout(toniV60ApplyTutorInviteLanding, 900);
  setTimeout(toniV60AcceptTutorInviteIfPresent, 2600);
});

/* TONI V78 – Admins per Minuszeichen löschen */

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

  function jsString(value){
    return JSON.stringify(String(value ?? ""));
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

  async function loadAdminsWithDelete(){
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
            <button class="superadmin-delete-admin-btn-v78"
                    title="Admin löschen"
                    aria-label="Admin löschen"
                    onclick="toniV78DeleteAdmin(${jsString(admin.id)}, ${jsString(name)})">−</button>
          </div>
        `;
      }).join("");
    }catch(error){
      console.error("TONI V78 Admins laden:", error);
      list.innerHTML = `<div class="assignment-empty">⚠️ Admins konnten nicht geladen werden:<br>${esc(error.message || error)}</div>`;
    }
  }

  window.toniV78DeleteAdmin = async function(adminId, adminName){
    if(!adminId){
      alert("Admin-ID fehlt.");
      return;
    }

    const label = adminName || "diesen Admin";
    const ok = confirm(
      `Soll ${label} wirklich gelöscht werden?\n\n` +
      `Der Admin-Zugang wird aus der Datenbank entfernt.`
    );

    if(!ok) return;

    try{
      const result = await callRpc("rpc/superadmin_delete_admin_v78", {
        ...authValue(),
        p_admin_id:adminId
      });

      if(!result?.ok){
        throw new Error(result?.error || "Admin konnte nicht gelöscht werden.");
      }

      appendMsg?.("toni", `🗑️ Admin <strong>${esc(label)}</strong> wurde gelöscht.`, typeof time === "function" ? time() : "", "desktop");

      await loadAdminsWithDelete();
    }catch(error){
      console.error("TONI V78 Admin löschen:", error);
      alert("Admin konnte nicht gelöscht werden:\n" + (error.message || error));
    }
  };

  // Vorhandene Ladefunktionen überschreiben, damit das Minuszeichen immer erscheint.
  window.toniV76LoadAdmins = loadAdminsWithDelete;
  window.toniV77LoadAdmins = loadAdminsWithDelete;
  window.toniV78LoadAdmins = loadAdminsWithDelete;

  window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
      if(localStorage.getItem("toni_role") === "superadmin"){
        loadAdminsWithDelete();
      }
    }, 1400);
  });
})();

