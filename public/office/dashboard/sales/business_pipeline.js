/* ============================================================
   Toni Business Center — Pipeline (Kanban-Board)
   Karten je Verkaufschance, per Drag-and-drop zwischen Stufen.
   Verschieben aktualisiert crm_opportunities.stage (optimistisch).
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;

  var OPEN = B.STAGES.filter(function (s) { return s[0] !== "won" && s[0] !== "lost"; });
  // Gewonnen ist eine echte Drop-Spalte am Ende — dort landet der Erfolg.
  var COLS = OPEN.concat([["won", "Gewonnen 🏆", "#16a34a"]]);
  var OPPS = {};        // id -> opportunity
  var INSTNAME = {};    // institution_id -> name
  var INSTS = [];       // [{id,name}] für das Anlege-Modal
  var ROLE = null;
  var canWrite = false;
  var GOAL_METRIC = "won_value";
  var GOAL_DEFAULT = 25000;
  var goalAmount = GOAL_DEFAULT;   // aus crm_goals geladen
  var myUserId = null;
  var lastCelebrated = null;       // verhindert doppelte Feier

  async function load(role) {
    ROLE = role; canWrite = B.canWriteSales(role);
    $("bc-nav").innerHTML = B.nav("business_pipeline.html");
    if (canWrite) $("opp-add").style.display = "";
    wireUi();

    var res = await Promise.all([
      sb.from("crm_opportunities").select("*").order("created_at", { ascending: false }),
      sb.from("institutions").select("id,name").order("name"),
      sb.from("crm_goals").select("target_amount").eq("metric", GOAL_METRIC).maybeSingle(),
      sb.auth.getUser()
    ]);
    var opps = data(res[0]);
    INSTS = data(res[1]);
    INSTNAME = {}; INSTS.forEach(function (i) { INSTNAME[i.id] = i.name; });
    OPPS = {}; opps.forEach(function (o) { OPPS[o.id] = o; });

    var g = res[2] && res[2].data ? Number(res[2].data.target_amount) : null;
    goalAmount = (g && g > 0) ? g : GOAL_DEFAULT;
    myUserId = res[3] && res[3].data && res[3].data.user ? res[3].data.user.id : null;

    render();
  }

  function data(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }

  function render() {
    var byStage = {}; COLS.forEach(function (s) { byStage[s[0]] = []; });
    var lostN = 0, openV = 0;
    Object.keys(OPPS).forEach(function (id) {
      var o = OPPS[id];
      if (o.stage === "lost") { lostN++; return; }
      if (byStage[o.stage]) byStage[o.stage].push(o);
      if (o.stage !== "won") openV += Number(o.expected_value || 0);
    });
    $("pipe-sub").textContent = "Karten zwischen Stufen ziehen · Gesamtwert offen: " + B.euro(openV);

    renderSuccess();

    $("board").innerHTML = COLS.map(function (s) {
      var list = byStage[s[0]] || [];
      var sum = list.reduce(function (a, o) { return a + Number(o.expected_value || 0); }, 0);
      var cards = list.map(cardHtml).join("") || '<div class="muted-empty" style="font-size:12px">–</div>';
      var isWon = s[0] === "won";
      return '<div class="col' + (isWon ? " col-won" : "") + '" data-stage="' + s[0] + '"' +
        (isWon ? ' style="background:#e9f9ef"' : '') + '>' +
        '<div class="col-head"><span class="dot" style="background:' + s[2] + '"></span>' +
          '<span class="nm">' + B.esc(s[1]) + '</span><span class="ct">' + list.length + '</span>' +
          '<span class="sum">' + (sum ? B.euro(sum) : "") + '</span></div>' +
        '<div class="col-body" data-stage="' + s[0] + '">' + cards + '</div></div>';
    }).join("");

    $("board-foot").innerHTML =
      '<div class="foot-box lost" data-stage="lost">Hierher ziehen für „Verloren" · aktuell ' + lostN + '</div>';

    if (canWrite) wireDnd();
    wireCardClicks();
  }

  // --- Erfolgs-Leiste -----------------------------------------
  function monthStart() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }
  function getGoal() { return goalAmount; }

  function computeSuccess() {
    var ms = monthStart(), wonMonthV = 0, wonMonthN = 0, wonAllV = 0, wonAllN = 0;
    var closedWon = 0, closedLost = 0, biggest = 0, best = null;
    Object.keys(OPPS).forEach(function (id) {
      var o = OPPS[id];
      if (o.stage === "won") {
        wonAllN++; wonAllV += Number(o.expected_value || 0);
        var v = Number(o.expected_value || 0);
        if (v > biggest) { biggest = v; best = o; }
        var cd = o.closed_at ? new Date(o.closed_at) : null;
        if (cd && cd >= ms) { wonMonthN++; wonMonthV += v; }
        closedWon++;
      } else if (o.stage === "lost") { closedLost++; }
    });
    var rate = (closedWon + closedLost) ? Math.round(closedWon / (closedWon + closedLost) * 100) : null;
    return { wonMonthV: wonMonthV, wonMonthN: wonMonthN, wonAllV: wonAllV, wonAllN: wonAllN,
      rate: rate, biggest: biggest, best: best, goal: getGoal() };
  }

  function renderSuccess() {
    var s = computeSuccess(), pct = Math.min(100, Math.round(s.wonMonthV / s.goal * 100));
    var msg;
    if (s.wonMonthV <= 0) msg = "Neuer Monat, neue Chancen. Auf zum ersten Abschluss!";
    else if (pct >= 100) msg = "🎉 Monatsziel geknackt! Überragend.";
    else if (pct >= 66) msg = "Fast am Ziel — noch " + B.euro(s.goal - s.wonMonthV) + ".";
    else if (pct >= 33) msg = "Guter Lauf. Dranbleiben!";
    else msg = "Starker Start. Weiter so!";

    var bar = $("success-bar");
    bar.style.display = "block";
    bar.innerHTML =
      '<div class="success-top">' +
        stat(B.euro(s.wonMonthV), "Umsatz gewonnen (Monat)") + sep() +
        stat(s.wonMonthN, "Abschlüsse (Monat)") + sep() +
        stat(s.rate == null ? "–" : s.rate + " %", "Abschlussquote") + sep() +
        stat(s.biggest ? B.euro(s.biggest) : "–", "Größter Abschluss") +
        '<span class="success-msg">' + msg + '</span>' +
      '</div>' +
      '<div class="goal-wrap"><div class="goal-head">' +
        '<span>Monatsziel &nbsp;<span class="goal-edit" id="goal-edit">bearbeiten</span></span>' +
        '<span><b>' + B.euro(s.wonMonthV) + '</b> / ' + B.euro(s.goal) + ' &nbsp;(' + pct + ' %)</span>' +
      '</div><div class="goal-track"><div class="goal-fill' + (pct >= 100 ? " done" : "") + '" style="width:' + pct + '%"></div></div></div>';

    var ed = $("goal-edit");
    // Ziel darf nur der/die Vertriebsmitarbeiter:in setzen (RLS erlaubt nur das eigene)
    if (ed && canWrite) ed.addEventListener("click", saveGoal);
    else if (ed) ed.style.display = "none";
  }

  async function saveGoal() {
    var v = window.prompt("Monatsziel in € (Netto-Umsatz gewonnener Abschlüsse):", getGoal());
    if (v == null) return;
    var n = parseFloat(String(v).replace(/[^\d.,]/g, "").replace(",", "."));
    if (!(n > 0)) return;
    var prev = goalAmount;
    goalAmount = n; renderSuccess();     // optimistisch
    if (!myUserId) return;
    var res = await sb.from("crm_goals")
      .upsert({ user_id: myUserId, metric: GOAL_METRIC, target_amount: n }, { onConflict: "user_id,metric" });
    if (res.error) { goalAmount = prev; renderSuccess(); alert("Ziel konnte nicht gespeichert werden: " + res.error.message); }
  }
  function stat(n, l) { return '<div class="success-stat"><span class="n">' + n + '</span><span class="l">' + l + '</span></div>'; }
  function sep() { return '<div class="success-sep"></div>'; }

  // --- Feier beim Gewinnen ------------------------------------
  function celebrate(value) {
    // Toast
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = "🎉 Deal gewonnen!" + (value ? "  +" + B.euro(value) : "");
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = "opacity .4s"; t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 400); }, 2200);

    // Konfetti
    var wrap = document.createElement("div");
    wrap.className = "confetti";
    var colors = ["#4f46e5", "#7c3aed", "#16a34a", "#f59e0b", "#ec4899", "#22c55e"];
    for (var i = 0; i < 36; i++) {
      var c = document.createElement("i");
      c.style.left = Math.random() * 100 + "vw";
      c.style.background = colors[i % colors.length];
      c.style.animationDuration = (1 + Math.random() * 1.2) + "s";
      c.style.animationDelay = (Math.random() * 0.25) + "s";
      wrap.appendChild(c);
    }
    document.body.appendChild(wrap);
    setTimeout(function () { wrap.remove(); }, 2600);
  }

  function cardHtml(o) {
    var name = INSTNAME[o.institution_id] || "(unbekannte Schule)";
    var meta = (o.expected_value != null ? B.euro(o.expected_value) : "kein Wert") +
      (o.probability != null ? " · " + o.probability + " %" : "");
    return '<div class="oppcard" draggable="' + (canWrite ? "true" : "false") + '" data-id="' + o.id + '" data-inst="' + o.institution_id + '">' +
      '<div class="oc-t">' + B.esc(o.title) + '</div>' +
      '<div class="oc-i">' + B.esc(name) + '</div>' +
      '<div class="oc-m">' + meta + '</div></div>';
  }

  // --- Drag & Drop --------------------------------------------
  var dragId = null;
  function wireDnd() {
    Array.prototype.forEach.call($("board").querySelectorAll(".oppcard"), function (card) {
      card.addEventListener("dragstart", function (e) {
        dragId = card.getAttribute("data-id");
        card.classList.add("dragging");
        if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragId); }
      });
      card.addEventListener("dragend", function () { card.classList.remove("dragging"); });
    });
    Array.prototype.forEach.call($("board").querySelectorAll(".col-body"), function (body) {
      var col = body.parentNode;
      body.addEventListener("dragover", function (e) { e.preventDefault(); col.classList.add("drop"); });
      body.addEventListener("dragleave", function () { col.classList.remove("drop"); });
      body.addEventListener("drop", function (e) {
        e.preventDefault(); col.classList.remove("drop");
        var stage = body.getAttribute("data-stage");
        if (dragId) moveCard(dragId, stage);
      });
    });
    // Verlust-Leiste ebenfalls als Drop-Ziel
    var lost = $("board-foot").querySelector('[data-stage="lost"]');
    if (lost) {
      lost.addEventListener("dragover", function (e) { e.preventDefault(); lost.classList.add("drop"); });
      lost.addEventListener("dragleave", function () { lost.classList.remove("drop"); });
      lost.addEventListener("drop", function (e) {
        e.preventDefault(); lost.classList.remove("drop");
        if (dragId) moveCard(dragId, "lost");
      });
    }
  }

  // Optimistisch: sofort umsortieren, dann speichern; bei Fehler zurück.
  async function moveCard(id, stage) {
    var o = OPPS[id];
    if (!o || o.stage === stage) return;
    var prev = o.stage;

    var patch = { stage: stage };
    if (stage === "lost") {
      var reason = window.prompt("Grund für 'Verloren'?");
      if (!reason) return;               // abgebrochen -> nichts tun
      patch.loss_reason = reason;
      o.loss_reason = reason;
    }
    if (stage === "won" && !o.closed_at) o.closed_at = new Date().toISOString();
    o.stage = stage; render();           // optimistisch

    // Erfolg feiern — sofort, damit es sich direkt belohnend anfühlt
    if (stage === "won" && prev !== "won" && lastCelebrated !== id) {
      lastCelebrated = id;
      celebrate(Number(o.expected_value || 0));
    }

    var res = await sb.from("crm_opportunities").update(patch).eq("id", id);
    if (res.error) {
      o.stage = prev; render();          // zurückrollen
      alert("Konnte nicht verschieben: " + res.error.message);
    }
  }

  function wireCardClicks() {
    // Klick (ohne Ziehen) öffnet die Schule
    Array.prototype.forEach.call($("board").querySelectorAll(".oppcard"), function (card) {
      var moved = false;
      card.addEventListener("dragstart", function () { moved = true; });
      card.addEventListener("click", function () {
        if (moved) { moved = false; return; }
        location.href = "business_institution.html?id=" + card.getAttribute("data-inst");
      });
    });
  }

  // --- Anlegen ------------------------------------------------
  function wireUi() {
    var oa = $("opp-add"); if (oa) oa.addEventListener("click", openModal);
    $("opp-cancel").addEventListener("click", closeModal);
    $("opp-savebtn").addEventListener("click", saveOpp);
    $("opp-modal").addEventListener("click", function (e) { if (e.target === $("opp-modal")) closeModal(); });
    $("o-stage").innerHTML = OPEN.map(function (s) {
      return '<option value="' + s[0] + '"' + (s[0] === "qualified" ? " selected" : "") + '>' + s[1] + '</option>';
    }).join("");
  }

  function openModal() {
    $("o-inst").innerHTML = '<option value="">– Schule wählen –</option>' +
      INSTS.map(function (i) { return '<option value="' + i.id + '">' + B.esc(i.name) + '</option>'; }).join("");
    $("opp-msg").textContent = "";
    $("opp-modal").style.display = "flex"; $("o-title").focus();
  }
  function closeModal() { $("opp-modal").style.display = "none"; ["o-title","o-value","o-prob"].forEach(function (id) { $(id).value = ""; }); }

  async function saveOpp() {
    var inst = $("o-inst").value, title = ($("o-title").value || "").trim();
    if (!inst) { msg("Bitte eine Schule wählen.", "err"); return; }
    if (!title) { msg("Bitte einen Titel eingeben.", "err"); return; }
    $("opp-savebtn").disabled = true; msg("Speichern …");
    try {
      var res = await sb.from("crm_opportunities").insert({
        institution_id: inst, title: title,
        stage: $("o-stage").value, source: $("o-source").value || null,
        expected_value: numOrNull("o-value"), probability: numOrNull("o-prob")
      }).select("*").single();
      if (res.error) throw res.error;
      OPPS[res.data.id] = res.data;
      if (!INSTNAME[inst]) { var m = $("o-inst"); INSTNAME[inst] = m.options[m.selectedIndex].text; }
      closeModal(); render();
    } catch (e) { msg("Fehler: " + ((e && e.message) || "unbekannt"), "err"); }
    finally { $("opp-savebtn").disabled = false; }
  }

  function numOrNull(id) { var x = $(id).value; return x === "" ? null : Number(x); }
  function msg(t, type) { var m = $("opp-msg"); m.textContent = t; m.className = "login-msg " + (type || ""); }

  // Für Tests
  window.TONI_BC_PIPE = {
    seed: function (opps, names, goal) { OPPS = {}; opps.forEach(function (o) { OPPS[o.id] = o; }); INSTNAME = names || {}; canWrite = true; if (goal) goalAmount = goal; },
    render: render, move: moveCard, get: function (id) { return OPPS[id]; }
  };

  B.mountAuth({ onReady: load });
})();
