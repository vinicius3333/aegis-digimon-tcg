import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import ts from "typescript-api";
import { gunzipSync } from "node:zlib";
import { tempoOriginalMusic } from "./tempo-original-music.mjs";

// Exactly the renderer used to author the shipped bank, not an approximation of browser oscillators.
const source = await readFile(new URL("../../apps/web/src/design/audioRecipes.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const { bankRecipes, renderCue, renderMusic, MUSIC_BPM, decodeSourceWav } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
const masterSource = await readFile(new URL("../../apps/web/src/design/musicMaster.ts", import.meta.url), "utf8");
const masterCompiled = ts.transpileModule(masterSource, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
}).outputText;
const {
  decodeMusicWav,
  masterOriginalMusic,
  encodeMusicWav,
  musicMetrics: measureMusic,
} = await import(`data:text/javascript;base64,${Buffer.from(masterCompiled).toString("base64")}`);
const musicInputsRoot = new URL("../../apps/web/public/audio/music-candidates/", import.meta.url);
const musicProvenance = JSON.parse(await readFile(new URL("provenance.json", musicInputsRoot), "utf8"));
const directory = path.resolve(process.argv[2] ?? "apps/web/public/audio");
const sampleRate = Number(process.env.AUDIO_SAMPLE_RATE ?? 48000);
if (![44100, 48000].includes(sampleRate)) throw new Error("Choose 44100 or 48000 Hz");
await mkdir(path.join(directory, "previews"), { recursive: true });
function metrics(samples) {
  let peak = 0,
    sum = 0,
    square = 0,
    maximumStep = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    peak = Math.max(peak, Math.abs(value));
    sum += value;
    square += value * value;
    if (i) maximumStep = Math.max(maximumStep, Math.abs(value - samples[i - 1]));
  }
  return {
    seconds: samples.length / sampleRate,
    peak,
    peakDbFS: 20 * Math.log10(peak),
    rms: Math.sqrt(square / samples.length),
    dc: sum / samples.length,
    maximumStep,
    boundaryStep: Math.abs(samples.at(-1) - samples[0]),
  };
}
async function wav(name, samples) {
  const data = Buffer.alloc(44 + samples.length * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(sampleRate, 24);
  data.writeUInt32LE(sampleRate * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) data.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * 2);
  await writeFile(path.join(directory, name), data);
  return { ...metrics(samples), bytes: data.length, sha256: createHash("sha256").update(data).digest("hex") };
}
const sourcesDirectory = new URL("../../apps/web/public/audio/sources/", import.meta.url);
const sourceFiles = { paper: "paper-texture.wav", impact: "impact-body.wav", crystal: "crystal-rise.wav" };
const sources = { sampleRate: 44100 };
const sourceHashes = {};
for (const [key, file] of Object.entries(sourceFiles)) {
  const bytes = await readFile(new URL(file, sourcesDirectory));
  sources[key] = decodeSourceWav(bytes).samples;
  sourceHashes[file] = createHash("sha256").update(bytes).digest("hex");
}
const recipes = bankRecipes();
const clips = recipes.map((r) => renderCue(r.kind, r.details, "warm", sampleRate, sources));
const gap = Math.round(sampleRate * 0.025);
const bank = new Float32Array(clips.reduce((length, clip) => length + clip.length + gap, 0));
let frame = 0;
const cues = {};
const manifestClips = [];
for (let i = 0; i < clips.length; i++) {
  const clip = clips[i],
    recipe = recipes[i];
  bank.set(clip, frame);
  cues[recipe.key] = { offset: frame / sampleRate, duration: clip.length / sampleRate };
  manifestClips.push({ ...recipe, ...cues[recipe.key], metrics: metrics(clip) });
  frame += clip.length + gap;
}
const bankMetrics = await wav("aegis-cues-v2.wav", bank);
const baselineMetrics = await wav("aegis-music-v2.wav", renderMusic(sampleRate));
await mkdir(path.join(directory, "music-candidates"), { recursive: true });
const candidateRows = [
  {
    id: "current-clean-96",
    label: "Current clean 96 BPM",
    role: "baseline",
    url: `/audio/aegis-music-v2.wav?v=${baselineMetrics.sha256.slice(0, 12)}`,
    sha256: baselineMetrics.sha256,
    bpm: MUSIC_BPM,
    seconds: baselineMetrics.seconds,
    metrics: baselineMetrics,
    sourceIdentity: { type: "original-authored", rendererSha256: createHash("sha256").update(source).digest("hex") },
  },
];
let selectedMusic;
for (const candidate of musicProvenance.candidates) {
  const bytes = gunzipSync(await readFile(new URL(candidate.sourceFile, musicInputsRoot)));
  const hash = createHash("sha256").update(bytes).digest("hex");
  if (hash !== candidate.sourceSha256) throw new Error(`Original source identity changed: ${candidate.id}`);
  let mastered = masterOriginalMusic(decodeMusicWav(bytes), candidate.masterSettings, sampleRate);
  const selected = candidate.id === musicProvenance.selectedId;
  if (selected && musicProvenance.selectedTempo) {
    const oldBytes = encodeMusicWav(mastered);
    const oldHash = createHash("sha256").update(oldBytes).digest("hex");
    if (sampleRate === 48000 && oldHash !== musicProvenance.selectedTempo.sourceMasterSha256)
      throw new Error("Selected source master identity changed");
    const oldFile = "music-candidates/warm-drive-104.wav";
    await writeFile(path.join(directory, oldFile), oldBytes);
    candidateRows.push({
      id: "warm-drive-104",
      label: "Prior warm drive · 104 BPM",
      role: "alternative",
      file: oldFile,
      url: `/audio/${oldFile}?v=${oldHash.slice(0, 12)}`,
      sha256: oldHash,
      bpm: candidate.masterSettings.bpm,
      seconds: mastered.channels[0].length / sampleRate,
      metrics: { ...measureMusic(decodeMusicWav(oldBytes)), bytes: oldBytes.length },
      sourceIdentity: { type: "original-text-generation", sha256: candidate.sourceSha256 },
    });
    mastered = tempoOriginalMusic(mastered, musicProvenance.selectedTempo.fromBpm, musicProvenance.selectedTempo.bpm);
  }
  const encoded = encodeMusicWav(mastered),
    sha256 = createHash("sha256").update(encoded).digest("hex");
  const file = selected ? "aegis-music-v3.wav" : `music-candidates/${candidate.id}.wav`;
  await writeFile(path.join(directory, file), encoded);
  const row = {
    id: candidate.id,
    label: selected ? "Warm drive · steady 112 BPM" : candidate.label,
    role: selected ? "selected" : "alternative",
    file,
    url: `/audio/${file}?v=${sha256.slice(0, 12)}`,
    sha256,
    bpm: selected ? (musicProvenance.selectedTempo?.bpm ?? candidate.masterSettings.bpm) : candidate.masterSettings.bpm,
    seconds: mastered.channels[0].length / sampleRate,
    metrics: { ...measureMusic(decodeMusicWav(encoded)), bytes: encoded.length },
    sourceIdentity: {
      type: "original-text-generation",
      sha256: candidate.sourceSha256,
      seed: candidate.seed,
      prompt: candidate.prompt,
    },
    sourceBpm: candidate.sourceBpm,
    tempoConfidence: candidate.tempoConfidence,
    boundaryChromaCosine: candidate.boundaryChromaCosine,
    masterSettings: candidate.masterSettings,
    ...(selected && musicProvenance.selectedTempo ? { tempoAdjustment: musicProvenance.selectedTempo } : {}),
  };
  candidateRows.push(row);
  if (selected) selectedMusic = row;
}
if (!selectedMusic) throw new Error("No original selected score");
const musicMetrics = { ...selectedMusic.metrics, sha256: selectedMusic.sha256 };
const candidatesManifest = {
  version: 1,
  selectedId: selectedMusic.id,
  runtimeUrl: selectedMusic.url,
  candidates: candidateRows,
  reference: {
    url: musicProvenance.reference.referenceUrl,
    diagnosticPath: "/tmp/aegis-audio-reference/MuhkUzGAeHA/reference.wav",
    sha256: musicProvenance.reference.sourceSha256,
    seconds: musicProvenance.reference.duration,
  },
  selectionReason: musicProvenance.selectionReason,
  listeningStatus: "Measured verification only; user/validator listening acceptance remains",
};
await writeFile(
  path.join(directory, "music-candidates/manifest.json"),
  JSON.stringify(candidatesManifest, null, 2) + "\n",
);
const examples = [
  ["draw", {}],
  ["cardPlay", { cost: 12 }],
  ["effectActivate", {}],
  ["digivolve", { sourceLevel: 3, targetLevel: 6 }],
  ["impact", {}],
  ["securityHit", {}],
];
const previewMetrics = {};
for (const direction of ["warm", "crisp"]) {
  const preview = new Float32Array(sampleRate * 12);
  for (let i = 0; i < examples.length; i++)
    preview.set(renderCue(...examples[i], direction, sampleRate, sources), Math.round((i * 2 + 0.15) * sampleRate));
  previewMetrics[direction] = await wav(`previews/${direction}-six-cues.wav`, preview);
}
const manifest = {
  version: 2,
  original: true,
  renderer: "apps/web/src/design/audioRecipes.ts",
  rendererSha256: createHash("sha256").update(source).digest("hex"),
  sampleRate,
  channels: 1,
  seedMethod: "FNV-1a cue identity followed by xorshift32",
  selectedDirection: "warm",
  sourceHashes,
  sourceProvenance: "sources/provenance.json",
  directionReason:
    "Damped bodies, softer paper bandwidth and longer resonant tails support tactile card actions without piercing transients",
  bank: { file: "aegis-cues-v2.wav", ...bankMetrics },
  music: {
    file: selectedMusic.file,
    bpm: selectedMusic.bpm,
    original: true,
    selectedId: selectedMusic.id,
    sourceProvenance: "music-candidates/provenance.json",
    masteringRenderer: "apps/web/src/design/musicMaster.ts",
    masteringRendererSha256: createHash("sha256").update(masterSource).digest("hex"),
    composition:
      "Original text-generated melodic guitar/keys/bass score; steady112 BPM, offline pitch-preserving tempo adjustment from the original 104 master, no reference audio conditioning",
    ...musicMetrics,
  },
  previews: previewMetrics,
  clips: manifestClips,
};
await writeFile(path.join(directory, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
// Static offsets are bundled; no manifest request or recipe rendering happens at cue time.
if (!process.argv[2])
  await writeFile(
    new URL("../../apps/web/src/design/audioBank.ts", import.meta.url),
    `// Generated by tools/diagnostics/render-original-audio.mjs; do not edit offsets.\nexport const AUDIO_BANK_URL = "/audio/aegis-cues-v2.wav?v=${bankMetrics.sha256.slice(0, 12)}";\nexport const MUSIC_URL = "${selectedMusic.url}";\nexport const AUDIO_CUES: Record<string, { offset: number; duration: number }> = ${JSON.stringify(cues, null, 2)};\n`,
  );
await writeFile(
  path.join(directory, "previews/index.html"),
  `<!doctype html><html lang="en"><meta charset="utf-8"><title>Aegis authored audio directions</title><style>body{background:#0b1020;color:#dceaff;font:16px system-ui;max-width:760px;margin:48px auto;padding:24px}audio{width:100%}li{margin:6px}</style><h1>Original Aegis audio directions</h1><p>Same authored renderer as the game. Six cues at two-second intervals: draw, cost-12 play, activation, level-3 to level-6 evolution, impact, security crack. Warm tactile is applied; crisp restrained is the alternative.</p><h2>Warm tactile</h2><audio controls src="warm-six-cues.wav?v=${previewMetrics.warm.sha256.slice(0, 12)}"></audio><h2>Crisp restrained</h2><audio controls src="crisp-six-cues.wav?v=${previewMetrics.crisp.sha256.slice(0, 12)}"></audio><h2>Steady match music</h2><p>Selected original steady 112 BPM seamless composition. Set the player volume near 25% to approximate the default music bus.</p><audio controls loop src="..${selectedMusic.url.slice(6)}"></audio><p><a href="../manifest.json">Original-generation manifest and measured levels</a></p></html>`,
);
console.log(
  JSON.stringify(
    {
      directory,
      clipCount: clips.length,
      bank: bankMetrics,
      music: musicMetrics,
      previews: previewMetrics,
    },
    null,
    2,
  ),
);
