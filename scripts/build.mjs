// Assemble the static site into dist/.
//   data/destinations.json -> dist/index.html  (+ styles.css, app.js, images)
// Run `node scripts/enrich.mjs` first (npm run build does both).

import { readFile, writeFile, mkdir, copyFile, readdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { renderPage } from "../src/template.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DIST = join(ROOT, "dist");

async function main() {
  const data = JSON.parse(await readFile(join(ROOT, "data", "destinations.json"), "utf8"));

  await rm(DIST, { recursive: true, force: true });
  await mkdir(join(DIST, "assets", "images"), { recursive: true });

  await writeFile(join(DIST, "index.html"), renderPage(data));
  await copyFile(join(ROOT, "src", "styles.css"), join(DIST, "styles.css"));
  await copyFile(join(ROOT, "src", "app.js"), join(DIST, "app.js"));
  await writeFile(join(DIST, ".nojekyll"), "");

  const imgDir = join(ROOT, "assets", "images");
  const files = (await readdir(imgDir)).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  await Promise.all(files.map((f) => copyFile(join(imgDir, f), join(DIST, "assets", "images", f))));

  console.log(
    `Built dist/ — ${data.destinations.length} destinations, ${files.length} images.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
