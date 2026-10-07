import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const BASE_URL = "https://glyphcss.com";
const PROJECT_ROOT = fileURLToPath(new URL("../", import.meta.url));
const force = process.argv.includes("--force");

async function fetchFile(relativeUrl) {
  const fullUrl = new URL(relativeUrl, `${BASE_URL}/`).href;
  console.log(`Downloading: ${fullUrl}`);

  const res = await fetch(fullUrl, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${fullUrl}: ${res.statusText}`);
  }

  const data = await res.text();
  JSON.parse(data);
  return data;
}

async function saveFile(localPath, data) {
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  const temporaryPath = `${localPath}.${randomUUID()}.download`;
  try {
    await fs.writeFile(temporaryPath, data, "utf-8");
    await fs.rename(temporaryPath, localPath);
  } finally {
    await fs.rm(temporaryPath, { force: true });
  }
}

async function downloadFile(relativeUrl, localPath) {
  await saveFile(localPath, await fetchFile(relativeUrl));
}

async function main() {
  console.log("=== 1. Downloading metadata and labels ===");

  // 1. Fetch manifest.json
  const manifestRel = "/data/tiles/manifest.json";
  const manifestLocal = path.join(PROJECT_ROOT, "public", "data", "tiles", "manifest.json");
  const manifestData = await fetchFile(manifestRel);
  const manifest = JSON.parse(manifestData);

  // 2. Fetch country labels
  const labelsRel = "/data/flatmap/labels.json";
  const labelsLocal = path.join(PROJECT_ROOT, "public", "data", "flatmap", "labels.json");
  await downloadFile(labelsRel, labelsLocal);

  console.log("=== 2. Downloading topography tiles ===");
  for (const zoom of manifest.zooms) {
    const { z, cols, rows } = zoom;
    console.log(`Fetching LOD ${z} (${cols} cols x ${rows} rows)...`);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tileRel = `/data/tiles/${z}/${x}_${y}.json`;
        const tileLocal = path.join(PROJECT_ROOT, "public", "data", "tiles", String(z), `${x}_${y}.json`);

        // Skip if tile is already cached locally
        if (!force) {
          try {
            await fs.access(tileLocal);
            continue;
          } catch {
          }
        }

        try {
          await downloadFile(tileRel, tileLocal);
        } catch (err) {
          console.error(`Failed to download tile ${z}/${x}_${y}:`, err.message);
          process.exitCode = 1;
        }
      }
    }
  }

  if (process.exitCode) throw new Error("Some tiles failed to download; existing files were preserved.");
  await saveFile(manifestLocal, manifestData);
  console.log("=== Download complete. Files saved to ./public/data ===");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
