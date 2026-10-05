import "./audioPreview.css";
import * as sound from "../design/sound";
import { MUSIC_URL } from "../design/audioBank";
import { candidateTracks, comparisonVolume, type AudioTrack } from "./audioPreviewModel";

const element = <T extends HTMLElement>(id: string) => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing audio control ${id}`);
  return node as T;
};
const status = element("mix-status");
const players: HTMLAudioElement[] = [];
const trackMetrics = new WeakMap<HTMLAudioElement, AudioTrack["metrics"]>();
const musicVolume = element<HTMLInputElement>("music-volume");
const effectsVolume = element<HTMLInputElement>("effects-volume");
const musicEnabled = element<HTMLInputElement>("music-enabled");
const effectsEnabled = element<HTMLInputElement>("effects-enabled");
const loop = element<HTMLInputElement>("comparison-loop");
const overlap = element<HTMLInputElement>("comparison-overlap");
const balanced = element<HTMLInputElement>("comparison-balanced");
const cues: { label: string; kind: sound.SoundKind; details?: sound.SoundDetails }[] = [
  { label: "Draw", kind: "draw" },
  { label: "Play cost 12", kind: "cardPlay", details: { cost: 12 } },
  { label: "Effect", kind: "effectActivate" },
  { label: "Evolve level 3 → 6", kind: "digivolve", details: { sourceLevel: 3, targetLevel: 6 } },
  { label: "Impact", kind: "impact" },
  { label: "Security", kind: "securityHit" },
];
const uninstall = sound.installAudioLifecycle();
function stopComparisons(except?: HTMLAudioElement): void {
  for (const player of players) if (player !== except) player.pause();
  const alternative = element<HTMLAudioElement>("crisp-cues");
  if (alternative !== except) alternative.pause();
}
function syncControls(): void {
  musicVolume.value = String(Math.round(sound.getMusicVolume() * 100));
  effectsVolume.value = String(Math.round(sound.getSoundVolume() * 100));
  musicEnabled.checked = sound.isMusicEnabled();
  effectsEnabled.checked = sound.isSoundEnabled();
  musicVolume.disabled = !musicEnabled.checked;
  effectsVolume.disabled = !effectsEnabled.checked;
  element("music-volume-value").textContent = `${musicVolume.value}%`;
  element("effects-volume-value").textContent = `${effectsVolume.value}%`;
  const alternative = element<HTMLAudioElement>("crisp-cues");
  alternative.volume = sound.getSoundVolume() * sound.SFX_MIX_GAIN;
  alternative.muted = !sound.isSoundEnabled();
  for (const player of players) {
    player.volume = comparisonVolume(sound.getMusicVolume(), trackMetrics.get(player) ?? {}, balanced.checked);
    player.muted = !sound.isMusicEnabled();
    player.loop = loop.checked;
  }
}
async function ready(): Promise<void> {
  sound.unlockAudio();
  status.textContent = "Preparing audio…";
  await sound.prepareAudio();
  status.textContent = "Playback requested with the applied game sounds.";
}
function bindAsync(id: string, action: () => Promise<void>): void {
  element(id).addEventListener("click", () => {
    void action().catch(() => {
      status.textContent = "Audio could not start. Press a playback control to try again.";
    });
  });
}
bindAsync("start-game-mix", async () => {
  if (!overlap.checked) stopComparisons();
  await ready();
  sound.startMusic();
});
element("stop-game-mix").addEventListener("click", sound.stopMusic);
element("stop-all").addEventListener("click", () => {
  stopComparisons();
  sound.disposeAudio();
});
element("release-audio").addEventListener("click", () => {
  stopComparisons();
  sound.disposeAudio();
  status.textContent = "Audio released. Playback can be enabled again with a new click.";
});
musicVolume.addEventListener("input", () => {
  sound.setMusicVolume(Number(musicVolume.value) / 100);
  syncControls();
});
effectsVolume.addEventListener("input", () => {
  sound.setSoundVolume(Number(effectsVolume.value) / 100);
  syncControls();
});
musicEnabled.addEventListener("change", () => {
  sound.setMusicEnabled(musicEnabled.checked);
  syncControls();
});
effectsEnabled.addEventListener("change", () => {
  sound.setSoundEnabled(effectsEnabled.checked);
  syncControls();
});
loop.addEventListener("change", syncControls);
balanced.addEventListener("change", syncControls);
for (const cue of cues) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = cue.label;
  button.addEventListener("click", () => {
    void ready().then(() => sound.playSound(cue.kind, cue.details));
  });
  element("cues").append(button);
}
bindAsync("overlap-cues", async () => {
  await ready();
  for (const cue of cues) sound.playSound(cue.kind, cue.details);
});

function addTrack(track: AudioTrack): void {
  const article = document.createElement("article");
  const heading = document.createElement("h3");
  heading.textContent = `${track.label}${track.applied ? " · applied in game" : ""}`;
  const player = document.createElement("audio");
  player.controls = true;
  player.preload = "none";
  player.src = track.url;
  player.setAttribute("aria-label", track.label);
  player.addEventListener("play", () => {
    if (!overlap.checked) {
      stopComparisons(player);
      sound.stopMusic();
    }
  });
  player.addEventListener("error", () => {
    element("candidate-status").textContent = `${track.label} is unavailable. The applied game mix remains available.`;
  });
  article.append(heading, player);
  element("tracks").append(article);
  players.push(player);
  trackMetrics.set(player, track.metrics);
  const row = document.createElement("tr");
  const fixed = (value: number | undefined, places = 5) => (value === undefined ? "—" : value.toFixed(places));
  for (const value of [
    track.label,
    track.seconds === undefined ? "—" : `${track.seconds.toFixed(2)} s`,
    track.bpm === undefined ? "—" : `${track.bpm} BPM`,
    fixed(track.metrics.peak),
    fixed(track.metrics.rms),
    fixed(track.metrics.boundaryStep),
  ]) {
    const cell = document.createElement("td");
    cell.textContent = value;
    row.append(cell);
  }
  element("measurements").append(row);
  if (track.applied)
    element("applied-track").textContent = `Applied music: ${track.label}. Card cues use the same mix as gameplay.`;
}

async function loadTracks(): Promise<void> {
  let manifest: unknown;
  try {
    const response = await fetch("/audio/music-candidates/manifest.json", { cache: "no-store" });
    if (response.ok && response.headers.get("content-type")?.includes("json")) manifest = await response.json();
  } catch {
    /* Keep the exact runtime fallback playable while new candidates are prepared. */
  }
  addTrack({
    id: "reference",
    label: "Reference recording",
    url: "/motion-reference/MuhkUzGAeHA/reference.wav",
    seconds: 258.485,
    metrics: { peak: 1, rms: 0.254 },
    applied: false,
  });
  for (const track of candidateTracks(manifest, MUSIC_URL)) addTrack(track);
  element("candidate-status").textContent = manifest
    ? "Original music choices are ready. Reference playback is for comparison."
    : "New music choices are being prepared. The applied game mix is available.";
  const response = await fetch("/audio/manifest.json", { cache: "no-store" });
  if (response.ok) {
    const bank = (await response.json()) as { previews?: { crisp?: { sha256?: string } } };
    const hash = bank.previews?.crisp?.sha256?.slice(0, 12);
    element<HTMLAudioElement>("crisp-cues").src = `/audio/previews/crisp-six-cues.wav${hash ? `?v=${hash}` : ""}`;
  }
  syncControls();
}
syncControls();
void loadTracks().catch(() => {
  element("candidate-status").textContent = "Some comparison tracks could not load. The applied game mix is available.";
});
if (import.meta.hot) import.meta.hot.dispose(uninstall);
