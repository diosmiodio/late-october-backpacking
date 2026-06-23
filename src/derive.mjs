// Derive the convenience fields the page and client use (links + plan_it) from
// the authored data in data/destinations.json. Keeping these computed — rather
// than stored — means editing a trip is a pure data edit: change the JSON,
// rebuild, done.

const enc = encodeURIComponent;

// AllTrails has no public search-results URL (its search/explore is interactive
// only), so we link to a Google search scoped to alltrails.com — that reliably
// lands on the destination's real AllTrails trail pages. The query is the
// destination name without its parenthetical qualifier.
const altQuery = (name) => name.replace(/\s*\(.*?\)\s*/g, " ").trim();

// Short, scannable action phrase per bookability tier.
const BOOKABILITY_ACTION = {
  open_access: "Go on a whim — self-register at the trailhead.",
  easy_now: "Reservable now — book soon to lock it in.",
  competitive: "Contested — apply early and keep backup dates.",
  unavailable: "Not viable last-minute.",
};

function buildLinks(d) {
  const links = {};
  if (d.official_site) links.official = d.official_site;
  const c = d.coordinates;
  if (c) {
    links.map = `https://www.google.com/maps/search/?api=1&query=${c.lat},${c.lon}`;
    links.weather = `https://forecast.weather.gov/MapClick.php?lat=${c.lat}&lon=${c.lon}`;
  }
  if (d.recreation_query) {
    links.recreation = `https://www.recreation.gov/search?q=${enc(d.recreation_query)}`;
  }
  links.alltrails = `https://www.google.com/search?q=${enc("site:alltrails.com " + altQuery(d.name))}`;
  return links;
}

const coords = (c) => (c ? { lat: c.lat, lon: c.lon, approximate: true } : null);

export function deriveDestination(d) {
  // Drop authored-only / build-only keys from the page payload; the derived
  // links + plan_it carry everything the UI actually reads.
  const { water, risk, recreation_query, image_query, coordinates, ...rest } = d;
  return {
    ...rest,
    coordinates: coords(coordinates),
    links: buildLinks(d),
    plan_it:
      water || risk
        ? {
            action: BOOKABILITY_ACTION[d.bookability] || "",
            nights: d.suggested_nights,
            water: water || "",
            risk: risk || "",
            route: d.best_route,
          }
        : null,
  };
}

export function deriveRuledOut(d) {
  const { image_query, coordinates, ...rest } = d;
  const links = {};
  if (d.official_site) links.official = d.official_site;
  if (coordinates) {
    links.map = `https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lon}`;
  }
  return { ...rest, coordinates: coords(coordinates), links };
}
