import { spawnSync } from "node:child_process";

/** Offline only: three circular phrases avoid atempo startup/end artifacts in the retained middle phrase. */
export function tempoOriginalMusic(pcm, fromBpm, toBpm, peak = 0.075) {
  if (![fromBpm, toBpm, peak].every(Number.isFinite) || fromBpm <= 0 || toBpm <= 0 || peak <= 0 || peak > 0.08)
    throw new Error("Invalid offline tempo settings");
  const channels = pcm.channels.length;
  const sourceFrames = pcm.channels[0].length;
  const input = Buffer.alloc(sourceFrames * channels * 4 * 3);
  for (let i = 0; i < sourceFrames * 3; i++)
    for (let channel = 0; channel < channels; channel++)
      input.writeFloatLE(pcm.channels[channel][i % sourceFrames], (i * channels + channel) * 4);
  const ratio = toBpm / fromBpm;
  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-threads",
    "1",
    "-f",
    "f32le",
    "-ar",
    String(pcm.sampleRate),
    "-ac",
    String(channels),
    "-i",
    "pipe:0",
    "-af",
    `atempo=${ratio}`,
    "-f",
    "f32le",
    "-acodec",
    "pcm_f32le",
    "pipe:1",
  ];
  const result = spawnSync(process.env.AUDIO_FFMPEG ?? "ffmpeg", args, {
    input,
    timeout: 60_000,
    maxBuffer: 100_000_000,
  });
  if (result.error || result.status !== 0)
    throw new Error(`Offline ffmpeg tempo adjustment failed: ${result.error?.message ?? result.stderr.toString()}`);
  const frames = Math.round(sourceFrames / ratio);
  if (result.stdout.length < frames * 2 * channels * 4) throw new Error("Incomplete stretched phrase");
  const output = Array.from({ length: channels }, (_, channel) => {
    const data = Float32Array.from({ length: frames }, (unused, i) =>
      result.stdout.readFloatLE(((i + frames) * channels + channel) * 4),
    );
    // Match the seam over a short raised-cosine blend with the next phrase's beginning.
    const blendFrames = Math.round(pcm.sampleRate * 0.06);
    for (let i = 0; i < blendFrames; i++) {
      const x = i / (blendFrames - 1);
      const weight = 0.5 - 0.5 * Math.cos(Math.PI * x);
      const next = result.stdout.readFloatLE(((2 * frames - blendFrames + i) * channels + channel) * 4);
      const beforeStart = result.stdout.readFloatLE(((frames - blendFrames + i) * channels + channel) * 4);
      data[frames - blendFrames + i] = next * (1 - weight) + beforeStart * weight;
    }
    const delta = data.at(-1) - data[0];
    const bridge = Math.round(pcm.sampleRate * 0.002);
    for (let i = 0; i < bridge; i++) {
      const x = i / (bridge - 1);
      data[frames - bridge + i] -= delta * x * x * (3 - 2 * x);
    }
    const mean = data.reduce((sum, value) => sum + value, 0) / frames;
    for (let i = 0; i < frames; i++) data[i] -= mean;
    return data;
  });
  let maximum = 0;
  for (const channel of output) for (const value of channel) maximum = Math.max(maximum, Math.abs(value));
  for (const channel of output) for (let i = 0; i < frames; i++) channel[i] *= peak / maximum;
  return { sampleRate: pcm.sampleRate, channels: output };
}
