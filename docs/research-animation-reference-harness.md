# Animation comparison harness

Primary-source research and implementation, 2026-10-03. Inspected the current Aegis checkout, the user-supplied [gameplay reference](https://www.youtube.com/watch?v=kYBHuw7ItSg). The recorded client and our renderer use different layouts. Video observations and source constants are separated below.

The user explicitly requires preserving Aegis's own layout and visual design, including colours, typography, components, slot geometry and resting card sizes. The external reference guides card motion, timing and effects only. Compare travel relative to the actual Aegis source and destination, and check that the card settles into its existing slot at its existing size. Project text and commit messages use neutral descriptions of the reference.

## Verified Aegis foundation

| Existing seam                                                                                                                                                | Capability and practical limit                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [EffectsLab](../apps/web/src/dev/EffectsLab.tsx)                                                                                                             | Runs real server scenarios and records batches, queue steps, decisions and visible board through `PresentationProbe`. Its `__aegisEffectsLab` bridge supplies the current board and trace. Playback offers pause, rate, one queue entry and fast-forward.                                                                                                                         |
| [AnimationInventory](../apps/web/src/dev/AnimationInventory.tsx), [animationCatalog](../apps/web/src/game/animationCatalog.ts)                               | Shared event-to-family coverage, recipe owners, timing names and scenario links. “Observed” means a recipe started; it does not prove visible movement.                                                                                                                                                                                                                           |
| [LiveMotionHarness](../apps/web/src/dev/LiveMotionHarness.tsx), [liveMotionProbe](../apps/web/src/dev/liveMotionProbe.ts)                                    | Opt-in DOM/WAAPI sampling and JSON export through `__aegisLiveMotion`. Records changing visual properties, timeline advance, hidden/paused state, finite-animation truncation and toast/deletion lifetime. Capped at 600 entries per list; this is an aggregate report, not a stored image for every frame. [Interpretation and limitations](../apps/web/src/dev/LIVE_MOTION.md). |
| [PacingTuner](../apps/web/src/dev/PacingTuner.tsx), [pacing](../apps/web/src/game/pacing.ts), [effectSequence](../apps/web/src/game/match/effectSequence.ts) | The lab restores match-default stacked pacing. At Normal, field effects use 720 ms source focus + 200 ms announcement + 100 ms settle; retained clauses have a 5,000 ms stack budget. Chain-tail acceleration preserves source orientation.                                                                                                                                       |
| [timings](../apps/web/src/game/timings.ts)                                                                                                                   | One motion-duration table with CSS properties. Current play flight is 460 ms desktop/540 ms touch; suspend rotation 200 ms; shatter 260 ms, full deletion 350 ms. These are Aegis settings, not video measurements.                                                                                                                                                               |
| [EffectFocus](../apps/web/src/game/EffectFocus.tsx)                                                                                                          | Focuses an accepted, unlinked field source with an input-transparent mask; measures its actual transformed bounds; suppresses focus during target selection; plays `effectFocus` once for a valid visible activation.                                                                                                                                                             |
| [animations](../apps/web/src/game/animations.ts)                                                                                                             | `useEnterAnimation` tracks new entries for CSS classes; it is entrance bookkeeping rather than the match's motion coordinator.                                                                                                                                                                                                                                                    |

Presentation coordination belongs to [useMatchCues](../apps/web/src/game/useMatchCues.ts), [presentBatch](../apps/web/src/game/match/present/presentBatch.ts) and [animationQueue](../apps/web/src/game/animationQueue.ts). Tracks serialize related work and gates order cross-track dependencies. [visibleBoard](../apps/web/src/game/screen/model/visibleBoard.ts) projects the cards, piles, rotations, DP and memory actually presented; raw state revisions alone can expose outcomes before their visual gates release them. [Animation architecture](../apps/web/src/game/ANIMATIONS.md).

## Recommended integration

These research recommendations guided the implemented reference viewer below. A deterministic live-game frame clock remains a separate architectural change.

1. **Add a development reference viewer beside the current lab.** Load a local video/frame manifest with actual frame timestamps, dimensions and source URL. Offer exact indexed previous/next frame, clip in/out, speed and annotated beats. Use decoded frames when an exact frame matters; `video.currentTime` requests a time rather than proving the displayed frame. Record which intervals have been inspected instead of claiming whole-video review from a contact sheet.
2. **Compare homologous beats.** Annotate source focus, popup entry, result onset, travel/impact and final settle, with family, source zone and uncertainty. Align clips by a shared beat rather than raw match start. Report normalized card travel, rotation, scale and count-change order; different layouts make raw pixel diffs misleading.
3. **Reuse the real lab renderer and probes.** Place the viewer in `EffectsLab`, map annotations to `animationCatalog` families, and join queue origin/batch metadata to `visibleBoard` plus the live motion report. Keep external footage as a visual reference; it does not establish authoritative rules.
4. **Distinguish queue step from frame step.** `animationQueue.stepOnce()` releases one entry, including its waits; it does not advance one frame. [documentPlayback](../apps/web/src/dev/documentPlayback.ts) pauses CSS/WAAPI motion, but explicitly leaves independent rAF loops, narration expiry, decision budgets and gate ceilings on real time. A deterministic Aegis frame scrubber therefore needs a replay/clock boundary for those mechanisms or pre-recorded Aegis frame capture. Until then, label reference-frame navigation and live queue controls separately.
5. **Tune only measured gaps.** Preserve current acceptance, cause-before-result, visible-board and decision contracts. Adjust concrete travel/impact durations in `timings.ts`, effect orientation/text/settle in `pacing.ts`, and recipe choreography beside its catalog owner. Compare field, hand, trash, play, evolution, attack, security and deletion independently. Keep the existing focus sound's occurrence gating.

## Meaningful validation

Use an indexed frame fixture to verify first/last boundaries, nonuniform timestamps and restart/backward navigation. Check paused-frame identity in the reference viewer and playback resumption. If live Aegis frame stepping is introduced, test independent timer expiry and gates while paused; advancing only WAAPI time is insufficient.

Run focused queue/playback/probe/catalog/timing/EffectFocus tests appropriate to changed seams. Run `pnpm --filter @aegis/web pacing:measure` for real-engine cause-before-result, acceptance/decline and gate recovery; [pacing.measure.test.ts](../apps/web/test/pacing/pacing.measure.test.ts) exports `.pacing-report/` and compares the committed baseline. Use `pnpm --filter @aegis/web test:browser effects-lab-pacing.spec.ts` for desktop/touch geometry, reduced motion, visible arrivals and live rendering. The [live-motion check](../tools/check-live-motion.mjs) verifies the shared deletion recipe and rejects undersampled captures; it does not validate all engine rules or every animation family.

## Decoded video and inspected intervals

The downloaded primary video is a **Necromon vs Justimon BT23 gameplay reference**, published by AriSu on 2025-12-02. `ffprobe` reports 1920×1080, 60000/1001 fps (59.940), 677.710367 seconds and **40,622 frames**. Every frame was extracted at 960×540 without FPS resampling. The manifest records each decoded presentation timestamp; the original 1080p video is retained locally.

Review coverage is explicit: whole-video contact sheets at 15-second intervals, denser samples for six animation families, and an initial **331 consecutive frames** inspected individually within contact sheets for the four intervals below. Later additions bring unique consecutive-frame coverage to **756/40,622**, as recorded in the dated checkpoints below; the latest75 are focused crops of the field arrival. This does not claim individual review of all 40,622 frames. The harness exposes the whole sequence for further inspection.

| Interval inspected without skipping frames | Frame indices (zero-based, inclusive) | Observation                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 627.360067–628.494533 s                    | 37604–37672 (69 frames)               | The source card is already surrounded by a green indicator. A separate white/yellow activation halo develops around 628.027400 s (f37644), expands/brightens and settles around 628.411117 s (f37667). The clause remains in the left column. The roughly 384 ms visible flash is a measured visual beat, not the full engine wait. |
| 27.811117–29.095733 s                      | 1667–1744 (78 frames)                 | Breeding evolution separates a bright reveal, a readable enlarged card, a short exit, and the destination sparkle. The large-card exit is underway at roughly 28.2 s; the arrival light is visible near 28.8–29.0 s. A single undifferentiated duration would hide this choreography.                                               |
| 539.005133–540.389850 s                    | 32308–32391 (84 frames)               | Security separates origin/target indication, a bright reveal near 539.3 s, then the card's arrival at the side. Motion settles while earlier clauses remain visible. This clip does not establish a universal security reading budget.                                                                                              |
| 492.091600–493.742583 s                    | 29496–29595 (100 frames)              | Manual targeting first grows the arrow under the player's control. After the source suspends, the confirmed attack advances the arrow twice and retains it. The automatic second advance is visible around f29564; this differs from blinking the whole shaft.                                                                      |

Other clips in the selector cover Option play (32.5–35.5 s), attack declaration/effects (492–495 s) and deletion (632.7–634 s). These were inspected as denser samples, not with the same consecutive-frame coverage. Fast cuts, prompts and overlays in the supplied gameplay make its total wall time unsuitable as a universal engine pacing constant.

## Implemented harness and animation change

Open **`/dev/motion-reference`** on the local Vite server. The harness provides indexed previous/next frames, direct frame entry, clip selection, slow video playback and looping, zoom with scrolling, A/B elapsed-time measurements, per-frame notes and JSON export. A paused frame is an extracted JPEG; its label changes only after that image decodes. Browser video-frame callbacks use a microsecond matching tolerance for ffprobe timestamp rounding.

The comparison pane embeds the real Arena, BattleLab or EffectsLab. It can instead open a prepared Aegis recording with the same indexed controls. Each pane has an independent clock: recorded comparison permits honest backward navigation; live queue stepping remains an event-level tool.

A first scoped game improvement adds two short source-local halo rings to `EffectFocus`, keyed by accepted activation so consecutive effects from the same card replay the pulse. The 360 ms ring duration plus 60 ms second-ring offset follows the measured short flash, while the existing orientation hold, clause reading, result gates and focus sound remain coordinated by their existing owners. The rings follow the measured transformed card bounds, including suspended sources; reduced motion retains the static source outline and hides the animated rings.

Downloaded media, decoded frames and recordings live in ignored local directories. Vite serves only permitted reference filenames through a development middleware with byte-range/HEAD support. They are outside `public/` and absent from the production output.

```sh
# Download the supplied video and index/extract every frame (yt-dlp, ffmpeg, ffprobe required).
pnpm motion:reference

# Capture two real field activations from the running local Arena and prepare their recording.
pnpm motion:capture --base http://localhost:5174

# Prepare another MP4/WebM recording for the right-hand pane.
pnpm motion:reference --input /path/to/recording.webm --id aegis-security --title "Aegis security"

# Regression for changing a source while keeping its dataset id.
node --test tools/diagnostics/prepare-motion-reference.test.mjs
```

The preparer fingerprints source contents with SHA-256 and invalidates timestamps and decoded pictures together on replacement. Per-frame notes are keyed to the same content identity. `--force` regenerates the index/pictures. Preparing a recording requires reloading the viewer; capture start times depend on browser scheduling and are not fixed replay anchors. The verified Aegis capture has 166 frames at 25 fps; compare elapsed milliseconds rather than raw frame counts across sources.

## Validation completed

- 182 focused Vitest tests passed, including actual HTTP asset ranges/HEAD/missing files, nonuniform timestamps and microsecond rounding, accepted source pulse remounts, live motion sampling, visual playback and mobile animation/layout contracts.
- The importer replacement/cache-reuse regression passed with two generated videos.
- TypeScript and the web production build passed; source media is absent from `dist/`.
- Browser verification covered exact frame advancement, 16.7 ms adjacent-frame measurement, video play/pause, a prepared Aegis recording, the real embedded Arena, and 390 px mobile layout without horizontal page overflow.

These visual changes add no engine rules or new resolution waits, so the full pacing matrix was not rerun.

## Particle comparison follow-up

The consecutive breeding-evolution frames show narrow rays of unequal reach around a white centre, with bright magenta light for the purple card. The former eight equal rays, orange evolution and closed spinning rings did not reproduce that shape. `CardBurst` now uses 24 fixed variations in angle, length and width, with tapered tips and a soft white/coloured bloom. Evolution uses white into the card's primary hue. Light colours are brighter than the interface rims; magenta follows the inspected footage, while the other colours remain an approximation based on card identity.

Field arrival, evolution and hatch no longer draw closed rings. Draw, security and deletion retain their own rings. The delayed ring now finishes on its parent's clock: 600 ms for draw, 250 ms for shield shatter, 350 ms for field deletion and the clash outcome. The source focus pulse remains a separate accepted-activation cue.

`pnpm motion:capture:bursts --base http://localhost:5174` records normal-speed scenes through the actual Arena/GameScreen renderer, samples their CSS clocks each animation frame, checks that brightness is reached and that the light finishes before its owner detaches, then indexes the resulting video. It uses development event fixtures; it does not verify engine rules or synchronize the browser recorder with the page clock. Open `/dev/motion-reference?comparison=aegis-card-bursts` to inspect the recording beside the primary source.

The verified capture has **382 indexed frames at 25 fps (15.28 s)**. Its measured visual lifetimes were:

| Scene       | Burst            | Observed owner lifetime | Longest CSS animation, including delay | Last sampled ray opacity |
| ----------- | ---------------- | ----------------------- | -------------------------------------- | ------------------------ |
| Ascension   | Evolution        | 816.6 ms                | 800 ms                                 | 0.0029                   |
| Fortitude   | Arrival          | 799.9 ms                | 800 ms                                 | 0.0002                   |
| Jamming     | Security shatter | 350 ms                  | 250 ms                                 | 0                        |
| Retaliation | Deletion         | 349.9 ms                | 350 ms                                 | 0                        |

375 focused tests and the production build passed. Browser screenshots inspected the actual evolution burst at its peak; the normal-speed recording was also inspected as an overview and loaded into the comparison pane. Browser checks at 320, 768, 1024 and 1440 px confirmed 24 rays, no horizontal page overflow and hidden decorative bursts under reduced motion. Code review found no remaining timing/cascade issues. These checks prove visible light and completed lifetimes in the exercised scenes, not full animation fidelity.

## Central card reveal follow-up

Normal public play and digivolution now use four distinct beats for both seats: **100 ms white rotation, 160 ms face reveal, 160 ms recognition hold and 140 ms narrow upward exit**, totalling 560 ms. This follows the inspected breeding-evolution sequence and the normal-reveal constants in the reference implementation. The separate 1.45 s special transformation is not treated as a normal reveal. Aegis retains its card frame, caption, colours, typography and board layout.

`CardReveal` serializes the shared visual stage after each caller's causal gate opens. Independent effect-result and token arrivals cannot overwrite one another or reserve the stage ahead of their own announcing clause. Options dock after the reveal; bonus digivolution draws wait for the destination light's 200 ms peak, including when the draw arrives in a later server batch. Queued and active cancellation release both presentation handoffs and return held field cards. A single queue-clock wait aligns the CSS and DOM lifetimes; pause freezes the handoff without spending a wall-clock timeout.

Arrival narration uses a stable track per physical permanent. Accepted clauses survive a replacing security cue, while later arrivals still wait for their preceding causal announcement. Receipt-only activations are excluded when inferring that announcement, preventing an initial play from waiting for its own On Play clause. Regressions cover these dependencies, simultaneous public arrivals, replacing security, cancellation while paused, resuming after ten seconds, fast-forward and replay.

`pnpm motion:capture:reveals --base http://localhost:5174` records the real Arena/GameScreen renderer at normal speed and samples the reveal's CSS transformations, opacity and lifetime every animation frame. It checks the readable face, painted thin exit, completed CSS clock and single-stage ownership. The development fixtures exercise rendering rather than engine legality. Inspect the recording at **`/dev/motion-reference?comparison=aegis-card-reveals`**.

The verified recording contains **353 indexed frames at 25 fps (14.12 s)**. Observed lifetimes were 566.6 ms for Ascension, 583.3 ms for Fortitude, and 583.4 / 566.6 ms for the two successive Partition cards. Each had 34–35 animation-frame samples, with one central reveal at a time and no page errors. Consecutive recording frames 44–65 were visually inspected through the white turn, face reveal, recognition hold and upward exit. The recorder and page have independent clocks; their frame indices are not interchangeable.

Verification includes the full 119-case pacing matrix and a baseline refresh after its invariants passed, 190 focused ordering/cue tests, TypeScript, lint and the production build. The full web run passed 2,296 tests; its two breeding scenarios were rejected during matchmaking and both passed on an isolated retry. Seven browser cases passed across the final focused runs: public arrival before On Play and repeated Tamer destination geometry on desktop and phone, optional watcher acceptance on both, and decline on desktop. The accepted notice remains visible 5.5 seconds after its first observed paint; both physical sources publish their own painted occurrence without extending the notice lifetime. Screenshots at 320, 768, 1024 and 1440 px confirmed the retained Aegis layout without horizontal overflow, and reduced motion disables the decorative reveal motion. Final code review found no remaining blockers in the gates or cancellation paths.

Replacing a recording with a shorter source also removes decoded pictures beyond its new timeline; the importer regression verifies both content invalidation and that cleanup.

## Confirmed target arrow follow-up

The automatic sequence was isolated from manual aiming in source frames 29496–29595. After the source finishes its suspension, the arrow grows twice toward the destination; the second grow is visibly distinct around f29564. The inspected target-arrow implementation uses 85 ms per extension, 70 ms after each, and a final 70 ms settle. The former Aegis whole-arrow blink reproduced neither the advancing shaft nor the moving tip.

`AttackArrow` retains the Aegis chevron shapes, colour, width, gradient and endpoint gap. Its branch uses local coordinates, an individually identified clip and a moving tip on the same 155 ms cycle, repeated twice. The completed arrow remains attached to its measured endpoints. SVG clipping restricts paint without changing the geometry, as described in the [SVG clipPath documentation](https://developer.mozilla.org/en-US/docs/Web/SVG/Reference/Element/clipPath). A newly confirmed attack waits for the actual CardMini rotation transition; there is no fixed wait for an untapped source or reduced motion. A redirect retains the existing key and completed sweep state rather than remounting the arrow. The field-clash handoff now includes the final settle, changing 340 ms to the measured 380 ms.

`pnpm motion:capture:arrows --base http://localhost:5174` records Rush and Raid field attacks and the opponent's Blocker scene in the real Arena/GameScreen renderer. The persisted recordings are **291 frames / 11.64 s on desktop** and **282 frames / 11.28 s on phone**, both at 25 fps. Open `/dev/motion-reference?comparison=aegis-target-arrows-desktop` or `?comparison=aegis-target-arrows-phone`; the primary selector includes a precise confirmed-attack clip at 493.009183–493.409583 s.

All six capture cases passed with 74–99 rAF samples per arrow. Each observed 13–16 source-rotation frames before the arrow mounted, two separately painted advances, completed 310 ms CSS clocks, and stable tip/shaft progress. The capture derives the expected edge independently from the real source and destination card/security rectangles. Both Blocker destinations—security, then the physical intercepting Digimon—must paint without restarting. The maximum settled endpoint error was 0.189 px on desktop and 0.000019 px on phone. This proves the exercised visual geometry; development fixtures do not establish engine legality.

Consecutive desktop recording frames 48–77 were visually inspected through suspension, both advances and the persistent endpoint. Screenshots at 320, 768, 1024 and 1440 px confirmed partial and completed arrows without horizontal page overflow; reduced motion has zero arrow animations and fully drawn geometry. The 119-case pacing matrix passed against the existing baseline; the affected blocking scenario gained 32 ms after fake-clock quantization, without weakening its invariants. 287 focused tests, TypeScript, lint and the production build passed. Review found no remaining blockers in clipping, rotation order, redirects or reduced motion.

The full fidelity goal remains incomplete. The 800 ms field-light owner still outlasts the 200 ms landing handoff; its interaction with source focus needs a separate comparison. Attack impact, security reveal/dock, hatch, hand/trash focus and movement/result families still need their own source-aligned recordings and verification. The measured reveal and target-arrow work do not establish full animation parity.

## Combat claw motion follow-up

The inspected battle implementation translates its entire masked claw from a diagonal offset to the loser in **250 ms with cubic acceleration**, then waits **100 ms** before removal. The former Aegis paths instead drew and dissolved separately, with 24 ms stagger. The revised claw preserves Aegis paths, warm-white strokes and orange glow, while translating the whole SVG inside the card's clipping boundary. Its final frame persists until the existing owner removes it. Security uses the scene's outcome delay on that same SVG. No layout, card dimensions, queue waits or scene durations changed.

This motion comparison currently relies on the inspected implementation, not a newly isolated consecutive battle-impact interval in the supplied video. Further sampled footage includes effect deletions and security Options; those do not establish the claw's appearance in an actual battle. The previously recorded 331 consecutive source-frame coverage remains unchanged. The source artwork was inspected but is not copied into Aegis.

`pnpm motion:capture:impacts --base http://localhost:5174` records normal-speed Rush, Retaliation and Jamming through the real Arena renderer on desktop and phone. The captures contain **345 frames / 13.8 s on desktop** and **325 frames / 13 s on phone**, both at 25 fps. Inspect `/dev/motion-reference?comparison=aegis-combat-impacts-desktop` or `?comparison=aegis-combat-impacts-phone`.

All six scenes passed, including both physical claws in each Retaliation scene. Per-frame sampling verified the normalized diagonal cubic trajectory, clipping, three paths sharing one clock, completed zero translation and continued full opacity. Field owners lasted **350–366.7 ms**, with **66.7–83.3 ms** visible after the first sampled completed frame. Security claws retained the **1283 ms outcome delay** and stayed mounted through the scene exit (**1783.2–1799.9 ms** total); their visible completed hold exceeds the field settle. This observation does not establish parity for the security scene's shatter, verdict or exit. Finished CSS clocks stop at their end time, so the capture measures visible hold with continuing page timestamps rather than requiring an impossible clock beyond 250 ms.

Consecutive desktop recording frames 120–136 were visually inspected through the field claw's diagonal entrance, completed hold and deletion, and frames 306–333 through the security outcome. Screenshots at 320, 768, 1024 and 1440 px retained the existing Aegis layout without horizontal overflow; switching to reduced motion hid the mounted claw and removed its animation at all four widths. 275 focused combat/security/cue tests, TypeScript, lint and the production build passed. Final code review found no remaining blockers. The new capture exercises visual event fixtures, not engine legality. Queue timing is unchanged, so the pacing matrix was not repeated for this motion-only change. Full combat-impact fidelity, including source video alignment, attacker movement and loser vibration, remains pending.

## Security reveal follow-up

The authored security clips grow the card from scale 0.05 to 0.6 while moving left and then returning to their final position. The two seats have different vertical paths. Their **233 ms** curves use cubic Hermite interpolation: the horizontal midpoint is five-sixths of the final card width to the left, and a white cover fades through 0.8 at the midpoint to reveal the face. Aegis now samples those normalized curves in 21 linear keyframe poses, retaining its final card size, frame, captions and board composition. On narrow screens the horizontal excursion is reduced to **30% of card width** so the card stays visible in the existing lane; this adaptation deliberately differs from the source amplitude.

Source frames **32308–32335** were reinspected through the opponent card's white entrance, face and blue light. They are a subset of the previously inspected security interval, so consecutive source-frame coverage remains **331**, not a new increase. The precise selector clip is 539.055183–539.405533 s. The inspected coroutine waits 200 ms before disabling a 233 ms authored animation; the footage does not resolve that scheduling difference precisely. Aegis uses the complete authored curve rather than claiming an exact runtime freeze match.

The revealed card now emits the existing Aegis rays in blue behind its art for **170 ms**, after its entrance. Recognition and battle preparation share a **470 ms** hold (170 + 300); an unresolved server verdict can still extend the scene through its existing causal gate. The minimum outcome begins at **853 ms**, and the scene totals **1363 ms**. This supersedes the historical 1283 ms security delay measured in the preceding combat capture. No source artwork was copied.

An initial real-renderer capture failed because a later impact animation's backwards fill overrode the entire reveal transform. Removing that duplicate transform owner restored the entrance and prevents a winner from shaking with the loser. Glow and fall animations now retain their own forward fill. Security-specific reduced-motion selectors were also strengthened after browser sampling exposed active animations left by the spent-card cascade.

`pnpm motion:capture:security --base http://localhost:5174` records both seats through the actual Arena/GameScreen renderer and includes visibly marked `effect` and `trashed` CSS variant probes. Those probes change the resolution selector on the same rendered component; they verify the CSS cascade, not effect engine events. The eight exercised cases passed an independently reconstructed Hermite trajectory, completed white-to-face transitions, stable readable cards, a painted blue peak and its disappearance before the outcome. Each captured 13–14 entrance samples and 78–83 total animation-frame samples. Observed scene owners lasted **1366.5–1383.3 ms**, with peak sampled ray opacity above 0.990.

The final recordings contain **496 frames / 19.84 s on desktop** and **489 frames / 19.56 s on phone**, at 25 fps. Open `/dev/motion-reference?comparison=aegis-security-reveals-desktop` or `?comparison=aegis-security-reveals-phone`. Consecutive desktop recording frames **78–104** and **222–251** were visually inspected through the opponent and viewer entrances, readable hold, blue light and subsequent outcome. Recorder and source timestamps remain independent.

The full **119-case pacing matrix** passed before its baseline was refreshed; paced sequential and stacked runs retained zero missing notices, unreadable clauses, early results, cost overtakes, unanswered optional branches, stranded gates or dropped events. **275 focused tests**, TypeScript and the production build passed. Browser checks at **320, 768, 1024 and 1440 px** verified visible midpoint cards and unchanged resting transforms without horizontal page overflow; reduced motion has zero scene animations and no white cover. Final code review found no remaining blockers. These checks establish the exercised reveal behavior, not complete security fidelity: docking, the exit, attacker movement and loser vibration still need separate source comparisons.

## Continuous security dock transfer follow-up

The security-effect card travels directly to its execution slot in source frames **32336–32342**, following the reveal light. Frames 32328–32367 were reinspected to separate movement from the later clause; these remain within the existing 84-frame security interval, so consecutive source coverage stays **331**. The harness adds a precise docking clip at 539.422217–539.622417 s.

The inspected `MoveToExecuteCardEffect` uses **120 ms** and leaves easing at the project's default. Its serialized `DOTweenSettings.asset` specifies enum value **6**, which is `OutQuad` in the [library's enum](https://github.com/Demigiant/dotween/blob/develop/_DOTween.Assembly/DOTween/Ease.cs). The downloaded settings match the committed LFS object's SHA-256 `07e777aa94db323f67f7afd2b7fc53c2e5562df60f1541c2e9ae9f76e7ee5cc3`. This resolves a conflicting older XML description of the library default; the current [official documentation](https://dotween.demigiant.com/documentation.php) also names `OutQuad`. No settings or artwork were copied into Aegis.

For a still-resolving security effect, Aegis now moves after the **170 ms** light/recognition beat rather than spending the separate 300 ms battle preparation. The dock measures the painted reveal and its own resting card before paint, then carries one opaque card between those rectangles in **120 ms with quadratic deceleration**. The departing stage keeps hidden source geometry through the handoff and clears on arrival. Its frame and caption appear only when the card reaches the existing dock. The former 160 ms fade followed by an unrelated 220 ms entrance is removed from this live path. Dock position, final card dimensions, typography, colours and field layout remain those of Aegis.

The source implementation snaps to a smaller scale and 27.7-degree tilt before moving. This pass interpolates between the existing Aegis card rectangles; it does not establish parity for that snap or perspective. At this checkpoint a finished effect whose reveal and close share a batch still used the older settled fallback. The resolved-check follow-up below replaces that path. Dock closure and the central security exit are not covered by the transfer-fidelity claim.

The first actual-renderer transfer capture reproduced a lifecycle defect: the reveal and dock shared the same sibling React key. State cleared correctly, but orphaned reveal DOM remained. `SecurityScenes` now prefixes keys by scene kind. The added lifecycle regression verifies reveal → overlapping handoff → dock alone → closed, retaining one dock and removing the departing scene. Cancellation and discard release the owned board gate and clear the departing scene.

`pnpm motion:capture:transfers --base http://localhost:5174` exercises the security-effect replay through the real Arena/GameScreen pipeline. All six viewports passed: **1280×800, 390×844, 320×900, 768×900, 1440×900 and 844×390**. Each provided **8 painted transfer samples** and **28–29 total samples**. Assertions independently compare the starting rectangle with the last painted reveal, reconstruct the quadratic trajectory, reject missing-card frames, require full opacity and a hidden original, and verify the resting identity transform, caption, absent stage and no horizontal page overflow. Reduced motion retains the static dock with **zero animations**. This event fixture exercises presentation, not engine legality or both seats' engine behavior.

The final recordings contain **95 frames / 3.8 s on desktop** and **78 frames / 3.12 s on phone**, at 25 fps. Open `/dev/motion-reference?comparison=aegis-security-transfers-desktop` or `?comparison=aegis-security-transfers-phone`. Consecutive desktop recording frames **40–64** were visually inspected through entrance, light, the uninterrupted transfer and the dock beside its clause. Phone and landscape screenshots confirmed the retained dock composition.

**286 focused tests**, TypeScript, lint and the production build passed. The full **119-case pacing matrix** passed and its baseline was refreshed only after its invariants passed. All **102 paced sequential/stacked rows** retain zero missing or unreadable announcements, results ahead of clauses, costs ahead of focus, optional announcements before answers, failed/dropped/pending steps, gate expiries, board/decision budget rescues and decision stalls. The live security-effect scenario lost **560 ms** of empty presentation time without shortening clause reading. Final review found no remaining blockers in the geometry, cleanup, keys or capture assertions. The full animation-fidelity goal remains open.

## Resolved security-effect ordering follow-up

A security effect now uses the same continuous **120 ms** transfer whether its close arrives later, alongside the reveal, or without a separate reveal event. The older payload is recognized before ordinary play routing, so its source clause and played-card arrival remain owned by the security presentation. The clause reads beside the dock for **1600 ms** before the card-enter cue; its On Play notice and revealed-cards panel follow the arrival. The former settled fallback no longer publishes the security clause a second time. Aegis field geometry, card dimensions, dock position, typography and colours are unchanged.

Review found a separate same-batch Digimon defect: an effect verdict released the battle hold before a queued shield break restored it. A known verdict now determines whether a battle is pending, and the late callback cannot restore an already landed blow. Tests prove the held board exists for a battle, remains absent for the effect verdict and clears afterward. They also exercise released-blow callbacks, source/arrival ordering with and without the reveal event, both seats' held field arrivals, and cancellation during transfer, clause reading and closure. A new check works after each cancellation.

`pnpm motion:capture:transfers --resolved --base http://localhost:5174` records the one-batch development fixture through the actual Arena/GameScreen renderer. All six viewports passed: **1280×800, 390×844, 320×900, 768×900, 1440×900 and 844×390**. Each produced **8 painted transfer samples** and **27–29 total transfer samples**, with the same independent rectangle/trajectory, opacity, continuity, completed handoff, overflow and reduced-motion assertions. Source notice detection reads the actual desktop toast or phone narration band. The full failed timeline is retained if sequencing times out.

Measured relative to transfer onset, the security clause first painted at **116.6–116.8 ms**, the card-enter cue at **1716.6–1733.3 ms**, field landing at **2299.9–2316.6 ms** and On Play at **3833.2–3849.9 ms**. The security clause had exactly one painted occurrence. The records exercise visual event fixtures rather than engine legality; close-only and Digimon verdict cases are focused regressions, not additional recorded engine games.

Final recordings contain **222 frames / 8.88 s on desktop** and **214 frames / 8.56 s on phone**, at 25 fps. Open `/dev/motion-reference?comparison=aegis-security-transfers-resolved-desktop` or `?comparison=aegis-security-transfers-resolved-phone`. Consecutive desktop recording frames **40–64, 90–114 and 140–164** were visually inspected through reveal/light/transfer, clause/arrival/landing and subsequent On Play/revealed panel. These are Aegis recording frames; consecutive primary-source coverage remains **331** and the two recordings retain independent clocks.

**232 focused tests**, TypeScript, lint and the production build passed. The full **119-case pacing matrix** passed against the existing baseline with **no change**; no baseline refresh was needed. Final review found no remaining ordering, gate or cancellation blockers. This completes the resolved-check transfer and sequencing work, while source perspective/snap, dock closure, central security exit, complete combat impact and the other remaining animation families still require separate comparison. The full animation-fidelity goal remains open.

## Execution-slot closure follow-up

Consecutive source frames **32540–32574** were inspected around the security-effect slot's departure. The card remains readable through **f32558 (543.175967 s)**, leaves a one-frame ghost at f32559 and is absent at **f32560 (543.209333 s)**. The inspected `CloseBrainstrorm` disables the matching card immediately and yields one frame; there is no authored 300 ms post-resolution hold or 220 ms fade. The sampled overviews used to locate the interval are not counted as consecutive coverage. These **35 new consecutive frames** raise inspected primary-source coverage from 331 to **366**. The harness adds the precise closure selector at **543.109233–543.309433 s**.

Aegis execution slots now remove the resolved card directly at their queued disposal beat. The source clause still keeps its **1600 ms** read, Security arrivals still finish before disposal, and the card's existing board and dock geometry are unchanged. The isolated settled specimen retains its separate legacy clip; it is not the production security path. The full central security exit and the source perspective/snap remain separate unfinished comparisons.

Removing the former **520 ms** tail exposed a wider Option dependency: its clause and deletion wait did not account for a card reveal or draw still executing. The dock now waits for arrivals, reveal rows, draw/recovery flights, deck returns and deck-to-under flights up to its routing batch. Subsequent clauses are excluded because they may themselves wait for the dock's settlement. Own prompts continue to hold it, and an Option relocating under a permanent still uses the real destination flight. Event-driven flight steps retain their originating batch when later batches arrive. This also makes their narration dependency explicit: a same-batch Main clause must not wait for the draw which is waiting for that clause's announcement. Originless legacy draw handling is retained.

Six queue regressions exercise a two-second owned result alongside later narration waiting on settlement; the dock remains open through the result and closes without the later-clause cycle. Integration regressions cover a routed Option playing a card without On Play, an Option drawing before a later clause and an Option returning a physical field card to the deck. The return case uses measured field and deck rectangles and keeps the Option visible until the flight finishes. Options are verified here with controlled presentation events and queue tests, not an additional recorded engine game.

`pnpm motion:capture:transfers --resolved --base http://localhost:5174` passed at all six viewport sizes, including reduced motion. Each still paints **8 transfer samples**, with **26–29 total transfer samples**, no missing-card frames, independent rectangle/trajectory checks, full opacity and no horizontal overflow. In all six cases, field landing and dock removal first appeared in the **same sampled frame**, at **2299.8–2316.6 ms** relative to transfer onset; no `closing` frame painted. The Security clause appeared at 116.6–116.8 ms, the arrival at 1716.5–1716.7 ms and On Play at 3833.2–3849.9 ms, retaining one source announcement. No claim is made that the complete Tamer replay became 520 ms shorter: other narration clocks still own its subsequent beats.

The updated recordings contain **279 desktop frames / 11.16 s** and **258 phone frames / 10.32 s**, at 25 fps. Their longer initial recorded load does not indicate longer animation owners; recorder and page clocks are independent. They replace the preceding resolved-check recordings under the same dataset ids and are available at `/dev/motion-reference?comparison=aegis-security-transfers-resolved-desktop` and `?comparison=aegis-security-transfers-resolved-phone`. Consecutive desktop recording frames **110–144** were visually inspected through the played card's reveal, narrow exit, field arrival and direct dock removal.

**256 focused tests**, TypeScript, lint and the production build passed. The full **119-case pacing matrix** passed; all **102 sequential/stacked rows** retain zero missing/unreadable announcements, results ahead of clauses, costs ahead of focus, optional announcements before answers, pending/failed/dropped steps, gate expiries, board/decision budget rescues and decision stalls. Affected security and Option scenarios lost **512–528 ms** of presentation time on the harness's 16 ms sampling clock. Its baseline was refreshed only after these full-matrix invariants passed. The matrix does not contain deck-return steps; the final deck-return predicate is covered by the focused queue and geometry regressions. Final review found no remaining blockers in the closure, owned-result dependencies or cancellation paths. The overall animation-fidelity goal remains open.

## Checked-card disposal follow-up

Source frames **39437–39466 (657.940617–658.424433 s)** were inspected consecutively through the security Digimon's claw, final readable hold, narrowing, upward strip and disappearance. The narrowing becomes visible at **f39455 (658.240917 s)**; the printed face clears during that narrowing, and the last upward strip appears at f39462 before absence at f39463. A separate **24-frame interval, 8583–8606**, was inspected while locating a plain disposal; it instead showed an Option transferring to its effect area and was excluded from the thin-exit interpretation. These 54 new consecutive source frames raise recorded inspection coverage from 366 to **420**. The sampled locating overviews do not add to this count. The harness adds the precise security-card-exit selector.

The inspected `ShrinkUpUseHandCard` narrows X from 0.6 to 0.06 and elongates Y from 0.6 to 1.4 in **70 ms**, clears the sprite at **35 ms**, then moves upward to local Y 220 in another **70 ms**. Both tweens use the verified quadratic deceleration default. Relative to the existing Aegis card, those endpoints are **scale(0.1, 2.333333)**. Rise distances use the authored reveal's final Y, -34 for the viewer and 63 for the opponent, normalized by the source's 84-unit revealed height. As in the earlier reveal work, this uses the complete authored endpoint rather than claiming an exact match to the coroutine's 200 ms freeze of the 233 ms clip.

Checked cards now remain whole through their result and use this **140 ms** disposal. A battle spends its 250 ms claw plus 100 ms settle first; a no-battle check omits that fictitious impact and leaves after its existing recognition hold. The source implementation's no-effect non-Digimon branch and its post-battle disposal both call the same narrowing coroutine. Aegis's separate effect-driven destruction retains its cracks/shards and 350 + 160 ms tail. Caption positions, card sizes, field geometry, colours and typography are preserved. The claw and DP disappear before the revealed card departs; source artwork is not copied.

The first actual-renderer capture exposed a clock mismatch: a 140 ms queue wait could remove the card with its CSS animation only around 100 ms complete, because React committed after the wait began. The shared disposal helper now retains the owner until the actual painted CSS animation finishes. Its remaining wait belongs to the queue, so cancellation, pause, drain and replay still release coherently. Tests exercise CSS completion beyond the queue floor, cancellation during that remainder, a ten-second pause and draining a frozen CSS clock. Headless presentation has no DOM clock and keeps its authored queue duration.

Review also exposed an older dock-to-battle defect: the already revealed card returned under a claw at time zero while replaying a 383 ms entrance, then started disposal at 350 ms. That return now keeps its face and resting geometry, with no white entrance or second reveal light. A genuinely expired battle hold still replays the full lead-in. The controlled Arena fixture publishes an effect reveal and later battle close through the actual cue pipeline; it does not claim printed-card engine legality.

`pnpm motion:capture:security:exits --base http://localhost:5174` passed **10 normal-motion cases**: both seats' battles, both seats' no-battle checks and the dock-to-battle return, each on desktop and phone. Each provided **10–12 disposal samples**, independently checking the two quadratic halves, 35 ms artwork clearing, full opacity, absence of checked-card shards/stationary claws, completed **140 ms CSS clock** and removal within 50 ms of its first sampled completed frame. The diagnostic uses fractional CSS dimensions; integer `offsetHeight` had produced a false mobile trajectory error. Expected exit onsets remained **1199.9–1216.7 ms** for initial battles, **866.6–866.7 ms** for plain checks and **350 ms** after the restored card mounted. CSS startup, queue polling and React commit account for the observed 166.6–200 ms disposal owner lifetimes; these are not redefined as the authored animation duration.

The final recordings contain **506 desktop frames / 20.24 s** and **498 phone frames / 19.92 s**, at 25 fps. Open `/dev/motion-reference?comparison=aegis-security-exits-desktop` or `?comparison=aegis-security-exits-phone`. Consecutive desktop recording frames **105–128, 302–325 and 476–499** were visually inspected through the battle, plain and restored exits and the committed clear board; the first two intervals also include navigation to the next independent fixture. The comparison harness loaded source frame 39455 and Aegis frame 113, decoded both next frames independently, exposed the new precise selector and reported no page errors. The recorder and source retain independent clocks.

Eight reduced-motion cases passed at **320, 768, 1024 and 1440 px**, each retaining **52 static readable samples**, no active scene animations, no white cover, identity resting transforms and no horizontal overflow. Reduced motion drains the skippable result/exit after recognition; it is not required to paint an intermediate disposal. These checks exercise the initial battle and plain-check paths, not a recorded reduced-motion restored battle.

**269 focused tests**, TypeScript, lint and the production build passed. The full **119-case pacing matrix** passed before the baseline refresh; all **102 paced sequential/stacked rows** retained their zero-failure invariants. Some affected headless scenarios lost **16–48 ms** on the 16 ms sampling grid; this does not quantify browser scheduling or every no-battle path. Final review found no remaining blockers in the exit owner, return from the dock, cancellation or diagnostic geometry. Full animation parity remains unproven: source perspective/snap, complete combat movement/vibration, field-light handoffs, hatch, hand/trash focus and movement/result families still require their own source-aligned comparisons.

## Independent combat tremor follow-up

Primary frames **39399–39440** were inspected consecutively through the security card's steady hold, initial displaced afterimage and advancing claw. Frames 39437–39440 overlap the previously inspected disposal interval; the **38 new frames, 39399–39436**, raise unique consecutive source inspection coverage from 420 to **458**. The card's trembling precedes the visibly completed claw and settles while the masked claw continues. Compression/blended frames and the random trajectory do not establish exact subframe displacement. The harness adds the precise combat-impact selector at **657.790467–658.174183 s**.

The inspected battle coroutine shakes each losing card for **250 ms**, with strength 8, vibrato 30 and fading enabled, alongside the independent claw. Vibrato is a rate rather than 30 poses in a quarter-second: the [public library implementation](https://github.com/Demigiant/dotween/blob/develop/_DOTween.Assembly/DOTween/DOTween.cs) calculates `floor(vibrato × duration)` and weights the seven segment durations 1 through 7. Its [array interpolation](https://github.com/Demigiant/dotween/blob/develop/_DOTween.Assembly/DOTween/Plugins/Vector3ArrayPlugin.cs) applies easing to each segment; the previously verified project default is quadratic deceleration. The former field path used even intervals, and the central security path used only four displaced poses spread across the combined 350 ms outcome.

Aegis now shares a **seven-segment 250 ms** artwork tremor with decreasing strength and progressively longer intervals, followed by the existing **100 ms** settle. The fixed planar directions form a reproducible variant of the source's random direction changes. They do not reproduce a particular random seed, the source's possible Z displacement, or prove binary-version identity with the linked library branch. Strength uses the authored card/prefab geometry: eight units over a 100 × 140 card at .9 field scale, or .6 revealed-security scale. Attacker representations use the field ratio; revealed security cards use the reveal ratio. Aegis's card widths, resting positions, palette, typography and claw paths remain unchanged.

The claw no longer moves with the shaken artwork. Live permanents route the tremor to their card face, removal ghosts to their printed card, and central security scenes to their art box; the separately clipped claw remains anchored. The ghost's outer box permits the artwork to move beyond its resting edge while the claw retains its own mask. Security entrance transforms remain independent of the tremor's `translate`; restored cards retain the impact without replaying their reveal, and disposal resets translation while taking its own animation. Reduced motion disables this decorative movement.

`pnpm motion:capture:impacts --base http://localhost:5174` exercises **ten normal-speed Arena scenes** on desktop/phone: Rush, Retaliation, a losing revealed security card, a losing security attacker and the restored dock-to-battle path. It observes **twelve physical impacts**, including both Retaliation cards. The diagnostic independently reconstructs the seven weighted intervals, decreasing magnitudes, chosen direction angles and quadratic interpolation. It verifies completed art/claw clocks, independent stationary claw anchors, card return to rest and no horizontal overflow. Three subsequent animation frames record the cleared board after detachment; the diagnostic also requires no remaining claws or battle stage.

Separate **eight production-component probes** mount `FieldClashGhosts` at **320, 768, 1024 and 1440 px**, each with normal/reduced motion. These probes deliberately seek CSS clocks and wait for the printed image before screenshots; they are not normal-speed Arena or engine recordings. They preserve the actual 72 × 101 card bounds within 0.001 px, check the independent claw curve and fixed anchor, demonstrate tremor followed by identity translation, and verify zero reduced-motion animations. The initial exact floating-point rectangle comparison rejected subpixel browser rounding; the final diagnostic retains the tight stated tolerance.

The final impact datasets contain **536 desktop frames / 21.44 s** and **528 phone frames / 21.12 s**, at 25 fps, replacing the older recordings under `/dev/motion-reference?comparison=aegis-combat-impacts-desktop` and `?comparison=aegis-combat-impacts-phone`. Consecutive desktop frames **270–293** and **502–535** were visually inspected through the security tremor, independently advancing claw, completed hold, disposal and cleared board. A preceding field interval **74–115** was inspected before the final recording refresh; its indices belong to that earlier recording. The final harness loaded source f39430 and Aegis f275, exposed the precise combat clip and advanced both decoded panes independently with no page errors. Recorder, page and primary-source clocks remain independent. The normal-speed cases exercise presentation event fixtures, not printed-card legality.

**242 focused tests**, TypeScript, lint and the production build passed. Independent review reexecuted **249 tests** and found no blocking cascade or geometry issue; initial ghost/attacker coverage gaps were subsequently exercised by the probes and expanded captures. The unchanged presentation queue did not require another pacing-baseline refresh. The security-exit capture also passed its **ten normal-motion and eight reduced-motion cases**, retaining the complete checked-card disposal after the new impact. Full animation parity remains unproven: random/3D impact displacement, complete attacker movement, source perspective/snap, field-light handoffs, hatch, hand/trash focus and movement/result families still need further comparison.

## Hatch depth and settled identity follow-up

Primary frames **810–853** (44 opponent frames, **13.513500–14.230883 s**) and **1485–1532** (48 viewer frames, **24.774750–25.558867 s**) were inspected consecutively in crops containing the entire breeding destination. These **92 new frames** raise unique consecutive source inspection coverage to **550**. Opponent f815 first shows an unready face; viewer f1489 first shows the egg. The face settles before the arrival light fades. Earlier sampled locator sheets did not establish consecutive coverage and the initial viewer locator crop missed the egg; the corrected crop is the evidence used here. Neither the contact sheets nor the browser's 25 fps recording prove subframe camera displacement.

The inspected hatch path creates a field permanent directly in breeding. Its field-entry coroutine moves local depth from -30 to 0 over **100 ms** with explicit OutBounce and then holds for 100 ms; landing particles have their own lifetime. It does not announce a hatch with the normal central card reveal. The [public easing implementation](https://github.com/Demigiant/dotween/blob/develop/_DOTween.Assembly/DOTween/Core/Easing/Bounce.cs) supplies the piecewise quadratic curve. This confirms the authored temporal curve, rather than a particular camera projection or dependency binary version.

Aegis's egg previously used the ordinary **320 ms** field fade. It now stays opaque, scales **1.06 → 1** over 100 ms with diminishing rebounds, and remains centred on its existing breeding slot. The CSS segments reproduce the normalized OutBounce curve; the 6% depth proxy uses the existing Aegis landing amplitude and is not a measurement of the reference camera. The white/blue Aegis burst, its 800 ms owner, slot dimensions, typography and palette remain unchanged. DigiEgg cards keep a quiet default entrance after the accepted hatch cue disappears, avoiding a second field fade. Reduced motion immediately shows the resting egg without decorative motion.

`/dev/arena?mode=visual&scenario=hatch` starts with two empty breeding areas and offers accepted hatch events through Tools. The fixture takes an egg from the actual recipe, consumes one egg for the chosen seat and keeps opponent hand/security identities hidden. It uses the real Arena/GameScreen renderer and cue queue, but does not establish engine legality. The comparison harness exposes this live scenario and a precise hatch clip.

`pnpm motion:capture:hatches --base http://localhost:5174` passed **16 normal-clock cases**: both seats at **320, 768, 1024 and 1440 px**, with normal/reduced motion. Eight normal cases recorded 72–75 samples each, including **7–9 observations below the 100 ms CSS boundary**, full-opacity faces, no central reveal, fixed slot rectangles, bright arrival rays and 400 ms of stable resting geometry after the burst cleared. The final recorded ray opacity was at most 0.00152. Reduced cases show the immediate resting card without requiring a transient burst, which the queue drains. Both sets independently require the expected viewer/opponent slot, printed egg and physical permanent identity, decoded artwork and no horizontal overflow. Review exposed the initial generic-slot detector's inability to prove which seat hatched; the final capture passed after adding these ownership checks.

Four separate actual-renderer interpolation probes deliberately seek the CSS clock through the bounce extrema and the completed hold. They compare transformed widths to the independent quadratic equation within **0.000002 scale units**, and validate an unchanged card centre. Computed `scale` strings round to fewer digits than transformed rectangles; the final probe uses the higher-precision rectangles rather than accepting that serialization as a trajectory error. These sought poses are excluded from normal-speed recordings.

The final recordings contain **147 desktop frames / 5.88 s** and **136 phone frames / 5.44 s**, at 25 fps. The complete desktop intervals **17–53** and **67–115** were visually inspected through both hatch onsets, their light and their settled cards; navigation and initial image decoding are visible and are not extra authored reveal beats. Open `/dev/motion-reference?comparison=aegis-hatches-desktop` or `?comparison=aegis-hatches-phone`. Source, page and recorder retain independent clocks.

**250 focused tests** and both existing **real-engine breeding scenarios** passed, as did TypeScript, scoped lint and the production build. This changes hatch rendering rather than queue durations or gates, so the pacing baseline is unchanged. Full parity remains unproven: the reference's perspective and particle rendering, complete attacker movement, other landing paths, field-light handoffs, hand/trash focus and movement/result families still require further comparison.

## Physical trash source follow-up

The primary activation routines distinguish the actual effect source from the card at the top of a pile. Trash activation sets up a separate temporary card from `EffectSourceCard` before moving and enlarging it. The inspected sequence moves/scales to 1.4 over 250 ms, grows to 2 over another 250 ms, holds 250 ms, then schedules an 80 ms shrink to 1.4. The final shrink is not awaited by that coroutine: **750 ms of awaited preparation and an 830 ms visual sequence are different clocks**. Hand activation grows to 1.3 over 250 ms, changes its pivot over the first 120 ms and holds another 250 ms; this method does not itself define a return animation. These are authored source observations, not new video-frame measurements or proof of the reference camera projection. Consecutive source-frame coverage stays at **550**.

Aegis previously marked the trash pile with an activation class and raised its current top image. That shows the wrong physical card when the accepted source is buried. `trashEffectCardFromSources` now uses the announcing activation's seat, printed card ID and instance ID, retrieving alternate art from that exact presented trash copy. `Pile` paints a keyed, input-transparent, decorative source card above its unchanged top card. The occurrence key restarts the transient image, and linking the source to the visible clause removes it. No pile order, count, hidden hand or security identity is changed.

The counter now has a higher stacking level than the activation overlay. Review caught the initial overlay's ability to cover the existing counter; the final browser diagnostic verifies both the counter's geometry and its stacking above the source, rather than only checking its DOM text. Layout snapshots wait for fonts before taking the baseline; a first cold-font capture had reported a counter-width shift as a motion error. The geometry comparison retains its 0.01 px tolerance.

Tools on `/dev/arena?mode=visual` now offer buried trash-source fixtures for both seats. They publish accepted presentation events through the production renderer using BT26-015 below Fire Rocket for the viewer and BT26-074 below Dark Field for the opponent. They do not claim these printed cards have the fabricated trigger timing. `pnpm motion:capture:trash --base http://localhost:5174` passed **eight normal-clock cases** at **320, 768, 1024 and 1440 px**, with **42–44 sampled frames per case**. Each independently requires the correct seat/physical source, a distinct unchanged top image, decoded activation art, unchanged pile/top/counter rectangles, visible count stacking, no horizontal overflow and a completed 620 ms CSS clock before the overlay disappears. Source screenshots were inspected on desktop and phone.

Four separate reduced-motion probes mount the production `Pile` component directly, preserving the source identity, top card and count while cancelling the decorative rise. These are component checks rather than normal-clock accepted-event captures: the real queue can drain a transient activation without painting it. Unit tests cover buried versus top identity, alternate art on otherwise identical printed copies, other seats, linked clauses, accessible count and overlay removal. **214 focused tests**, TypeScript, scoped lint and the production build passed.

This completes the physical-source correction, not trash/hand motion parity. The existing 620 ms one-stage trash rise and 540 ms hand rise still differ from the authored choreography above. Their two-stage timing, enlargement, hold, measured destinations and ownership across announcement/reading need further source-aligned work; full animation parity remains unproven.

## Trash preparation and reading choreography

The active trash presentation now follows the authored sequence inspected above: simultaneous **250 ms** inward motion and scale **1→1.4**, **250 ms** scale **1.4→2**, **250 ms** hold, then **80 ms** scale **2→1.4**. Its four interpolation intervals use quadratic Out easing. The scene's serialized `HandCard.prefab` face is **100×140**; its viewer destination (−190,+95) becomes **−1.9 card widths / −95⁄140 card heights** in CSS, and opponent (+190,−30) becomes **+1.9 widths / +30⁄140 heights**. These ratios adapt the authored displacement to Aegis's existing pile faces, without replacing its layout or design. They do not establish equality of the video camera's projection.

The source occurrence remains keyed across clause publication and settles at scale 1.4 during reading. Its removal follows its clause's lifetime, as the authored client retains the dedicated source until effect cleanup. Returning to an older linked occurrence shows its settled pose rather than starting another enlargement. The portrait source temporarily raises its pile's stacking level so adjacent security does not obscure its printed face; resting slot geometry and the visible trash count remain unchanged.

Preparation and visual completion have different owners. A normal-speed clause waits for the physical source's **painted 750 ms** boundary; the final shrink continues until **830 ms** while that clause is read. A standalone activation has no reading owner and therefore waits through painted completion before removing its card. Independent browser review caught the initial queue-only standalone wait cutting the last approximately **30 ms**; the final helper observes the occurrence's CSS clock and drains safely on cancellation, skip, hidden/replay mode or absent decorative animation. The queue's initial nominal wait alone cannot establish that React has painted the full preparation.

The activation captures the viewer's Effect speed once and propagates it to both queue and CSS. Fast uses **412.5 ms** minimum preparation and **456.5 ms** visual completion; changing settings during the occurrence cannot reinterpret its boundary. An initial fixed 750 ms floor introduced a fast-mode decision-budget hit in one production chain; scaling the complete choreography removed that regression. The complete **119-case pacing matrix** passed again, with all **102 paced rows** retaining zero ordering, readability, synchronization and budget failures. The baseline was refreshed only after those invariants passed.

`pnpm motion:capture:trash` passed **eight normal-clock Arena cases**, both seats at **320, 768, 1024 and 1440 px**. The diagnostic independently reconstructs the normalized OutQuad move and all enlargement/hold/shrink intervals, requires the painted hold and clause handoff during the final shrink, and checks physical identity, decoded art, unchanged pile/top/count geometry, count stacking, completed CSS and natural removal. The mobile removal deadline includes the existing **2.4× reading-time multiplier**, rather than treating its longer reading owner as a leak. Percentage displacement uses the measured rendered pile height, including browser subpixel rounding.

**Eight separate production component/queue probes** cover standalone activation at those four widths with Normal and Fast speeds, requiring a sampled finished **830 / 456.5 ms** CSS clock before removal, correct identity, idle queue and no horizontal overflow or page errors. Fractional clocks use a **0.00001 ms** tolerance for floating point serialization; spatial checks retain **0.002 px** tolerance. Four separate reduced-motion component probes retain the source/top/count identity without decorative motion. Desktop and phone screenshots confirm the opponent's face passes above neighbouring security.

**244 focused tests**, **16 pacing budget checks**, TypeScript, scoped lint, formatting, the production build and `git diff --check` passed. Independent review also exercised changes of speed during preparation for both seats and found no remaining blocker in this delta. The known conditional-expect lint warning in the older `useMatchCues.test.ts:673` is outside the changed prelude expectations.

This work adds authored-code and prefab evidence, not another individually inspected primary video interval: consecutive source-video coverage remains **550 frames**. Field-light appearance, the reference's camera projection, exact optional/target cleanup interactions, hand focus and the remaining combat/landing/movement/result families still require further source-aligned comparisons. Full animation parity remains unproven.

## Hand source preparation and reading

`Effects.cs:390–460` authors the viewer's hand source as simultaneous **250 ms scale 1→1.3** and **120 ms pivot Y 0.5→0.08**, followed by a **250 ms hold**. The coroutine has no automatic return tween after this hold. Pointer exit or dragging can later recenter the authored card; effect cleanup removes its execution outline. The original hand prefab's root scale is 1, and card instantiation overwrites the draggable component's serialized initial scale with that root scale. This establishes the enlargement ratio but does not prove the runtime pivot position: its `GridLayoutGroup` is not disabled by the custom dragging flag.

Aegis now composes its own fan rotation around scale and a local **−42% face-height** translation. The independent browser reconstruction uses **−0.42 × height × scale(t) × OutQuad(t/120)** before the fan rotation, rather than placing a translation outside the enlargement. A decorative portal preserves the existing unrotated face dimensions, exact instance and art; the physical slot, hand ordering, counters and dock geometry remain unchanged. Only the measured source face is hidden while the portal owns it. Revealing an offscreen source scrolls the existing hand; an edge correction keeps its enlarged face inside the viewport. These are adaptations to the existing Aegis layout, not evidence of reference camera or layout-engine equality.

Browser verification caught two rendering defects during implementation. `CardFull`'s inline opacity initially defeated the source-hiding rule; switching to visibility also avoids fading the resting face back in after cleanup. Fractional computed CSS dimensions truncated a layout unit when copied, so the plane now recovers its unrotated dimensions from the painted rotated face. The curve verifier uses the actual painted anchor bounds, including the browser's subpixel positioning. Independent review also found hover transitions leaving the portal behind; mutation, resize and scroll observation plus bounded animation-frame tracking now follow transform transitions, including one already running at mount. Tracking never restarts the occurrence's preparation clock and is cleaned up with the portal.

The source remains keyed through clause linkage and holds its final pose throughout reading. A revisited linked source starts settled rather than replaying preparation. Normal preparation is **500 ms**, Fast **275 ms**, with a captured occurrence speed used by CSS and queue together. Shorter configured holds cannot bypass the minimum. A painted-clock helper prevents clause reading from outrunning a committed decorative animation and drains on skip, cancellation, replay/drain or a removed source.

`pnpm motion:capture:hands` passed **ten Arena fixtures**: first and last hand sources at **320, 768, 1024 and 1440 px** on Normal, plus last sources at **320 and 1440 px** on Fast. It independently reconstructs both OutQuad curves and their composed fan geometry, requires the 250 ms hold and linked final pose, and checks physical identity, decoded image, hidden original, unchanged slots/counters/order, viewport containment and natural cleanup. Browser evidence lives in the ignored `.local/motion-reference/aegis-hand-sources/` directory.

`pnpm motion:probe:hands` passed **two separate reduced-motion production Hand probes** and **one Arena hover/speed probe**. The component probes show a steady original cue, settled linked resumption when motion is enabled, and portal release when reduced motion is restored. They intentionally supply a retained source directly: the Arena's reduced-motion queue drains decorative activations, so the component probes do not establish that the queue emits a retained cue. The live Arena probe verifies hover entry/exit geometry, Fast→Normal setting changes retaining a finished 275 ms occurrence clock, and natural removal. It imports the actual narration owner's pacing-module URL to share its live settings instance in Vite.

**235 focused tests across eight files**, TypeScript, scoped lint, formatting, the production build and `git diff --check` passed. The **119-case pacing matrix** matched its existing baseline; all **102 paced rows** retained zero ordering, readability, synchronization and budget failures. Independent closeout review found no remaining blocker in this delta.

No additional primary-video hand interval has been inspected individually in this change; coverage remains **550 frames**. The local fixed-anchor pivot interpretation is still a hypothesis pending reference runtime/video measurement. Authored hand hover locking and interaction-driven returns, hidden opponent hand treatment, field-light appearance, camera projection and the remaining combat/landing/movement/result families require further comparisons. Full animation parity remains unproven.

## Measured hand selection hover

The next comparison inspected all **64 consecutive decoded frames 2052–2115** of the viewer's hand during an Option's selection, increasing individually reviewed consecutive coverage to **614 frames**. A contact sheet retaining the complete hand movement is in the ignored `.local/motion-reference/hand-hover-measurement/every-frame.jpg`. Frame numbers are zero based, matching the preparer's `-start_number 0`, HTTP image names and manifest indices. The interval is **34.2342–35.28525 s**; the two steady poses are **2071 / 34.551183 s** and **2099 / 35.018317 s**.

This is selection **hover**, with a cyan selection rim, rather than accepted hand effect activation. It therefore does not establish the activation's 250/120/250 ms choreography. It provides spatial evidence for the same viewer pivot: two independent interior artwork patches, excluding changing rim/cost overlays and the clipped bottom, match at **1.20×** with normalized cross-correlation scores **0.97276** and **0.97863**. Their reconstructed face is approximately **(346.4, 376.2, 120, 168)** relative to the resting **(357, 461, 100, 140)** plane in the 960×540 decoded image. The complete bottom is not visible, so its height uses the authored 100:140 aspect and the observed approximately 100 px width; the paired bounds carry **±2 px** uncertainty.

The measured centre shift is approximately **−70.8 px** vertically and **−0.6 px** horizontally. A fixed anchor with the authored viewer pivot predicts **−0.42 × 140 × 1.2 = −70.56 px**; cancelling the pivot displacement in layout would instead yield approximately **−11.76 px**. The observed hover is consistent with the fixed-anchor composition within the measurement uncertainty, strengthening the spatial interpretation used by Aegis's hand source. This evidence remains scoped to the recorded hover: source-build differences, effect activation under its dragging flag and the projection of other scenes remain unproven.

`pnpm motion:measure:hands` reproduces the artwork correlation from the actual HTTP decoded frames in Chromium. It scans scales **1.10–1.30** in 0.025 increments and nearby pixel translations, writes the scores and inferred bounds, then verifies the harness's frame navigation, JSON export and **320 px** containment. The pose data requires the exact original content SHA-256 and 960×540 decode; replacing or resizing the source under the same dataset ID removes these guides. The harness offers the hand-hover interval, jump buttons for both measured poses, optional paired rectangles and normalized scale/lift. The guides compare two poses and do not pretend to track intermediate frames. Export preserves source hash, action family, frame identities and uncertainty.

Aegis now also follows the authored **500 ms** hover lock during hand source preparation. Pointer enter/exit events cannot change the rendered hand pose until the scale-and-hold CSS clock ends; the earlier 120 ms pivot clock does not unlock it. An already-linked source unlocks immediately in its settled pose. As in the inspected source, discarded pointer events are not replayed after unlocking: a new pointer entry/exit is required. The live browser probe checks both suppression during preparation and a fresh entry after the hold, alongside the existing hover-plane tracking, captured speed and reduced-motion cases.

**241 focused tests across ten files**, four lifecycle browser probes, two independent artwork correlations, harness desktop/phone screenshots and export verification passed. TypeScript, scoped lint, formatting, the production build and `git diff --check` passed; independent review found no remaining blocker in this delta. No queue duration, clause ownership or causal gate changed, so the prior **119-case** pacing matrix remains the latest full measurement rather than being claimed as rerun for this rendering-only follow-up.

The selected hand-hover interval and source hover lock improve the evidence and behavior; full activation-camera parity, interaction-driven return details and the remaining field-light/combat/landing/movement/result families still need comparison. Full animation parity remains unproven.

## Confirmed attack anchor and removal of the automatic impulse

The authored attack path in `AttackProcess.cs` suspends the attacker, waits for the target arrow and then resolves attack effects. Field resolution invokes `IBattle` in `CardController.cs`; its call to `Effects.BattleEffect` places the claw and shake on losing cards. No automatic attacker translation appears in these inspected paths. The motion before declaration belongs to the player's drag interaction. Breeding promotion has a separate 200 ms move and is not evidence for an attack impulse.

`pnpm motion:measure:attacks` independently measures **46 consecutive decoded frames 29550–29595**, **492.9925–493.74325 s**, with the attacker already suspended. These frames are inside the previously inspected attack interval, so individually reviewed consecutive primary coverage remains **614 frames**. Two interior artwork patches are searched over integer translations from −5 to +5 px at the original 960×540 decode. All **92 correlation peaks** retain displacement **(0, 0)**. Minimum normalized correlation is **0.998895** for the upper patch and **0.892158** for the lower patch, which receives changing arrow glow. The diagnostic requires both correlations above 0.85 and displacement within ±1 px; it guards the exact content hash and decode dimensions. Output lives in the ignored `.local/motion-reference/confirmed-attack-measurement/measurement.json`. This verifies the anchor over this accepted-attack interval, not subpixel camera motion, dragging, suspension rotation or a field impact.

Aegis's unsupported automatic **14 px / 240 ms** impulse has been removed from live permanents and clash ghosts, along with its cue state, props, CSS and extra field-impact wait. `securityAttacker.ts` retains the physical attacker, printed identity, art and top instance for the later security check, including Raid/Piercing continuation. The field scene now uses its existing **380 ms** arrow beat followed by **250 ms** claw/shake and **100 ms** settle: **730 ms total**, rather than 970 ms. Ordinary focus and grouped-row organization retain their own behavior. This correction does not establish that the field scene's separate arrow beat matches every declaration/resolution handoff in the reference; that timing still needs a dedicated comparison.

`pnpm motion:capture:impacts --no-video` passed **ten normal-clock Arena cases**: Rush, Retaliation, Jamming, attacker loss and restored security battle, each on desktop and phone. The final data contains **740 desktop** and **755 phone** field-pose observations, alongside twelve impacts with independently checked claw trajectories, tremor, completed settle and cleanup. The diagnostic rejects automatic root translation while recognizing legitimate grouped-row FLIP by its target, two translate/rotate keyframes, zero destination and exact **420 ms** layout clock. Browser keyframe serialization can collapse `0px 0px` to `0px`; both normalize to the same zero destination. The initial diagnostic wrongly treated layout movement as attack travel, first horizontally and then vertically on phone; the final run identifies that existing motion instead of widening displacement tolerance. These are fixture-rendering observations, not an engine-legality proof or individually reviewed video frames. Two additional isolated browser guard probes, one per viewport, verify that a known FLIP cannot conceal a second unnamed −14 px translation. The guard admits exactly one recognized translate writer and rejects additional writers even when their current displacement is zero; these deliberately sought clocks are excluded from normal playback observations.

Eight separate production ghost probes passed at **320, 768, 1024 and 1440 px**, with normal/reduced motion, preserving card bounds, fixed claw anchors and quiet reduced-motion rendering. These probes deliberately seek CSS clocks and are separate from the normal-clock Arena captures. The no-video mode writes into distinct `-probe` directories and leaves earlier recordings intact.

**234 focused tests across five files**, TypeScript, scoped lint and the production build passed. The **119-case pacing matrix** passed with zero timeouts and zero ordering, readability, synchronization or budget failures across its **102 paced rows**. Seven Giromon/Blocker rows lost exactly 240 ms of presentation time; the baseline was refreshed only after the full invariant checks passed. Independent review also passed **220 tests** and found no productive-code blocker; its diagnostic FLIP finding was addressed before the final browser run.

The earlier pending description of “complete attacker movement” should now be read as the actual player-drag/return interaction and declaration handoff, rather than an assumed programmatic lunge. Full animation parity remains unproven: field-light/camera projection, source activation returns, the declaration-to-impact handoff and the remaining movement/draw/shuffle/result families still require source-aligned comparisons.

## Declaration continuity and painted field impact

The inspected attack coroutine awaits its target arrow after suspension and before attack effects. Field resolution calls `IBattle`; its impact routine starts the claw and artwork shake, waits 250 ms, then keeps a 100 ms settle before removal. These paths do not start a second target arrow or impose a universal extra 380 ms field-battle delay. The correction below follows that authored ordering. No new consecutive primary video interval was individually inspected in this change: coverage remains **614 frames**. A dedicated recorded field-battle interval and camera/lighting comparison are still needed.

Aegis now carries the declaration's actual painted age into the closing field scene. Its existing arrow completes only the remaining portion of its **380 ms** beat; an already completed declaration proceeds directly to the **250+100 ms** impact. Endpoint changes keep the same CSS animation. A remount restores age with a negative local delay. A declaration which has not yet painted retains the full fallback and checks its painted clock after any suspension. The scene and tracker share the stream's batch/sequence identity. Fabricated raw events and their batch copies share a local occurrence alias. Review exposed the earlier two counters diverging when the room trimmed its 100-event log; an incremental tracker now also retains an active declaration and its redirect after their original events leave that log.

Queue time alone can outrun React's CSS commit. The field impact now waits for the actual painted **350 ms** boundary, including time after a finished CSS animation clamps at 250 ms. Its completion gate is released on natural completion, cancellation or discard. Caused clauses and arrivals wait for that gate; shards also check their physical loser's painted clock. Bare combat impacts without a known defender use the same boundary. Tests fabricate a 64 ms late CSS onset and require both the held card and its consequences to wait through the complete visible settle.

Retained losing cards no longer restart the ordinary 320 ms entrance scale. This was the measured cause of the initial Rush claw-mask drift despite a stationary outer card. A separate inverse planar FLIP keeps the field mask at the impact point while the organized row moves its parent into a slot. It copies the parent's actual timeline origin, easing and playback rate, observes replacements and binds when a pending animation receives its start time. The claw's cubic path remains independent. The first controlled parent probe exposed a one-frame displacement while the counter waited for that origin; binding through the flight's readiness promise removed it without relaxing the anchor assertions.

Independent review also demonstrated that wall-clock age was wrong under laboratory playback speed: at 0.5× a still-running CSS arrow could be reported as complete. Painted ages now use the browser's local animation clock, including playback rate and delay, with a paused-clock fallback. Captured age advances in the same local units during a remount. Rate changes preserve the browser-adjusted origin; the mask's inverse uses its parent's rate as well.

`pnpm motion:capture:impacts --no-video` checks ten normal-clock Arena fixtures on desktop/phone, eight separate normal/reduced ghost component cases and two adversarial translation guards. Rush and Retaliation require a single declaration key and an already extended shaft throughout the impact. Retaliation's attacker is the opponent's physical permanent; the initial new arrow assertion used the viewer's attacker for both fixtures and was corrected to require each fixture's explicit source. The controlled `combat-handoff-probes.mjs` suite adds 320/1440 px production-component checks for partial/completed and rate-scaled carried clocks, endpoint updates, remounts, real CSS clock reads at 0.5×/2× and changes of speed. A constructed pending parent FLIP is replaced mid-impact at the opposite rate, while every sampled mask stays at its original point within 0.25 px and retains its independent cubic trajectory. These are controlled component measurements, separate from normal playback, engine legality and primary video evidence. Artifacts live in the ignored `.local/motion-reference/aegis-combat-handoff/` directory.

The final normal-clock capture passed all ten Arena cases with **702 desktop / 711 phone field-pose observations** and twelve impacts. The final controlled handoff probes passed six arrow checks per width and 39 mask samples per width; maximum measured mask displacement was below **0.00007 px**. Independent review reran 41 focused tests and the 320/1440 px component suite without a remaining blocker in this delta.

**277 focused tests across eight files** passed, followed by a **229-test** check of the three test files adjusted during closeout. TypeScript, scoped lint, formatting, the production build and `git diff --check` passed. Scoped lint retains the pre-existing conditional-expect warning in `useMatchCues.test.ts`. The **119-case pacing matrix** passed; all **102 paced rows** retained zero ordering, readability, synchronization and budget failures, all rows avoided timeouts, and the baseline was unchanged. Full animation parity remains unproven: this establishes the authored declaration/impact handoff and Aegis renderer behavior, while the primary field-battle interval, field light/camera, activation returns and remaining movement/draw/shuffle/result families still require comparison.

## Draw presentation and decoded hand entry

Individually inspected every primary frame **1716–1755** in two consecutive contact sheets. These 40 frames overlap 29 already inspected evolution frames, adding eleven to the cumulative **625 unique consecutive primary frames** reviewed. The faint temporary card starts near the viewer's deck at f1720; its upright bright presentation is visible at f1724, narrowing starts at f1730, the actual new hand face appears at f1732 and its stable pose is visible at f1738. The annotated beats carry **±1 frame** uncertainty. Initial hand images overlap and some detail appears later, so exploratory patch correlations are too weak to establish a continuous projected trajectory. Neither these observations nor authored coordinates prove the camera or full curve identical.

The inspected `CardObjectController.AddHandCard` waits for `Effects.AddHandCardEffect` before instantiating the hand face. It offsets a 100×140 authored face by 70 local units and settles it in **80 ms with OutBack**, without an opacity tween. Viewer/opponent signs differ in Unity coordinates; the video initially shows the viewer card emerging below the viewport. The current Aegis below-slot approach is retained until that projection is resolved. The temporary deck presentation is a separate **60 ms move/scale/rotation**, a viewer **90 ms** hold (opponent 50 ms), then a **70+70 ms** narrowing/upward exit. The caller waits only 60 ms into that exit, allowing the 80 ms hand entry to overlap its tail. Sequential cards therefore await different preparation and visual completion boundaries. These are authored observations, not measured browser or video durations.

Aegis's hand-entry duration changed from **120 to 80 ms**. Its CSS easing uses linear time controls and the cubic OutBack curve with overshoot 1.70158, verified against the upstream [easing implementation](https://raw.githubusercontent.com/Demigiant/dotween/develop/_DOTween.Assembly/DOTween/Core/Easing/EaseManager.cs) and [default amplitude](https://raw.githubusercontent.com/Demigiant/dotween/develop/_DOTween.Assembly/DOTween/DOTween.cs). Starting translate is **50% of the actual face height**, matching the 70/140 authored ratio across Aegis card sizes. The fan's separate transform, full opacity, resting dimensions, slot geometry and visual design stay intact.

Natural browser capture exposed an asset-loading defect: at 768 px the original short entry could finish before its artwork appeared. `useHandArrivalArt` now starts that clock only after decoding the incoming image, or when CardFull substitutes its text fallback. Pending art reserves its physical slot while hidden. URL/node replacements invalidate the former decode; cleanup and membership changes discard obsolete work. Reduced motion uses the steady card immediately. This loading boundary is a browser rendering correction, distinct from the source's deck-to-hand choreography.

`pnpm motion:capture:hand-arrivals` verifies natural Arena playback at **320/768/1024/1440 px**, normal and reduced motion. The final normal captures contain **6/6/7/7 moving face observations** respectively; every moving face has loaded artwork and a visible hit-tested portion after closing the tools menu. Independent OutBack evaluation checks every pose within 0.00001 face heights. Separate production-Hand probes hold decoding for more than 120 ms, then seek nine clocks including the start, peak and endpoint: maximum sampled overshoot is approximately **−0.050002 face heights**. Those constructed probes retain the same CSS animation across rerenders, reserve geometry during loading and leave fan/face size unchanged. Reduced captures contain no hand-entry animation. JSON and PNG evidence lives in ignored `.local/motion-reference/aegis-hand-arrivals/`; no video was generated.

The harness adds the **draw-viewer** clip, restricted to decoded f1716–1755, and five jump markers. Checks at 320/1440 px verify each primary JPEG's identity/dimensions, marker time export and page containment. A constructed replacement manifest keeps the same video ID but changes its hash; markers and primary measurements disappear from both UI and export. `--reference-only` reruns these three reference cases separately. Marker annotations remain distinct from measured geometry and intermediate curves.

The eight-file focused suite passed **242 tests** and TypeScript passed; independent review passed twelve focused tests and a 320 px production-Hand probe with every image request blocked. CardFull's text fallback released the arrival instead of leaving an invisible pending card. The production build, scoped lint without warnings, formatting and `git diff --check` also passed. The six loading-hook tests passed again after the mock type annotations were corrected. Full draw parity remains incomplete: the separate **340 ms desktop / 520 ms touch deck flight**, turn-draw burst and actual hand-creation handoff still differ from the short authored presentation described above. Field-light/camera projection, source activation returns and the remaining movement/shuffle/result families also remain open.

## Deck presentation and physical draw handoff

The next change replaces the legacy deck draw flight with the authored temporary presentation described above. Coverage remains **625 unique primary frames**: selected draw frames were revisited, without inspecting a new consecutive primary interval. The viewer's **60+90+70+70 ms** presentation hands its card over at **210 ms**; the opponent's **60+50+70+70 ms** presentation hands over at **170 ms**. Both leave an 80 ms visual tail overlapping hand entry. The authored caller also awaits that entry before adding the next card. Aegis serializes its temporary faces globally after their owning steps pass their causal gates, including independent private/public draw tracks.

The existing field and hand supply the geometry. The face starts at the actual deck pile and presents inward, using **1.1 times the current hand-face width**. This is an adaptation based on observed resting face proportions; the source camera, parent scale and continuous projected path remain unresolved. Exact authored OutQuad segments govern the temporary face's scale, rotation, narrowing and upward exit. Viewer light starts after the first 60 ms; opaque opponent draws retain a card back without this light. The reused Aegis burst is still an approximation of the source particles, not a measured particle or camera match.

Visual inspection exposed a matte grey exit bar. The central streak in primary f1732, sampled at x849–856/y150–419 in the 960×540 JPEG, has median RGB **255/254/250**, whereas the authored colour assignment is 205/205/205. Aegis now turns the artwork into a rectangular white streak over the first **35 ms** of narrowing, following the visible output rather than assuming the source material's colour assignment equals its final rendered pixels. The intermediate tint and the source's material/post-processing remain unmeasured.

The painted clock starts after image decoding or CardFull's text fallback. The hand's physical instance, hand count and deck count remain held until that clock reaches its handoff. Newer patches cannot release an exact viewer instance merely because the hand count fell. Event metadata comes from the event batch's snapshot; current counts are used separately to prevent duplicate state-watcher draws. Review reproduced a coalesced earlier draw being attached to a newer snapshot, and a public draw beginning during its own reveal. Both have regression coverage.

A second review reproduced two sources revealing the same printed ID with distinct artwork: the first reveal's completion released the second card's draw during its reading. Showcases now retain their batch event positions; the move selects the nearest preceding matching reveal, respecting alternate art when known. Its completion gate's ceiling starts when that specific row begins. The real-hook regression covers both distinct and omitted artwork, two full 2520 ms readings, physical holds and absence of gate expiry. Independent browser reproduction confirmed zero draws during the second reading, followed by the correct physical instance. The reviewer reran **22 focused tests** without a remaining blocker in this delta.

`pnpm motion:capture:draws` passed **16 natural Arena cases**: single draws for both sides at 320/768/1024/1440 px, double draws at 320/1440 px and reduced-motion draws for both sides at those two widths. Normal single draws yielded **18–21 visible observations**; doubles yielded **38–43**. Independent curve evaluation checks every pose, conservation of hand+deck, rendered physical membership, no premature handoff, artwork readiness, the 35 ms white-streak boundary, absence of rings and one temporary face at a time. Reduced motion emitted no temporary face. Four separate controlled captures seek eight poses each, producing **32 PNGs** for visual inspection. These sought images are separate from the natural playback evidence. JSON/PNG evidence stays in ignored `.local/motion-reference/aegis-draw-presentations/`; no video was generated.

The latest **257 tests across eight files** passed, including the occurrence regressions, loading hook, presentation clock, snapshot holds and queue behavior. TypeScript, the production build, scoped formatting and `git diff --check` passed. Scoped lint retains the pre-existing conditional-expect warning in `useMatchCues.test.ts`. The earlier **119-case pacing matrix** for this presentation change had no timeout; inspection of its summary confirms zero ordering, readability, synchronization, gate and budget failures across all **102 paced rows**. This matrix predates the final occurrence correction; the new repeated-reveal regressions directly verify that correction. The previous hand-arrival and reference-marker browser captures also passed after the new deck sequence was introduced. Full motion parity remains unproven: draw particle envelopes/projected paths, field lighting/camera, activation returns and the remaining movement/shuffle/result families still require source-aligned comparison.

## Measured draw-light envelope and directional beams

Revisited the covered f1722–1728 draw images individually and measured eight consecutive primary frames **1723–1730**; unique inspected primary coverage remains **625**. The prior 24-ray star remained bright during the card's upward exit and reached only about two face widths. The primary flash instead projects a long fan into the field and a second vertical fan behind the temporary face, then disappears near the beginning of narrowing.

The measurement subtracts the pre-flash f1723 field from each decoded JPEG in the rectangle **x440/y285/280×160**. This rectangle excludes both the temporary card and the evolution source at the left. Positive differences use encoded RGB weights 0.2126/0.7152/0.0722: mean increases are **0, 72.62, 155.38, 152.96, 133.19, 95.30, 30.38, 0.06** for f1723–1730. Six frames contain the strong flash; onset and termination lie between decoded samples. The supported duration is approximately **100 ms, ±1 frame**, not an exact birth timestamp. These are rendered-region brightness values, not linear light, opacity or independently tracked particles.

The authored particle prefab contains separate flash, light and smoke systems at simulation speed 10. Its long-light system has 100 ms emission and a 50 ms lifetime; other flash systems can last 150–190 ms including emission. Two instantiated copies use crossed orientations. Those settings do not reproduce the camera projection or directly predict the intensity of the selected field rectangle; the visible inward envelope is therefore the evidence used for the shorter ray flash. A separate 190 ms local glow retains the longer accent.

`DrawLight.tsx` replaces the generic star for deck presentations only. Deterministic beam fans reach up to **7.8 temporary-face widths** inward and about 3.7 widths vertically, with soft edges scaled in SVG face units. These coordinates adapt the observed silhouette to Aegis; individual source particles and their random motion are not reconstructed. The existing draw palette remains in use. A 100 ms approximate brightness envelope starts after the decoded presentation's first 60 ms and ends before the upward exit, while the separate blue glow finishes later. Image loading pauses both clocks; opaque opponent draws omit them. This change does not alter queue gates, handoff timing or resting geometry.

The frame harness now displays the measured envelope with peak/end jump controls and exports the region, samples and actual media timestamps under the source hash/dimensions guard. `pnpm motion:measure:draw-light` recalculates all eight JPEG measurements within **0.02 encoded luma units**, checks source identity, exported timestamps and chart containment at 320/1440 px. Evidence is ignored under `.local/motion-reference/draw-light-measurement/`. Natural draw capture additionally checks a 60 ms delayed/100 ms ray clock, full inward SVG bounds, absence of rays outside the flash interval and no viewer light on opaque opponent draws. Controlled viewer poses add 90 ms peak and 160 ms termination inspections. Source light/camera/material parity remains unproven despite this measured improvement.

The final capture passed **16 natural cases** plus **36 separate sought poses**. Review identified a vacuous validation risk: checking only zero opacity outside the flash would also accept a permanently invisible effect. The capture now requires positive ray/glow peaks and both clocks to follow the decoded face, accounting for the browser clamping completed animations at their endpoints. Natural viewer peaks were **0.9798–0.9801** for rays and **0.6014–0.6023** for the glow; reduced-motion cases retained neither overlay. These are sampled CSS opacity values, distinct from the primary image's regional luminance. Independent production-component probes confirmed the exact sought ray peak at 85 ms and glow peak at 160 ms, unique/resolved gradient/filter IDs across two opposed components, and both effects absent at 250 ms. No material review blocker remained.

**20 focused tests across four files**, TypeScript, scoped lint without warnings, formatting, the production build and `git diff --check` passed. Independent review reran **14 tests** and the primary measurement/export command. Three reference-only browser checks additionally passed on 320/1440 px and with a replacement hash under the same video ID. No pacing or engine behavior changed in this light-only delta. The complete animation objective remains open, including the draw's continuous projected path/material/particle motion, field lighting/camera, activation returns and other movement/shuffle/result families.

## Draw entry in the upright face's plane

Revisited covered primary f1719–1723 individually; cumulative unique primary coverage remains **625**. The prior entry distances used 0.6 face widths and 2/7 viewer face heights, ignoring the authored upright scale of 0.45. The source moves by 60 parent units horizontally and 40 vertically while its 100×140 face scales from 0.2 to 0.45. Relative to the upright face this is **60/(100×0.45)=1⅓ widths** and **40/(140×0.45)=40/63 heights**. The CSS translation occurs in the parent plane before rotation/scale. Aegis now uses those ratios, without multiplying displacement by the changing face scale. Timing, colour, resting hand/field geometry and physical arrival gates stay on their existing paths.

Approximate decoded bounds are **x798/y266/112×157** for the legible temporary face in f1728 and **x868/y295/61×80** for the unobstructed deck in f1719, with **±3 px** uncertainty. Their centre separation is approximately **0.3973 face widths inward / 0.0605 heights downward**. Aegis uses a rounded **0.4 inward / 0.06 viewer downward** held anchor relative to its actual pile. That moves the final face closer to the deck and makes the greater outward/upward start consistent with the observed viewer entry. The opponent mirrors the horizontal adaptation, while retaining zero vertical entry/held displacement; its own projected held pose remains unmeasured.

`pnpm motion:measure:draw-path` samples three separate artwork patches from the later upright f1728 face, then fits f1719–1723 against two conditional entry candidates sharing the same held pose. RGB correlations for the normalized parent-plane path are **0.6151/0.6263** at f1721/f1722, compared with **0.2718/0.5283** for the shorter entry. The fitted clock spacing is **16.6514 ms**, against **16.683 ms** between the media timestamps. Early/clipped f1719/f1720 remain below 0.15 correlation and are rejected as informative poses. Overlapping images and blur still limit confidence. These fits corroborate two intermediate positions under the authored scale/rotation/OutQuad assumptions; they are not an independent continuous trajectory, statistical confidence interval or camera reconstruction. An exploratory Python calculation using the same decoded images agreed with the browser calculation; reproducible evidence is the committed browser command and ignored `primary-path.json` artifact.

The frame harness adds opt-in face/deck rectangle guides and separate jumps to the legible face and unobstructed deck. Its export preserves the source hash and coordinate bounds. The measurement command validates primary dimensions/hash, patch evidence, media-time spacing, exported guide identity and 320/1440 px containment. Guides remain covered by the existing replacement-source guard. Artifacts stay in ignored `.local/motion-reference/draw-path-measurement/`.

The final Arena capture passed **16 natural cases and 36 separately sought poses** after checking the longer entry and the deck-relative anchor at every visible sample. Hand/deck conservation, image readiness, shared painted clocks, light peaks and reduced motion checks remained green. **14 focused tests across three files**, TypeScript, the production build, scoped lint without warnings, formatting and `git diff --check` passed. Three reference-only browser cases passed, including a replacement hash under the same video ID. Independent review reran the primary-path command and three source-guard tests without a blocker. Full motion parity remains open, including early blur/particle/material projection, the opponent's measured pose, activation returns and other movement/shuffle/result families.

## Separate actual draws from other hand additions

The authored `DrawClass.Draw` routes to `AddHandCards(..., true, ...)`, whereas reveal selections and ordinary returns call `AddHandCards(..., false, ...)`. `CardObjectController.AddHandCard` plays `AddHandCardEffect` only for the former; both paths instantiate a hand card and await its **80 ms OutBack** entry. This distinction changes choreography rather than the Aegis resting layout. No new primary-video interval was inspected here; individually reviewed coverage remains **625 frames**. The opponent entry's projected sign and camera plane are still unmeasured.

Aegis now carries identity-free `cardsMoved.handAddition` metadata: **draw**, **transfer** or internal **staging**. Effect draws retain their temporary deck face. Searches, returns, additions from security and detached tops enter the hand directly after their cause/reveal gates. The serial presentation owner waits for decoded viewer art and the actual entry clock before starting another addition. Opaque opponent slots receive the corresponding short OutBack entry without exposing an instance/card identity, replaying an initial populated mount or changing existing slot sizes.

General returns capture deck origin before extracting cards and emit contiguous owner/origin groups in requested order. This fixes two real engine paths: a selected revealed card still leaves the deck even though the old return event said `various`, and a multi-owner return must not assign all incoming cards to one seat. Public identities and alternate art remain aligned within their own groups; private moves stay unnamed. Non-deck additions no longer fabricate an extra deck card during a hold. Trigger aggregation and movement legality are unchanged.

A silent return used immediately before playing, using or digivolving is labelled **staging** and receives no hand hold or temporary draw. Independent paused-hook reproduction previously showed an opaque hand falling from **5 to 4** although the final hand still contained 5; the corrected reproduction keeps **5 to 5**, with zero hand holds and temporary faces. Focused regression covers this case, the real reveal→return deck origin, mixed owner/origin ordering and private metadata.

`pnpm motion:capture:hand-transfers` passed **14 natural browser cases** at 320/1440 px: private/revealed additions for both seats, reduced motion and viewer art delayed by 500 ms. It observes at least two real intermediate entry frames, checks the 80 ms OutBack translation, full opacity, decoded artwork, hand/deck conservation, reveal handoffs, opaque indices and page containment without seeking a clock. The final capture waits through the new card's own animation; the first version prematurely stopped when a long reveal completed after the overall observation floor. PNG/JSON evidence lives in ignored `.local/motion-reference/aegis-hand-transfers/`.

Existing draw capture also passed **16 natural cases and 36 separately sought poses**. Focused API checks passed **217 tests across five files**, and client checks passed **37 across five files**. API/web typechecks and the web production build passed. The pacing matrix passed **119 cases**, including **102 paced cases with zero gate expiries**, no timeouts or failed steps. Independent review verified the corrected origin, owner grouping, privacy and staging projection. These checks establish the corrected authored distinction and renderer lifecycle; they do not establish complete particle, camera or every-family video parity.

The existing mobile stylesheet check also passed **101 tests** after its two stale source assertions were updated to the current `battle-security-branch-in` name and combined 92 px selector. The test still verifies the viewport lift and width; no Security production styling changed here. Scoped formatting and `git diff --check` passed. Lint reports no errors/new warnings; the shared protocol file retains three existing underscore-name warnings on completeness sentinels. The Arena preview remains reachable over Tailscale.

## Opponent hand entry direction

Individually inspected all **20 consecutive primary frames 4224–4243**, plus five coarse full-frame samples (3600, 4200, 4350, 4500, 4800). Unique full-frame visual coverage is now **650**, out of 40,622 extracted frames. A numerical region scan used to locate this movement does not count as full-frame visual inspection. The sequence includes the opponent deck count falling from 37 to 36, an opaque temporary face, its narrowing/white exit, and the new physical hand back. The hand is partially clipped by the top video edge and briefly appears in its resting pose before the visible movement; this overlap limits a start-clock claim.

Approximate bounds at **f4237** are **x540/y4/30×42**, compared with **x540/y−17/30×42** at **f4242**, with **±2 px** manual edge uncertainty. The moving back is therefore about **21/42 = half a card height below** its resting pose. The authored opponent hand starts 70 Unity Y units below its target on a 140-unit face, through identity rotations in the serialized hand parents. The primary frames support the downward screen-space sign. Aegis had entered from above; its opaque slot now starts at **+50% CSS Y**, retaining the same **80 ms OutBack**, full opacity, slot size and identity-free indices. These bounds establish direction and approximate amplitude, not a continuous curve, camera reconstruction or exact start clock.

An independent below-hand region, **x542/y35/26×13**, compared against f4242, has mean absolute encoded RGB differences of **22.908** at f4237 and **4.881** at f4238. The other nine samples in f4233–4243 are at most **0.025**. This corroborates the visible intrusion below the resting hand; RGB difference is not a displacement estimator or native light measurement. `pnpm motion:measure:opponent-entry` decodes those 11 JPEGs and reproduces every value within **0.05 RGB units**.

The harness adds the **70.4704–70.787383 s** opponent clip, five observed beat markers, moving/resting/measurement-region guides and a graph of the RGB difference. Export retains actual media timestamps and all observations under the exact source ID/hash/960×540 guard. A same-ID replacement hash suppresses the panel and exports no opponent observations. The opponent's temporary face is in the source's shared right-side presentation plane despite its deck being on the left. Aegis keeps the existing layout with presentation beside the actual seat's pile; this adaptation does not establish parity of that camera plane.

The primary command passed measurement, guarded export/replacement, guide geometry and page containment at **320/1440 px**, followed by **two natural opaque draw entries** with conserved counts, private identity and the corrected direction. The full hand-transfer command passed **14 natural cases** including revealed/private additions, both seats, reduced motion and 500 ms delayed viewer art. **26 focused tests across four files**, web TypeScript and the production build passed. The existing viewer path measurement/export check also passed. Independent review reran the primary comparison and found no blocker. Full animation parity remains unproven, including camera/material/particle motion, activation returns and the remaining movement/shuffle/result families.

## Distinguish pointer-driven hand return from activation cleanup

Revisited the already-covered primary **f2099–2115**, including every frame across **f2104–2110**. Two additional coarse full-frame views (**f2116 and f2120**) raise unique inspected coverage to **652**. Violet Inboots remains selected, with its numbered selection badge, while hover transfers to the adjacent Analog Youth. Its enlarged artwork remains steady at f2105, appears as a mixed recorded image alongside the resting face at f2106, then has returned at f2107. This is pointer-driven selection hover, not accepted effect-activation completion.

`pnpm motion:measure:hands` now independently compares two interior artwork regions at their measured focused and resting positions in all seven frames. The focused patch (**x380/y411/60×48**) uses f2099; the resting patch (**x385/y490/50×40**) uses f2071. At f2105 their grayscale normalized correlations are **0.999941 / 0.017460**; at f2106 **0.351443 / 0.960023**; at f2107 **0.053759 / 0.969485**. The command reproduces each observed correlation within **0.002**, explicitly rejects zero-variance and non-finite patches, and requires meaningful before/after scores. The two stable poses are separated by **33.366 ms of media time**. A mixed image between them prevents claiming an independently reconstructed intermediate curve or subframe return duration.

The inspected pointer-exit implementation assigns the resting scale, pivot and position directly, without a tween. The hand-activation routine itself only defines preparation and a hold; its cleanup removes the outline, while pointer interaction owns hand reset. Aegis's generic **200 ms** fan transform and short **18 px** hover lift still differ from the measured selection-hover behavior. Those differences now have explicit evidence for the next renderer comparison; no new production hover or activation-return behavior is claimed here.

The harness adds before/after return buttons and a two-line artwork-correlation graph. Export includes each observation's actual media timestamp under the existing source hash/dimension guard. The browser command passed both original artwork-scale measurements, all seven return observations, return navigation/chart containment at **320/1440 px**, timestamp export and a same-ID replacement-source check. Review found and corrected a false-green risk from NaN correlation on uniform patches; its negative reproduction now rejects uniform/non-finite data and retains correlation 1 for valid identical patches. Full activation-return, material/camera and every-family motion parity remain unproven.

## Apply the measured pointer hover to the production hand

Aegis now uses the measured **1.2 scale / −42% local pivot**, giving a centre lift of **0.504 resting face heights**, and returns immediately on pointer exit. The decoded portal retains the physical face's artwork and responsive corner controls while its original slot keeps the same size, order, accessibility and drag capture. Selected cards remain selected as hover changes. Touch/reduced motion retain the resting face; effect preparation keeps its existing lock and source enlargement.

`pnpm motion:capture:hand-hover` passed **16 natural browser cases**: first/last cards at 320/768/1024/1440 px, selection, reduced motion, touch and native drag at 320/1440 px. Drag uses the production Hand and drag hook with a legal fixture, retaining physical capture through portal removal and delivering exactly one drop. No clock was sought. The existing ten source captures and four lifecycle probes also passed after sharing the physical-plane measurement hook. Independent review confirmed immediate visible return without the original 150 ms opacity fade, and removal/reinsertion without stale hover. No additional primary frames were reviewed; coverage remains **652/40,622**. Full animation parity, including material/camera/particles and other movement/result families, remains open.

## Source-local field flare

Revisited the already inspected field activation interval **37604–37672**, including full-frame f37655 and six source-region poses. The recorded light has a soft white centre and irregular coloured lobes surrounding the source, rather than two closed outline rings or eight delayed flying points. Aegis replaces those shapes with a single **360 ms** flare: unequal tapered rays and a blurred radial bloom, using the existing Aegis effect colour. Its SVG plane follows the actual measured face, including a suspended source; the existing source aperture masks the printed card out of the flare. The normalized envelope and fixed ray pattern adapt the observed silhouette rather than reconstructing the original particle randomness, material or camera.

Natural sampling exposed an incorrect percentage origin with a negative SVG viewBox: at scale0.62 the 320 px light centre drifted approximately **24.24/31.77 px**, although the peak scale1 was centred. Explicit origin **0/0** fixes the entire clock. `pnpm motion:probe:field-light` passed **eight natural Arena activations** (two timings at 320/768/1024/1440 px), checking every sampled centre against the actual face, masked art, positive light peaks, a completed360 ms clock, disappearance and containment. **Four retained production EffectFocus probes** separately verify reduced motion with no decorative light or clock; the reduced queue normally omits this focus. No animation clock is sought by that command. Two separate sought peak screenshots were used for visual inspection and are not natural-playback evidence.

**24 focused tests**, web TypeScript, the production build, scoped lint and diff checks passed. Independent review confirmed zero centre error at0/54/144/360 ms, replay only for a new activation key and zero reduced-motion clocks. No queue duration, sound or resting layout changed. Unique primary-frame coverage remains **652/40,622**; complete animation parity, including camera/material/particle reconstruction and the other movement/result families, remains unproven.

## Alternating deck shuffle and occurrence ownership

The authored `Player.ShuffleAnimation` performs **three pairs of 30 ms Y tweens**, alternating each layer's sign and swapping it for the middle pair. Its targets are0 and±30 on serialized100×140 deck faces, followed by direct restoration of the existing stack offsets. Aegis replaces its former single rotating180 ms twitch with those six intervals and quadratic deceleration at **30/140 face heights**. Temporary backs retain the current sleeve, including opponent/default and egg treatment. The original counter stays in place; resting pile geometry and paper edges return after the movement. Initial video locator samples were reviewed, but no consecutive shuffle interval was identified. This is authored-code/scene evidence, not measured video camera or projected-curve equality; the prior652-frame interval coverage is not extended by locator sheets.

The first natural capture caught an existing queue/paint mismatch: the owner detached at **83.4%** of the CSS clock, cutting the final stroke. `deckRiffleClock` now waits for the targeted seat/pile's painted finish and its completed frame, with bounded polling and cancellation/drain support. Independent review then reproduced overlapping shuffles on the same pile reusing the first animation. Live cues now retain the **occurrence key** in a Map; moving layers remount for that key, clock lookup requires it, and an older cleanup only deletes its own occurrence. The count/top remain stable. The reviewer repeated replacement at **50.049 ms** and observed a new0→180 ms animation, retained key2, and an empty Map after completion.

`pnpm motion:probe:shuffle` passed **26 browser cases**:16 natural Normal/Fast shuffles for both seats' decks/eggs at320/1440 px, two naturally playing overlapping replacements and eight reduced-motion flows. Samples independently check the six OutQuad intervals, signs, full CSS finish, decoded sleeves, stationary counters/physical piles and cleanup. Two separately sought60 ms screenshots were visually inspected; they are distinct from those natural clocks. **234 focused tests across five files**, TypeScript, production build, scoped lint and diff checks passed. The119-case pacing matrix ran before the final occurrence fix: no timeouts and zero causal/readability/budget failures in its102 paced rows. It contains no shuffle scenario; existing baseline drift was reported without rewriting that baseline. Full animation parity remains open, including recorded shuffle projection, particles/camera and the other movement/result families.

## Breeding stack relocation

The authored `CardObjectController.MovePermanent` relocates the existing permanent with a **200 ms OutCubic position tween** before starting its movement effects. It does not instantiate the public-play landing burst for a promotion. Aegis previously showed the raised card directly at the destination with its play burst. An accepted `movedFromBreeding` now transfers the drawn card and sources between the actual Aegis breeding/battle positions. A ref-detachment snapshot captures the final source geometry, including completed entrances and late scrolling, before React removes it. Its copied styles retain the current responsive artwork and badges; the decorative copy is inert and hidden from accessibility. Snapshot work happens at departure rather than on every board render.

Natural browser inspection exposed a visible duplicate destination and an early scaled destination measurement. The renderer now suppresses that ordinary entrance before measuring and hides the resting permanent during transit. The final moving frame remains until React commits the visible resting card, avoiding a blank handoff. The promotion stays quiet after cleanup and the next evolution may play its own entrance. Independent review reproduced `stepOnce` incorrectly freezing the moving copy while its queue wait advanced. `AnimationStepContext.paused` now reflects the individual run's frozen state, so a permitted single step runs while the queue itself remains paused. Pause/resume, cancellation and skip were rechecked with production hooks and queue.

`pnpm motion:probe:breeding` passed **18 browser cases**:16 naturally sampled transfers across both seats, Normal/Fast effect settings and320/768/1024/1440 px, plus two reduced-motion flows. It independently checks each observed centre/size against the 200 ms cubic curve, preserved source image identities, hidden destination before completion, full painted finish, quiet handoff and page containment. `pnpm motion:probe:breeding-playback` preserves **four production-hook/queue cases** with a synthetic face: single-step, pause/resume, cancellation and skip, including handoff and cleanup. Separately sought100 ms screenshots were visually inspected at320/1440 px; these are distinct from the natural trajectory captures. **280 focused tests across four files**, TypeScript, production build, scoped lint and diff checks passed. This establishes authored motion and Aegis runtime geometry; a consecutive primary-video promotion interval and projected camera parity remain unverified. Unique inspected interval coverage stays **652/40,622**. Full animation parity remains open.

## Immediate match result

The authored `ResultObject.ShowResult` activates the result directly and chooses the winning/losing image. `TurnStateMachine.EndGame` selects the result button immediately. The inspected result scene subtree and win/loss image prefabs contain no Animator or Animation component. Aegis had added a 520 ms fade and a title scaling from1.5 through8 px blur. Those unsupported movements and their unused timing token are removed. The existing Aegis layout, colours, glow, reason, statistics and actions are preserved; the first action now receives focus immediately.

`pnpm motion:probe:result` passed **24 natural browser cases**:win/loss/draw, normal/reduced motion and320/768/1024/1440 px. Every sample from the first visible frame through540 ms checks full opacity, resting title geometry, no zoom/blur or result animation clock, correctly focused/enabled actions and horizontal containment. The320 px result screenshot was visually inspected. **15 outcome/catalog tests**, TypeScript, production build, scoped lint and diff checks passed. Independent review sampled36 frames across all three real Arena outcomes at320 px and found no blocker.

Coarse views at primary f38500,39000,39600,39800,40000 and40500 located late gameplay, the loading cut and the outro. They do not provide a consecutive result interval and do not extend the652-frame interval coverage. The video contains no displayed win/loss transition; the result comparison uses authored code/scene evidence rather than claiming recorded visual parity. Existing opening/phase, memory/DP/restriction, general field-removal/return, source/link and decision recipes still require complete source/video comparisons. Camera, material, particle and every-branch equality remain unproven; the full goal remains open.

## Physical field fracture

`Effects.DestroyPermanentEffect` creates `BreakCardGlass` at the departing permanent's pose and renders its own printed face into the fracture material. Its particle colour comes from the first printed card colour. The prefab has 41 rigid bodies and uses the 41 geometry objects in `BreakBlock.fbx`, not six evenly spaced wedges. `BreakGlass.BreakIenumerator` starts every fragment together, waits 100 ms, multiplies velocity by 20, then ends after another 150 ms. There is no authored stagger, shrink or opacity tween for these pieces. Physics and the camera still determine their projected paths.

`tools/diagnostics/prepare-card-fracture.mjs --input <BreakBlock.fbx> --check` reproducibly extracts the 41 front polygons. The generated mesh records SHA 256 `b 00b 724f 92cd 0e 9cbb 6b 191de 75a 5863fa 2d 02fdea 358aff 8ebe 6d 3b 7f 7f 53b 5`. Independent inspection checked 465 front UV samples against the normalized planar mapping, with maximum deviation 7.75e-7. A coverage test checks the polygon areas and independent interior samples for holes/overlap.

Field deletion now uses those irregular clips with simultaneous 250 ms clocks. For a planar constant initial velocity, the first 100 ms covers 1/31 of the displacement and the remaining 150 ms covers 30/31. Printed fragments retain full size and opacity until their endpoint. Their radial directions use each polygon's area centroid; endpoint distance remains an Aegis adaptation until projected physics can be measured. The legacy central security-fracture renderer stays separate and still needs its own comparison.

The current physical CardMini is captured before release, preserving its decoded/alternate/fallback image, responsive rim, dimensions and suspension. Ref detachment supplies a fresh bounded board-owned snapshot when the live state removes the face before its cue. Review reproduced a scale bug in which only the snapshot root resized, leaving explicit child pixels too large. The corrected copy preserves local subtree geometry and scales the entire plane uniformly. A 50% scaled,90-degree rotated face and its artwork both retained 70x 50 px. Group alias updates keep the same connected element and clear obsolete refs; capture/cache consumption and board cleanup were independently checked.

A second lifecycle regression was found: constructing a step called `queue.idle()` before enqueue, which could release deletion gates immediately on an idle queue. Completion now belongs to the painted shard clock, with an explicit discard release. The white/card-coloured Aegis light continues in its own non-blocking track after 250 ms. Its existing 800 ms light renderer remains an adaptation; source particle lifetimes/materials are not claimed identical.

`pnpm motion:probe:field-shatter` passed eight naturally sampled Arena departures (320/768/1024/1440 px, Normal/Fast), four natural/retained reduced-motion cases and 16 synthetic physical-plane regressions. The additional regressions retain explicit child dimensions under 50%/86% scale,0/90-degree rotation, decoded artwork and the displayed fallback at 320/1440 px. The harness checks 41 equal-age clocks, physical face bounds/art/rim, linear motion with the 100 ms acceleration boundary, full painted finish, no invented spin/shrink/fade, light colour, containment and cleanup. It records the latest actual source geometry read, avoiding comparison against an earlier drifting paint. Separate 100 ms screenshots at 320/1440 px were visually inspected.251 focused tests across six files, TypeScript and the production build passed; reviewer found no remaining blocker in the corrected delta. Scoped lint/format and whitespace checks cover the edited files.

No new consecutive primary-video deletion interval was reviewed; interval coverage remains 652/40,622. Full source physics/camera/material/particle equality, all removal branches, returns, sources/links, opening/phase, memory/DP/restriction and decisions remain unproven. The full animation goal remains open.

## Source and stripped-top removal

`Effects.RemoveDigivolveRootEffect` (2169–2272) uses a single upright hand-card
vignette, sets its CardImage to opaque black, and applies the removed card's first
printed colour to its selection outline. The 100×140 native card at scale 0.2
is 20×28; compared with the field face's native 0.9 scale, Aegis normalizes the
vignette to 2/9 of the measured physical host. This retains responsive resting
card dimensions; it does not prove identical camera projection.

The sequence appends Y for 170 ms and joins X for 85 ms. The returning X tween
is appended after the whole 170 ms joined group, so it runs from 170–255 ms,
not 85–170 ms. A 170 ms hold follows, the outline turns off at 425 ms, then
the black face fades for 170 ms. Total authored duration is 595 ms. Offsets
are +15 X/+22 Y for the owner and reversed for the opponent (CSS Y inverted).
The cached settings asset SHA256
`07e777aa94db323f67f7afd2b7fc53c2e5562df60f1541c2e9ae9f76e7ee5cc3`
matches the committed LFS pointer and specifies defaultEaseType 6 (OutQuad);
the old bundled XML's different default is not authoritative for this project.

`StackStripPeel` follows this silhouette, clock and ownership direction.
Multi-level stripped-top batches present every card, and all hosts share one
source-removal track. Runtime review reproduced and corrected two regressions:
a transferred host lost its quiet entrance when stack length/top identity changed,
and different hosts could show two peels simultaneously. An accepted landing
burst now controls entrance restarts; source removal keeps the wrapper/quiet flag.
The real-queue regression and independent reproduction confirmed one active
vignette across hosts. Each painted fade remains mounted through a final paint tick.

`pnpm motion:probe:stack-strips` passed 20 naturally sampled production Arena
scenarios: four widths, both owners, source/top removal, plus Fast source removal
at 320/1440 px. It compares every sampled pose with independently evaluated
OutQuad equations, checks 2/9 physical size, black face/coloured rim, upright
unscaled rendering, ordered card identities, host wrapper identity, no overlap,
full 595 ms finish and cleanup. Four additional cases verify natural drain and
retained-component suppression under reduced motion. Captures are ignored local
artifacts under `.local/motion-reference/aegis-stack-strips/`.

No new consecutive primary-video interval was reviewed. Coverage remains
652/40,622; authored timings and browser probes do not establish complete video
or projected material/camera parity. Whole permanent return-to-deck remains next:
the authored route moves its entire upright clone for 250 ms, hides ancillary
children, then fades the face for 160 ms. Aegis currently uses a different face
flight and requires a physical stack snapshot before that route can be matched.

## Decision backdrop coverage

The sheet's fixed pseudo-element was inside an animated translated, scrolling
panel. Its containing block therefore did not cover the lower arena. The backdrop
now renders as a sibling, independently covers the stage, and blocks pointer input
under the modal. Viewing the board removes it; returning restores it. Desktop side
rail choices keep their existing clear field. This fixes coverage without altering
Aegis card sizing, panel content or arena design.

`node tools/diagnostics/probe-decision-backdrop.mjs` passed 12 retained production
component cases on Arena and live Effects Lab boards: 320/768/1440 px with target
and effect-order panels. The shade matches complete viewport bounds; hand/raising
hit tests reach the shade or decision panel. View/Return removes and restores the
single backdrop. Lab screenshots at 320/1440 px were inspected. Independent review
checked six cases, including the clear desktop side rail, and found no blocker.
212 decision tests and the production build passed. These checks establish overlay
coverage/lifecycle, not server legality for the retained requests.

## Physical field return to deck

`Effects.DeckBounceEffect` (828–919) hides the original field parent and creates an
upright whole Permanent clone with its animator disabled. Position tweens for
250 ms; the joined scale tween targets the already-existing scale, so this route
does not grow or shrink the card. It then hides every parent child except CardImage,
fades that face for 160 ms and destroys the clone. Top/bottom return routes in
CardController both invoke this effect before discarding sources/links and moving
the top card into its library. OutQuad is the committed settings default already
verified above. Native destination coordinates belong to that client's layout;
Aegis instead targets the owner's real current deck pile.

The previous Aegis path used a separate 60 px CardFull and generic 340/520 ms draw
flight with growth/opacity changes. The new `DeckReturnFlight` uses an inert copy
of the departing PermanentView, retaining its sources, links, badges, decoded or
fallback image, physical rim and local child dimensions. A uniform plane scale
preserves every child pixel when the host has an ancestor scale. Rotation and
entrance transforms are neutralized for the authored upright flight. At 250 ms,
source/link/field-info branches turn off; the printed face fades until 410 ms.
The finite CSS percentage is rounded just below 250 ms to avoid leaving the
step-based ancillary visibility on at the exact 250 ms boundary.

Ref detachment captures the complete physical stack before a state patch removes
it; the current connected source is captured after the causal gate when available.
`TIMINGS.deckReturn` and the painted face clock govern cleanup. Whole-return links
also carry an explicit finished gate: the next removal cannot begin at the old
350 ms stagger while this face is still fading. A discarded, cancelled or skipped
step releases its holds and gates through `onDiscard`/`finally`, replacing the
queue-idle cleanup dependency. Real-queue regressions cover post-cause measurement,
serial hosts, gated cancellation and skip.

`pnpm motion:probe:deck-returns` passed 14 naturally sampled Arena cases: four
widths, both owners, Normal/Fast endpoints, and 320/1440 px suspended 12-source,
two-link stacks. Samples retain source image/rim/size, match independent OutQuad
position/fade equations, reach the actual deck centre at 250 ms, hide ancillary
branches, keep the resting source out of the field and retain the 410 ms finish.
`node tools/diagnostics/probe-deck-return-poses.mjs` passed four separately retained
50% scaled, 90-degree suspended decoded/fallback stacks and four natural reduced
queue cases. Retained poses are explicitly sought and are not counted as natural
motion samples.125 ms screenshots at 320/1440 px were inspected. Independent review
also reproduced an upright 50×70 px clone from a 100×140 px source at 50% scale,
constant geometry, arrival/fade phases and inert cleanup, with no blocker.
256 focused tests across seven files, TypeScript, production build, scoped lint/
format and whitespace checks passed. Captures remain ignored local artifacts in
`.local/motion-reference/aegis-deck-returns/`.

No new consecutive primary-video return interval was reviewed; coverage remains
652/40,622. Full projected camera/material/particle parity, source/linked cleanup
frame cadence, ACE Overflow presentation, deck-count timing, return-to-hand and
other leave branches remain unproven. This establishes the deck-flight recipe,
not completion of the full animation goal.

## Physical field return to hand

`Effects.BounceEffect` (749–824) hides the original permanent and creates a whole
field-card clone. Its transform rotation is copied rather than reset upright.
Position and uniform scale tween together for 250 ms using the verified OutQuad
project default: viewer scale is original ×1.1, opponent scale original ×0.25.
The clone is destroyed at arrival with no fade; a 100 ms wait follows.
`CardController` (2790–2860) first shows the returned top cards, then loops hosts:
BounceEffect, source/link cleanup, field removal. Only after that loop does it add
all collected top cards to their owners' hands. Native endpoint coordinates are
layout-specific, so Aegis uses its existing hand dock and opponent strip.

`HandReturnFlight` now renders the physical departing PermanentView, rather than
only enabling a new hand slot. The detached snapshot freezes child pixels and
transforms and is inert. It preserves individual suspended face/source/link poses;
rotating the whole upright deck snapshot incorrectly rotated the source fan at
start, which independent review reproduced and the dedicated hand snapshot fixes.
Its root contains only external/permanent scale. Preserved internal entrance scale
must not be multiplied into the root again: a second review reproduced an 86 px
entering face becoming 73.96 px and unrelated 100 px sources becoming 86 px. The
fixed snapshot retains local transforms once and compensates its position from the
actual root/face viewport centres. Parent scale 0.5, quiet and active-entry poses
match all original child bounds (review max rounding difference 0.015625 px).
Deck returns continue to use their separate upright snapshot.

The engine's existing `returnedPermanents` receipt now also describes successful
whole-field returns to hand. Only the public top card is carried; private deck/
trash additions, silent staging and surviving-host top detachments carry no such
receipt. Attachments stay in their existing trash movement. Contiguous recipient/
origin groups keep their prior order and redaction. A deck-return consumer now
checks the destination, preventing duplicate deck flights for hand receipts.
Four new API regressions cover whole public tops, mixed recipients/private recovery,
staging/detach and private-zone redaction. Primitive and return-reaction suites pass.

A planned hand-return group allocates its completion dependency before hand-entry
workers can start. Hosts join the serial removal chain after their causal clause.
Every started gate follows its predecessor's completion; the group's entry ceiling
starts only when the final host begins. A real 18-host queue regression (>5 seconds)
checks zero gate expiries and no overlapping hosts. `finally` and `onDiscard` release
field holds, removal lifetimes and the group entry gate. The physical 250 ms clock
retains its final painted frame; only then is the ghost removed and the 100 ms pause
counted. The existing 80 ms hand-entry animation remains separate.

`pnpm motion:probe:hand-returns` passed 22 natural Arena cases: four widths, both
owners, two-return batches, Normal/Fast endpoints, suspended 12-source/two-link
stacks, and reduced-motion queues. Independent OutQuad equations check position/
scale, source art/rim, opaque stacks through arrival, actual hand endpoints, serial
hosts, the post-flight pause and hand-entry ownership. Six changed multi-host/deep
cases were rechecked after the final snapshot/gate fixes. The source/full-batch
showcase is not simulated by these fixtures; they prove the field departure recipe.
`node tools/diagnostics/probe-hand-return-poses.mjs` passed 16 separately retained
320/1440 px decoded/fallback, viewer/opponent, parent-scale-0.5 poses, quiet and
mid-entrance. Every source/link face's initial position and scaled dimensions are
checked; sought poses are not counted as natural motion samples. 125 ms screenshots
were inspected. Artifacts remain ignored under `.local/motion-reference/aegis-hand-returns/`.

No additional consecutive primary-video interval was reviewed; coverage remains
652/40,622. The prior returned-card showcase, source/link cleanup-frame cadence,
ACE Overflow/count timing, native sound/projected camera/material parity, eggs/
tokens/other leave branches and the full animation comparison remain unproven.
The full goal remains active.

Final verification: 272 focused web tests and 228 API/reaction tests passed; web/API
TypeScript checks, the final production build, scoped lint/format and whitespace
checks passed. Independent review repeated the 18-host real queue with no expired
gates or overlapping returns and found no remaining blocker in this delta. The
updated Arena preview returned HTTP 200 at the existing Tailscale address.

## Central card fracture and accelerated playback (2026-10-04)

`Effects.DestroySecurityEffect` (1948–2027) creates the regular permanent `BreakGlass`
prefab over the displayed printed card, hides the original immediately, starts the
first printed colour's evolution light, and waits for its fracture. The regular
`BreakGlass.BreakIenumerator` starts all rigid bodies together, waits100 ms,
multiplies velocity by20 and ends150 ms later. The shield's `SecurityBreakGlass`
subclass is a distinct exception; this change does not retime that shield effect.
Neither regular route authors a pre-crack sketch, jitter, stagger, spin, shrink or
opacity tween. `CardController` around4762 finishes `BattleEffect` before invoking
the losing permanents' destruction.

Central CardShatter now shares the previously extracted41 front polygons with field
removal. Fragment displacement retains the same documented planar centroid/radial
adaptation:100 ms travels1/31 of the endpoint distance,150 ms travels30/31. The
original printed face is hidden at departure; pieces keep their size and opacity
until the250 ms endpoint. The old central six wedges,18 ms stagger, spin/shrink/fade
and unsupported180 ms pre-crack/jitter are removed. The fragments inherit their
actual CardFull frame dimensions, including78px phone cards, rather than retaining
the desktop158/236px width. Current art, first-colour rim, fallback and Aegis
composition remain in use.

Effect-driven security destruction retains its readable reveal/hold, followed by
250 ms of fragments and the existing160 ms scene exit. A losing attacker instead
completes250 ms impact plus100 ms settle before its250 ms destruction. The checked
card's own140 ms narrow/upward disposal remains separate. The stage stays opaque
until the attacker fragments finish. Guarding only with a fixed count of queue
waits proved insufficient at accelerated playback: a2x queue returned with pieces
still running. The guard now accounts for actual elapsed polling time, CSS delay
and painted animation age; pauses do not consume their entire wall time from the
budget. The actual battle clock also finishes before checked-card disposal. Cancel,
skip, drain and an absent decorative clock release ownership.

`pnpm motion:probe:central-shatter` passed12 naturally sampled Arena cases at
320/1440px, Normal/Fast and reduced motion (Barrier security destruction and losing
attacker);16 separately retained both-seat decoded/fallback geometries; and six
actual renderer/queue1x/2x/4x cases. Two100 ms retained screenshots were inspected;
they are sought specimens, not natural-video samples. After the final lifetime
corrections, `--changed` rechecked six losing-attacker flows and all six playback
cases. Independent per-frame checks cover41 equal-age clocks, frame/art dimensions,
the two linear velocity stages, terminal finish, constant fragment/stage opacity,
first-colour light variant, containment and cleanup. The reviewer independently
reproduced all six accelerated cases and found no remaining blocker.94 focused
checks across nine files passed again after the final clock/stage corrections.
The production build (including TypeScript), scoped format and whitespace checks
passed. Scoped lint has no new warnings; two existing security-feedback test
warnings remain.

Primary f39370–39398 were inspected consecutively:29 additional unique frames of
the shield light/ring, purple12000DP face growth and its settle. They extend the
previous652-frame unique coverage to681/40,622. They are a normal security reveal,
not a newly identified effect-destruction interval. Source code and Aegis browser
checks therefore establish this geometry/clock improvement, not complete recorded
visual parity. Actual3D rigid-body trajectories, projected camera, fracture material,
the central light's native independent particle lifetime and full-family/every-branch
comparison remain unproven. The full animation goal remains open.

## Six-emitter colour light and independent field lifetime

`tools/diagnostics/extract-particle-light.py` resolves the seven colour-prefab GUIDs
from the authored battle scene, joins ParticleSystem/renderer/Transform or
RectTransform by object ID, excludes the emission-disabled root, and records hashes
for prefabs, materials and available textures. The seven colours have identical
motion, size and alpha controls; their RGB gradients differ. Reproduce the extraction
with Python3.12+ and PyYAML6.0.3 (`tools/diagnostics/requirements-motion.txt`):

```sh
python3 tools/diagnostics/extract-particle-light.py --source <source-checkout> --check
pnpm motion:probe:particle-light --base http://localhost:5174
```

The six active capacities are **3,1,75,1,150,75** (305 in total), with1000 births/s
and no bursts/looping. Five groups use1s particle lifetimes; the second mesh flash
uses0.5s. Their source materials are Laser2, Core4, Ring and Light3; the last supplies
a tapered texture to the final stretched group. Alpha gradients have different peaks,
including a white core initially opaque, a slower halo and shrinking moving sparks.
The sparks' hemisphere has radiusThickness0: sampling uses its shell, rather than
inventing a filled volume. Other source size curves use their unweighted cubic
Hermite tangents. [Unity's renderer documentation](https://docs.unity3d.com/es/2020.2/ScriptReference/ParticleSystemRenderer-lengthScale.html)
defines stretched length relative to particle width; the extracted stretch factor
is9. The model's continuous-rate last birth is150ms and its last lifetime ends at
**1150ms**. These are analytic birth times, not measured Unity frame batches.

Aegis now paints these groups on one canvas per light, replacing the uniform24-ray
field arrival/evolution/hatch/fracture decoration. Existing palette, resting cards,
slots, fonts and layout remain in use. Small cached procedural material stamps avoid
305 HTML nodes per effect. Seeded paths keep comparisons repeatable. The flattened
x/z projection onto the existing slot, procedural textures, alpha compositing and
palette remapping are adaptations; native camera/shader/render equality is not
established. Short draw/security/reveal flashes retain their separate clocks.

The existing **200ms** landing handoff now completes its own burst track and starts
a separate light track with `holdsBoard:false` and `blocksDecision:false`. Source
clauses were explicitly waiting on the old burst track, so changing only decision
flags would still have delayed them by the full light lifetime. The separate track
fixes that dependency. Exact accepted cue keys guard both the200ms painted handoff
and1150ms cleanup during accelerated queue playback; an old light cannot delete a
newer arrival on the same permanent. Fracture still releases its consequence after
250ms while its light continues. Cancel, skip, drain, reduced motion and unmount
release the decoration. A paused CSS clock keeps its last canvas pixels without
redrawing them continuously.

The final focused suite passed **305 tests across11 files**, including the full210
match-cue tests and meaningful lifetime/replacement/cancellation checks. Existing
arrival-source tests now observe the200ms handoff plus their polling interval;
the restored losing-attacker case observes its250ms fracture. The production build
passed. `motion:probe:particle-light` passed **30 natural Arena cases** at320/1440px
with Normal/Fast/reduced settings, covering both-seat hatch, evolution, play and
field deletion. Each normal/fast case samples real clocks and canvas pixels,
including light after900ms and retention through the final1150ms endpoint.

Two supplemental eight-effect fixtures painted all palettes concurrently. At both
widths they sampled78 frames over about1.3s, with95th-percentile frame intervals
of16.8ms. The instrumented `drawImage` calls totalled72.4ms/67.5ms; those numbers
exclude simulation/style/layout and are local headless-browser measurements, not
a general device-performance guarantee. Active screenshots were inspected beside
the already reviewed source sheet. The separately rerun hatch capture passed16
natural both-seat/four-width cases, stable slot/card geometry, decoded art, reduced
motion and four independently sought OutBounce specimens; phone/desktop videos
were indexed for the comparator. These overlap the particle probe's hatch cases
and must not be added as30+16 unique cases.

Independent review reproduced nine synthetic-host real-component/queue cases at
1x/2x/4x (complete/cancel/skip): painted handoff200–216.7ms, a finished1150ms light
and no retained canvas after cancellation. The durable commands are
`pnpm motion:probe:particle-queue` and `pnpm motion:probe:particle-lifecycle`.
The latter explicitly pauses/resumes CSS, checks no redraw during pause and an
empty canvas at its endpoint, then remounts an active effect and unmounts it early
to verify that future drawing stops. These fixtures are supplementary, not natural
Arena event recordings. Scripts/results live under `tools/diagnostics` and ignored
`.local/motion-reference/aegis-particle-light`. The updated four-scene burst recording
also passed and indexed463 frames for `/dev/motion-reference?comparison=aegis-card-bursts`.

Primary-video coverage remains **681/40,622** unique consecutive frames. This step
adds reproducible source evidence and live-renderer checks, not new full-video
coverage. Central security/attacker fractures use the new emitters, but their light
still disappeared with the central scene at this checkpoint; the independent tail
is addressed by the following step.
Overlapping accepted arrivals on the same permanent still replace its single light
owner. Native spatial/camera/material comparison, remaining effect families and
all-branch parity remain unproven; the full animation goal stays open.

### Independent central fracture light

`DestroySecurityEffect` creates the first-colour evolution particle object at the
card's pose and starts its deletion coroutine independently of the250 ms glass
break. Its object-cleanup coroutine waits5s; this is resource disposal, not a5s
visible hold. The extracted emitters finish their visible lifetimes by1150 ms.

Central destroyed-security and losing-attacker scenes now provide their live queue
ownership to the fracture light. A separate viewport-clipped canvas follows the
source CSS clock, including its readable hold or battle/settle delay, and retains
the last Aegis card-frame geometry after that scene leaves. It never inherits the
stage's exit opacity. Its queue step sets both `holdsBoard:false` and
`blocksDecision:false`, so it neither lengthens the fracture nor delays the next
choice. Scene keys and roles keep concurrent lights distinct. The match-view scope
owns remaining tails and disposes them when the end-game overlay removes its
scenes. Early source removal, cancel, skip, drain and reduced motion also clean up.
The original short blue reveal flash remains a separate effect.

`pnpm motion:probe:security-light` checks12 natural Arena cases: destroyed security
and a losing attacker at320/1440 px with Normal/Fast/reduced motion. Normal/Fast
cases sample the shared active clocks, canvas pixels after900 ms without the
original scene, full opacity through the tail, native-clock completion and no
horizontal overflow. Chromium rounds a script-assigned animation start time, so
active-clock equality uses a0.2 ms tolerance; the first pending CSS frame is blank
and excluded from that equality assertion. Four natural tail screenshots were
captured independently of any sought poses. Artifacts remain under ignored
`.local/motion-reference/aegis-security-light`.

The same command checks21 supplemental production-component/queue fixtures at
1x/2x/4x: completion, cancellation, skip, drain, whole-view unmount, scope-only
unmount and two overlapping scene occurrences. They verify the painted250 ms
handoff, non-blocking tail flags, concurrent owners and eventual cleanup. These
are browser fixtures, not additional recorded gameplay cases. Independent review
also checked early source removal, stable ownership across rerenders and overlap;
it reported no blocking findings. The final338 tests across11 focused files,
production build, scoped lint and formatting checks passed.

Primary consecutive-video coverage remains681/40,622. The geometry and procedural
materials preserve Aegis's design and remain adaptations. Native projected camera,
physics/material equality, every remaining motion family and all branches are
still unproven; the full animation goal remains open.

### Spatial controls and projected beam direction

The schema2 particle extraction now includes world simulation, shape-only scaling,
local added velocity, classic/freeform stretch controls, mesh alignment and geometry,
and hashes the presentation source. All six child systems use scalingMode2 and
moveWithTransform0. The four source callers (`CreateFieldPermanentCardEffect`,
`DigivolveFieldPermanentCardEffect`, `DestroyPermanentEffect` and
`DestroySecurityEffect`) agree on4/1/4. The extractor rejects differing caller scales
or unsupported freeform/speed-driven stretch controls rather than silently applying
this recipe to them. [Unity's shape-scaling API](https://docs.unity3d.com/2021.3/Documentation/ScriptReference/ParticleSystemScalingMode.Shape.html)
applies transform scale to birth positions without scaling particle sizes or motion.

The previous model rotated each unscaled birth point and flattened X/Z, losing
height. It also rotated stretched beams independently on the screen. Birth points
now apply the child transform and caller scale; their velocities and start sizes
remain unchanged. The manager's camera and its card canvas resolve to the authored
85-degree camera quaternion,60-degree FOV and95.5 plane distance. The local
projection retains all three spatial axes and relative depth. Its perspective
derivative controls each classic stretched beam's angle and projected length; a
finite-difference behavioral test checks that the long axis follows visible motion,
even after changing the stored rotation/spin. This follows the
[2021 renderer contract](https://docs.unity3d.com/2021.3/Documentation/Manual/PartSysRendererModule.html):
stretched particles align to velocity even when velocity-based length scaling is0.

Both mesh layers use builtin10209 and local alignment, with zero rotation and no
rotation module. The builtin-resource mapping is inferred from the official
[Graphics scene template](https://github.com/Unity-Technologies/Graphics/blob/master/Packages/com.unity.render-pipelines.universal/Editor/SceneTemplates/Standard.unity),
whose ground references that mesh; [Unity's primitive geometry](https://docs.unity3d.com/2021.3/Documentation/Manual/PrimitiveObjects.html)
defines the plane as10x10 in XZ. Their rendered bounds now use that extent and its
projected height instead of treating the mesh as a1x1 billboard. This restores the
growing halo and ring around the rays while keeping Aegis's cards, palettes and
layout. Re-viewed primary f1727/1729/1734 distinguish the smaller field light from
the very large foreground draw-card flare; this step does not apply the draw
flare's dimensions to a field arrival.

Pixel-unit calibration still uses the existing Aegis effect box. The local camera
projection is anchored at that box, not a replay of native runtime camera changes
or off-axis card positions. Meshes use an affine raster approximation at their
centre, not the native200-triangle plane's full perspective UV interpolation.
Procedural textures, shader/colour-space blending and exact native random seeds
also remain unproven. These are explicit remaining differences in the full goal,
not a claim of complete camera/material parity.

The final spatial revision passed362 tests across14 focused files, the production
build, extraction reproducibility, scoped lint/format checks and `git diff --check`.
Browser validation passed30 natural Arena cases at320/1440 px across Normal/Fast/
reduced motion, plus separate eight-light simultaneous fixtures at both widths.
The12 natural security-tail cases and21 supplemental ownership/cleanup fixtures
also passed with the new projection. Nine queue completion/cancel/skip cases at
1x/2x/4x and lifecycle pause/resume/unmount checks remained green. Independent
review reported no blocking findings. The refreshed four-scene comparator contains
461 decoded Aegis frames; these do not increase primary reference coverage, which
remains681/40,622. Tail screenshots were inspected at both viewport widths.

### Landing groups and stable narration lanes

Schema3 also resolves `NewUnitEffect_OnLand` from the battle scene and verifies
its two callers, root scale and0.05 world-height placement. The disabled root is
excluded. Its four active groups have capacities50/75/50/15,0.5s authored
emission/lifetime and simulationSpeed2.5. Continuous-rate births, deaths, motion
and signed spin now share that multiplier; their final lifetime ends at400 ms.
The stars sample the authored10–20 speed range instead of all using its midpoint.
The original seven colour recipes still use simulationSpeed1 and finish at1150 ms.

Confirmed physical play/evolution adds the190 landing particles to the305 colour
particles on one canvas and CSS clock. Breeding evolution uses the same production
permanent renderer; its old outer burst is suppressed to avoid duplication.
Hatch, centre-stage showcase and fracture retain their existing colour-only path.
Procedural star/spark silhouettes use Aegis hues rather than importing the native
rainbow gradients or textures; those gradients and asset hashes remain recorded
as evidence. The generic dust ellipse is removed. The field now uses the100 ms
piecewise OutBounce envelope already used by hatch, replacing its previous
OutBack/vertical nudge. Its1.06 scale amplitude still needs native camera calibration.
A stronger selector lets an accepted landing animate even when a copy has a quiet
generic entrance; retired bursts keep their printed faces at rest.

The requested narration limit is two actual toasts per wide-screen column. A
rejection counts toward the text limit; an occurrence with both a card notice
and a card panel counts twice toward the card limit. Hidden records remain on
their existing lifetime and dismissal ownership. Fixed top/height bounds no
longer change when a decision opens; the card lane has room for two full panels
on a tall viewport. All decision variants outrank the notices. The portrait
accordion keeps its prior presentation.

`ShowEffectDiscriptionObject` moves its background840 units in100 ms with OutQuad;
the background prefab width is834.5. Accepted effect notices now enter from
840/834.5 of their own width with that curve and full opacity. Generic notices
retain200 ms and card panels230 ms. These are motion/column changes inside
Aegis's design, not complete native typography, camera or material parity.

The focused run passed405 tests across15 files. Thirty natural Arena cases passed
at320/1440 px with Normal/Fast/reduced motion, plus two supplemental eight-effect
fixtures. Separate layer raster checks paint each landing group at100 ms, verify
the beam tail at300 ms and no remaining layer at400 ms. Lifecycle pause/resume/
replacement/unmount checks also passed. Independent review reproduced quiet and
breeding landings, retirement without replay, stable two-toast columns and the
opaque OutQuad entry. Primary consecutive coverage stays681/40,622.

The production build and extraction reproducibility also passed. The refreshed
four-scene Aegis comparison recording contains510 indexed frames. The durable
notice-lane probe passed at768x520,1024x760 and1440x900: both decision kinds and
rejection preserve each column's rectangle/count, all visible decision-button
centres remain hittable, and reduced motion removes the effect entry.

The broader mobile source-text suite had two failures in unchanged hand-selection
handler regex assertions; its other99 checks passed. These failures do not verify
the new narration behavior, whose49 focused component checks passed. Full animation
parity, native textures/shaders/runtime camera and the remaining families are open.

### Private hand snapshots and complete board focus

An opaque opponent draw exposed a projection crash: private seat snapshots omit
the opponent's hand array, but the arrival hold unconditionally called `filter`.
The hold now retains the omitted array while adjusting only the public hand/deck
counts. Matching a viewer arrival also waits safely when its private array has
not arrived. Two regression cases first reproduced the exact crash, then passed
for both viewer seats with current and sequential presentation. The four focused
projection/queue suites passed246 checks; the real opponent play and On Play draw
settled in desktop and phone browser tests. Independent review found no blockers.

Accepted field focus now measures and paints the entire board as its direct
child, rather than being clipped inside the central field. The mask covers both
hands, raising areas and bottom counters; its shade matches breeding at
rgb(4 9 18)/62%. The transformed source aperture, light, sound, input transparency
and notice/decision priority remain intact. Twenty focused model/focus/geometry
checks and twelve browser activation cases passed at320/768/1024/1440 px,
including four retained reduced-motion component checks. Natural screenshots
confirm the lower coverage. The production build passed. These layout/privacy
fixes do not increase the681-frame consecutive source coverage.
The two real accepted-watcher browser scenarios also passed on desktop and phone,
checking full dock coverage, measured source/mask alignment, consent and settlement.
Review caught a hover stacking gap despite correct overlay bounds: the fan's
hover/selection indices and body-level magnifier could paint above the dim. The
active focus now isolates the hand dock's internal ordering and shades the
portal's printed face without capturing input. The expanded twelve-case probe
passed again, including four natural mouse-hover cases that check painted fan
order, portal shade and restoration after focus. Hover screenshots were inspected
at320 and1440 px. Bounds alone are insufficient evidence for complete shading.
Independent revalidation at1440 and768x520 confirmed hover, selected and high-index
fan ordering throughz1000, portal shading and cleanup, with no remaining blocker.

### Landing depth and card-relative spatial calibration

Read-only source research, 2026-10-04. No additional video frames were inspected;
unique consecutive primary-frame coverage remains **681/40,622**. The following
numbers are mathematical projections of authored scene settings, not runtime
captures or completed production changes.

Both creation and evolution animate **local Z −30 → 0 over 100 ms, OutBounce**;
the card's local X/Y stay fixed. The own root's `.9` scale does not multiply its
local-position displacement. Creation then waits 100 ms; evolution waits 120 ms
before restoring the original card. The creation loop near Z −.2 is a polling
condition, not a different tween endpoint. Landing particles are created when
the tween is scheduled, with their root world Y fixed at .05; that height is
not the card's fall distance. Sources: [creation](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/Effects.cs:536),
[evolution](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/Effects.cs:670).

The [Board canvas/scaler](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:163935)
uses Screen Space Camera, plane distance **95.5**, reference **1920×1080** and
Expand. Both [viewer](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:167174)
and [opponent](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:158969)
permanent parents rotate **+5° X**, with unit scale. The
[main/virtual camera](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:42140)
uses 60° FOV and 85° X. Screen Space Camera places the canvas relative to its
camera; the card-parent tilt is therefore **5° relative to the canvas**, not 85°
relative to the camera. [Canvas render modes](https://docs.unity3d.com/Packages/com.unity.ugui@1.0/manual/class-Canvas.html),
[Expand scaling](https://docs.unity3d.com/Packages/com.unity.ugui@1.0/api/UnityEngine.UI.CanvasScaler.ScreenMatchMode.html).

At the reference aspect ratio, define `F=1080/(2*tan(30°))=935.3074361`
canvas units and `k=95.5/F=.1021054643` world units per canvas unit. More
generally, for viewport `w,h`, Expand's scale factor is
`s=min(w/1920,h/1080)` and `k=2*95.5*tan(FOV/2)*s/h`.
The fall's initial camera-depth reduction is **3.051507665 world units** and
its upward camera-space displacement is **.2669723273 world units**. At the
canvas centre the normalized depth is **.03195295984**, so initial apparent
size is **1.033007652×** resting size. A fixed 1.06 amplitude is not the
projection of these settings.

For an actual resting slot, let `Dslot` be its camera depth, `W` its projected
printed-card width, and `(Cx,Cy)` its resting screen centre relative to the
camera principal point; screen Y increases downward. With
`u=1−OutBounce(clamp(t/100ms,0,1))`, use:

```text
r(t) = Dslot / (Dslot − 30*k*cos(5°)*u)
dx(t) = (r(t)−1)*Cx
dy(t) = (r(t)−1)*Cy − r(t)*(30*sin(5°)/99)*u*W
```

The direct vertical term is upward, **−.027282591 W** initially at canvas
centre. Perspective drift also moves the centre away from the principal
point: it can outweigh this term below the centre. Apply the bounce to depth
and recompute the reciprocal; linearly interpolating scale changes the path.
Both seats share the same fall axis. Opponent reversal changes only the inner
[printed-face parent](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/FieldPermanentCard.cs:318).

The authored front/rear rows give initial size factors **1.0334945/1.0341335**
for the viewer and **1.0324731/1.0319312** for the opponent. Including each
player's canvas offset, initial vertical centre shifts are respectively
**down .055585/.121971 card widths** and **up .034814/.091371 card widths**.
For a front-row slot at X=±640, horizontal drift is outward **.216530 W**
(viewer) or **.209927 W** (opponent). These follow the scene's row coordinates
−151/−342.66 and +171/+350.2, not universal seat constants.
[Viewer slot](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:62034),
[opponent slot](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:51139),
[player offsets](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:814),
[frame positioning](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/Player.cs:1655).

The [field printed face](/Users/viniciusluiz/dcgo-source/Assets/Prefab/FieldPermanentCard.prefab:13261)
is **110×154**, inside a [root](/Users/viniciusluiz/dcgo-source/Assets/Prefab/FieldPermanentCard.prefab:18135)
scaled .9 in X/Y: **99×138.6 canvas units**, **10.10844096 world units wide**.
One world unit is **.098927224 printed-card widths** at the reference aspect.
The root's 130×180 selection box is not the printed face. The default
[Stand animation](/Users/viniciusluiz/dcgo-source/Assets/Animation/Battle/FieldUnitCard/IsUnTap.anim:16)
sets root X rotation to zero; the temporary evolution clone disables its
Animator and copies the original rotation. Exact corner shapes require that
actual rotation, suspension and camera depth. Aegis can preserve its resting
face and map only relative depth/centre displacement; choosing its own board
principal point is an explicit layout adaptation.

Particle normalization must be contextual. Field colour effects are under the
unit-scale world [EffectParent](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:173852).
Hatch routes through [PlayPermanent](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/CardController.cs:1082)
and the same field creation recipe, so it shares the field face scale. Central
security/draw use [HandCard's 100×140 face](/Users/viniciusluiz/dcgo-source/Assets/Prefab/HandCard.prefab:2233),
parent scale **3.33×1.5=4.995**, and the separate
[Game UI canvas at distance 87.76](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:156449).
Its world face width is **46.86814015×runtimeCardScale**: nominal Security
scale .6 gives **28.12088409**, while the draw flash's .45 gives
**21.09066307**. [Parent scales](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:82305),
[outer parent](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:35963),
[draw scale and flash](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/Effects.cs:1205).
Security freezes its Animator after a nominal 200 ms although the clip reaches
.6 at 233.333 ms; its precise retained scale depends on scheduling.
[Freeze](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/Effects.cs:1821),
[clip endpoint](/Users/viniciusluiz/dcgo-source/Assets/Animation/Battle/ShowHandCard/YourEnterSecurityCard.anim:410).
Draw/reveal flash uses a different UI-parented prefab, with draw root scale
halved; it must not inherit the field colour-emitter normalization blindly.

The useful extraction seam is a card-spatial section alongside schema3's camera
and emitter controls: resolve actual face/root/parent sizes, canvas scaler and
distance, parent tilt and fall duration/endpoints from these sources. Retain
their hashes and fail extraction if the resolved hierarchy changes. Validate
independent projected centres/corners at several times and both seats, exact
resting size/anchor restoration, reduced motion and cancellation. Source camera
impulses, aspect changes and real Animator poses remain runtime uncertainties;
this research does not claim those have been measured or implemented.

### Bounded native-clock check

Read-only source check, 2026-10-04. The inspected
[blue colour prefab](/Users/viniciusluiz/dcgo-source/Assets/Effect/ポケモン/水.prefab:35)
declares `simulationSpeed: 1` and `useUnscaledTime: 0` for its active systems;
the [landing prefab](</Users/viniciusluiz/dcgo-source/Assets/Effect/52SpecialEffectPack/Effect/Effect(Shuriken)/新ユニット生成時着地エフェクト2.prefab:44>)
declares `simulationSpeed: 2.5` and scaled time for its four active groups.
[Shared deletion](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/Effects.cs:191)
waits five seconds, so that cleanup alone does not establish an early colour
tail cutoff. Searches found no global time-scale assignments or game-speed
setting in the gameplay scripts; the broader asset tree has time-scale setters
in imported UI demonstration scripts. This is a bounded search result, not
proof of a recorded build's runtime clock.

The serialized [time settings](/Users/viniciusluiz/dcgo-source/ProjectSettings/TimeManager.asset)
and [tween settings](/Users/viniciusluiz/dcgo-source/Assets/Resources/DOTweenSettings.asset)
are unresolved LFS pointers in this checkout. Their contents and the video's
binary version were not verified. A measured interval with detectable pixels
shorter than the continuous emitter's maximum lifetime cannot determine a
global speed multiplier: opacity, material/occlusion thresholds and build
differences remain competing explanations. A landing with only one or two
clearly displaced frames likewise does not establish acceleration of its
authored 100 ms depth tween. No FPS-resampling explanation is established.
Preserve the source duration and Aegis's existing Normal/Fast controls until
independent clock or stronger visual evidence distinguishes those possibilities.

### Projected landing implementation and complete field-focus coverage

The subsequent implementation extracts the printed field face, root scale,
canvas reference size, parent tilt and authored fall into schema 4's
`spatial.cardPlane`. Creation, evolution and hatch now apply the 100 ms OutBounce
to depth and project its reciprocal scale and centre displacement around the
Aegis board centre. The nominal initial scale is approximately 1.03300765;
resting cards, slots and layout retain their own geometry. Hatch also includes
the four landing groups alongside the six colour groups, matching its field
creation route.

An additional 75 consecutive source frames, 2706–2780 (45.1451–46.379667 s),
were inspected as focused field-arrival crops. This raises unique inspected
source coverage to 756 of 40,622 frames. The arriving opponent Tamer first
appears in frame 2724; white/cyan rays and the colour landing develop through
2734, the blue ring/core expands through 2746, and faint blue rays remain
through 2770. Detectable light ends before the mathematical emitter lifetime;
the bounded clock check above records why this does not justify retiming.

Validation passed 285 focused tests across eight files, 30 natural field
particle scenarios at Normal/Fast/reduced motion, two simultaneous-effect
stress fixtures, and 16 natural hatch scenarios. Sixty separately sought hatch
poses checked the reciprocal curve and centre displacement; these are
supplemental geometry checks, not natural recordings. Independent review found
no blockers and checked six more production fixtures plus resize while paused.
Refreshed browser recordings contain 459 indexed card-burst frames, 161 phone
hatch frames and 144 desktop hatch frames. Recorder scheduling determines
their frame counts; they are not deterministic authored-frame timelines.

Field focus measures the complete board and uses the breeding shade, including
the hands, raising areas and bottom controls. Hand fan stacking stays inside
its dock while focus is visible; the enlarged hover face receives the same
shade and releases it when focus ends. Eight natural activation cases and four
retained reduced-motion component probes passed at 320, 768, 1024 and 1440 px,
with eight focused component tests also passing. Coverage probes check every
matching dock, the bottom strip and memory band, rather than only the first
matching area. The source aperture remains aligned and pointer input passes
through the overlay.

Remaining parity work includes native per-row camera/corner deformation,
context-specific particle world-unit normalization, mesh/UV/material rendering,
and the unverified recorded build clock. The full video and all animation
families have not been exhaustively compared; the broader animation goal
remains open.

### Field particle pixel scale, anchors and material support

Further read-only source research, 2026-10-04; no additional video frames were
inspected. For the field/hatch face, a useful nominal conversion is **pixels
per world unit = actual printed-face backing width / 10.1084409631**. Measure
the printed face, not the selection box or expanded effect canvas, and apply
device-pixel backing scale once. At the existing −55% inset, the painter's
`min(canvas.width,canvas.height)/48` gives approximately `.04375×faceWidth`;
the source-derived conversion is `.098927224×faceWidth`, **2.26119× larger**.
Inset or capture-area changes must not change the motion's physical scale.
[Current painter](../apps/web/src/game/particleLightCanvas.ts:107),
[effect bounds](../apps/web/src/game/style/cardCues.css:307), and the printed
face/canvas evidence in the landing calibration above.

Colour and landing emitters are world-parented beneath a unit-scale, unrotated
[EffectParent](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:173852).
The [colour root](/Users/viniciusluiz/dcgo-source/Assets/Effect/ポケモン/水.prefab:28725)
also starts unrotated. Transform their world vectors by the inverse **85°
camera**; using the Board canvas's serialized identity quaternion would be
incorrect, because Screen Space Camera drives that canvas relative to its
camera. The field parent's relative 5° tilt belongs to the face/slot geometry,
not a second rotation of world-space particles.

The active systems declare world simulation and Shape-only scaling.
[Colour example](/Users/viniciusluiz/dcgo-source/Assets/Effect/ポケモン/水.prefab:19275),
[scaling semantics](https://docs.unity3d.com/ScriptReference/ParticleSystemScalingMode.Shape.html).
Their root `(4,1,4)` scales the emitter's birth surface; it does not multiply
particle size or travel velocity. Existing sampling applies child transforms
and that root scale once. The mesh's separate factor 10 is actual plane geometry,
not a second application of root scale. Landing root scale is `(1,1,1)`.

For world displacement transformed into camera space `(a,b,c)`, actual source
slot depth `D`, resting pixel centre `(Cx,Cy)` relative to a chosen principal
point, and calibrated unit `U`, the relative projection is:

```text
r = D / (D+c)
dx = (r−1)*Cx + U*r*a
dy = (r−1)*Cy − U*r*b
```

Include the same centre terms when differentiating projected velocity for
stretched billboards. The current local projection omits those terms and uses
95.5 for every slot. Source depth is `95.5+k*ySlot*sin(5°)`; using Aegis's own
board principal point/slot geometry instead is an explicit layout adaptation.
Mesh corners should use their individual depths rather than only a scaled
axis-aligned rectangle. These formulas preserve Aegis's resting face and layout.
[Current projection](../apps/web/src/game/particleLight.ts:216).

Anchor contracts differ by recipe. [Creation](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/Effects.cs:538)
schedules the fall before copying the moving root's world position to the
colour effect, without an intervening yield; its nominal spawn is at the raised
initial root. [Evolution](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/Effects.cs:726)
copies the stable original target, while [deletion](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/Effects.cs:1776)
copies the resting permanent root. No following callback is present in these
recipes or their five-second cleanup. Native world simulation does not make
already-born particles follow a moving card. A field burst attached inside a
transformed Aegis face should therefore distinguish its spawn anchor from the
card's later landing transform.

Landing copies the root's world X/Z but sets **absolute world Y=.05**; adding
`.05` to a face-relative particle Y is an adaptation, not this native placement.
With the [virtual-camera pose](/Users/viniciusluiz/dcgo-source/Assets/Scenes/BattleScene.unity:42161)
`C=(0,120,−15.1)`, tilt `β=85°`, slot-parent tilt `α=5°`, and unrotated
player canvas offset `o`, the nominal resting root has
`Ycard=120−95.5*sinβ+k*o*cosβ`, independent of row because `α+β=90°`.
That gives **25.4579537052** (viewer) and **25.0317768800** (opponent).
Literal landing uses `ΔY=.05−Ycard`, so its camera-relative anchor is
`(0,ΔY*cosβ,−ΔY*sinβ)`, including a substantial depth change. The moving
creation root initially adds approximately `30*k=3.0631639282` world height.
These are projections of the nominal virtual-camera pose, not verified runtime
camera measurements; the serialized main-camera RectTransform is driven, and
impulses or a different recorded build can alter the world anchor. Keeping a
ground light centred at the Aegis slot may be preferable, but should be described
as a design adaptation rather than literal world-height matching.

The two mesh groups use [built-in Plane 10209](/Users/viniciusluiz/dcgo-source/Assets/Effect/ポケモン/水.prefab:19132),
whose primitive dimensions are [10×10](https://docs.unity3d.com/Manual/PrimitiveObjects.html).
They have different materials: the halo uses Core4's unresolved built-in texture
10300; the flash uses [Ring.mat](/Users/viniciusluiz/dcgo-source/Assets/Effect/52SpecialEffectPack/Texture/Ring.mat:24)
with full UV scale/zero offset and no [UV animation](/Users/viniciusluiz/dcgo-source/Assets/Effect/ポケモン/水.prefab:20494).
Read-only analysis of its [100×100 Ring.png](/Users/viniciusluiz/dcgo-source/Assets/Effect/52SpecialEffectPack/Texture/Ring.png)
found nonzero alpha only inside pixel bounds `(13,12)–(88,86)`; the centre is
transparent. Thus visible support occupies about **75%×74%** of the mesh,
not all of it. The current procedural annulus has a different support and blur.
At the authored terminal multiplier, `.15×50×10=75` world units, the full
plane spans approximately **7.42 field-card widths**, and the texture's nominal
annulus spans about **5.56**, before perspective and fading. Large late geometry
is authored; full-opacity, sharply drawn large rings would not match its fading
material. An effect canvas only 2.1 card widths wide will also clip this calibrated
geometry regardless of CSS overflow. Pixel-support/alpha checks and paint bounds
are therefore necessary alongside unit calibration; retain Aegis hues while
treating unresolved built-in textures/shader blending as unproven material parity.

Central security remains separate: its Game UI plane is 87.76 and world printed
width is `46.86814015×runtimeCardScale`, not the field's 10.10844. Its colour
destruction anchor copies the [central card root](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/Effects.cs:2019).
Use the measured context scale and actual spawn recipe; short draw/reveal flashes
remain a different UI-parented effect. No product or timing changes were made by
this research.

### Native suspension curve and attack ordering

Bounded primary-source research, 2026-10-04; no new video frames inspected.
The live [field prefab Animator](/Users/viniciusluiz/dcgo-source/Assets/Prefab/FieldPermanentCard.prefab:18156)
uses controller GUID `0e06e16162c826f478c4c59811105679`, resolving to
[FieldPermanentCard.controller](/Users/viniciusluiz/dcgo-source/Assets/Animation/Battle/FieldUnitCard/FieldPermanentCard.controller:89),
rather than the similarly named legacy `FieldUnitCard.controller`.
Its `Tap` integer selects `Stand_Rest` for 1 and `Rest_Stand` for −1.
Both states have speed 1, no speed parameter, and connected transitions have
zero blend duration and zero transition offset. The unrelated serialized
250 ms transitions have no incoming state links; they are not evidence for a
250 ms suspension blend.

[Stand_Rest.anim](/Users/viniciusluiz/dcgo-source/Assets/Animation/Battle/FieldUnitCard/Stand_Rest.anim:16)
binds root Euler Z **0→90° over 200 ms**, while
[Rest_Stand.anim](/Users/viniciusluiz/dcgo-source/Assets/Animation/Battle/FieldUnitCard/Rest_Stand.anim:16)
binds **90→0° over 200 ms**. Both use two unweighted keys with zero endpoint
slopes; X/Y remain zero, and neither clip contains position or scale curves.
The curve mathematically reduces to `s(t)=3t²−2t³`, `t=clamp(age/200ms,0,1)`.
An exact CSS timing representation is `cubic-bezier(1/3,0,2/3,1)`; ordinary
`ease-in-out` approximates it. Suspension angles at 50/100/150 ms are
14.0625°/45°/75.9375°. Unity positive Z turns counterclockwise in the nominal
camera projection, so direct CSS `+90deg` uses opposite screen handedness.
Confirm that direction against the selected recorded crop before changing
Aegis's established suspended orientation.

[SetCardSuspended](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/FieldPermanentCard.cs:368)
sets these parameters only when state/settings change. The
[saved rotation preference](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/ContinuousController.cs:937)
loads with default true, although the field's initial C# value is false;
disabled rotation keeps the tap marker and requests `Tap=-1`.
Opponent reversal rotates an inner artwork parent by 180°, separately from
the root suspension clip, so it does not imply a seat-specific turn direction.
[Opponent artwork rotation](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/FieldPermanentCard.cs:318).

Attack sequencing is causal: [AttackProcess](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/AttackProcess.cs:158)
fully awaits `SuspendPermanentsClass.Tap()` before starting the target arrow.
[Tap](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/CardController.cs:5678)
sets the suspended state and requests its visual update, then awaits suspended
trigger stacking and finally a **300 ms** wait. This is a sequencing hold,
not the rotation duration; the ordinary path affords about 100 ms after the
200 ms turn before the arrow, with extra trigger processing able to extend it.
`withoutTap` attacks and already-suspended/no-valid-target paths do not require
that same wait. The arrow then takes two 85 ms extensions with 70 ms after
each and a final 70 ms hold, before on-attack effects are queued.
[Arrow coroutine](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/TargetArrow.cs:117).

Turn unsuspension passes one list into the
[unsuspend coroutine](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/TurnStateMachine.cs:623).
Its [state-update loop](/Users/viniciusluiz/dcgo-source/Assets/Scripts/Script/CardController.cs:5795)
updates all surviving targets without inter-card yields, then stacks triggers
and waits once for 300 ms. Aegis's per-slot 60 ms sweep remains a layout/design
adaptation, not an authored native stagger.

The immediate integration seam is to separate artwork turning from lane
reflow: [CardMini](/Users/viniciusluiz/aegis-digimon-tcg/.claude/worktrees/feat-effects-lab/apps/web/src/design/cards.tsx:500)
uses 200 ms `ease-in-out`, whereas
[OrganizedBattleRow](/Users/viniciusluiz/aegis-digimon-tcg/.claude/worktrees/feat-effects-lab/apps/web/src/game/screen/layout/OrganizedBattleRow.tsx:90)
uses its **420 ms** reflow duration and `cubic-bezier(.2,.8,.2,1)` for remounted
artwork turns. One shared 200 ms smoothstep contract should drive both art
paths while retaining Aegis's existing lane movement. Validate sampled angles,
source-anchor stability, remount continuity and rapid reversal; verify the
arrow cannot begin before the intended suspension hold and preserve reduced
motion. The already accepted **29496–29595** video interval is the bounded
candidate for turn direction/onset; **29550–29595** starts with the attacker
already suspended and cannot measure the turn itself. No timing claim here
establishes the recorded build's global clock.

### Real keyword match coverage: bounded inventory

Static inventory, 2026-10-04; no new engine test or browser scenario was run.
[KEYWORDS](../packages/shared/src/effects/ir/keywords.ts:8) has 46 entries.
[The visual catalog](../apps/web/src/dev/arenaDemoKeywords.ts:13) excludes
`LinkMax` and `DigiXrosSubstitute`, leaving **44**. Its
[scene builder](../apps/web/src/dev/arenaVisualScenarios.ts:269) clones state,
clears decisions, grants keywords and scripts events/outcomes; several scenes
omit consent windows. Forty-four rendered scenes therefore establish neither
44 real server actions nor 44 rules-valid outcomes.

[Development layouts](../apps/api/src/engine/devScenario.ts:35) seed boards and
then hand control to the actual turn loop. The existing Effects Lab selects
only [16 layouts](../apps/web/src/dev/EffectsLab.tsx:42), mainly trigger chains,
and joins a real server. Other registered layouts are available through
LiveArenaDemo. Below, existing-layout names are **candidate starting boards**,
not newly verified browser coverage. Conformance references are implementation
fixtures to port, not evidence that a measured browser run already exists.
`C` means the [conformance directory](../apps/api/src/engine/conformance/README.md),
and chapter abbreviations refer to
[16a](../apps/api/src/engine/conformance/ch16a-security-blocker-draw.test.ts),
[16b](../apps/api/src/engine/conformance/ch16b-digivolve-and-battle-keywords.test.ts),
[16c](../apps/api/src/engine/conformance/ch16c-deletion-and-advanced-keywords.test.ts).
The grouped rows enumerate all 44 visual keys exactly once.

| Keywords                                     | Existing real layout candidates                                                                                                                                                                                                         | Primary engine fixture/action seams                                                                                                                                                                                                                                                           |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blocker, Collision                           | `arena-ex13-giromon-block-triggers`, `arena-suspend-lock-block`; no dedicated Collision board identified                                                                                                                                | C `keyword-blocker-lifecycle`: BT19-064, public play → opposing attack → `declareBlock`; 16c Collision uses printed BT16-032 but points to `combat/keywordBattle.test.ts` for consumption.                                                                                                    |
| Piercing, Retaliation                        | No dedicated minimal board identified                                                                                                                                                                                                   | C `keyword-piercing-lifecycle`: BT1-026 attacks suspended BT1-009, then checks BT1-010; `keyword-retaliation-lifecycle`: BT19-059. Measure impact/removal/security order rather than inventing a keyword-specific flight.                                                                     |
| Rush, Raid, Blitz                            | `arena-bt13-royal-purge-delay-rush`, `arena-st12-blanc-rush-second-attack`; no focused Raid/Blitz board identified                                                                                                                      | 16b printed Rush BT4-038/BT8-077 public play/attack; C `keyword-raid-consent` BT24-011 attack → `respondDecision`; inspect the 16b Blitz case before porting, since its chapter declaration alone is not a full public-intent/browser fixture.                                                |
| Vortex, Overclock, Engage, Execute           | `arena-vortex-target-legality`, `arena-vortexdramon`, `effects-lab-prod-ghost-execute`; no focused Overclock/Engage board identified                                                                                                    | 16c Vortex BT20-101 and Overclock ST19-08; C `keyword-engage-consent` BT26-016 and `keyword-execute-consent` BT20-072 use `endPhase` → `respondDecision`. Existing Vortex board uses EX7-034 and one suspended/one active target.                                                             |
| Alliance                                     | `arena-alliance-20`, `arena-marcus-alliance`                                                                                                                                                                                            | C `keyword-alliance-consent`: AD1-009 + two allies, attack → `respondAlliance`. Existing dense layout has BT23-020 + 19 BT1-010 allies; start with the smaller fixture for timing, retain dense coverage for selection/layout.                                                                |
| Jamming, SecurityAttack, IceClad             | `security-battle`, `security-chain`, `arena-security-effect-pacing`; these are generic security seeds, not proof of all three keywords                                                                                                  | C `keyword-jamming-lifecycle` ST19-07 vs BT1-081; `keyword-security-attack-lifecycle` BT26-012/017 and accumulation companion; `keyword-iceclad-security-boundary` EX7-021. Attack intents should distinguish battle survival, consecutive checks and source-count comparison.                |
| Reboot                                       | `arena-reboot-timing`, `arena-rina-evade-unsuspend`                                                                                                                                                                                     | C `keyword-reboot-lifecycle`; existing layout seeds suspended BT4-070/BT5-069. Measure turn-phase boundary → simultaneous state turn → next trigger.                                                                                                                                          |
| Barrier, Evade                               | `arena-ex3-wingdramon-evade-suspend-lock`, `arena-ex13-wingdramon-evade-suspend-lock`; no focused Barrier board identified                                                                                                              | 16c Barrier BT13-041, attack → `respondBarrier`; Evade BT14-021 with `respondEvade`. Capture accept and decline, cost motion before protected result.                                                                                                                                         |
| Decoy, Scapegoat, Guard, Fragment, Detach    | `arena-decoy-protect-choice`, `arena-sagasol-guard-source`, `arena-seven-code-link-dp`; latter needs an actual Detach departure attempt                                                                                                 | C `keyword-decoy-parameters` EX5-050; `keyword-scapegoat-lifecycle` EX8-057; `keyword-guard-lifecycle` EX12-056/EX13-052; `keyword-fragment-parameters` EX8-051; `keyword-detach-lifecycle` BT26-010 etc. Copy full eligible targets/payment constraints, not just a generic protect outcome. |
| Save, MaterialSave, Armor Purge              | No focused minimal Save/MaterialSave/Armor Purge board identified                                                                                                                                                                       | 16c Save BT10-008; C `keyword-material-save-parameters` BT11-009/BT10-008/029/087; 16b Armor Purge BT10-012. Removal and source destination are the measured choreography; keep optional decision ownership.                                                                                  |
| Fortitude, Partition, Decode                 | No focused minimal board identified                                                                                                                                                                                                     | 16c Fortitude BT20-034, Partition BT16-025 with specified source cards, Decode EX13-065. Port battle/non-battle departure controls and actual replay/placement; a generic respawn scene loses their distinct rules.                                                                           |
| Progress, Succession                         | `arena-bt26-chronomon-dm-succession`; no focused Progress board identified                                                                                                                                                              | 16c Progress BT21-025 plus ST18-07 and `combat/advancedKeywords.test.ts` P-189 opposing deletion; C `keyword-succession-lifecycle` BT26-032 etc. Measure attempted opposing effect vs surviving attacker, or inherited effect activation, rather than a fabricated Progress/Succession cue.   |
| Ascension, BlastDigivolve, BlastDNADigivolve | `counter-blast-dna`; no dedicated minimal Ascension/BlastDigivolve board identified                                                                                                                                                     | C `keyword-ascension-lifecycle` BT25-034; `keyword-blast-digivolve-consent` BT25-082; `keyword-blast-dna-consent` BT20-044. Public play/counter and consent drive cost/source placement/showcase/draw in actual order.                                                                        |
| Delay, UseReq, Training, Digisorption        | `arena-ex5-biting-crush-delay`, `arena-p108-training-delay-with-target`, `arena-p108-training-delay-no-target`, `arena-bt13-royal-purge-delay-rush`; Training Delay option names do not establish the separate printed Training keyword | C `keyword-delay-boundaries` P-036; `keyword-use-req-field` BT25-077; `keyword-training-boundaries` EX9-008; `keyword-digisorption-consent` AD1-011. Use actual activate/play/digivolve intents and pay/decline decisions; cost changes alone cannot prove the keyword.                       |
| Mind Link, Link, DigiBurst, DeDigivolve      | `arena-bt21-dogatchmon-link-attack`, `arena-de-digivolve-visibility`, `arena-p246-motimon-after-de-digivolve`; no minimal Mind Link/DigiBurst board identified                                                                          | C `keyword-mind-link-boundaries` BT14-058 + BT14-086; `keyword-link-parameters` BT26-086/BT21-009/041; `keyword-digi-burst-parameters` BT4-072; `keyword-de-digivolve-parameters` BT19-063. Measure public source attachment/payment/removal and resulting face change.                       |
| Draw, Recovery                               | `effects-lab-opponent-play`, `effects-lab-own-chain`, generic security layouts                                                                                                                                                          | 16a Draw BT1-029 public play; C `keyword-recovery-parameters` BT7-035/BT7-038. Confirm the production card effect generated the draw/recovery action, not only a scripted flight or count.                                                                                                    |

Recommended first server battle cases are **Piercing, Jamming, Blocker,
Alliance, Barrier and Reboot**: their existing fixtures isolate reusable card
motion plus a clear state/result boundary. For every run retain real scenario
ID, production card IDs, accepted intents/decision replies, server event batch
and state versions, action-start/first-paint/last-paint/result-visible timestamps,
and screenshot/video frame references. Report decision reading separately from
animation duration, include normal/fast and reduced motion, and verify accept/
decline or a negative control where semantics change the result. Existing
queue/DOM probes help locate beats; neither static fixture presence nor recipe
start counts establishes frame-observed completion for a keyword.

### Real-server keyword and group checkpoint, 2026-10-04

This follow-up supersedes the proposed turn integration above: both CardMini
and remounted organized-row artwork now use one 200 ms smoothstep contract,
while row reflow retains its existing 420 ms clock. A group merge retains an
inert copy of the departing artwork and moves it to the surviving group's
centre. Its initial pose includes native animation progress so an interrupted
turn or translation does not jump. Individual translation preserves movement
direction when the artwork is rotated. Coordinates use the actual offset
parent without changing the board's existing positioning rules. Reduced motion,
unmount and cancellation release retained copies and native animations.

The earlier 16-layout inventory was a static checkpoint. Four new lab layouts
now bring that selector to 20: Piercing, Jamming, Retaliation and a two-copy
Izzy Izumi group scenario. The shared keyword registry carries scenario IDs,
printed attacker/defender/security cards and expected outcomes. Real engine
tests use public phase/attack intents; the browser uses actual drag gestures,
effect activation and target selection against the server. No keyword grants,
fabricated result batches or observer mutation are used.

Piercing exposed a causal bug: a Security check discarded the staged field
clash, allowing the final combat bookkeeping event to cancel it and request a
second impact. Keeping the staged clash through that check preserves the
original field impact; normal combat resolution still closes the attack.
The focused five-batch regression checks one clash and no duplicate beaten
impact before the real browser run.

The final Playwright report contains **12 passing cases, no skipped/flaky/failed
cases**: the three keywords at Normal and Fast, plus group activation/split/merge
at 1440×1000, 320×844, 768×1000, 1024×1000, 844×390 and reduced motion. All
captures reached the expected printed-card outcome and an idle queue with no
cancelled steps, expired completion gates or truncated observations. The five
moving group cases finished within **0.001 px** of the destination centre;
reduced motion had no return flight. Final desktop, phone and landscape images
were inspected against the existing field layout.

| Action      | Normal observed interval | Fast observed interval |
| ----------- | -----------------------: | ---------------------: |
| Piercing    |                  3092 ms |                4043 ms |
| Jamming     |                  1933 ms |                1936 ms |
| Retaliation |                  4171 ms |                3214 ms |

These intervals run from the first matching **closed-batch presentation hook**
to the end of browser capture. They include presentation and observation
overhead, are not isolated animation durations, and do not establish network
latency, server execution time or a reliable Normal/Fast performance ratio.
Each case has one run: this is reproducible regression evidence, not a
statistical benchmark. Group intervals were 4700–5012 ms with 620–1148 ms of
visible decision time recorded separately. Native frame-gap p95 ranged from
16.7 to 33.3 ms, with individual gaps up to 100 ms. No claim of uninterrupted
frame delivery follows from passing outcome/queue checks.

Reproduction, after building shared/API code:

```sh
pnpm --filter @aegis/web exec playwright test e2e/effects-lab-pacing.spec.ts --grep 'real (keyword|group) pacing' --reporter=json > /tmp/aegis-keyword-group-pacing.json
node tools/diagnostics/summarize-keyword-pacing.mjs /tmp/aegis-keyword-group-pacing.json
```

The summary and full captures are local diagnostic artifacts under
`.local/keyword-pacing`. Event/state versions, browser clock timestamps,
native animation keyframes, decision windows and sampled card poses are
retained in the attachments. Supplemental interrupted-turn probes exercise
production components with sought native clocks; they are not additional
natural server actions. Focused unit validation passed 56 web tests and three
native keyword scenario tests. Production/E2E TypeScript checks and scoped
format/lint checks passed.

Real keyword coverage is still **3/46**. The other 43 scenarios, optional
accept/decline paths, canvas motion and complete reference-frame comparison
remain open. Detected native clip candidates also require causal review:
inspector changes, narration replacement and hover transitions can legitimately
end early, so the diagnostic list is not itself a bug list. Original effect
audio and background music are queued in `apps/web/src/game/ANIMATIONS.md`
after the movement/pacing pass; no new full audio coverage is claimed here.

### Optional keyword decisions and the protected battle impact

Four additional real-server layouts exercise Alliance and Barrier with public
accept/decline responses. Alliance uses printed AD1-009 and two distinct allies;
the chosen Monodramon suspends, the unchosen Agumon stays active, and acceptance
adds a second security check. Barrier uses printed BT13-041 attacking stronger
BT1-025: acceptance trashes the controller's top security and preserves Chirinmon;
refusal removes it without paying that cost. No printed DP or keyword is changed.
The lab selector now has 24 layouts. Its instructions identify the intended
choice and Alliance's native confirmation step.

The first twelve browser cases passed outcomes but exposed a choreography gap:
accepting Barrier produced no claw on the surviving card, while declining showed
the claw after the answer. Primary `IBattle.Battle` executes `BattleEffect` before
`DestroyPermanents.Destroy` (CardController.cs:4758), so the protection question
belongs after the blow. The initial LoserPermanents list already excludes
unconditional battle-deletion immunity (4668–4690); it includes cards whose
optional protection may later save them. Showing a claw on every lower-DP card
would misrepresent that distinction.

The new `battleCompared` receipt reports those authoritative attack-battle
candidates before protection decisions. The presenter starts the existing field
clash from that receipt and retains its staged identity through final deletion
and `combatResolved`, so a protected loser is still struck once. Both candidates
of an equal comparison are retained before either Barrier answer. Only the
actual declared battle emits this receipt: an effect-driven battle involving
the same pair during When Attacking must not consume the attack's occurrence.
Legacy deletion/resolution events remain presentation fallbacks.

The final matrix contains **28 passing cases, zero skipped/flaky/failed**: six
Normal/Fast basic keyword cases; sixteen Alliance/Barrier accept/decline cases
at desktop Normal/Fast, 320px phone and reduced motion; six group formats from
the previous checkpoint. Each moving Barrier case asserts one uncut claw,
last observed claw paint before the prompt, one clash start and no duplicate
at final resolution. Reduced motion asserts no claw and an answerable prompt.
All cases reached idle queues with no cancelled steps, expired completion gates
or truncated observations. Coverage is **5/46 keywords**, with 41 pending.

The capture now records native board-prompt regions as well as dialogs, so
Alliance/Barrier reading time is measured separately. The summary exports
completed queue beat intervals and sampled arrow/impact/security paint intervals
with authored durations alongside them. Queue spans include gates/waits; paint
spans have frame-sampling error. Neither is substituted for server time or an
isolated authored duration. Before the fix, accepted Alliance's chosen ally
reached its 90° resting angle about 231–281 ms before the security reveal in
the three moving consent cases; the unchosen ally remained active. Each case
is still a single regression observation rather than a benchmark distribution.

Validation passed 56 focused API tests, including the native two-Barrier tie,
the same-pair effect-battle control and unconditional-immunity controls, plus
69 focused web tests. API development TypeScript, production/E2E client
TypeScript, the production client build and scoped lint/format checks passed.
The existing protocol compile-time sentinel and UI event coverage include the
new receipt; final outcomes retain their existing narration. Independent review
found no remaining blocker in this delta. No all-keyword, full-video or complete
audio-fidelity claim follows from these results.

### Opponent-turn keywords and uninterrupted group returns

Three new real-server layouts add Blocker acceptance/refusal and Reboot. Blocker
uses printed ST18-07 Kokatorimon against ST1-10 Phoenixmon: acceptance redirects
the existing attack to Kokatorimon, deletes it and preserves all five security;
refusal preserves Kokatorimon and removes one security. The browser drives the
public end-turn/block choices and the server's ordinary opponent turn. Moving
cases require the same arrow identity to reach the blocker by the claw's first
observed frame. Reduced motion verifies the blocked result without requiring a
sub-frame redirect to be painted.

Reboot uses printed BT4-070 Meteormon and BT5-069 BlackWarGreymon plus plain
BT1-009 Monodramon. Three public attacks suspend all three and remove three
opposing Agumon; ending the turn starts the opponent's Unsuspend phase. Only the
two Reboot holders unsuspend at that boundary. The non-holder's observed artwork
stays at 90 degrees. The existing 200 ms smoothstep turn now receives the phase's
0/60 ms slot stagger on either board, so Reboot no longer turns both holders in
the same frame. Fixtures do not override printed DP, add keywords, inject result
receipts or resolve gameplay with private engine verbs.

The expanded native observer records gesture action marks for the turn fixtures,
visible board changes, phase ribbons, arrow target changes and individual turn
delays. DOM observations and native-animation observations now share their
requestAnimationFrame timestamp. Callback completion time is stored separately:
mixing it with a frame timestamp falsely reported a 28–36 ms Blocker impact lead.
The shared-clock control showed redirect and claw in the same sampled frame both
with and without an experimental arrow wait. That wait was removed; no extra
production wait was required.

The native 320px grouping case exposed a production cancellation. A merge created
its returning artwork, then shared field sizing committed again before the first
paint. The layout effect cancelled every return; its previous-card map already
contained the merged group, so no subsequent return could be created. A passive
MutationObserver captured insertion and removal in the same callback, with no
painted return frames. The real component reproduction changed a peer's shared
width from 35 to 37 px and cancelled the newly created return at currentTime 0.

Returns now retain their native animation and deadline while geometry changes.
Updating their keyframes at the current eased progress keeps the painted centre
continuous and points the endpoint at the current group centre. Changed group
membership retires the old copy; if its members regain their own physical visual,
that visual receives the copy's current centre and artwork angle. Reduced motion,
resize, missing destinations and unmount still clean up. Independent browser
review reproduced the width update with eight painted frames, and a mid-return
split handed off within 0.0094 px while preserving a 14.0848 degree artwork angle.
These interrupted-clock component probes supplement the natural server cases;
they are not additional keyword gameplay recordings.

The summary retains all source-report case statuses, including failures before a
canonical capture attachment. A new live DP change may supersede an existing
pulse on the same card. The harness permits that decoration cancellation only
when its replacement starts on the same track at cancellation and completes;
both trace entries remain visible. Attack/impact and other causal tracks keep
strict cancellation checks. Optional decisions must receive an observed paint
before automated native clicks answer them, preventing a test from hiding a
prompt before its first sampled frame.

The final matrix passed **40 cases, zero failed/skipped/flaky**, with forty
canonical captures, no cancelled presentation steps, expired completion gates or
truncated observations. It contains the previous 28 cases plus eight Blocker
accept/decline cases and four Reboot cases at desktop Normal/Fast, 320px phone and
reduced motion. Five moving group cases finished within **0.017 px** of the target
centre; reduced motion created no return flight. Desktop and phone final captures
were inspected against the existing field geometry and compact notice layout.

| Reboot format  | First holder sampled motion | Second holder sampled motion | Observed first-moving-frame separation |
| -------------- | --------------------------: | ---------------------------: | -------------------------------------: |
| Desktop Normal |                      200 ms |                       200 ms |                                  50 ms |
| Desktop Fast   |                      200 ms |                       200 ms |                                  50 ms |
| Phone Normal   |                    183.3 ms |                     199.9 ms |                                  50 ms |

The authored duration stays 200 ms and the second holder's authored delay is
60 ms. Those observed spans and separations are frame samples, not replacements
for the authored settings. Group frame-gap p95 was about 16.8 ms, with individual
gaps up to 66.7 ms. Each case remains one regression run, not a statistical
benchmark or evidence of uninterrupted frame delivery. JSON reports and full
captures live locally under `.local/keyword-pacing/final-40-retarget`; the same
reproduction command above now selects all forty cases.

Validation passed 18 focused API tests for the new fixtures and existing
Blocker/Reboot mechanisms, 37 focused field arrangement/layout/motion tests,
production and E2E TypeScript checks, the production client build, scoped harness
lint/format checks and `git diff --check`. Independent review found no remaining
blocker in the field-return or harness deltas. The pre-existing unused
`supportSlots` declaration remains a production-file lint finding; this change
does not claim an entirely clean repository lint run.

Native browser coverage is now **7/46 keywords**, with 39 pending. A local
preparatory engine probe passed Evade acceptance/refusal using printed Groundramon
BT1-020 attacking Security Death Claw ST6-15, whose deletion targets the still-active
Syakomon BT14-021. It uses public attack/response intents; Evade is not counted as
browser coverage until its lab layout and measured presentation are integrated.
Full reference-frame comparison, canvas families, remaining keyword cases and
original effect/background audio remain open.

### Optional protection and the visible stack handoff

Four additional real-server layouts cover Evade and Armor Purge acceptance and
refusal. Evade uses the printed Groundramon attack into Security Death Claw and
the still-active Syakomon as its only eligible deletion target. Accepting Evade
suspends Syakomon; refusal deletes it. Both paths consume one opposing security
card. No battle claw belongs to this Option-effect deletion.

Armor Purge uses a legal red Monodramon/Flamedramon stack attacking suspended
Phoenixmon. Printed attack effects raise Flamedramon to 8,000 DP before it loses
to Phoenixmon. The single impact finishes before the optional protection choice.
Acceptance trashes Flamedramon and leaves suspended Monodramon with the retained
3,000 attack bonus, at 6,000 DP. Refusal trashes the whole stack. These fixtures
use ordinary public attack/response intents and the printed card implementations.

The original Armor Purge movement receipt lacked card identity, owner and stack
removal metadata, so its native server outcome had no source-removal animation.
Adding that metadata exposed a second defect: the promoted art appeared before
the peel. The engine yielded to continuous recalculation before publishing the
move; an intervening batch already contained Monodramon. The hold lookup also
selected that newer snapshot by permanent ID alone. The movement is now emitted
before that asynchronous boundary, preserving the existing Overflow and trigger
order. Stack removals look up the snapshot containing the departing top instance,
and coalesced strips inherit and advance the preceding hold even when an
intermediate top has no snapshot of its own. The lab's visible-board projection
now includes the same stack holds used by GameScreen.

The browser observer independently records the actual CardMini artwork title,
public board identities/source counts and painted peel frames. It checks that
Flamedramon remains drawn during its peel and Monodramon first appears afterwards.
Peel visibility requires nonzero bounds and visible SVG face/rim opacity; reduced
motion must produce no painted peel. The existing authored source-removal recipe
remains 595 ms: 170 ms lift, an 85 ms lateral return, 170 ms hold and 170 ms fade.
Its queue span also includes cause gates and browser completion observation and
must not be described as the isolated animation duration.

The 320px selection test initially tapped the suspended card's DP badge, then its
source badge. Those badges correctly consume taps to show their explanations.
The harness now hit-tests exposed artwork before its native click; it does not
inject decisions, force covered clicks or change the production badge behavior.
Independent desktop Normal/Fast and phone runs confirmed the completed handoff.
Earlier failed reports remain in local evidence, including failures that ended
before a canonical capture. They are not merged into a passing-only summary.

Native browser coverage is now **9/46 keywords**, with 37 pending. The matrix
definition contains **56 cases**, adding sixteen protection decision cases across
desktop Normal/Fast, 320px phone and reduced motion to the previous forty. The
remaining keywords, full consecutive-frame comparison and original effect/music
audio remain open; this checkpoint does not establish complete visual parity.

The full matrix passed **56 cases, zero failed/skipped/flaky**, with 56 canonical
captures, no cancelled steps, expired gates or truncated evidence. The five
moving group returns ended within **0.00055 px** of their measured destination.
Desktop Normal/Fast Armor Purge peels each had 37 painted frames spanning
633.3 ms; the phone had 36 spanning 583.4 ms. The promoted artwork appeared
66.6–66.7 ms after the last painted peel sample in those runs. These are sampled
observations, not authored durations or statistical timing benchmarks.

Independent review then strengthened the moving Armor Purge checks to require
all four native lift/sway/fade/rim clocks, each authored at 595 ms, without cuts
or insufficient sampling. Fast and phone passed immediately. The first Normal
capture failed that added quality check because of an 83.3 ms frame gap, while
its 37 painted peel frames and all four durations remained recorded. One isolated
Normal recapture passed with the same strict assertions. Both reports remain in
`.local/keyword-pacing/protection-clock-checks`, whose summary retains the failed
measurement; no threshold was relaxed or automatic retry enabled. The full
matrix's earlier capture remains under `.local/keyword-pacing/final-56-protection`.

Validation also passed 82 focused rules/keyword tests, 32 hold/projection tests,
42 notice tests, production and E2E TypeScript checks, the client build, focused
harness lint/format and `git diff --check`. Independent review found no remaining
production blocker and its harness feedback is enforced. Existing unrelated lint
warnings are not represented as a clean repository-wide lint run.

After restarting this worktree's API on port 2571, a separate 320px browser
completed a native attack and Armor Purge acceptance through the private
HTTPS frontend on port 9445 and WSS API on port 9446, with no page errors.
The access report and screenshot are retained locally; this verifies the
private route and actual room connection rather than only an HTTP response.
