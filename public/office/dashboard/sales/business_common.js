/* ============================================================
   Toni Business Center — gemeinsame Basis für alle Seiten
   Client, Login-Gate, Format-Helfer, Navigation.
   Muss VOR der jeweiligen Seiten-JS geladen werden.
   ============================================================ */
window.BC = (function () {
  "use strict";

  // --- Config / Client ----------------------------------------
  // /api/config setzt window.SUPABASE_URL / _ANON_KEY. Fallback auf die
  // Dev-Werte (wie kosten.html). Nur der Anon-Key, nie service_role.
  var SUPABASE_URL = (window.SUPABASE_URL && window.SUPABASE_URL.trim())
    || "https://rmwowznwjsyaypauszyl.supabase.co";
  var SUPABASE_ANON = (window.SUPABASE_ANON_KEY && window.SUPABASE_ANON_KEY.trim())
    || "sb_publishable_TwtNbRE9GQaAjLLH8k7_4g_ujJefMzo";

  var sb = (SUPABASE_URL && SUPABASE_ANON && window.supabase)
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON) : null;

  // --- Helfer -------------------------------------------------
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function euro(n) {
    if (n == null) return "–";
    return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
  }
  function num(n) { return new Intl.NumberFormat("de-DE").format(n || 0); }
  function pct(n) { return n == null ? "–" : num(n) + " %"; }
  function hhmm(ts) { return ts ? new Date(ts).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }) : ""; }
  function ddmm(ts) { return ts ? new Date(ts).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "–"; }
  function empty(msg) { return '<div class="muted-empty">' + esc(msg) + '</div>'; }
  function hexA(hex, a) {
    var h = hex.replace("#", "");
    return "rgba(" + parseInt(h.substr(0, 2), 16) + "," + parseInt(h.substr(2, 2), 16) + "," + parseInt(h.substr(4, 2), 16) + "," + a + ")";
  }

  var ROLE_LABEL = { admin: "Administrator", sales: "Vertrieb", customer_success: "Customer Success", viewer: "Nur Lesen" };
  // Wer darf schreiben? (deckt sich mit den RLS-Policies)
  function canWriteSales(role) { return role === "admin" || role === "sales"; }
  function canWriteCustomers(role) { return role === "admin" || role === "sales" || role === "customer_success"; }

  // Status-Etiketten für abgeleiteten Institutionsstatus
  var STATUS_LABEL = {
    prospect: "Interessent", test_customer: "Testphase", customer: "Kunde",
    former_customer: "Ehemaliger Kunde", partner: "Partner"
  };
  // EINE Quelle für die Statusfarben (Karte + Mini-Karte auf der Übersicht)
  var STATUS_COLOR = {
    customer: "#22c55e", test_customer: "#3b82f6", prospect: "#f59e0b",
    partner: "#8b5cf6", former_customer: "#9ca3af"
  };
  function statusColor(s) { return STATUS_COLOR[s] || "#9ca3af"; }

  // Pipeline-Stufen: Schlüssel, Label, Farbe — an einer Stelle für alle Seiten
  var STAGES = [
    ["new", "Neue Leads", "#60a5fa"], ["qualified", "Qualifiziert", "#818cf8"],
    ["contacted", "Kontakt", "#a78bfa"], ["demo_scheduled", "Demo geplant", "#fbbf24"],
    ["pilot", "Pilotphase", "#fb923c"], ["offer_sent", "Angebot", "#f472b6"],
    ["negotiation", "Verhandlung", "#f87171"], ["won", "Gewonnen", "#22c55e"],
    ["lost", "Verloren", "#94a3b8"]
  ];
  function stageLabel(k) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i][0] === k) return STAGES[i][1]; return k; }
  function stageColor(k) { for (var i = 0; i < STAGES.length; i++) if (STAGES[i][0] === k) return STAGES[i][2]; return "#94a3b8"; }

  // Einheitliches Lebenszyklus-Modell: EINE Stufe pro Schule.
  // key, Label, Farbe, Gruppe (open|customer|churned)
  var LIFECYCLE = [
    ["lead",             "Lead",             "#94a3b8", "open"],
    ["qualified",        "Qualifiziert",     "#60a5fa", "open"],
    ["campaign",         "Kampagne",         "#818cf8", "open"],
    ["demo",             "Demo",             "#a78bfa", "open"],
    ["trial",            "Testphase",        "#22d3ee", "open"],
    ["offer",            "Angebot",          "#f472b6", "open"],
    ["negotiation",      "Verhandlung",      "#fb923c", "open"],
    ["customer",         "Aktiver Kunde",    "#22c55e", "customer"],
    ["churned_prospect", "Abgesprungen",     "#cbd5e1", "churned"],
    ["churned_customer", "Verlorener Kunde", "#9ca3af", "churned"]
  ];
  function lcLabel(k) { for (var i = 0; i < LIFECYCLE.length; i++) if (LIFECYCLE[i][0] === k) return LIFECYCLE[i][1]; return k; }
  function lcColor(k) { for (var i = 0; i < LIFECYCLE.length; i++) if (LIFECYCLE[i][0] === k) return LIFECYCLE[i][2]; return "#94a3b8"; }
  function lcGroup(k) { for (var i = 0; i < LIFECYCLE.length; i++) if (LIFECYCLE[i][0] === k) return LIFECYCLE[i][3]; return "open"; }
  function lcOpen() { return LIFECYCLE.filter(function (s) { return s[3] === "open"; }); }

  // --- Bundesländer + Länder ----------------------------------
  var BUNDESLAENDER = [
    "Baden-Württemberg", "Bayern", "Berlin", "Brandenburg", "Bremen", "Hamburg",
    "Hessen", "Mecklenburg-Vorpommern", "Niedersachsen", "Nordrhein-Westfalen",
    "Rheinland-Pfalz", "Saarland", "Sachsen", "Sachsen-Anhalt", "Schleswig-Holstein", "Thüringen"
  ];
  // Europäische Länder zuerst (alphabetisch), dann übrige Welt (alphabetisch)
  var COUNTRIES_EU = [
    "Albanien", "Andorra", "Belgien", "Bosnien und Herzegowina", "Bulgarien", "Dänemark",
    "Deutschland", "Estland", "Finnland", "Frankreich", "Griechenland", "Irland", "Island",
    "Italien", "Kosovo", "Kroatien", "Lettland", "Liechtenstein", "Litauen", "Luxemburg",
    "Malta", "Moldau", "Monaco", "Montenegro", "Niederlande", "Nordmazedonien", "Norwegen",
    "Österreich", "Polen", "Portugal", "Rumänien", "San Marino", "Schweden", "Schweiz",
    "Serbien", "Slowakei", "Slowenien", "Spanien", "Tschechien", "Ukraine", "Ungarn",
    "Vatikanstadt", "Vereinigtes Königreich", "Weißrussland", "Zypern"
  ];
  var COUNTRIES_OTHER = [
    "Afghanistan", "Ägypten", "Algerien", "Angola", "Antigua und Barbuda", "Äquatorialguinea",
    "Argentinien", "Armenien", "Aserbaidschan", "Äthiopien", "Australien", "Bahamas", "Bahrain",
    "Bangladesch", "Barbados", "Belize", "Benin", "Bhutan", "Bolivien", "Botswana", "Brasilien",
    "Brunei", "Burkina Faso", "Burundi", "Chile", "China", "Costa Rica", "Dominica",
    "Dominikanische Republik", "Dschibuti", "Ecuador", "El Salvador", "Elfenbeinküste", "Eritrea",
    "Eswatini", "Fidschi", "Gabun", "Gambia", "Georgien", "Ghana", "Grenada", "Guatemala",
    "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Honduras", "Indien", "Indonesien", "Irak",
    "Iran", "Israel", "Jamaika", "Japan", "Jemen", "Jordanien", "Kambodscha", "Kamerun", "Kanada",
    "Kap Verde", "Kasachstan", "Katar", "Kenia", "Kirgisistan", "Kiribati", "Kolumbien", "Komoren",
    "Kongo (Demokratische Republik)", "Kongo (Republik)", "Nordkorea", "Südkorea", "Kuba", "Kuwait",
    "Laos", "Lesotho", "Libanon", "Liberia", "Libyen", "Madagaskar", "Malawi", "Malaysia",
    "Malediven", "Mali", "Marokko", "Marshallinseln", "Mauretanien", "Mauritius", "Mexiko",
    "Mikronesien", "Mongolei", "Mosambik", "Myanmar", "Namibia", "Nauru", "Nepal", "Neuseeland",
    "Nicaragua", "Niger", "Nigeria", "Oman", "Osttimor", "Pakistan", "Palau", "Panama",
    "Papua-Neuguinea", "Paraguay", "Peru", "Philippinen", "Ruanda", "Salomonen", "Sambia", "Samoa",
    "São Tomé und Príncipe", "Saudi-Arabien", "Senegal", "Seychellen", "Sierra Leone", "Simbabwe",
    "Singapur", "Somalia", "Sri Lanka", "St. Kitts und Nevis", "St. Lucia",
    "St. Vincent und die Grenadinen", "Sudan", "Südsudan", "Suriname", "Syrien", "Tadschikistan",
    "Taiwan", "Tansania", "Thailand", "Togo", "Tonga", "Trinidad und Tobago", "Tschad", "Tunesien",
    "Türkei", "Turkmenistan", "Tuvalu", "Uganda", "Uruguay", "Usbekistan", "Vanuatu", "Venezuela",
    "Vereinigte Arabische Emirate", "Vereinigte Staaten", "Vietnam", "Zentralafrikanische Republik"
  ];
  function opt(v, sel) { return '<option' + (v === sel ? " selected" : "") + '>' + esc(v) + '</option>'; }
  function countryOptions(selected) {
    selected = selected || "Deutschland";
    return '<optgroup label="Europa">' + COUNTRIES_EU.map(function (c) { return opt(c, selected); }).join("") + '</optgroup>' +
           '<optgroup label="Übrige Länder">' + COUNTRIES_OTHER.map(function (c) { return opt(c, selected); }).join("") + '</optgroup>';
  }
  function stateOptions(selected) {
    return '<option value="">–</option>' + BUNDESLAENDER.map(function (s) { return opt(s, selected); }).join("");
  }

  // --- Navigation zwischen den Seiten -------------------------
  function nav(active) {
    var items = [["business.html", "Übersicht"], ["business_pipeline.html", "Pipeline"],
                 ["business_institutions.html", "Institutionen"], ["business_map.html", "Karte"]];
    return items.map(function (it) {
      var on = it[0] === active;
      return '<a href="' + it[0] + '" class="bc-nav-link' + (on ? " on" : "") + '">' + it[1] + '</a>';
    }).join("");
  }

  // --- Login-Gate ---------------------------------------------
  // Erwartet die Standard-Gate-DOM (siehe HTML). Ruft onReady(role) auf,
  // sobald ein freigeschalteter Nutzer angemeldet ist.
  function loginMsg(text, type) {
    var m = $("login-msg"); if (m) { m.textContent = text || ""; m.className = "login-msg " + (type || ""); }
  }

  async function currentRole() {
    var r = await sb.rpc("crm_my_role");
    return (r && r.data) ? r.data : null;
  }

  function mountAuth(opts) {
    opts = opts || {};
    var onReady = opts.onReady || function () {};

    async function enter() {
      var role = await currentRole();
      if (!role) return null;
      if ($("bc-gate")) $("bc-gate").style.display = "none";
      if ($("bc-app")) $("bc-app").style.display = "block";
      if ($("bc-role")) $("bc-role").textContent = ROLE_LABEL[role] || role;
      onReady(role);
      return role;
    }

    async function doLogin() {
      var email = ($("login-email").value || "").trim(), pass = $("login-pass").value || "", btn = $("login-btn");
      if (!email || !pass) { loginMsg("Bitte E-Mail und Passwort eingeben.", "err"); return; }
      btn.disabled = true; loginMsg("Anmeldung läuft …");
      try {
        var res = await sb.auth.signInWithPassword({ email: email, password: pass });
        if (res.error) throw res.error;
        var role = await enter();
        if (!role) { await sb.auth.signOut(); loginMsg("Dieser Account ist nicht für das Business Center freigeschaltet.", "err"); }
      } catch (e) {
        var msg = (e && e.message) || "Anmeldung fehlgeschlagen.";
        loginMsg(/invalid login/i.test(msg) ? "E-Mail oder Passwort falsch." : "Anmeldung fehlgeschlagen: " + msg, "err");
      } finally { btn.disabled = false; }
    }

    async function doLogout() { try { await sb.auth.signOut(); } catch (e) {} location.href = "business.html"; }

    async function boot() {
      if (!sb) { loginMsg("Supabase ist nicht konfiguriert.", "err"); return; }
      if ($("login-btn")) $("login-btn").addEventListener("click", doLogin);
      if ($("login-pass")) $("login-pass").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
      if ($("login-email")) $("login-email").addEventListener("keydown", function (e) { if (e.key === "Enter") doLogin(); });
      if ($("bc-logout")) $("bc-logout").addEventListener("click", doLogout);
      try {
        var s = await sb.auth.getSession();
        if (s && s.data && s.data.session) { if (await enter()) return; }
      } catch (e) {}
      if ($("bc-gate")) $("bc-gate").style.display = "flex";
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
    else boot();
  }

  // Kleiner Query-Parameter-Leser (für ?id= auf der Detailseite)
  function qp(name) { return new URLSearchParams(location.search).get(name); }

  return {
    sb: sb, $: $, esc: esc, euro: euro, num: num, pct: pct, hhmm: hhmm, ddmm: ddmm,
    empty: empty, hexA: hexA, nav: nav, mountAuth: mountAuth, loginMsg: loginMsg,
    currentRole: currentRole, qp: qp,
    ROLE_LABEL: ROLE_LABEL, STATUS_LABEL: STATUS_LABEL, STAGES: STAGES,
    stageLabel: stageLabel, stageColor: stageColor, statusColor: statusColor,
    LIFECYCLE: LIFECYCLE, lcLabel: lcLabel, lcColor: lcColor, lcGroup: lcGroup, lcOpen: lcOpen,
    BUNDESLAENDER: BUNDESLAENDER, countryOptions: countryOptions, stateOptions: stateOptions,
    canWriteSales: canWriteSales, canWriteCustomers: canWriteCustomers
  };
})();
