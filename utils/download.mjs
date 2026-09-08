import fs from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://glyphcss.com";

// Generic helper to fetch and save a remote file locally
async function downloadFile(relativeUrl, localPath) {
  const fullUrl = `${BASE_URL}${relativeUrl}`;
  console.log(`Downloading: ${fullUrl}`);

  const res = await fetch(fullUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${fullUrl}: ${res.statusText}`);
  }

  // Ensure target directory exists before writing
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  const data = await res.text();
  await fs.writeFile(localPath, data, "utf-8");
}

async function main() {
  console.log("=== 1. Downloading metadata and labels ===");

  // 1. Fetch manifest.json
  const manifestRel = "../data/tiles/manifest.json";
  const manifestLocal = path.join(process.cwd(), "public", manifestRel);
  await downloadFile(manifestRel, manifestLocal);

  // 2. Fetch country labels
  const labelsRel = "../data/flatmap/labels.json";
  const labelsLocal = path.join(process.cwd(), "public", labelsRel);
  await downloadFile(labelsRel, labelsLocal);

  // Parse manifest to extract tile grid specifications
  const manifestData = JSON.parse(await fs.readFile(manifestLocal, "utf-8"));

  console.log("=== 2. Downloading topography tiles ===");
  for (const zoom of manifestData.zooms) {
    const { z, cols, rows } = zoom;
    console.log(`Fetching LOD ${z} (${cols} cols x ${rows} rows)...`);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const tileRel = `../data/tiles/${z}/${x}_${y}.json`;
        const tileLocal = path.join(process.cwd(), "public", tileRel);

        // Skip if tile is already cached locally
        try {
          await fs.access(tileLocal);
          continue;
        } catch {
          // File does not exist, proceed with download
        }

        try {
          await downloadFile(tileRel, tileLocal);
        } catch (err) {
          console.error(`Failed to download tile ${z}/${x}_${y}:`, err.message);
        }
      }
    }
  }

  console.log("=== Download complete. Files saved to ./public/data ===");
}

main().catch(console.error);