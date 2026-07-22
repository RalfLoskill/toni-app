/* ============================================================
   Toni Business Center — Query (Sammeltopf der Rohfunde)
   Der Lead-Such-Agent schreibt Funde hierher (status 'new').
   Hier: prüfen, auswählen, als Leads übernehmen (institutions +
   crm_contacts) oder verwerfen. Übernommene bleiben mit Status
   'accepted' stehen.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;

  var ROLE = null, canWrite = false, ROWS = [], STATUS = "new";

  async function load(role) {
    ROLE = role; canWrite = B.canWriteSales(role);
    $("bc-nav").innerHTML = B.nav("business_query.html");
    if (canWrite) { show("q-accept"); show("q-discard"); }
    wireUi();
    await refresh();
  }

  async function refresh() {
    var query = sb.from("crm_query").select("*").order("created_at", { ascending: false });
    if (STATUS) query = query.eq("status", STATUS);
    var res = await query;
    ROWS = data(res);
    render();
  }

  function data(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }

  function filtered() {
    var q = ($("q").value || "").toLowerCase().trim();
    if (!q) return ROWS;
    return ROWS.filter(function (r) {
      return (r.name || "").toLowerCase().indexOf(q) >= 0 || (r.city || "").toLowerCase().indexOf(q) >= 0;
    });
  }

  function statusBadge(s) {
    if (s === "accepted") return '<span class="sb customer">Übernommen</span>';
    if (s === "discarded") return '<span class="sb former_customer">Verworfen</span>';
    return '<span class="sb prospect">Neu</span>';
  }

  function render() {
    var list = filtered();
    if (!list.length) {
      $("rows").innerHTML = "";
      $("list-empty").innerHTML = B.empty(STATUS === "new"
        ? "Keine neuen Funde. Starte eine Lead-Suche über einen Mitarbeiter."
        : "Keine Einträge in dieser Ansicht.");
      $("q-all").checked = false;
      return;
    }
    $("list-empty").innerHTML = "";
    $("rows").innerHTML = list.map(function (r) {
      var nContacts = Array.isArray(r.contacts) ? r.contacts.length : 0;
      var canPick = canWrite && r.status === "new";
      return '<tr data-id="' + r.id + '">' +
        '<td>' + (canPick ? '<input type="checkbox" class="q-pick" data-id="' + r.id + '">' : "") + '</td>' +
        '<td class="q-open" data-id="' + r.id + '" style="cursor:pointer"><b>' + B.esc(r.name) + '</b>' +
          (r.school_type ? '<div style="font-size:12px;color:var(--muted)">' + B.esc(r.school_type) + '</div>' : "") + '</td>' +
        '<td>' + B.esc([r.postal_code, r.city, r.state].filter(Boolean).join(" · ")) + '</td>' +
        '<td>' + (nContacts ? nContacts : "–") + '</td>' +
        '<td>' + (r.source_url ? '<a href="' + B.esc(r.source_url) + '" target="_blank" rel="noopener">Beleg ↗</a>' : "–") + '</td>' +
        '<td>' + statusBadge(r.status) + '</td>' +
        '</tr>';
    }).join("");
    // Detail öffnen
    Array.prototype.forEach.call($("rows").querySelectorAll(".q-open"), function (el) {
      el.addEventListener("click", function () { openDetail(el.getAttribute("data-id")); });
    });
    // "alle"-Häkchen
    $("q-all").checked = false;
    $("q-all").onchange = function () {
      Array.prototype.forEach.call($("rows").querySelectorAll(".q-pick"), function (cb) { cb.checked = $("q-all").checked; });
    };
  }

  function picked() {
    var ids = [];
    Array.prototype.forEach.call($("rows").querySelectorAll(".q-pick:checked"), function (cb) { ids.push(cb.getAttribute("data-id")); });
    return ROWS.filter(function (r) { return ids.indexOf(r.id) >= 0; });
  }

  // --- Detail-Modal -------------------------------------------
  function openDetail(id) {
    var r = ROWS.filter(function (x) { return x.id === id; })[0]; if (!r) return;
    $("qm-title").textContent = r.name;
    var contacts = Array.isArray(r.contacts) ? r.contacts : [];
    var cHtml = contacts.length
      ? '<ul class="found-contacts">' + contacts.map(function (c) {
          var who = c.name ? (B.esc(c.name) + (c.role ? " · " + B.esc(c.role) : "")) : B.esc(c.role || "Kontakt");
          var mail = c.email ? ' · ' + B.esc(c.email) : "";
          var beleg = c.source_url ? ' <a href="' + B.esc(c.source_url) + '" target="_blank" rel="noopener" style="font-size:11px">Beleg ↗</a>' : "";
          return '<li>' + who + mail + beleg + '</li>';
        }).join("") + '</ul>'
      : '<div class="muted-empty" style="text-align:left;padding:6px 0">Keine Ansprechpartner gefunden.</div>';
    $("qm-body").innerHTML =
      '<div class="qm-row"><b>Ort:</b> ' + B.esc([r.street, r.postal_code, r.city, r.state].filter(Boolean).join(", ") || "–") + '</div>' +
      (r.website ? '<div class="qm-row"><b>Website:</b> <a href="' + B.esc(r.website) + '" target="_blank" rel="noopener">' + B.esc(r.website) + '</a></div>' : "") +
      (r.source_url ? '<div class="qm-row"><b>Beleg:</b> <a href="' + B.esc(r.source_url) + '" target="_blank" rel="noopener">' + B.esc(r.source_url) + '</a></div>' : "") +
      (r.why ? '<div class="qm-row"><b>Warum:</b> ' + B.esc(r.why) + '</div>' : "") +
      '<div class="qm-row" style="margin-top:8px"><b>Ansprechpartner:</b></div>' + cHtml;
    $("q-modal").style.display = "flex";
  }
  function closeDetail() { $("q-modal").style.display = "none"; }

  // --- Übernehmen als Leads -----------------------------------
  async function acceptSelected() {
    if (!canWrite) return;
    var chosen = picked();
    if (!chosen.length) { qmsg("Bitte zuerst Einträge auswählen.", "err"); return; }
    $("q-accept").disabled = true; qmsg("Übernehme " + chosen.length + " …");
    var created = 0, contactsCreated = 0;

    for (var i = 0; i < chosen.length; i++) {
      var r = chosen[i];
      try {
        var ins = await sb.from("institutions").insert({
          name: r.name, city: r.city || null, postal_code: r.postal_code || null,
          street: r.street || null, state: r.state || null
        }).select("id").single();
        if (ins.error) throw ins.error;
        var id = ins.data.id;

        var det = await sb.from("crm_institution_details").upsert({
          institution_id: id, lifecycle_stage: "lead",
          data_source_type: "public_website",
          source_urls: [r.source_url].filter(Boolean).concat(r.website ? [r.website] : []),
          first_collected_at: new Date().toISOString()
        }, { onConflict: "institution_id" });
        if (det.error) throw det.error;
        if (r.website) { try { await sb.from("institutions").update({ website: r.website }).eq("id", id); } catch (e) {} }

        var contacts = Array.isArray(r.contacts) ? r.contacts : [];
        if (contacts.length) {
          var contactRows = contacts.map(function (c) {
            var parts = (c.name || "").trim().split(/\s+/);
            var last = parts.length > 1 ? parts.pop() : (parts[0] || "");
            var first = parts.join(" ");
            return {
              institution_id: id, first_name: first || null, last_name: last || null,
              role: c.role || null, email: c.email || null, phone: c.phone || null,
              source: "public_website", source_url: c.source_url || r.source_url || null,
              consent_status: "unknown", do_not_contact: false
            };
          });
          try { var cr = await sb.from("crm_contacts").insert(contactRows); if (!cr.error) contactsCreated += contactRows.length; } catch (e) {}
        }

        // Query-Eintrag auf accepted setzen + verknüpfen
        await sb.from("crm_query").update({ status: "accepted", institution_id: id, decided_at: new Date().toISOString() }).eq("id", r.id);
        created++;
      } catch (e) { /* einzelne überspringen */ }
    }
    qmsg(created + " als Leads übernommen" + (contactsCreated ? (", " + contactsCreated + " Kontakte angelegt.") : "."), "ok");
    $("q-accept").disabled = false;
    await refresh();
  }

  async function discardSelected() {
    if (!canWrite) return;
    var chosen = picked();
    if (!chosen.length) { qmsg("Bitte zuerst Einträge auswählen.", "err"); return; }
    if (!window.confirm(chosen.length + " Einträge verwerfen?")) return;
    for (var i = 0; i < chosen.length; i++) {
      try { await sb.from("crm_query").update({ status: "discarded", decided_at: new Date().toISOString() }).eq("id", chosen[i].id); } catch (e) {}
    }
    qmsg(chosen.length + " verworfen.", "ok");
    await refresh();
  }

  function wireUi() {
    $("q").addEventListener("input", render);
    $("status-filter").addEventListener("change", function () { STATUS = $("status-filter").value; refresh(); });
    var qa = $("q-accept"); if (qa) qa.addEventListener("click", acceptSelected);
    var qd = $("q-discard"); if (qd) qd.addEventListener("click", discardSelected);
    $("qm-close").addEventListener("click", closeDetail);
    $("q-modal").addEventListener("click", function (e) { if (e.target === $("q-modal")) closeDetail(); });
  }

  function show(id) { var e = $(id); if (e) e.style.display = ""; }
  function qmsg(t, type) { var m = $("q-msg"); if (m) { m.textContent = t; m.className = "login-msg " + (type || ""); } }

  // Für Tests
  window.TONI_BC_QUERY = {
    seed: function (rows, admin) { ROWS = rows || []; canWrite = admin !== false; },
    render: render, openDetail: openDetail, picked: picked,
    setStatus: function (s) { STATUS = s; }
  };

  B.mountAuth({ onReady: load });
})();
