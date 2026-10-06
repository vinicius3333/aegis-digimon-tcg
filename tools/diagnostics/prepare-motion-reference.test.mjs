import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const script = path.join(root, "tools/diagnostics/prepare-motion-reference.mjs");
const available = (command) => {
  try {
    execFileSync(command, ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

test(
  "reimporting another source invalidates its cached decoded pictures and timestamps",
  { skip: !available("ffmpeg") || !available("ffprobe") },
  async () => {
    const temporary = await mkdtemp(path.join(tmpdir(), "aegis-reference-"));
    const id = `test-${randomUUID()}`;
    const destination = path.join(root, "apps/web/.motion-reference", id);
    const prepare = (input) =>
      execFileSync(process.execPath, [script, "--input", input, "--id", id], { stdio: "pipe" });
    try {
      const red = path.join(temporary, "red.mp4");
      const blue = path.join(temporary, "blue.mp4");
      for (const [input, color] of [
        [red, "red"],
        [blue, "blue"],
      ])
        execFileSync("ffmpeg", [
          "-v",
          "error",
          "-f",
          "lavfi",
          "-i",
          `color=c=${color}:s=64x64:r=10:d=${color === "red" ? 0.3 : 0.2}`,
          "-c:v",
          "mpeg4",
          "-y",
          input,
        ]);
      prepare(red);
      const first = JSON.parse(await readFile(path.join(destination, "manifest.json"), "utf8"));
      const firstPicture = await readFile(path.join(destination, "frame-000000.jpg"));
      prepare(blue);
      const second = JSON.parse(await readFile(path.join(destination, "manifest.json"), "utf8"));
      const secondPicture = await readFile(path.join(destination, "frame-000000.jpg"));
      assert.ok(second.timestamps.length < first.timestamps.length);
      assert.equal(
        (await readdir(destination)).filter((name) => /^frame-\d{6}\.jpg$/.test(name)).length,
        second.timestamps.length,
        "a shorter source removes pictures beyond its replacement timeline",
      );
      assert.notEqual(first.sourceHash, second.sourceHash);
      assert.notDeepEqual(firstPicture, secondPicture);
      assert.equal(
        second.sourceHash,
        createHash("sha256")
          .update(await readFile(blue))
          .digest("hex"),
      );
      const before = (await stat(path.join(destination, "frame-000000.jpg"))).mtimeMs;
      prepare(blue);
      assert.equal(
        (await stat(path.join(destination, "frame-000000.jpg"))).mtimeMs,
        before,
        "unchanged source reuses its frame cache",
      );
    } finally {
      await rm(temporary, { recursive: true, force: true });
      await rm(destination, { recursive: true, force: true });
      await rm(path.join(root, ".local/motion-reference", id), { recursive: true, force: true });
    }
  },
);
