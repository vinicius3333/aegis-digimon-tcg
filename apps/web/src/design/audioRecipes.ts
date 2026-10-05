/** Aegis cue arrangements of licensed CC0 recorded foley; offline authoring and preview share finished PCM. */
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
export const FOLEY_SECONDS = {
  touch: 0.08127083333333333,
  contact: 0.270875,
  cut: 0.13629166666666667,
  shuffle: 0.551375,
  bridge: 1.7311458333333334,
  placeLight: 0.17166666666666666,
  placeFirm: 0.21627083333333333,
  placeHeavy: 0.236625,
  placeStack: 0.5069583333333333,
  slide: 0.121375,
  slideAway: 0.5039583333333333,
  slideBack: 0.5802708333333333,
  flick: 0.2011875,
  shove: 0.7642916666666667,
  shoveFirm: 0.7556458333333333,
  fan: 0.7208333333333333,
  riffle: 2.9185,
  tap: 0.07502083333333333,
  stack: 0.07533333333333334,
  clack: 0.07527083333333333,
  pack: 0.7764166666666666,
} as const;
export type FoleyKind = keyof typeof FOLEY_SECONDS;
export interface AudioSources {
  sampleRate: number;
  paper: Float32Array;
  impact: Float32Array;
  crystal: Float32Array;
  recordings?: Partial<Record<FoleyKind, { samples: Float32Array; sampleRate: number }>>;
}
export interface AudioLayer {
  texture: Texture;
  at: number;
  duration: number;
  gain: number;
  hz: number;
  endHz?: number;
  source?: "impact" | "crystal" | FoleyKind;
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
  const play = (source: FoleyKind, at = 0, gain = 0.4, length = FOLEY_SECONDS[source]) =>
    layers.push({
      texture: "recording",
      source,
      at,
      duration: length,
      gain: gain * (direction === "crisp" ? 0.88 : 1),
      hz: 1,
    });
  switch (kind) {
    case "select":
      play("touch", 0, 0.22);
      break;
    case "nav":
      play("cut", 0, 0.2);
      break;
    case "effectFocus":
      play("touch", 0, 0.25);
      play("slide", 0.024, 0.1);
      break;
    case "draw":
      play("slide", 0, 0.38);
      break;
    case "move":
      play("slideBack", 0, 0.32);
      break;
    case "handTrash":
      play("slideAway", 0, 0.34);
      break;
    case "sourceTrash":
      play("cut", 0, 0.32);
      play("contact", 0.055, 0.25);
      break;
    case "shuffle":
      play("shuffle", 0, 0.36);
      break;
    case "group":
      play("cut", 0, 0.32);
      play("placeStack", 0.08, 0.29);
      break;
    case "cardPlay": {
      const cost = finite(details.cost, 5, 0, 15),
        weight = cost / 15;
      const placement: FoleyKind =
        cost <= 3 ? "placeLight" : cost <= 8 ? "placeFirm" : cost <= 12 ? "placeHeavy" : "placeStack";
      play(placement, 0, 0.36 + weight * 0.16);
      if (details.assembly) {
        play("cut", 0.045, 0.18);
        play("stack", 0.145, 0.14);
      }
      break;
    }
    case "digivolve": {
      const source = finite(details.sourceLevel, 3, 1, 7),
        target = finite(details.targetLevel, 4, 2, 7);
      const jump = Math.max(1, target - source),
        stages = Math.min(4, jump + 1),
        gap = 0.062 + source * 0.006;
      const gestures: FoleyKind[] = ["slide", "cut", "flick", "placeFirm"];
      for (let i = 0; i < stages; i++) play(gestures[i]!, i * gap, 0.22 + i * 0.04);
      play(target >= 6 ? "placeStack" : target >= 4 ? "placeHeavy" : "placeLight", stages * gap, 0.3 + target * 0.018);
      play("stack", stages * gap + 0.035, 0.1 + target * 0.008);
      break;
    }
    case "deDigivolve":
      play("cut", 0, 0.33);
      play("flick", 0.065, 0.28);
      play("slideAway", 0.125, 0.24);
      break;
    case "attackDeclare":
      play("shove", 0, 0.36);
      break;
    case "attack":
    case "impact":
      play("placeHeavy", 0, 0.52);
      play("clack", 0.006, 0.12);
      break;
    case "securityHit":
      play("flick", 0, 0.46);
      play("contact", 0.035, 0.28);
      break;
    case "delete":
      play("shoveFirm", 0, 0.38);
      play("contact", 0.08, 0.22);
      break;
    case "effectActivate":
      play("flick", 0, 0.36);
      play("tap", 0.07, 0.16);
      break;
    case "hatch":
      play("cut", 0, 0.3);
      play("placeLight", 0.085, 0.34);
      break;
    case "reveal":
      play("flick", 0, 0.36);
      break;
    case "endTurn":
      play("cut", 0, 0.28);
      play("placeFirm", 0.11, 0.28);
      break;
    case "turnChange":
      play("placeLight", 0, 0.3);
      play("cut", 0.105, 0.28);
      play("tap", 0.2, 0.14);
      break;
    case "buff":
      play("slide", 0, 0.3);
      play("stack", 0.065, 0.16);
      break;
    case "debuff":
      play("slideAway", 0, 0.28);
      play("touch", 0.09, 0.18);
      break;
    case "freeze":
      play("contact", 0, 0.32);
      play("touch", 0.075, 0.21);
      break;
    case "recover":
      play("slideBack", 0, 0.28);
      play("placeLight", 0.09, 0.3);
      break;
    case "win":
      play("cut", 0, 0.3);
      play("placeLight", 0.1, 0.3);
      play("stack", 0.22, 0.26);
      play("tap", 0.33, 0.2);
      break;
    case "lose":
      play("contact", 0, 0.32);
      play("placeStack", 0.16, 0.26);
      break;
    case "confirm":
      play("cut", 0, 0.27);
      play("tap", 0.075, 0.13);
      break;
    case "error":
      play("touch", 0, 0.24);
      play("touch", 0.105, 0.2);
      break;
    case "success":
      play("placeLight", 0, 0.3);
      play("stack", 0.085, 0.16);
      break;
  }
  return {
    key: cueKey(kind, details),
    kind,
    details,
    layers,
    duration: Math.max(...layers.map((layer) => layer.at + layer.duration)) + 0.018,
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
        const source = (layer.source === "impact" || layer.source === "crystal") && sources?.[layer.source];
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
  const output = new Float32Array(Math.round(recipe.duration * sampleRate));
  for (const layer of recipe.layers) {
    const recording = sources?.recordings?.[layer.source as FoleyKind];
    if (!recording) throw new Error(`Recorded foley source required: ${layer.source}`);
    const start = Math.round(layer.at * sampleRate),
      frames = Math.round(layer.duration * sampleRate);
    for (let i = 0; i < frames; i++) {
      const position = (i * recording.sampleRate) / sampleRate,
        left = Math.floor(position),
        fraction = position - left;
      const value = (recording.samples[left] ?? 0) * (1 - fraction) + (recording.samples[left + 1] ?? 0) * fraction;
      output[start + i]! += value * layer.gain;
    }
  }
  // Linear relative mix, natural playback rate, no noise/oscillator/pitch substitution or per-cue normalization.
  let previous = 0,
    filtered = 0;
  const coefficient = Math.exp((-2 * Math.PI * 12) / sampleRate);
  for (let i = 0; i < output.length; i++) {
    const input = output[i]!;
    filtered = coefficient * (filtered + input - previous);
    previous = input;
    output[i] =
      filtered * Math.max(0, Math.min(1, i / (sampleRate * 0.002), (output.length - 1 - i) / (sampleRate * 0.008)));
  }
  return output;
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
