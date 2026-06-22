// Build data/destinations.json by layering enrichment onto data/source.json.
//
// Adds, per destination: image (from credits.json), approximate coordinates,
// a links row (official / map / weather / recreation.gov / AllTrails), and a
// grounded "plan_it" summary. The source file is never modified.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { COORDS, PLAN, REC_GOV, BOOKABILITY_ACTION } from "./enrichment-data.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const enc = encodeURIComponent;

// AllTrails search term: destination name without parenthetical qualifier.
const altQuery = (name) => name.replace(/\s*\(.*?\)\s*/g, " ").trim();

function buildLinks(d) {
  const links = {};
  if (d.official_site) links.official = d.official_site;
  const c = COORDS[d.id];
  if (c) {
    links.map = `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}`;
    links.weather = `https://forecast.weather.gov/MapClick.php?lat=${c.lat}&lon=${c.lon}`;
  }
  if (REC_GOV[d.id]) {
    links.recreation = `https://www.recreation.gov/search?q=${enc(REC_GOV[d.id])}`;
  }
  links.alltrails = `https://www.alltrails.com/search?q=${enc(altQuery(d.name))}`;
  return links;
}

function enrichDestination(d, credits) {
  const c = COORDS[d.id];
  const plan = PLAN[d.id];
  return {
    ...d,
    image: credits[d.id] || null,
    coordinates: c ? { lat: c.lat, lon: c.lon, approximate: true } : null,
    links: buildLinks(d),
    plan_it: plan
      ? {
          action: BOOKABILITY_ACTION[d.bookability] || "",
          nights: d.suggested_nights,
          water: plan.water,
          risk: plan.risk,
          route: d.best_route,
        }
      : null,
  };
}

function enrichRuledOut(d, credits) {
  const c = COORDS[d.id];
  const links = {};
  if (d.official_site) links.official = d.official_site;
  if (c) links.map = `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}`;
  return {
    ...d,
    image: credits[d.id] || null,
    coordinates: c ? { lat: c.lat, lon: c.lon, approximate: true } : null,
    links,
  };
}

async function main() {
  const source = JSON.parse(await readFile(join(ROOT, "data", "source.json"), "utf8"));
  const credits = JSON.parse(
    await readFile(join(ROOT, "assets", "images", "credits.json"), "utf8"),
  );

  const warnings = [];
  const destinations = source.destinations.map((d) => {
    if (!credits[d.id]) warnings.push(`no image for ${d.id}`);
    if (!COORDS[d.id]) warnings.push(`no coordinates for ${d.id}`);
    if (!PLAN[d.id]) warnings.push(`no plan_it for ${d.id}`);
    return enrichDestination(d, credits);
  });
  const ruled_out = (source.ruled_out || []).map((d) => enrichRuledOut(d, credits));

  const out = {
    meta: source.meta,
    destinations,
    ruled_out,
    general_tips: source.general_tips,
    generated_at: new Date().toISOString().slice(0, 10),
  };

  await writeFile(
    join(ROOT, "data", "destinations.json"),
    JSON.stringify(out, null, 2) + "\n",
  );

  if (warnings.length) {
    console.warn("Enrichment warnings:\n  " + warnings.join("\n  "));
  }
  console.log(
    `Enriched ${destinations.length} destinations + ${ruled_out.length} ruled-out -> data/destinations.json`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
