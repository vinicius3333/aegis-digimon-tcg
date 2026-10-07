import "./audioPreview.css";
import * as sound from "../design/sound";
import { AUDIO_BANK_URL, AUDIO_CUES, MUSIC_URL } from "../design/audioBank";
import { candidateTracks, comparisonVolume, cueComparisons, type AudioTrack } from "./audioPreviewModel";

const element = <T extends HTMLElement>(id: string) => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing audio control ${id}`);
  return node as T;
};
const status = element("mix-status");
const players: HTMLAudioElement[] = [];
const previousCue = new Audio();
previousCue.preload = "none";
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
const everydayCues: typeof cues = [
  { label: "Focus", kind: "effectFocus" },
  { label: "End turn", kind: "endTurn" },
  { label: "Discard from hand", kind: "handTrash" },
  { label: "Trash stacked source", kind: "sourceTrash" },
  { label: "De-digivolve", kind: "deDigivolve" },
  { label: "Evolve level 3 → 4", kind: "digivolve", details: { sourceLevel: 3, targetLevel: 4 } },
  { label: "Evolve level 4 → 5", kind: "digivolve", details: { sourceLevel: 4, targetLevel: 5 } },
  { label: "Evolve level 4 → 6", kind: "digivolve", details: { sourceLevel: 4, targetLevel: 6 } },
  { label: "Evolve level 5 → 6", kind: "digivolve", details: { sourceLevel: 5, targetLevel: 6 } },
  { label: "Evolve level 6 → 7", kind: "digivolve", details: { sourceLevel: 6, targetLevel: 7 } },
  { label: "Memory 1", kind: "memory", details: { steps: 1 } },
  { label: "Memory 5", kind: "memory", details: { steps: 5 } },
  { label: "Block", kind: "block" },
  { label: "Protect", kind: "protect" },
  { label: "Your move", kind: "prompt" },
  { label: "Timer tick", kind: "timerTick" },
  { label: "Phase", kind: "phase" },
  { label: "Security deal", kind: "securityDeal" },
  { label: "Option", kind: "optionUse" },
];
const uninstall = sound.installAudioLifecycle();
function stopComparisons(except?: HTMLAudioElement): void {
  for (const player of players) if (player !== except) player.pause();
  const alternative = element<HTMLAudioElement>("crisp-cues");
  if (alternative !== except) alternative.pause();
  previousCue.pause();
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
  previousCue.volume = alternative.volume;
  previousCue.muted = alternative.muted;
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
for (const cue of [...cues, ...everydayCues]) {
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
async function loadCueComparisons(): Promise<void> {
  const response = await fetch("/audio/previews/cue-comparison.json", { cache: "no-store" });
  if (!response.ok) return;
  const comparisons = cueComparisons(await response.json(), AUDIO_BANK_URL, AUDIO_CUES);
  for (const cue of comparisons) {
    const row = document.createElement("div");
    row.className = "audio-preview__options";
    const label = document.createElement("span");
    label.textContent = cue.label;
    const before = document.createElement("button");
    before.type = "button";
    before.textContent = "Before";
    before.setAttribute("aria-label", `Before ${cue.label}`);
    before.addEventListener("click", () => {
      stopComparisons();
      previousCue.src = cue.previousUrl;
      syncControls();
      void previousCue.play().catch(() => {
        status.textContent = "The previous cue could not play. The applied cue remains available.";
      });
    });
    const after = document.createElement("button");
    after.type = "button";
    after.textContent = "After";
    after.setAttribute("aria-label", `After ${cue.label}`);
    after.addEventListener("click", () => {
      stopComparisons();
      void ready().then(() => sound.playSound(cue.kind, cue.details));
    });
    row.append(label, before, after);
    element("cue-comparison-rows").append(row);
  }
  element("cue-comparison").hidden = comparisons.length === 0;
}
syncControls();
void loadTracks().catch(() => {
  element("candidate-status").textContent = "Some comparison tracks could not load. The applied game mix is available.";
});
void loadCueComparisons().catch(() => {
  /* Keep individual gameplay controls available if prior comparison assets are missing. */
});
const onPageHide = () => stopComparisons();
window.addEventListener("pagehide", onPageHide);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    window.removeEventListener("pagehide", onPageHide);
    stopComparisons();
    uninstall();
  });
