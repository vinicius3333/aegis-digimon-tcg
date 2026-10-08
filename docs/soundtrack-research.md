# Free soundtrack replacement research

Researched on 2026-10-07 in response to feedback that the current music is short, repetitive, and annoying. This research led to the integration of Shortcuts (default), Electric, Out There, and Cipher. The game now serves full compositions from `apps/web/public/audio/music/`; their hashes, source provenance, licenses, and measured levels are in `music/manifest.json`. The first three storage identities are retained for existing preferences. Playback still loops the selected full track; playlist rotation remains future work. Suitability below is inferred from creator descriptions and track metadata, not a claim that the tracks have been listened to in full.

## Previous behavior

Before this replacement, the three choices in `musicTracks.ts` were:

| Setting                 | File                 | Duration       |
| ----------------------- | -------------------- | -------------- |
| Digital Battle, default | `aegis-music-v5.wav` | 26.667 seconds |
| Digital Ascent          | `aegis-music-v4.wav` | 34.286 seconds |
| Warm Drive              | `aegis-music-v6.wav` | 28.235 seconds |

Durations were verified against the old soundtrack manifest before its removal. Both [`sound.ts`](../apps/web/src/design/sound.ts) and [`mediaAudio.ts`](../apps/web/src/design/mediaAudio.ts) enable looping for the selected track; neither rotates through a playlist. A 20-minute session could therefore play the default motif approximately 45 times. The proposed full tracks below are approximately 7.5–10.9 times as long as the default loop.

## Recommended auditions

Start with **Shortcuts** for energetic battles, **Electric** for a more direct electronic alternative, and **Out There** for quieter play. All three are explicitly CC0 on their creators' OpenGameArt submissions. Evaluate a full match at background volume before selecting a default: a longer track can still distract or become tiring.

| Track and creator                       | Duration                   | License   | Creator-described style and proposed role                                                                                                                                                                                                                 | Preview / source                                                                         | Download                                                                                                          |
| --------------------------------------- | -------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Shortcuts — Zane Little Music**       | **4:49.458**, measured     | CC0       | Electronic, EDM, breakbeat, digital fusion; tagged battle/fight. The composer describes deliberately varying repeated melodies. Strong first audition for the game's digital battle theme; its very fast, busy style needs a distraction check.           | [Creator submission](https://opengameart.org/content/shortcuts)                          | [OGG, 4.7 MB](https://opengameart.org/sites/default/files/shortcuts.ogg)                                          |
| **Electric — Sudocolon**                | **3:21.273**, measured     | CC0       | Space, techno, electronic; described as futuristic. Alternative for a consistently electronic direction.                                                                                                                                                  | [Creator submission](https://opengameart.org/content/electric-0)                         | [MP3, 8.1 MB](https://opengameart.org/sites/default/files/Electric.mp3)                                           |
| **Space Music: Out There — yd**         | **4:02.004**, measured     | CC0       | Space background music; tagged loop. Candidate for deck building, menus, and calmer matches.                                                                                                                                                              | [Creator submission](https://opengameart.org/content/space-music-out-there)              | [OGG, 3.9 MB](https://opengameart.org/sites/default/files/OutThere_0.ogg)                                         |
| **Cipher — Kevin MacLeod**              | **3:51**, official catalog | CC BY 4.0 | Bright, grooving, uplifting; synths, electric piano, percussion, strings; 150 BPM. Energetic alternative. The composer flags a persistent hook, so assess repetition fatigue.                                                                             | [Track page](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100844)    | Free download on track page                                                                                       |
| **Space 1990 — Kevin MacLeod**          | **4:26**, official catalog | CC BY 4.0 | Calming, grooving, relaxed; synths, drum kit, bells; 56 BPM. Candidate for menus and longer thinking turns.                                                                                                                                               | [Track page](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200108)    | Free download on track page                                                                                       |
| **Neon, No Melody mix — Scott Buckley** | **4:19.327**, measured     | CC BY 4.0 | Moody 1980s-inspired synthwave, arpeggios and pads. The creator explicitly provides a No Melody mix, making it a promising background audition. Secondary option because YouTube use needs description credits to avoid the composer's Content ID claims. | [Composer track page and alternate mixes](https://www.scottbuckley.com.au/library/neon/) | [No Melody MP3, 10.4 MB](https://www.scottbuckley.com.au/library/wp-content/uploads/2019/09/sb_neon_nomelody.mp3) |

OpenGameArt rows cite the creator's own license declarations and descriptions. Kevin MacLeod's duration, instruments, mood, BPM, filename, and ISRC were checked against his [official machine-readable catalog](https://incompetech.com/music/royalty-free/pieces.json): `Cipher2.mp3`, ISRC `USUAN1100844`; `Space 1990.mp3`, ISRC `USUAN1200108`. The current [composer FAQ](https://incompetech.com/music/royalty-free/faq.html) gives CC BY 4.0 attribution instructions and specifically covers games and streaming. Neon's main and No Melody downloads are both supplied on the composer's track page.

## Free-use terms

- **CC0:** permits copying, modification, distribution, and commercial use without asking permission. Attribution is not required, but retaining creator and source information is useful. See the [official CC0 deed](https://creativecommons.org/publicdomain/zero/1.0/).
- **CC BY 4.0:** permits redistribution and adaptation, including commercial use, with appropriate credit, a license link, and an indication of changes. See the [official CC BY 4.0 deed](https://creativecommons.org/licenses/by/4.0/). A discoverable game credits screen is consistent with [MacLeod's instructions](https://incompetech.com/music/royalty-free/faq.html).
- **Neon:** the composer explicitly allows commercial projects with credit and specifies YouTube description attribution. His [usage page](https://www.scottbuckley.com.au/library/using-this-music/) also instructs users not to submit the music or remixes to fingerprinting services or redistribute it as a standalone music release. These operational requirements make it less convenient for a game whose players stream or upload gameplay.

Suggested CC BY credit entries, with clickable source and license links in the actual credits UI:

> “Cipher” by Kevin MacLeod (incompetech.com). Licensed under CC BY 4.0. [Track](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1100844) · [License](https://creativecommons.org/licenses/by/4.0/).

> “Space 1990” by Kevin MacLeod (incompetech.com). Licensed under CC BY 4.0. [Track](https://incompetech.com/music/royalty-free/index.html?isrc=USUAN1200108) · [License](https://creativecommons.org/licenses/by/4.0/).

> “Neon” (No Melody mix) by Scott Buckley. Released under CC BY 4.0. [Composer](https://www.scottbuckley.com.au/) · [Track](https://www.scottbuckley.com.au/library/neon/) · [License](https://creativecommons.org/licenses/by/4.0/).

Add a description of any edits actually made, such as normalization or fade changes. Optional CC0 credits can use the same title/creator/source structure without a required attribution notice.

## Integration implications

1. Preserve full compositions rather than cutting them into another short motif. A playlist of the first three candidates totals approximately **12:13**, instead of returning to the default motif every 27 seconds. Rotation between tracks would require playback changes; merely replacing files preserves the current single-track loop behavior.
2. Audition transitions and endings. Full-song downloads do not necessarily have seamless loop boundaries; use track rotation or a short crossfade where needed. Do not assume the free full-song versions include the paid Deluxe stems or loop variants advertised by Zane Little.
3. Download and serve selected files from the application's own asset hosting. Retain source URLs, license version, downloaded-file hash, and credits alongside their asset metadata.
4. Use compressed browser-compatible music files rather than shipping several minutes of uncompressed WAV. The current Web Audio path decodes the complete file; stereo float PCM at 44.1 kHz takes roughly 102 MB for a 4:49 track. Loading all playlist tracks simultaneously would need a memory strategy, especially on mobile. Confirm codec playback in both Web Audio and the media-element fallback.
5. Normalize the selected music to a consistent background level and verify that turn/action sound cues remain clear. Existing track metadata and settings labels will need updating when a selection is integrated.

## Measurement evidence

The measured durations were obtained directly from the linked download assets, using:

```sh
ffprobe -v error -show_entries format=duration,size:stream=codec_name,sample_rate,channels -of json '<download URL>'
```

| Asset                  | Seconds    | Codec  | Sample rate | Channels |
| ---------------------- | ---------- | ------ | ----------- | -------- |
| `shortcuts.ogg`        | 289.458322 | Vorbis | 44100 Hz    | 2        |
| `Electric.mp3`         | 201.273450 | MP3    | 44100 Hz    | 2        |
| `OutThere_0.ogg`       | 242.004172 | Vorbis | 44100 Hz    | 2        |
| `sb_neon_nomelody.mp3` | 259.327370 | MP3    | 44100 Hz    | 2        |

Other verified candidates were not prioritized: [Electronic Outlaw](https://opengameart.org/content/electronic-outlaw) is CC0 but only 2:53.555; [Technological Messup](https://opengameart.org/content/technological-messup) is CC0 but 1:46.667; [Gods Forbid](https://opengameart.org/content/gods-forbid) is CC0 but 1:16.800. These are longer than the current assets but less effective for the stated repetition complaint.

## Applied assets

Regenerate the selected compressed assets with `node tools/diagnostics/prepare-licensed-music.mjs` (requires FFmpeg and FFprobe). This keeps the full tracks, adjusts gain with encoding headroom, and adds 50 ms opening and 150 ms closing fades. Attribution links and an edit notice appear beside the selected soundtrack in Settings, match settings, and the audio preview. The previous music files, candidate sources, composition code, and generation tools have been removed. Card sound effects remain unchanged.
