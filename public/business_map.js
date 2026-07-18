/* ============================================================
   Toni Business Center — Institutionen auf der Karte
   Leaflet-Karte, Marker nach abgeleitetem Status eingefärbt.
   Fehlende Koordinaten werden einmalig per PLZ geocodiert
   (Zippopotam) und in crm_institution_details gespeichert.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;
  var map = null, layer = null, ROLE = null;

  // Status -> Farbe + Beschriftung (Legende wie im Mockup)
  var STATUS = [
    ["customer",        "Aktive Schule",   "#22c55e"],
    ["test_customer",   "Testphase",       "#3b82f6"],
    ["prospect",        "Interessent",     "#f59e0b"],
    ["partner",         "Partner",         "#8b5cf6"],
    ["former_customer", "Ehemaliger Kunde", "#9ca3af"]
  ];
  function statusColor(s) { for (var i = 0; i < STATUS.length; i++) if (STATUS[i][0] === s) return STATUS[i][2]; return "#9ca3af"; }
  function statusLabel(s) { return B.STATUS_LABEL[s] || s; }

  async function load(role) {
    ROLE = role;
    $("bc-nav").innerHTML = B.nav("business_map.html");
    $("map-legend").innerHTML = STATUS.map(function (s) {
      return '<span class="item"><span class="dot" style="background:' + s[2] + '"></span>' + B.esc(s[1]) + '</span>';
    }).join("");

    initMap();

    var res = await Promise.all([
      sb.from("institutions").select("id,name,city,postal_code"),
      sb.from("crm_institution_details").select("institution_id,latitude,longitude"),
      sb.from("v_crm_institution_status").select("institution_id,status")
    ]);
    var insts = data(res[0]),
        det = idx(data(res[1]), "institution_id"),
        st = idx(data(res[2]), "institution_id");

    var list = insts.map(function (i) {
      var d = det[i.id] || {};
      return { id: i.id, name: i.name, city: i.city, postal_code: i.postal_code,
        lat: d.latitude, lng: d.longitude, status: (st[i.id] || {}).status || "prospect" };
    });

    // Erst vorhandene Punkte zeichnen …
    drawMarkers(pointsFrom(list));

    // … dann fehlende Koordinaten im Hintergrund geocodieren und speichern.
    if (B.canWriteCustomers(role)) {
      var updated = await applyGeocode(list, geocode, saveCoords, setStatus);
      if (updated > 0) drawMarkers(pointsFrom(list));
    }
    setStatus("");
  }

  function data(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }
  function idx(arr, key) { var m = {}; arr.forEach(function (r) { m[r[key]] = r; }); return m; }
  function setStatus(t) { var e = $("map-status"); if (!e) return; e.style.display = t ? "block" : "none"; e.textContent = t; }

  // --- Kartenmarker -------------------------------------------
  function initMap() {
    if (typeof L === "undefined") return;   // Test-Umgebung ohne Leaflet
    map = L.map("map", { scrollWheelZoom: true }).setView([51.2, 10.2], 6);  // Mitte Deutschland
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 18, attribution: "© OpenStreetMap"
    }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }

  // Nur Institutionen mit Koordinaten werden zu Markern.
  function pointsFrom(list) {
    return list.filter(function (i) { return i.lat != null && i.lng != null; })
      .map(function (i) {
        return { id: i.id, name: i.name, city: i.city, status: i.status,
          lat: Number(i.lat), lng: Number(i.lng), color: statusColor(i.status) };
      });
  }

  function drawMarkers(points) {
    $("map-sub").textContent = points.length + " von den Schulen verortet · nach Status eingefärbt";
    if (!map || !layer) return;
    layer.clearLayers();
    var bounds = [];
    points.forEach(function (p) {
      var m = L.circleMarker([p.lat, p.lng], {
        radius: 8, color: "#fff", weight: 2, fillColor: p.color, fillOpacity: .9
      });
      m.bindPopup('<b>' + B.esc(p.name) + '</b><br>' + B.esc(statusLabel(p.status)) +
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
  window.TONI_BC_MAP = { statusColor: statusColor, pointsFrom: pointsFrom, applyGeocode: applyGeocode };

  B.mountAuth({ onReady: load });
})();
