/* ============================================================
   Toni Business Center — Dashboard-Logik
   Liest ausschliesslich aus den crm_-Views. Kein Schreibzugriff.
   Cache-Busting: bei jeder Aenderung ?v= in business.html erhoehen.
   ============================================================ */
(function () {
  "use strict";

  // --- Supabase-Client ----------------------------------------
  // window.SUPABASE_URL / window.SUPABASE_ANON_KEY werden von /api/config
  // gesetzt. Fallback auf die Dev-Werte (wie in kosten.html), damit die
  // Seite auch ohne /api/config funktioniert. Nur der Anon-Key, nie
  // service_role.
  var SUPABASE_URL = (window.SUPABASE_URL && window.SUPABASE_URL.trim())
    || "https://rmwowznwjsyaypauszyl.supabase.co";
  var SUPABASE_ANON = (window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY.trim())
    || "sb_publishable_TwtNbRE9GQaAjLLH8k7_4g_ujJefMzo";

  function makeClient() {
    if (!SUPABASE_URL || !SUPABASE_ANON || !window.supabase) return null;
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  }

  var sb = makeClient();

  // --- kleine Helfer ------------------------------------------
  var $ = function (id) { return document.getElementById(id); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function euro(n) {
    if (n == null) return "–";
    return new Intl.NumberFormat("de-DE", {
      style: "currency", currency: "EUR", maximumFractionDigits: 0
    }).format(n);
  }
  function num(n) { return new Intl.NumberFormat("de-DE").format(n || 0); }
  function hhmm(ts) {
    if (!ts) return "";
    var d = new Date(ts);
    return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  }
  function ddmm(ts) {
    if (!ts) return "–";
    return new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  // Wie die einzelnen Kacheln formatiert und beschriftet werden.
  var KPI = {
    active_institutions:  { label: "Aktive Schulen",  icon: "🏫", color: "#7c3aed", fmt: num,  betterUp: true },
    mrr:                  { label: "MRR",             icon: "€",  color: "#16a34a", fmt: euro, betterUp: true },
    open_opportunities:   { label: "Verkaufschancen", icon: "🎯", color: "#ea580c", fmt: num,  betterUp: true },
    new_leads:            { label: "Neue Leads",      icon: "👥", color: "#2563eb", fmt: num,  betterUp: true },
    lead_to_customer_rate:{ label: "Lead → Kunde",    icon: "📈", color: "#db2777", fmt: pct,  betterUp: true },
    at_risk_customers:    { label: "Risiko-Kunden",   icon: "⚠️", color: "#dc2626", fmt: num,  betterUp: false }
  };
  // Reihenfolge der sechs Kacheln oben
  var KPI_ORDER = ["active_institutions", "mrr", "open_opportunities",
                   "new_leads", "lead_to_customer_rate", "at_risk_customers"];

  function pct(n) { return n == null ? "–" : num(n) + " %"; }

  // Farben und Reihenfolge des Trichters (Mockup)
  var STAGES = [
    ["new",            "Neue Leads",  "#60a5fa"],
    ["qualified",      "Qualifiziert","#818cf8"],
    ["contacted",      "Kontakt",     "#a78bfa"],
    ["demo_scheduled", "Demo geplant","#fbbf24"],
    ["pilot",          "Pilotphase",  "#fb923c"],
    ["offer_sent",     "Angebot",     "#f472b6"],
    ["negotiation",    "Verhandlung", "#f87171"]
  ];

  // --- Login-Gate ---------------------------------------------
  function loginMsg(text, type) {
    var m = $("login-msg");
    if (m) { m.textContent = text || ""; m.className = "login-msg " + (type || ""); }
  }
  function showGate() {
    $("bc-app").style.display = "none";
    $("bc-gate").style.display = "flex";
  }

  // Prueft die CRM-Rolle einer bestehenden Session und zeigt bei Erfolg
  // das Dashboard. Gibt die Rolle zurueck oder null.
  async function enterIfMember() {
    // crm_my_role() ist SECURITY DEFINER -> verraet die CRM-Rolle, ohne
    // dass der User crm_members lesen koennen muss.
    var roleRes = await sb.rpc("crm_my_role");
    var role = roleRes && roleRes.data ? roleRes.data : null;
    if (!role) return null;

    $("bc-gate").style.display = "none";
    $("bc-app").style.display = "block";
    $("bc-role").textContent = { admin: "Administrator", sales: "Vertrieb",
      customer_success: "Customer Success", viewer: "Nur Lesen" }[role] || role;
    load();
    return role;
  }

  async function doLogin() {
    var email = ($("login-email").value || "").trim();
    var pass = $("login-pass").value || "";
    var btn = $("login-btn");
    if (!email || !pass) { loginMsg("Bitte E-Mail und Passwort eingeben.", "err"); return; }

    btn.disabled = true; loginMsg("Anmeldung läuft …");
    try {
      var res = await sb.auth.signInWithPassword({ email: email, password: pass });
      if (res.error) throw res.error;

      var role = await enterIfMember();
      if (!role) {
        // Anmeldung ok, aber nicht im CRM freigeschaltet -> wieder abmelden
        await sb.auth.signOut();
        loginMsg("Dieser Account ist nicht für das Business Center freigeschaltet.", "err");
      }
    } catch (e) {
      var msg = (e && e.message) || "Anmeldung fehlgeschlagen.";
      loginMsg(/invalid login/i.test(msg)
        ? "E-Mail oder Passwort falsch." : "Anmeldung fehlgeschlagen: " + msg, "err");
    } finally {
      btn.disabled = false;
    }
  }

  async function doLogout() {
    try { await sb.auth.signOut(); } catch (e) {}
    location.reload();
  }

  async function boot() {
    if (!sb) { loginMsg("Supabase ist nicht konfiguriert.", "err"); showGate(); return; }

    // Login-Handler zuerst registrieren, damit der Button immer reagiert
    $("login-btn").addEventListener("click", doLogin);
    $("login-pass").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
    $("login-email").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
    var lo = $("bc-logout"); if (lo) lo.addEventListener("click", doLogout);

    // Bestehende Session? Dann Login ueberspringen.
    try {
      var s = await sb.auth.getSession();
      if (s && s.data && s.data.session) {
        var role = await enterIfMember();
        if (role) return;
      }
    } catch (e) {}
    showGate();
  }

  // --- Laden + Rendern ----------------------------------------
  async function load() {
    var today = new Date().toISOString().slice(0, 10);

    var results = await Promise.all([
      sb.from("crm_dashboard_kpis").select("*"),
      sb.from("v_crm_pipeline_funnel").select("*"),
      sb.from("crm_activities").select("*")
        .eq("status", "open")
        .order("scheduled_at", { ascending: true }).limit(12),
      sb.from("v_crm_open_offers").select("*")
        .order("days_until_expiry", { ascending: true }).limit(8),
      sb.from("v_crm_active_trials").select("*")
        .order("days_remaining", { ascending: true }),
      sb.from("v_crm_upcoming_renewals").select("*")
        .order("days_until_renewal", { ascending: true })
    ]);

    renderKpis(pick(results[0]));
    renderFunnel(pick(results[1]));
    renderActivities(pick(results[2]));
    renderOffers(pick(results[3]));
    renderTrials(pick(results[4]));
    renderRenewals(pick(results[5]));
    $("bc-foot").textContent = "Zuletzt aktualisiert: " +
      new Date().toLocaleString("de-DE") + " · Daten live aus Supabase.";
  }

  function pick(res) {
    if (res && res.error) console.warn("Ladefehler:", res.error.message);
    return (res && res.data) || [];
  }

  function renderKpis(rows) {
    var by = {};
    rows.forEach(function (r) { by[r.metric_key] = r; });
    var html = KPI_ORDER.map(function (key) {
      var meta = KPI[key]; if (!meta) return "";
      var row = by[key] || {};
      var val = meta.fmt(row.current_value);
      var delta = "";
      if (row.delta_percent != null) {
        var up = Number(row.delta_percent) >= 0;
        var good = meta.betterUp ? up : !up;
        var arrow = up ? "↑" : "↓";
        delta = '<div class="delta ' + (good ? "up" : "down") + '">' +
          arrow + " " + Math.abs(row.delta_percent) + " % vs. Vormonat</div>";
      } else {
        delta = '<div class="delta flat">– vs. Vormonat</div>';
      }
      return '<div class="kpi">' +
        '<div class="ico" style="background:' + hexA(meta.color, .12) + ';color:' + meta.color + '">' + meta.icon + '</div>' +
        '<div class="val">' + val + '</div>' +
        '<div class="lbl">' + meta.label + '</div>' + delta + '</div>';
    }).join("");
    $("kpi-row").innerHTML = html;
  }

  function renderFunnel(rows) {
    var by = {};
    rows.forEach(function (r) { by[r.stage] = r; });
    var max = 1;
    STAGES.forEach(function (s) { var r = by[s[0]]; if (r) max = Math.max(max, r.opportunity_count); });
    $("funnel").innerHTML = STAGES.map(function (s) {
      var r = by[s[0]] || { opportunity_count: 0, stage_value: 0 };
      var w = 30 + 70 * (r.opportunity_count / max);
      return '<div class="stage">' +
        '<div class="bar" style="width:' + w + '%;background:' + s[2] + '">' +
          esc(s[1]) + ' · ' + r.opportunity_count + '</div>' +
        '<div class="meta">' + (r.stage_value ? euro(r.stage_value) : "") + '</div>' +
      '</div>';
    }).join("");
  }

  function renderActivities(rows) {
    $("act-count").textContent = rows.length;
    if (!rows.length) { $("activities").innerHTML = empty("Keine offenen Aufgaben."); return; }
    $("activities").innerHTML = rows.map(function (a) {
      var when = hhmm(a.scheduled_at || a.due_at);
      return '<div class="row">' +
        '<div class="time">' + (when || "—") + '</div>' +
        '<div class="main"><div class="t">' + esc(a.subject) + '</div>' +
          '<div class="s">' + esc(a.description || "") + '</div></div>' +
        (a.priority === "high" ? '<span class="pill high">Priorität</span>' : "") +
      '</div>';
    }).join("");
  }

  function renderOffers(rows) {
    $("offer-count").textContent = rows.length;
    if (!rows.length) { $("offers").innerHTML = empty("Keine offenen Angebote."); return; }
    $("offers").innerHTML = rows.map(function (o) {
      return '<div class="row">' +
        '<div class="main"><div class="t">' + esc(o.institution_name) + '</div>' +
          '<div class="s">' + esc(o.offer_number) + ' · gültig bis ' + ddmm(o.valid_until) + '</div></div>' +
        '<div class="amt">' + euro(o.gross_amount) + '</div>' +
      '</div>';
    }).join("");
  }

  function renderTrials(rows) {
    $("trial-count").textContent = rows.length;
    if (!rows.length) { $("trials").innerHTML = empty("Keine aktiven Testphasen."); return; }
    $("trials").innerHTML = rows.map(function (t) {
      var total = t.days_total || 14;
      var el = Math.max(0, Math.min(total, t.days_elapsed || 0));
      var w = Math.round(100 * el / total);
      return '<div class="trial">' +
        '<div class="top"><b>' + esc(t.institution_name) + '</b>' +
          '<span class="s" style="color:var(--muted)">' + el + ' / ' + total + ' Tage</span></div>' +
        '<div class="track"><div class="fill" style="width:' + w + '%"></div></div>' +
      '</div>';
    }).join("");
  }

  function renderRenewals(rows) {
    $("renewal-count").textContent = rows.length;
    if (!rows.length) { $("renewals").innerHTML = empty("Keine Renewals in den nächsten 90 Tagen."); return; }
    $("renewals").innerHTML = rows.map(function (r) {
      var risk = r.risk_level || "niedrig";
      var label = { hoch: "Risiko: Hoch", mittel: "Nachfassen", niedrig: "Verlängerung wahrscheinlich" }[risk];
      return '<div class="row">' +
        '<div class="main"><div class="t">' + esc(r.institution_name) + '</div>' +
          '<div class="s">Vertragsende: ' + ddmm(r.end_date || r.renewal_date) +
            ' · in ' + r.days_until_renewal + ' Tagen</div></div>' +
        '<span class="pill ' + risk + '">' + label + '</span>' +
      '</div>';
    }).join("");
  }

  function empty(msg) { return '<div class="muted-empty">' + esc(msg) + '</div>'; }

  // Hex -> rgba mit Alpha (fuer die Icon-Hintergruende)
  function hexA(hex, a) {
    var h = hex.replace("#", "");
    var r = parseInt(h.substring(0, 2), 16),
        g = parseInt(h.substring(2, 4), 16),
        b = parseInt(h.substring(4, 6), 16);
    return "rgba(" + r + "," + g + "," + b + "," + a + ")";
  }

  // Fuer die Tests: Renderer ohne echtes Supabase ansprechbar machen
  window.TONI_BC = {
    renderKpis: renderKpis, renderFunnel: renderFunnel,
    renderActivities: renderActivities, renderOffers: renderOffers,
    renderTrials: renderTrials, renderRenewals: renderRenewals, boot: boot
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
