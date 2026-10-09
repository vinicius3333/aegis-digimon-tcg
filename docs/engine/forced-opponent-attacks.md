# Forced opponent attacks and unaffected attacker selection

## Active BT13 checkpoint, 2026-09-13

Status: implementation under verification; no completed mechanism claim. Base: `b88aeb69f22995641622ab4388086ff771b23dc0`; dedicated branch `audit-BT13-20260913-incomplete`.

## Contract and seam

BT13-077 Craniamon Q2316/Q2317 permit the effect controller to refuse choosing an opposing attacker. Q2320 requires the opponent to attack with a chosen Digimon that can attack even when it is unaffected by Digimon effects: the instruction affects the player. Sources: committed local KB query `node tools/kb/query.mjs card BT13-077` and [official card rulings](https://world.digimoncard.com/rule/?card_no=BT13-077). Suspended/cannot-attack and already-attacking guards remain part of the actual forced-attack primitive (Q2318/Q2319).

`runCombatAction` in `apps/api/src/engine/effects/interpreter/actions/combat.ts` formerly resolved all non-self Attack subjects through ordinary affectability filtering. `resolvePermanentTargets` allows an immune permanent to be selected, then drops that identity unless `preserveUnaffectableSelection` is set. That silently prevents Q2320’s player instruction.

The bounded correction preserves the selected identity when an Attack allows a player target (`attackPlayer: true`) and explicitly targets an opponent-controlled subject (`controller` or `controllerDefault` equals `opponent`). Own/self/unspecified Attack subjects retain ordinary filtering. The same direct author pattern appears in BT18-069; it must be included in focused regression. `forceAttack` still evaluates actual attack legality, refuses nested attacks, asks the attacker’s controller for the legal attack target, and resolves ordinary combat.

## Proof and outstanding gates

BT13-077’s colocated tests drive natural opponent turns, controller-seat optional acceptance/refusal, public-play immunity, and ordinary paid evolution with exact source retention. A seeded Craniamon alone does not install its triggered immunity and is not used as sole proof.

Current collection is green (113 files, 739 tests). A bounded affected-mechanism manifest passes 36 files/781 tests, including combat, decisions, interpreter, primitives, target fate, registration, forced-attack nesting, attacking conformance, breeding placement and BT18-069. Exact commands and collection scoring are owned by [BT13.md](../BT13.md). This is a mechanism checkpoint, not whole-collection completion or delivery.

### Initial differential proof

The revised BT13-077 public suite passed **8/8 tests** with the corrected combat action, 2.05 seconds. A clean base archive overlaid with only that revised BT13-077 module and its test retained the original engine; `TEST_HEAP_MB=1024 pnpm --filter @aegis/api exec vitest run src/cards/BT13/BT13-077.test.ts --maxWorkers=1 --no-file-parallelism -t 'immune to effects'` then failed exactly the Q2320 `attackDeclared` assertion (1 failed, seven tests excluded by filter), 2.78 seconds. The installed-immunity assertion passed before the attack assertion failed. No current worktree bytes were reverted for this experiment.

This is a useful red-to-green signal but not the closing certificate: that first proof seeded memory above the legal range, and is being corrected to a legal payment/end-turn route before final reruns.

### Pristine broad-gate attribution

Rescheduled two-file baseline reproduction returned the same BT14-090 failures with **18 tests passed**, 33.67 seconds. All scratch tracked bytes, including the earlier BT13-077 overlay, had first been restored to base `b88aeb69f22995641622ab4388086ff771b23dc0`. This establishes the two failures predate the audit; the affected forced-attack manifest is separately green as recorded below.

### Legal-memory differential and current gates

The final Q2320 fixture starts at 10 memory and publicly plays Craniamon for its printed 13; payment naturally ends the opponent turn after installing its immunity. Overlaying only the current BT13-077 module/test onto base `b88aeb69f22995641622ab4388086ff771b23dc0` and retaining the original combat action fails exactly `attackDeclared` (one failed, seven skipped), 0.913 seconds, with the same filtered command above. Its installed-immunity assertion succeeds before that failure. The identical case passes with the corrected action in the 113-file/739-test collection gate. This replaces the initial over-range-memory experiment as legal behavioral proof. The scratch archive was removed afterward.

The affected manifest is now green: 36 files/781 tests, 5.81 seconds. API typecheck passes with a bounded 4 GB heap, shared and web typechecks pass separately. The two pre-existing BT14-090 broad-baseline failures remain attributed separately; no complete broad-engine or pushed-delivery claim follows from this checkpoint.
