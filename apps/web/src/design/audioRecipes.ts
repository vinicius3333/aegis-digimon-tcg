/** Aegis cue arrangements of licensed CC0 recorded foley under original tuned tone accents in A; offline authoring and preview share finished PCM. */
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
  "memory",
  "block",
  "protect",
  "prompt",
  "timerTick",
  "phase",
  "securityDeal",
  "optionUse",
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
  /** Memory points the gauge moved; only the count is heard, not the direction. */
  steps?: number;
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
export const MEMORY_TICK_LIMIT = 6;
/** The sound hears only the arriving level and whether levels were skipped, so one skip stands for any. */
function evolutionLevels(details: SoundDetails): { sourceLevel: number; targetLevel: number } {
  const targetLevel = finite(details.targetLevel, 4, 2, 7);
  const skipped = Number.isFinite(details.sourceLevel) && details.sourceLevel! < targetLevel - 1 && targetLevel >= 3;
  return { sourceLevel: targetLevel - (skipped ? 2 : 1), targetLevel };
}
const finite = (n: number | undefined, fallback: number, low: number, high: number) =>
  Math.round(Math.min(high, Math.max(low, Number.isFinite(n) ? n! : fallback)));
export function cueKey(kind: SoundKind, details: SoundDetails = {}): string {
  if (kind === "cardPlay")
    return `${kind}-${finite(details.cost, 5, 0, 15)}-${details.assembly ? "assembly" : "plain"}`;
  if (kind === "digivolve") {
    const { sourceLevel, targetLevel } = evolutionLevels(details);
    return `${kind}-${sourceLevel}-${targetLevel}`;
  }
  if (kind === "memory") return `${kind}-${finite(details.steps, 1, 1, MEMORY_TICK_LIMIT)}`;
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
  const tone = (
    texture: Exclude<Texture, "recording">,
    at: number,
    length: number,
    gain: number,
    hz: number,
    endHz?: number,
  ) =>
    layers.push({
      texture,
      at,
      duration: length,
      gain: gain * (direction === "crisp" ? 0.88 : 1),
      hz,
      ...(endHz ? { endHz } : {}),
    });
  // A quick run of tuned notes; cue accents stay in A to sit inside the match score.
  const chime = (
    at: number,
    notes: readonly number[],
    spacing: number,
    gain: number,
    texture: "glass" | "pluck" = "glass",
    length = 0.18,
  ) => notes.forEach((note, i) => tone(texture, at + i * spacing, length, gain, midi(note)));
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
      tone("pluck", 0.02, 0.08, 0.018, midi(93));
      break;
    case "draw":
      play("slide", 0, 0.38);
      break;
    case "move":
      play("slideBack", 0, 0.32);
      break;
    case "handTrash":
      play("slideAway", 0, 0.34);
      chime(0.05, [76, 69], 0.06, 0.024, "pluck");
      break;
    case "sourceTrash":
      play("cut", 0, 0.32);
      play("contact", 0.055, 0.25);
      chime(0.04, [81, 76], 0.05, 0.024);
      break;
    case "shuffle":
      play("shuffle", 0, 0.36);
      break;
    case "group":
      play("cut", 0, 0.32);
      play("placeStack", 0.08, 0.29);
      chime(0.06, [69, 73, 76], 0.04, 0.02, "pluck");
      break;
    case "cardPlay": {
      const cost = finite(details.cost, 5, 0, 15),
        weight = cost / 15;
      const placement: FoleyKind =
        cost <= 3 ? "placeLight" : cost <= 8 ? "placeFirm" : cost <= 12 ? "placeHeavy" : "placeStack";
      play(placement, 0, 0.36 + weight * 0.16);
      tone("glass", 0.01, 0.22, 0.026 + weight * 0.02, midi([69, 71, 73, 76, 78, 81, 83, 85][Math.floor(cost / 2)]!));
      if (cost >= 9) tone("body", 0, 0.25, 0.05, midi(45));
      if (details.assembly) {
        play("cut", 0.045, 0.18);
        play("stack", 0.145, 0.14);
        chime(0.06, [76, 81, 85], 0.05, 0.022);
      }
      break;
    }
    case "digivolve": {
      // An original digivolution in four beats: the digivice charges, a data cocoon sweeps up,
      // a crystal arpeggio spins, and the new form lands on a flash. Higher target levels and
      // skipped levels lengthen every beat and raise the key, so 3->4 stays short and 6->7 soars.
      const { sourceLevel: source, targetLevel: target } = evolutionLevels(details);
      const jump = target - source,
        intensity = Math.min(4, Math.max(0, target - 4) + (jump > 1 ? 1 : 0)),
        root = 60 + [0, 2, 4, 5, 7][intensity]!,
        major = [0, 4, 7];
      const charges = 2 + intensity;
      for (let i = 0; i < charges; i++)
        tone("pluck", i * 0.045, 0.07, 0.045, midi(root + 24 + major[i % 3]! + 12 * Math.floor(i / 3)));
      play("slide", 0, 0.24);
      const sweepAt = charges * 0.045,
        sweep = 0.22 + intensity * 0.08;
      tone("pad", sweepAt, sweep, 0.07 + intensity * 0.008, midi(root - 12), midi(root + intensity * 2));
      tone("air", sweepAt, sweep, 0.05 + intensity * 0.01, 1400 + intensity * 500);
      play("cut", sweepAt + sweep * 0.4, 0.2);
      const arpeggio = 3 + intensity * 2,
        spin = Math.min(0.04, (sweep * 0.7) / arpeggio),
        spinAt = sweepAt + sweep - arpeggio * spin;
      for (let i = 0; i < arpeggio; i++)
        tone(
          "glass",
          spinAt + i * spin,
          0.16,
          0.03 + i * 0.002,
          midi(root + 12 + major[i % 3]! + 12 * Math.floor(i / 3)),
        );
      const flash = sweepAt + sweep;
      play(target >= 6 ? "placeStack" : target >= 4 ? "placeHeavy" : "placeLight", flash, 0.3 + target * 0.018);
      play("stack", flash + 0.035, 0.1 + target * 0.008);
      tone("body", flash, 0.3 + intensity * 0.05, 0.09 + intensity * 0.01, midi(root - 24));
      for (const interval of [0, 4, 7, 12])
        tone("glass", flash + 0.01, 0.4 + intensity * 0.08, 0.028, midi(root + interval));
      if (intensity >= 2)
        for (let i = 0; i < intensity + 1; i++)
          tone("glass", flash + 0.08 + i * 0.05, 0.24, 0.018, midi(root + 31 + [0, 5, 9, 12, 17][i]!));
      if (intensity >= 3) tone("pad", flash, 0.45 + intensity * 0.06, 0.045, midi(root - 5), midi(root - 5));
      break;
    }
    case "deDigivolve":
      play("cut", 0, 0.33);
      play("flick", 0.065, 0.28);
      play("slideAway", 0.125, 0.24);
      chime(0.02, [81, 76, 73, 69], 0.05, 0.024);
      tone("pad", 0, 0.32, 0.04, midi(69), midi(57));
      break;
    case "attackDeclare":
      play("shove", 0, 0.36);
      tone("pad", 0, 0.28, 0.05, midi(45), midi(57));
      tone("air", 0, 0.3, 0.03, 2200);
      break;
    case "memory": {
      const steps = finite(details.steps, 1, 1, MEMORY_TICK_LIMIT);
      for (let i = 0; i < steps; i++) {
        play("tap", i * 0.048, 0.12 + i * 0.012);
        tone("pluck", i * 0.048, 0.06, 0.012, midi(88 + i));
      }
      break;
    }
    case "block":
      play("placeFirm", 0, 0.36);
      play("clack", 0.008, 0.12);
      play("contact", 0.06, 0.24);
      tone("body", 0, 0.25, 0.06, midi(45));
      tone("glass", 0.01, 0.22, 0.02, midi(69));
      break;
    case "protect":
      play("flick", 0, 0.3);
      play("slideBack", 0.05, 0.2);
      chime(0.02, [85, 88, 93], 0.045, 0.02);
      break;
    case "prompt":
      play("touch", 0, 0.2);
      play("tap", 0.09, 0.13);
      chime(0, [88, 93], 0.07, 0.024, "pluck", 0.1);
      break;
    case "timerTick":
      play("tap", 0, 0.2);
      tone("pluck", 0, 0.06, 0.02, midi(93));
      break;
    case "phase":
      play("slide", 0, 0.16);
      play("tap", 0.06, 0.09);
      tone("pluck", 0.04, 0.1, 0.014, midi(81));
      break;
    case "securityDeal":
      play("placeLight", 0, 0.24);
      tone("pluck", 0.01, 0.08, 0.014, midi(76));
      break;
    case "optionUse":
      play("flick", 0, 0.3);
      play("placeFirm", 0.06, 0.32);
      play("tap", 0.14, 0.12);
      chime(0.03, [73, 76, 81], 0.045, 0.024);
      break;
    case "attack":
    case "impact":
      play("placeHeavy", 0, 0.52);
      play("clack", 0.006, 0.12);
      tone("body", 0, 0.28, 0.07, midi(40), midi(33));
      break;
    case "securityHit":
      play("flick", 0, 0.46);
      play("contact", 0.035, 0.28);
      for (const note of [88, 92, 95]) tone("glass", 0.01, 0.26, 0.018, midi(note));
      tone("air", 0, 0.2, 0.025, 3500);
      break;
    case "delete":
      play("shoveFirm", 0, 0.38);
      play("contact", 0.08, 0.22);
      chime(0.03, [81, 77, 72, 69], 0.04, 0.02);
      tone("air", 0.02, 0.3, 0.028, 3000);
      break;
    case "effectActivate":
      play("flick", 0, 0.36);
      play("tap", 0.07, 0.16);
      chime(0, [81, 88], 0.05, 0.022, "pluck");
      break;
    case "hatch":
      play("cut", 0, 0.3);
      play("placeLight", 0.085, 0.34);
      chime(0.06, [76, 81, 85], 0.06, 0.024, "pluck");
      tone("glass", 0.24, 0.3, 0.02, midi(88));
      break;
    case "reveal":
      play("flick", 0, 0.36);
      tone("glass", 0.01, 0.25, 0.024, midi(81));
      break;
    case "endTurn":
      play("cut", 0, 0.28);
      play("placeFirm", 0.11, 0.28);
      chime(0, [81, 76], 0.11, 0.024);
      break;
    case "turnChange":
      play("placeLight", 0, 0.3);
      play("cut", 0.105, 0.28);
      play("tap", 0.2, 0.14);
      chime(0, [76, 81], 0.1, 0.024);
      tone("pluck", 0.2, 0.1, 0.018, midi(88));
      break;
    case "buff":
      play("slide", 0, 0.3);
      play("stack", 0.065, 0.16);
      chime(0, [76, 81, 85], 0.04, 0.02);
      break;
    case "debuff":
      play("slideAway", 0, 0.28);
      play("touch", 0.09, 0.18);
      chime(0, [81, 77, 72], 0.05, 0.02);
      break;
    case "freeze":
      play("contact", 0, 0.32);
      play("touch", 0.075, 0.21);
      for (const note of [91, 95, 98]) tone("glass", 0.01, 0.4, 0.014, midi(note));
      break;
    case "recover":
      play("slideBack", 0, 0.28);
      play("placeLight", 0.09, 0.3);
      chime(0.03, [69, 76, 81], 0.05, 0.02, "pluck");
      break;
    case "win":
      play("cut", 0, 0.3);
      play("placeLight", 0.1, 0.3);
      play("stack", 0.22, 0.26);
      play("tap", 0.33, 0.2);
      chime(0, [69, 73, 76, 81], 0.09, 0.032);
      for (const note of [57, 61, 64]) tone("pad", 0.36, 0.9, 0.032, midi(note));
      tone("body", 0.36, 0.4, 0.05, midi(45));
      break;
    case "lose":
      play("contact", 0, 0.32);
      play("placeStack", 0.16, 0.26);
      chime(0, [76, 72, 69], 0.14, 0.028);
      for (const note of [57, 60, 64]) tone("pad", 0.3, 0.8, 0.028, midi(note));
      break;
    case "confirm":
      play("cut", 0, 0.27);
      play("tap", 0.075, 0.13);
      chime(0.02, [81, 88], 0.06, 0.02, "pluck", 0.1);
      break;
    case "error":
      play("touch", 0, 0.24);
      play("touch", 0.105, 0.2);
      chime(0, [70, 69], 0.1, 0.024, "pluck");
      break;
    case "success":
      play("placeLight", 0, 0.3);
      play("stack", 0.085, 0.16);
      chime(0, [76, 81, 85], 0.06, 0.024, "pluck");
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
  const synthesized = recipe.layers.filter((layer) => layer.texture !== "recording");
  if (synthesized.length) {
    const tone = renderLayers(synthesized, recipe.duration, sampleRate, 1);
    for (let i = 0; i < output.length; i++) output[i]! += tone[i] ?? 0;
  }
  for (const layer of recipe.layers.filter((item) => item.texture === "recording")) {
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
  // Linear relative mix at natural playback rate, no per-cue normalization. Only authored tone layers are synthesized.
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
  const recipes = SOUND_KINDS.filter((kind) => kind !== "cardPlay" && kind !== "digivolve" && kind !== "memory").map(
    (kind) => audioRecipe(kind),
  );
  for (let steps = 1; steps <= MEMORY_TICK_LIMIT; steps++) recipes.push(audioRecipe("memory", { steps }));
  for (let cost = 0; cost <= 15; cost++)
    for (const assembly of [false, true]) recipes.push(audioRecipe("cardPlay", { cost, assembly }));
  for (let targetLevel = 2; targetLevel <= 7; targetLevel++) {
    recipes.push(audioRecipe("digivolve", { sourceLevel: targetLevel - 1, targetLevel }));
    if (targetLevel >= 3) recipes.push(audioRecipe("digivolve", { sourceLevel: targetLevel - 2, targetLevel }));
  }
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

export const SCORE_BPM = 112;
export const SCORE_BARS = 16;
export const SCORE_SECONDS = (SCORE_BARS * 4 * 60) / SCORE_BPM;
export const SCORE_PEAK = 0.075;
const SCORE_DRIVE = 3;
/** Root and quality per half bar: the liked score's A-minor i-VI-VII drive, then its bright A-major release. */
const SCORE_CHORDS: readonly (readonly [number, "major" | "minor"])[] = [
  [57, "minor"],
  [57, "minor"],
  [57, "minor"],
  [57, "minor"],
  [53, "major"],
  [55, "major"],
  [57, "minor"],
  [57, "minor"],
  [53, "major"],
  [55, "major"],
  [57, "minor"],
  [57, "minor"],
  [53, "major"],
  [55, "major"],
  [57, "minor"],
  [55, "major"],
  [53, "major"],
  [48, "major"],
  [53, "major"],
  [55, "major"],
  [53, "major"],
  [55, "major"],
  [57, "major"],
  [57, "major"],
  [50, "major"],
  [57, "major"],
  [57, "major"],
  [52, "major"],
  [50, "major"],
  [52, "major"],
  [57, "major"],
  [57, "major"],
];
/** Lead notes as [bar, sixteenth, midi, sixteenths]; the A-major bars answer the minor phrase an octave up. */
const SCORE_MELODY: readonly (readonly [number, number, number, number])[] = [
  [2, 0, 76, 6],
  [2, 6, 74, 2],
  [2, 8, 72, 4],
  [2, 12, 74, 4],
  [3, 0, 76, 8],
  [3, 8, 69, 8],
  [4, 0, 72, 4],
  [4, 4, 74, 2],
  [4, 6, 76, 6],
  [4, 12, 79, 4],
  [5, 0, 81, 8],
  [5, 8, 79, 4],
  [5, 12, 76, 4],
  [6, 0, 77, 4],
  [6, 4, 76, 4],
  [6, 8, 74, 4],
  [6, 12, 79, 4],
  [7, 0, 76, 8],
  [7, 8, 74, 8],
  [8, 0, 72, 4],
  [8, 4, 77, 4],
  [8, 8, 81, 4],
  [8, 12, 79, 4],
  [9, 0, 81, 6],
  [9, 6, 79, 2],
  [9, 8, 77, 4],
  [9, 12, 79, 4],
  [10, 0, 77, 4],
  [10, 4, 79, 4],
  [10, 8, 81, 4],
  [10, 12, 83, 4],
  [11, 0, 76, 4],
  [11, 4, 81, 4],
  [11, 8, 85, 8],
  [12, 0, 83, 4],
  [12, 4, 81, 4],
  [12, 8, 78, 4],
  [12, 12, 81, 4],
  [13, 0, 76, 6],
  [13, 6, 81, 2],
  [13, 8, 83, 4],
  [13, 12, 80, 4],
  [14, 0, 81, 4],
  [14, 4, 78, 4],
  [14, 8, 83, 8],
  [15, 0, 81, 8],
  [15, 8, 76, 4],
  [15, 12, 73, 4],
];
/** Center layers carry the beat, bass and lead; wide layers carry the bed and the digital arpeggio. */
export function scoreRecipe(): { center: AudioLayer[]; wide: AudioLayer[] } {
  const center: AudioLayer[] = [],
    wide: AudioLayer[] = [];
  const beat = 60 / SCORE_BPM,
    sixteenth = beat / 4,
    bar = beat * 4;
  const add = (
    target: AudioLayer[],
    texture: Texture,
    at: number,
    duration: number,
    gain: number,
    hz: number,
    endHz?: number,
  ) => target.push({ texture, at, duration, gain, hz, ...(endHz ? { endHz } : {}) });
  SCORE_CHORDS.forEach(([root, quality], half) => {
    const at = half * beat * 2,
      triad = [0, quality === "major" ? 4 : 3, 7],
      release = half >= 22;
    for (const interval of triad) add(wide, "pad", at, beat * 2.2, release ? 0.03 : 0.024, midi(root + 12 + interval));
    for (let step = 0; step < 8; step++)
      add(
        wide,
        "pluck",
        at + step * sixteenth,
        sixteenth * 1.6,
        0.016 + (step % 4 === 0 ? 0.006 : 0),
        midi(root + 24 + [0, triad[1]!, 7, 12][step % 4]! + (release && step >= 4 ? 12 : 0)),
      );
    for (let eighth = 0; eighth < 4; eighth++)
      add(
        center,
        "pluck",
        at + eighth * beat * 0.5,
        beat * 0.45,
        eighth % 2 === 0 ? 0.075 : 0.05,
        midi(root - 12 + (eighth === 3 ? 12 : 0)),
      );
  });
  for (let b = 0; b < SCORE_BARS * 4; b++) {
    const at = b * beat,
      intro = b < 8;
    add(center, "body", at, 0.2, intro ? 0.07 : 0.11, 62, 42);
    if (!intro && b % 2 === 1) add(center, "grain", at, 0.14, 0.05, 2600);
    add(wide, "grain", at + beat / 2, 0.05, intro ? 0.008 : 0.014, 8000);
  }
  // The lead runs in light eighths an octave up, leaping between octaves through each held note.
  for (const [barIndex, step, note, length] of SCORE_MELODY) {
    const at = barIndex * bar + step * sixteenth;
    for (let offset = 0; offset < length; offset += 2)
      add(
        center,
        "pluck",
        at + offset * sixteenth,
        sixteenth * 1.8,
        offset === 0 ? 0.04 : 0.03,
        midi(note + (offset % 4 === 0 ? 12 : 0)),
      );
    add(wide, "glass", at, sixteenth * 2.5, 0.014, midi(note + 12));
  }
  // Bar 11 rises into the major release the way a digivolution sweeps into its flash.
  const rise = 10 * bar + bar / 2,
    flash = 11 * bar;
  add(wide, "pad", rise, bar / 2, 0.05, midi(45), midi(57));
  add(wide, "air", rise, bar / 2, 0.05, 2200);
  add(center, "body", flash, 0.6, 0.12, midi(33));
  for (const note of [69, 73, 76, 81]) add(wide, "glass", flash + 0.01, 0.9, 0.03, midi(note));
  return { center, wide };
}
/** A seamless stereo loop: wide layers reach the right ear 13 ms late, peak-scaled to the music bus ceiling. */
export function renderScore(sampleRate = 48000): Float32Array[] {
  const { center, wide } = scoreRecipe();
  const middle = renderLayers(center, SCORE_SECONDS, sampleRate, 0x5c0e112, true);
  const side = renderLayers(wide, SCORE_SECONDS, sampleRate, 0x5c0e113, true);
  const delay = Math.round(sampleRate * 0.013),
    frames = middle.length;
  const left = new Float32Array(frames),
    right = new Float32Array(frames);
  let peak = 0;
  for (let i = 0; i < frames; i++) {
    left[i] = middle[i]! + side[i]! * 0.8;
    right[i] = middle[i]! + side[(i - delay + frames) % frames]! * 0.8;
    peak = Math.max(peak, Math.abs(left[i]!), Math.abs(right[i]!));
  }
  // Saturate before scaling so the transient beat stops setting the level for the whole bed.
  const drive = SCORE_DRIVE / peak,
    ceiling = Math.tanh(SCORE_DRIVE);
  for (let i = 0; i < frames; i++) {
    left[i] = (Math.tanh(left[i]! * drive) / ceiling) * SCORE_PEAK;
    right[i] = (Math.tanh(right[i]! * drive) / ceiling) * SCORE_PEAK;
  }
  return [left, right];
}
