# Simultaneous-play event collapse mechanism

## Scope

This lane covers the public `whenPlayed` semantics used by retained EX3-026,
EX3-030, and EX3-031 evidence, including Q3664. The contract is:

- one effect that plays multiple Digimon produces one `whenPlayed` activation;
- that activation carries the complete simultaneously played set;
- a source filter narrows that set to eligible members before
  `sourceRef: "triggerSubject"` targeting;
- each entrant still receives its own printed On Play window and its own
  `onEnterFieldAnyone` event.

## Red-before-green evidence

Before the engine change, the public Q3664 paths were red:

- EX3-026 focused: 9 passed, Q3664 timed out at 15 seconds.
- EX3-030 focused: 13 passed, with the independent-copy and Q3664 cases
  unable to reach their target-choice window.
- EX3-031 focused: 9 passed, with Q3664 unable to reach its target-choice
  window.

The EX3-026 red remained after replacing its effectful opponent fixtures with
inert Digimon, proving that the stall was not only an On Play fixture issue.

## Defect and correction

`playInstances` invoked the effect-entry seam separately for every entrant.
That seam's normal path includes the `whenPlayed` bus, so a multi-card play
could activate watchers once per entrant and then again through the batch bus.
The final batch bus already carried `subjectPermanentIds`, but it was reached
after the duplicate per-card buses.

The entry seam now accepts an internal `deferWhenPlayed` marker. Multi-card
effect plays defer only `whenPlayed` while preserving each entrant's On Play
and `onEnterFieldAnyone` windows. The existing final batch fire remains the
single `whenPlayed` event and carries the full created-permanent ID list.
Single-card effect plays retain the existing path.

The retained public fixtures also use inert main-deck Digimon where their own
effects were unrelated to Q3664, and supply an inert deck for EX3-025's
mandatory Draw 2. No card module, catalog, ledger, or RUN file was changed.

## Focused proof

The new engine regression uses the public `advance(...).verb.playInstances`
surface with EX3-030's inherited watcher. It simultaneously plays two Four
Great Dragons and one unrelated Digimon, asserts exactly one choice decision,
asserts that the two eligible permanents and only those two are candidates,
then resolves the choice.

Executed serially with `--maxWorkers=1 --no-file-parallelism`:

```text
src/engine/simultaneousPlayEventCollapse.test.ts — 1/1 passed
src/cards/EX3/EX3-026.test.ts — 10/10 passed
src/cards/EX3/EX3-030.test.ts — 15/15 passed
src/cards/EX3/EX3-031.test.ts — 10/10 passed
```

Typecheck/build/install/broad suites were not run under the coordinator's
resource policy. The external typecheck gate was deferred and is not evidence
against this mechanism lane.
