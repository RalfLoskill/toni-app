/* ============================================================
   Toni Business Center — Institutionen-Detailseite
   Kopf, Chancen, Kontakte, Vertrag, Nutzung, Notizen, Verlauf.
   Schreibzugriff je nach Rolle (RLS sichert zusätzlich ab).
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;
  var ID = B.qp("id");
  var ROLE = null;

  async function load(role) {
    ROLE = role;
    $("bc-nav").innerHTML = B.nav("business_institutions.html");
    if (!ID) { $("inst-name").textContent = "Keine Schule angegeben"; return; }

    var canSales = B.canWriteSales(role), canCust = B.canWriteCustomers(role);
    if (canSales) { show("opp-add"); show("con-add"); }
    if (canCust)  { show("notes-save"); $("notes").removeAttribute("readonly"); }
    else $("notes").setAttribute("readonly", "readonly");

    fillStageSelect();
    wireUi();
    await refreshAll();
  }

  async function refreshAll() {
    var r = await Promise.all([
      sb.from("institutions").select("id,name,city,postal_code,street").eq("id", ID).single(),
      sb.from("crm_institution_details").select("*").eq("institution_id", ID).maybeSingle(),
      sb.from("v_crm_institution_status").select("status").eq("institution_id", ID).maybeSingle(),
      sb.from("crm_opportunities").select("*").eq("institution_id", ID).order("created_at", { ascending: false }),
      sb.from("crm_contacts").select("*").eq("institution_id", ID).order("is_primary_contact", { ascending: false }),
      sb.from("crm_subscriptions").select("*").eq("institution_id", ID).order("created_at", { ascending: false }).limit(1),
      sb.from("v_crm_institution_usage").select("*").eq("institution_id", ID).maybeSingle(),
      sb.from("crm_activities").select("*").eq("institution_id", ID).order("created_at", { ascending: false }).limit(20)
    ]);
    renderHeader(one(r[0]), one(r[1]), one(r[2]));
    renderOpps(list(r[3]));
    renderContacts(list(r[4]));
    renderSubscription(list(r[5])[0]);
    renderUsage(one(r[6]));
    renderActivities(list(r[7]));
    var d = one(r[1]) || {};
    $("notes").value = d.notes || "";
  }

  function one(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || null; }
  function list(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }

  // --- Kopf ---------------------------------------------------
  function renderHeader(inst, det, st) {
    if (!inst) { $("inst-name").textContent = "Schule nicht gefunden"; return; }
    $("inst-name").textContent = inst.name;
    var status = st ? st.status : "prospect";
    var parts = [];
    if (det && det.institution_type) parts.push(TYPE_LABEL[det.institution_type] || det.institution_type);
    if (inst.city) parts.push((inst.postal_code ? inst.postal_code + " " : "") + inst.city);
    if (det && det.state) parts.push(det.state);
    $("inst-sub").innerHTML = '<span class="sb ' + status + '">' + B.esc(B.STATUS_LABEL[status] || status) + '</span>' +
      (parts.length ? '  ·  ' + B.esc(parts.join(" · ")) : "");
  }

  // --- Chancen ------------------------------------------------
  function renderOpps(rows) {
    $("opp-count").textContent = rows.length;
    if (!rows.length) { $("opps").innerHTML = B.empty("Noch keine Chancen."); return; }
    $("opps").innerHTML = rows.map(function (o) {
      var canEdit = B.canWriteSales(ROLE);
      var stageSel = canEdit
        ? '<select class="opp-stage" data-id="' + o.id + '" style="border:1px solid var(--line);border-radius:8px;padding:4px 8px;font:inherit;font-size:12px">' +
            B.STAGES.map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === o.stage ? " selected" : "") + '>' + s[1] + '</option>'; }).join("") + '</select>'
        : '<span class="pill" style="background:' + B.hexA(B.stageColor(o.stage), .15) + ';color:' + B.stageColor(o.stage) + '">' + B.esc(B.stageLabel(o.stage)) + '</span>';
      return '<div class="row"><div class="main"><div class="t">' + B.esc(o.title) + '</div>' +
        '<div class="s">' + (o.expected_value != null ? B.euro(o.expected_value) : "kein Wert") +
        (o.probability != null ? ' · ' + o.probability + ' %' : "") + '</div></div>' + stageSel + '</div>';
    }).join("");
    Array.prototype.forEach.call($("opps").querySelectorAll(".opp-stage"), function (sel) {
      sel.addEventListener("change", function () { changeStage(sel.getAttribute("data-id"), sel.value, sel); });
    });
  }

  async function changeStage(id, stage, sel) {
    sel.disabled = true;
    var patch = { stage: stage };
    // 'lost' verlangt einen Grund (DB-Constraint) -> nachfragen
    if (stage === "lost") {
      var reason = window.prompt("Grund für 'Verloren'?");
      if (!reason) { sel.disabled = false; await refreshAll(); return; }
      patch.loss_reason = reason;
    }
    var res = await sb.from("crm_opportunities").update(patch).eq("id", id);
    if (res.error) alert("Fehler: " + res.error.message);
    await refreshAll();
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

  // --- Vertrag ------------------------------------------------
  function renderSubscription(s) {
    if (!s) { $("subscription").innerHTML = B.empty("Kein Vertrag hinterlegt."); return; }
    var rows = [
      ["Plan", B.esc(s.plan_name)],
      ["Status", B.esc(SUB_STATUS[s.status] || s.status)]
    ];
    if (s.status === "trial") rows.push(["Testphase bis", B.ddmm(s.trial_end_date)]);
    if (s.amount != null) rows.push(["Betrag", B.euro(s.amount) + (s.billing_cycle ? " / " + CYCLE[s.billing_cycle] : "")]);
    if (s.renewal_date || s.end_date) rows.push(["Verlängerung", B.ddmm(s.renewal_date || s.end_date)]);
    $("subscription").innerHTML = rows.map(function (r) {
      return '<div class="row"><div class="main s" style="color:var(--muted)">' + r[0] + '</div><div style="font-weight:600">' + r[1] + '</div></div>';
    }).join("");
  }

  // --- Nutzung ------------------------------------------------
  function renderUsage(u) {
    if (!u) { $("usage").innerHTML = B.empty("Keine Nutzungsdaten."); return; }
    var since = u.days_since_activity;
    $("usage").innerHTML = '<div class="stat-row">' +
      stat(u.active_teachers, "Lehrkräfte") +
      stat(u.active_students, "Lernende") +
      stat(u.journeys_created, "Lernreisen") +
      stat(u.ai_prompts_30d, "KI-Prompts (30 T.)") +
      '</div>' +
      '<div class="row" style="margin-top:12px"><div class="main s" style="color:var(--muted)">Letzte Aktivität</div>' +
      '<div style="font-weight:600">' + (since == null ? "—" : since === 0 ? "heute" : "vor " + since + " Tagen") + '</div></div>';
  }
  function stat(n, l) { return '<div class="stat"><div class="n">' + B.num(n) + '</div><div class="l">' + l + '</div></div>'; }

  // --- Verlauf ------------------------------------------------
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

    var ca = $("con-add"); if (ca) ca.addEventListener("click", function () { openM("con-modal", "c-first"); });
    $("con-cancel").addEventListener("click", function () { closeM("con-modal"); });
    $("con-savebtn").addEventListener("click", saveContact);

    var oa = $("opp-add"); if (oa) oa.addEventListener("click", function () { openM("opp-modal", "o-title"); });
    $("opp-cancel").addEventListener("click", function () { closeM("opp-modal"); });
    $("opp-savebtn").addEventListener("click", saveOpp);

    [$("con-modal"), $("opp-modal")].forEach(function (m) {
      m.addEventListener("click", function (e) { if (e.target === m) m.style.display = "none"; });
    });
  }

  function fillStageSelect() {
    // Beim Anlegen nur offene Stufen anbieten
    $("o-stage").innerHTML = B.STAGES.filter(function (s) { return s[0] !== "won" && s[0] !== "lost"; })
      .map(function (s) { return '<option value="' + s[0] + '"' + (s[0] === "qualified" ? " selected" : "") + '>' + s[1] + '</option>'; }).join("");
  }

  async function saveNotes() {
    $("notes-save").disabled = true; nmsg("notes-msg", "Speichern …");
    // Upsert, falls noch keine Detailzeile existiert
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
        institution_id: ID,
        first_name: v("c-first"), last_name: v("c-last"), role: v("c-role"),
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

  async function saveOpp() {
    var title = ($("o-title").value || "").trim();
    if (!title) { nmsg("opp-msg", "Bitte einen Titel eingeben.", "err"); return; }
    $("opp-savebtn").disabled = true; nmsg("opp-msg", "Speichern …");
    try {
      var res = await sb.from("crm_opportunities").insert({
        institution_id: ID, title: title,
        stage: $("o-stage").value, source: $("o-source").value || null,
        expected_value: numOrNull("o-value"), probability: numOrNull("o-prob")
      });
      if (res.error) throw res.error;
      closeM("opp-modal");
      ["o-title","o-value","o-prob"].forEach(function (id) { $(id).value = ""; });
      await refreshAll();
    } catch (e) { nmsg("opp-msg", "Fehler: " + ((e && e.message) || "unbekannt"), "err"); }
    finally { $("opp-savebtn").disabled = false; }
  }

  // --- kleine Helfer ------------------------------------------
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

  // Für Tests
  window.TONI_BC_DETAIL = { renderOpps: renderOpps, renderContacts: renderContacts,
    renderUsage: renderUsage, renderSubscription: renderSubscription, renderActivities: renderActivities,
    renderHeader: renderHeader };

  B.mountAuth({ onReady: load });
})();
