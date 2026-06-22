// Fetch real, freely-licensed destination photos from Wikimedia Commons.
//
// For each destination it searches Commons (File namespace), then picks the
// first candidate that is a landscape JPEG/PNG of decent resolution under a
// free license (CC BY, CC BY-SA, CC0, or Public Domain). It downloads a
// ~1600px-wide rendition and records full attribution to assets/images/credits.json.
//
// Usage:
//   node scripts/fetch-images.mjs           # fetch any missing images
//   node scripts/fetch-images.mjs --force   # re-fetch everything
//   node scripts/fetch-images.mjs grand-canyon zion-narrows   # only these ids

import { writeFile, mkdir, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const IMG_DIR = join(ROOT, "assets", "images");
const CREDITS_PATH = join(IMG_DIR, "credits.json");

const UA =
  "late-october-backpacking/1.0 (https://github.com/diosmiodio/late-october-backpacking; diosmiodio@gmail.com)";
const API = "https://commons.wikimedia.org/w/api.php";

// Primary (and fallback) Commons search queries per destination id.
const QUERIES = {
  "grand-canyon": ["Bright Angel Trail Grand Canyon", "Grand Canyon South Kaibab Trail"],
  "zion-narrows": ["Zion Narrows Virgin River", "The Narrows Zion National Park"],
  "paria-buckskin": ["Buckskin Gulch slot canyon", "Paria Canyon"],
  "canyonlands-needles": ["Chesler Park Needles Canyonlands", "Needles District Canyonlands"],
  "capitol-reef": ["Capitol Reef Waterpocket Fold", "Capitol Reef National Park landscape"],
  "coyote-gulch": ["Jacob Hamblin Arch Coyote Gulch", "Coyote Gulch Escalante arch", "Coyote Natural Bridge Utah"],
  "bryce-under-rim": ["Bryce Canyon hoodoos", "Bryce Canyon amphitheater"],
  "aravaipa": ["Aravaipa Canyon Wilderness", "Aravaipa Creek Arizona"],
  "superstition": ["Superstition Mountains Arizona", "Weavers Needle Superstition"],
  "saguaro-rincon": ["Rincon Mountains Saguaro National Park", "Saguaro National Park East"],
  "chiricahua": ["Chiricahua Mountains Arizona", "Chiricahua rhyolite pinnacles"],
  "gila": ["Gila Wilderness New Mexico", "Gila River New Mexico canyon"],
  "big-bend": ["Chisos Mountains Big Bend", "Big Bend South Rim"],
  "guadalupe-mtns": ["El Capitan Guadalupe Mountains Texas", "Guadalupe Peak Texas", "McKittrick Canyon autumn maples"],
  "joshua-tree": ["Joshua Tree National Park landscape", "Joshua Tree National Park boulders"],
  "death-valley": ["Death Valley National Park landscape", "Death Valley canyon"],
  "mojave-preserve": ["Kelso Dunes Mojave", "Mojave National Preserve"],
  "anza-borrego": ["Anza-Borrego Desert State Park", "Borrego Palm Canyon"],
  "trans-catalina": ["Two Harbors Santa Catalina Island", "Catalina Island isthmus", "Avalon Catalina Island harbor"],
  "channel-islands": ["Santa Cruz Island Channel Islands", "Channel Islands National Park"],
  "point-reyes": ["Point Reyes National Seashore coast", "Point Reyes cliffs"],
  "lost-coast": ["Lost Coast King Range California", "Lost Coast Trail California"],
  "sespe": ["Sespe Wilderness", "Sespe Creek California"],
  "olympic-coast": ["Rialto Beach sea stacks Olympic", "Olympic National Park coast sea stacks"],
  "great-smoky": ["Great Smoky Mountains autumn", "Great Smoky Mountains National Park foliage"],
  "shenandoah": ["Shenandoah National Park autumn", "Old Rag Mountain Shenandoah"],
  "dolly-sods": ["Dolly Sods Wilderness", "Dolly Sods West Virginia"],
  "cumberland-island": ["Cumberland Island National Seashore", "Cumberland Island Georgia oaks"],
  "ozark-highlands": ["Buffalo National River Arkansas", "Hawksbill Crag Arkansas"],
  "everglades": ["Everglades National Park landscape", "Everglades mangrove"],
  "havasupai": ["Havasu Falls Arizona", "Havasupai waterfall turquoise", "Mooney Falls Havasupai"],
};

// Pin a specific Commons file for an id when the auto-pick is poor.
// e.g. "grand-canyon": "File:Grand Canyon view.jpg"
const OVERRIDES = {};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url =
    API + "?" + new URLSearchParams({ format: "json", formatversion: "2", ...params });
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return await res.json();
    } catch (e) {
      if (attempt === 2) throw e;
      await sleep(800 * (attempt + 1));
    }
  }
}

async function search(q) {
  const data = await api({
    action: "query",
    list: "search",
    srsearch: q,
    srnamespace: "6",
    srlimit: "25",
  });
  return (data.query?.search || []).map((s) => s.title);
}

async function imageinfo(titles) {
  if (titles.length === 0) return [];
  const data = await api({
    action: "query",
    titles: titles.join("|"),
    prop: "imageinfo",
    iiprop: "url|size|mime|extmetadata",
    iiurlwidth: "1600",
  });
  return data.query?.pages || [];
}

const clean = (html) =>
  (html || "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

function isFreeLicense(em) {
  const lic = (em?.License?.value || "").toLowerCase();
  const short = em?.LicenseShortName?.value || "";
  if (/^(cc-by|cc0|cc-by-sa|pd|publicdomain|public domain)/.test(lic)) return true;
  if (/(cc[ -]?by|cc0|public domain|pd-)/i.test(short)) return true;
  return false;
}

const BAD_TITLE = /\b(map|diagram|chart|sign|signboard|logo|seal|flag|poster|panorama|plan|profile|elevation|graph|brochure|painting|artwork|canvas|drawing|sketch|illustration|engraving|lithograph|portrait|stamp)\b/i;

function evaluate(page) {
  const info = page?.imageinfo?.[0];
  if (!info) return null;
  const em = info.extmetadata || {};
  const mime = info.mime || "";
  const w = info.width || 0;
  const h = info.height || 0;
  const aspect = h ? w / h : 0;
  const title = page.title || "";

  if (!/image\/(jpeg|png)/.test(mime)) return null;
  if (w < 1200) return null;
  if (aspect < 1.15 || aspect > 2.5) return null; // landscape only
  if (BAD_TITLE.test(title)) return null;
  if (em.Restrictions?.value) return null; // trademark/personality restrictions
  if (!isFreeLicense(em)) return null;

  return {
    title,
    src_url: info.thumburl || info.url,
    width: info.thumbwidth || w,
    height: info.thumbheight || h,
    mime,
    artist: clean(em.Artist?.value) || clean(em.Credit?.value) || "Unknown",
    license: em.LicenseShortName?.value || em.License?.value || "See source",
    license_url: em.LicenseUrl?.value || "",
    page_url: info.descriptionurl || "https://commons.wikimedia.org/wiki/" + encodeURIComponent(title),
  };
}

async function pickFor(id) {
  if (OVERRIDES[id]) {
    const pages = await imageinfo([OVERRIDES[id]]);
    const cand = evaluate(pages[0]);
    if (cand) return cand;
    console.warn(`  override for ${id} did not pass filters, falling back to search`);
  }
  for (const q of QUERIES[id]) {
    const titles = await search(q);
    await sleep(250);
    // Evaluate in batches preserving relevance order.
    for (let i = 0; i < titles.length; i += 25) {
      const batch = titles.slice(i, i + 25);
      const pages = await imageinfo(batch);
      // Restore search order (API may reorder).
      const byTitle = new Map(pages.map((p) => [p.title, p]));
      for (const t of batch) {
        const cand = evaluate(byTitle.get(t));
        if (cand) {
          cand.query = q;
          return cand;
        }
      }
      await sleep(250);
    }
  }
  return null;
}

async function download(url, dest) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error("download HTTP " + res.status);
  const buf = Buffer.from(await res.arrayBuffer());
  await writeFile(dest, buf);
  return buf.length;
}

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--"));
  const ids = (only.length ? only : Object.keys(QUERIES));

  let credits = {};
  if (existsSync(CREDITS_PATH)) {
    credits = JSON.parse(await readFile(CREDITS_PATH, "utf8"));
  }

  const ok = [];
  const missing = [];
  for (const id of ids) {
    const ext = "jpg";
    const file = `${id}.${ext}`;
    const dest = join(IMG_DIR, file);
    if (!force && existsSync(dest) && credits[id]) {
      ok.push(id + " (cached)");
      continue;
    }
    process.stdout.write(`Fetching ${id} ... `);
    try {
      const cand = await pickFor(id);
      if (!cand) {
        console.log("NO MATCH");
        missing.push(id);
        continue;
      }
      const bytes = await download(cand.src_url, dest);
      credits[id] = {
        file,
        title: cand.title,
        artist: cand.artist,
        license: cand.license,
        license_url: cand.license_url,
        source_url: cand.page_url,
        width: cand.width,
        height: cand.height,
        query: cand.query || "(override)",
      };
      console.log(`ok (${cand.width}x${cand.height}, ${(bytes / 1024).toFixed(0)}KB) — ${cand.license} — ${cand.artist.slice(0, 50)}`);
      ok.push(id);
      await sleep(300);
    } catch (e) {
      console.log("ERROR " + e.message);
      missing.push(id);
    }
  }

  await writeFile(CREDITS_PATH, JSON.stringify(credits, null, 2) + "\n");
  console.log(`\nDone. ${ok.length} ok, ${missing.length} missing.`);
  if (missing.length) console.log("Missing:", missing.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
