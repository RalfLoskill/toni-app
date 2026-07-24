/* ============================================================
   Toni Business Center — Agenten (Katalog)
   Zeigt alle Agenten. Admin kann Metadaten bearbeiten und neue
   (inaktive) Einträge anlegen. Der agent_key verbindet den
   Eintrag mit dem Code — nach dem Anlegen schreibgeschützt.
   Ausgeführt werden Agenten NICHT hier, sondern über den
   Mitarbeiter, dem sie zugeordnet sind.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;

  var ROLE = null, isAdmin = false, AGENTS = [], EDITING = null;  // EDITING: agent-Objekt oder null(=neu)

  async function load(role) {
    ROLE = role; isAdmin = (role === "admin");
    $("bc-nav").innerHTML = B.nav("business_agents.html");
    $("agents-hint").textContent = isAdmin
      ? "Als Administrator kannst du Agenten bearbeiten und neue anlegen."
      : "Übersicht der verfügbaren Agenten. Bearbeiten ist Administratoren vorbehalten.";
    if (isAdmin) $("agent-new").style.display = "";
    wireUi();
    await refresh();
  }

  async function refresh() {
    var res = await sb.from("crm_agents").select("*").order("sort_order", { ascending: true });
    AGENTS = data(res);
    render();
  }

  function data(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }

  function render() {
    if (!AGENTS.length) { $("agents-grid").innerHTML = B.empty("Noch keine Agenten im Katalog."); return; }
    $("agents-grid").innerHTML = AGENTS.map(function (a) {
      var au = a.autonomy;
      var col = B.autonomyColor(au);
      var state = a.is_active
        ? '<span class="ag-state on">Aktiv</span>'
        : '<span class="ag-state off">Inaktiv</span>';
      var edit = isAdmin ? '<button class="btn ghost sm ag-edit" data-id="' + a.id + '">Bearbeiten</button>' : "";
      return '<div class="ag-tile' + (a.is_active ? "" : " dim") + '">' +
        '<div class="ag-tile-head" style="background:' + col + '">' +
          '<span class="ag-tile-ico">' + B.esc(a.icon || "🤖") + '</span>' +
          state +
        '</div>' +
        '<div class="ag-tile-body">' +
          '<div class="ag-name">' + B.esc(a.name) + '</div>' +
          '<div class="ag-desc">' + B.esc(a.description || "") + '</div>' +
          '<div class="ag-foot">' +
            '<span class="ag-auto" style="color:' + col + '">' + B.esc(B.autonomyLabel(au)) + '</span>' +
            edit +
          '</div>' +
        '</div>' +
        '</div>';
    }).join("");
    if (isAdmin) {
      Array.prototype.forEach.call($("agents-grid").querySelectorAll(".ag-edit"), function (btn) {
        btn.addEventListener("click", function () { openModal(btn.getAttribute("data-id")); });
      });
    }
  }

  // --- Bearbeiten / Neu ---------------------------------------
  function openModal(id) {
    EDITING = id ? AGENTS.filter(function (a) { return a.id === id; })[0] : null;
    var isNew = !EDITING;
    $("ag-modal-title").textContent = isNew ? "Neuen Agenten anlegen" : "Agent bearbeiten";

    // agent_key: bei neu editierbar, bei bestehend schreibgeschützt
    $("ag-key").value = EDITING ? EDITING.agent_key : "";
    $("ag-key").readOnly = !isNew;
    $("ag-key-hint").textContent = isNew
      ? "Verbindet den Agenten mit dem Programmcode (z. B. find_leads). Nur Kleinbuchstaben, Ziffern, Unterstriche. Nach dem Anlegen nicht mehr änderbar."
      : "Fest — verbindet den Agenten mit dem Programmcode und kann nicht geändert werden.";

    $("ag-icon").value = EDITING ? (EDITING.icon || "") : "";
    $("ag-name").value = EDITING ? EDITING.name : "";
    $("ag-desc").value = EDITING ? (EDITING.description || "") : "";
    $("ag-autonomy").value = EDITING ? EDITING.autonomy : "approval";
    $("ag-sort").value = EDITING ? EDITING.sort_order : (AGENTS.length ? (Math.max.apply(null, AGENTS.map(function (a) { return a.sort_order; })) + 10) : 10);
    $("ag-active").checked = EDITING ? EDITING.is_active : false;   // neue starten inaktiv
    $("ag-dev-note").style.display = isNew ? "" : "none";

    nmsg("");
    $("ag-modal").style.display = "flex";
    (isNew ? $("ag-key") : $("ag-name")).focus();
  }

  function closeModal() { $("ag-modal").style.display = "none"; EDITING = null; }

  async function saveAgent() {
    if (!isAdmin) return;
    var name = ($("ag-name").value || "").trim();
    if (!name) { nmsg("Name darf nicht leer sein.", "err"); return; }

    var patch = {
      name: name,
      icon: ($("ag-icon").value || "").trim() || null,
      description: ($("ag-desc").value || "").trim() || null,
      autonomy: $("ag-autonomy").value,
      sort_order: parseInt($("ag-sort").value, 10) || 0,
      is_active: $("ag-active").checked
    };

    $("ag-save").disabled = true; nmsg("Speichern …");
    var res;
    if (EDITING) {
      res = await sb.from("crm_agents").update(patch).eq("id", EDITING.id);
    } else {
      var key = ($("ag-key").value || "").trim().toLowerCase();
      if (!/^[a-z][a-z0-9_]*$/.test(key)) { nmsg("Schlüssel: nur Kleinbuchstaben, Ziffern, Unterstriche; Beginn mit Buchstabe.", "err"); $("ag-save").disabled = false; return; }
      patch.agent_key = key;
      res = await sb.from("crm_agents").insert(patch);
    }
    if (res.error) {
      var msg = res.error.message || "";
      if (/duplicate|unique/i.test(msg)) nmsg("Diesen Schlüssel gibt es bereits.", "err");
      else nmsg("Fehler: " + msg, "err");
      $("ag-save").disabled = false; return;
    }
    closeModal();
    await refresh();
    $("ag-save").disabled = false;
  }

  function wireUi() {
    var an = $("agent-new"); if (an) an.addEventListener("click", function () { openModal(null); });
    $("ag-cancel").addEventListener("click", closeModal);
    $("ag-save").addEventListener("click", saveAgent);
    $("ag-modal").addEventListener("click", function (e) { if (e.target === $("ag-modal")) closeModal(); });
    $("ag-active").addEventListener("change", function () {
      // kleiner Hinweis, wenn man einen neuen Eintrag aktiv schalten will
      if (!EDITING && $("ag-active").checked) nmsg("Hinweis: Ohne zugehörigen Code läuft der Agent nicht, auch wenn sie aktiv ist.", "");
      else nmsg("");
    });
  }

  function nmsg(t, type) { var m = $("ag-msg"); if (m) { m.textContent = t; m.className = "login-msg " + (type || ""); } }

  // Für Tests
  window.TONI_BC_AGENTS = {
    seed: function (agents, admin) { AGENTS = agents || []; isAdmin = !!admin; },
    render: render, openModal: openModal
  };

  B.mountAuth({ onReady: load });
})();
