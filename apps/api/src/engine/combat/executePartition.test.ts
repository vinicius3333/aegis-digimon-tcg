import { describe, it, expect } from "vitest";
import { EffectTiming, type GameState, type PlayerState, type Seat } from "@aegis/shared";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
} from "../testkit/harness.js";
import { MemoryGauge } from "../MemoryGauge.js";
import "../../cards/index.js";

/**
 * A3 behavioral proofs for Lane R11's last two label-only keywords (Comprehensive Rules §16):
 * ＜Execute＞ (§16-38) and ＜Partition＞ (§16-29). Both real printers compile the keyword to a
 * bare marker with no actions — the behavior is synthesized/consumed generically from the
 * printed keyword (interpreter.ts's `executeActivatedEffect` / primitives.ts's `deletePermanent`
 * Partition hook), mirroring how the other nine label-only keywords in this file's sibling
 * (advancedKeywords.test.ts) were landed.
 *
 * Each `describe` pairs the real behavior with a NEGATIVE CONTROL proving the effect does NOT
 * happen without the keyword.
 */

const NON_KEYWORD_CARD = "AD1-001"; // no keywords in its printed text, Red Lv.4
const BLUE_LV4 = "AD1-010"; // Garurumon — Blue Lv.4, no keywords
const GREEN_LV4 = "BT1-069"; // Ogremon — Green Lv.4, no keywords
const ACE = "BT14-014"; // isAce: true, overflowMemory: 3 (see overflow.test.ts)
const ACE_OVERFLOW = 3;

function fireEndOfTurn(s: ReturnType<typeof setup>): Promise<void> {
  return (s.engine as unknown as { fireTiming(timing: EffectTiming): Promise<void> }).fireTiming(
    EffectTiming.OnEndTurn,
  );
}

/**
 * Drive `s.engine`'s "which permanent should the forced attack target?" `selectCards`
 * decision (`forceAttack`'s candidate list is `["player", ...eligible permanentIds]`) toward
 * `preferredPermanentId` whenever it is offered, answering every other decision (kind
 * "optional") via `autoAcceptOptional`. `harnessAction` is the async action to run
 * concurrently (e.g. `fireEndOfTurn`) while decisions are drained as they arrive.
 */
async function driveAttackTarget(
  s: ReturnType<typeof setup>,
  preferredPermanentId: string,
  harnessAction: () => Promise<void>,
): Promise<void> {
  let processed = 0;
  let done = false;
  const action = harnessAction().then(() => {
    done = true;
  });
  while (!done) {
    while (processed < s.decisions.length) {
      const { seat, req } = s.decisions[processed]!;
      processed++;
      if (req.kind === "selectCards") {
        const candidates = req.options?.candidateInstanceIds ?? [];
        const pick = candidates.includes(preferredPermanentId) ? preferredPermanentId : candidates[0];
        s.engine.applyIntent(seat, {
          type: "respondDecision",
          decisionId: req.decisionId,
          response: { kind: "selectCards", instanceIds: pick !== undefined ? [pick] : [] },
        });
      }
    }
    await Promise.resolve();
  }
  await action;
}

/** Read the given seat's own-perspective memory (positive favours that seat). */
function memoryFor(state: GameState, seat: Seat): number {
  return new MemoryGauge(state).memoryFor(seat);
}

describe("§16-38 <Execute> — may attack (including unsuspended Digimon) at end of turn, then self-delete", () => {
  it("a printed-<Execute> Digimon attacks an opponent's UNSUSPENDED Digimon at end of turn and deletes itself afterward", async () => {
    const s = setup({ autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const executor = digimon(0, 7000, "BT20-072"); // printed <Execute>
    p0.battleArea.push(executor);
    // UNSUSPENDED, lower DP than the attacker — legal only via <Execute>'s own "also allows
    // attacking an opponent's unsuspended Digimon" relaxation (a normal attack may only
    // target a SUSPENDED opponent Digimon).
    const defender = digimon(1, 1000, NON_KEYWORD_CARD);
    p1.battleArea.push(defender);
    await s.engine.recomputeContinuousEffects();

    // forceAttack's target-choice decision offers ["player", defender.permanentId, ...]; steer
    // it onto the defender so the test actually proves the unsuspended-target relaxation
    // (auto-picking "first candidate" would silently attack the player instead).
    await driveAttackTarget(s, defender.permanentId, () => fireEndOfTurn(s));
    await settle(() => p0.battleArea.some((p) => p.permanentId === executor.permanentId) === false, 300);

    // The defender lost the battle (7000 > 1000) and was deleted — proof the attack actually
    // reached an UNSUSPENDED target, which is illegal without <Execute>'s relaxation.
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    // <Execute>'s own trailing "at the end of the attack, this Digimon is deleted" (§16-38-1),
    // regardless of the attacker having WON the battle (a normal attack never self-deletes a
    // winning attacker) — the only explanation is the synthesized self-delete.
    expect(p0.battleArea.some((p) => p.permanentId === executor.permanentId)).toBe(false);
    expect(p0.trash.some((c) => c.cardId === "BT20-072")).toBe(true);
  });

  it("NEGATIVE CONTROL: a non-<Execute> Digimon does not attack or self-delete at end of turn", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const holder = digimon(0, 7000, NON_KEYWORD_CARD); // no <Execute>
    p0.battleArea.push(holder);
    const defender = digimon(1, 1000, NON_KEYWORD_CARD);
    p1.battleArea.push(defender);
    await s.engine.recomputeContinuousEffects();

    await fireEndOfTurn(s);
    await settle(() => false, 60);

    expect(p0.battleArea.some((p) => p.permanentId === holder.permanentId)).toBe(true);
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(true);
  });
});

describe("§16-29 <Partition> — replay the specified digivolution cards for free on a qualifying deletion", () => {
  it("an opponent-effect deletion of a <Partition> Digimon replays its 1-of-each specified digivolution cards for free", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    // Printed <Partition (blue Lv.4 & green Lv.4)>.
    const partitioned = digimon(0, 8000, "BT16-025");
    partitioned.stack.push(instance(BLUE_LV4, 0, true), instance(GREEN_LV4, 0, true));
    p0.battleArea.push(partitioned);
    await s.engine.recomputeContinuousEffects();

    const primitives = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }
    ).primitives;
    // Simulate an OPPONENT's effect deleting the Partition holder — resolving under seat 1
    // (§16-29-1 fires for anything other than the holder's OWN controller's effect, or a
    // battle; combat deletions never reach this primitive at all).
    s.state.turnSeat = 1;
    const deletedCount = await primitives.deletePermanent([partitioned.permanentId], "byEffect");
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === BLUE_LV4), 300);

    expect(deletedCount).toBe(1);
    expect(p0.battleArea.some((p) => p.permanentId === partitioned.permanentId)).toBe(false);
    // Both specified cards were replayed as their OWN fresh permanents, without paying cost.
    const bluePermanent = p0.battleArea.find((p) => p.topCard?.cardId === BLUE_LV4);
    const greenPermanent = p0.battleArea.find((p) => p.topCard?.cardId === GREEN_LV4);
    expect(bluePermanent).toBeDefined();
    expect(greenPermanent).toBeDefined();
    expect(bluePermanent?.stack.length).toBe(0);
    expect(greenPermanent?.stack.length).toBe(0);
  });

  it("NEGATIVE CONTROL: the holder's OWN controller's effect deletion does not trigger Partition", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const partitioned = digimon(0, 8000, "BT16-025"); // printed <Partition (blue Lv.4 & green Lv.4)>
    partitioned.stack.push(instance(BLUE_LV4, 0, true), instance(GREEN_LV4, 0, true));
    p0.battleArea.push(partitioned);
    await s.engine.recomputeContinuousEffects();

    const primitives = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }
    ).primitives;
    // seat 0's OWN effect deletes its own <Partition> Digimon — §16-29-1's "other than by
    // one of your effects" exclusion means the specified cards stay trashed.
    s.state.turnSeat = 0;
    const deletedCount = await primitives.deletePermanent([partitioned.permanentId], "byEffect");
    await settle(() => false, 60);

    expect(deletedCount).toBe(1);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === BLUE_LV4)).toBe(false);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === GREEN_LV4)).toBe(false);
    expect(p0.trash.some((c) => c.cardId === BLUE_LV4)).toBe(true);
    expect(p0.trash.some((c) => c.cardId === GREEN_LV4)).toBe(true);
  });

  it("NEGATIVE CONTROL: a non-<Partition> Digimon's opponent-effect deletion never replays digivolution cards", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const holder = digimon(0, 8000, NON_KEYWORD_CARD); // no <Partition>
    holder.stack.push(instance(BLUE_LV4, 0, true), instance(GREEN_LV4, 0, true));
    p0.battleArea.push(holder);
    await s.engine.recomputeContinuousEffects();

    const primitives = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }
    ).primitives;
    s.state.turnSeat = 1;
    const deletedCount = await primitives.deletePermanent([holder.permanentId], "byEffect");
    await settle(() => false, 60);

    expect(deletedCount).toBe(1);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === BLUE_LV4)).toBe(false);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === GREEN_LV4)).toBe(false);
  });

  it("<Overflow> charges independently of the <Partition> decision — Partition does not prevent or replace the deletion it reacts to", async () => {
    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const partitioned = digimon(0, 8000, "BT16-025"); // printed <Partition (blue Lv.4 & green Lv.4)>
    partitioned.stack.push(instance(BLUE_LV4, 0, true), instance(GREEN_LV4, 0, true));
    const ace = digimon(0, 4000, ACE); // isAce, unrelated to Partition — deleted in the SAME batch
    p0.battleArea.push(partitioned, ace);
    await s.engine.recomputeContinuousEffects();

    const primitives = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }
    ).primitives;
    s.state.turnSeat = 1; // an opponent's effect deletes both simultaneously
    const memoryBefore = memoryFor(s.state, 0);
    const deletedCount = await primitives.deletePermanent(
      [partitioned.permanentId, ace.permanentId],
      "byEffect",
    );
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === BLUE_LV4), 300);

    // Both permanents actually left the field — Partition never PREVENTS the deletion it
    // reacts to (§16-29-1: "would be removed... you may PLAY 1 of each... [from the
    // digivolution cards]", not "prevent the removal").
    expect(deletedCount).toBe(2);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === BLUE_LV4)).toBe(true);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === GREEN_LV4)).toBe(true);
    // The ACE's Overflow charge — resolved once, up front, for the whole simultaneous batch
    // (CR §4-18-5) — is unaffected by Partition's own reaction on a DIFFERENT permanent in
    // that same batch: the same printed amount is charged as a solo ACE deletion would be.
    expect(memoryFor(s.state, 0)).toBe(memoryBefore - ACE_OVERFLOW);
  });
});
