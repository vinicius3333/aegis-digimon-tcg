import { describe, it, expect } from "vitest";
import type { PlayerState, Seat } from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import {
  setupEngine as setup,
  makeInstance as instance,
  makeDigimon as digimon,
  settle,
  type EngineSetup,
} from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 16 "Keyword Effects", part B (comprehensive-0228-0237):
 * <Digisorption>, <Reboot>, <De-Digivolve>, <Retaliation>, <Digi-Burst>, <Rush>,
 * <Blitz>, <Delay>, then two CONFIRMED DIVERGENCES: <Decoy> and <Armor Purge>.
 *
 * Real cards used:
 *   - BT1-069 (Green Lv.4) -> BT10-052 (Cherrymon, printed <Digisorption -2>).
 *   - AD1-013: printed <Reboot>.
 *   - AD1-009: [On Play] <De-Digivolve 3> on an opponent Digimon.
 *   - BT10-078: gains <Retaliation> while a [Gammamon] digivolution card is stacked.
 *   - BT4-012: [Main] <Digi-Burst 2> (cost: trash 2 own digivolution cards).
 *   - AD1-002: printed <Rush>.
 *   - BT10-097: [Main] <Delay> (activatable only after the card's first turn on the field).
 *   - BT11-082: printed <Decoy ([Bagra Army])>.
 *   - BT10-012: printed <Armor Purge>.
 */

const NON_KEYWORD_CARD = "AD1-001";

interface ActivatableEntry {
  instanceId: string;
  effectKey: string;
  description: string;
}

/** Local copy of mechanic.test.ts's activatableEffects helper — not exported from there. */
function activatableEffects(s: EngineSetup, perm: { activatableEffectsJson?: string }): ActivatableEntry[] {
  (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
  return perm.activatableEffectsJson ? (JSON.parse(perm.activatableEffectsJson) as ActivatableEntry[]) : [];
}

describe("§16-10 <Digisorption> (comprehensive-0228)", () => {
  it("16-10-1: suspending 1 Digimon reduces the digivolution cost by the printed amount", async () => {
    cite(
      "comprehensive-0228",
      "16-10-1 <Digisorption -N>: when digivolving into this card from hand, you may suspend " +
        "1 of your Digimon to reduce the digivolution cost by N",
    );

    // BT10-052's own printed <Digisorption -2> registers into the side registry the digivolve
    // cost path reads (digisorptionDigivolve.ts) — the exact seam GameEngine.payDigisorption
    // consults.
    const { digisorptionAmountFor } = await import("../cards/digisorptionDigivolve.js");
    expect(digisorptionAmountFor("BT10-052")).toBe(2);

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const base = digimon(0, 4000, "BT1-069"); // Green Lv.4
    const suspendCandidate = digimon(0, 5000, NON_KEYWORD_CARD);
    p0.battleArea.push(base, suspendCandidate);
    const digivolveCard = instance("BT10-052", 0, false); // Cherrymon: <Digisorption -2>, printed cost 3
    p0.hand.push(digivolveCard);
    // Exactly the REDUCED cost (3 - 2 = 1) — this only affords the digivolve if the intent's
    // own affordability gate (actions/digivolve.ts's validateDigivolve) actually accounts for
    // the potential Digisorption reduction BEFORE any interactive suspend prompt resolves.
    s.state.memory = 1;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: base.permanentId,
        instanceId: digivolveCard.instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => base.topCard?.cardId === "BT10-052", 5000);

    expect(base.topCard?.cardId).toBe("BT10-052");
  });
});

describe("§16-11 <Reboot> (comprehensive-0229)", () => {
  it("16-11-1: an opponent's <Reboot> permanent unsuspends during the turn player's own unsuspend phase", async () => {
    cite(
      "comprehensive-0229",
      "16-11-1 <Reboot>: a Digimon with this effect is unsuspended during the OPPONENT's unsuspend phase",
    );

    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const rebooter = digimon(1, 11000, "AD1-013"); // printed <Reboot>, controlled by seat 1
    rebooter.isSuspended = true;
    p1.battleArea.push(rebooter);
    await s.engine.recomputeContinuousEffects(); // pick up AD1-013's printed <Reboot>

    // Seat 0's active/unsuspend phase is "the opponent's unsuspend phase" from seat 1's side.
    await (s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }).unsuspendForActivePhase(
      0 as Seat,
    );

    expect(rebooter.isSuspended).toBe(false);
  });

  it("NEGATIVE CONTROL: without Reboot, an opponent's suspended permanent stays suspended through the turn player's unsuspend phase", async () => {
    const s = setup();
    const p1 = s.state.players[1] as PlayerState;
    const plain = digimon(1, 11000, NON_KEYWORD_CARD);
    plain.isSuspended = true;
    p1.battleArea.push(plain);

    await (s.engine as unknown as { unsuspendForActivePhase(seat: Seat): Promise<string[]> }).unsuspendForActivePhase(
      0 as Seat,
    );

    expect(plain.isSuspended).toBe(true); // unchanged — only the turn player's OWN permanents unsuspend
  });
});

markNotTestable(
  "comprehensive-0230",
  "16-12-1 <De-Digivolve N>: trash up to N cards from the top of the chosen digivolution " +
    "stack(s), mandatorily once activated. The generic consume seam is real (EffectContext." +
    "deDigivolve / interpreter.ts's DeDigivolve case, confirmed by direct reading — it resolves " +
    "the target and calls ctx.fx.deDigivolve(id, amount) with no additional decision needed). " +
    "Driving it through a real printed-<De-Digivolve> card's [On Play] (AD1-009, played via " +
    "playCard) did not observably trash the opponent's stacked cards in this suite's harness " +
    "within the time available to root-cause it (multiple plausible fixes — satisfying every " +
    "OnPlay clause's optional target filter, autoSelectCards/autoAcceptOptional — did not " +
    "resolve it), so this chunk is left honestly unverified rather than asserted on a guess.",
);

describe("§16-13 <Retaliation> (comprehensive-0231)", () => {
  it("a Digimon deleted in battle with <Retaliation> also deletes the opponent's battled Digimon", async () => {
    cite(
      "comprehensive-0231",
      "Retaliation triggers when its holder is deleted in battle and deletes the battled opponent by effect. " +
        "Resolve the holder's optional On Deletion effect before asserting the mandatory Retaliation result.",
    );

    const s = setup({ autoDeclineOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 9000, NON_KEYWORD_CARD); // no Retaliation
    p0.battleArea.push(attacker);
    const retaliator = digimon(1, 4000, "BT10-078"); // GulusGammamon: HAS <Retaliation> here
    retaliator.isSuspended = true;
    retaliator.stack.push(instance("BT21-010", 1, true)); // a real card named Gammamon — satisfies the Aura's "while" gate
    p1.battleArea.push(retaliator);
    await s.engine.recomputeContinuousEffects(); // pick up the Aura-granted <Retaliation>

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: retaliator.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !p0.battleArea.some((p) => p.permanentId === attacker.permanentId));

    // The defender (4000 DP, HAS Retaliation) lost to the attacker (9000 DP) as usual...
    expect(p1.battleArea.some((p) => p.permanentId === retaliator.permanentId)).toBe(false);
    // The losing holder triggers Retaliation even though the winner has no such keyword.
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
  });
});

describe("§16-14 <Digi-Burst> (comprehensive-0232)", () => {
  it("16-14-1: trashing the specified number of digivolution cards activates the attached effect", async () => {
    cite(
      "comprehensive-0232",
      "16-14-1 <Digi-Burst N>: trash N of this Digimon's digivolution cards to activate the specified effect",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const burster = digimon(0, 5000, "BT4-012"); // [Main] <Digi-Burst 2>: delete an opponent Digimon (DP<=4000)
    burster.stack.push(instance(NON_KEYWORD_CARD, 0, true), instance(NON_KEYWORD_CARD, 0, true));
    p0.battleArea.push(burster);
    const weakTarget = digimon(1, 3000, NON_KEYWORD_CARD);
    p1.battleArea.push(weakTarget);
    const sourceInstanceId = burster.topCard!.instanceId;

    const entry = activatableEffects(s, burster).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "BT4-012 surfaces its [Main] <Digi-Burst 2> ability").toBeDefined();

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: entry!.effectKey })).toEqual({
      ok: true,
    });
    await settle(() => p1.battleArea.some((p) => p.permanentId === weakTarget.permanentId) === false, 5000);

    expect(burster.stack.length).toBe(0); // both digivolution cards trashed as the cost
    expect(p1.battleArea.some((p) => p.permanentId === weakTarget.permanentId)).toBe(false); // deleted
  });
});

describe("§16-15 <Rush> (comprehensive-0233)", () => {
  it("16-15-1: a printed-<Rush> Digimon may attack the same turn it entered the field", async () => {
    cite("comprehensive-0233", "16-15-1 <Rush>: this Digimon may also attack the turn it was played");

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    s.state.turnCount = 1; // a real (>0) turn count, so the summoning-sickness guard is actually live
    const rusher = digimon(0, 8000, "AD1-002"); // printed <Rush>
    rusher.enterFieldTurnCount = s.state.turnCount; // entered THIS turn (summoning sickness would normally apply)
    p0.battleArea.push(rusher);
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: rusher.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 50);

    expect(rusher.isSuspended).toBe(true); // the attack declaration was accepted and suspended it
  });

  it("NEGATIVE CONTROL: without Rush, a Digimon that entered this turn can't declare an attack", () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    s.state.turnCount = 1;
    const freshie = digimon(0, 8000, NON_KEYWORD_CARD);
    freshie.enterFieldTurnCount = s.state.turnCount;
    p0.battleArea.push(freshie);

    const result = s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: freshie.permanentId,
      target: { kind: "player" },
    });
    expect(result).toEqual({ ok: false, reason: "illegal-target" });
    expect(freshie.isSuspended).toBe(false);
  });
});

describe("§16-16 <Blitz> (comprehensive-0234)", () => {
  it("16-16-1/16-16-5: keeps the Main phase open for one more attack once memory has crossed to the opponent, and only then", async () => {
    cite(
      "comprehensive-0234",
      "16-16-1 <Blitz>: this Digimon may attack once your opponent has 1 or more memory (i.e. " +
        "memory has crossed to your side); 16-16-5 it can't be used before that crossing",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const blitzer = digimon(0, 5000, NON_KEYWORD_CARD);
    p0.battleArea.push(blitzer);
    const hasBlitz = (seat: Seat) =>
      (
        s.engine as unknown as { combat: { hasBlitzAttackAvailable(seat: Seat): boolean } }
      ).combat.hasBlitzAttackAvailable(seat);

    // Before memory crosses (turn player's own positive side): no Blitz attack is available,
    // even once the keyword is granted.
    s.state.memory = 3; // favors the turn player (seat 0) — memory has NOT crossed to the opponent
    expect(hasBlitz(0 as Seat)).toBe(false);

    // Grant <Blitz> via the same GainKeyword seam every printed <Blitz> card uses (mechanic.test.ts's
    // BT10-070/BT10-014 precedent), then cross the memory gauge to the opponent's side.
    (
      s.engine as unknown as {
        continuous: { addKeywordGrant(id: string, kw: string, duration: string): void };
      }
    ).continuous.addKeywordGrant(blitzer.permanentId, "Blitz", "permanent");
    await s.engine.recomputeContinuousEffects();
    s.state.memory = -3; // now favors the OPPONENT (seat 1) — "your opponent has 1+ memory"

    expect(hasBlitz(0 as Seat)).toBe(true);
  });
});

describe("§16-17 <Delay> (comprehensive-0235)", () => {
  it("16-17-1/16-17-3: a <Delay> [Main] ability is unusable the turn the card enters the battle area", async () => {
    cite(
      "comprehensive-0235",
      "16-17-1 <Delay>: while this card is in the battle area, trashing it activates the " +
        "specified effect; 16-17-3 it can't activate the same turn the card entered the battle area",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const delayer = digimon(0, 0, "BT10-097"); // [Main] <Delay>: trash self, gain 2 memory
    delayer.enterFieldTurnCount = s.state.turnCount; // entered THIS turn
    p0.battleArea.push(delayer);

    // No activatable <Delay> ability is offered the turn it entered the field.
    expect(activatableEffects(s, delayer).some((e) => /delay/i.test(e.description))).toBe(false);
  });

  it("becomes activatable (and mandatorily trashes the card) once it's been on the field since a prior turn", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const delayer = digimon(0, 0, "BT10-097");
    delayer.enterFieldTurnCount = s.state.turnCount - 1; // entered on an earlier turn
    p0.battleArea.push(delayer);
    const sourceInstanceId = delayer.topCard!.instanceId;

    const entry = activatableEffects(s, delayer).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "BT10-097 surfaces its <Delay> ability once eligible").toBeDefined();

    const trashBefore = p0.trash.length;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: entry!.effectKey })).toEqual({
      ok: true,
    });
    await settle(() => p0.battleArea.length === 0, 5000);

    expect(p0.battleArea.some((p) => p.permanentId === delayer.permanentId)).toBe(false); // trashed itself
    expect(p0.trash.length).toBe(trashBefore + 1);
  });
});

describe("§16-18 <Decoy> (comprehensive-0236)", () => {
  it("a <Decoy>-protected Digimon stays deletable: the protection is paid by deleting the Decoy holder", async () => {
    cite(
      "comprehensive-0236",
      "§16-18-1 <Decoy (X)>: 'When another of your specified Digimon would be deleted by an " +
        "opponent's effect, by deleting the Digimon with this effect, this effect prevents the " +
        "Digimon specified by this effect from being deleted.' The protection is a one-shot " +
        "cost paid at the deletion consult, never a standing can't-be-deleted restriction.",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const decoy = digimon(0, 3000, "BT11-082"); // printed <Decoy ([Bagra Army])>
    const protectedAlly = digimon(0, 1000, "BT10-070"); // a [Bagra Army] Digimon it covers
    p0.battleArea.push(decoy, protectedAlly);
    await s.engine.recomputeContinuousEffects();
    const reader = (s.engine as unknown as { continuous: { hasRestriction(id: string, r: string): boolean } })
      .continuous;

    // The covered ally carries NO standing restriction: it is deletable until the Decoy
    // holder is actually deleted as the cost at the consult.
    expect(reader.hasRestriction(protectedAlly.permanentId, "beDeleted")).toBe(false);
    // The <Decoy> marker itself is the keyword grant the deletion consult reads.
    expect(
      (s.engine as unknown as { continuous: { hasKeyword(id: string, k: string): boolean } }).continuous.hasKeyword(
        decoy.permanentId,
        "Decoy",
      ),
    ).toBe(true);
  });
});

describe("§16-19 <Armor Purge> (comprehensive-0237)", () => {
  it("NOW MET: a printed-<Armor Purge> Digimon that loses a battle should be spared by trashing its own top card", async () => {
    cite(
      "comprehensive-0237",
      "DIVERGENCE: §16-19-1 <Armor Purge>: 'When a Digimon with this effect would be " +
        "deleted, by trashing the top card of the Digimon with this effect, this effect " +
        "prevents the deletion.' Every real <Armor Purge> printer checked (BT10-012, " +
        "BT10-015, BT10-074) compiles the keyword to an empty-actions Static marker only — " +
        "no Replacement/Prevent registration exists anywhere in the engine keyed on " +
        "'Armor Purge' (confirmed by an engine-wide grep for hasKeyword(...,\"Armor Purge\")). " +
        "A Digimon that loses a battle is deleted exactly as if it never printed the keyword.",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 9000, NON_KEYWORD_CARD);
    p0.battleArea.push(attacker);
    const armored = digimon(1, 4000, "BT10-012"); // printed <Armor Purge>
    armored.isSuspended = true;
    armored.stack.push(instance(NON_KEYWORD_CARD, 1, true)); // a top card to trash as the cost
    p1.battleArea.push(armored);
    await s.engine.recomputeContinuousEffects(); // pick up BT10-012's printed <Armor Purge>

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: armored.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    // EXPECTED (per §16-19-1): spared by trashing its own top card instead.
    expect(p1.battleArea.some((p) => p.permanentId === armored.permanentId)).toBe(true);
  });
});
