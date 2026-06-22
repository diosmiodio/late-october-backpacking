/* Late-October Backpacking — client interactivity.
   Filtering/sorting operate on the pre-rendered cards; the detail modal and
   map are built from the JSON embedded in #data. Degrades gracefully: with
   JS off, all cards and official links still work. */
(function () {
  "use strict";
  var dataEl = document.getElementById("data");
  if (!dataEl) return;
  var DATA = JSON.parse(dataEl.textContent);
  var DEST = DATA.destinations || [];
  var byId = {};
  DEST.forEach(function (d) { byId[d.id] = d; });

  var BOOK = {
    open_access: { label: "Open access", short: "Go on a whim", cls: "ba-open", color: "#2f7d4f" },
    easy_now: { label: "Easy now", short: "Reservable now", cls: "ba-easy", color: "#2f6f9f" },
    competitive: { label: "Competitive", short: "Apply early", cls: "ba-comp", color: "#c4861a" },
    unavailable: { label: "Ruled out", short: "Not viable", cls: "ba-out", color: "#6f6a64" }
  };
  var bookRank = { open_access: 0, easy_now: 1, competitive: 2, unavailable: 3 };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function nightsLabel(s) {
    s = String(s).trim();
    return s.replace(/-/g, "–") + (s === "1" ? " night" : " nights");
  }

  var ICON = {
    official: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a1.3 1.3 0 110 2.6A1.3 1.3 0 0112 6zm1.6 12h-3.2v-1.2h.8v-4h-.8v-1.2h2.4v5.2h.8z"/></svg>',
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>',
    weather: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a4 4 0 01-.5-7.97 5 5 0 019.6-1.2A3.5 3.5 0 0117.5 18H7z"/></svg>',
    permit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7zm6 1v8h2V8H9z"/></svg>',
    alltrails: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5.5a2 2 0 11-4 0 2 2 0 014 0zM7 21l3.2-6.4-1.7-1.7L6 16M11 11l3 3 .5 3.5L17 21l1.5-1L17 16l-2.5-5.5z"/></svg>'
  };
  function lb(href, icon, label, cls) {
    return href
      ? '<a class="link-btn ' + (cls || "") + '" href="' + esc(href) + '" target="_blank" rel="noopener noreferrer">' + (ICON[icon] || "") + "<span>" + esc(label) + "</span></a>"
      : "";
  }

  /* ---------------- Filtering & sorting ---------------- */
  var grid = document.getElementById("grid");
  var cards = grid ? Array.prototype.slice.call(grid.querySelectorAll(".card")) : [];
  var q = document.getElementById("q");
  var fBook = document.getElementById("f-book");
  var fRegion = document.getElementById("f-region");
  var fDiff = document.getElementById("f-diff");
  var sortSel = document.getElementById("sort");
  var countEl = document.getElementById("count");
  var emptyEl = document.getElementById("empty");

  function apply() {
    var term = (q.value || "").trim().toLowerCase();
    var b = fBook.value, r = fRegion.value, df = fDiff.value;
    var visible = 0;
    cards.forEach(function (card) {
      var ds = card.dataset;
      var ok =
        (!b || ds.bookability === b) &&
        (!r || ds.region === r) &&
        (!df || ds.difficulty === df) &&
        (!term || ds.search.indexOf(term) !== -1);
      card.classList.toggle("hidden", !ok);
      if (ok) visible++;
    });
    if (countEl) countEl.textContent = visible;
    if (emptyEl) emptyEl.hidden = visible !== 0;
    sortCards();
  }

  function sortCards() {
    var mode = sortSel.value;
    var sorted = cards.slice().sort(function (a, b) {
      if (mode === "name") return a.dataset.name.localeCompare(b.dataset.name);
      if (mode === "nights") return (+a.dataset.nights - +b.dataset.nights) || a.dataset.name.localeCompare(b.dataset.name);
      return (bookRank[a.dataset.bookability] - bookRank[b.dataset.bookability]) || a.dataset.name.localeCompare(b.dataset.name);
    });
    sorted.forEach(function (c) { grid.appendChild(c); });
  }

  function reset() {
    q.value = ""; fBook.value = ""; fRegion.value = ""; fDiff.value = ""; sortSel.value = "bookability";
    apply();
  }

  [q, fBook, fRegion, fDiff, sortSel].forEach(function (el) {
    if (!el) return;
    el.addEventListener("input", apply);
    el.addEventListener("change", apply);
  });
  var resetBtn = document.getElementById("reset");
  if (resetBtn) resetBtn.addEventListener("click", reset);
  var emptyReset = document.getElementById("empty-reset");
  if (emptyReset) emptyReset.addEventListener("click", reset);

  /* ---------------- Detail modal + deep-linking ---------------- */
  var dlg = document.getElementById("detail");

  function planBlock(d) {
    var p = d.plan_it; if (!p) return "";
    function cell(k, v, wide) {
      return v ? '<div class="plan-cell' + (wide ? " wide" : "") + '"><div class="k">' + esc(k) + '</div><div class="v">' + esc(v) + "</div></div>" : "";
    }
    return '<div class="plan-grid">' +
      cell("Booking", p.action, true) +
      cell("Difficulty", d.difficulty) +
      cell("Nights", nightsLabel(p.nights)) +
      cell("Water", p.water) +
      cell("Key risk", p.risk) +
      cell("Best route", p.route, true) +
      "</div>";
  }

  function detailHTML(d) {
    var b = BOOK[d.bookability] || BOOK.unavailable;
    var img = d.image, L = d.links || {};
    var linkRow = [
      lb(L.official, "official", "Official site", "primary"),
      lb(L.map, "map", "Open in Maps"),
      lb(L.recreation, "permit", "Recreation.gov"),
      lb(L.alltrails, "alltrails", "AllTrails"),
      lb(L.weather, "weather", "Weather")
    ].join("");
    var pros = (d.pros || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    var cons = (d.cons || []).map(function (x) { return "<li>" + esc(x) + "</li>"; }).join("");
    var credit = img
      ? '<div class="dlg-credit">Photo: ' + esc(img.artist) + ' · <a href="' + esc(img.source_url) + '" target="_blank" rel="noopener noreferrer">' + esc(img.license) + "</a></div>"
      : "";
    return '<div class="dlg-scroll">' +
      '<div class="dlg-hero">' +
        (img ? '<img src="assets/images/' + esc(img.file) + '" alt="' + esc(d.name) + '">' : "") +
        '<span class="badge ' + b.cls + '">' + esc(b.label) + "</span>" +
        credit +
        '<button class="dlg-close" type="button" aria-label="Close details" data-close>×</button>' +
      "</div>" +
      '<div class="dlg-body">' +
        '<div class="dlg-eyebrow"><span class="pill ' + b.cls + '">' + esc(b.short) + "</span></div>" +
        "<h2>" + esc(d.name) + "</h2>" +
        '<p class="dlg-state">' + esc(d.state) + " · " + esc(d.region) + "</p>" +
        '<p class="dlg-fit">' + esc(d.late_october_fit) + "</p>" +
        '<div class="dlg-chips"><span class="chip">' + esc(d.difficulty) + '</span><span class="chip">' + esc(nightsLabel(d.suggested_nights)) + '</span><span class="chip">' + esc(d.terrain) + "</span></div>" +
        planBlock(d) +
        '<div class="pc-cols"><div><h3>Pros</h3><ul class="pc-list pros">' + pros + '</ul></div><div><h3>Cons</h3><ul class="pc-list cons">' + cons + "</ul></div></div>" +
        '<div class="dlg-tradeoff"><div><strong>Trade-off:</strong> ' + esc(d.tradeoff) + "</div></div>" +
        '<p class="dlg-note"><strong>Booking:</strong> ' + esc(d.bookability_note) + "</p>" +
        '<div class="link-row">' + linkRow + "</div>" +
      "</div></div>";
  }

  function openDetail(id) {
    var d = byId[id]; if (!d || !dlg) return;
    dlg.innerHTML = detailHTML(d);
    if (typeof dlg.showModal === "function") { if (!dlg.open) dlg.showModal(); }
    else dlg.setAttribute("open", "");
    var c = dlg.querySelector("[data-close]");
    if (c) c.focus();
  }
  function closeDetail() {
    if (dlg && dlg.open) { if (typeof dlg.close === "function") dlg.close(); else dlg.removeAttribute("open"); }
  }
  function parseHash() {
    var id = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    return byId[id] ? id : null;
  }
  function syncFromHash() {
    var id = parseHash();
    if (id) openDetail(id); else closeDetail();
  }
  function setHash(id) {
    if (id) history.pushState(null, "", "#" + encodeURIComponent(id));
    else history.pushState(null, "", location.pathname + location.search);
    syncFromHash();
  }

  window.addEventListener("popstate", syncFromHash);

  if (dlg) {
    dlg.addEventListener("cancel", function (e) { e.preventDefault(); setHash(""); });
    dlg.addEventListener("click", function (e) {
      if (e.target === dlg) { setHash(""); return; } // backdrop
      if (e.target.closest("[data-close]")) setHash("");
    });
  }

  // Open from cards (click + keyboard) and from any [data-detail] trigger (map popups).
  cards.forEach(function (card) {
    card.addEventListener("click", function () { setHash(card.dataset.id); });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " " || e.key === "Spacebar") { e.preventDefault(); setHash(card.dataset.id); }
    });
  });
  document.addEventListener("click", function (e) {
    var t = e.target.closest && e.target.closest("[data-detail]");
    if (t) { e.preventDefault(); setHash(t.getAttribute("data-detail")); }
  });

  /* ---------------- Map ---------------- */
  function initMap() {
    if (typeof L === "undefined") return;
    var el = document.getElementById("map"); if (!el) return;
    var map = L.map(el, { scrollWheelZoom: false }).setView([39, -98], 4);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: "abcd", maxZoom: 18
    }).addTo(map);
    var bounds = [];
    DEST.forEach(function (d) {
      if (!d.coordinates) return;
      var c = d.coordinates, b = BOOK[d.bookability] || BOOK.unavailable;
      L.circleMarker([c.lat, c.lon], { radius: 8, color: "#fff", weight: 2, fillColor: b.color, fillOpacity: 0.95 })
        .addTo(map)
        .bindPopup('<div class="map-popup"><strong>' + esc(d.name) + '</strong><span class="mp-badge" style="color:' + b.color + '">' + esc(b.label) + '</span><br><button type="button" data-detail="' + esc(d.id) + '">View details →</button></div>');
      bounds.push([c.lat, c.lon]);
    });
    if (bounds.length) map.fitBounds(bounds, { padding: [30, 30] });
    map.on("focus", function () { map.scrollWheelZoom.enable(); });
    map.on("blur", function () { map.scrollWheelZoom.disable(); });
  }

  /* ---------------- Sticky controls shadow ---------------- */
  var controls = document.getElementById("controls");
  if (controls && "IntersectionObserver" in window) {
    var sentinel = document.createElement("div");
    controls.parentNode.insertBefore(sentinel, controls);
    new IntersectionObserver(function (entries) {
      controls.classList.toggle("is-pinned", !entries[0].isIntersecting);
    }, { rootMargin: "-59px 0px 0px 0px", threshold: 1 }).observe(sentinel);
  }

  /* ---------------- Init ---------------- */
  apply();
  initMap();
  syncFromHash();
})();
