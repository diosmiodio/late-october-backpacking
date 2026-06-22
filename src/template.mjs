// Renders the full static HTML page from the enriched dataset.
// Cards are pre-rendered server-side (so content + official links work without
// JS); the detail modal and map are built client-side from embedded JSON.

const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export const BOOKABILITY = {
  open_access: { label: "Open access", short: "Go on a whim", cls: "ba-open" },
  easy_now: { label: "Easy now", short: "Reservable now", cls: "ba-easy" },
  competitive: { label: "Competitive", short: "Apply early", cls: "ba-comp" },
  unavailable: { label: "Ruled out", short: "Not viable", cls: "ba-out" },
};

const diffBucket = (s) => {
  const t = String(s).toLowerCase();
  if (t.includes("strenuous")) return "strenuous";
  if (t.includes("moderate")) return "moderate";
  if (t.includes("easy")) return "easy";
  return "moderate";
};

const nightsMin = (s) => {
  const m = String(s).match(/\d+/);
  return m ? +m[0] : 0;
};

const nightsLabel = (s) => {
  const t = String(s).trim();
  return t.replace(/-/g, "–") + (t === "1" ? " night" : " nights");
};

const ICON = {
  official: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm0 4a1.3 1.3 0 110 2.6A1.3 1.3 0 0112 6zm1.6 12h-3.2v-1.2h.8v-4h-.8v-1.2h2.4v5.2h.8z"/></svg>',
  map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5A2.5 2.5 0 1112 6.5a2.5 2.5 0 010 5z"/></svg>',
  weather: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 18a4 4 0 01-.5-7.97 5 5 0 019.6-1.2A3.5 3.5 0 0117.5 18H7z"/></svg>',
  permit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7zm6 1v8h2V8H9z"/></svg>',
  alltrails: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.5 5.5a2 2 0 11-4 0 2 2 0 014 0zM7 21l3.2-6.4-1.7-1.7L6 16M11 11l3 3 .5 3.5L17 21l1.5-1L17 16l-2.5-5.5z"/></svg>',
};

const linkBtn = (href, icon, label, cls = "") =>
  href
    ? `<a class="link-btn ${cls}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${ICON[icon] || ""}<span>${escapeHtml(label)}</span></a>`
    : "";

function renderCard(d) {
  const b = BOOKABILITY[d.bookability] || BOOKABILITY.unavailable;
  const img = d.image;
  return `
  <article class="card" data-id="${escapeHtml(d.id)}"
    data-bookability="${escapeHtml(d.bookability)}"
    data-region="${escapeHtml(d.region)}"
    data-difficulty="${diffBucket(d.difficulty)}"
    data-nights="${nightsMin(d.suggested_nights)}"
    data-name="${escapeHtml(d.name)}"
    data-search="${escapeHtml((d.name + " " + d.state + " " + d.region + " " + d.terrain).toLowerCase())}"
    tabindex="0" role="button" aria-label="View details for ${escapeHtml(d.name)}">
    <div class="card-media">
      ${img ? `<img src="assets/images/${escapeHtml(img.file)}" alt="${escapeHtml(d.name)}" loading="lazy" width="${img.width}" height="${img.height}">` : ""}
      <span class="badge ${b.cls}">${escapeHtml(b.label)}</span>
      <span class="card-region">${escapeHtml(d.region)}</span>
    </div>
    <div class="card-body">
      <h3 class="card-title">${escapeHtml(d.name)}</h3>
      <p class="card-state">${escapeHtml(d.state)}</p>
      <div class="chips">
        <span class="chip">${escapeHtml(d.difficulty)}</span>
        <span class="chip">${escapeHtml(nightsLabel(d.suggested_nights))}</span>
      </div>
      <p class="card-hook">${escapeHtml(d.late_october_fit)}</p>
      <div class="card-foot">
        <span class="details-cue">Details</span>
        ${d.links?.official ? `<a class="card-official" href="${escapeHtml(d.links.official)}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Official site ↗</a>` : ""}
      </div>
    </div>
  </article>`;
}

function renderRuledOut(d) {
  const img = d.image;
  return `
  <article class="ruled-card">
    <div class="ruled-media">
      ${img ? `<img src="assets/images/${escapeHtml(img.file)}" alt="${escapeHtml(d.name)}" loading="lazy">` : ""}
      <span class="badge ba-out">Considered · not viable last-minute</span>
    </div>
    <div class="ruled-body">
      <h3>${escapeHtml(d.name)}</h3>
      <p class="card-state">${escapeHtml(d.state)}</p>
      <p>${escapeHtml(d.reason)}</p>
      <div class="link-row">
        ${linkBtn(d.links?.official, "official", "Official booking")}
        ${linkBtn(d.links?.map, "map", "Map")}
      </div>
    </div>
  </article>`;
}

function regionOptions(destinations) {
  const seen = [];
  for (const d of destinations) if (!seen.includes(d.region)) seen.push(d.region);
  return seen.map((r) => `<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join("");
}

function legend(meta) {
  const order = ["open_access", "easy_now", "competitive"];
  return order
    .map((k) => {
      const b = BOOKABILITY[k];
      return `<div class="legend-item"><span class="dot ${b.cls}"></span><strong>${escapeHtml(b.label)}</strong><span class="legend-desc">${escapeHtml(meta.bookability_legend[k])}</span></div>`;
    })
    .join("");
}

function photoCredits(all) {
  const rows = all
    .filter((d) => d.image)
    .map((d) => {
      const i = d.image;
      const lic = i.license_url
        ? `<a href="${escapeHtml(i.license_url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(i.license)}</a>`
        : escapeHtml(i.license);
      return `<li><strong>${escapeHtml(d.name)}</strong> — photo by ${escapeHtml(i.artist)}, ${lic} · <a href="${escapeHtml(i.source_url)}" target="_blank" rel="noopener noreferrer">source</a></li>`;
    })
    .join("");
  return `<ul class="credits-list">${rows}</ul>`;
}

export function renderPage(data) {
  const { meta, destinations, ruled_out = [], general_tips = [] } = data;
  const allWithImages = [...destinations, ...ruled_out];

  const cards = destinations.map(renderCard).join("\n");
  const tips = general_tips.map((t) => `<li>${escapeHtml(t)}</li>`).join("\n");
  const ruled = ruled_out.map(renderRuledOut).join("\n");

  const embedded = JSON.stringify({ destinations, ruled_out }).replace(/</g, "\\u003c");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${escapeHtml(meta.title)}</title>
<meta name="description" content="A mobile-friendly guide to ${escapeHtml(destinations.length)} last-minute late-October backpacking trips across the US, sorted by how easily you can book them.">
<meta name="theme-color" content="#3a1d12">
<meta property="og:title" content="${escapeHtml(meta.title)}">
<meta property="og:description" content="${escapeHtml(destinations.length)} late-October backpacking trips, sorted by bookability — with photos, maps, and links.">
<meta property="og:type" content="website">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%8F%95%EF%B8%8F%3C/text%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<link rel="stylesheet" href="styles.css">
</head>
<body>
<a class="skip-link" href="#grid">Skip to destinations</a>
<header class="site-header">
  <a class="brand" href="#top"><span class="brand-mark">⛰</span> Late-October Backpacking</a>
  <nav class="site-nav">
    <a href="#map-section">Map</a>
    <a href="#tips">Tips</a>
    <a href="#ruled-out">Ruled out</a>
  </nav>
</header>

<main id="top">
  <section class="hero">
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <p class="eyebrow">${escapeHtml(meta.season_window)} · United States</p>
      <h1>${escapeHtml(meta.title)}</h1>
      <p class="hero-sub">Where to go when the high country is already snowed in — ${escapeHtml(destinations.length)} trips, sorted by how easily you can book them <em>right now</em>.</p>
      <a class="hero-cta" href="#grid">Browse destinations ↓</a>
    </div>
  </section>

  <section class="about">
    <h2 class="visually-hidden">Why late October</h2>
    <p class="about-why">${escapeHtml(meta.why_late_october)}</p>
    ${meta.note ? `<p class="about-note"><strong>Heads up:</strong> ${escapeHtml(meta.note)}</p>` : ""}
  </section>

  <section class="legend" aria-label="Bookability legend">
    <h2>How to read “bookability”</h2>
    <div class="legend-grid">${legend(meta)}</div>
  </section>

  <section class="controls" id="controls">
    <div class="control search">
      <label for="q" class="visually-hidden">Search destinations</label>
      <input id="q" type="search" placeholder="Search name, state, terrain…" autocomplete="off">
    </div>
    <div class="control">
      <label for="f-book">Bookability</label>
      <select id="f-book">
        <option value="">All</option>
        <option value="open_access">Open access</option>
        <option value="easy_now">Easy now</option>
        <option value="competitive">Competitive</option>
      </select>
    </div>
    <div class="control">
      <label for="f-region">Region</label>
      <select id="f-region"><option value="">All</option>${regionOptions(destinations)}</select>
    </div>
    <div class="control">
      <label for="f-diff">Difficulty</label>
      <select id="f-diff">
        <option value="">All</option>
        <option value="easy">Easy</option>
        <option value="moderate">Moderate</option>
        <option value="strenuous">Strenuous</option>
      </select>
    </div>
    <div class="control">
      <label for="sort">Sort</label>
      <select id="sort">
        <option value="bookability">Easiest to book</option>
        <option value="name">Name (A–Z)</option>
        <option value="nights">Fewest nights</option>
      </select>
    </div>
    <button id="reset" class="reset-btn" type="button">Reset</button>
  </section>

  <p class="result-count"><span id="count">${destinations.length}</span> of ${destinations.length} destinations</p>

  <section id="map-section" class="map-section">
    <h2>Where they are <span class="approx">· approximate locations</span></h2>
    <div id="map" role="img" aria-label="Map of destinations"></div>
  </section>

  <section id="grid" class="grid">
    ${cards}
  </section>
  <p id="empty" class="empty-state" hidden>No destinations match those filters. <button id="empty-reset" type="button" class="linklike">Clear filters</button></p>

  <section id="tips" class="tips">
    <h2>Plan-it tips for late October</h2>
    <ul class="tips-list">${tips}</ul>
  </section>

  <section id="ruled-out" class="ruled-out">
    <h2>Considered but ruled out</h2>
    <div class="ruled-grid">${ruled}</div>
  </section>
</main>

<footer class="site-footer">
  <p><strong>Informational only.</strong> Permit rules, quotas, and seasonal/fire closures change constantly — always confirm on each destination’s official site before committing.</p>
  <details class="credits">
    <summary>Photo credits &amp; licenses (${allWithImages.filter((d) => d.image).length})</summary>
    ${photoCredits(allWithImages)}
  </details>
  <p class="footer-meta">Built ${escapeHtml(data.generated_at || "")} · Photos from Wikimedia Commons under their respective licenses · Map © OpenStreetMap contributors, © CARTO</p>
</footer>

<dialog id="detail" class="detail-dialog" aria-label="Destination details"></dialog>

<script type="application/json" id="data">${embedded}</script>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="app.js"></script>
</body>
</html>
`;
}
