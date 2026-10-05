# Improved original game audio

Applied warm tactile direction: original generated paper friction, impact body and crystal material blended with authored damped resonators, filtered air, transient grain and musical plucks. The crisp restrained alternative uses shorter, brighter, quieter layers. Both faithful six-cue comparisons are in `apps/web/public/audio/previews/index.html`: draw, cost-12 play, activation, level-3 to level-6 evolution, impact, security crack. This worker does not claim subjective listening.

All 31 SoundKinds have recipes. The 103-clip bank includes integer printed costs 0–15 with/without Assembly and source levels 1–7 × target levels 2–7. Unknown/nonfinite metadata keeps neutral defaults. Existing painted-occurrence routing, physical identity and animation clocks remain unchanged. Higher costs produce lower/longer tactile bodies; evolution varies musical starting note, rise spacing, resolve and tail with physical source/target levels. Material friction serves paper families; windup precedes low-mid impacts; security uses brittle glass, deletion dissolves, and turn cues use restrained motifs.

## Research and original inputs

[MDN Web Audio techniques](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Advanced_techniques) informed envelopes, filtered noise, modal timbres and preloaded buffers. [The official generation prompt guide](https://stability.ai/guides/stable-audio-3-prompt-guide) informed explicit material/action/production descriptions. These are techniques, not copied assets.

Three locally generated original sources are committed under `public/audio/sources`. `provenance.json` records prompts, seeds, source/mastered hashes, crops/fades and model commands. The validation partner generated these using the official optimized local model; its model-use evaluation context is recorded. Playback and deterministic bank authoring need no service/account/model. Committed sources are offline reproducible inputs. The separate generated 44-second music candidate was excluded because its tempo/key alignment with the authored score is unverified.

## Steady score and runtime

The user's final correction specifies one consistent rhythm. The applied original 24-second score contains eight bars at 80 BPM, Gmaj9 → Em9 → Cmaj9 → Dsus/add9, with overlapping pads, muted plucked melody/countermelody, low pulse and brushed texture present from the start. It has no activity/time/decision intensity changes. Game and preview use the same finished score PCM. Music restarts at the match's current phase using the decoded buffer's actual duration.

App mount preloads two WAVs. Only trusted input creates/resumes AudioContext and asynchronously decodes them. Effects prepare independently of music downloads. A cue only selects an existing buffer offset and starts one source; no fetch/decode/render/oscillator work occurs in animation callbacks. Unready cues skip without delayed replay; failures retry on a later gesture. Disposal rejects stale async completion. Independent persisted SFX/music controls, visibility suspend/resume, bfcache fresh-gesture recovery and teardown remain intact.

Maximum eight SFX voices; same-kind 75 ms coalescing; one active score source and at most one outgoing 120 ms fade. Separate stop gates prevent old music tails from reviving on rapid unmute. Fixed SFX mix gain 0.38 leaves eight 0.30-bound peaks plus a 0.08 music bound below 0.992 at full user volumes, before the compressor.

## Reproduction and evidence

`node tools/diagnostics/render-original-audio.mjs` rebuilds the applied 48 kHz mono PCM16 assets, offsets, manifest and previews using the authoritative `audioRecipes.ts` plus committed sources. `AUDIO_SAMPLE_RATE=44100 node tools/diagnostics/render-original-audio.mjs /tmp/aegis-audio-44100` renders 44.1 kHz without overwriting bundled offsets. Manifest records renderer/source hashes, every clip's structure/offset/duration, composition grid and measured levels.

Measured bank: 103 clips, 77.344 seconds including 25 ms separators, peak 0.288524 (−10.80 dBFS), mean DC −0.00000371, zero cue endpoints. Score: 24 seconds, peak 0.058320 (−24.68 dBFS), mean DC −0.0000000144, circular boundary step 0.000602 (<0.001). Runtime assets total 9.73 MB PCM16; decoded mono float PCM approximately 19.46 MB, asynchronously prepared outside presentation.

Focused tests cover all variations, source incorporation, deterministic 44.1/48 kHz generation, shipped PCM identity, DC/headroom/seams, 80 BPM grid, bank routing, caps/coalescing, independent mute, music phase, failed downloads/decode, stale completions, visibility, teardown and bfcache. Existing causal routing tests remain green. Web TypeScript/build, scoped lint/format and `git diff --check` are required for closeout. This lane ran no browser/native jobs without a lease; integration owner performs final browser/native and listening acceptance.

Closeout results: `pnpm --filter @aegis/web exec vitest run src/design/sound.test.ts src/design/audioRecipes.test.ts src/game/soundEvents.test.ts src/game/match/present/presentationAudio.test.ts` passed 34 tests across four files; `pnpm --filter @aegis/web typecheck`, `pnpm --filter @aegis/web build`, scoped `pnpm lint:files`, scoped `pnpm format:files:check` and `git diff --check` passed. Build reports existing chunk-size/dynamic-import warnings; local Node 24 emits the repository's Node 26 engine warning.
