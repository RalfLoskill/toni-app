/* ============================================================
   Toni Business Center — Institutionen-Liste
   Liste aller Schulen mit abgeleitetem Status, Suche, Filter,
   Anlegen neuer Schulen. Klick auf Zeile -> Detailseite.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;
  var ALL = [];        // alle geladenen Institutionen
  var ROLE = null;

  var TYPE_LABEL = {
    berufskolleg: "Berufskolleg", berufsschule: "Berufsschule", gymnasium: "Gymnasium",
    gesamtschule: "Gesamtschule", realschule: "Realschule", hauptschule: "Hauptschule",
    grundschule: "Grundschule", foerderschule: "Förderschule", hochschule: "Hochschule",
    schultraeger: "Schulträger", ministerium: "Ministerium", sonstige: "Sonstige"
  };

  async function load(role) {
    ROLE = role;
    $("bc-nav").innerHTML = B.nav("business_institutions.html");
    if (!B.canWriteSales(role)) $("new-btn").style.display = "none";

    wireUi();

    // Drei Quellen zusammenführen: Stammdaten, abgeleiteter Status, offene Chancen.
    var res = await Promise.all([
      sb.from("institutions").select("id,name,city,postal_code").order("name"),
      sb.from("crm_institution_details").select("institution_id,institution_type,state"),
      sb.from("v_crm_institution_status").select("institution_id,status"),
      sb.from("crm_opportunities").select("institution_id,stage")
    ]);
    var insts = data(res[0]), details = idx(data(res[1]), "institution_id"),
        status = idx(data(res[2]), "institution_id");
    var openByInst = {};
    data(res[3]).forEach(function (o) {
      if (o.stage !== "won" && o.stage !== "lost")
        openByInst[o.institution_id] = (openByInst[o.institution_id] || 0) + 1;
    });

    ALL = insts.map(function (i) {
      var d = details[i.id] || {}, s = status[i.id] || {};
      return {
        id: i.id, name: i.name, city: i.city, postal_code: i.postal_code,
        type: d.institution_type || null, state: d.state || null,
        status: s.status || "prospect", open_opps: openByInst[i.id] || 0
      };
    });
    render();
  }

  function data(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }
  function idx(arr, key) { var m = {}; arr.forEach(function (r) { m[r[key]] = r; }); return m; }

  function render() {
    var q = ($("q").value || "").trim().toLowerCase();
    var sf = $("status-filter").value;
    var rows = ALL.filter(function (r) {
      if (sf && r.status !== sf) return false;
      if (q) {
        var hay = (r.name + " " + (r.city || "")).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });

    if (!rows.length) {
      $("rows").innerHTML = "";
      $("list-empty").innerHTML = B.empty(ALL.length ? "Keine Treffer." : "Noch keine Schulen. Lege die erste an.");
      return;
    }
    $("list-empty").innerHTML = "";
    $("rows").innerHTML = rows.map(function (r) {
      return '<tr class="clickable" data-id="' + r.id + '">' +
        '<td><b>' + B.esc(r.name) + '</b></td>' +
        '<td>' + B.esc(TYPE_LABEL[r.type] || "–") + '</td>' +
        '<td>' + B.esc(r.city || "–") + '</td>' +
        '<td><span class="sb ' + r.status + '">' + B.esc(B.STATUS_LABEL[r.status] || r.status) + '</span></td>' +
        '<td style="text-align:right">' + (r.open_opps || "–") + '</td></tr>';
    }).join("");
    Array.prototype.forEach.call($("rows").querySelectorAll("tr.clickable"), function (tr) {
      tr.addEventListener("click", function () {
        location.href = "business_institution.html?id=" + tr.getAttribute("data-id");
      });
    });
  }

  function wireUi() {
    $("q").addEventListener("input", render);
    $("status-filter").addEventListener("change", render);
    var nb = $("new-btn"); if (nb) nb.addEventListener("click", openModal);
    $("new-cancel").addEventListener("click", closeModal);
    $("new-save").addEventListener("click", save);
    $("new-modal").addEventListener("click", function (e) { if (e.target === $("new-modal")) closeModal(); });
  }

  function openModal() { $("new-msg").textContent = ""; $("new-modal").style.display = "flex"; $("f-name").focus(); }
  function closeModal() { $("new-modal").style.display = "none"; ["f-name","f-type","f-state","f-city","f-postal","f-street","f-website"].forEach(function (id) { $(id).value = ""; }); }

  async function save() {
    var name = ($("f-name").value || "").trim();
    if (!name) { msg("Bitte einen Namen eingeben.", "err"); return; }
    $("new-save").disabled = true; msg("Speichern …");
    try {
      // 1) Stammsatz in der bestehenden institutions-Tabelle
      var insErr = await sb.from("institutions").insert({
        name: name,
        city: val("f-city"), postal_code: val("f-postal"), street: val("f-street")
      }).select("id").single();
      if (insErr.error) throw insErr.error;
      var id = insErr.data.id;

      // 2) CRM-Details in der 1:1-Tabelle
      var detErr = await sb.from("crm_institution_details").insert({
        institution_id: id,
        institution_type: $("f-type").value || null,
        state: val("f-state"), website: val("f-website")
      });
      if (detErr.error) throw detErr.error;

      location.href = "business_institution.html?id=" + id;
    } catch (e) {
      msg("Fehler: " + ((e && e.message) || "unbekannt"), "err");
      $("new-save").disabled = false;
    }
  }

  function val(id) { var v = ($(id).value || "").trim(); return v || null; }
  function msg(t, type) { var m = $("new-msg"); m.textContent = t; m.className = "login-msg " + (type || ""); }

  // Für Tests
  window.TONI_BC_LIST = { setData: function (a) { ALL = a; }, render: render };

  B.mountAuth({ onReady: load });
})();
