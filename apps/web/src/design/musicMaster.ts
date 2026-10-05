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
      if (view.getUint16(at + 8, true) !== 1 || view.getUint16(at + 22, true) !== 16) throw new Error("Expected PCM16");
      count = view.getUint16(at + 10, true);
      sampleRate = view.getUint32(at + 12, true);
    }
    if (tag(at) === "data") {
      dataOffset = at + 8;
      dataLength = length;
    }
    at += 8 + length + (length % 2);
  }
  if (!count || count > 2 || !sampleRate || !dataOffset || dataOffset + dataLength > bytes.length)
    throw new Error("Invalid music source");
  const channels = Array.from({ length: count }, () => new Float32Array(dataLength / (count * 2)));
  for (let i = 0; i < channels[0]!.length; i++)
    for (let channel = 0; channel < count; channel++)
      channels[channel]![i] = view.getInt16(dataOffset + (i * count + channel) * 2, true) / 32768;
  return { sampleRate, channels };
}
/** Bar-sized source crop, slight tempo alignment, circular pre-roll blend, warm filtering and safe headroom. */
export function masterOriginalMusic(source: MusicPCM, settings: MusicMasterSettings, sampleRate = 48000): MusicPCM {
  const { bpm, sourceBpm, startSeconds, beats, crossfadeBeats, lowpassHz, peak } = settings;
  if (
    ![bpm, sourceBpm, startSeconds, beats, crossfadeBeats, lowpassHz, peak, sampleRate].every(Number.isFinite) ||
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
    throw new Error("Source does not contain the complete musical phrase and pre-roll");
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
        value = value * (1 - weight) + sample(startSeconds - (duration - t) * ratio) * weight;
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
  for (const channel of channels) for (const value of channel) maximum = Math.max(maximum, Math.abs(value));
  const scale = maximum ? peak / maximum : 0;
  for (const channel of channels) for (let i = 0; i < frames; i++) channel[i]! *= scale;
  return { sampleRate, channels };
}
export function musicMetrics(pcm: MusicPCM) {
  let peak = 0,
    square = 0,
    sum = 0,
    boundaryStep = 0;
  for (const channel of pcm.channels) {
    boundaryStep = Math.max(boundaryStep, Math.abs(channel[0]! - channel.at(-1)!));
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
        Math.round(Math.max(-1, Math.min(1, pcm.channels[channel]![i]!)) * 32767),
        true,
      );
  return bytes;
}
