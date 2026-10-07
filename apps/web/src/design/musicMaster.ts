/** Deterministic offline mastering for committed ORIGINAL text-generated musical sources. */
export interface MusicPCM {
  sampleRate: number;
  channels: Float32Array[];
}
export interface MusicMasterSettings {
  startSeconds: number;
  sourceBpm: number;
  bpm: number;
  beats: number;
  peak: number;
  crossfadeBeats: number;
  lowpassHz: number;
}
export function decodeMusicWav(bytes: Uint8Array): MusicPCM {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number) => String.fromCharCode(...bytes.slice(at, at + 4));
  if (tag(0) !== "RIFF" || tag(8) !== "WAVE") throw new Error("Expected WAV");
  let count = 0,
    sampleRate = 0,
    dataOffset = 0,
    dataLength = 0;
  for (let at = 12; at + 8 <= bytes.length;) {
    const length = view.getUint32(at + 4, true);
    if (tag(at) === "fmt ") {
      if (
        view.getUint16(at + 8, true) !== 1 ||
        view.getUint16(at + 22, true) !== 16
      )
        throw new Error("Expected PCM16");
      count = view.getUint16(at + 10, true);
      sampleRate = view.getUint32(at + 12, true);
    }
    if (tag(at) === "data") {
      dataOffset = at + 8;
      dataLength = length;
    }
    at += 8 + length + (length % 2);
  }
  if (
    !count ||
    count > 2 ||
    !sampleRate ||
    !dataOffset ||
    dataOffset + dataLength > bytes.length
  )
    throw new Error("Invalid music source");
  const channels = Array.from(
    { length: count },
    () => new Float32Array(dataLength / (count * 2)),
  );
  for (let i = 0; i < channels[0]!.length; i++)
    for (let channel = 0; channel < count; channel++)
      channels[channel]![i] =
        view.getInt16(dataOffset + (i * count + channel) * 2, true) / 32768;
  return { sampleRate, channels };
}
/** Bar-sized source crop, slight tempo alignment, circular pre-roll blend, warm filtering and safe headroom. */
export function masterOriginalMusic(
  source: MusicPCM,
  settings: MusicMasterSettings,
  sampleRate = 48000,
): MusicPCM {
  const {
    bpm,
    sourceBpm,
    startSeconds,
    beats,
    crossfadeBeats,
    lowpassHz,
    peak,
  } = settings;
  if (
    ![
      bpm,
      sourceBpm,
      startSeconds,
      beats,
      crossfadeBeats,
      lowpassHz,
      peak,
      sampleRate,
    ].every(Number.isFinite) ||
    bpm <= 0 ||
    sourceBpm <= 0 ||
    beats <= 0 ||
    peak <= 0 ||
    peak > 0.08 ||
    lowpassHz <= 0 ||
    crossfadeBeats <= 0 ||
    sampleRate < 44100
  )
    throw new Error("Invalid music master settings");
  const duration = (beats * 60) / bpm,
    ratio = bpm / sourceBpm,
    crossfade = (crossfadeBeats * 60) / bpm;
  const sourceLength = source.channels[0]?.length ?? 0;
  if (
    !source.channels.length ||
    startSeconds < crossfade * ratio ||
    (startSeconds + duration * ratio) * source.sampleRate >= sourceLength
  )
    throw new Error(
      "Source does not contain the complete musical phrase and pre-roll",
    );
  const frames = Math.round(duration * sampleRate);
  const channels = source.channels.map((input) => {
    const output = new Float32Array(frames);
    const sample = (seconds: number) => {
      const position = seconds * source.sampleRate,
        left = Math.floor(position),
        part = position - left;
      return input[left]! * (1 - part) + input[left + 1]! * part;
    };
    for (let i = 0; i < frames; i++) {
      const t = i / sampleRate;
      let value = sample(startSeconds + t * ratio);
      if (t > duration - crossfade) {
        const blend = (t - duration + crossfade) / crossfade;
        const weight = 0.5 - 0.5 * Math.cos(Math.PI * blend);
        value =
          value * (1 - weight) +
          sample(startSeconds - (duration - t) * ratio) * weight;
      }
      output[i] = value;
    }
    // Circular state warmup prevents filter startup transients at the loop boundary.
    const highpass = Math.exp((-2 * Math.PI * 35) / sampleRate),
      lowpass = 1 - Math.exp((-2 * Math.PI * lowpassHz) / sampleRate);
    let previous = output.at(-1)!,
      high = 0,
      low1 = 0,
      low2 = 0;
    for (let cycle = 0; cycle < 3; cycle++)
      for (let i = 0; i < frames; i++) {
        const value = output[i]!;
        high = highpass * (high + value - previous);
        previous = value;
        low1 += lowpass * (high - low1);
        low2 += lowpass * (low1 - low2);
        if (cycle === 2) output[i] = Math.tanh(low2 * 1.3);
      }
    // Tiny final bridge after the musical pre-roll crossfade; no fade-to-silence gap at every loop.
    const bridge = Math.round(sampleRate * 0.002),
      delta = output.at(-1)! - output[0]!;
    for (let i = frames - bridge; i < frames; i++) {
      const x = (i - frames + bridge) / (bridge - 1);
      output[i]! -= delta * x * x * (3 - 2 * x);
    }
    const mean = output.reduce((sum, value) => sum + value, 0) / frames;
    for (let i = 0; i < frames; i++) output[i]! -= mean;
    return output;
  });
  let maximum = 0;
  for (const channel of channels)
    for (const value of channel) maximum = Math.max(maximum, Math.abs(value));
  const scale = maximum ? peak / maximum : 0;
  for (const channel of channels)
    for (let i = 0; i < frames; i++) channel[i]! *= scale;
  return { sampleRate, channels };
}
export function musicMetrics(pcm: MusicPCM) {
  let peak = 0,
    square = 0,
    sum = 0,
    boundaryStep = 0;
  for (const channel of pcm.channels) {
    boundaryStep = Math.max(
      boundaryStep,
      Math.abs(channel[0]! - channel.at(-1)!),
    );
    for (const value of channel) {
      peak = Math.max(peak, Math.abs(value));
      square += value * value;
      sum += value;
    }
  }
  const count = pcm.channels[0]!.length * pcm.channels.length;
  return {
    peak,
    peakDbFS: 20 * Math.log10(peak),
    rms: Math.sqrt(square / count),
    dc: sum / count,
    boundaryStep,
    seconds: pcm.channels[0]!.length / pcm.sampleRate,
    sampleRate: pcm.sampleRate,
    channels: pcm.channels.length,
  };
}
export function encodeMusicWav(pcm: MusicPCM): Uint8Array {
  const count = pcm.channels.length,
    frames = pcm.channels[0]!.length;
  const bytes = new Uint8Array(44 + frames * count * 2),
    view = new DataView(bytes.buffer);
  const tag = (at: number, text: string) =>
    [...text].forEach((c, i) => {
      bytes[at + i] = c.charCodeAt(0);
    });
  tag(0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  tag(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, count, true);
  view.setUint32(24, pcm.sampleRate, true);
  view.setUint32(28, pcm.sampleRate * count * 2, true);
  view.setUint16(32, count * 2, true);
  view.setUint16(34, 16, true);
  tag(36, "data");
  view.setUint32(40, frames * count * 2, true);
  for (let i = 0; i < frames; i++)
    for (let channel = 0; channel < count; channel++)
      view.setInt16(
        44 + (i * count + channel) * 2,
        Math.round(
          Math.max(-1, Math.min(1, pcm.channels[channel]![i]!)) * 32767,
        ),
        true,
      );
  return bytes;
}

/** Offline grid phase measured from the liked score's low-band attack energy, never an arbitrary clock. */
export function analyzeMusicBeatPhase(pcm: MusicPCM, bpm = 112) {
  const hop = Math.round(pcm.sampleRate * 0.01),
    beat = 60 / bpm;
  const novelty: number[] = [];
  const highpass = Math.exp((-2 * Math.PI * 35) / pcm.sampleRate);
  const lowpass = 1 - Math.exp((-2 * Math.PI * 280) / pcm.sampleRate);
  let previous = 0,
    high = 0,
    low = 0,
    square = 0,
    previousRms = 0;
  for (let i = 0; i < pcm.channels[0]!.length; i++) {
    const input =
      pcm.channels.reduce((sum, channel) => sum + channel[i]!, 0) /
      pcm.channels.length;
    high = highpass * (high + input - previous);
    previous = input;
    low += lowpass * (high - low);
    square += low * low;
    if ((i + 1) % hop === 0) {
      const rms = Math.sqrt(square / hop);
      novelty.push(Math.max(0, rms - previousRms));
      previousRms = rms;
      square = 0;
    }
  }
  const scores: number[] = [];
  let maximum = 0,
    phaseSeconds = 0;
  for (let phase = 0; phase < beat; phase += 0.002) {
    let score = 0;
    for (let i = 0; i < novelty.length; i++) {
      const t = ((i + 0.5) * hop) / pcm.sampleRate;
      const distance = ((t - phase + beat * 1.5) % beat) - beat / 2;
      score += novelty[i]! * Math.exp(-0.5 * (distance / 0.02) ** 2);
    }
    scores.push(score);
    if (score > maximum) {
      maximum = score;
      phaseSeconds = phase;
    }
  }
  return {
    phaseSeconds,
    gridStrength:
      maximum / (scores.reduce((sum, value) => sum + value, 0) / scores.length),
    bpm,
    uncertaintySeconds: 0.02,
    method: `35-280 Hz attack RMS; 10 ms frames; positive energy rises; ${bpm} BPM circular grid fit at 2 ms phases with 20 ms attack windows`,
  };
}

export interface MusicPulseSettings {
  bpm: number;
  stepsPerBeat: number;
  bodyPeak: number;
  tapPeak: number;
}
/** Adds quiet recorded card-body thumps and acoustic chip taps, alternating on each step, while retaining the dry score. */
export function addRecordedMusicPulse(
  source: MusicPCM,
  body: { samples: Float32Array; sampleRate: number },
  tap: { samples: Float32Array; sampleRate: number },
  { bpm, stepsPerBeat, bodyPeak, tapPeak }: MusicPulseSettings,
) {
  const analysis = analyzeMusicBeatPhase(source, bpm);
  const frames = source.channels[0]!.length,
    rate = source.sampleRate;
  const pulse = new Float32Array(frames);
  const instrument = (recording: typeof body, hz: number, peak: number) => {
    const length = Math.round(
      (recording.samples.length * rate) / recording.sampleRate,
    );
    const output = new Float32Array(length);
    const coefficient = 1 - Math.exp((-2 * Math.PI * hz) / rate);
    let low = 0,
      maximum = 0,
      peakFrame = 0;
    for (let i = 0; i < length; i++) {
      const position = (i * recording.sampleRate) / rate,
        left = Math.floor(position),
        fraction = position - left;
      const sample =
        (recording.samples[left] ?? 0) * (1 - fraction) +
        (recording.samples[left + 1] ?? 0) * fraction;
      low += coefficient * (sample - low);
      output[i] =
        low *
        Math.max(
          0,
          Math.min(1, i / (rate * 0.002), (length - 1 - i) / (rate * 0.008)),
        );
      if (Math.abs(output[i]!) > maximum) {
        maximum = Math.abs(output[i]!);
        peakFrame = i;
      }
    }
    for (let i = 0; i < length; i++) output[i]! *= peak / maximum;
    return { samples: output, peakFrame };
  };
  const thump = instrument(body, 180, bodyPeak),
    rim = instrument(tap, 1800, tapPeak);
  const steps = Math.round(((frames / rate) * bpm * stepsPerBeat) / 60);
  const events: Array<{
    beat: number;
    peakSeconds: number;
    source: "card-body" | "chip-tap";
    polarity: number;
  }> = [];
  for (let step = 0; step < steps; step++) {
    const beat = step / stepsPerBeat;
    const at = Math.round((analysis.phaseSeconds + (beat * 60) / bpm) * rate);
    const voice = step % 2 ? rim : thump;
    let correlation = 0;
    for (let i = 0; i < voice.samples.length; i++) {
      const index = (at - voice.peakFrame + i + frames) % frames;
      correlation +=
        voice.samples[i]! *
        source.channels.reduce((sum, channel) => sum + channel[index]!, 0);
    }
    const polarity = correlation < 0 ? -1 : 1;
    events.push({
      beat,
      peakSeconds: at / rate,
      source: step % 2 ? "chip-tap" : "card-body",
      polarity,
    });
    for (let i = 0; i < voice.samples.length; i++) {
      const index = (at - voice.peakFrame + i + frames) % frames;
      pulse[index]! += voice.samples[i]! * polarity;
    }
  }
  const mean = pulse.reduce((sum, value) => sum + value, 0) / frames;
  for (let i = 0; i < frames; i++) pulse[i]! -= mean;
  const bridge = Math.round(rate * 0.002),
    delta = pulse.at(-1)! - pulse[0]!;
  for (let i = 0; i < bridge; i++) {
    const x = i / (bridge - 1);
    pulse[frames - bridge + i]! -= delta * x * x * (3 - 2 * x);
  }
  const channels = source.channels.map((channel) =>
    Float32Array.from(channel, (value, i) => value + pulse[i]!),
  );
  const pcm = { sampleRate: rate, channels };
  if (musicMetrics(pcm).peak > 0.079)
    throw new Error("Recorded pulse exceeds quiet music headroom");
  return { pcm, pulse, analysis, events };
}
