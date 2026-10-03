# Live motion harness

Open `/dev/effects-lab`, expand **Live motion harness**, select **Record live motion**,
and play a scenario. The recorder stays active when the inspector is collapsed. Stop it
and download the JSON report to inspect animation identities, movement, frame gaps and
visible toast/deletion lifetimes. Restarting a match resets the report. The development
bridge `window.__aegisLiveMotion` exposes `start()`, `stop()`, `reset()` and `read()`.

The recorder is opt-in and never runs in a production match. It observes the existing
DOM and browser animations; it does not fabricate engine events or change playback.

## Evidence and interpretation

Primary sources checked on 2026-10-03:

- [MDN: Document.getAnimations](https://developer.mozilla.org/en-US/docs/Web/API/Document/getAnimations)
  documents discovery of CSS animations, CSS transitions and Web Animations.
- [MDN: requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
  documents sampling before repaint, timestamps and background-tab suspension.
- [Atlassian: applying motion](https://atlassian.design/foundations/motion/applying-motion)
  gives 100 ms for quick exits and 200 ms for medium exit transitions. These are interface
  guidelines, not measurements of a Digimon game or requirements for card destruction.

The chosen 260 ms shard flight and 350 ms full deletion are Aegis tuning decisions.
They match the existing security-clash shard flight, preserve the 90 ms stagger, and
replace the previous 800 ms field burst. Landing/evolution bursts keep their own timing.
Paced deletion gates already include their cause's reading beat, so they do not add
another 800 ms announcement. The legacy presentation path retains its reading beat.

“Motion observed” requires a visible change between sampled frames, including transform,
individual translate/rotate/scale, opacity, filter, clip, shadow, stroke offset and bounds.
Advancing timeline frames are recorded separately: a running clock alone does not prove
visible movement. Paused and hidden animations therefore differ from visibly moving ones.
Ancestor visibility and viewport bounds are checked; infinite decorative motion is
recorded in JSON but excluded from the inspector's finite-animation table.

Frame gaps over 50 ms mark affected animations as undersampled. A p95 over 50 ms makes
the capture unusable for the automatic verdict. This is a local measurement policy,
not a sourced universal threshold. Hidden-tab time is excluded from frame gaps. Removal
before a finite animation's end is flagged only with sufficient frames and a two-frame
tolerance. This catches delayed shards/rings being unmounted early without treating
background throttling as an animation failure.

At most 600 animation records, moments and frame intervals are retained per list. The
report flags dropped samples. A moment's duration is its first-to-last sampled visible
frame, so endpoints have approximately one frame of uncertainty. CSS clipping, occlusion,
canvas rendering and arbitrary JavaScript-driven motion are not fully characterized by
this DOM/WAAPI probe; it is not a compositor profiler or proof of full-frame GPU smoothness.

## Reproducible Orca check

Run a web/API development server for this checkout, then:

```sh
node tools/check-live-motion.mjs http://localhost:5174 /tmp/aegis-live-motion.json
```

The script uses only the Orca CLI browser surface. It drives the visual Plutomon scenario
with the actual shared field deletion components. Calibration verifies live, paused and
hidden animations; the verdict requires both deleted Digimon's twelve shards to move and
finish, complete energy rings, and each deletion to stay within 400 ms. It writes the
report even when assertions fail. Keep the checkout's browser tab visible in Orca; a
throttled capture fails explicitly instead of reporting an invented performance result.

The Plutomon fixture supplies scripted events; rules-driven chains are exercised on
`/dev/effects-lab`. Toast expiry during a pending question is covered by the real
`useMatchCues` and sequential-chain regression suites, independently of visual decoration.
The pacing matrix checks readability, cause-before-result order and gate completion.
