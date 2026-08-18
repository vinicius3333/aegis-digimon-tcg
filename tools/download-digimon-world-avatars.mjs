import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DIGIMON_WORLD_AVATARS } from "../packages/shared/dist/account/avatars.js";

const GALLERY_URL = "https://wikimon.net/Gallery:Digimon_World";
const OUTPUT_DIRECTORY = fileURLToPath(new URL("../apps/web/public/avatars/digimon-world-1/", import.meta.url));
const TEMPORARY_DIRECTORY = mkdtempSync(join(tmpdir(), "aegis-dw1-avatars-"));

try {
  const galleryResponse = await fetch(GALLERY_URL);
  if (!galleryResponse.ok) throw new Error(`Could not load ${GALLERY_URL}: ${galleryResponse.status}`);
  const gallery = await galleryResponse.text();
  await mkdir(OUTPUT_DIRECTORY, { recursive: true });

  for (const avatar of DIGIMON_WORLD_AVATARS) {
    const escapedFilename = avatar.sourceFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const sourceMatch = gallery.match(new RegExp(`src="(/images/thumb/[^/]+/[^/]+/${escapedFilename})/[^"]+"`, "i"));
    if (!sourceMatch?.[1]) throw new Error(`Source file not found in gallery: ${avatar.sourceFile}`);

    const sourcePath = sourceMatch[1].replace("/images/thumb/", "/images/");
    const sourceUrl = new URL(sourcePath, GALLERY_URL);
    const sourceResponse = await fetch(sourceUrl);
    if (!sourceResponse.ok) throw new Error(`Could not download ${sourceUrl}: ${sourceResponse.status}`);

    const sourceFile = join(TEMPORARY_DIRECTORY, basename(avatar.sourceFile));
    const outputFile = join(OUTPUT_DIRECTORY, `${avatar.id}.png`);
    writeFileSync(sourceFile, Buffer.from(await sourceResponse.arrayBuffer()));
    execFileSync(
      "/usr/bin/sips",
      ["--cropToHeightWidth", "150", "150", "--cropOffset", "0", "0", sourceFile, "--out", outputFile],
      {
        stdio: "ignore",
      },
    );

    const image = readFileSync(outputFile);
    const width = image.readUInt32BE(16);
    const height = image.readUInt32BE(20);
    if (width !== 150 || height !== 150) throw new Error(`Unexpected output size for ${avatar.id}: ${width}x${height}`);
  }

  process.stdout.write(`Downloaded and cropped ${DIGIMON_WORLD_AVATARS.length} Digimon World avatars.\n`);
} finally {
  rmSync(TEMPORARY_DIRECTORY, { recursive: true, force: true });
}
