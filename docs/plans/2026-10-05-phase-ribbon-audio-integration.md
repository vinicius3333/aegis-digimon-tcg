# Phase ribbon and audio integration

Integrated audio added queued receipt fallbacks for `cardsMoved`, including
unsuspend events. In live mode these callbacks intentionally do no work because
painted presentations own gameplay audio. Phase prerequisites nevertheless saw
the pending `sound` track as a visual handoff and added a 16ms polling wait.

The existing opponent hatch and end-of-turn unsuspend tests consequently missed
their next Draw/Active ribbon at the authored boundary. Both exact expectations
passed on the pre-integration visual child `b35b24948` (its relevant source tree
matches parent `4aa48adbe`) and pacing child `32c952a17`; both failed on integrated
parent `9b57175b7`. The selected command ran four existing tests:

```sh
pnpm --filter @aegis/web exec vitest run src/game/useMatchCues.test.ts \
  -t 'holds the opponent|keeps an end-of-turn unsuspend'
```

Phase prerequisites now exclude the `sound` track. Audio callbacks have no painted
completion to await; visible movement, arrivals, source reads and phase ordering
retain their existing waits. Moving audio routing into phase code would mix
ownership, while extending test deadlines would conceal the added handoff delay.
No animation duration, native-clock gate or test expectation changed.

The same four tests pass after correction. The bounded integrated check also
passed 501 tests across fourteen phase, presentation and audio files on Node
26.5.0. Evidence is retained under `.local/final-integration/static/`:
`phase-ribbon-repro.txt`, `phase-ribbon-pre-pacing.txt`,
`phase-ribbon-pacing-child.txt`, `phase-ribbon-corrected.txt` and
`changed-modules.txt`. These are unit-clock results; integrated native captures
are reported separately.
