export interface AudioTrack {
  id: string;
  label: string;
  url: string;
  seconds?: number;
  bpm?: number;
  metrics: { peak?: number; rms?: number; dc?: number; boundaryStep?: number };
  applied: boolean;
}
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};
const number = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);

/** Attenuate louder comparisons without changing the game's buses or boosting quiet sources. */
export function comparisonVolume(volume: number, metrics: AudioTrack["metrics"], balanced: boolean): number {
  if (!balanced || !metrics.rms || metrics.rms <= 0 || !metrics.peak || metrics.peak <= 0) return volume;
  return volume * Math.min(1, 0.015 / metrics.rms, 0.5 / metrics.peak);
}

/** Only original same-origin audio assets can be designated as the game's track. */
export function candidateTracks(manifest: unknown, runtimeUrl: string): AudioTrack[] {
  const root = record(manifest);
  const entries = Array.isArray(root.candidates) ? root.candidates : [];
  const tracks: AudioTrack[] = [];
  for (const entry of entries) {
    const row = record(entry);
    const path = typeof row.url === "string" ? row.url : typeof row.file === "string" ? row.file : "";
    const url = path.startsWith("/") ? path : `/audio/music-candidates/${path}`;
    if (!/^\/audio\/[\w./-]+(?:\?v=[\w-]+)?$/.test(url) || url.includes("..") || !path) continue;
    const metrics = record(row.metrics);
    tracks.push({
      id: typeof row.id === "string" ? row.id : `candidate-${tracks.length}`,
      label: typeof row.label === "string" ? row.label : "Original music candidate",
      url,
      seconds: number(row.seconds) ?? number(metrics.seconds),
      bpm: number(row.bpm),
      metrics: {
        peak: number(metrics.peak),
        rms: number(metrics.rms),
        dc: number(metrics.dc),
        boundaryStep: number(metrics.boundaryStep),
      },
      applied: url === runtimeUrl,
    });
  }
  if (!tracks.some((track) => track.applied))
    tracks.unshift({ id: "applied", label: "Applied game score", url: runtimeUrl, metrics: {}, applied: true });
  return tracks;
}
