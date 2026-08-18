import { describe, it, expect } from "vitest";
import { EffectDuration, EffectTiming, Zone, getCardDefinition, type CardInstance } from "@aegis/shared";
import { ContinuousEffectLedger } from "../../engine/effects/continuous.js";
import { effectsOf } from "../../engine/effects/collect.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { validateDigivolve, type DigivolveIntent } from "../../engine/actions/digivolve.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import "../index.js"; // register compiled cards so the real OnPlay/activate/OnEndTurn paths run

/**
 * A3 for EX10-035 — restricted-digivolve-target (digivolveExceptInto) + delayed-delete-played
 * GATED TO THE REDUCED-COST [Hand][Main] PLAY (KB Q5737).
 *
 *   [All Turns]   This Digimon can only digivolve into [Apocalymon].
 *   [Hand][Main]  If you don't have any Digimon other than Digimon with [Dark Masters] in their
 *                 texts, you may play this card with the play cost reduced by 5. At turn end,
 *                 delete the Digimon this effect played.
 *
 * Three fails-when-reverted halves:
 *   1. restricted-digivolve: with a `digivolveExceptInto [Apocalymon]` constraint on EX10-035,
 *      validateDigivolve rejects a digivolve into a non-[Apocalymon] (Quartzmon) and allows a
 *      digivolve into [Apocalymon] (BT15-102).
 *   2. delayed-delete GATED to the reduced-cost play: activating the [Hand][Main] effect on a
 *      hand EX10-035 plays it for 6 (printed 11 − 5) AND arms the turn-end self-delete; firing
 *      OnEndTurn deletes it. The KEY HONESTY LEVER is the negative: a NORMAL [On Play] of
 *      EX10-035 (not via the reduced-cost effect) does NOT arm the delete — it survives turn end.
 *      Reverting the gate (moving DelayedDeletePlayed back under OnPlay) makes the normal play
 *      delete it => the negative assertion goes RED.
 *   3. exclude filter: the [Hand][Main] effect's activation condition holds ONLY when you control
 *      no Digimon other than [Dark Masters]-text Digimon — controlling a plain Digimon blocks it.
 *
 * Card ids (cards.json): EX10-035 (Black Lv.6, playCost 11); BT15-102 [Apocalymon] (Black Lv.6
 * EvoCost 6); BT12-057 Quartzmon (non-Apocalymon, legal absent the constraint); BT15-027 a
 * [Dark Masters]-text Digimon (allowed to control); AD1-001 a plain Digimon (blocks activation).
 */

// --- Half 1: restricted-digivolve via validateDigivolve + the live ledger consult -------------

describe("EX10-035 — restricted-digivolve-target (can only digivolve into [Apocalymon])", () => {
  function digivolveSetup(): {
    s: EngineSetup;
    ledger: ContinuousEffectLedger;
    deps: Parameters<typeof validateDigivolve>[3];
  } {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX10-035", as: "base" }] } });

    const ledger = new ContinuousEffectLedger();
    // The [All Turns] clause records this constraint (here installed directly; the card wiring is
    // exercised by the production engine path in the boot/recompute suite).
    ledger.addDigivolveIntoConstraint(
      s.perm("base").permanentId,
      (def) => /apocalymon/i.test(def.nameEn ?? ""),
      EffectDuration.Permanent,
    );

    const deps: Parameters<typeof validateDigivolve>[3] = {
      maxAffordable: () => 99,
      digivolveIntoAllowed: (_s, permanent, evolving) =>
        ledger.digivolveIntoAllowed(permanent.permanentId, getCardDefinition(evolving.cardId)!),
    };
    return { s, ledger, deps };
  }

  it("rejects a digivolve into a non-[Apocalymon] and allows one into [Apocalymon]", () => {
    const into = digivolveSetup();

    // Into a non-[Apocalymon] (Quartzmon, BT12-057): legal EvoCost (Black Lv.6) but rejected by
    // the digivolveExceptInto constraint.
    const quartz = into.s.give(0, Zone.Hand, "BT12-057");
    const badIntent: DigivolveIntent = {
      type: "digivolve",
      instanceId: quartz.instanceId,
      permanentId: into.s.perm("base").permanentId,
    };
    expect(validateDigivolve(into.s.state, 0, badIntent, into.deps)).toEqual({
      ok: false,
      reason: "invalid-evolution",
    });
    // REVERT-CONFIRM-RED: drop the `digivolveIntoAllowed` consult in validateDigivolve (step 4b) =>
    // the Quartzmon digivolve becomes { ok: true } => RED.

    // Into [Apocalymon] (BT15-102): allowed (the constraint accepts it).
    const apo = into.s.give(0, Zone.Hand, "BT15-102");
    const goodIntent: DigivolveIntent = {
      type: "digivolve",
      instanceId: apo.instanceId,
      permanentId: into.s.perm("base").permanentId,
    };
    const ok = validateDigivolve(into.s.state, 0, goodIntent, into.deps);
    expect(ok.ok).toBe(true);
  });
});

// --- Half 2: delayed-delete-played GATED to the reduced-cost [Hand][Main] activated play -------

/** The OnDeclaration effectKey for EX10-035's [Hand][Main] reduced-cost play (the activate key). */
function reducedCostPlayEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = (
    s.engine as unknown as { cardSourceOf(i: CardInstance): CardSource }
  ).cardSourceOf(instance);
  const effects = effectsOf(EffectTiming.OnDeclaration, source);
  const found = effects.find((e) => e.effectKey.startsWith("EX10-035/"));
  if (found === undefined) throw new Error("EX10-035 surfaces no [Hand][Main] activated effect");
  return found.effectKey;
}

async function fireOnPlayForInstance(s: EngineSetup, instanceId: string): Promise<void> {
  await (
    s.engine as unknown as { fireTimingForInstance(t: EffectTiming, id: string): Promise<void> }
  ).fireTimingForInstance(EffectTiming.OnPlay, instanceId);
}

async function fireEndTurn(s: EngineSetup): Promise<void> {
  await (s.engine as unknown as { fireTiming(t: EffectTiming): Promise<void> }).fireTiming(
    EffectTiming.OnEndTurn,
  );
}

function onField(s: EngineSetup, instanceId: string): boolean {
  return s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === instanceId);
}

describe("EX10-035 — delayed-delete-played gates to the reduced-cost [Hand][Main] play (KB Q5737)", () => {
  it("the [Hand][Main] effect plays EX10-035 for cost 11-5=6 and arms the turn-end self-delete", async () => {
    // EX10-035 in hand. A [Dark Masters]-text Digimon (BT15-027) on the board satisfies the
    // activation condition ("no Digimon OTHER than [Dark Masters]-text Digimon").
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-035", as: "inHand" }],
          battleArea: ["BT15-027"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0]!;
    const inHand = s.inst("inHand");

    // Make the reduced cost (6) payable: seat 0 (turn player) can push the gauge by memory+10.
    s.state.memory = 0; // maxAffordable for the turn player = 0 + 10 = 10 >= 6

    // Activate the [Hand][Main] reduced-cost play through the real activateEffect verb.
    const effectKey = reducedCostPlayEffectKey(s, inHand);
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: inHand.instanceId, effectKey })).toEqual({
      ok: true,
    });
    await settle(() => onField(s, inHand.instanceId));

    // It was played from hand (cost 6 paid: gauge 0 -> -6 for the turn player) and is on the field.
    expect(onField(s, inHand.instanceId)).toBe(true);
    expect(p0.hand.some((c) => c.instanceId === inHand.instanceId)).toBe(false);
    expect(s.state.memory).toBe(-6); // 11 printed − 5 reduction = 6 paid (REVERT-RED: drop reduceCostBy => -11... unaffordable, no play)

    // End of the owner's turn: the armed watcher fires and deletes the card it played.
    void fireEndTurn(s);
    await settle(() => !onField(s, inHand.instanceId));
    expect(onField(s, inHand.instanceId)).toBe(false);
    // REVERT-CONFIRM-RED: drop the `DelayedDeletePlayed` action (or its `ctx.fx.delayedDeletePlayed`
    // call) => EX10-035 survives the turn end => this assertion goes RED.
  });

  it("a NORMAL [On Play] of EX10-035 does NOT arm the self-delete — it survives turn end (the gate)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX10-035", as: "me" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const me = s.perm("me");

    // Fire the normal OnPlay (the path a regular play-card takes). The delete is NOT under OnPlay.
    await fireOnPlayForInstance(s, me.topCard!.instanceId);
    expect(onField(s, me.topCard!.instanceId)).toBe(true);

    // End of turn: NOTHING was armed, so EX10-035 stays on the field.
    await fireEndTurn(s);
    expect(onField(s, me.topCard!.instanceId)).toBe(true);
    // REVERT-CONFIRM-RED: moving `DelayedDeletePlayed` back under the OnPlay actions (the pre-08-15
    // mis-gating) => the normal play arms the delete => EX10-035 is deleted => this goes RED. This
    // is the lever proving the delete is bound ONLY to the reduced-cost [Hand][Main] play (Q5737).
  });

  it("the [Hand][Main] effect does NOT play EX10-035 while you control a non-[Dark Masters] Digimon", async () => {
    // A plain Digimon (AD1-001, no [Dark Masters] text) blocks the activation condition.
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-035", as: "inHand" }],
          battleArea: ["AD1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const p0 = s.state.players[0]!;
    const inHand = s.inst("inHand");
    s.state.memory = 0;

    const effectKey = reducedCostPlayEffectKey(s, inHand);
    s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId: inHand.instanceId, effectKey });
    await settle(() => false, 20); // flush

    // The exclude filter's condition fails => the effect no-ops => EX10-035 stays in hand.
    expect(p0.hand.some((c) => c.instanceId === inHand.instanceId)).toBe(true);
    expect(onField(s, inHand.instanceId)).toBe(false);
    // REVERT-CONFIRM-RED: drop the `excludeNameOrTrait` rejection in definitionMatches (so the
    // plain AD1-001 no longer counts against the gate) => `youHaveNone` holds => EX10-035 is
    // played => this assertion goes RED.
  });
});
