/* ============================================================
   Toni Business Center — Institutionen auf der Karte
   Leaflet-Karte, Marker wahlweise nach Institutionsstatus ODER
   nach der am weitesten fortgeschrittenen offenen Verkaufschance
   eingefärbt (Umschalter). Fehlende Koordinaten werden einmalig
   per PLZ/Ort geocodiert (Nominatim) und gespeichert.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;
  var map = null, layer = null, ROLE = null;
  var LIST = [];            // alle Schulen (mit lat/lng/status/topStage)
  var mode = "status";      // 'status' | 'stage'

  // Legende (Farben kommen aus der gemeinsamen Quelle B.statusColor)
  var STATUS = [
    ["customer",        "Aktive Schule"],
    ["test_customer",   "Testphase"],
    ["prospect",        "Interessent"],
    ["partner",         "Partner"],
    ["former_customer", "Ehemaliger Kunde"]
  ];
  function statusColor(s) { return B.statusColor(s); }
  function statusLabel(s) { return B.STATUS_LABEL[s] || s; }

  // Rang der offenen Pipeline-Stufen: höher = weiter fortgeschritten
  var STAGE_RANK = { new: 1, qualified: 2, contacted: 3, demo_scheduled: 4, pilot: 5, offer_sent: 6, negotiation: 7 };
  var STAGE_LEGEND = B.STAGES.filter(function (s) { return STAGE_RANK[s[0]]; });
  var NO_DEAL = "#d1d5db";  // Schule ohne offene Chance

  async function load(role) {
    ROLE = role;
    $("bc-nav").innerHTML = B.nav("business_map.html");
    wireModeToggle();
    renderLegend();

    initMap();

    var res = await Promise.all([
      sb.from("institutions").select("id,name,city,postal_code"),
      sb.from("crm_institution_details").select("institution_id,latitude,longitude"),
      sb.from("v_crm_institution_status").select("institution_id,status"),
      sb.from("crm_opportunities").select("institution_id,stage")
    ]);
    var insts = data(res[0]),
        det = idx(data(res[1]), "institution_id"),
        st = idx(data(res[2]), "institution_id");

    // Je Schule die weiteste OFFENE Stufe bestimmen (won/lost zählen nicht)
    var topStage = {};
    data(res[3]).forEach(function (o) {
      var r = STAGE_RANK[o.stage]; if (!r) return;
      if (!topStage[o.institution_id] || r > STAGE_RANK[topStage[o.institution_id]]) topStage[o.institution_id] = o.stage;
    });

    LIST = insts.map(function (i) {
      var d = det[i.id] || {};
      return { id: i.id, name: i.name, city: i.city, postal_code: i.postal_code,
        lat: d.latitude, lng: d.longitude,
        status: (st[i.id] || {}).status || "prospect",
        topStage: topStage[i.id] || null };
    });

    drawMarkers(pointsFrom(LIST));

    if (B.canWriteCustomers(role)) {
      var updated = await applyGeocode(LIST, geocode, saveCoords, setStatus);
      if (updated > 0) drawMarkers(pointsFrom(LIST));
    }
    setStatus("");
  }

  function data(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }
  function idx(arr, key) { var m = {}; arr.forEach(function (r) { m[r[key]] = r; }); return m; }
  function setStatus(t) { var e = $("map-status"); if (!e) return; e.style.display = t ? "block" : "none"; e.textContent = t; }

  // --- Modus + Legende ----------------------------------------
  function wireModeToggle() {
    var box = $("map-mode"); if (!box) return;
    Array.prototype.forEach.call(box.querySelectorAll(".seg-btn"), function (btn) {
      btn.addEventListener("click", function () {
        mode = btn.getAttribute("data-mode");
        Array.prototype.forEach.call(box.querySelectorAll(".seg-btn"), function (b) { b.classList.toggle("on", b === btn); });
        renderLegend();
        drawMarkers(pointsFrom(LIST));
      });
    });
  }

  function renderLegend() {
    var items = (mode === "stage")
      ? STAGE_LEGEND.map(function (s) { return [s[2], s[1]]; }).concat([[NO_DEAL, "Keine offene Chance"]])
      : STATUS.map(function (s) { return [B.statusColor(s[0]), s[1]]; });
    $("map-legend").innerHTML = items.map(function (it) {
      return '<span class="item"><span class="dot" style="background:' + it[0] + '"></span>' + B.esc(it[1]) + '</span>';
    }).join("");
  }

  // Farbe eines Punktes je nach Modus
  function colorFor(i) {
    if (mode === "stage") return i.topStage ? B.stageColor(i.topStage) : NO_DEAL;
    return statusColor(i.status);
  }
  function labelFor(i) {
    if (mode === "stage") return i.topStage ? B.stageLabel(i.topStage) : "Keine offene Chance";
    return statusLabel(i.status);
  }

  // --- Kartenmarker -------------------------------------------
  function initMap() {
    if (typeof L === "undefined") return;   // Test-Umgebung ohne Leaflet
    map = L.map("map", { scrollWheelZoom: true }).setView([51.2, 10.2], 6);  // Mitte Deutschland
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "© OpenStreetMap"
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }

  // Nur Institutionen mit Koordinaten werden zu Markern. Farbe + Label
  // hängen vom aktuellen Modus ab.
  function pointsFrom(list) {
    return list.filter(function (i) { return i.lat != null && i.lng != null; })
      .map(function (i) {
        return { id: i.id, name: i.name, city: i.city,
          lat: Number(i.lat), lng: Number(i.lng),
          color: colorFor(i), label: labelFor(i),
          faded: (mode === "stage" && !i.topStage) };
      });
  }

  function drawMarkers(points) {
    $("map-sub").textContent = points.length + " von den Schulen verortet · "
      + (mode === "stage" ? "nach Pipeline-Stufe" : "nach Status") + " eingefärbt";
    if (!map || !layer) return;
    layer.clearLayers();
    var bounds = [];
    points.forEach(function (p) {
      var m = L.circleMarker([p.lat, p.lng], {
        radius: p.faded ? 6 : 8, color: "#fff", weight: 2,
        fillColor: p.color, fillOpacity: p.faded ? .5 : .9
      });
      m.bindPopup('<b>' + B.esc(p.name) + '</b><br>' + B.esc(p.label) +
        (p.city ? ' · ' + B.esc(p.city) : "") +
        '<br><a href="business_institution.html?id=' + p.id + '">Schule öffnen →</a>');
      m.addTo(layer);
      bounds.push([p.lat, p.lng]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }

  // --- Geocoding ----------------------------------------------
  // Nominatim (OpenStreetMap): kostenlos, CORS, kein Key, korrekte
  // Koordinaten. (Zippopotam liefert für deutsche PLZ fehlerhafte
  // Werte und ist daher ungeeignet.) PLZ + Ort erhöhen die Trefferquote.
  // Nominatim-Policy: max. 1 Anfrage/Sekunde — siehe Drosselung unten.
  var geoCache = {};
  async function geocode(inst) {
    var plz = String(inst.postal_code || "").trim();
    var city = String(inst.city || "").trim();
    if (!plz && !city) return null;
    var key = plz + "|" + city;
    if (geoCache[key]) return geoCache[key];

    var params = "format=json&limit=1&countrycodes=de";
    if (plz) params += "&postalcode=" + encodeURIComponent(plz);
    if (city) params += "&city=" + encodeURIComponent(city);
    try {
      var r = await fetch("https://nominatim.openstreetmap.org/search?" + params, {
        headers: { "Accept": "application/json" }
      });
      if (!r.ok) return null;
      var j = await r.json();
      var p = j && j[0];
      if (!p) return null;
      var res = { lat: parseFloat(p.lat), lng: parseFloat(p.lon) };
      if (isNaN(res.lat) || isNaN(res.lng)) return null;
      geoCache[key] = res;
      return res;
    } catch (e) { return null; }
  }

  async function saveCoords(id, lat, lng) {
    var res = await sb.from("crm_institution_details")
      .upsert({ institution_id: id, latitude: lat, longitude: lng }, { onConflict: "institution_id" });
    if (res.error) console.warn("Koordinaten speichern:", res.error.message);
  }

  // Geht alle Institutionen ohne Koordinaten durch, geocodiert sie,
  // schreibt sie in die Liste (in-place) und speichert sie. Gibt die
  // Anzahl neu verorteter Schulen zurück. geocodeFn/saveFn injizierbar
  // (für Tests). geocodeFn bekommt das ganze Item (PLZ + Ort).
  async function applyGeocode(list, geocodeFn, saveFn, onProgress) {
    var todo = list.filter(function (i) { return (i.lat == null || i.lng == null) && (i.postal_code || i.city); });
    var done = 0;
    for (var k = 0; k < todo.length; k++) {
      var it = todo[k];
      if (onProgress) onProgress("Verorte Schulen … " + (k + 1) + "/" + todo.length);
      var geo = await geocodeFn(it);
      if (geo) {
        it.lat = geo.lat; it.lng = geo.lng; done++;
        if (saveFn) await saveFn(it.id, geo.lat, geo.lng);
      }
      await sleep(1100);   // Nominatim: höchstens 1 Anfrage/Sekunde
    }
    return done;
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  // Für Tests
  window.TONI_BC_MAP = {
    statusColor: statusColor, pointsFrom: pointsFrom, applyGeocode: applyGeocode,
    setMode: function (m) { mode = m; }, colorFor: colorFor
  };

  B.mountAuth({ onReady: load });
})();
