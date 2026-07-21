/* ============================================================
   Toni Business Center — Pipeline (Kanban über Schulen)
   Einheitliches Lebenszyklus-Modell: eine Karte = eine Schule.
   Verschieben aktualisiert crm_institution_details.lifecycle_stage.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;

  var OPEN = B.lcOpen();                                  // lead … negotiation
  var COLS = OPEN.concat([["customer", "Aktiver Kunde 🏆", "#22c55e", "customer"]]);
  var INSTS = {};        // id -> Schule (name, stage, deal_value, …)
  var ROLE = null, canWrite = false, myUserId = null;
  var GOAL_METRIC = "won_value", GOAL_DEFAULT = 25000, goalAmount = GOAL_DEFAULT;
  var lastCelebrated = null;

  async function load(role) {
    ROLE = role; canWrite = B.canWriteSales(role);
    $("bc-nav").innerHTML = B.nav("business_pipeline.html");
    if (canWrite) $("opp-add").style.display = "";
    wireUi();

    var res = await Promise.all([
      sb.from("v_crm_institution_stage").select("*"),
      sb.from("crm_goals").select("target_amount").eq("metric", GOAL_METRIC).maybeSingle(),
      sb.auth.getUser()
    ]);
    INSTS = {}; data(res[0]).forEach(function (i) { INSTS[i.institution_id] = i; });
    var g = res[1] && res[1].data ? Number(res[1].data.target_amount) : null;
    goalAmount = (g && g > 0) ? g : GOAL_DEFAULT;
    myUserId = res[2] && res[2].data && res[2].data.user ? res[2].data.user.id : null;
    render();
  }

  function data(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }

  function render() {
    var byStage = {}; COLS.forEach(function (s) { byStage[s[0]] = []; });
    var churnedProspect = 0, churnedCustomer = 0, openV = 0;
    Object.keys(INSTS).forEach(function (id) {
      var i = INSTS[id], st = i.lifecycle_stage;
      if (st === "churned_prospect") { churnedProspect++; return; }
      if (st === "churned_customer") { churnedCustomer++; return; }
      if (byStage[st]) byStage[st].push(i);
      if (st !== "customer") openV += Number(i.deal_value || 0);
    });
    $("pipe-sub").textContent = "Schulen zwischen Stufen ziehen · Pipeline-Wert: " + B.euro(openV);
    renderSuccess();

    $("board").innerHTML = COLS.map(function (s) {
      var list = byStage[s[0]] || [];
      var sum = list.reduce(function (a, i) { return a + Number(i.deal_value || 0); }, 0);
      var cards = list.map(cardHtml).join("") || '<div class="muted-empty" style="font-size:12px">–</div>';
      var isWon = s[0] === "customer";
      return '<div class="col' + (isWon ? " col-won" : "") + '" data-stage="' + s[0] + '"' +
        (isWon ? ' style="background:#e9f9ef"' : '') + '>' +
        '<div class="col-head"><span class="dot" style="background:' + s[2] + '"></span>' +
          '<span class="nm">' + B.esc(s[1]) + '</span><span class="ct">' + list.length + '</span>' +
          '<span class="sum">' + (sum ? B.euro(sum) : "") + '</span></div>' +
        '<div class="col-body" data-stage="' + s[0] + '">' + cards + '</div></div>';
    }).join("");

    $("board-foot").innerHTML =
      '<div class="foot-box lost" data-stage="churned_prospect">Hierher ziehen: „Abgesprungen" · ' + churnedProspect + '</div>' +
      '<div class="foot-box lost" data-stage="churned_customer" style="background:#f1f2f7">Hierher ziehen: „Verlorener Kunde" · ' + churnedCustomer + '</div>';

    if (canWrite) wireDnd();
    wireCardClicks();
  }

  function cardHtml(i) {
    var meta = (i.deal_value != null ? B.euro(i.deal_value) : "kein Wert") +
      (i.win_probability != null ? " · " + i.win_probability + " %" : "");
    return '<div class="oppcard" draggable="' + (canWrite ? "true" : "false") + '" data-id="' + i.institution_id + '">' +
      '<div class="oc-t">' + B.esc(i.name) + '</div>' +
      '<div class="oc-i">' + B.esc([i.city, i.state].filter(Boolean).join(" · ") || "") + '</div>' +
      '<div class="oc-m">' + meta + '</div></div>';
  }

  // --- Drag & Drop --------------------------------------------
  var dragId = null;
  function wireDnd() {
    Array.prototype.forEach.call($("board").querySelectorAll(".oppcard"), function (card) {
      card.addEventListener("dragstart", function (e) {
        dragId = card.getAttribute("data-id"); card.classList.add("dragging");
        if (e.dataTransfer) { e.dataTransfer.effectAllowed = "move"; e.dataTransfer.setData("text/plain", dragId); }
      });
      card.addEventListener("dragend", function () { card.classList.remove("dragging"); });
    });
    var zones = [].slice.call($("board").querySelectorAll(".col-body"))
      .concat([].slice.call($("board-foot").querySelectorAll("[data-stage]")));
    zones.forEach(function (zone) {
      var host = zone.classList.contains("col-body") ? zone.parentNode : zone;
      zone.addEventListener("dragover", function (e) { e.preventDefault(); host.classList.add("drop"); });
      zone.addEventListener("dragleave", function () { host.classList.remove("drop"); });
      zone.addEventListener("drop", function (e) {
        e.preventDefault(); host.classList.remove("drop");
        if (dragId) moveCard(dragId, zone.getAttribute("data-stage"));
      });
    });
  }

  async function moveCard(id, stage) {
    var i = INSTS[id];
    if (!i || i.lifecycle_stage === stage) return;
    var prev = i.lifecycle_stage;

    var patch = { institution_id: id, lifecycle_stage: stage };
    if (stage === "churned_prospect" || stage === "churned_customer") {
      var reason = window.prompt("Grund für den Verlust?");
      if (!reason) return;
      patch.closed_reason = reason; i.closed_reason = reason;
    }
    if (stage === "customer" && !i.customer_since) i.customer_since = new Date().toISOString().slice(0, 10);
    i.lifecycle_stage = stage; render();

    if (stage === "customer" && prev !== "customer" && lastCelebrated !== id) {
      lastCelebrated = id; celebrate(Number(i.deal_value || 0));
    }

    var res = await sb.from("crm_institution_details")
      .upsert(patch, { onConflict: "institution_id" });
    if (res.error) { i.lifecycle_stage = prev; render(); alert("Konnte nicht verschieben: " + res.error.message); }
  }

  function wireCardClicks() {
    Array.prototype.forEach.call($("board").querySelectorAll(".oppcard"), function (card) {
      var moved = false;
      card.addEventListener("dragstart", function () { moved = true; });
      card.addEventListener("click", function () {
        if (moved) { moved = false; return; }
        location.href = "business_institution.html?id=" + card.getAttribute("data-id");
      });
    });
  }

  // --- Erfolgs-Leiste -----------------------------------------
  function monthStart() { var d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); }
  function getGoal() { return goalAmount; }

  function computeSuccess() {
    var ms = monthStart(), wonMonthV = 0, wonMonthN = 0, biggest = 0;
    var customers = 0, churned = 0, churnedProsp = 0;
    Object.keys(INSTS).forEach(function (id) {
      var i = INSTS[id], st = i.lifecycle_stage;
      if (st === "customer") {
        customers++;
        var v = Number(i.deal_value || 0); if (v > biggest) biggest = v;
        var cd = i.customer_since ? new Date(i.customer_since) : null;
        if (cd && cd >= ms) { wonMonthN++; wonMonthV += v; }
      } else if (st === "churned_customer") churned++;
      else if (st === "churned_prospect") churnedProsp++;
    });
    var decided = customers + churned + churnedProsp;
    var rate = decided ? Math.round((customers + churned) / decided * 100) : null;
    return { wonMonthV: wonMonthV, wonMonthN: wonMonthN, rate: rate, biggest: biggest, goal: getGoal() };
  }

  function renderSuccess() {
    var s = computeSuccess(), pct = Math.min(100, Math.round(s.wonMonthV / s.goal * 100));
    var msg;
    if (s.wonMonthV <= 0) msg = "Neuer Monat, neue Chancen. Auf zum ersten Abschluss!";
    else if (pct >= 100) msg = "🎉 Monatsziel geknackt! Überragend.";
    else if (pct >= 66) msg = "Fast am Ziel — noch " + B.euro(s.goal - s.wonMonthV) + ".";
    else if (pct >= 33) msg = "Guter Lauf. Dranbleiben!";
    else msg = "Starker Start. Weiter so!";

    var bar = $("success-bar"); bar.style.display = "block";
    bar.innerHTML =
      '<div class="success-top">' +
        stat(B.euro(s.wonMonthV), "Neue Kunden (Umsatz, Monat)") + sep() +
        stat(s.wonMonthN, "Neue Kunden (Monat)") + sep() +
        stat(s.rate == null ? "–" : s.rate + " %", "Abschlussquote") + sep() +
        stat(s.biggest ? B.euro(s.biggest) : "–", "Größter Abschluss") +
        '<span class="success-msg">' + msg + '</span>' +
      '</div>' +
      '<div class="goal-wrap"><div class="goal-head">' +
        '<span>Monatsziel &nbsp;<span class="goal-edit" id="goal-edit">bearbeiten</span></span>' +
        '<span><b>' + B.euro(s.wonMonthV) + '</b> / ' + B.euro(s.goal) + ' &nbsp;(' + pct + ' %)</span>' +
      '</div><div class="goal-track"><div class="goal-fill' + (pct >= 100 ? " done" : "") + '" style="width:' + pct + '%"></div></div></div>';

    var ed = $("goal-edit");
    if (ed && canWrite) ed.addEventListener("click", saveGoal);
    else if (ed) ed.style.display = "none";
  }
  function stat(n, l) { return '<div class="success-stat"><span class="n">' + n + '</span><span class="l">' + l + '</span></div>'; }
  function sep() { return '<div class="success-sep"></div>'; }

  async function saveGoal() {
    var v = window.prompt("Monatsziel in € (Netto-Umsatz neuer Kunden):", getGoal());
    if (v == null) return;
    var n = parseFloat(String(v).replace(/[^\d.,]/g, "").replace(",", "."));
    if (!(n > 0)) return;
    var prev = goalAmount; goalAmount = n; renderSuccess();
    if (!myUserId) return;
    var res = await sb.from("crm_goals").upsert(
      { user_id: myUserId, metric: GOAL_METRIC, target_amount: n }, { onConflict: "user_id,metric" });
    if (res.error) { goalAmount = prev; renderSuccess(); alert("Ziel konnte nicht gespeichert werden: " + res.error.message); }
  }

  function celebrate(value) {
    var t = document.createElement("div");
    t.className = "toast"; t.textContent = "🎉 Neuer Kunde!" + (value ? "  +" + B.euro(value) : "");
    document.body.appendChild(t);
    setTimeout(function () { t.style.transition = "opacity .4s"; t.style.opacity = "0"; setTimeout(function () { t.remove(); }, 400); }, 2200);
    var wrap = document.createElement("div"); wrap.className = "confetti";
    var colors = ["#4f46e5", "#7c3aed", "#16a34a", "#f59e0b", "#ec4899", "#22c55e"];
    for (var k = 0; k < 36; k++) {
      var c = document.createElement("i");
      c.style.left = Math.random() * 100 + "vw"; c.style.background = colors[k % colors.length];
      c.style.animationDuration = (1 + Math.random() * 1.2) + "s"; c.style.animationDelay = (Math.random() * .25) + "s";
      wrap.appendChild(c);
    }
    document.body.appendChild(wrap); setTimeout(function () { wrap.remove(); }, 2600);
  }

  // --- Neue Schule anlegen ------------------------------------
  function wireUi() {
    var oa = $("opp-add"); if (oa) oa.addEventListener("click", openModal);
    $("opp-cancel").addEventListener("click", closeModal);
    $("opp-savebtn").addEventListener("click", saveInst);
    $("opp-modal").addEventListener("click", function (e) { if (e.target === $("opp-modal")) closeModal(); });
    $("o-stage").innerHTML = OPEN.map(function (s) {
      return '<option value="' + s[0] + '"' + (s[0] === "lead" ? " selected" : "") + '>' + s[1] + '</option>';
    }).join("");
  }
  function openModal() { $("opp-msg").textContent = ""; $("opp-modal").style.display = "flex"; $("o-name").focus(); }
  function closeModal() { $("opp-modal").style.display = "none"; ["o-name","o-city","o-value"].forEach(function (id) { $(id).value = ""; }); }

  async function saveInst() {
    var name = ($("o-name").value || "").trim();
    if (!name) { msg("Bitte einen Namen eingeben.", "err"); return; }
    $("opp-savebtn").disabled = true; msg("Speichern …");
    try {
      var ins = await sb.from("institutions").insert({ name: name, city: val("o-city") }).select("id").single();
      if (ins.error) throw ins.error;
      var id = ins.data.id;
      var det = await sb.from("crm_institution_details").upsert({
        institution_id: id, lifecycle_stage: $("o-stage").value, deal_value: numOrNull("o-value")
      }, { onConflict: "institution_id" });
      if (det.error) throw det.error;
      INSTS[id] = { institution_id: id, name: name, city: val("o-city"),
        lifecycle_stage: $("o-stage").value, deal_value: numOrNull("o-value") };
      closeModal(); render();
    } catch (e) { msg("Fehler: " + ((e && e.message) || "unbekannt"), "err"); }
    finally { $("opp-savebtn").disabled = false; }
  }

  function val(id) { var v = ($(id).value || "").trim(); return v || null; }
  function numOrNull(id) { var x = $(id).value; return x === "" ? null : Number(x); }
  function msg(t, type) { var m = $("opp-msg"); m.textContent = t; m.className = "login-msg " + (type || ""); }

  // Für Tests
  window.TONI_BC_PIPE = {
    seed: function (insts, goal) { INSTS = {}; insts.forEach(function (i) { INSTS[i.institution_id] = i; }); canWrite = true; if (goal) goalAmount = goal; },
    render: render, move: moveCard, get: function (id) { return INSTS[id]; }
  };

  B.mountAuth({ onReady: load });
})();
