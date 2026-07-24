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
    stopRunsPolling(); RUNS_OPEN_KEYS = [];
    await refreshAgentsAndMemory();
    await loadCosts();
    await refreshRuns();
    await refreshSchedules();
    var sn = $("sched-new"); if (sn) sn.style.display = canWrite ? "" : "none";
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
        var runnable = a.agent_key === "qualify_leads" || a.agent_key === "find_leads" || a.agent_key === "find_contacts";
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
    var cc = $("crit-cancel"); if (cc) cc.addEventListener("click", closeCriteria);
    var cs = $("crit-start"); if (cs) cs.addEventListener("click", runFind);
    var ca = $("crit-add"); if (ca) ca.addEventListener("click", addCustomCriterion);
    var cn = $("crit-new"); if (cn) cn.addEventListener("keydown", function (e) { if (e.key === "Enter") addCustomCriterion(); });
    var cm = $("crit-modal"); if (cm) cm.addEventListener("click", function (e) { if (e.target === cm) closeCriteria(); });
    var sn = $("sched-new"); if (sn) sn.addEventListener("click", function () { openSchedule(null); });
    var scc = $("sc-cancel"); if (scc) scc.addEventListener("click", closeSchedule);
    var scs = $("sc-save"); if (scs) scs.addEventListener("click", saveSchedule);
    var scd = $("sc-delete"); if (scd) scd.addEventListener("click", deleteSchedule);
    var scr = $("sc-repeat"); if (scr) scr.addEventListener("change", syncScheduleFields);
    var sca = $("sc-agent"); if (sca) sca.addEventListener("change", syncScheduleFields);
    var scm = $("sched-modal"); if (scm) scm.addEventListener("click", function (e) { if (e.target === scm) closeSchedule(); });
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

  // Aufträge/Läufe des Mitarbeiters mit Status anzeigen (queued/running/done/error).
  // So sieht man, was im Hintergrund passiert — auch nach Neuladen der Seite.
  // Aufträge automatisch nachladen, solange welche offen sind.
  // Kein Dauerpolling: der Timer stoppt, sobald nichts mehr wartet/läuft.
  var RUNS_TIMER = null;
  function stopRunsPolling() { if (RUNS_TIMER) { clearInterval(RUNS_TIMER); RUNS_TIMER = null; } }
  function ensureRunsPolling(hasOpen) {
    if (hasOpen && !RUNS_TIMER) {
      RUNS_TIMER = setInterval(function () { refreshRuns(); }, 10000);   // alle 10 s
    } else if (!hasOpen) {
      stopRunsPolling();
    }
  }

  async function refreshRuns() {
    if (!ACTIVE) { stopRunsPolling(); return; }
    var res = await sb.from("crm_agent_runs").select("*")
      .eq("employee_id", ACTIVE.id).order("created_at", { ascending: false }).limit(8);
    var runs = data(res);
    var box = $("runs-list"); if (!box) return;
    if (!runs.length) { box.innerHTML = B.empty("Noch keine Aufträge."); stopRunsPolling(); return; }

    var hasOpen = false;
    var prevOpen = RUNS_OPEN_KEYS;
    var openKeys = [];
    box.innerHTML = runs.map(function (r) {
      if (r.status === "queued" || r.status === "running") { hasOpen = true; openKeys.push(r.id); }
      var label = r.agent_key === "find_leads" ? "Lead-Suche" : (r.agent_key === "qualify_leads" ? "Bewertung" : r.agent_key);
      var st = runStatus(r.status);
      var when = B.ddmm(r.created_at);
      var extra = "";
      if (r.status === "done" && r.result) {
        if (r.agent_key === "find_leads" && r.result.queued_to_query != null)
          extra = r.result.queued_to_query + " in Query";
        else if (r.agent_key === "qualify_leads" && r.result.lead_score != null)
          extra = "Score " + Math.round(r.result.lead_score);
      }
      if (r.status === "error" && r.error_text) extra = B.esc(String(r.error_text).slice(0, 80));
      if (r.status === "awaiting_approval") {
        var res2 = r.result || {};
        var det = res2.institution_name ? B.esc(res2.institution_name) + " · " : "";
        det += (res2.pending != null ? res2.pending + " Einträge"
              : res2.found != null ? res2.found + " gefunden"
              : (res2.lead_score != null ? "Score " + Math.round(res2.lead_score) : ""));
        return '<div class="run-row approval"><span class="run-when">' + when + '</span>' +
          '<span class="run-label">' + B.esc(label) + '</span>' +
          '<span class="run-st awaiting_approval">Freigabe nötig</span>' +
          '<span class="run-extra">' + det + '</span>' +
          (canWrite ? '<span class="run-actions">' +
            '<button class="btn ghost sm run-reject" data-id="' + r.id + '">Verwerfen</button>' +
            '<button class="btn sm run-approve" data-id="' + r.id + '">Freigeben</button></span>' : "") +
          '</div>';
      }
      return '<div class="run-row"><span class="run-when">' + when + '</span>' +
        '<span class="run-label">' + B.esc(label) + '</span>' +
        '<span class="run-st ' + r.status + '">' + st + '</span>' +
        (extra ? '<span class="run-extra">' + extra + '</span>' : "") + '</div>';
    }).join("");

    if (canWrite) {
      Array.prototype.forEach.call(box.querySelectorAll(".run-approve"), function (b) {
        b.addEventListener("click", function () { approveRun(b.getAttribute("data-id"), true); });
      });
      Array.prototype.forEach.call(box.querySelectorAll(".run-reject"), function (b) {
        b.addEventListener("click", function () { approveRun(b.getAttribute("data-id"), false); });
      });
    }

    // Ein Auftrag, der eben noch offen war, ist jetzt fertig -> Kosten neu laden
    var finished = prevOpen.filter(function (id) { return openKeys.indexOf(id) < 0; });
    RUNS_OPEN_KEYS = openKeys;
    if (finished.length) { try { await loadCosts(); } catch (e) {} }

    ensureRunsPolling(hasOpen);
  }
  var RUNS_OPEN_KEYS = [];

  // ============================================================
  // Zeitpläne: wiederkehrende Aufträge je Mitarbeiter
  // ============================================================
  var SCHEDULES = [], SC_EDIT = null;
  var WD = ["Sonntag", "Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag"];

  async function refreshSchedules() {
    if (!ACTIVE) return;
    var res = await sb.from("crm_schedules").select("*")
      .eq("employee_id", ACTIVE.id).order("created_at", { ascending: true });
    SCHEDULES = data(res);
    renderSchedules();
  }

  function schedText(s) {
    var t = (s.time_of_day || "").slice(0, 5);
    if (s.repeat_mode === "once") return "einmalig · " + (s.run_at ? B.ddmm(s.run_at) + " " + hhmm(s.run_at) : "–");
    if (s.repeat_mode === "daily") return "täglich · " + t + " Uhr";
    if (s.repeat_mode === "weekly") return "wöchentlich · " + (WD[s.weekday] || "?") + " " + t + " Uhr";
    if (s.repeat_mode === "monthly") return "monatlich · am " + s.day_of_month + ". " + t + " Uhr";
    return s.repeat_mode;
  }
  function hhmm(iso) {
    try { var d = new Date(iso); return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0"); }
    catch (e) { return ""; }
  }
  function agentLabel(key) {
    var a = CATALOG.filter(function (x) { return x.agent_key === key; })[0];
    return a ? a.name : key;
  }

  function renderSchedules() {
    var box = $("sched-list"); if (!box) return;
    if (!SCHEDULES.length) { box.innerHTML = B.empty("Keine Zeitpläne. Aufträge laufen nur, wenn du sie startest."); return; }
    box.innerHTML = SCHEDULES.map(function (s) {
      var next = s.is_active && s.next_run_at
        ? ("nächster: " + B.ddmm(s.next_run_at) + " " + hhmm(s.next_run_at))
        : (s.is_active ? "kein Termin" : "pausiert");
      return '<div class="sched-row' + (s.is_active ? "" : " off") + '" data-id="' + s.id + '">' +
        '<span class="sched-agent">' + B.esc(agentLabel(s.agent_key)) + '</span>' +
        '<span class="sched-when">' + B.esc(schedText(s)) + '</span>' +
        '<span class="sched-next">' + B.esc(next) + '</span>' +
        (canWrite ? '<button class="btn ghost sm sched-edit" data-id="' + s.id + '">Ändern</button>' : "") +
        '</div>';
    }).join("");
    if (canWrite) {
      Array.prototype.forEach.call(box.querySelectorAll(".sched-edit"), function (b) {
        b.addEventListener("click", function () { openSchedule(b.getAttribute("data-id")); });
      });
    }
  }

  function openSchedule(id) {
    SC_EDIT = id ? SCHEDULES.filter(function (s) { return s.id === id; })[0] : null;
    var isNew = !SC_EDIT;
    $("sched-title").textContent = isNew ? "Neuer Zeitplan" : "Zeitplan ändern";
    $("sc-delete").style.display = isNew ? "none" : "";

    // Agentenauswahl: nur die, die diesem Mitarbeiter zugeordnet sind
    var opts = ACTIVE_AGENTS.map(function (ea) { return agentById(ea.agent_id); })
      .filter(Boolean)
      .map(function (a) {
        var sel = SC_EDIT && SC_EDIT.agent_key === a.agent_key ? " selected" : "";
        return '<option value="' + B.esc(a.agent_key) + '"' + sel + '>' + B.esc(a.name) + '</option>';
      }).join("");
    $("sc-agent").innerHTML = opts || '<option value="">Kein Agent zugeordnet</option>';

    $("sc-repeat").value = SC_EDIT ? SC_EDIT.repeat_mode : "weekly";
    $("sc-weekday").value = SC_EDIT && SC_EDIT.weekday != null ? String(SC_EDIT.weekday) : "1";
    $("sc-dom").value = SC_EDIT && SC_EDIT.day_of_month != null ? SC_EDIT.day_of_month : 1;
    $("sc-time").value = SC_EDIT && SC_EDIT.time_of_day ? SC_EDIT.time_of_day.slice(0, 5) : "08:00";
    $("sc-runat").value = SC_EDIT && SC_EDIT.run_at ? toLocalInput(SC_EDIT.run_at) : "";
    $("sc-active").checked = SC_EDIT ? SC_EDIT.is_active : true;
    var inp = (SC_EDIT && SC_EDIT.input) || {};
    $("sc-criteria").value = inp.freeText || "";

    syncScheduleFields();
    scmsg("");
    $("sched-modal").style.display = "flex";
  }
  function closeSchedule() { $("sched-modal").style.display = "none"; SC_EDIT = null; }

  function toLocalInput(iso) {
    try {
      var d = new Date(iso);
      return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")
        + "T" + String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
    } catch (e) { return ""; }
  }

  // Felder je nach Wiederholung und Agent ein-/ausblenden
  function syncScheduleFields() {
    var m = $("sc-repeat").value;
    $("sc-wrap-weekday").style.display = (m === "weekly") ? "" : "none";
    $("sc-wrap-dom").style.display     = (m === "monthly") ? "" : "none";
    $("sc-wrap-time").style.display    = (m === "once") ? "none" : "";
    $("sc-wrap-once").style.display    = (m === "once") ? "" : "none";
    var key = $("sc-agent").value;
    $("sc-opts-find").style.display    = (key === "find_leads") ? "" : "none";
    $("sc-opts-qualify").style.display = (key === "qualify_leads") ? "" : "none";
  }

  async function saveSchedule() {
    if (!canWrite || !ACTIVE) return;
    var key = $("sc-agent").value;
    if (!key) { scmsg("Diesem Mitarbeiter ist kein Agent zugeordnet.", "err"); return; }
    var mode = $("sc-repeat").value;

    var agentRow = CATALOG.filter(function (a) { return a.agent_key === key; })[0];
    var input = {
      employeeName: ACTIVE.name, employeeDescription: ACTIVE.description,
      memory: ACTIVE_MEM.map(function (m) { return m.content; })
    };
    if (key === "find_leads") {
      input.criteria = {};
      input.freeText = ($("sc-criteria").value || "").trim();
      input.maxLeads = 10;
    } else if (key === "qualify_leads") {
      input.mode = "unrated";   // beim Lauf: noch unbewertete Leads nehmen
      input.maxItems = 10;
    }

    var row = {
      employee_id: ACTIVE.id, agent_id: agentRow ? agentRow.id : null, agent_key: key,
      input: input, repeat_mode: mode, is_active: $("sc-active").checked,
      run_at: null, time_of_day: null, weekday: null, day_of_month: null
    };
    if (mode === "once") {
      var v = $("sc-runat").value;
      if (!v) { scmsg("Bitte einen Zeitpunkt wählen.", "err"); return; }
      row.run_at = new Date(v).toISOString();
    } else {
      var t = $("sc-time").value || "08:00";
      row.time_of_day = t.length === 5 ? (t + ":00") : t;
      if (mode === "weekly") row.weekday = parseInt($("sc-weekday").value, 10);
      if (mode === "monthly") {
        var dom = parseInt($("sc-dom").value, 10) || 1;
        row.day_of_month = Math.max(1, Math.min(28, dom));
      }
    }

    $("sc-save").disabled = true; scmsg("Speichern …");
    var res = SC_EDIT
      ? await sb.from("crm_schedules").update(row).eq("id", SC_EDIT.id)
      : await sb.from("crm_schedules").insert(row);
    $("sc-save").disabled = false;
    if (res.error) { scmsg("Fehler: " + res.error.message, "err"); return; }
    closeSchedule();
    await refreshSchedules();
  }

  async function deleteSchedule() {
    if (!SC_EDIT || !canWrite) return;
    if (!window.confirm("Diesen Zeitplan löschen?")) return;
    var res = await sb.from("crm_schedules").delete().eq("id", SC_EDIT.id);
    if (res.error) { scmsg("Fehler: " + res.error.message, "err"); return; }
    closeSchedule();
    await refreshSchedules();
  }

  function scmsg(t, type) { var m = $("sc-msg"); if (m) { m.textContent = t; m.className = "login-msg " + (type || ""); } }
  // Geparktes Ergebnis eines "Freigabe nötig"-Agenten anwenden oder verwerfen
  async function approveRun(runId, approve) {
    if (!canWrite) return;
    var res = await sb.from("crm_agent_runs").select("*").eq("id", runId).single();
    if (res.error || !res.data) { pushChat("system", "Auftrag nicht gefunden."); return; }
    var run = res.data, pl = run.pending_payload || {};

    if (!approve) {
      await sb.from("crm_agent_runs").update({
        status: "discarded", rejected_at: new Date().toISOString()
      }).eq("id", runId);
      await refreshRuns();
      return;
    }

    var err = null, applied = 0;
    try {
      if (pl.kind === "query_rows" && Array.isArray(pl.rows) && pl.rows.length) {
        var r1 = await sb.from("crm_query").insert(pl.rows);
        if (r1.error) throw r1.error;
        applied = pl.rows.length;

      } else if (pl.kind === "contacts" && Array.isArray(pl.rows) && pl.rows.length) {
        var r2 = await sb.from("crm_contacts").insert(pl.rows);
        if (r2.error) throw r2.error;
        applied = pl.rows.length;

      } else if (pl.kind === "qualification" && pl.institution_id) {
        var r3 = await sb.from("crm_institution_details").update({
          ai_qualification: pl.qualification, ai_assessment: pl.assessment,
          ai_assessed_at: new Date().toISOString(), ai_assessed_by: run.employee_id
        }).eq("institution_id", pl.institution_id);
        if (r3.error) throw r3.error;
        applied = 1;
      }
    } catch (e) { err = (e && e.message) ? e.message : String(e); }

    if (err) { pushChat("system", "Freigabe fehlgeschlagen: " + err); return; }

    await sb.from("crm_agent_runs").update({
      status: "done", approved_at: new Date().toISOString(), applied_at: new Date().toISOString()
    }).eq("id", runId);
    pushChat("agent", "Freigegeben — " + applied + (applied === 1 ? " Eintrag" : " Einträge") + " übernommen.");
    await refreshRuns();
  }

  function runStatus(s) {
    return s === "queued" ? "Wartet" : s === "running" ? "Läuft" : s === "done" ? "Fertig"
      : s === "awaiting_approval" ? "Freigabe nötig"
      : s === "error" ? "Fehler" : s === "discarded" ? "Verworfen" : s;
  }

  // Play auf einer Kachel: je nach Agent unterschiedlicher Start
  async function startRun(agentKey) {
    if (!canWrite || !ACTIVE) return;
    if (agentKey === "qualify_leads") return startQualify("qualify_leads");
    if (agentKey === "find_contacts") return startQualify("find_contacts");
    if (agentKey === "find_leads") return openCriteria();
  }

  var LEAD_PICK_MODE = "qualify_leads";
  async function startQualify(mode) {
    LEAD_PICK_MODE = mode || "qualify_leads";
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

  // ============================================================
  // find_leads: Kriterien-Dialog -> Suche -> Vorschläge -> übernehmen
  // ============================================================
  // Vordefinierte, an-/abwählbare Kriterienfelder
  var CRIT_FIELDS = [
    { key: "school_type", label: "Schulform", ph: "z. B. Berufsbildende Schule", on: true },
    { key: "region",      label: "Region / Bundesland", ph: "z. B. Rheinland-Pfalz", on: true },
    { key: "district",    label: "Kreis / Ort", ph: "z. B. Eifelkreis Bitburg-Prüm", on: true },
    { key: "radius",      label: "Umkreis", ph: "z. B. 50 km um Bitburg", on: false },
    { key: "sponsorship", label: "Trägerschaft", ph: "öffentlich / privat", on: false }
  ];
  var CUSTOM_CRIT = [];   // vom Nutzer ergänzte Felder [{label, ph}]

  function openCriteria() {
    renderCriteria();
    $("crit-msg").textContent = "";
    $("crit-modal").style.display = "flex";
  }
  function closeCriteria() { $("crit-modal").style.display = "none"; }

  function renderCriteria() {
    var rows = CRIT_FIELDS.map(function (f, i) {
      return '<div class="crit-row">' +
        '<label class="crit-toggle"><input type="checkbox" data-i="' + i + '"' + (f.on ? " checked" : "") + '> ' + B.esc(f.label) + '</label>' +
        '<input class="crit-val" data-i="' + i + '" type="text" placeholder="' + B.esc(f.ph) + '"' + (f.on ? "" : " disabled") + '></div>';
    }).join("");
    var custom = CUSTOM_CRIT.map(function (f, i) {
      return '<div class="crit-row">' +
        '<label class="crit-toggle"><input type="checkbox" data-c="' + i + '" checked> ' + B.esc(f.label) + '</label>' +
        '<input class="crit-val" data-c="' + i + '" type="text" placeholder="' + B.esc(f.ph || "") + '"></div>';
    }).join("");
    $("crit-fields").innerHTML = rows + custom;
    // Toggle aktiviert/deaktiviert das zugehörige Feld
    Array.prototype.forEach.call($("crit-fields").querySelectorAll('.crit-toggle input[data-i]'), function (cb) {
      cb.addEventListener("change", function () {
        var i = cb.getAttribute("data-i");
        var val = $("crit-fields").querySelector('.crit-val[data-i="' + i + '"]');
        if (val) val.disabled = !cb.checked;
        CRIT_FIELDS[i].on = cb.checked;
      });
    });
  }

  function addCustomCriterion() {
    var label = ($("crit-new").value || "").trim();
    if (!label) return;
    CUSTOM_CRIT.push({ label: label, ph: "" });
    $("crit-new").value = "";
    renderCriteria();
  }

  function collectCriteria() {
    var crit = {}, freeParts = [];
    CRIT_FIELDS.forEach(function (f, i) {
      if (!f.on) return;
      var el = $("crit-fields").querySelector('.crit-val[data-i="' + i + '"]');
      var v = el ? (el.value || "").trim() : "";
      if (v) crit[f.key] = v;
    });
    CUSTOM_CRIT.forEach(function (f, i) {
      var el = $("crit-fields").querySelector('.crit-val[data-c="' + i + '"]');
      var v = el ? (el.value || "").trim() : "";
      if (v) freeParts.push(f.label + ": " + v);
    });
    return { criteria: crit, freeText: freeParts.join("; ") };
  }

  // Suche starten
  async function runFind() {
    if (!ACTIVE) return;
    var c = collectCriteria();
    closeCriteria();

    $("run-card").style.display = "";
    $("run-title").textContent = "Auftrag · Lead-Suche";
    $("run-chat").innerHTML = "";
    $("run-result").style.display = "none"; $("run-result").innerHTML = "";

    var agentRow = ACTIVE_AGENTS.map(function (ea) { return agentById(ea.agent_id); }).filter(function (a) { return a && a.agent_key === "find_leads"; })[0];
    // Auftrag mit allem Nötigen fürs serverseitige Abarbeiten
    var input = {
      criteria: c.criteria, freeText: c.freeText, maxLeads: 10,
      employeeName: ACTIVE.name, employeeDescription: ACTIVE.description,
      memory: ACTIVE_MEM.map(function (m) { return m.content; })
    };
    var runIns = await sb.from("crm_agent_runs").insert({
      employee_id: ACTIVE.id, agent_id: agentRow ? agentRow.id : null, agent_key: "find_leads",
      status: "queued", input: input
    }).select("id").single();

    if (runIns.error) { pushChat("system", "Auftrag konnte nicht eingereiht werden: " + runIns.error.message); return; }
    pushChat("agent", ACTIVE.name + " hat den Suchauftrag angenommen. Ich arbeite im Hintergrund — du kannst die Seite schließen.");
    pushChat("system", "Der Auftrag läuft. Ergebnisse erscheinen in der Query, sobald ich fertig bin (meist innerhalb weniger Minuten).");
    await refreshRuns();
  }

  // Treffer in die Query schreiben (Dubletten gegen bestehende Query raus)
  // Bewertung als Hintergrund-Auftrag einreihen (queued).
  async function runQualify(institutionId) {
    var inst = OPEN_LEADS.filter(function (i) { return i.institution_id === institutionId; })[0];
    if (!inst || !ACTIVE) return;
    closeLeadModal();

    $("run-card").style.display = "";
    $("run-title").textContent = "Auftrag · " + (LEAD_PICK_MODE === "find_contacts" ? "Ansprechpartner " : "Bewertung ") + inst.name;
    $("run-chat").innerHTML = "";
    $("run-result").style.display = "none"; $("run-result").innerHTML = "";

    var wantKey = LEAD_PICK_MODE;
    var agentRow = ACTIVE_AGENTS.map(function (ea) { return agentById(ea.agent_id); }).filter(function (a) { return a && a.agent_key === wantKey; })[0];
    var input = {
      employeeName: ACTIVE.name, employeeDescription: ACTIVE.description,
      memory: ACTIVE_MEM.map(function (m) { return m.content; }),
      institution: {
        id: institutionId, name: inst.name, city: inst.city, state: inst.state,
        type: inst.type, website: inst.website, stage: inst.lifecycle_stage,
        postal_code: inst.postal_code
      }
    };
    var runIns = await sb.from("crm_agent_runs").insert({
      employee_id: ACTIVE.id, agent_id: agentRow ? agentRow.id : null, agent_key: wantKey,
      institution_id: institutionId, status: "queued", input: input
    }).select("id").single();

    if (runIns.error) { pushChat("system", "Auftrag konnte nicht eingereiht werden: " + runIns.error.message); return; }
    pushChat("agent", ACTIVE.name + (wantKey === "find_contacts"
      ? " sucht Ansprechpartner für „" + inst.name + "\" im Hintergrund."
      : " bewertet „" + inst.name + "\" im Hintergrund. Das Ergebnis erscheint automatisch an der Schule, sobald ich fertig bin."));
    pushChat("system", "Der Auftrag läuft. Du kannst die Seite schließen.");
    await refreshRuns();
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
