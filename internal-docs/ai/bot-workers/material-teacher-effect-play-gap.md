# Effect DigiXros teacher gap: optional free effect play

Base: feature commit `93db25fb50b0900a8ae89d4bdaab205693a13f7a`. Frozen source `1cec011c0` and qualified engine `9a8d2d5f22fd…` stay unchanged. This note proposes a source change for a ROOT decision. It contains no model, remote, or acceptance evidence.

## Finding

The teacher refuses the free effect play that leads to effect DigiXros. Local fixtures reproduce this in both seats.

| Step | Request | Teacher answer |
| --- | --- | --- |
| Digivolve into EX13-064 LordKnightmon | — | — |
| [When Digivolving] "You may play … [Knightmon] text card … without paying the cost" | `selectCards`, `min 0`, `max 1`, `timing WhenDigivolving`, no `purpose`. Candidates: EX10-031 DarkKnightmon, EX10-027 DeadlyAxemon, EX10-026 SkullKnightmon (trash) | `[]` (declines) |

There is no preceding `optional` prompt. The compiler merges the play/use modal into one up-to-1 pick (`modal.ts` `mergedPlayOrUseAction`). `play.ts` then calls `pickLoose`, which uses `min: 0`. Because `min` equals the printed minimum, `decisionApi.ts` `backOutPurpose` does not add `acceptedOptional`.

`createTrainingTeacher` delegates this request to `policy.ts` `pickInstances`. For an own-card `min 0` pick with no `purpose`, `pickInstances` returns `[]`. `materialTeacherDecision` handles only requests that already carry `digiXrosCardId` or `assemblyCardId`. The effect DigiXros material request is never opened, so the corpus gets no positive label for it. This matches ROOT's raw inspection: episode 216 (seat 0), episode 260 (seat 1), and zero effect DigiXros windows in 14 LordKnightmon digivolves.

## Why a teacher-only fix is not viable

1. **No public cue.** The request carries no structured field that says "the picked cards are played". The only alternatives are reading prompt text (`effectText`), which counts as a display label, or reading the engine's resolving action, which is hidden internal state. A third option is to match the source card's compiled IR by `sourceCardId` and `timing`. That is ambiguous when an effect has several selections, and a wrong match would fabricate a positive label. I rejected all three.
2. **No injection seam.** `cli.ts:152` hard-codes `createTrainingTeacher(engine, seat, seed)`. An external decorator passed to `createTrainingPolicy` would need a new CLI entrypoint, which is new source too.

So any correct fix needs new qualified source. ROOT must decide whether to build it.

## Proposed minimal diff

The change has two parts:

- **Engine cue.** Add `purpose: "effectPlay"` to `DecisionRequest.options`. `play.ts` sets `ctx.pickingEffectPlay` only around the effect-play `pickLoose`, and `decisionApi.ts` publishes it through the existing `provenance`. The existing precedence is kept: `cost` wins inside provenance, and `acceptedOptional` overrides both. The web contract already lists `purpose` as `null` (no UI reader), so the web needs no change. The observation encoder does not read `purpose`, so the model input stays the same.
- **Teacher decorator.** `effectPlayTeacherDecision` handles only own, current, `min 0`, `max ≥ 1` requests with `purpose: "effectPlay"`. It scores each Digimon candidate as a zero-cost `playDigimon` with the unchanged `scoreCandidate` and `DEFAULT_BOT_PROFILE`, and picks one only if the score is above 0. Every other request falls through to the existing teacher.

What stays unchanged:

- **Fixed opponent.** `pickInstances` treats the new value like an absent `purpose` and still answers `[]`. A test asserts this.
- **Model action space.** `decisions.ts` raises the floor only for `acceptedOptional`, so the model can still decline.
- **Physical materials.** The existing `materialTeacherDecision` and its solver proof still choose the materials.

Patch: `internal-docs/ai/bot-workers/material-teacher-effect-play-gap.patch` (git-ignored locally), SHA256 `d03395998636dfc6ae9839e369a3b16f7052756ae6788746d06681e34305eb5b`. It applies cleanly to `93db25fb5`.

| File | SHA256 before | SHA256 after |
| --- | --- | --- |
| `packages/shared/src/protocol/events.ts` | `f361d005…deff1` | `2f21ffa5…42f4` |
| `apps/api/src/engine/effects/context/effectContext.ts` | `f5c02ad9…4754` | `72e72882…0290` |
| `apps/api/src/engine/decisions/decisionApi.ts` | `9b202fd2…928e` | `7b89cad4…f750` |
| `apps/api/src/engine/effects/interpreter/actions/play.ts` | `304ab15c…f0da` | `223eaf9f…b1b1` |
| `apps/api/src/bot/training/referencePolicy.ts` | `c47278f1…157e` | `311b7dd4…8570` |
| `apps/api/src/bot/training/cli.ts` | `2140c324…2a96` | unchanged |

```diff
diff --git a/apps/api/src/bot/training/referencePolicy.ts b/apps/api/src/bot/training/referencePolicy.ts
index d9059c0e2..26ec3f4a3 100644
--- a/apps/api/src/bot/training/referencePolicy.ts
+++ b/apps/api/src/bot/training/referencePolicy.ts
@@ -111,6 +111,55 @@ function materialTeacherDecision(engine: GameEngine, seat: Seat, request: Decisi
   }
 }
 
+/** Take the free effect play the evaluation policy values most, instead of declining it. */
+function effectPlayTeacherDecision(
+  engine: GameEngine,
+  seat: Seat,
+  view: BotView | undefined,
+  request: DecisionRequest,
+): Intent | undefined {
+  const options = request.options;
+  if (
+    view === undefined ||
+    request.kind !== "selectCards" ||
+    request.seat !== seat ||
+    engine.state.pendingDecision?.decisionId !== request.decisionId ||
+    options?.purpose !== "effectPlay" ||
+    (options.min ?? 0) !== 0 ||
+    (options.max ?? 0) < 1
+  )
+    return undefined;
+  const cards = selectionCards(trainingObservation(engine.state, seat, request));
+  let best: string | undefined;
+  let bestScore = 0;
+  for (const instanceId of new Set(options.candidateInstanceIds ?? [])) {
+    const cardId = cards.get(instanceId)?.cardId;
+    const definition = cardId === undefined ? undefined : getCardDefinition(cardId);
+    if (definition === undefined || !isDigimonCard(definition)) continue;
+    const score = scoreCandidate(
+      view,
+      {
+        kind: "playDigimon",
+        key: `effectPlay:${instanceId}`,
+        intent: { type: "playCard", instanceId },
+        cost: 0,
+        definition,
+      },
+      DEFAULT_BOT_PROFILE,
+    );
+    if (score > bestScore) {
+      best = instanceId;
+      bestScore = score;
+    }
+  }
+  if (best === undefined) return undefined;
+  return {
+    type: "respondDecision",
+    decisionId: request.decisionId,
+    response: { kind: "selectCards", instanceIds: [best] },
+  };
+}
+
 /** Teach compound declarations without changing the fixed heuristic strength opponent. */
 export function createTrainingTeacher(engine: GameEngine, seat: Seat, seed: number): BotPolicy {
   const rejectedMaterials = new Set<string>();
@@ -128,7 +177,11 @@ export function createTrainingTeacher(engine: GameEngine, seat: Seat, seed: numb
       teacher.onTurnStart();
     },
     answerDecision(view, request, signal) {
-      return materialTeacherDecision(engine, seat, request) ?? teacher.answerDecision(view, request, signal);
+      return (
+        materialTeacherDecision(engine, seat, request) ??
+        effectPlayTeacherDecision(engine, seat, view, request) ??
+        teacher.answerDecision(view, request, signal)
+      );
     },
     noteRejected(intent: Intent) {
       // The fixed opponent's ordinary-play key cannot identify a material route.
diff --git a/apps/api/src/engine/decisions/decisionApi.ts b/apps/api/src/engine/decisions/decisionApi.ts
index 2c102ffdc..85642f10d 100644
--- a/apps/api/src/engine/decisions/decisionApi.ts
+++ b/apps/api/src/engine/decisions/decisionApi.ts
@@ -94,7 +94,11 @@ function buildSeatScopedApi(
     ...(ctx.affectedPermanentIds !== undefined ? { affectedPermanentIds: [...ctx.affectedPermanentIds] } : {}),
     // Raised by `payCost` for as long as a cost payment is on the stack. Without it a
     // cost selection and a target selection reach the deciding seat as the same request.
-    ...((ctx.payingCostDepth ?? 0) > 0 ? { purpose: "cost" as const } : {}),
+    ...((ctx.payingCostDepth ?? 0) > 0
+      ? { purpose: "cost" as const }
+      : ctx.pickingEffectPlay === true
+        ? { purpose: "effectPlay" as const }
+        : {}),
   });
   // Only a pick whose floor was lowered here is the back-out of an accepted "you may"; a pick
   // the action already allowed to be empty keeps its own meaning (DigiXros materials).
diff --git a/apps/api/src/engine/effects/context/effectContext.ts b/apps/api/src/engine/effects/context/effectContext.ts
index d7bddccc9..ab0cdad95 100644
--- a/apps/api/src/engine/effects/context/effectContext.ts
+++ b/apps/api/src/engine/effects/context/effectContext.ts
@@ -96,6 +96,8 @@ export interface EffectContext {
    * `purpose: "acceptedOptional"`.
    */
   pickingAcceptedOptional?: boolean;
+  /** Set while an effect asks which cards it will play or use. Surfaced as `purpose: "effectPlay"`. */
+  pickingEffectPlay?: boolean;
   /** Temporary restrictions installed by a RestrictEffect action in this resolution. */
   effectRestrictions?: Set<string>;
   game: GameAccess;
diff --git a/apps/api/src/engine/effects/interpreter/actions/play.ts b/apps/api/src/engine/effects/interpreter/actions/play.ts
index 6c7164c44..9a6acb1e8 100644
--- a/apps/api/src/engine/effects/interpreter/actions/play.ts
+++ b/apps/api/src/engine/effects/interpreter/actions/play.ts
@@ -740,7 +740,14 @@ export async function runPlayAction(ctx: EffectContext, action: Action, scope: A
               .filter((instanceId, index, all) => all.indexOf(instanceId) === index)
           : undefined;
       const asker = playCostAdjustedTarget.chooser === "opponent" ? requireOpponentAsk(ctx) : ctx.ask;
-      const chosen = await pickLoose(ctx, playCostAdjustedTarget, candidates, undefined, asker, visibleZoneIds);
+      const pickingEffectPlay = ctx.pickingEffectPlay;
+      ctx.pickingEffectPlay = true;
+      let chosen: string[];
+      try {
+        chosen = await pickLoose(ctx, playCostAdjustedTarget, candidates, undefined, asker, visibleZoneIds);
+      } finally {
+        ctx.pickingEffectPlay = pickingEffectPlay;
+      }
       if (playCostAdjustedTarget.chooser === "opponent" && action.optional === true) {
         ctx.lastOpponentDeclined = chosen.length === 0;
       }
diff --git a/packages/shared/src/protocol/events.ts b/packages/shared/src/protocol/events.ts
index c2e3dcab2..5d7ade1c8 100644
--- a/packages/shared/src/protocol/events.ts
+++ b/packages/shared/src/protocol/events.ts
@@ -671,8 +671,11 @@ export interface DecisionRequest {
      *
      * `"acceptedOptional"` marks a pick of an action whose "you may" the controller already
      * accepted. A `min: 0` there only lets the player back out; an empty answer does nothing.
+     *
+     * `"effectPlay"` marks a pick whose chosen cards the resolving effect plays or uses. On a
+     * `min: 0` request an empty answer declines that "you may".
      */
-    purpose?: "cost" | "acceptedOptional";
+    purpose?: "cost" | "acceptedOptional" | "effectPlay";
     /** Effect-driven play awaiting the existing Assembly material picker for this card. */
     assemblyCardId?: string;
     /** Effect-driven play awaiting the existing DigiXros material picker for this card. */
```

## Local verification (synthetic only)

All runs used Node 26.10.0 and one Vitest fork per run. Two runs briefly overlapped once, for about 2 seconds.

- **Baseline, unchanged source.** `effectPlayPrecursor.local.test.ts` (git-ignored, SHA256 `beed2643…2b92`) shows the refusal above in both seats.
- **With the patch, precursor fixture.** The teacher picks DarkKnightmon. `materialTeacherDecision` then labels DeadlyAxemon on the `digiXrosCardId: EX10-031` request. DarkKnightmon enters with DeadlyAxemon under it, in both seats.
- **With the patch, guard test.** `effectPlayTeacher.test.ts` (git-ignored, SHA256 `48fd48aa…f126`) covers both seats. It asserts that the fixed opponent still declines, the label and material route execute, and these variants are delegated unchanged: no purpose, `acceptedOptional`, `min 1`, `max 0`, empty candidates, stale decision, and opponent seat. 4 of 4 pass.
- **With the patch, regressions.** `tsc --noEmit` passes. Focused bot/training, decisions, interpreter actions, EX13-064, and EX10-031 suites: 82 files and 1,830 tests pass. `FAST=1` over `src/engine` and `src/bot`: 542 files and 10,145 tests pass. FAST mode excludes the card and conformance suites.

These tests check the teacher's contract only. They are not primary, model, or mastery proof.

## Residual risks for ROOT

- **Wider label shift.** Every optional `min 0` effect play without `acceptedOptional` will now get a positive teacher label, not just DigiXros routes. Teacher trajectories will differ from the consumed 436-game and 880-game corpora, so a new teacher collection is needed. Do not merge the corpora.
- **Accepted-optional path not covered.** Effect plays that ask an `optional` prompt first still carry `acceptedOptional`. `pickInstances` then plays the cheapest own card, not the most valuable one. The patch does not change this. A follow-up would apply the same scoring when `acceptedOptional` comes from a play pick.
- **Tamers and Options not covered.** The decorator labels only Digimon. Tamer and Option candidates fall back to the existing teacher, which declines them.
- **Other play paths not tagged.** The total-cost budget path in `play.ts`, around line 306, is not tagged. It sees only multi-card budget plays.
