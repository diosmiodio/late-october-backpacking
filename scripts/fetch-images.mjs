// Fetch real, freely-licensed destination photos from Wikimedia Commons and
// record them straight into data/destinations.json.
//
// Each trip may carry an optional "image_query": a search term, or an array of
// fallback terms, used to find a landscape JPEG/PNG of decent resolution under
// a free license (CC BY, CC BY-SA, CC0, or Public Domain). A term beginning
// with "File:" pins one specific Commons file instead of searching. The chosen
// photo is downloaded to assets/images/<id>.jpg and its attribution is written
// back into that trip's "image" field — so the JSON stays the single source of
// truth.
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
const DATA_PATH = join(ROOT, "data", "destinations.json");

const UA =
  "late-october-backpacking/1.0 (https://github.com/diosmiodio/late-october-backpacking; diosmiodio@gmail.com)";
const API = "https://commons.wikimedia.org/w/api.php";

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

// Try each query in order. "File:..." pins a specific Commons file; anything
// else is a search whose results are evaluated in relevance order.
async function pickFor(queries) {
  for (const q of queries) {
    if (/^File:/i.test(q)) {
      const pages = await imageinfo([q]);
      const cand = evaluate(pages[0]);
      if (cand) {
        cand.query = q;
        return cand;
      }
      continue;
    }
    const titles = await search(q);
    await sleep(250);
    for (let i = 0; i < titles.length; i += 25) {
      const batch = titles.slice(i, i + 25);
      const pages = await imageinfo(batch);
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

const queriesFor = (d) =>
  !d.image_query ? [] : Array.isArray(d.image_query) ? d.image_query : [d.image_query];

async function main() {
  await mkdir(IMG_DIR, { recursive: true });
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const only = args.filter((a) => !a.startsWith("--"));

  const doc = JSON.parse(await readFile(DATA_PATH, "utf8"));
  const all = [...(doc.destinations || []), ...(doc.ruled_out || [])];
  const wanted = only.length ? all.filter((d) => only.includes(d.id)) : all;

  const ok = [];
  const missing = [];
  for (const d of wanted) {
    const file = `${d.id}.jpg`;
    const dest = join(IMG_DIR, file);
    if (!force && existsSync(dest) && d.image) {
      ok.push(d.id + " (cached)");
      continue;
    }
    const queries = queriesFor(d);
    if (!queries.length) {
      console.log(`Skipping ${d.id} — no image_query in data/destinations.json`);
      missing.push(d.id);
      continue;
    }
    process.stdout.write(`Fetching ${d.id} ... `);
    try {
      const cand = await pickFor(queries);
      if (!cand) {
        console.log("NO MATCH");
        missing.push(d.id);
        continue;
      }
      const bytes = await download(cand.src_url, dest);
      d.image = {
        file,
        title: cand.title,
        artist: cand.artist,
        license: cand.license,
        license_url: cand.license_url,
        source_url: cand.page_url,
        width: cand.width,
        height: cand.height,
        query: cand.query,
      };
      console.log(
        `ok (${cand.width}x${cand.height}, ${(bytes / 1024).toFixed(0)}KB) — ${cand.license} — ${cand.artist.slice(0, 50)}`,
      );
      ok.push(d.id);
      await sleep(300);
    } catch (e) {
      console.log("ERROR " + e.message);
      missing.push(d.id);
    }
  }

  await writeFile(DATA_PATH, JSON.stringify(doc, null, 2) + "\n");
  console.log(
    `\nDone. ${ok.length} ok, ${missing.length} missing. Credits written to data/destinations.json.`,
  );
  if (missing.length) console.log("Missing:", missing.join(", "));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
