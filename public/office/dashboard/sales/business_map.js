/* ============================================================
   Toni Business Center — Institutionen auf der Karte
   Marker nach einheitlicher Lebenszyklus-Stufe eingefärbt.
   Fehlende Koordinaten werden einmalig per PLZ/Ort geocodiert
   (Nominatim) und in crm_institution_details gespeichert.
   ============================================================ */
(function () {
  "use strict";
  var B = window.BC, sb = B.sb, $ = B.$;
  var map = null, layer = null, ROLE = null, LIST = [];

  async function load(role) {
    ROLE = role;
    $("bc-nav").innerHTML = B.nav("business_map.html");
    renderLegend();
    initMap();

    var res = await sb.from("v_crm_institution_stage").select("*");
    LIST = data(res).map(function (i) {
      return { id: i.institution_id, name: i.name, city: i.city, postal_code: i.postal_code,
        lat: i.latitude, lng: i.longitude, stage: i.lifecycle_stage || "lead" };
    });

    drawMarkers(pointsFrom(LIST));

    if (B.canWriteCustomers(role)) {
      var updated = await applyGeocode(LIST, geocode, saveCoords, setStatus);
      if (updated > 0) drawMarkers(pointsFrom(LIST));
    }
    setStatus("");
  }

  function data(res) { if (res && res.error) console.warn(res.error.message); return (res && res.data) || []; }
  function setStatus(t) { var e = $("map-status"); if (!e) return; e.style.display = t ? "block" : "none"; e.textContent = t; }

  function renderLegend() {
    $("map-legend").innerHTML = B.LIFECYCLE.map(function (s) {
      return '<span class="item"><span class="dot" style="background:' + s[2] + '"></span>' + B.esc(s[1]) + '</span>';
    }).join("");
  }

  function initMap() {
    if (typeof L === "undefined") return;
    map = L.map("map", { scrollWheelZoom: true }).setView([51.2, 10.2], 6);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
    layer = L.layerGroup().addTo(map);
  }

  function pointsFrom(list) {
    return list.filter(function (i) { return i.lat != null && i.lng != null; })
      .map(function (i) {
        return { id: i.id, name: i.name, city: i.city, stage: i.stage,
          lat: Number(i.lat), lng: Number(i.lng), color: B.lcColor(i.stage), label: B.lcLabel(i.stage) };
      });
  }

  function drawMarkers(points) {
    $("map-sub").textContent = points.length + " von den Schulen verortet · nach Stufe eingefärbt";
    if (!map || !layer) return;
    layer.clearLayers();
    var bounds = [];
    points.forEach(function (p) {
      L.circleMarker([p.lat, p.lng], { radius: 8, color: "#fff", weight: 2, fillColor: p.color, fillOpacity: .9 })
        .bindPopup('<b>' + B.esc(p.name) + '</b><br>' + B.esc(p.label) + (p.city ? ' · ' + B.esc(p.city) : "") +
          '<br><a href="business_institution.html?id=' + p.id + '">Schule öffnen →</a>')
        .addTo(layer);
      bounds.push([p.lat, p.lng]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 11 });
  }

  // --- Geocoding (Nominatim) ----------------------------------
  var geoCache = {};
  async function geocode(inst) {
    var plz = String(inst.postal_code || "").trim(), city = String(inst.city || "").trim();
    if (!plz && !city) return null;
    var key = plz + "|" + city;
    if (geoCache[key]) return geoCache[key];
    var params = "format=json&limit=1&countrycodes=de";
    if (plz) params += "&postalcode=" + encodeURIComponent(plz);
    if (city) params += "&city=" + encodeURIComponent(city);
    try {
      var r = await fetch("https://nominatim.openstreetmap.org/search?" + params, { headers: { "Accept": "application/json" } });
      if (!r.ok) return null;
      var j = await r.json(); var p = j && j[0];
      if (!p) return null;
      var res = { lat: parseFloat(p.lat), lng: parseFloat(p.lon) };
      if (isNaN(res.lat) || isNaN(res.lng)) return null;
      geoCache[key] = res; return res;
    } catch (e) { return null; }
  }

  async function saveCoords(id, lat, lng) {
    var res = await sb.from("crm_institution_details")
      .upsert({ institution_id: id, latitude: lat, longitude: lng }, { onConflict: "institution_id" });
    if (res.error) console.warn("Koordinaten speichern:", res.error.message);
  }

  async function applyGeocode(list, geocodeFn, saveFn, onProgress) {
    var todo = list.filter(function (i) { return (i.lat == null || i.lng == null) && (i.postal_code || i.city); });
    var done = 0;
    for (var k = 0; k < todo.length; k++) {
      var it = todo[k];
      if (onProgress) onProgress("Verorte Schulen … " + (k + 1) + "/" + todo.length);
      var geo = await geocodeFn(it);
      if (geo) { it.lat = geo.lat; it.lng = geo.lng; done++; if (saveFn) await saveFn(it.id, geo.lat, geo.lng); }
      await sleep(1100);
    }
    return done;
  }
  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  window.TONI_BC_MAP = { pointsFrom: pointsFrom, applyGeocode: applyGeocode };

  B.mountAuth({ onReady: load });
})();
