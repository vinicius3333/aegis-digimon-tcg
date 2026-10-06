#!/usr/bin/env node
import { spawn, execFileSync } from "node:child_process";
import { createReadStream } from "node:fs";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, readdir, copyFile, stat, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { parseArgs } from "node:util";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { values } = parseArgs({
  options: {
    input: { type: "string" },
    id: { type: "string", default: "kYBHuw7ItSg" },
    title: { type: "string" },
    force: { type: "boolean", default: false },
  },
});
if (!/^[\w-]+$/.test(values.id)) throw new Error("--id must contain only letters, numbers, underscores or hyphens");
const sourceUrl = values.input ? undefined : "https://www.youtube.com/watch?v=kYBHuw7ItSg";
const cache = path.join(root, ".local/motion-reference", values.id);
const destination = path.join(root, "apps/web/.motion-reference", values.id);
await mkdir(cache, { recursive: true });
await mkdir(destination, { recursive: true });
const input = values.input ? path.resolve(values.input) : path.join(cache, "reference.mp4");

async function run(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit" });
    child.on("error", reject);
    child.on("exit", (code) => (code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`))));
  });
}
async function exists(file) {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}
if (!(await exists(input))) {
  if (values.input) throw new Error(`Video not found: ${input}`);
  await run("yt-dlp", [
    "--no-playlist",
    "--newline",
    "--write-info-json",
    "-f",
    "bv*[height<=1080]+ba/b[height<=1080]",
    "--merge-output-format",
    "mp4",
    "-o",
    path.join(cache, "reference.%(ext)s"),
    sourceUrl,
  ]);
}
const probe = JSON.parse(
  execFileSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,avg_frame_rate,duration:format=duration",
      "-of",
      "json",
      input,
    ],
    { encoding: "utf8" },
  ),
);
const stream = probe.streams[0];
if (!stream) throw new Error("Video has no picture stream");
const [numerator, denominator] = stream.avg_frame_rate.split("/").map(Number);
const sourceSize = (await stat(input)).size;
const digest = createHash("sha256");
for await (const chunk of createReadStream(input)) digest.update(chunk);
const sourceHash = digest.digest("hex");
let previous;
try {
  previous = JSON.parse(await readFile(path.join(destination, "manifest.json"), "utf8"));
} catch (error) {
  if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
}
let timestamps;
const sameSource = previous?.sourceHash === sourceHash && previous?.frameWidth === 960;
if (!values.force && sameSource) timestamps = previous.timestamps;
else {
  console.log("Indexing every decoded frame (actual presentation timestamps)…");
  const frames = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "frame=best_effort_timestamp_time",
        "-of",
        "json",
        input,
      ],
      { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
    ),
  );
  timestamps = frames.frames.map((frame) => Number(frame.best_effort_timestamp_time));
}
if (
  !timestamps?.length ||
  !timestamps.every((time, index) => Number.isFinite(time) && (index === 0 || time > timestamps[index - 1]))
)
  throw new Error("Reference must have a finite, strictly increasing frame timeline");
const names = new Set(await readdir(destination));
const expected = timestamps.map((_, index) => `frame-${String(index).padStart(6, "0")}.jpg`);
if (values.force || !sameSource || !expected.every((name) => names.has(name))) {
  console.log(`Extracting ${timestamps.length} frames at 960 px (no FPS resampling)…`);
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    input,
    "-map",
    "0:v:0",
    "-vf",
    "scale=960:-1",
    "-fps_mode",
    "passthrough",
    "-q:v",
    "6",
    "-start_number",
    "0",
    path.join(destination, "frame-%06d.jpg"),
  ]);
  const extracted = new Set(await readdir(destination));
  if (!expected.every((name) => extracted.has(name))) throw new Error("Incomplete frame extraction");
  // A shorter replacement must also retire decoded pictures beyond its new timeline.
  const expectedNames = new Set(expected);
  await Promise.all(
    [...extracted]
      .filter((name) => /^frame-\d{6}\.jpg$/.test(name) && !expectedNames.has(name))
      .map((name) => unlink(path.join(destination, name))),
  );
}
const videoFile = path.extname(input).toLowerCase() === ".webm" ? "reference.webm" : "reference.mp4";
if (input !== path.join(destination, videoFile)) await copyFile(input, path.join(destination, videoFile));
const manifest = {
  version: 1,
  id: values.id,
  title: values.title ?? (sourceUrl ? "Necromon vs Justimon · BT23" : values.id),
  ...(sourceUrl ? { sourceUrl } : {}),
  sourceSize,
  sourceHash,
  videoFile,
  width: stream.width,
  height: stream.height,
  frameWidth: 960,
  frameHeight: Math.round((960 * stream.height) / stream.width),
  duration: Number(stream.duration ?? probe.format.duration),
  fps: numerator / denominator,
  timestamps,
};
await writeFile(path.join(destination, "manifest.json"), JSON.stringify(manifest) + "\n");
console.log(`Ready: ${timestamps.length} indexed frames. Open /dev/motion-reference?reference=${values.id}`);
