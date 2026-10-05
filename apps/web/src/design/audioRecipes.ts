/** Original seeded synthesis. This is the authoritative game AND offline-preview renderer. */
export const SOUND_KINDS = [
  "select",
  "nav",
  "confirm",
  "attack",
  "error",
  "success",
  "cardPlay",
  "digivolve",
  "attackDeclare",
  "securityHit",
  "turnChange",
  "endTurn",
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
  "impact",
  "buff",
  "debuff",
  "freeze",
  "recover",
  "group",
  "win",
  "lose",
] as const;
export type SoundKind = (typeof SOUND_KINDS)[number];
export interface SoundDetails {
  cost?: number;
  sourceLevel?: number;
  targetLevel?: number;
  assembly?: boolean;
}
export type AudioDirection = "warm" | "crisp";
type Texture = "paper" | "air" | "grain" | "body" | "pluck" | "glass" | "pad" | "recording";
export interface AudioSources {
  sampleRate: number;
  paper: Float32Array;
  impact: Float32Array;
  crystal: Float32Array;
}
export interface AudioLayer {
  texture: Texture;
  at: number;
  duration: number;
  gain: number;
  hz: number;
  endHz?: number;
  source?: "impact" | "crystal";
}
export interface AudioRecipe {
  key: string;
  kind: SoundKind;
  details: SoundDetails;
  layers: AudioLayer[];
  duration: number;
}
const finite = (n: number | undefined, fallback: number, low: number, high: number) =>
  Math.round(Math.min(high, Math.max(low, Number.isFinite(n) ? n! : fallback)));
export function cueKey(kind: SoundKind, details: SoundDetails = {}): string {
  if (kind === "cardPlay")
    return `${kind}-${finite(details.cost, 5, 0, 15)}-${details.assembly ? "assembly" : "plain"}`;
  if (kind === "digivolve")
    return `${kind}-${finite(details.sourceLevel, 3, 1, 7)}-${finite(details.targetLevel, 4, 2, 7)}`;
  return kind;
}
const midi = (note: number) => 440 * 2 ** ((note - 69) / 12);
export function audioRecipe(
  kind: SoundKind,
  details: SoundDetails = {},
  direction: AudioDirection = "warm",
): AudioRecipe {
  const layers: AudioLayer[] = [];
  const brightness = direction === "warm" ? 0.82 : 1.12;
  const add = (texture: Texture, at: number, duration: number, gain: number, hz: number, endHz?: number) =>
    layers.push({
      texture,
      at,
      duration: duration * (direction === "crisp" && texture !== "pad" ? 0.8 : 1),
      gain: gain * (direction === "crisp" ? 0.82 : 1),
      hz: texture === "body" ? hz : hz * brightness,
      endHz,
    });
  const paper = (at = 0, length = 0.16, gain = 0.18) => add("paper", at, length, gain, 2100);
  const notes = (values: number[], gap = 0.095, gain = 0.11, at = 0, texture: Texture = "pluck") =>
    values.forEach((note, index) => add(texture, at + index * gap, 0.38, gain, midi(note)));
  switch (kind) {
    case "draw":
      paper(0, 0.115, 0.16);
      paper(0.048, 0.045, 0.065);
      add("body", 0.012, 0.055, 0.035, 330, 260);
      break;
    case "move":
      paper(0, 0.23, 0.13);
      add("body", 0.16, 0.1, 0.07, 210, 160);
      break;
    case "handTrash":
      paper(0, 0.17, 0.15);
      add("grain", 0.075, 0.085, 0.045, 700);
      add("pluck", 0.06, 0.15, 0.035, midi(57), midi(50));
      break;
    case "sourceTrash":
      [0, 0.042, 0.087].forEach((at) => paper(at, 0.07, 0.1));
      add("body", 0.11, 0.065, 0.04, 230, 180);
      break;
    case "shuffle":
      [0, 0.07, 0.14, 0.23, 0.31].forEach((at, i) => paper(at, 0.095, 0.13 - i * 0.009));
      break;
    case "group":
      paper(0, 0.12, 0.12);
      paper(0.085, 0.12, 0.12);
      add("body", 0.18, 0.16, 0.1, 170, 130);
      break;
    case "cardPlay": {
      const weight = finite(details.cost, 5, 0, 15) / 15;
      paper(0, 0.1, 0.17);
      add("body", 0.035, 0.18 + weight * 0.18, 0.15 + weight * 0.12, 190 - weight * 85, 65 - weight * 20);
      add("grain", 0.025, 0.075 + weight * 0.065, 0.09 + weight * 0.05, 950);
      add("pluck", 0.025, 0.14, 0.028, midi(55));
      if (details.assembly) {
        add("body", 0.12, 0.12, 0.08, 310, 210);
        notes([55, 62, 67], 0.06, 0.065, 0.16, "glass");
      }
      break;
    }
    case "digivolve": {
      const source = finite(details.sourceLevel, 3, 1, 7),
        target = finite(details.targetLevel, 4, 2, 7);
      const jump = Math.max(1, target - source),
        root = 45 + target * 2;
      paper(0, 0.09, 0.085);
      add("air", 0, 0.24 + jump * 0.018, 0.075, 1700);
      notes([root - 7 - jump, root - 3, root, root + 7], 0.065 + jump * 0.01, 0.085, 0.06);
      add("pad", 0.25 + jump * 0.035, 0.38 + target * 0.02, 0.06, midi(root));
      add("glass", 0.32 + jump * 0.035, 0.32, 0.045, midi(root + 12));
      break;
    }
    case "attackDeclare":
      add("air", 0, 0.32, 0.21, 1350);
      add("body", 0.08, 0.21, 0.12, 95, 180);
      break;
    case "attack":
    case "impact":
      add("body", 0, 0.28, 0.32, 155, 48);
      add("grain", 0.005, 0.16, 0.26, 1200);
      break;
    case "securityHit":
      add("grain", 0, 0.12, 0.23, 3400);
      [59, 66, 73].forEach((n, i) => add("glass", i * 0.025, 0.36, 0.09, midi(n)));
      break;
    case "delete":
      add("body", 0, 0.34, 0.19, 140, 38);
      add("grain", 0.07, 0.52, 0.13, 800);
      add("air", 0.12, 0.48, 0.06, 1800);
      break;
    case "deDigivolve":
      [69, 64, 57, 50].forEach((note, i) => add("pluck", i * 0.06, 0.22, 0.075, midi(note)));
      [0, 0.055].forEach((at) => paper(at, 0.08, 0.1));
      add("body", 0.15, 0.08, 0.045, 180, 120);
      break;
    case "effectActivate":
      paper(0, 0.055, 0.06);
      add("air", 0, 0.12, 0.045, 2300);
      [67, 74].forEach((note, i) => add("glass", 0.012 + i * 0.065, 0.25, 0.075, midi(note)));
      break;
    case "effectFocus":
      paper(0, 0.045, 0.045);
      add("pluck", 0.006, 0.16, 0.045, midi(62));
      add("glass", 0.035, 0.2, 0.055, midi(62));
      break;
    case "hatch":
      paper(0, 0.1, 0.11);
      notes([55, 62, 67], 0.09, 0.085, 0.04);
      break;
    case "reveal":
      paper(0, 0.14, 0.11);
      add("glass", 0.07, 0.34, 0.075, midi(69));
      break;
    case "endTurn":
      paper(0, 0.055, 0.055);
      [62, 57].forEach((note, i) => add("pluck", i * 0.11, 0.27, 0.075, midi(note)));
      add("body", 0.025, 0.11, 0.05, 120, 100);
      break;
    case "turnChange":
      notes([50, 57, 62], 0.11, 0.09);
      break;
    case "buff":
      notes([60, 64, 67], 0.07, 0.08);
      add("air", 0.04, 0.25, 0.05, 1500);
      break;
    case "debuff":
      notes([62, 58, 53], 0.075, 0.085);
      break;
    case "freeze":
      add("grain", 0, 0.19, 0.085, 2600);
      notes([65, 66], 0.03, 0.065, 0.03, "glass");
      break;
    case "recover":
      notes([55, 62, 64, 67], 0.08, 0.07);
      add("pad", 0.16, 0.42, 0.045, midi(55));
      break;
    case "win":
      notes([55, 62, 67, 71, 74], 0.12, 0.09);
      add("pad", 0.25, 0.9, 0.07, midi(55));
      break;
    case "lose":
      notes([57, 53, 50], 0.17, 0.085);
      add("pad", 0.12, 0.7, 0.05, midi(38));
      break;
    case "select":
      paper(0, 0.035, 0.075);
      add("pluck", 0, 0.075, 0.065, midi(67));
      break;
    case "nav":
      paper(0, 0.055, 0.08);
      add("body", 0, 0.065, 0.045, 270, 240);
      break;
    case "confirm":
      notes([62, 69], 0.06, 0.07);
      break;
    case "error":
      add("body", 0, 0.12, 0.09, 180, 145);
      add("body", 0.1, 0.12, 0.07, 145, 120);
      break;
    case "success":
      notes([62, 66, 69], 0.08, 0.075);
      break;
  }
  if (["attack", "impact", "cardPlay"].includes(kind))
    layers.push({
      texture: "recording",
      source: "impact",
      at: 0.012,
      duration: kind === "cardPlay" ? 0.2 : direction === "warm" ? 0.3 : 0.23,
      gain: kind === "cardPlay" ? 0.22 : 0.28,
      hz: 1,
    });
  if (["effectActivate", "digivolve", "hatch", "securityHit", "reveal"].includes(kind))
    layers.push({
      texture: "recording",
      source: "crystal",
      at: 0.025,
      duration: kind === "digivolve" ? 0.4 : kind === "effectActivate" ? 0.22 : 0.3,
      gain: ["digivolve", "effectActivate"].includes(kind) ? 0.26 : direction === "warm" ? 0.32 : 0.25,
      hz: 1,
    });
  return {
    key: cueKey(kind, details),
    kind,
    details,
    layers,
    duration: Math.max(...layers.map((l) => l.at + l.duration)) + 0.045,
  };
}
function seedFrom(text: string): number {
  let seed = 2166136261;
  for (const char of text) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return seed >>> 0;
}
/** Sum authored modal instruments and band-limited seeded foley; original generated material sources are optional inputs, never copied recordings. */
function renderLayers(
  layers: AudioLayer[],
  duration: number,
  sampleRate: number,
  seed: number,
  loop = false,
  sources?: AudioSources,
): Float32Array {
  const output = new Float32Array(Math.round(duration * sampleRate));
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 2147483648 - 1;
  };
  for (const layer of layers) {
    let low = 0,
      high = 0,
      phase = 0;
    const frames = Math.round(layer.duration * sampleRate),
      start = Math.round(layer.at * sampleRate);
    const slow = 1 - Math.exp((-2 * Math.PI * layer.hz * 0.16) / sampleRate);
    const fast = 1 - Math.exp((-2 * Math.PI * Math.min(6500, layer.hz * 1.4)) / sampleRate);
    for (let frame = 0; frame < frames; frame++) {
      const t = frame / sampleRate,
        progress = t / layer.duration;
      const attack = layer.texture === "pad" ? 0.45 : layer.texture === "air" ? layer.duration * 0.45 : 0.003;
      const fade = Math.min(1, t / attack, (layer.duration - t) / 0.018);
      let value: number, envelope: number;
      if (layer.texture === "recording") {
        const source = layer.source && sources?.[layer.source];
        if (!source) continue;
        const position = progress * (source.length - 1),
          left = Math.floor(position),
          fraction = position - left;
        value = source[left]! * (1 - fraction) + (source[left + 1] ?? 0) * fraction;
        envelope = 1;
      } else if (layer.texture === "paper" || layer.texture === "air" || layer.texture === "grain") {
        const noise = random();
        low += slow * (noise - low);
        high += fast * (noise - high);
        value = (high - low) * 1.7;
        if (layer.texture === "paper") {
          value *= 0.45 + 0.55 * Math.sin(t * 2 * Math.PI * 37 + Math.sin(t * 53)) ** 2;
          if (sources?.paper) {
            const position = progress * (sources.paper.length - 1),
              left = Math.floor(position),
              fraction = position - left;
            const material = sources.paper[left]! * (1 - fraction) + (sources.paper[left + 1] ?? 0) * fraction;
            value = value * 0.18 + material * 3.5;
          }
        }
        envelope =
          layer.texture === "air"
            ? Math.sin(Math.PI * progress) ** 1.5
            : Math.exp(-progress * (layer.texture === "paper" ? 3 : 5));
      } else {
        const frequency = layer.hz * ((layer.endHz ?? layer.hz) / layer.hz) ** progress;
        phase += (2 * Math.PI * frequency) / sampleRate;
        if (layer.texture === "body")
          value = Math.sin(phase) * 0.8 + Math.sin(phase * 1.9) * 0.15 + Math.sin(phase * 3.1) * 0.05;
        else if (layer.texture === "glass")
          value =
            Math.sin(phase) * 0.62 +
            Math.sin(phase * 2.76) * 0.23 * Math.exp(-t * 12) +
            Math.sin(phase * 4.07) * 0.15 * Math.exp(-t * 18);
        else if (layer.texture === "pad")
          value = (Math.sin(phase) + Math.sin(phase * 1.002) * 0.4 + Math.sin(phase * 2) * 0.18) / 1.58;
        else
          value =
            Math.sin(phase) * 0.64 +
            Math.sin(phase * 2) * 0.23 * Math.exp(-t * 9) +
            Math.sin(phase * 3) * 0.13 * Math.exp(-t * 14);
        envelope =
          layer.texture === "pad"
            ? Math.sin(Math.PI * progress) ** 2
            : Math.exp(-progress * (layer.texture === "body" ? 7 : 5));
      }
      const index = loop ? (start + frame) % output.length : start + frame;
      if (index < output.length) output[index]! += value * envelope * Math.max(0, fade) * layer.gain;
    }
  }
  // Remove DC with a causal 12 Hz high-pass. Finite cues also have smooth boundary fades.
  if (!loop) {
    let previous = 0,
      filtered = 0;
    const coefficient = Math.exp((-2 * Math.PI * 12) / sampleRate);
    for (let i = 0; i < output.length; i++) {
      const input = output[i]!;
      filtered = coefficient * (filtered + input - previous);
      previous = input;
      output[i] = filtered * Math.min(1, i / (sampleRate * 0.002), (output.length - 1 - i) / (sampleRate * 0.025));
    }
  } else {
    const mean = output.reduce((sum, sample) => sum + sample, 0) / output.length;
    for (let i = 0; i < output.length; i++) output[i]! -= mean;
  }
  // Gentle fixed saturation, never per-clip normalization: preserve intentional weight differences.
  for (let i = 0; i < output.length; i++) output[i] = Math.tanh(output[i]! * 1.15) * 0.8;
  return output;
}
export function renderCue(
  kind: SoundKind,
  details: SoundDetails = {},
  direction: AudioDirection = "warm",
  sampleRate = 48000,
  sources?: AudioSources,
): Float32Array {
  const recipe = audioRecipe(kind, details, direction);
  return renderLayers(
    recipe.layers,
    recipe.duration,
    sampleRate,
    seedFrom(`${recipe.key}-${direction}`),
    false,
    sources,
  );
}
export const MUSIC_BPM = 96;
export const MUSIC_SECONDS = (32 * 60) / MUSIC_BPM;
function musicStemLayers(stem: "bed" | "detail" | "pulse"): AudioLayer[] {
  const layers: AudioLayer[] = [];
  const beatSeconds = 60 / MUSIC_BPM;
  // Eight bars at 96 BPM: Gmaj9, Em9, Cmaj9, Dsus/add9. All stems share this circular grid.
  const chords = [
    [43, 50, 59, 66],
    [40, 47, 55, 62],
    [36, 43, 52, 59],
    [38, 45, 55, 64],
  ];
  chords.forEach((chord, bar) => {
    if (stem === "bed") {
      chord.forEach((note, i) =>
        layers.push({
          texture: "pad",
          at: bar * 8 * beatSeconds + i * 0.06,
          duration: 10 * beatSeconds,
          gain: 0.017 / (1 + i * 0.3),
          hz: midi(note),
        }),
      );
    }
    for (let beat = 0; beat < 8; beat++) {
      if (stem === "detail") {
        const note = chord[[1, 2, 3, 2, 1, 3, 2, 3][beat]!]! + 12;
        layers.push({
          texture: "pluck",
          at: (bar * 8 + beat + 0.25) * beatSeconds,
          duration: 1.65,
          gain: beat % 2 ? 0.024 : 0.04,
          hz: midi(note),
        });
        if (beat === 3 || beat === 6)
          layers.push({
            texture: "glass",
            at: (bar * 8 + beat + 0.75) * beatSeconds,
            duration: 1.2,
            gain: 0.018,
            hz: midi(chord[2]! + 19),
          });
      }
      if (stem === "pulse") {
        layers.push({
          texture: "body",
          at: (bar * 8 + beat) * beatSeconds,
          duration: 0.28,
          gain: beat % 2 === 0 ? 0.045 : 0.018,
          hz: 80,
          endHz: 50,
        });
      }
    }
  });
  return layers;
}
export function musicRecipe(): AudioLayer[] {
  return [...musicStemLayers("bed"), ...musicStemLayers("detail"), ...musicStemLayers("pulse")];
}
/** One steady complete original arrangement; runtime and preview use this exact PCM. */
export function renderMusic(sampleRate = 48000): Float32Array {
  return renderLayers(musicRecipe(), MUSIC_SECONDS, sampleRate, 0xa391e52, true);
}
/** Bounded variations retain printed-cost weight and physical source/target level differences. */
export function bankRecipes(): AudioRecipe[] {
  const recipes = SOUND_KINDS.filter((kind) => kind !== "cardPlay" && kind !== "digivolve").map((kind) =>
    audioRecipe(kind),
  );
  for (let cost = 0; cost <= 15; cost++)
    for (const assembly of [false, true]) recipes.push(audioRecipe("cardPlay", { cost, assembly }));
  for (let sourceLevel = 1; sourceLevel <= 7; sourceLevel++)
    for (let targetLevel = 2; targetLevel <= 7; targetLevel++)
      recipes.push(audioRecipe("digivolve", { sourceLevel, targetLevel }));
  return recipes;
}

/** Portable PCM16 WAV source loader, shared by deterministic authoring and source-identity tests. */
export function decodeSourceWav(bytes: Uint8Array): { samples: Float32Array; sampleRate: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let channels = 0,
    sampleRate = 0,
    dataOffset = 0,
    dataLength = 0;
  const tag = (at: number) => String.fromCharCode(...bytes.slice(at, at + 4));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Expected WAV");
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const length = view.getUint32(offset + 4, true);
    if (tag(offset) === "fmt ") {
      if (view.getUint16(offset + 8, true) !== 1 || view.getUint16(offset + 22, true) !== 16)
        throw new Error("Expected PCM16");
      channels = view.getUint16(offset + 10, true);
      sampleRate = view.getUint32(offset + 12, true);
    }
    if (tag(offset) === "data") {
      dataOffset = offset + 8;
      dataLength = length;
    }
    offset += 8 + length + (length % 2);
  }
  if (!channels || !sampleRate || !dataOffset || dataOffset + dataLength > bytes.length)
    throw new Error("Invalid PCM source");
  const samples = new Float32Array(dataLength / (channels * 2));
  for (let i = 0; i < samples.length; i++)
    for (let channel = 0; channel < channels; channel++)
      samples[i]! += view.getInt16(dataOffset + (i * channels + channel) * 2, true) / (32768 * channels);
  return { samples, sampleRate };
}
