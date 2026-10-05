import { readFile, mkdir, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";

// Optional offline generation. Playback and deterministic mastering use the committed original inputs.
const root = path.resolve(process.env.AUDIO_GENERATION_ROOT ?? "/tmp/aegis-audio-generation");
const output = path.resolve(process.argv[2] ?? path.join(root, "regenerated-scores"));
const provenance = JSON.parse(
  await readFile(new URL("../../apps/web/public/audio/music-candidates/provenance.json", import.meta.url), "utf8"),
);
await mkdir(output, { recursive: true });
const results = [];
for (const candidate of provenance.candidates) {
  const args = [
    path.join(root, "source/scripts/sa3_mlx.py"),
    "--dit",
    "sm-music",
    "--decoder",
    "same-s",
    "--seconds",
    "40",
    "--seed",
    String(candidate.seed),
    "--steps",
    "8",
    "--cfg",
    "1.8",
    "--negative-prompt",
    provenance.generator.negativePrompt,
    "--prompt",
    candidate.prompt,
    "--out",
    path.join(output, `${candidate.id}.wav`),
  ];
  const started = performance.now();
  const result = spawnSync(path.join(root, "venv/bin/python"), args, {
    encoding: "utf8",
    timeout: 90000,
    maxBuffer: 2_000_000,
    env: {
      ...process.env,
      HF_HOME: path.join(root, "hf-home"),
      HF_HUB_DISABLE_IMPLICIT_TOKEN: "1",
      HF_HUB_OFFLINE: "1",
    },
  });
  await writeFile(path.join(output, `${candidate.id}.log`), `${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  results.push({
    id: candidate.id,
    seed: candidate.seed,
    command: [path.join(root, "venv/bin/python"), ...args],
    status: result.status,
    error: result.error?.message,
    seconds: (performance.now() - started) / 1000,
  });
  await writeFile(path.join(output, "generation.json"), JSON.stringify(results, null, 2) + "\n");
  if (result.status !== 0) throw new Error(`Original score generation failed: ${candidate.id}; see ${output}`);
  console.log(`${candidate.id} generated in ${results.at(-1).seconds.toFixed(2)}s`);
}
