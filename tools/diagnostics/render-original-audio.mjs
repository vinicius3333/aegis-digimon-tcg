import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript-api";

// A listenable preview built from the shipped recipes; no browser or native audio required.
const source = await readFile(new URL("../../apps/web/src/design/sound.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { soundTones } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const directory = path.resolve(process.argv[2] ?? "/tmp/aegis-original-audio");
await mkdir(directory, { recursive: true });
const sampleRate = 22050;
const examples = [
  ["cardPlay", { cost: 2 }],
  ["cardPlay", { cost: 14 }],
  ["cardPlay", { cost: 14, assembly: true }],
  ["digivolve", { sourceLevel: 3, targetLevel: 4 }],
  ["digivolve", { sourceLevel: 3, targetLevel: 6 }],
  ...[
    "hatch",
    "effectFocus",
    "effectActivate",
    "handTrash",
    "sourceTrash",
    "deDigivolve",
    "delete",
    "move",
    "draw",
    "shuffle",
    "reveal",
    "attackDeclare",
    "impact",
    "securityHit",
    "buff",
    "debuff",
    "freeze",
    "recover",
    "group",
    "endTurn",
    "turnChange",
    "win",
    "lose",
  ].map((kind) => [kind, {}]),
];
function writeWav(name, samples) {
  const result = Buffer.alloc(44 + samples.length * 2);
  result.write("RIFF", 0);
  result.writeUInt32LE(result.length - 8, 4);
  result.write("WAVEfmt ", 8);
  result.writeUInt32LE(16, 16);
  result.writeUInt16LE(1, 20);
  result.writeUInt16LE(1, 22);
  result.writeUInt32LE(sampleRate, 24);
  result.writeUInt32LE(sampleRate * 2, 28);
  result.writeUInt16LE(2, 32);
  result.writeUInt16LE(16, 34);
  result.write("data", 36);
  result.writeUInt32LE(samples.length * 2, 40);
  let peak = 0;
  for (const [index, value] of samples.entries()) {
    peak = Math.max(peak, Math.abs(value));
    result.writeInt16LE(Math.round(Math.min(1, Math.max(-1, value)) * 32767), 44 + index * 2);
  }
  return writeFile(path.join(directory, name), result).then(() => ({
    name,
    seconds: samples.length / sampleRate,
    peak,
  }));
}
const cues = new Float32Array(Math.ceil((examples.length * 0.8 + 0.5) * sampleRate));
for (const [index, [kind, details]] of examples.entries()) {
  for (const tone of soundTones(kind, details)) {
    let phase = 0;
    const start = Math.round((index * 0.8 + 0.1 + (tone.delay ?? 0)) * sampleRate);
    for (let frame = 0; frame < tone.duration * sampleRate; frame++) {
      const time = frame / sampleRate;
      const frequency = tone.from * (tone.to / tone.from) ** (time / tone.duration);
      phase += frequency / sampleRate;
      const wave =
        tone.type === "triangle"
          ? (2 / Math.PI) * Math.asin(Math.sin(phase * Math.PI * 2))
          : Math.sin(phase * Math.PI * 2);
      const envelope =
        time < 0.008
          ? 0.0001 * (tone.gain / 0.0001) ** (time / 0.008)
          : tone.gain * (0.0001 / tone.gain) ** ((time - 0.008) / (tone.duration - 0.008));
      cues[start + frame] += wave * envelope * 0.7;
    }
  }
}
const ambience = new Float32Array(sampleRate * 16);
for (let frame = 0; frame < ambience.length; frame++) {
  const time = frame / sampleRate;
  let sample = 0;
  for (const [index, frequency] of [98, 146.8324, 196].entries())
    sample +=
      (Math.sin(time * frequency * 2 * Math.PI) *
        (0.023 + 0.009 * Math.sin(time * (0.08 + index * 0.023) * 2 * Math.PI))) /
      (index + 1);
  const fade = Math.min(1, time, 16 - time);
  ambience[frame] = sample * 0.25 * fade;
}
const results = await Promise.all([writeWav("original-cues.wav", cues), writeWav("original-ambience.wav", ambience)]);
await writeFile(
  path.join(directory, "index.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>Aegis original audio sampler</title><style>body{background:#0b1020;color:#dceaff;font:16px system-ui;max-width:760px;margin:48px auto;padding:24px}audio{width:100%}li{margin:6px}</style><h1>Aegis original audio sampler</h1><p>Original procedural cues, one every 0.8 seconds. Ambience uses the default 25% level.</p><audio controls src="original-cues.wav"></audio><ol>${examples.map(([kind, details]) => `<li>${kind} ${Object.keys(details).length ? JSON.stringify(details) : ""}</li>`).join("")}</ol><h2>Match ambience</h2><audio controls loop src="original-ambience.wav"></audio></html>`,
);
console.log(JSON.stringify({ directory, results }, null, 2));
