/* ============================================================
   Toni Business Center — Institutionen-Detailseite
   Einheitliche Stufe (lifecycle_stage) pro Schule.
   Kopf, Vertriebsstufe, Kontakte, Vertrag, Nutzung, Notizen, Verlauf.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;
  var ID = B.qp("id");
  var ROLE = null, DET = null, INST = null, baseEditable = true;

  async function load(role) {
    ROLE = role;
    $("bc-nav").innerHTML = B.nav("business_institutions.html");
    if (!ID) { $("inst-name").textContent = "Keine Schule angegeben"; return; }

    var canSales = B.canWriteSales(role), canCust = B.canWriteCustomers(role);
    baseEditable = canSales;
    if (canSales) { show("con-add"); show("lc-save"); show("base-save"); show("prov-save"); }
    if (canCust)  { show("notes-save"); $("notes").removeAttribute("readonly"); }
    else $("notes").setAttribute("readonly", "readonly");
    if (!canSales) { $("lc-stage").disabled = true; $("lc-value").disabled = true; $("lc-prob").disabled = true; $("lc-partner").disabled = true;
      ["b-name","b-type","b-country","b-state","b-city","b-postal","b-street","b-website"].forEach(function (id) { $(id).disabled = true; }); }
    if (role === "admin") show("del-btn");

    fillStageSelect();
    wireUi();
    await refreshAll();
  }

  async function refreshAll() {
    var r = await Promise.all([
      sb.from("institutions").select("id,name,city,postal_code,street").eq("id", ID).single(),
      sb.from("crm_institution_details").select("*").eq("institution_id", ID).maybeSingle(),
      sb.from("v_crm_contacts_provenance").select("*").eq("institution_id", ID).order("is_primary_contact", { ascending: false }),
      sb.from("crm_subscriptions").select("*").eq("institution_id", ID).order("created_at", { ascending: false }).limit(1),
      sb.from("v_crm_institution_usage").select("*").eq("institution_id", ID).maybeSingle(),
      sb.from("crm_activities").select("*").eq("institution_id", ID).order("created_at", { ascending: false }).limit(20)
    ]);
    INST = one(r[0]); DET = one(r[1]) || {};
    renderHeader(INST, DET);
    renderStage(DET);
    renderBase(INST, DET);
    renderProvenance(DET);
    renderQualification(DET);
    renderContacts(list(r[2]));
    renderSubscription(list(r[3])[0]);
    renderUsage(one(r[4]));
    renderActivities(list(r[5]));
    $("notes").value = DET.notes || "";
    $("inst-ref").textContent = DET.crm_ref ? "ID: " + DET.crm_ref : "";
  }

  // --- Stammdaten ---------------------------------------------
  function renderBase(inst, det) {
    if (!inst) return;
    $("b-name").value = inst.name || "";
    $("b-type").value = det.institution_type || "";
    $("b-country").innerHTML = B.countryOptions(det.country || "Deutschland");
    $("b-state").innerHTML = B.stateOptions(det.state || "");
    $("b-city").value = inst.city || "";
    $("b-postal").value = inst.postal_code || "";
    $("b-street").value = inst.street || "";
    $("b-website").value = det.website || "";
    syncBaseState();
  }
  function syncBaseState() {
    var de = $("b-country").value === "Deutschland";
    $("b-state").disabled = !de || !baseEditable;
    $("b-state").style.opacity = de ? "" : ".5";
    if (!de) $("b-state").value = "";
  }
  async function saveBase() {
    if (!B.canWriteSales(ROLE)) return;
    var name = ($("b-name").value || "").trim();
    if (!name) { nmsg("base-msg", "Name darf nicht leer sein.", "err"); return; }
    $("base-save").disabled = true; nmsg("base-msg", "Speichern …");
    try {
      var i = await sb.from("institutions").update({
        name: name, city: v("b-city"), postal_code: v("b-postal"), street: v("b-street")
      }).eq("id", ID);
      if (i.error) throw i.error;
      var d = await sb.from("crm_institution_details").upsert({
        institution_id: ID, institution_type: $("b-type").value || null,
        country: $("b-country").value || "Deutschland",
        state: ($("b-country").value === "Deutschland" ? v("b-state") : null),
        website: v("b-website")
      }, { onConflict: "institution_id" });
      if (d.error) throw d.error;
      nmsg("base-msg", "Gespeichert.", "ok");
      await refreshAll();
    } catch (e) { nmsg("base-msg", "Fehler: " + ((e && e.message) || "unbekannt"), "err"); }
    finally { $("base-save").disabled = false; }
  }

  // --- Herkunft & Datenschutz (Migration 100) -----------------
  function renderProvenance(det) {
    $("p-source").innerHTML = B.sourceOptions(det.data_source_type || "");
    $("p-collected").value = det.first_collected_at ? B.ddmm(det.first_collected_at) : "–";
    var urls = det.source_urls;
    if (typeof urls === "string") { try { urls = JSON.parse(urls); } catch (e) { urls = []; } }
    $("p-urls").value = (Array.isArray(urls) ? urls : []).join("\n");
    $("p-dnc").checked = !!det.do_not_contact;
    $("p-dnc-reason").value = det.do_not_contact_reason || "";
    syncDncReason();
    if (!B.canWriteSales(ROLE)) {
      ["p-source", "p-urls", "p-dnc", "p-dnc-reason"].forEach(function (id) { $(id).disabled = true; });
    }
  }
  function syncDncReason() {
    $("p-dnc-reason-wrap").style.display = $("p-dnc").checked ? "" : "none";
  }
  async function saveProvenance() {
    if (!B.canWriteSales(ROLE)) return;
    $("prov-save").disabled = true; nmsg("prov-msg", "Speichern …");
    // Beleg-URLs: zeilenweise -> sauberes Array
    var urls = ($("p-urls").value || "").split("\n")
      .map(function (s) { return s.trim(); }).filter(Boolean);
    var patch = {
      institution_id: ID,
      data_source_type: $("p-source").value || null,
      source_urls: urls,
      do_not_contact: $("p-dnc").checked,
      do_not_contact_reason: $("p-dnc").checked ? (v("p-dnc-reason")) : null
    };
    // first_collected_at einmalig setzen, falls noch leer (Erstbeleg)
    if (!DET.first_collected_at) patch.first_collected_at = new Date().toISOString();
    var res = await sb.from("crm_institution_details").upsert(patch, { onConflict: "institution_id" });
    if (res.error) nmsg("prov-msg", "Fehler: " + res.error.message, "err");
    else { nmsg("prov-msg", "Gespeichert.", "ok"); await refreshAll(); }
    $("prov-save").disabled = false;
  }

  async function deleteInstitution() {
    if (ROLE !== "admin") return;
    var nm = INST ? INST.name : "diese Schule";
    if (!window.confirm("„" + nm + "\" wirklich unwiderruflich löschen?\n\nAlle CRM-Daten dieser Schule (Kontakte, Aktivitäten, Angebote, Verträge) werden mit gelöscht.")) return;
    var res = await sb.rpc("crm_delete_institution", { p_id: ID });
    if (res.error) { alert("Löschen nicht möglich: " + res.error.message); return; }
    location.href = "business_institutions.html";
  }

  function one(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || null; }
  function list(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }

  // --- KI-Einschätzung (von einem Mitarbeiter-Agenten erzeugt) ---
  function fitLabel(f) { return f === "high" ? "hohe Passung" : f === "medium" ? "mittlere Passung" : "geringe Passung"; }
  function fitColor(f) { return f === "high" ? "#22c55e" : f === "medium" ? "#f59e0b" : "#9ca3af"; }

  function renderQualification(det) {
    var card = $("qual-card"); if (!card) return;
    var q = det.ai_qualification || {}, a = det.ai_assessment || {};
    var hasData = det.ai_assessed_at && (Object.keys(q).length || Object.keys(a).length);
    if (!hasData) {
      card.style.display = "";
      $("qual-body").innerHTML = B.empty("Noch keine KI-Einschätzung. Ein Mitarbeiter kann diese Schule über „Leads bewerten“ einschätzen.");
      return;
    }
    card.style.display = "";
    var score = Math.round(Number(q.lead_score) || 0);
    var conf = q.confidence != null ? Math.round(Number(q.confidence) * 100) + " %" : "–";
    var needs = (q.identified_needs || []).map(function (x) { return "<li>" + B.esc(x) + "</li>"; }).join("");
    var objs = (q.likely_objections || []).map(function (x) { return "<li>" + B.esc(x) + "</li>"; }).join("");
    var acts = (a.recommended_actions || []).map(function (x) { return "<li>" + B.esc(x) + "</li>"; }).join("");
    var sig = (q.digital_signals || []).map(function (s) {
      var val = (s && s.value != null) ? s.value : s;
      var inf = s && s.inferred;
      return '<span class="sig' + (inf ? " inf" : "") + '">' + B.esc(val) + (inf ? " (vermutet)" : "") + '</span>';
    }).join("");

    $("qual-body").innerHTML =
      '<div class="qual-head">' +
        '<div class="qual-score" style="color:' + fitColor(q.toni_fit) + '">' + score + '<span>/100</span></div>' +
        '<div><div class="qual-fit" style="color:' + fitColor(q.toni_fit) + '">' + B.esc(fitLabel(q.toni_fit)) + '</div>' +
          '<div class="qual-meta">Sicherheit: ' + conf + ' · bewertet am ' + B.ddmm(det.ai_assessed_at) +
          '<span id="qual-by"></span></div></div>' +
      '</div>' +
      (a.customer_summary ? '<p class="qual-sum">' + B.esc(a.customer_summary) + '</p>' : "") +
      (sig ? '<div class="qual-sec"><h4>Digitale Signale</h4><div class="sigs">' + sig + '</div></div>' : "") +
      (needs ? '<div class="qual-sec"><h4>Vermutete Bedürfnisse</h4><ul>' + needs + '</ul></div>' : "") +
      (objs ? '<div class="qual-sec"><h4>Wahrscheinliche Einwände</h4><ul>' + objs + '</ul></div>' : "") +
      (a.main_risk ? '<div class="qual-sec"><h4>Größtes Risiko</h4><p>' + B.esc(a.main_risk) + '</p></div>' : "") +
      (acts ? '<div class="qual-sec"><h4>Empfohlene nächste Schritte</h4><ul>' + acts + '</ul></div>' : "");

    // Mitarbeitername nachladen (nicht blockierend)
    if (det.ai_assessed_by) fillAssessedBy(det.ai_assessed_by);
  }

  async function fillAssessedBy(empId) {
    try {
      var r = await sb.from("crm_employees").select("name").eq("id", empId).maybeSingle();
      var nm = r && r.data ? r.data.name : null;
      var el = $("qual-by");
      if (nm && el) el.textContent = " · durch " + nm;
    } catch (e) { /* Name optional */ }
  }

  // --- Kopf ---------------------------------------------------
  function renderHeader(inst, det) {
    if (!inst) { $("inst-name").textContent = "Schule nicht gefunden"; return; }
    $("inst-name").textContent = inst.name;
    var st = (det && det.lifecycle_stage) || "lead";
    var parts = [];
    if (det && det.institution_type) parts.push(TYPE_LABEL[det.institution_type] || det.institution_type);
    if (inst.city) parts.push((inst.postal_code ? inst.postal_code + " " : "") + inst.city);
    if (det && det.state) parts.push(det.state);
    if (det && det.is_partner) parts.push("Kooperationspartner");
    $("inst-sub").innerHTML = '<span class="sb" style="background:' + B.hexA(B.lcColor(st), .15) + ';color:' + B.lcColor(st) + '">' +
      B.esc(B.lcLabel(st)) + '</span>' + (parts.length ? '  ·  ' + B.esc(parts.join(" · ")) : "");
  }

  // --- Vertriebsstufe -----------------------------------------
  function fillStageSelect() {
    $("lc-stage").innerHTML = B.LIFECYCLE.map(function (s) {
      return '<option value="' + s[0] + '">' + s[1] + '</option>';
    }).join("");
  }
  function renderStage(det) {
    $("lc-stage").value = det.lifecycle_stage || "lead";
    $("lc-value").value = det.deal_value != null ? det.deal_value : "";
    $("lc-prob").value = det.win_probability != null ? det.win_probability : "";
    $("lc-partner").checked = !!det.is_partner;
  }

  async function saveStage() {
    if (!B.canWriteSales(ROLE)) return;
    $("lc-save").disabled = true; nmsg("lc-msg", "Speichern …");
    var stage = $("lc-stage").value;
    var patch = { institution_id: ID, lifecycle_stage: stage,
      deal_value: numOrNull("lc-value"), win_probability: numOrNull("lc-prob"),
      is_partner: $("lc-partner").checked };
    if ((stage === "churned_prospect" || stage === "churned_customer")) {
      var reason = window.prompt("Grund für den Verlust? (optional)");
      if (reason) patch.closed_reason = reason;
    }
    var res = await sb.from("crm_institution_details").upsert(patch, { onConflict: "institution_id" });
    if (res.error) nmsg("lc-msg", "Fehler: " + res.error.message, "err");
    else { nmsg("lc-msg", "Gespeichert.", "ok"); await refreshAll(); }
    $("lc-save").disabled = false;
  }

  // --- Kontakte -----------------------------------------------
  function renderContacts(rows) {
    $("con-count").textContent = rows.length;
    if (!rows.length) { $("contacts").innerHTML = B.empty("Noch keine Ansprechpartner."); return; }
    var canDel = B.canWriteCustomers(ROLE);
    $("contacts").innerHTML = rows.map(function (c) {
      var name = ((c.first_name || "") + " " + (c.last_name || "")).trim() || "(ohne Namen)";
      var tags = [];
      if (c.is_primary_contact) tags.push('<span class="pill normal">Haupt</span>');
      if (c.is_decision_maker) tags.push('<span class="pill low">Entscheider</span>');
      // Einwilligungs-Ampel (nur wenn nicht Default 'unknown', um Rauschen zu vermeiden)
      var cs = c.consent_status || "unknown";
      if (cs !== "unknown") {
        tags.push('<span class="consent-dot" title="' + B.esc(B.consentLabel(cs)) +
          '" style="background:' + B.consentColor(cs) + '"></span>');
      }
      if (c.do_not_contact) tags.push('<span class="pill high">Gesperrt</span>');
      // Von einem Agenten gefunden? -> Herkunft + Verifizierung anzeigen
      var prov = "";
      if (c.found_by_employee || c.found_at) {
        var who = c.found_by_name ? B.esc(c.found_by_name) : "einem Agenten";
        prov = '<div class="con-prov">gefunden von ' + who +
          (c.found_at ? ' · ' + B.ddmm(c.found_at) : "") +
          (c.source_url ? ' · <a href="' + B.esc(c.source_url) + '" target="_blank" rel="noopener">Beleg ↗</a>' : "") +
          '</div>';
      }
      if (c.verified) {
        tags.push('<span class="pill ok" title="Von einem Menschen geprüft">✓ Verifiziert</span>');
      } else if (c.found_by_employee) {
        tags.push('<span class="pill warn">Ungeprüft</span>');
      }
      var verifyBtn = (canDel && !c.verified && c.found_by_employee)
        ? ' <button class="con-verify" data-id="' + c.id + '" title="Als geprüft markieren">✓</button>' : "";
      return '<div class="row"><div class="main"><div class="t">' + B.esc(name) +
        (c.role ? ' · <span style="color:var(--muted);font-weight:400">' + B.esc(c.role) + '</span>' : "") + '</div>' +
        '<div class="s">' + B.esc([c.email, c.phone].filter(Boolean).join(" · ") || "—") + '</div>' +
        prov + '</div>' +
        tags.join(" ") + verifyBtn +
        (canDel ? ' <button class="con-del" data-id="' + c.id + '" title="Ansprechpartner löschen" aria-label="Löschen">×</button>' : "") +
        '</div>';
    }).join("");
    Array.prototype.forEach.call($("contacts").querySelectorAll(".con-del"), function (btn) {
      btn.addEventListener("click", function () { deleteContact(btn.getAttribute("data-id")); });
    });
    Array.prototype.forEach.call($("contacts").querySelectorAll(".con-verify"), function (btn) {
      btn.addEventListener("click", function () { verifyContact(btn.getAttribute("data-id")); });
    });
  }

  // Ansprechpartner als geprüft markieren (Mensch bestätigt die Agentendaten)
  async function verifyContact(cid) {
    if (!B.canWriteCustomers(ROLE)) return;
    var u = null;
    try { var g = await sb.auth.getUser(); u = g && g.data && g.data.user ? g.data.user.id : null; } catch (e) {}
    var res = await sb.from("crm_contacts").update({
      verified: true, verified_at: new Date().toISOString(), verified_by: u
    }).eq("id", cid);
    if (res.error) { console.warn(res.error.message); return; }
    await refreshAll();
  }

  async function deleteContact(cid) {
    if (!B.canWriteCustomers(ROLE)) return;
    if (!window.confirm("Diesen Ansprechpartner löschen?")) return;
    var res = await sb.from("crm_contacts").delete().eq("id", cid);
    if (res.error) { alert("Löschen nicht möglich: " + res.error.message); return; }
    await refreshAll();
  }

  // --- Vertrag / Nutzung / Verlauf ----------------------------
  function renderSubscription(s) {
    if (!s) { $("subscription").innerHTML = B.empty("Kein Vertrag hinterlegt."); return; }
    var rows = [["Plan", B.esc(s.plan_name)], ["Status", B.esc(SUB_STATUS[s.status] || s.status)]];
    if (s.status === "trial") rows.push(["Testphase bis", B.ddmm(s.trial_end_date)]);
    if (s.amount != null) rows.push(["Betrag", B.euro(s.amount) + (s.billing_cycle ? " / " + CYCLE[s.billing_cycle] : "")]);
    if (s.renewal_date || s.end_date) rows.push(["Verlängerung", B.ddmm(s.renewal_date || s.end_date)]);
    $("subscription").innerHTML = rows.map(function (r) {
      return '<div class="row"><div class="main s" style="color:var(--muted)">' + r[0] + '</div><div style="font-weight:600">' + r[1] + '</div></div>';
    }).join("");
  }
  function renderUsage(u) {
    if (!u) { $("usage").innerHTML = B.empty("Keine Nutzungsdaten."); return; }
    var since = u.days_since_activity;
    $("usage").innerHTML = '<div class="stat-row">' +
      stat(u.active_teachers, "Lehrkräfte") + stat(u.active_students, "Lernende") +
      stat(u.journeys_created, "Lernreisen") + stat(u.ai_prompts_30d, "KI-Prompts (30 T.)") + '</div>' +
      '<div class="row" style="margin-top:12px"><div class="main s" style="color:var(--muted)">Letzte Aktivität</div>' +
      '<div style="font-weight:600">' + (since == null ? "—" : since === 0 ? "heute" : "vor " + since + " Tagen") + '</div></div>';
  }
  function stat(n, l) { return '<div class="stat"><div class="n">' + B.num(n) + '</div><div class="l">' + l + '</div></div>'; }

  function renderActivities(rows) {
    $("act-count").textContent = rows.length;
    if (!rows.length) { $("activities").innerHTML = B.empty("Noch keine Aktivitäten."); return; }
    $("activities").innerHTML = rows.map(function (a) {
      var when = B.ddmm(a.completed_at || a.scheduled_at || a.created_at);
      var done = a.status === "done";
      return '<div class="row"><div class="time" style="min-width:78px;font-size:12px">' + when + '</div>' +
        '<div class="main"><div class="t">' + B.esc(a.subject) + '</div>' +
        '<div class="s">' + B.esc(ACT_TYPE[a.activity_type] || a.activity_type) + (done ? " · erledigt" : "") + '</div></div>' +
        (a.status === "open" && a.priority === "high" ? '<span class="pill high">Priorität</span>' : "") + '</div>';
    }).join("");
  }

  // --- UI-Verdrahtung -----------------------------------------
  function wireUi() {
    var na = $("notes-save"); if (na) na.addEventListener("click", saveNotes);
    var ls = $("lc-save"); if (ls) ls.addEventListener("click", saveStage);
    var bs = $("base-save"); if (bs) bs.addEventListener("click", saveBase);
    var bc = $("b-country"); if (bc) bc.addEventListener("change", syncBaseState);
    var db = $("del-btn"); if (db) db.addEventListener("click", deleteInstitution);
    var ps = $("prov-save"); if (ps) ps.addEventListener("click", saveProvenance);
    var pd = $("p-dnc"); if (pd) pd.addEventListener("change", syncDncReason);
    var ca = $("con-add"); if (ca) ca.addEventListener("click", function () {
      $("c-source").innerHTML = B.sourceOptions("");
      $("c-consent").innerHTML = B.consentOptions("unknown");
      openM("con-modal", "c-first");
    });
    $("con-cancel").addEventListener("click", function () { closeM("con-modal"); });
    $("con-savebtn").addEventListener("click", saveContact);
    $("con-modal").addEventListener("click", function (e) { if (e.target === $("con-modal")) $("con-modal").style.display = "none"; });
  }

  async function saveNotes() {
    $("notes-save").disabled = true; nmsg("notes-msg", "Speichern …");
    var res = await sb.from("crm_institution_details")
      .upsert({ institution_id: ID, notes: $("notes").value }, { onConflict: "institution_id" });
    if (res.error) nmsg("notes-msg", "Fehler: " + res.error.message, "err");
    else nmsg("notes-msg", "Gespeichert.", "ok");
    $("notes-save").disabled = false;
  }

  async function saveContact() {
    $("con-savebtn").disabled = true; nmsg("con-msg", "Speichern …");
    try {
      var res = await sb.from("crm_contacts").insert({
        institution_id: ID, first_name: v("c-first"), last_name: v("c-last"), role: v("c-role"),
        email: v("c-email"), phone: v("c-phone"),
        is_decision_maker: $("c-dm").checked, is_primary_contact: $("c-primary").checked,
        source: $("c-source").value || null, source_url: v("c-source-url"),
        consent_status: $("c-consent").value || "unknown", do_not_contact: $("c-dnc").checked
      });
      if (res.error) throw res.error;
      closeM("con-modal");
      ["c-first","c-last","c-role","c-email","c-phone","c-source-url"].forEach(function (id) { $(id).value = ""; });
      $("c-dm").checked = false; $("c-primary").checked = false; $("c-dnc").checked = false;
      await refreshAll();
    } catch (e) { nmsg("con-msg", "Fehler: " + ((e && e.message) || "unbekannt"), "err"); }
    finally { $("con-savebtn").disabled = false; }
  }

  function show(id) { var e = $(id); if (e) e.style.display = ""; }
  function v(id) { var x = ($(id).value || "").trim(); return x || null; }
  function numOrNull(id) { var x = $(id).value; return x === "" ? null : Number(x); }
  function openM(id, focusId) { $(id).style.display = "flex"; if (focusId) $(focusId).focus(); }
  function closeM(id) { $(id).style.display = "none"; }
  function nmsg(el, t, type) { var m = $(el); m.textContent = t; m.className = "login-msg " + (type || ""); }

  var TYPE_LABEL = {
    berufskolleg: "Berufskolleg", berufsschule: "Berufsschule", gymnasium: "Gymnasium",
    gesamtschule: "Gesamtschule", realschule: "Realschule", hauptschule: "Hauptschule",
    grundschule: "Grundschule", foerderschule: "Förderschule", hochschule: "Hochschule",
    schultraeger: "Schulträger", ministerium: "Ministerium", sonstige: "Sonstige"
  };
  var SUB_STATUS = { trial: "Testphase", active: "Aktiv", paused: "Pausiert", cancelled: "Gekündigt", expired: "Abgelaufen" };
  var CYCLE = { monthly: "Monat", quarterly: "Quartal", yearly: "Jahr" };
  var ACT_TYPE = { call: "Telefonat", email: "E-Mail", meeting: "Termin", demo: "Demo",
    follow_up: "Follow-up", note: "Notiz", contract_review: "Vertragsprüfung", task: "Aufgabe" };

  window.TONI_BC_DETAIL = { renderHeader: renderHeader, renderStage: renderStage, renderBase: renderBase,
    renderContacts: renderContacts, renderUsage: renderUsage,
    renderSubscription: renderSubscription, renderActivities: renderActivities,
    setRole: function (r) { ROLE = r; } };

  B.mountAuth({ onReady: load });
})();
