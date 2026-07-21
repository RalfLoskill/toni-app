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
  // Endpoint-URL (bestehendes api/agent.js). Über window überschreibbar (Tests).
  var API_ENDPOINT = (window.TONI_AGENT_ENDPOINT) || "/api/agent";

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
    resetRunCard();
    await refreshAgentsAndMemory();
    await loadCosts();
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
        var runnable = a.agent_key === "qualify_leads";   // vorerst nur dieser Agent führt aus
        var play = canWrite
          ? '<button class="tile-play' + (runnable ? "" : " soon") + '" data-act="run" data-key="' + B.esc(a.agent_key) + '"' +
              (runnable ? ' title="Lauf starten"' : ' title="Bald verfügbar" disabled') + '>▶</button>'
          : "";
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
          play + ctrls + '</div>';
      }).join("");
      Array.prototype.forEach.call($("agent-tiles").querySelectorAll(".tile-btn"), function (btn) {
        btn.addEventListener("click", function () { onTileAction(btn.getAttribute("data-act"), btn.getAttribute("data-id")); });
      });
      Array.prototype.forEach.call($("agent-tiles").querySelectorAll(".tile-play:not([disabled])"), function (btn) {
        btn.addEventListener("click", function () { startRun(btn.getAttribute("data-key")); });
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
    var lc = $("lead-cancel"); if (lc) lc.addEventListener("click", closeLeadModal);
    var ls = $("lead-search"); if (ls) ls.addEventListener("input", renderLeadList);
    var lm = $("lead-modal"); if (lm) lm.addEventListener("click", function (e) { if (e.target === lm) closeLeadModal(); });
    var ad = $("apply-discard"); if (ad) ad.addEventListener("click", discardResult);
    var ac = $("apply-confirm"); if (ac) ac.addEventListener("click", applyResult);
  }

  // ============================================================
  // Mitarbeiterkosten (Euro): gesamt + Monatsreihe (12 Monate)
  // ============================================================
  async function loadCosts() {
    if (!ACTIVE) return;
    try {
      var res = await Promise.all([
        sb.from("v_crm_employee_costs").select("*").eq("employee_id", ACTIVE.id).maybeSingle(),
        sb.from("v_crm_employee_costs_monthly").select("*").eq("employee_id", ACTIVE.id)
      ]);
      var tot = res[0] && res[0].data ? res[0].data : { total_eur: 0, this_month_eur: 0, billed_runs: 0 };
      var months = data(res[1]);
      $("cost-total").textContent = euro2(Number(tot.total_eur || 0));
      $("cost-month").textContent = euro2(Number(tot.this_month_eur || 0));
      $("cost-runs").textContent = B.num(Number(tot.billed_runs || 0));
      renderCostBars(months);
    } catch (e) {
      $("cost-total").textContent = B.euro(0); $("cost-month").textContent = B.euro(0);
      $("cost-runs").textContent = "0"; renderCostBars([]);
    }
  }

  // Balken der letzten 12 Monate (auch leere Monate zeigen)
  function renderCostBars(rows) {
    var by = {}; rows.forEach(function (r) { by[r.month] = Number(r.cost_eur || 0); });
    var labels = [], vals = [], d = new Date();
    for (var i = 11; i >= 0; i--) {
      var dt = new Date(d.getFullYear(), d.getMonth() - i, 1);
      var key = dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0");
      labels.push(dt.toLocaleDateString("de-DE", { month: "short" }));
      vals.push(by[key] || 0);
    }
    var max = Math.max.apply(null, vals.concat([0.0001]));
    $("cost-bars").innerHTML = vals.map(function (val, i) {
      var h = Math.round(4 + 46 * (val / max));
      var title = labels[i] + ": " + euro2(val);
      return '<div class="cbar" title="' + title + '"><div class="cbar-fill" style="height:' + h + 'px"></div>' +
        '<div class="cbar-lbl">' + labels[i] + '</div></div>';
    }).join("");
  }

  // ============================================================
  // Agentenlauf: Lead wählen -> ausführen -> Chat -> übernehmen
  // ============================================================
  var OPEN_LEADS = [], PENDING = null;   // PENDING = { runId, institution, result, chat }

  function resetRunCard() {
    PENDING = null;
    $("run-card").style.display = "none";
    $("run-chat").innerHTML = "";
    $("run-result").style.display = "none"; $("run-result").innerHTML = "";
  }

  // Play auf einer Kachel: offene Leads laden, Auswahl öffnen
  async function startRun(agentKey) {
    if (!canWrite || !ACTIVE || agentKey !== "qualify_leads") return;
    var open = B.lcOpen().map(function (s) { return s[0]; });   // lead..negotiation
    var res = await sb.from("v_crm_institution_stage").select("*");
    OPEN_LEADS = data(res).filter(function (i) { return open.indexOf(i.lifecycle_stage) >= 0; });
    $("lead-search").value = "";
    renderLeadList();
    $("lead-msg").textContent = "";
    $("lead-modal").style.display = "flex";
  }

  function renderLeadList() {
    var q = ($("lead-search").value || "").toLowerCase().trim();
    var list = OPEN_LEADS.filter(function (i) {
      if (!q) return true;
      return (i.name || "").toLowerCase().indexOf(q) >= 0 || (i.city || "").toLowerCase().indexOf(q) >= 0;
    });
    if (!list.length) { $("lead-list").innerHTML = B.empty(OPEN_LEADS.length ? "Keine Treffer." : "Keine offenen Leads vorhanden."); return; }
    $("lead-list").innerHTML = list.map(function (i) {
      return '<div class="lead-item" data-id="' + i.institution_id + '">' +
        '<div class="lead-main"><div class="t">' + B.esc(i.name) + '</div>' +
        '<div class="s">' + B.esc([i.city, B.lcLabel(i.lifecycle_stage)].filter(Boolean).join(" · ")) + '</div></div>' +
        '<span class="lead-go">bewerten →</span></div>';
    }).join("");
    Array.prototype.forEach.call($("lead-list").querySelectorAll(".lead-item"), function (el) {
      el.addEventListener("click", function () { runQualify(el.getAttribute("data-id")); });
    });
  }

  function closeLeadModal() { $("lead-modal").style.display = "none"; }

  // Der eigentliche Lauf: Endpoint rufen, Chat streamen, Run+Chat speichern
  async function runQualify(institutionId) {
    var inst = OPEN_LEADS.filter(function (i) { return i.institution_id === institutionId; })[0];
    if (!inst || !ACTIVE) return;
    closeLeadModal();

    // Run-Karte vorbereiten
    $("run-card").style.display = "";
    $("run-title").textContent = "Arbeitsverlauf · " + inst.name;
    $("run-chat").innerHTML = "";
    $("run-result").style.display = "none"; $("run-result").innerHTML = "";
    pushChat("agent", ACTIVE.name + " startet die Bewertung von „" + inst.name + "\" …");
    pushChat("system", "…", true);   // Tipp-Indikator

    // Run-Datensatz anlegen (running)
    var agentRow = ACTIVE_AGENTS.map(function (ea) { return agentById(ea.agent_id); }).filter(function (a) { return a && a.agent_key === "qualify_leads"; })[0];
    var runIns = await sb.from("crm_agent_runs").insert({
      employee_id: ACTIVE.id, agent_id: agentRow ? agentRow.id : null, agent_key: "qualify_leads",
      institution_id: institutionId, status: "running",
      input: { name: inst.name, city: inst.city, stage: inst.lifecycle_stage }
    }).select("id").single();
    var runId = runIns && runIns.data ? runIns.data.id : null;

    // Kontext für den Endpoint (Beschreibung + Gedächtnis)
    var memory = ACTIVE_MEM.map(function (m) { return m.content; });
    var payload = {
      agentType: "lead_qualify",
      employeeId: ACTIVE.id, employeeName: ACTIVE.name, employeeDescription: ACTIVE.description,
      memory: memory,
      institution: {
        id: institutionId, name: inst.name, city: inst.city, state: inst.state,
        type: inst.type, website: inst.website, stage: inst.lifecycle_stage
      }
    };

    try {
      var resp = await fetch(API_ENDPOINT, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
      });
      removeTyping();
      if (!resp.ok) {
        var errTxt = "";
        try { errTxt = (await resp.json()).error || ""; } catch (e) {}
        pushChat("system", "Die Bewertung ist fehlgeschlagen. " + errTxt);
        if (runId) await sb.from("crm_agent_runs").update({ status: "error", error_text: errTxt }).eq("id", runId);
        return;
      }
      var out = await resp.json();
      // Chat erzählen
      (out.chat || []).forEach(function (c) { pushChat("agent", c.content); });
      // Chat + Ergebnis speichern
      if (runId) {
        var chatRows = (out.chat || []).map(function (c, i) { return { run_id: runId, seq: i + 1, role: c.role || "agent", content: c.content }; });
        if (chatRows.length) await sb.from("crm_agent_chat").insert(chatRows);
        await sb.from("crm_agent_runs").update({ status: "done", result: out.result || {} }).eq("id", runId);
      }
      // Ergebnis zeigen + Übernehmen anbieten
      PENDING = { runId: runId, institutionId: institutionId, institutionName: inst.name, result: out.result || {}, usage: out.usage || {} };
      renderResult(PENDING);
      await loadCosts();   // Kosten aktualisieren (Lauf hat geloggt)
    } catch (e) {
      removeTyping();
      pushChat("system", "Netzwerkfehler bei der Bewertung.");
      if (runId) await sb.from("crm_agent_runs").update({ status: "error", error_text: String(e && e.message || e) }).eq("id", runId);
    }
  }

  function pushChat(role, text, typing) {
    var wrap = document.createElement("div");
    wrap.className = "chat-line " + (role === "agent" ? "from-agent" : "from-system") + (typing ? " typing" : "");
    if (typing) wrap.id = "chat-typing";
    var av = ACTIVE && ACTIVE.avatar_url && role === "agent"
      ? '<img class="chat-av" src="' + B.esc(ACTIVE.avatar_url) + '" alt="">'
      : '<span class="chat-av chat-av-ph">' + (role === "agent" ? "🙂" : "⚙️") + '</span>';
    wrap.innerHTML = av + '<div class="chat-bubble">' + (typing ? '<span class="dots"><i></i><i></i><i></i></span>' : B.esc(text)) + '</div>';
    $("run-chat").appendChild(wrap);
    $("run-chat").scrollTop = $("run-chat").scrollHeight;
  }
  function removeTyping() { var t = $("chat-typing"); if (t) t.parentNode.removeChild(t); }

  function fitLabel(f) { return f === "high" ? "hohe Passung" : f === "medium" ? "mittlere Passung" : "geringe Passung"; }

  function renderResult(p) {
    var r = p.result;
    var needs = (r.identified_needs || []).map(function (x) { return "<li>" + B.esc(x) + "</li>"; }).join("");
    var objs = (r.likely_objections || []).map(function (x) { return "<li>" + B.esc(x) + "</li>"; }).join("");
    var acts = (r.recommended_actions || []).map(function (x) { return "<li>" + B.esc(x) + "</li>"; }).join("");
    var sig = (r.digital_signals || []).map(function (s) {
      return '<span class="sig' + (s.inferred ? " inf" : "") + '">' + B.esc(s.value) + (s.inferred ? " (vermutet)" : "") + '</span>';
    }).join("");
    var cost = p.usage && p.usage.cost_eur != null ? " · Kosten: " + euro2(p.usage.cost_eur) : "";
    $("run-result").style.display = "";
    $("run-result").innerHTML =
      '<div class="res-head"><div class="res-score">' + Math.round(r.lead_score || 0) + '<span>/100</span></div>' +
        '<div class="res-fit"><b>' + B.esc(fitLabel(r.toni_fit)) + '</b>' +
        '<div class="res-conf">Sicherheit: ' + Math.round((r.confidence || 0) * 100) + ' %' + cost + '</div></div></div>' +
      (r.customer_summary ? '<p class="res-sum">' + B.esc(r.customer_summary) + '</p>' : "") +
      (sig ? '<div class="res-sec"><h4>Digitale Signale</h4><div class="sigs">' + sig + '</div></div>' : "") +
      (needs ? '<div class="res-sec"><h4>Vermutete Bedürfnisse</h4><ul>' + needs + '</ul></div>' : "") +
      (objs ? '<div class="res-sec"><h4>Wahrscheinliche Einwände</h4><ul>' + objs + '</ul></div>' : "") +
      (r.main_risk ? '<div class="res-sec"><h4>Größtes Risiko</h4><p>' + B.esc(r.main_risk) + '</p></div>' : "") +
      (acts ? '<div class="res-sec"><h4>Empfohlene nächste Schritte</h4><ul>' + acts + '</ul></div>' : "") +
      '<div class="res-actions"><button class="btn ghost sm" id="res-discard">Verwerfen</button>' +
        '<button class="btn sm" id="res-apply">An „' + B.esc(p.institutionName) + '" übernehmen</button></div>';
    $("res-discard").addEventListener("click", discardResult);
    $("res-apply").addEventListener("click", applyResult);
  }

  // Übernehmen: Bewertung an die Schule schreiben + Run als angew+ markieren
  async function applyResult() {
    if (!PENDING) return;
    var p = PENDING, r = p.result;
    var qual = {
      lead_score: r.lead_score, toni_fit: r.toni_fit, confidence: r.confidence,
      identified_needs: r.identified_needs, likely_objections: r.likely_objections,
      digital_signals: r.digital_signals
    };
    var assess = { customer_summary: r.customer_summary, main_risk: r.main_risk, recommended_actions: r.recommended_actions };
    var upd = await sb.from("crm_institution_details").update({
      ai_qualification: qual, ai_assessment: assess,
      ai_assessed_at: new Date().toISOString(), ai_assessed_by: ACTIVE.id
    }).eq("institution_id", p.institutionId);
    if (upd.error) { pushChat("system", "Übernehmen fehlgeschlagen: " + upd.error.message); return; }
    if (p.runId) await sb.from("crm_agent_runs").update({ applied_at: new Date().toISOString() }).eq("id", p.runId);
    pushChat("agent", "Erledigt — meine Bewertung steht jetzt bei „" + p.institutionName + "\".");
    // Ergebnisbereich als übernommen markieren
    var ra = $("run-result").querySelector(".res-actions");
    if (ra) ra.innerHTML = '<span class="res-applied">✓ Übernommen</span>';
    PENDING = null;
  }

  function discardResult() {
    if (PENDING && PENDING.runId) sb.from("crm_agent_runs").update({ status: "discarded" }).eq("id", PENDING.runId);
    pushChat("system", "Bewertung verworfen — nichts wurde an die Schule geschrieben.");
    var ra = $("run-result").querySelector(".res-actions");
    if (ra) ra.innerHTML = '<span class="res-applied" style="color:var(--muted)">Verworfen</span>';
    PENDING = null;
  }



  function show(id) { var e = $(id); if (e) e.style.display = ""; }
  function v(id) { var x = ($(id).value || "").trim(); return x || null; }
  // Euro mit 2 Nachkommastellen (für kleine Kostenbeträge; B.euro rundet auf 0)
  function euro2(n) {
    return new Intl.NumberFormat("de-DE", {
      style: "currency", currency: "EUR", minimumFractionDigits: 2, maximumFractionDigits: 2
    }).format(Number(n) || 0);
  }
  function nmsg(el, t, type) { var m = $(el); if (m) { m.textContent = t; m.className = "login-msg " + (type || ""); } }

  // Für Tests
  window.TONI_BC_EMP = {
    seed: function (emps, catalog, agents, mem) {
      EMPLOYEES = emps || []; CATALOG = catalog || []; canWrite = true;
      ACTIVE = EMPLOYEES[0] || null; ACTIVE_AGENTS = agents || []; ACTIVE_MEM = mem || [];
    },
    renderEmployeeList: renderEmployeeList, renderProfile: renderProfile,
    renderAgents: renderAgents, renderMemory: renderMemory, fillAgentPicker: fillAgentPicker,
    renderCostBars: renderCostBars, renderResult: renderResult, renderLeadList: renderLeadList,
    setLeads: function (l) { OPEN_LEADS = l || []; },
    setPending: function (p) { PENDING = p; }, getPending: function () { return PENDING; },
    pushChat: pushChat
  };

  B.mountAuth({ onReady: load });
})();
