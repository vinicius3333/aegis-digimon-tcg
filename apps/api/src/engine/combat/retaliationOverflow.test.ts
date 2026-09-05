import { describe, it, expect } from "vitest";
import type { PlayerState } from "@aegis/shared";
import { MemoryGauge } from "../MemoryGauge.js";
import { observe } from "../testkit/observe.js";
import {
  makeInstance as instance,
  makeDigimon as digimon,
  setupEngine as setup,
  settle,
  type EngineSetup,
} from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * A3 behavioral proofs for §16-13 <Retaliation> (Comprehensive Rules):
 *
 *   16-13-1. <Retaliation> is a keyword effect where a battled opponent's Digimon is
 *   deleted when a Digimon WITH THIS EFFECT is deleted in battle.
 *   16-13-2. <Retaliation> is a trigger-type effect that triggers when JUST the Digimon
 *   with this effect is deleted in battle.
 *   16-13-3. The processing from <Retaliation> is mandatory.
 *
 * combat/controller.ts previously read the keyword off the SURVIVING side of each
 * branch instead of the DYING side — an exact inversion of 16-13-1 (the holder's own
 * death is what triggers the effect, not the survivor's keyword sparing it). Real card:
 * BT10-078 (GulusGammamon), which gains <Retaliation> via an Aura while a [Gammamon]
 * digivolution card (BT21-010) is stacked — KB confirms the printed text and carries no
 * contradicting Q&A (`node tools/kb/query.mjs card BT10-078`).
 *
 * KB findings baked into this suite (see report):
 *   - Both-die exclusion: 16-13-2's "just"/manual glossary's "only this Digimon is
 *     deleted in battle" excludes the equal-DP tie (§14-2-1-3, both combatants die) —
 *     Retaliation does not fire in that case. The engine now scopes the keyword check to
 *     the PRE-retaliation battle outcome so a tie never invokes the trigger. NOTE: in
 *     this two-permanent battle model the exclusion is not independently observable
 *     (Retaliation only ever adds "the other permanent in THIS battle," which a tie has
 *     already deleted), so the tie test below is a rules-fidelity/regression proof, not a
 *     RED/GREEN behavioral discriminator.
 *   - No chaining: KB Q&A (BT13-079/BT14-028/EX4-004/EX4-056/LM-003 Q2322/Q2397/Q3439/
 *     Q3498/Q3992) is unanimous that a Digimon deleted BY <Retaliation> is "deletion by an
 *     effect," not "deletion in battle" — so even if the retaliation-killed permanent also
 *     carries <Retaliation>, its own copy does not re-trigger. The fix's two fixed branches
 *     (attacker-side, defender-side) never re-examine the newly-added id, so this is
 *     structurally non-chaining by construction.
 */

const NON_KEYWORD_CARD = "AD1-001";
const RETALIATOR_CARD = "BT10-078"; // GulusGammamon: gains <Retaliation> via Aura while [Gammamon] is stacked
const GAMMAMON_CARD = "BT21-010"; // satisfies the Aura's "while a [Gammamon] digivolution card is stacked" gate
const ACE = "BT14-014"; // isAce: true, overflowMemory: 3 (see overflow.test.ts)
const ACE_OVERFLOW = 3;

function memoryFor(s: EngineSetup, seat: 0 | 1): number {
  return new MemoryGauge(s.state).memoryFor(seat);
}

/** Lay `perm` as a live BT10-078 <Retaliation> holder (real Aura grant, not a synthetic keyword). */
function makeRetaliator(seat: 0 | 1, dp: number): ReturnType<typeof digimon> {
  const perm = digimon(seat, dp, RETALIATOR_CARD);
  perm.stack.push(instance(GAMMAMON_CARD, seat, true));
  return perm;
}

describe("<Retaliation> (Comprehensive Rules §16-13)", () => {
  it("deletes by effect, allowing outside-battle inherited reactions without chaining Retaliation", async () => {
    const s = setup(
      {
        0: { battleArea: [{ card: "BT2-074", as: "attacker", dp: 9000, under: ["EX4-004", "BT13-079"] }] },
        1: {
          battleArea: [{ card: "BT10-078", as: "defender", dp: 4000, suspended: true, under: ["BT21-010"] }],
          hand: ["BT1-001"],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true, autoOrderTriggers: true },
    );
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
    expect(s.state.players[1]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(1);
    expect(
      s.events.filter((event) => event.kind === "effectTriggered" && event.effectKey === "keyword/retaliation"),
    ).toHaveLength(1);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it.each([false, true])(
    "orders Retaliation with the holder's On Deletion effect (retaliation first=%s)",
    async (retaliationFirst) => {
      const s = setup(
        {
          0: { battleArea: [{ card: "BT1-024", as: "attacker" }] },
          1: { battleArea: [{ card: "BT10-078", as: "defender", suspended: true, under: ["BT21-010"] }] },
        },
        { autoDeclineOptional: true, autoOrderTriggers: false },
      );
      await s.ready();
      expect(
        s.engine.applyIntent(0, {
          type: "attack",
          attackerPermanentId: s.perm("attacker").permanentId,
          target: { kind: "permanent", permanentId: s.perm("defender").permanentId },
        }),
      ).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision?.kind === "orderTriggers");
      const decision = s.state.pendingDecision!;
      expect(decision.kind).toBe("orderTriggers");
      const payload = JSON.parse(decision.payloadJson) as { triggerKeys: string[] };
      expect(payload.triggerKeys).toHaveLength(2);
      const retaliationKey = payload.triggerKeys.find((key) => key.includes("keyword/retaliation"))!;
      expect(retaliationKey).toBeDefined();
      const otherKey = payload.triggerKeys.find((key) => key !== retaliationKey)!;
      const order = [retaliationFirst ? retaliationKey : otherKey];
      expect(
        s.engine.applyIntent(1, {
          type: "respondDecision",
          decisionId: decision.decisionId,
          response: { kind: "orderTriggers", order },
        }),
      ).toEqual({ ok: true });
      await settle(() => !observe(s.engine).isAttacking());
      const resolved = s.events.filter(
        (event) => event.kind === "effectTriggered" && event.sourceCardId === "BT10-078",
      );
      expect(resolved).toHaveLength(2);
      expect(resolved[retaliationFirst ? 0 : 1]).toMatchObject({ effectKey: "keyword/retaliation" });
      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.pendingDecision).toBeUndefined();
    },
  );
  it("the HOLDER dying in battle triggers Retaliation, deleting the battled opponent too", async () => {
    const s = setup({ autoOrderTriggers: true, autoDeclineOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 9000, NON_KEYWORD_CARD); // no Retaliation
    p0.battleArea.push(attacker);
    const retaliator = makeRetaliator(1, 4000); // HAS <Retaliation>, will lose the DP fight
    retaliator.isSuspended = true;
    p1.battleArea.push(retaliator);
    await s.engine.recomputeContinuousEffects(); // pick up the Aura-granted <Retaliation>

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: retaliator.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 300);

    // The retaliator (4000 DP) lost to the attacker (9000 DP) as usual...
    expect(p1.battleArea.some((p) => p.permanentId === retaliator.permanentId)).toBe(false);
    // ...and per §16-13-1, its own death (it is the HOLDER) also deletes the winning attacker.
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
  });

  it("the SURVIVOR holding Retaliation does NOT trigger it — the exact inversion being fixed", async () => {
    const s = setup({ autoOrderTriggers: true, autoDeclineOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // The attacker HAS <Retaliation> but WINS the battle (survives) — under the old,
    // inverted check (`deletedIds.has(defender) && hasKeyword(ATTACKER, 'Retaliation')`)
    // this alone was enough to wrongly delete the attacker too. A test that only checks
    // the positive case (above) would pass under both the old and new implementations;
    // this one only passes under the fix.
    const attacker = makeRetaliator(0, 9000); // HAS <Retaliation>, will WIN
    p0.battleArea.push(attacker);
    const defender = digimon(1, 4000, NON_KEYWORD_CARD); // no Retaliation, will lose alone
    defender.isSuspended = true;
    p1.battleArea.push(defender);
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 300);

    // The defender (no Retaliation) died as usual...
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false);
    // ...but the attacker SURVIVED the battle, so its own <Retaliation> never triggers —
    // Retaliation is the DYING holder's effect, not a "my opponent died and I happen to
    // have this keyword" effect.
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(true);
  });

  it("both-die tie: Retaliation does not additionally trigger when BOTH combatants die (§16-13-2 'just'/'only')", async () => {
    const s = setup({ autoOrderTriggers: true, autoDeclineOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    const attacker = digimon(0, 4000, NON_KEYWORD_CARD);
    p0.battleArea.push(attacker);
    const retaliator = makeRetaliator(1, 4000); // equal DP -> tie -> BOTH die from the battle itself
    retaliator.isSuspended = true;
    p1.battleArea.push(retaliator);
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: retaliator.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 300);

    // Exactly the two real battle participants are gone — the equal-DP tie already deletes
    // both, and Retaliation's own trigger (scoped to "just this Digimon died") does not fire
    // on top of it (there is no third party for it to reach in this model regardless).
    expect(p1.battleArea.some((p) => p.permanentId === retaliator.permanentId)).toBe(false);
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
  });

  it("ACE/Overflow interaction: a Retaliation kill on an ACE charges the ACE's own controller", async () => {
    const s = setup({ autoOrderTriggers: true, autoDeclineOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;

    // Attacker is an ACE Digimon that WINS the DP fight outright (no Retaliation of its own)...
    const attacker = digimon(0, 9000, ACE);
    p0.battleArea.push(attacker);
    // ...but the defender HAS <Retaliation> and dies alone, taking the ACE attacker with it.
    const retaliator = makeRetaliator(1, 4000);
    retaliator.isSuspended = true;
    p1.battleArea.push(retaliator);
    await s.engine.recomputeContinuousEffects();

    const before = memoryFor(s, 0);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: retaliator.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 300);

    // The ACE attacker is deleted by Retaliation, despite having won the DP comparison.
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
    // <Overflow> (§4-18) charges the ACE's OWN controller (seat 0) the printed amount —
    // the same deletePermanent chokepoint combat already routes every loser through, now
    // also reached by a Retaliation-added id.
    expect(memoryFor(s, 0)).toBe(before - ACE_OVERFLOW);
  });
});
