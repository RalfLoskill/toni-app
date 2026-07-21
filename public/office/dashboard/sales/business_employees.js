/* ============================================================
   Toni Business Center — Virtuelle Mitarbeiter (Verwaltung)
   Mitarbeiter anlegen/bearbeiten, Agenten aus dem Katalog
   zuordnen (mit Reihenfolge), Gedächtnis pflegen.
   NUR Verwaltung — es wird noch nichts ausgeführt.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;

  var ROLE = null, canWrite = false;
  var EMPLOYEES = [], CATALOG = [], ACTIVE = null;   // ACTIVE = ausgewählter Mitarbeiter
  var ACTIVE_AGENTS = [], ACTIVE_MEM = [];

  async function load(role) {
    ROLE = role; canWrite = B.canWriteSales(role);
    $("bc-nav").innerHTML = B.nav("business_employees.html");
    if (canWrite) { show("emp-add"); }
    wireUi();

    var res = await Promise.all([
      sb.from("crm_employees").select("*").order("created_at", { ascending: true }),
      sb.from("crm_agents").select("*").eq("is_active", true).order("sort_order", { ascending: true })
    ]);
    EMPLOYEES = data(res[0]);
    CATALOG = data(res[1]);
    await signAvatars(EMPLOYEES);
    renderEmployeeList();

    var pre = B.qp("id");
    if (pre && EMPLOYEES.some(function (e) { return e.id === pre; })) selectEmployee(pre);
    else if (EMPLOYEES.length) selectEmployee(EMPLOYEES[0].id);
    else showEmpty();
  }

  function data(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }

  // Für alle Mitarbeiter mit avatar_path eine signierte Anzeige-URL holen
  // (privater Bucket). Läuft still; Fehler blenden das Bild nur aus.
  async function signAvatars(list) {
    for (var k = 0; k < list.length; k++) {
      var e = list[k];
      if (!e.avatar_path) continue;
      try {
        var s = await sb.storage.from("crm-employees").createSignedUrl(e.avatar_path, 3600);
        if (s && s.data) e.avatar_url = s.data.signedUrl;
      } catch (err) { /* Bild bleibt Platzhalter */ }
    }
  }

  // --- Mitarbeiterliste (links) -------------------------------
  function renderEmployeeList() {
    $("emp-count").textContent = EMPLOYEES.length;
    if (!EMPLOYEES.length) { $("emp-list").innerHTML = B.empty("Noch keine Mitarbeiter."); return; }
    $("emp-list").innerHTML = EMPLOYEES.map(function (e) {
      var on = ACTIVE && e.id === ACTIVE.id;
      var av = e.avatar_url
        ? '<img class="emp-mini-av" src="' + B.esc(e.avatar_url) + '" alt="">'
        : '<span class="emp-mini-av emp-mini-ph">🙂</span>';
      return '<div class="emp-item' + (on ? " on" : "") + '" data-id="' + e.id + '">' + av +
        '<div class="emp-item-main"><div class="t">' + B.esc(e.name) + '</div>' +
        '<div class="s">' + B.esc(e.role_title || "") + '</div></div></div>';
    }).join("");
    Array.prototype.forEach.call($("emp-list").querySelectorAll(".emp-item"), function (el) {
      el.addEventListener("click", function () { selectEmployee(el.getAttribute("data-id")); });
    });
  }

  function showEmpty() { ACTIVE = null; $("emp-detail").style.display = "none"; $("emp-empty").style.display = ""; renderEmployeeList(); }

  // --- Mitarbeiter auswählen + Detail laden -------------------
  async function selectEmployee(id) {
    ACTIVE = EMPLOYEES.filter(function (e) { return e.id === id; })[0] || null;
    if (!ACTIVE) { showEmpty(); return; }
    $("emp-empty").style.display = "none"; $("emp-detail").style.display = "";
    renderEmployeeList();
    renderProfile(ACTIVE);
    await refreshAgentsAndMemory();
  }

  async function refreshAgentsAndMemory() {
    if (!ACTIVE) return;
    var res = await Promise.all([
      sb.from("crm_employee_agents").select("*").eq("employee_id", ACTIVE.id).order("position", { ascending: true }),
      sb.from("crm_employee_memory").select("*").eq("employee_id", ACTIVE.id).order("created_at", { ascending: false })
    ]);
    ACTIVE_AGENTS = data(res[0]);
    ACTIVE_MEM = data(res[1]);
    renderAgents();
    renderMemory();
  }

  // --- Profilkopf ---------------------------------------------
  function renderProfile(e) {
    $("e-name").value = e.name || "";
    $("e-role").value = e.role_title || "";
    $("e-desc").value = e.description || "";
    var img = $("emp-avatar"), ph = $("emp-avatar-ph");
    if (e.avatar_url) { img.src = e.avatar_url; img.style.display = ""; ph.style.display = "none"; }
    else { img.style.display = "none"; img.removeAttribute("src"); ph.style.display = ""; }
    // Schreibrechte
    var ro = !canWrite;
    ["e-name", "e-role", "e-desc"].forEach(function (id) { if (ro) $(id).setAttribute("readonly", "readonly"); else $(id).removeAttribute("readonly"); });
    if (canWrite) { show("prof-save"); show("emp-del"); show("avatar-btn"); show("agent-add-row"); show("mem-add-row"); }
    nmsg("prof-msg", "");
  }

  async function saveProfile() {
    if (!canWrite || !ACTIVE) return;
    var name = ($("e-name").value || "").trim();
    if (!name) { nmsg("prof-msg", "Name darf nicht leer sein.", "err"); return; }
    $("prof-save").disabled = true; nmsg("prof-msg", "Speichern …");
    var patch = { name: name, role_title: v("e-role"), description: v("e-desc") };
    var res = await sb.from("crm_employees").update(patch).eq("id", ACTIVE.id);
    if (res.error) { nmsg("prof-msg", "Fehler: " + res.error.message, "err"); $("prof-save").disabled = false; return; }
    // lokal aktualisieren
    ACTIVE.name = name; ACTIVE.role_title = patch.role_title; ACTIVE.description = patch.description;
    var idx = EMPLOYEES.findIndex(function (e) { return e.id === ACTIVE.id; });
    if (idx >= 0) EMPLOYEES[idx] = ACTIVE;
    renderEmployeeList();
    nmsg("prof-msg", "Gespeichert.", "ok");
    $("prof-save").disabled = false;
  }

  async function addEmployee() {
    if (!canWrite) return;
    var res = await sb.from("crm_employees").insert({ name: "Neuer Mitarbeiter" }).select("*").single();
    if (res.error) { alert("Anlegen fehlgeschlagen: " + res.error.message); return; }
    EMPLOYEES.push(res.data);
    selectEmployee(res.data.id);
    $("e-name").focus(); $("e-name").select();
  }

  async function deleteEmployee() {
    if (!canWrite || !ACTIVE) return;
    if (!window.confirm("„" + (ACTIVE.name || "dieser Mitarbeiter") + "\" wirklich löschen?\n\nZugeordnete Agenten und das Gedächtnis werden mit entfernt.")) return;
    var res = await sb.from("crm_employees").delete().eq("id", ACTIVE.id);
    if (res.error) { alert("Löschen fehlgeschlagen: " + res.error.message); return; }
    EMPLOYEES = EMPLOYEES.filter(function (e) { return e.id !== ACTIVE.id; });
    if (EMPLOYEES.length) selectEmployee(EMPLOYEES[0].id); else showEmpty();
  }

  // --- Avatar-Upload (Bucket crm-employees) -------------------
  async function onAvatarPicked(ev) {
    if (!canWrite || !ACTIVE) return;
    var file = ev.target.files && ev.target.files[0];
    if (!file) return;
    nmsg("prof-msg", "Bild wird hochgeladen …");
    var ext = (file.name.split(".").pop() || "png").toLowerCase();
    var path = ACTIVE.id + "/avatar." + ext;
    try {
      var up = await sb.storage.from("crm-employees").upload(path, file, { upsert: true });
      if (up.error) throw up.error;
      // signierte URL zum Anzeigen (privater Bucket)
      var signed = await sb.storage.from("crm-employees").createSignedUrl(path, 3600);
      var url = signed && signed.data ? signed.data.signedUrl : null;
      var res = await sb.from("crm_employees").update({ avatar_path: path }).eq("id", ACTIVE.id);
      if (res.error) throw res.error;
      ACTIVE.avatar_path = path; ACTIVE.avatar_url = url;
      var idx = EMPLOYEES.findIndex(function (e) { return e.id === ACTIVE.id; });
      if (idx >= 0) EMPLOYEES[idx] = ACTIVE;
      renderProfile(ACTIVE); renderEmployeeList();
      nmsg("prof-msg", "Bild aktualisiert.", "ok");
    } catch (e) { nmsg("prof-msg", "Bild-Fehler: " + ((e && e.message) || "unbekannt"), "err"); }
    finally { $("avatar-file").value = ""; }
  }

  // --- Agenten-Kacheln ----------------------------------------
  function agentById(id) { return CATALOG.filter(function (a) { return a.id === id; })[0] || null; }

  function renderAgents() {
    $("agent-count").textContent = ACTIVE_AGENTS.length;
    if (!ACTIVE_AGENTS.length) {
      $("agent-tiles").innerHTML = B.empty("Noch keine Agenten zugeordnet.");
    } else {
      $("agent-tiles").innerHTML = ACTIVE_AGENTS.map(function (ea, idx) {
        var a = agentById(ea.agent_id); if (!a) return "";
        var au = a.autonomy;
        var ctrls = canWrite ? (
          '<div class="tile-ctrls">' +
            '<button class="tile-btn" data-act="up" data-id="' + ea.id + '" title="Nach oben"' + (idx === 0 ? " disabled" : "") + '>▲</button>' +
            '<button class="tile-btn" data-act="down" data-id="' + ea.id + '" title="Nach unten"' + (idx === ACTIVE_AGENTS.length - 1 ? " disabled" : "") + '>▼</button>' +
            '<button class="tile-btn del" data-act="remove" data-id="' + ea.id + '" title="Entfernen">×</button>' +
          '</div>') : "";
        return '<div class="agent-tile">' +
          '<div class="tile-pos">' + (idx + 1) + '</div>' +
          '<div class="tile-ico">' + B.esc(a.icon || "🤖") + '</div>' +
          '<div class="tile-main"><div class="tile-t">' + B.esc(a.name) + '</div>' +
            '<div class="tile-d">' + B.esc(a.description || "") + '</div>' +
            '<span class="tile-auto" style="background:' + B.hexA(B.autonomyColor(au), .15) + ';color:' + B.autonomyColor(au) + '">' +
              B.esc(B.autonomyLabel(au)) + '</span></div>' +
          ctrls + '</div>';
      }).join("");
      Array.prototype.forEach.call($("agent-tiles").querySelectorAll(".tile-btn"), function (btn) {
        btn.addEventListener("click", function () { onTileAction(btn.getAttribute("data-act"), btn.getAttribute("data-id")); });
      });
    }
    fillAgentPicker();
  }

  // Auswahl im "hinzufügen"-Dropdown: nur noch nicht zugeordnete Agenten
  function fillAgentPicker() {
    var used = {}; ACTIVE_AGENTS.forEach(function (ea) { used[ea.agent_id] = true; });
    var avail = CATALOG.filter(function (a) { return !used[a.id]; });
    var sel = $("agent-pick");
    if (!avail.length) { sel.innerHTML = '<option value="">Alle Agenten zugeordnet</option>'; sel.disabled = true; $("agent-add-btn").disabled = true; return; }
    sel.disabled = false; $("agent-add-btn").disabled = false;
    sel.innerHTML = avail.map(function (a) {
      return '<option value="' + a.id + '">' + B.esc((a.icon ? a.icon + " " : "") + a.name) + '</option>';
    }).join("");
  }

  async function addAgent() {
    if (!canWrite || !ACTIVE) return;
    var agentId = $("agent-pick").value; if (!agentId) return;
    var nextPos = ACTIVE_AGENTS.length ? Math.max.apply(null, ACTIVE_AGENTS.map(function (e) { return e.position; })) + 10 : 10;
    var res = await sb.from("crm_employee_agents").insert({ employee_id: ACTIVE.id, agent_id: agentId, position: nextPos });
    if (res.error) { alert("Zuordnen fehlgeschlagen: " + res.error.message); return; }
    await refreshAgentsAndMemory();
  }

  async function onTileAction(act, id) {
    if (!canWrite) return;
    var i = ACTIVE_AGENTS.findIndex(function (e) { return e.id === id; });
    if (i < 0) return;
    if (act === "remove") {
      var res = await sb.from("crm_employee_agents").delete().eq("id", id);
      if (res.error) { alert("Entfernen fehlgeschlagen: " + res.error.message); return; }
      await refreshAgentsAndMemory(); return;
    }
    // up/down: Positionen mit dem Nachbarn tauschen
    var j = act === "up" ? i - 1 : i + 1;
    if (j < 0 || j >= ACTIVE_AGENTS.length) return;
    var a = ACTIVE_AGENTS[i], b = ACTIVE_AGENTS[j];
    var pa = a.position, pb = b.position;
    // optimistisch lokal tauschen
    a.position = pb; b.position = pa;
    ACTIVE_AGENTS.sort(function (x, y) { return x.position - y.position; });
    renderAgents();
    var r1 = await sb.from("crm_employee_agents").update({ position: pb }).eq("id", a.id);
    var r2 = await sb.from("crm_employee_agents").update({ position: pa }).eq("id", b.id);
    if ((r1.error) || (r2.error)) { alert("Reihenfolge speichern fehlgeschlagen."); await refreshAgentsAndMemory(); }
  }

  // --- Gedächtnis ---------------------------------------------
  function renderMemory() {
    $("mem-count").textContent = ACTIVE_MEM.length;
    if (!ACTIVE_MEM.length) { $("mem-list").innerHTML = B.empty("Noch keine Gedächtnis-Einträge."); return; }
    $("mem-list").innerHTML = ACTIVE_MEM.map(function (m) {
      var isInsight = m.kind === "insight";
      var tag = isInsight ? '<span class="pill normal">Erkenntnis</span>' : '<span class="pill low">Ereignis</span>';
      var del = canWrite ? ' <button class="con-del" data-id="' + m.id + '" title="Eintrag löschen">×</button>' : "";
      return '<div class="row"><div class="time" style="min-width:78px;font-size:12px">' + B.ddmm(m.created_at) + '</div>' +
        '<div class="main"><div class="t" style="white-space:normal">' + B.esc(m.content) + '</div></div>' +
        tag + del + '</div>';
    }).join("");
    Array.prototype.forEach.call($("mem-list").querySelectorAll(".con-del"), function (btn) {
      btn.addEventListener("click", function () { deleteMemory(btn.getAttribute("data-id")); });
    });
  }

  async function addMemory() {
    if (!canWrite || !ACTIVE) return;
    var content = ($("mem-content").value || "").trim();
    if (!content) return;
    var res = await sb.from("crm_employee_memory").insert({ employee_id: ACTIVE.id, kind: $("mem-kind").value, content: content });
    if (res.error) { alert("Speichern fehlgeschlagen: " + res.error.message); return; }
    $("mem-content").value = "";
    await refreshAgentsAndMemory();
  }

  async function deleteMemory(id) {
    if (!canWrite) return;
    var res = await sb.from("crm_employee_memory").delete().eq("id", id);
    if (res.error) { alert("Löschen fehlgeschlagen: " + res.error.message); return; }
    await refreshAgentsAndMemory();
  }

  // --- UI-Verdrahtung -----------------------------------------
  function wireUi() {
    var ea = $("emp-add"); if (ea) ea.addEventListener("click", addEmployee);
    var ps = $("prof-save"); if (ps) ps.addEventListener("click", saveProfile);
    var ed = $("emp-del"); if (ed) ed.addEventListener("click", deleteEmployee);
    var ab = $("avatar-btn"); if (ab) ab.addEventListener("click", function () { $("avatar-file").click(); });
    var af = $("avatar-file"); if (af) af.addEventListener("change", onAvatarPicked);
    var aab = $("agent-add-btn"); if (aab) aab.addEventListener("click", addAgent);
    var mab = $("mem-add-btn"); if (mab) mab.addEventListener("click", addMemory);
    var mc = $("mem-content"); if (mc) mc.addEventListener("keydown", function (e) { if (e.key === "Enter") addMemory(); });
  }

  function show(id) { var e = $(id); if (e) e.style.display = ""; }
  function v(id) { var x = ($(id).value || "").trim(); return x || null; }
  function nmsg(el, t, type) { var m = $(el); if (m) { m.textContent = t; m.className = "login-msg " + (type || ""); } }

  // Für Tests
  window.TONI_BC_EMP = {
    seed: function (emps, catalog, agents, mem) {
      EMPLOYEES = emps || []; CATALOG = catalog || []; canWrite = true;
      ACTIVE = EMPLOYEES[0] || null; ACTIVE_AGENTS = agents || []; ACTIVE_MEM = mem || [];
    },
    renderEmployeeList: renderEmployeeList, renderProfile: renderProfile,
    renderAgents: renderAgents, renderMemory: renderMemory, fillAgentPicker: fillAgentPicker
  };

  B.mountAuth({ onReady: load });
})();
