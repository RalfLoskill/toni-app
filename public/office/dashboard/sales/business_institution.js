/* ============================================================
   Toni Business Center — Institutionen-Detailseite
   Einheitliche Stufe (lifecycle_stage) pro Schule.
   Kopf, Vertriebsstufe, Kontakte, Vertrag, Nutzung, Notizen, Verlauf.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;
  var ID = B.qp("id");
  var ROLE = null, DET = null;

  async function load(role) {
    ROLE = role;
    $("bc-nav").innerHTML = B.nav("business_institutions.html");
    if (!ID) { $("inst-name").textContent = "Keine Schule angegeben"; return; }

    var canSales = B.canWriteSales(role), canCust = B.canWriteCustomers(role);
    if (canSales) { show("con-add"); show("lc-save"); }
    if (canCust)  { show("notes-save"); $("notes").removeAttribute("readonly"); }
    else $("notes").setAttribute("readonly", "readonly");
    if (!canSales) { $("lc-stage").disabled = true; $("lc-value").disabled = true; $("lc-prob").disabled = true; $("lc-partner").disabled = true; }

    fillStageSelect();
    wireUi();
    await refreshAll();
  }

  async function refreshAll() {
    var r = await Promise.all([
      sb.from("institutions").select("id,name,city,postal_code,street").eq("id", ID).single(),
      sb.from("crm_institution_details").select("*").eq("institution_id", ID).maybeSingle(),
      sb.from("crm_contacts").select("*").eq("institution_id", ID).order("is_primary_contact", { ascending: false }),
      sb.from("crm_subscriptions").select("*").eq("institution_id", ID).order("created_at", { ascending: false }).limit(1),
      sb.from("v_crm_institution_usage").select("*").eq("institution_id", ID).maybeSingle(),
      sb.from("crm_activities").select("*").eq("institution_id", ID).order("created_at", { ascending: false }).limit(20)
    ]);
    var inst = one(r[0]); DET = one(r[1]) || {};
    renderHeader(inst, DET);
    renderStage(DET);
    renderContacts(list(r[2]));
    renderSubscription(list(r[3])[0]);
    renderUsage(one(r[4]));
    renderActivities(list(r[5]));
    $("notes").value = DET.notes || "";
  }

  function one(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || null; }
  function list(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }

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
    $("contacts").innerHTML = rows.map(function (c) {
      var name = ((c.first_name || "") + " " + (c.last_name || "")).trim() || "(ohne Namen)";
      var tags = [];
      if (c.is_primary_contact) tags.push('<span class="pill normal">Haupt</span>');
      if (c.is_decision_maker) tags.push('<span class="pill low">Entscheider</span>');
      return '<div class="row"><div class="main"><div class="t">' + B.esc(name) +
        (c.role ? ' · <span style="color:var(--muted);font-weight:400">' + B.esc(c.role) + '</span>' : "") + '</div>' +
        '<div class="s">' + B.esc([c.email, c.phone].filter(Boolean).join(" · ") || "—") + '</div></div>' +
        tags.join(" ") + '</div>';
    }).join("");
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
    var ca = $("con-add"); if (ca) ca.addEventListener("click", function () { openM("con-modal", "c-first"); });
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
        is_decision_maker: $("c-dm").checked, is_primary_contact: $("c-primary").checked
      });
      if (res.error) throw res.error;
      closeM("con-modal");
      ["c-first","c-last","c-role","c-email","c-phone"].forEach(function (id) { $(id).value = ""; });
      $("c-dm").checked = false; $("c-primary").checked = false;
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

  window.TONI_BC_DETAIL = { renderHeader: renderHeader, renderStage: renderStage,
    renderContacts: renderContacts, renderUsage: renderUsage,
    renderSubscription: renderSubscription, renderActivities: renderActivities };

  B.mountAuth({ onReady: load });
})();
