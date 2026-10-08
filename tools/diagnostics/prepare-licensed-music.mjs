import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

// Offline asset preparation only. Runtime playback needs no FFmpeg or third-party host.
const tracks = [
  {
    id: "digitalBattle",
    file: "shortcuts.mp3",
    title: "Shortcuts",
    artist: "Zane Little Music",
    sourceUrl: "https://opengameart.org/content/shortcuts",
    downloadUrl: "https://opengameart.org/sites/default/files/shortcuts.ogg",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  {
    id: "digitalAscent",
    file: "electric.mp3",
    title: "Electric",
    artist: "Sudocolon",
    sourceUrl: "https://opengameart.org/content/electric-0",
    downloadUrl: "https://opengameart.org/sites/default/files/Electric.mp3",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  {
    id: "warmDrive",
    file: "out-there.mp3",
    title: "Out There",
    artist: "yd",
    sourceUrl: "https://opengameart.org/content/space-music-out-there",
    downloadUrl: "https://opengameart.org/sites/default/files/OutThere_0.ogg",
    license: "CC0",
    licenseUrl: "https://creativecommons.org/publicdomain/zero/1.0/",
  },
  {
    id: "cipher",
    file: "cipher.mp3",
    title: "Cipher",
    artist: "Kevin MacLeod",
    sourceUrl: "https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100844",
    downloadUrl: "https://incompetech.com/music/royalty-free/mp3-royaltyfree/Cipher2.mp3",
    license: "CC BY 4.0",
    licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
  },
];
const output = new URL("../../apps/web/public/audio/music/", import.meta.url);
const temporary = await mkdtemp(path.join(tmpdir(), "aegis-licensed-music-"));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 2 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw result.error ?? new Error(result.stderr);
  return result;
}
function metrics(file) {
  const probe = JSON.parse(
    run("ffprobe", ["-v", "error", "-show_entries", "format=duration:stream=sample_rate,channels", "-of", "json", file])
      .stdout,
  );
  const log = run("ffmpeg", ["-hide_banner", "-i", file, "-af", "astats=metadata=0:reset=0", "-f", "null", "-"]).stderr;
  const decibels = (name) => Number([...log.matchAll(new RegExp(`${name}: (-?[\\d.]+)`, "g"))].at(-1)?.[1]);
  const peakDbFS = decibels("Peak level dB");
  const rmsDbFS = decibels("RMS level dB");
  if (![peakDbFS, rmsDbFS].every(Number.isFinite)) throw new Error(`Cannot measure ${file}`);
  return {
    seconds: Number(probe.format.duration),
    sampleRate: Number(probe.streams[0].sample_rate),
    channels: probe.streams[0].channels,
    peakDbFS,
    rmsDbFS,
    peak: 10 ** (peakDbFS / 20),
    rms: 10 ** (rmsDbFS / 20),
  };
}
try {
  await mkdir(output, { recursive: true });
  const manifest = {
    version: 1,
    preparedAt: new Date().toISOString().slice(0, 10),
    defaultTrack: "digitalBattle",
    preparation:
      "Full compositions; gain adjustment, 50 ms opening fade, 150 ms closing fade, stereo 44.1 kHz 128 kbps MP3",
    ffmpegVersion: run("ffmpeg", ["-version"]).stdout.split("\n")[0],
    tracks: {},
  };
  for (const track of tracks) {
    const response = await fetch(track.downloadUrl, { signal: AbortSignal.timeout(120000) });
    if (!response.ok) throw new Error(`Download failed: ${track.downloadUrl} (${response.status})`);
    const source = Buffer.from(await response.arrayBuffer());
    const input = path.join(temporary, `${track.id}.source`);
    await writeFile(input, source);
    const before = metrics(input);
    if (before.seconds < 180) throw new Error(`Unexpected short source: ${track.title}`);
    // Match the existing quiet score bus, with encoding headroom below its 0.08 peak ceiling.
    const gainDb = Math.min(-36.5 - before.rmsDbFS, -24 - before.peakDbFS);
    const file = new URL(track.file, output);
    run("ffmpeg", [
      "-hide_banner",
      "-y",
      "-i",
      input,
      "-map_metadata",
      "-1",
      "-af",
      `volume=${gainDb}dB,afade=t=in:d=0.05,afade=t=out:st=${before.seconds - 0.15}:d=0.15`,
      "-ar",
      "44100",
      "-ac",
      "2",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "128k",
      file.pathname,
    ]);
    const measured = metrics(file.pathname);
    if (measured.peak > 0.08 || Math.abs(measured.seconds - before.seconds) > 0.15)
      throw new Error(`Unsafe output: ${track.title}`);
    const bytes = await readFile(file);
    const sha256 = hash(bytes);
    manifest.tracks[track.id] = {
      ...track,
      url: `/audio/music/${track.file}?v=${sha256.slice(0, 12)}`,
      sourceSha256: hash(source),
      sha256,
      bytes: bytes.length,
      sourceSeconds: before.seconds,
      gainDb,
      modifications: "Volume adjusted; opening and closing fades; MP3 conversion",
      metrics: measured,
    };
    console.log(
      `${track.title}: ${measured.seconds.toFixed(2)} s, peak ${measured.peak.toFixed(4)}, RMS ${measured.rms.toFixed(4)}, ${(bytes.length / 1e6).toFixed(1)} MB`,
    );
  }
  await writeFile(new URL("manifest.json", output), `${JSON.stringify(manifest, null, 2)}\n`);
  const bankUrl = new URL("../manifest.json", output);
  const bank = JSON.parse(await readFile(bankUrl, "utf8"));
  const selected = manifest.tracks[manifest.defaultTrack];
  bank.music = {
    ...selected,
    file: `music/${selected.file}`,
    original: false,
    originalScore: false,
    selectedId: manifest.defaultTrack,
    alternativeIds: Object.keys(manifest.tracks).filter((id) => id !== manifest.defaultTrack),
    sourceProvenance: "music/manifest.json",
    ...selected.metrics,
  };
  await writeFile(bankUrl, `${JSON.stringify(bank, null, 2)}\n`);
} finally {
  await rm(temporary, { recursive: true, force: true });
}
