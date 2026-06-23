// Assemble the static site into dist/.
//   data/destinations.json (authored) -> dist/index.html (+ styles.css, app.js, images)
// Computed fields (links, plan_it) are derived at build time; see src/derive.mjs.

import { readFile, writeFile, mkdir, copyFile, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderPage } from "../src/template.mjs";
import { deriveDestination, deriveRuledOut } from "../src/derive.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

// Surface (but don't fail on) trips missing optional enrichment, so adding a
// bare entry still builds — it just renders without a photo/pin/plan summary.
function missingDataWarnings(destinations) {
  const w = [];
  for (const d of destinations) {
    if (!d.image) w.push(`no image for ${d.id}`);
    if (!d.coordinates) w.push(`no coordinates for ${d.id}`);
    if (!d.water && !d.risk) w.push(`no plan (water/risk) for ${d.id}`);
  }
  return w;
}

async function main() {
  const authored = JSON.parse(
    await readFile(join(ROOT, "data", "destinations.json"), "utf8"),
  );

  const warnings = missingDataWarnings(authored.destinations || []);
  const data = {
    meta: authored.meta,
    destinations: (authored.destinations || []).map(deriveDestination),
    ruled_out: (authored.ruled_out || []).map(deriveRuledOut),
    general_tips: authored.general_tips || [],
    generated_at: new Date().toISOString().slice(0, 10),
  };

  await rm(DIST, { recursive: true, force: true });
  await mkdir(join(DIST, "assets", "images"), { recursive: true });

  await writeFile(join(DIST, "index.html"), renderPage(data));
  await copyFile(join(ROOT, "src", "styles.css"), join(DIST, "styles.css"));
  await copyFile(join(ROOT, "src", "app.js"), join(DIST, "app.js"));
  await writeFile(join(DIST, ".nojekyll"), "");

  const imgDir = join(ROOT, "assets", "images");
  const files = (await readdir(imgDir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  await Promise.all(
    files.map((f) => copyFile(join(imgDir, f), join(DIST, "assets", "images", f))),
  );

  if (warnings.length) {
    console.warn("Data warnings:\n  " + warnings.join("\n  "));
  }
  console.log(
    `Built dist/ — ${data.destinations.length} destinations, ${files.length} images.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
