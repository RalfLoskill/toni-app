/* ============================================================
   Toni Business Center — Übersicht (Dashboard)
   Nutzt business_common.js (window.BC). Nur lesend.
   Cache-Busting: bei Änderung ?v= in business.html erhöhen.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;

  var KPI = {
    active_institutions:   { label: "Aktive Schulen",  icon: "🏫", color: "#7c3aed", fmt: B.num,  betterUp: true },
    mrr:                   { label: "MRR",             icon: "€",  color: "#16a34a", fmt: B.euro, betterUp: true },
    open_opportunities:    { label: "Verkaufschancen", icon: "🎯", color: "#ea580c", fmt: B.num,  betterUp: true },
    new_leads:             { label: "Neue Leads",      icon: "👥", color: "#2563eb", fmt: B.num,  betterUp: true },
    lead_to_customer_rate: { label: "Lead → Kunde",    icon: "📈", color: "#db2777", fmt: B.pct,  betterUp: true },
    at_risk_customers:     { label: "Risiko-Kunden",   icon: "⚠️", color: "#dc2626", fmt: B.num,  betterUp: false }
  };
  var KPI_ORDER = ["active_institutions", "mrr", "open_opportunities", "new_leads", "lead_to_customer_rate", "at_risk_customers"];

  // Trichter zeigt nur die offenen Stufen (ohne won/lost)
  var FUNNEL = B.STAGES.filter(function (s) { return s[0] !== "won" && s[0] !== "lost"; });

  async function load() {
    if ($("bc-nav")) $("bc-nav").innerHTML = B.nav("business.html");

    var r = await Promise.all([
      sb.from("crm_dashboard_kpis").select("*"),
      sb.from("v_crm_pipeline_funnel").select("*"),
      sb.from("crm_activities").select("*").eq("status", "open").order("scheduled_at", { ascending: true }).limit(12),
      sb.from("v_crm_open_offers").select("*").order("days_until_expiry", { ascending: true }).limit(8),
      sb.from("v_crm_active_trials").select("*").order("days_remaining", { ascending: true }),
      sb.from("v_crm_upcoming_renewals").select("*").order("days_until_renewal", { ascending: true })
    ]);
    renderKpis(pick(r[0])); renderFunnel(pick(r[1])); renderActivities(pick(r[2]));
    renderOffers(pick(r[3])); renderTrials(pick(r[4])); renderRenewals(pick(r[5]));
    $("bc-foot").textContent = "Zuletzt aktualisiert: " + new Date().toLocaleString("de-DE") + " · Daten live aus Supabase.";
  }

  function pick(res) { if (res && res.error) console.warn("Ladefehler:", res.error.message); return (res && res.data) || []; }

  function renderKpis(rows) {
    var by = {}; rows.forEach(function (r) { by[r.metric_key] = r; });
    $("kpi-row").innerHTML = KPI_ORDER.map(function (key) {
      var meta = KPI[key]; if (!meta) return "";
      var row = by[key] || {}, val = meta.fmt(row.current_value), delta;
      if (row.delta_percent != null) {
        var up = Number(row.delta_percent) >= 0, good = meta.betterUp ? up : !up;
        delta = '<div class="delta ' + (good ? "up" : "down") + '">' + (up ? "↑" : "↓") + " " + Math.abs(row.delta_percent) + " % vs. Vormonat</div>";
      } else { delta = '<div class="delta flat">– vs. Vormonat</div>'; }
      return '<div class="kpi"><div class="ico" style="background:' + B.hexA(meta.color, .12) + ';color:' + meta.color + '">' + meta.icon + '</div>' +
        '<div class="val">' + val + '</div><div class="lbl">' + meta.label + '</div>' + delta + '</div>';
    }).join("");
  }

  function renderFunnel(rows) {
    var by = {}; rows.forEach(function (r) { by[r.stage] = r; });
    var max = 1; FUNNEL.forEach(function (s) { var r = by[s[0]]; if (r) max = Math.max(max, r.opportunity_count); });
    $("funnel").innerHTML = FUNNEL.map(function (s) {
      var r = by[s[0]] || { opportunity_count: 0, stage_value: 0 }, w = 30 + 70 * (r.opportunity_count / max);
      return '<div class="stage"><div class="bar" style="width:' + w + '%;background:' + s[2] + '">' +
        B.esc(s[1]) + ' · ' + r.opportunity_count + '</div><div class="meta">' + (r.stage_value ? B.euro(r.stage_value) : "") + '</div></div>';
    }).join("");
  }

  function renderActivities(rows) {
    $("act-count").textContent = rows.length;
    if (!rows.length) { $("activities").innerHTML = B.empty("Keine offenen Aufgaben."); return; }
    $("activities").innerHTML = rows.map(function (a) {
      var when = B.hhmm(a.scheduled_at || a.due_at);
      return '<div class="row"><div class="time">' + (when || "—") + '</div>' +
        '<div class="main"><div class="t">' + B.esc(a.subject) + '</div><div class="s">' + B.esc(a.description || "") + '</div></div>' +
        (a.priority === "high" ? '<span class="pill high">Priorität</span>' : "") + '</div>';
    }).join("");
  }

  function renderOffers(rows) {
    $("offer-count").textContent = rows.length;
    if (!rows.length) { $("offers").innerHTML = B.empty("Keine offenen Angebote."); return; }
    $("offers").innerHTML = rows.map(function (o) {
      return '<div class="row"><div class="main"><div class="t">' + B.esc(o.institution_name) + '</div>' +
        '<div class="s">' + B.esc(o.offer_number) + ' · gültig bis ' + B.ddmm(o.valid_until) + '</div></div>' +
        '<div class="amt">' + B.euro(o.gross_amount) + '</div></div>';
    }).join("");
  }

  function renderTrials(rows) {
    $("trial-count").textContent = rows.length;
    if (!rows.length) { $("trials").innerHTML = B.empty("Keine aktiven Testphasen."); return; }
    $("trials").innerHTML = rows.map(function (t) {
      var total = t.days_total || 14, el = Math.max(0, Math.min(total, t.days_elapsed || 0)), w = Math.round(100 * el / total);
      return '<div class="trial"><div class="top"><b>' + B.esc(t.institution_name) + '</b>' +
        '<span class="s" style="color:var(--muted)">' + el + ' / ' + total + ' Tage</span></div>' +
        '<div class="track"><div class="fill" style="width:' + w + '%"></div></div></div>';
    }).join("");
  }

  function renderRenewals(rows) {
    $("renewal-count").textContent = rows.length;
    if (!rows.length) { $("renewals").innerHTML = B.empty("Keine Renewals in den nächsten 90 Tagen."); return; }
    $("renewals").innerHTML = rows.map(function (r) {
      var risk = r.risk_level || "niedrig";
      var label = { hoch: "Risiko: Hoch", mittel: "Nachfassen", niedrig: "Verlängerung wahrscheinlich" }[risk];
      return '<div class="row"><div class="main"><div class="t">' + B.esc(r.institution_name) + '</div>' +
        '<div class="s">Vertragsende: ' + B.ddmm(r.end_date || r.renewal_date) + ' · in ' + r.days_until_renewal + ' Tagen</div></div>' +
        '<span class="pill ' + risk + '">' + label + '</span></div>';
    }).join("");
  }

  // Für die Tests: Renderer ohne echtes Supabase erreichbar machen
  window.TONI_BC = { renderKpis: renderKpis, renderFunnel: renderFunnel, renderActivities: renderActivities,
    renderOffers: renderOffers, renderTrials: renderTrials, renderRenewals: renderRenewals };

  B.mountAuth({ onReady: load });
})();
