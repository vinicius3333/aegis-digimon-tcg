import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";

const root = new URL("../../apps/web/public/audio/sources/", import.meta.url);
const output = process.argv[2] ? path.resolve(process.argv[2]) : root;
const records = {
  touch: "bmac-contact1.wav",
  contact: "bmac-contact2.wav",
  cut: "bmac-cut.wav",
  shuffle: "bmac-shuffle.wav",
  bridge: "bmac-shuffleandbridge.wav",
  placeLight: "kenney-card-place-1.ogg",
  placeFirm: "kenney-card-place-2.ogg",
  placeHeavy: "kenney-card-place-3.ogg",
  placeStack: "kenney-card-place-4.ogg",
  slide: "kenney-card-slide-1.ogg",
  slideAway: "kenney-card-slide-2.ogg",
  slideBack: "kenney-card-slide-3.ogg",
  flick: "kenney-card-slide-4.ogg",
  shove: "kenney-card-shove-1.ogg",
  shoveFirm: "kenney-card-shove-2.ogg",
  fan: "kenney-card-fan-1.ogg",
  riffle: "kenney-card-shuffle.ogg",
  tap: "kenney-chip-lay-1.ogg",
  stack: "kenney-chips-stack-1.ogg",
  clack: "kenney-chips-collide-1.ogg",
  pack: "kenney-cards-pack-open-1.ogg",
};
await mkdir(output, { recursive: true });
const assets = [];
for (const [id, file] of Object.entries(records)) {
  const sourceUrl = new URL(`recorded-originals/${file}`, root);
  const original = await readFile(sourceUrl);
  const decoded = spawnSync(
    process.env.AUDIO_FFMPEG ?? "ffmpeg",
    [
      "-v",
      "error",
      "-threads",
      "1",
      "-i",
      sourceUrl.pathname,
      "-ac",
      "1",
      "-ar",
      "48000",
      "-f",
      "f32le",
      "-acodec",
      "pcm_f32le",
      "pipe:1",
    ],
    { timeout: 30000, maxBuffer: 4_000_000 },
  );
  if (decoded.error || decoded.status !== 0) throw new Error(`Foley decode failed: ${file}`);
  const raw = Float32Array.from({ length: decoded.stdout.length / 4 }, (_, i) => decoded.stdout.readFloatLE(i * 4));
  let maximum = 0;
  for (const value of raw) maximum = Math.max(maximum, Math.abs(value));
  if (!maximum) throw new Error(`Silent recording: ${file}`);
  const threshold = maximum * 0.015;
  let first = 0,
    last = raw.length - 1;
  while (Math.abs(raw[first]) < threshold) first++;
  while (Math.abs(raw[last]) < threshold) last--;
  const start = Math.max(0, first - 144),
    end = Math.min(raw.length, last + 576);
  const data = raw.slice(start, end);
  let previous = 0,
    filtered = 0,
    peak = 0;
  const coefficient = Math.exp((-2 * Math.PI * 45) / 48000);
  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    filtered = coefficient * (filtered + value - previous);
    previous = value;
    data[i] = filtered * Math.max(0, Math.min(1, i / 96, (data.length - 1 - i) / 384));
    peak = Math.max(peak, Math.abs(data[i]));
  }
  const gain = 0.36 / peak;
  const wav = Buffer.alloc(44 + data.length * 2);
  wav.write("RIFF");
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(48000, 24);
  wav.writeUInt32LE(96000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(data.length * 2, 40);
  for (let i = 0; i < data.length; i++) wav.writeInt16LE(Math.round(data[i] * gain * 32767), 44 + i * 2);
  const preparedFile = `recorded-${id}.wav`;
  await writeFile(output instanceof URL ? new URL(preparedFile, output) : path.join(output, preparedFile), wav);
  const kenney = file.startsWith("kenney-");
  assets.push({
    id,
    sourceFile: `recorded-originals/${file}`,
    preparedFile,
    author: kenney ? "Kenney Vleugels" : "Brian MacIntosh (BMacZero)",
    sourceUrl: kenney ? "https://kenney.nl/assets/casino-audio" : "https://opengameart.org/content/playing-card-sounds",
    downloadUrl: kenney
      ? "https://kenney.nl/media/pages/assets/casino-audio/2472606a04-1721639069/kenney_casino-audio.zip"
      : `https://opengameart.org/sites/default/files/${file.slice(5)}`,
    downloadMethod: "Anonymous HTTPS GET; no account, cookies or payment",
    license: "CC0-1.0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
    sourceSha256: createHash("sha256").update(original).digest("hex"),
    sha256: createHash("sha256").update(wav).digest("hex"),
    cropFrames: [start, end],
    sampleRate: 48000,
    seconds: data.length / 48000,
    processing: { highpassHz: 45, attackMs: 2, releaseMs: 8, fixedSourcePeak: 0.36, gain, pitchChange: "none" },
  });
}
const archive = await readFile(new URL("recorded-originals/kenney-casino.zip", root));
const manifest = {
  version: 1,
  type: "licensed-recorded-foley",
  license: "CC0-1.0",
  ffmpegVersion: "8.1.2",
  licenseEvidence: {
    archive: "recorded-originals/kenney-casino.zip",
    entry: "License.txt",
    readableCopy: "recorded-originals/Kenney-License.txt",
    readableCopyProcessing:
      "LF newlines and trailing whitespace removal only; original wording unchanged; archive remains authoritative",
  },
  archiveSha256: createHash("sha256").update(archive).digest("hex"),
  selection:
    "Real card contact, cut, shuffle, slide, shove and placement; short chip taps for restrained acoustic punctuation",
  assets,
};
await writeFile(
  output instanceof URL ? new URL("recorded-provenance.json", output) : path.join(output, "recorded-provenance.json"),
  JSON.stringify(manifest, null, 2).replace(/"cropFrames": \[\n\s*(\d+),\n\s*(\d+)\n\s*\]/g, '"cropFrames": [$1, $2]') +
    "\n",
);
console.log(
  JSON.stringify(
    assets.map(({ id, seconds }) => ({ id, seconds })),
    null,
    2,
  ),
);
