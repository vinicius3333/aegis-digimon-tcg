# ＜Barrier＞ seams: source play and security buses

Two engine seams around ＜Barrier＞, fixed together because both come from the same shape of
mistake: the keyword's own code path settles the deletion by hand instead of going through the
systems every other card reads.

## Seam 1 — `barrier-then-source-play` (KB Q6250)

### The rule

Q6250: Shakkoumon (BT23-032) with Angemon (BT23-027) in its digivolution cards would be deleted
in battle. The controller may activate ＜Barrier＞ to prevent the deletion **and then still** use
Shakkoumon's [All Turns] effect to play a Digimon card — including that Angemon — from its
digivolution cards. Only the reverse order costs something: playing Angemon first removes the
inherited ＜Barrier＞, so the prevention is no longer available.

Both are options on the SAME "would leave play" event. Preventing the leave settles the leave;
it does not cancel the sibling replacement.

### What the engine did

＜Barrier＞ is decided in two places — `CombatController.resolveDigimonBattle` (battle loss) and
`primitives.deletePermanent` (`cause: "byBattle"`). Both removed the permanent from the deletion
list as soon as the prompt was accepted. `consultLeavePrevention` — the system that offers
"instead"-mode replacements such as BT23-032's `wouldLeavePlay` play-a-source-card — runs on the
list that is left, so the sibling replacement was never offered.

### The fix

`consultLeavePrevention` gains an `insteadOnly` option: run the "instead" replacements and offer
no prevention. After the combat Barrier loop accepts, the controller consults with that option
for exactly the permanents Barrier saved. The prevention half is already decided, so only the
sibling half is offered, in the same order the rules give it.

Files:

- `apps/api/src/engine/effects/leavePrevention.ts` — `opts.insteadOnly`.
- `apps/api/src/engine/GameEngine.ts` — `consultLeavePrevention` passes the option through; the
  combat hook forwards its `opts`.
- `apps/api/src/engine/combat/controller.ts` — one consult after the Barrier loop.

Behaviour for every other card is unchanged: with no `wouldLeavePlay` "instead" replacement on
the saved permanent the consult finds nothing and returns an empty set.

Flipped to passing: `BT23-032.test.ts` "Q6250 plays a source card after ＜Barrier＞ prevents the
battle deletion" and `BT23-027.test.ts` "publicly accepts Barrier before playing the Angemon
source from Shakkoumon".

## Seam 2 — `barrier-cost-security-buses` (KB Q5296)

### The rule

Paying ＜Barrier＞ trashes the top card of your OWN security stack. That is a card leaving a
security stack, so "when security stacks are removed from" watchers see it: BT23-035 Dynasmon
gains ＜Security A. +1＞ and performs its Recovery, and the check loop reads the extra attack.

### What the engine did

Both Barrier paths paid through `GameStateAccess.flipTopSecurityToTrash`, a bare zone move.
`primitives.trashFromSecurity` publishes `whenEffectRemovesFromSecurity`, `whenSecurityRemoved`
and `whenCardTrashedFromSecurity`; the Barrier cost published nothing.

### The fix

Both paths now publish `whenSecurityRemoved` and `whenCardTrashedFromSecurity` for the card they
paid. The effect-only bus (`whenEffectRemovesFromSecurity`, `securityRemovedByEffect`) stays
silent on purpose: a keyword cost is not an effect, and a "when an EFFECT removes from your
security" watcher must not read it.

Flipped to passing: `BT23-035.test.ts` "checks an extra security card after Barrier trashes its
own security".

One fixture followed from the fix: `BT23-102.test.ts` "uses Barrier in battle by trashing exactly
one security card" now sees Mastemon's own [All Turns] place-a-Digimon option offered from the
cost and had no automation to answer it. It runs with `autoDeclineOptional` and asserts the same
end state.

## Regression evidence

Every test file mentioning Barrier (79 files, run in four batches with
`--maxWorkers=1 --no-file-parallelism`) passes except reds that reproduce identically with the
whole worktree at `HEAD`:

- `interactionAudit.test.ts` "an open decision blocks every other action" (4 tests)
- `mechanic.test.ts` BT1-085 start-of-turn SetMemory
- `ST22-keywords.test.ts` Defense Plug-In
- `BT23-033.test.ts` reboot / security-trash pair
- `BT23-044.test.ts` start-of-main memory pair
- `BT23-102.test.ts` "uses Partition to replay exact Angewomon and LadyDevimon sources" — the
  102 card lane's own in-flight red; it fails standalone in that file too.
