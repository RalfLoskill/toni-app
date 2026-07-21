/* ============================================================
   Toni Business Center — Institutionen-Liste
   Eine Stufe (lifecycle_stage) pro Schule. Suche, Stufenfilter,
   Anlegen. Klick auf Zeile -> Detailseite.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;
  var ALL = [];
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
    if (!B.canWriteSales(role)) { var nb = $("new-btn"); if (nb) nb.style.display = "none"; }
    fillStageFilter();
    wireUi();

    var res = await sb.from("v_crm_institution_stage").select("*").order("name");
    ALL = data(res);
    render();
  }

  function data(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }

  function fillStageFilter() {
    var sel = $("status-filter"); if (!sel) return;
    sel.innerHTML = '<option value="">Alle Stufen</option>' +
      B.LIFECYCLE.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join("");
  }

  function render() {
    var q = ($("q").value || "").trim().toLowerCase();
    var sf = $("status-filter").value;
    var rows = ALL.filter(function (r) {
      if (sf && r.lifecycle_stage !== sf) return false;
      if (q) { if ((r.name + " " + (r.city || "")).toLowerCase().indexOf(q) < 0) return false; }
      return true;
    });

    if (!rows.length) {
      $("rows").innerHTML = "";
      $("list-empty").innerHTML = B.empty(ALL.length ? "Keine Treffer." : "Noch keine Schulen. Lege die erste an.");
      return;
    }
    $("list-empty").innerHTML = "";
    $("rows").innerHTML = rows.map(function (r) {
      var st = r.lifecycle_stage || "lead";
      return '<tr class="clickable" data-id="' + r.institution_id + '">' +
        '<td><b>' + B.esc(r.name) + '</b>' + (r.is_partner ? ' <span class="pill low">Partner</span>' : "") + '</td>' +
        '<td>' + B.esc(TYPE_LABEL[r.institution_type] || "–") + '</td>' +
        '<td>' + B.esc(r.city || "–") + '</td>' +
        '<td><span class="sb" style="background:' + B.hexA(B.lcColor(st), .15) + ';color:' + B.lcColor(st) + '">' +
          B.esc(B.lcLabel(st)) + '</span></td>' +
        '<td style="text-align:right">' + (r.deal_value != null ? B.euro(r.deal_value) : "–") + '</td></tr>';
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
      var ins = await sb.from("institutions").insert({
        name: name, city: val("f-city"), postal_code: val("f-postal"), street: val("f-street")
      }).select("id").single();
      if (ins.error) throw ins.error;
      var id = ins.data.id;
      var det = await sb.from("crm_institution_details").upsert({
        institution_id: id, institution_type: $("f-type").value || null,
        state: val("f-state"), website: val("f-website")
      }, { onConflict: "institution_id" });
      if (det.error) throw det.error;
      location.href = "business_institution.html?id=" + id;
    } catch (e) { msg("Fehler: " + ((e && e.message) || "unbekannt"), "err"); $("new-save").disabled = false; }
  }

  function val(id) { var v = ($(id).value || "").trim(); return v || null; }
  function msg(t, type) { var m = $("new-msg"); m.textContent = t; m.className = "login-msg " + (type || ""); }

  window.TONI_BC_LIST = { setData: function (a) { ALL = a; }, render: render };

  B.mountAuth({ onReady: load });
})();
