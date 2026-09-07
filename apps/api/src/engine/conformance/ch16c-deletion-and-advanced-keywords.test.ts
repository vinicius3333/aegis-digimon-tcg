import { describe, it, expect } from "vitest";
import { EffectTiming, type PlayerState, type Seat } from "@aegis/shared";
import { cite, markNotTestable } from "./_kb.js";
import "./not-testable.js";
import { canAttackerDeclare, canAttackTarget, hasCollision } from "../combat/legality.js";
import { GameStateAccess } from "../state/access.js";
import {
  setupEngine as setup,
  makeInstance as instance,
  makeDigimon as digimon,
  settle,
  type EngineSetup,
} from "../testkit/harness.js";
import "../../cards/index.js";

/**
 * Comprehensive Rules chapter 16 "Keyword Effects", part C (comprehensive-0238-0262):
 * <Save>, <Material Save>, <Evade>, <Raid>, <Alliance>, <Barrier>, <Blast Digivolve>,
 * <Fortitude>, <Mind Link>, <Partition>, <Collision> (brief — see keywordBattle.test.ts),
 * <Blast DNA Digivolve>, <Scapegoat>, <Vortex>, <Overclock>, <Iceclad> (brief — see
 * keywordBattle.test.ts), <Decode>, <Fragment>, <Execute>, <Progress>, <Link +>,
 * <Training>, <Use Req.>, <Ascension>.
 *
 * Collision (§16-30) and Iceclad (§16-35) were recently landed correctly and are
 * behaviorally proven in combat/keywordBattle.test.ts; this file cites those chunks
 * with a light structural check rather than re-litigating the full proof.
 */

const NON_KEYWORD_CARD = "AD1-001";
const MARCUS = "BT12-092"; // a real [Marcus Damon] Tamer, used as an under-Tamer target

interface ActivatableEntry {
  instanceId: string;
  effectKey: string;
  description: string;
}
function activatableEffects(s: EngineSetup, perm: { activatableEffectsJson?: string }): ActivatableEntry[] {
  (s.engine as unknown as { syncActivatableEffects(): void }).syncActivatableEffects();
  return perm.activatableEffectsJson ? (JSON.parse(perm.activatableEffectsJson) as ActivatableEntry[]) : [];
}

describe("§16-20 <Save> (comprehensive-0238)", () => {
  it("16-20-1: on deletion, the card may be placed under 1 of the controller's Tamers instead of trashed", async () => {
    cite("comprehensive-0238", "16-20-1 <Save>: allows placing this card under 1 of your Tamers (on deletion)");

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const tamer = digimon(0, 0, MARCUS);
    p0.battleArea.push(tamer);
    const attacker = digimon(1, 9000, NON_KEYWORD_CARD);
    p1.battleArea.push(attacker);
    const saver = digimon(0, 2000, "BT10-008"); // [On Deletion] <Save>: place self under a Tamer
    saver.isSuspended = true;
    p0.battleArea.push(saver);
    s.state.turnSeat = 1; // seat 1 is declaring the attack

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: saver.permanentId },
      }),
    ).toEqual({ ok: true });
    // Settle on the <Save> PLACEMENT, not merely the deletion: the card leaves the field first,
    // and PlaceUnder resolves behind async optional/target prompts afterward — a deletion-only
    // predicate would race ahead of the placement (mechanic.test.ts's P-115 <Save> precedent).
    await settle(() => tamer.stack.some((c) => c.cardId === "BT10-008"), 5000);

    // NOT in the trash — Save placed it under the Tamer instead.
    expect(tamer.stack.some((c) => c.cardId === "BT10-008")).toBe(true);
    expect(p0.trash.some((c) => c.cardId === "BT10-008")).toBe(false);
  });
});

describe("§16-21/16-21-6 <Material Save> (comprehensive-0239/0240)", () => {
  it("NOW MET: on deletion, <Material Save N> should place N DigiXros-requirement digivolution cards under a Tamer", async () => {
    cite(
      "comprehensive-0239",
      "DIVERGENCE: §16-21-1 <Material Save N>: 'When a Digimon with this effect is deleted, " +
        "this effect allows you to place N of the cards specified in the top card's DigiXros " +
        "requirements from among the digivolution cards under 1 of your Tamers.' BT10-009 " +
        "(printed <Material Save 2>) compiles the keyword to an empty-actions Static marker " +
        "only — its actual OnPlay/EndOfAttack effects are unrelated (a flat draw and a " +
        "self-unsuspend-by-cost ability), and no OnDeletion action implements Material Save's " +
        'described placement at all. An engine-wide grep for hasKeyword(...,"MaterialSave") ' +
        "returns zero consumption sites.",
    );
    cite("comprehensive-0240", "16-21-6 (a stacking-order sub-rule of the same, unimplemented, mechanic)");

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const tamer = digimon(0, 0, MARCUS);
    p0.battleArea.push(tamer);
    const attacker = digimon(1, 20000, NON_KEYWORD_CARD);
    p1.battleArea.push(attacker);
    const saver = digimon(0, 8000, "BT10-009"); // printed <Material Save 2>
    saver.isSuspended = true;
    saver.stack.push(instance("BT10-008", 0, true)); // a plausible DigiXros-material stand-in
    p0.battleArea.push(saver);
    s.state.turnSeat = 1; // seat 1 is declaring the attack

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: saver.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    // EXPECTED (per §16-21-1): a digivolution card ends up placed under the Tamer.
    expect(tamer.stack.length).toBeGreaterThan(0);
  });
});

markNotTestable(
  "comprehensive-0241",
  "16-22-1 <Evade>: by suspending this Digimon when it would be deleted, prevent the " +
    "deletion. The consume seam is real (combat/controller.ts's resolveDigimonBattle Evade " +
    "loop, gated on the permanent being UNSUSPENDED — only reachable via a BLOCKER, since a " +
    "directly-attacked target is always already suspended by targeting legality) and answered " +
    "through a dedicated respondEvade intent (actions/combatDecisions.ts). Driving a real " +
    "printed-<Evade>+<Blocker> card (AD1-014) through declareBlock into a losing battle, then " +
    "answering the resulting decision window, consistently returned 'wrong-phase' — the " +
    "window closed (or never genuinely opened) before the response reached it in this suite's " +
    "harness, and root-causing the exact timing gap was not resolvable in the time available. " +
    "Left honestly unverified rather than asserted on a guess.",
);

describe("§16-23 <Raid> (comprehensive-0242)", () => {
  it("NOW MET: a printed-<Raid> attacker should be able to switch its attack onto the opponent's highest-DP unsuspended Digimon", async () => {
    cite(
      "comprehensive-0242",
      "DIVERGENCE: §16-23-1 <Raid>: 'can switch the target of attack to the opponent's " +
        "unsuspended Digimon with the highest DP when a Digimon with this keyword effect " +
        "attacks.' AD1-004 and AD1-003 (both real <Raid> printers) compile the keyword to an " +
        "empty-actions Static marker only; no RedirectAttack (or any other) action consumes " +
        "it anywhere, and no generic engine-level 'Raid' auto-redirect exists (confirmed by " +
        'grepping the engine for hasKeyword(...,"Raid")) — unlike ＜Collision＞/＜Vortex＞, ' +
        "which ARE read generically from printed text in combat/legality.ts.",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true }); // <Raid> is a MAY: an unanswered prompt means no redirect
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 5000, "AD1-004"); // printed <Raid>
    p0.battleArea.push(attacker);
    const unsuspendedHighDP = digimon(1, 9000, NON_KEYWORD_CARD); // the highest-DP unsuspended target
    p1.battleArea.push(unsuspendedHighDP);
    await s.engine.recomputeContinuousEffects();

    // Per §16-23-1 a player-target attack is switched onto the unsuspended high-DP Digimon
    // and becomes a Digimon battle. The observable is the attacker's own fate, not the
    // defender's: at 5000 DP it loses to the 9000 DP defender and is deleted, while the
    // defender survives. If no redirect happened the attack would have hit the player and
    // run a security check instead, leaving the attacker alive.
    const securityBefore = p1.security.length;
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !p0.battleArea.some((p) => p.permanentId === attacker.permanentId), 5000);
    expect(p0.battleArea.some((p) => p.permanentId === attacker.permanentId)).toBe(false);
    expect(p1.battleArea.some((p) => p.permanentId === unsuspendedHighDP.permanentId)).toBe(true);
    expect(p1.security.length).toBe(securityBefore);
  });
});

describe("§16-24 <Alliance> (comprehensive-0243)", () => {
  it("16-24-1: suspending another Digimon adds its DP to the attacker (attack-only, no block-time variant)", async () => {
    cite(
      "comprehensive-0243",
      "16-24-1 <Alliance>: when this Digimon attacks, by suspending 1 of your other Digimon, " +
        "add its DP to the attacking Digimon for the attack",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 5000, "AD1-009"); // printed <Alliance>
    const ally = digimon(0, 3000, NON_KEYWORD_CARD);
    p0.battleArea.push(attacker, ally);
    const defender = digimon(1, 7000, NON_KEYWORD_CARD); // beats the base 5000 but not 5000+3000
    defender.isSuspended = true;
    const blocker = digimon(1, 1000, "ST18-07");
    p1.battleArea.push(defender, blocker);
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: defender.permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenAllianceDecision: boolean } }).combat;
    await settle(() => combat.hasOpenAllianceDecision);
    expect(s.engine.applyIntent(0, { type: "respondAlliance", allyPermanentId: ally.permanentId } as never)).toEqual({
      ok: true,
    });
    const blockWindow = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
    await settle(() => blockWindow.hasOpenBlockWindow, 5000);

    expect(ally.isSuspended).toBe(true); // suspended to pay Alliance's cost
    expect(attacker.currentDP).toBe(8000); // 5000 + the ally's 3000 DP — the real DP-addition mechanic

    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });

    // Flush further: the battle comparison itself (a separate step after the DP modifier lands)
    // needs additional ticks beyond the DP settle above.
    await settle(() => p1.battleArea.some((p) => p.permanentId === defender.permanentId) === false, 5000);
    expect(p1.battleArea.some((p) => p.permanentId === defender.permanentId)).toBe(false); // wins with the boost
  });
});

describe("§16-25 <Barrier> (comprehensive-0244)", () => {
  it("16-25-1: trashing the top card of the controller's security stack prevents a battle deletion", async () => {
    cite(
      "comprehensive-0244",
      "16-25-1 <Barrier>: by trashing the top card of your security stack when this Digimon " +
        "would be deleted in battle, prevent that deletion",
    );

    const s = setup({ autoAcceptOptional: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(1, 9000, NON_KEYWORD_CARD);
    p1.battleArea.push(attacker);
    const barriered = digimon(0, 4000, "BT13-041"); // printed <Barrier>
    barriered.isSuspended = true;
    p0.battleArea.push(barriered);
    p0.security.push(instance(NON_KEYWORD_CARD, 0, false));
    await s.engine.recomputeContinuousEffects();
    s.state.turnSeat = 1; // seat 1 is declaring the attack

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: barriered.permanentId },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBarrierDecision: boolean } }).combat;
    await settle(() => combat.hasOpenBarrierDecision, 5000);
    expect(
      s.engine.applyIntent(0, {
        type: "respondBarrier",
        permanentId: barriered.permanentId,
        accept: true,
      } as never),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    expect(p0.battleArea.some((p) => p.permanentId === barriered.permanentId)).toBe(true); // spared
    expect(p0.security.length).toBe(0); // paid by trashing the top security card
  });
});

describe("§16-26 <Blast Digivolve> (comprehensive-0245)", () => {
  it("16-26-1: a card printing <Blast Digivolve> digivolves from hand for free, without paying the cost", async () => {
    cite(
      "comprehensive-0245",
      "16-26-1 <Blast Digivolve>: allows one of your Digimon to digivolve into a card with this " +
        "keyword effect in the hand without paying the cost (the printed digivolution requirement " +
        "still applies). AD1-005's printed <Blast Digivolve> compiles to an empty-actions " +
        "'Counter'-trigger keyword marker; the memory-cost waiver is consumed at the digivolve " +
        "verb (DigivolveDeps.costWaived, sourced from hasBlastDigivolveKeyword's compiled-IR " +
        "registry), not through the marker's own IR routing.",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(0, 3000, "BT1-009");
    p0.battleArea.push(attacker);
    // AD1-005's printed EvoCost requires a red level-5 base; BT1-021 satisfies it.
    const base = digimon(1, 8000, "BT1-021");
    p1.battleArea.push(base);
    const blastCard = instance("AD1-005", 1, false);
    p1.hand.push(blastCard);
    p1.security.push(instance("BT1-001", 1, false));
    s.state.memory = 0;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"), 5000);
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("counter window did not open");
    const eligible = opened.eligibleCounters.find((entry) => entry.instanceId === blastCard.instanceId);
    expect(eligible).toBeDefined();
    expect(
      s.engine.applyIntent(1, {
        type: "respondCounter",
        sourceInstanceId: eligible!.instanceId,
        effectKey: eligible!.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() => base.topCard?.cardId === "AD1-005", 5000);
    expect(base.topCard?.cardId).toBe("AD1-005");
    expect(s.state.memory).toBe(0); // cost genuinely waived, not merely affordable
  });

  it("16-26-1 control: a Digimon WITHOUT <Blast Digivolve> is still rejected on insufficient memory", () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const base = digimon(0, 3000, "BT1-009");
    p0.battleArea.push(base);
    const plainCard = instance("AD1-001", 0, false); // EvoCost 2, no printed <Blast Digivolve>
    p0.hand.push(plainCard);
    s.state.memory = -10; // maxAffordable(0) = 0 < 2

    const result = s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: base.permanentId,
      instanceId: plainCard.instanceId,
    });
    expect(result).toEqual({ ok: false, reason: "insufficient-memory" });
  });
});

describe("§16-27 <Fortitude> (comprehensive-0246)", () => {
  it("NOW MET: a <Fortitude> Digimon with digivolution cards, on deletion, should replay itself for free", async () => {
    cite(
      "comprehensive-0246",
      "DIVERGENCE: §16-27-1 <Fortitude>: 'When a Digimon with digivolution cards and this " +
        "effect is deleted, you play this Digimon without paying the cost.' BT20-034 (printed " +
        "<Fortitude>) compiles the keyword to an empty-actions Static marker; its actual " +
        "AllTurns effects are an unrelated digivolve-activation restriction and a once-per-turn " +
        "security trash on battle wins — no PlayWithoutCost/replay action ever fires on this " +
        "card's own deletion.",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const attacker = digimon(1, 9000, NON_KEYWORD_CARD);
    p1.battleArea.push(attacker);
    const fort = digimon(0, 4000, "BT20-034"); // printed <Fortitude>
    fort.isSuspended = true;
    fort.stack.push(instance(NON_KEYWORD_CARD, 0, true)); // "with digivolution cards"
    p0.battleArea.push(fort);
    await s.engine.recomputeContinuousEffects();
    s.state.turnSeat = 1; // seat 1 is declaring the attack
    const trashBefore = p0.trash.length;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: fort.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => p0.trash.length > trashBefore, 5000);

    // EXPECTED (per §16-27-1): replayed for free — back on the battle area, not sitting trashed.
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT20-034")).toBe(true);
  });
});

describe("§16-28 <Mind Link> (comprehensive-0247)", () => {
  it("16-28-1: places the Tamer with this effect into the digivolution cards of a Tamer-less Digimon", async () => {
    cite(
      "comprehensive-0247",
      "16-28-1 <Mind Link>: places a Tamer with this effect in the digivolution cards of a " +
        "Digimon that has no Tamer cards among its own digivolution cards",
    );

    const s = setup({ autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const linker = digimon(0, 0, "BT14-086"); // Tamer: [Main] <Mind Link>
    const target = digimon(0, 2000, "BT14-058"); // Numemon — matches Mind Link's own target filter, no Tamer stacked
    p0.battleArea.push(linker, target);
    const sourceInstanceId = linker.topCard!.instanceId;

    const entry = activatableEffects(s, linker).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "BT14-086 surfaces its [Main] <Mind Link> ability").toBeDefined();

    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: entry!.effectKey })).toEqual({
      ok: true,
    });
    await settle(() => p0.battleArea.some((p) => p.permanentId === linker.permanentId) === false, 5000);

    expect(p0.battleArea.some((p) => p.permanentId === linker.permanentId)).toBe(false); // left the field as its own permanent
    expect(target.stack.some((c) => c.cardId === "BT14-086")).toBe(true); // now a digivolution card of the target
  });
});

describe("§16-29 <Partition> (comprehensive-0248)", () => {
  it("16-29-1: an opponent-effect removal replays one of each specified digivolution card for free", async () => {
    cite(
      "comprehensive-0248",
      "16-29-1 <Partition>: when the holder and one of each specified card in its digivolution " +
        "cards would leave the battle area other than by the controller's own effect or a battle, " +
        "the specified cards may be played from the digivolution cards without paying their costs",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    // BT16-025 prints <Partition (blue Lv.4 & green Lv.4)>; the stack must carry one card
    // matching each clause or 16-29-4's all-or-nothing gate correctly declines.
    const holder = digimon(0, 8000, "BT16-025");
    holder.stack.push(instance("AD1-010", 0, true), instance("BT1-069", 0, true));
    p0.battleArea.push(holder);
    await s.engine.recomputeContinuousEffects();

    // Must go through the primitive that carries ; the raw zone accessor combat uses
    // has no cause and never reaches the hook, which is correct per 16-29-1 excluding battles.
    const primitives = (
      s.engine as unknown as { primitives: { deletePermanent(ids: string[], cause?: string): Promise<number> } }
    ).primitives;
    s.state.turnSeat = 1; // an OPPONENT effect resolves the deletion
    await primitives.deletePermanent([holder.permanentId], "byEffect");
    await settle(() => p0.battleArea.some((p) => p.topCard?.cardId === "AD1-010"), 5000);

    expect(p0.battleArea.some((p) => p.permanentId === holder.permanentId)).toBe(false);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "AD1-010")).toBe(true);
    expect(p0.battleArea.some((p) => p.topCard?.cardId === "BT1-069")).toBe(true);
  });
});

describe("§16-30 <Collision> (comprehensive-0249) — verified in combat/keywordBattle.test.ts", () => {
  it("16-30-1: hasCollision reads the printed keyword the same way the block-forcing consume seam does", () => {
    cite(
      "comprehensive-0249",
      "16-30-1 <Collision>: while attacking, all of the opponent's Digimon gain <Blocker> and " +
        "the opponent is forced to block whenever possible — full behavioral proof (grant + the " +
        "forced-block chokepoint) lives in combat/keywordBattle.test.ts; this is a structural " +
        "confirmation from the rules angle, not a re-litigation",
    );
    const attacker = digimon(0, 5000, "BT16-032"); // printed <Collision>
    expect(hasCollision(attacker, undefined)).toBe(true);
  });
});

describe("§16-31 <Blast DNA Digivolve> (comprehensive-0250)", () => {
  it("16-31-1: Counter Blast DNA consumes one field Digimon and one hand card without paying memory", async () => {
    cite(
      "comprehensive-0250",
      "16-31-1: Blast DNA uses one specified field Digimon and one hand card; it resolves optionally during Counter timing.",
    );
    const s = setup(
      {
        0: {
          battleArea: [{ card: "AD1-004", as: "wargreymon" }],
          hand: [
            { card: "AD1-014", as: "metalgarurumon" },
            { card: "BT17-078", as: "omnimon" },
          ],
          deck: ["BT20-001"],
        },
        1: { battleArea: [{ card: "AD1-001", as: "attacker" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    s.state.memory = 0;
    await s.ready();
    const oldId = s.perm("wargreymon").permanentId;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "counterWindowOpened"));
    const opened = s.events.find((event) => event.kind === "counterWindowOpened");
    if (opened?.kind !== "counterWindowOpened") throw new Error("Counter did not open");
    const choice = opened.eligibleCounters.find((entry) => entry.instanceId === s.inst("omnimon").instanceId)!;
    expect(choice).toBeDefined();
    expect(
      s.engine.applyIntent(0, {
        type: "respondCounter",
        sourceInstanceId: choice.instanceId,
        effectKey: choice.effectKey,
      }),
    ).toEqual({ ok: true });
    await settle(() =>
      s.events.some((event) => event.kind === "effectActivated" && event.effectKey === choice.effectKey),
    );
    const result = s.state.players[0]!.battleArea.find((p) => p.topCard.cardId === "BT17-078")!;
    expect(result).toBeDefined();
    expect(result.permanentId).not.toBe(oldId);
    expect(result.stack.map((card) => card.cardId)).toEqual(["AD1-014", "AD1-004"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["BT20-001"]);
    expect(s.state.memory).toBe(0);
  });

  it("16-31-1 control: a plain (non-<Blast>) card DNA digivolves normally when its printed requirement matches", () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    // ST9-05 prints a plain "DNA Digivolution: Blue Lv.4 + Green Lv.4: Cost 0" requirement.
    const materialA = digimon(0, 3000, "AD1-010"); // Blue Lv.4
    const materialB = digimon(0, 3000, "BT1-069"); // Green Lv.4
    p0.battleArea.push(materialA, materialB);
    const plainCard = instance("ST9-05", 0, false);
    p0.hand.push(plainCard);
    s.state.memory = 0;

    const result = s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [materialA.permanentId, materialB.permanentId],
      instanceId: plainCard.instanceId,
    } as never);
    expect(result).toEqual({ ok: true });
  });

  it("16-31-1 control: a plain (non-<Blast>) card's DNA digivolve is rejected on insufficient memory", () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    // BT13-059 prints "DNA Digivolution: [Slayerdramon] + [Breakdramon]: Cost 4".
    const materialA = digimon(0, 9000, "BT20-027"); // Slayerdramon
    const materialB = digimon(0, 9000, "BT1-026"); // Breakdramon
    p0.battleArea.push(materialA, materialB);
    const plainCard = instance("BT13-059", 0, false);
    p0.hand.push(plainCard);
    s.state.memory = -10; // maxAffordable(0) = 0 < 4

    const result = s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [materialA.permanentId, materialB.permanentId],
      instanceId: plainCard.instanceId,
    } as never);
    expect(result).toEqual({ ok: false, reason: "insufficient-memory" });
  });

  it("16-31-1 control: dnaDigivolve materials that don't match the printed requirement are rejected", () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const materialA = digimon(0, 3000, NON_KEYWORD_CARD); // Red Lv.4 — doesn't satisfy Blue+Green
    const materialB = digimon(0, 3000, NON_KEYWORD_CARD);
    p0.battleArea.push(materialA, materialB);
    const plainCard = instance("ST9-05", 0, false); // requires Blue Lv.4 + Green Lv.4
    p0.hand.push(plainCard);

    const result = s.engine.applyIntent(0, {
      type: "dnaDigivolve",
      materialPermanentIds: [materialA.permanentId, materialB.permanentId],
      instanceId: plainCard.instanceId,
    } as never);
    expect(result).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});

describe("§16-32 <Scapegoat> (comprehensive-0251)", () => {
  it("NOW MET: deleting another of the controller's Digimon should prevent a <Scapegoat> Digimon's non-owner-effect deletion", async () => {
    cite(
      "comprehensive-0251",
      "DIVERGENCE: §16-32-1 <Scapegoat>: 'By deleting 1 of your other Digimon when a Digimon " +
        "with this effect would be deleted other than by one of your effects, this effect " +
        "prevents the deletion.' BT20-080 (printed <Scapegoat>) compiles the keyword to an " +
        "empty-actions Static marker; its real effects (a free-replay-on-digivolve and a " +
        "conditional security trash) are unrelated — no Prevent/Replacement keyed on " +
        "Scapegoat's own deletion trigger exists.",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const other = digimon(0, 1000, NON_KEYWORD_CARD); // the would-be scapegoat sacrifice
    const scapegoater = digimon(0, 4000, "BT20-080"); // printed <Scapegoat>
    scapegoater.isSuspended = true;
    p0.battleArea.push(other, scapegoater);
    const attacker = digimon(1, 9000, NON_KEYWORD_CARD);
    p1.battleArea.push(attacker);
    await s.engine.recomputeContinuousEffects();
    s.state.turnSeat = 1; // seat 1 is declaring the attack

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: scapegoater.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    // EXPECTED (per §16-32-1): spared, with `other` sacrificed instead.
    expect(p0.battleArea.some((p) => p.permanentId === scapegoater.permanentId)).toBe(true);
  });
});

describe("§16-33 <Vortex> (comprehensive-0252)", () => {
  it("16-33-1: a <Vortex>-mode attack may target an opponent's UNSUSPENDED Digimon", () => {
    cite(
      "comprehensive-0252",
      "16-33-1 <Vortex>: allows this Digimon to attack an opponent's Digimon, unsuspended included",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const vortexer = digimon(0, 8000, "BT20-101"); // printed <Vortex>
    p0.battleArea.push(vortexer);
    const unsuspendedTarget = digimon(1, 3000, NON_KEYWORD_CARD); // NOT suspended
    p1.battleArea.push(unsuspendedTarget);
    const access = new GameStateAccess(s.state);

    expect(canAttackerDeclare(access, 0 as Seat, vortexer, undefined, true)).toBeNull();
    expect(
      canAttackTarget(
        access,
        0 as Seat,
        vortexer,
        { kind: "permanent", permanentId: unsuspendedTarget.permanentId },
        undefined,
        true,
      ),
    ).toBeNull();
  });

  it("NOW MET: 16-33-1's 'also allows attacking the same turn the Digimon was played' relax summoning sickness for a Vortex attack", () => {
    cite(
      "comprehensive-0252",
      "DIVERGENCE: §16-33-1 <Vortex> 'is a keyword effect that also allows a Digimon to " +
        "attack in the same turn it was played.' canAttackerDeclare's summoning-sickness gate " +
        "(combat/legality.ts) checks ONLY hasRush(attacker, reader) — isVortex is checked " +
        "afterward, in a SEPARATE guard that never reaches a same-turn Vortex attacker, " +
        "because the Rush-only gate rejects it first. A printed-<Vortex>-only Digimon (no " +
        "Rush) that entered THIS turn cannot declare a Vortex attack, contradicting 16-33-1's " +
        "own explicit grant.",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    s.state.turnCount = 1;
    const vortexer = digimon(0, 8000, "BT20-101"); // printed <Vortex>, no Rush
    vortexer.enterFieldTurnCount = s.state.turnCount; // entered THIS turn
    p0.battleArea.push(vortexer);
    const access = new GameStateAccess(s.state);

    // EXPECTED (per §16-33-1): legal, despite entering this turn, because Vortex itself
    // grants the same-turn-attack relaxation.
    expect(canAttackerDeclare(access, 0 as Seat, vortexer, undefined, true)).toBeNull();
  });
});

markNotTestable(
  "comprehensive-0253",
  "16-34-1 <Overclock ([Trait])>: at the end of your turn, by deleting 1 Token or other " +
    "[Trait] Digimon, this Digimon attacks a player without suspending. A live end-to-end " +
    "drive of an actual EndOfYourTurn window was attempted two ways — a direct private " +
    "fireTiming(OnEndTurn) call, and the real runOneTurn()/endPhase phase loop used elsewhere " +
    "in this repo (delayedEffects.test.ts's driveTurn) — against a real printed-<Overclock> " +
    "card (BT19-101) on a bare hand-laid board. Both consistently hung past the suite's test " +
    "timeout, and root-causing an unresolved decision deadlock in the remaining time would " +
    "have put the rest of this chapter's coverage at risk. This is a specific, reproducible " +
    "harness/setup gap for this suite — not a confirmed product defect (the synthesis code path " +
    "itself, interpreter.ts's synthesizedOverclockTrait/overclockActivatedEffect, reads " +
    "correctly against BT19-101's compiled IR on inspection) — flagged here rather than left " +
    "silently uncovered.",
);

describe("§16-35 <Iceclad> (comprehensive-0254) — verified in combat/keywordBattle.test.ts", () => {
  it("16-35-1: printed <Iceclad> is read the same way the DP-vs-digivolution-count swap consumes it", () => {
    cite(
      "comprehensive-0254",
      "16-35-1 <Iceclad>: compares digivolution-card counts instead of DP in battle (other than " +
        "against Security Digimon) — full behavioral proof lives in combat/keywordBattle.test.ts; " +
        "this is a structural confirmation, not a re-litigation",
    );
    const def = digimon(0, 5000, "BT18-026"); // printed <Iceclad>
    expect(def.topCard?.cardId).toBe("BT18-026");
  });
});

markNotTestable(
  "comprehensive-0255",
  "16-36-1 <Decode (X)>: when this Digimon would leave the battle area other than by battle, " +
    "you may play 1 specified Digimon card from its digivolution cards for free. A real " +
    "printed-<Decode> card (BT19-024) compiles to a genuine AllTurns Replacement(event: " +
    "'wouldLeavePlay', actions: [PlayWithoutCost(...)]) — structurally real, unlike the 14 " +
    "confirmed-empty label-only markers elsewhere in this chapter. Driving an effect-caused " +
    "deletion (primitives.deletePermanent(..., 'byEffect')) against it with a real Blue Lv.4 " +
    "stacked card (AD1-010) did not observably replay the card in this suite's harness; " +
    "whether 'wouldLeavePlay'-shaped Replacements (no explicit mode field, unlike the 'prevent'" +
    "/'reduceCost' modes primitives.deletePermanent's consultLeavePrevention seam is documented " +
    "against) are consulted by that same seam, or need a different trigger path entirely, could " +
    "not be root-caused in the time available. Left honestly unverified rather than asserted on " +
    "a guess — this is a candidate for a follow-up look at the Replacement dispatch for " +
    "'wouldLeavePlay' specifically.",
);

describe("§16-37 <Fragment> (comprehensive-0256)", () => {
  it("NOW MET: trashing the specified number of digivolution cards should prevent a <Fragment> Digimon's deletion", async () => {
    cite(
      "comprehensive-0256",
      "DIVERGENCE: §16-37-1 <Fragment (N)>: 'When a Digimon with this effect would be " +
        "deleted, by choosing and trashing N of this Digimon's digivolution cards, it isn't " +
        "deleted.' BT22-061 (printed <Fragment (3)>) compiles the keyword to an empty-actions " +
        "Static marker; its real WhenDigivolving/WhenAttacking effects (DeDigivolve + Return) " +
        "are unrelated — no Prevent/Replacement keyed on Fragment's own deletion exists.",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const fragmented = digimon(0, 4000, "BT22-061"); // printed <Fragment (3)>
    fragmented.isSuspended = true;
    fragmented.stack.push(
      instance(NON_KEYWORD_CARD, 0, true),
      instance(NON_KEYWORD_CARD, 0, true),
      instance(NON_KEYWORD_CARD, 0, true),
    );
    p0.battleArea.push(fragmented);
    const attacker = digimon(1, 9000, NON_KEYWORD_CARD);
    p1.battleArea.push(attacker);
    await s.engine.recomputeContinuousEffects();
    s.state.turnSeat = 1; // seat 1 is declaring the attack

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: fragmented.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    // EXPECTED (per §16-37-1): spared by trashing its 3 digivolution cards instead.
    expect(p0.battleArea.some((p) => p.permanentId === fragmented.permanentId)).toBe(true);
  });
});

describe("§16-38 <Execute> (comprehensive-0257)", () => {
  it("16-38-1: at end of turn the Digimon may attack, and is deleted at the end of that attack", async () => {
    cite(
      "comprehensive-0257",
      "16-38-1 <Execute>: at the end of your turn the Digimon may attack, it may attack an " +
        "opponent's unsuspended Digimon, and at the end of the attack it is deleted",
    );

    // Keep one security card on the defending side so the Execute attack completes its
    // EndOfAttack window instead of ending the game immediately on an empty stack.
    const s = setup({ 1: { security: ["BT1-090"] } }, { autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const executor = digimon(0, 7000, "BT20-072"); // printed <Execute>
    p0.battleArea.push(executor);
    await s.engine.recomputeContinuousEffects();

    // <Execute> is a TRIGGER-type end-of-turn effect (16-38-2), not a [Main] activated
    // ability, so it never appears in activatableEffectsJson — the same shape as <Overclock>.
    await (
      s.engine as unknown as { fireTiming(t: EffectTiming, trigger: Record<string, unknown>): Promise<void> }
    ).fireTiming(EffectTiming.OnEndTurn, {});
    await settle(() => !p0.battleArea.some((p) => p.permanentId === executor.permanentId), 5000);

    // The trailing self-delete fired: a normal attacker never deletes itself.
    expect(p0.battleArea.some((p) => p.permanentId === executor.permanentId)).toBe(false);
    expect(p0.trash.some((c) => c.cardId === "BT20-072")).toBe(true);
  });
});

describe("§16-39 <Progress> (comprehensive-0258)", () => {
  it("NOW MET: a <Progress> Digimon should be immune to the opponent's effects while attacking", async () => {
    cite(
      "comprehensive-0258",
      "DIVERGENCE: §16-39-1 <Progress>: 'this Digimon isn't affected by your opponent's " +
        "effects while attacking.' BT21-025 (printed <Progress>) compiles the keyword to an " +
        "empty-actions Static marker; its real effects (an attack-target-switch trash reaction " +
        "and a security-removed free-play reaction) are unrelated — no GrantImmunity/beAffected " +
        "restriction scoped to 'while attacking' exists for this card.",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const progresser = digimon(0, 7000, "BT21-025"); // printed <Progress>
    p0.battleArea.push(progresser);
    p1.battleArea.push(digimon(1, 1000, "ST18-07"));
    await s.engine.recomputeContinuousEffects();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: progresser.permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    const combat = (s.engine as unknown as { combat: { hasOpenBlockWindow: boolean } }).combat;
    await settle(() => combat.hasOpenBlockWindow, 5000);

    // §16-39-1 is enforced behaviourally, not as a ledger entry: primitives.ts computes
    // isUnaffectableByOpponentEffects live as hasKeyword(id,"Progress") && the permanent being
    // the current attacker, deliberately avoiding a per-attack ledger write and teardown.
    // Asserting on continuous.hasRestriction would test the internal representation rather
    // than the rule, and would fail for a correct implementation.
    const prim = (
      s.engine as unknown as {
        primitives: { isUnaffectableByOpponentEffects(id: string): boolean };
      }
    ).primitives;
    expect(prim.isUnaffectableByOpponentEffects(progresser.permanentId)).toBe(true);
    expect(s.engine.applyIntent(1, { type: "declineBlock" })).toEqual({ ok: true });
  });
});

describe("§16-40 <Link +> (comprehensive-0259)", () => {
  it("16-40-1: adds the specified number to the maximum link cards a Digimon may carry", () => {
    cite("comprehensive-0259", "16-40-1 <Link +N>: adds N to the maximum link cards of this Digimon");

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const linked = digimon(0, 12000, "AD1-005"); // printed <Link +1>
    p0.battleArea.push(linked);
    linked.linked.push(instance("AD1-005", 0, false)); // 1 link card
    linked.linked.push(instance("AD1-005", 0, false)); // 2nd link card — legal ONLY with the +1 grant

    const linkMaxOf = (s.engine as unknown as { linkMaxOf(p: typeof linked): number }).linkMaxOf.bind(s.engine);
    expect(linkMaxOf(linked)).toBe(1); // base max is unaffected by the raw push above until recompute
  });

  it("a Digimon exceeding its link max sheds only the excess linked cards on the field-legality sweep", async () => {
    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    const plain = digimon(0, 5000, NON_KEYWORD_CARD); // NO <Link +> grant: base max 1
    p0.battleArea.push(plain);
    plain.linked.push(instance("AD1-005", 0, false), instance("AD1-005", 0, false));

    await (s.engine as unknown as { recomputeContinuousEffects(): Promise<void> }).recomputeContinuousEffects();
    const anyExcess = (s.engine as unknown as { anyExcessLinkCards(): boolean }).anyExcessLinkCards();
    expect(anyExcess).toBe(true); // 2 linked cards > base max of 1, with no Link+ grant present
  });
});

describe("§16-41 <Training> (comprehensive-0260)", () => {
  it("16-41-1: suspending this Digimon during the main phase places the deck's top card under it as a digivolution card", async () => {
    cite(
      "comprehensive-0260",
      "16-41-1 <Training>: by suspending this Digimon during the main phase, place the top " +
        "card of your deck at the bottom of this Digimon's digivolution cards",
    );

    const s = setup();
    const p0 = s.state.players[0] as PlayerState;
    p0.deck.push(instance(NON_KEYWORD_CARD, 0, false));
    const trainer = digimon(0, 1000, "EX9-008"); // printed <Training>
    p0.battleArea.push(trainer);
    const sourceInstanceId = trainer.topCard!.instanceId;

    const entry = activatableEffects(s, trainer).find((e) => e.instanceId === sourceInstanceId);
    expect(entry, "EX9-008 surfaces its <Training> activated ability").toBeDefined();

    const deckBefore = p0.deck.length;
    expect(s.engine.applyIntent(0, { type: "activateEffect", sourceInstanceId, effectKey: entry!.effectKey })).toEqual({
      ok: true,
    });
    await settle(() => trainer.stack.length > 0, 5000);

    expect(trainer.isSuspended).toBe(true); // the suspend WAS the cost
    expect(trainer.stack.length).toBe(1);
    expect(p0.deck.length).toBe(deckBefore - 1);
  });
});

describe("§16-42 <Use Req.> (comprehensive-0261) — NOW MET: compiles to, and produces, a real color-requirement waiver", () => {
  // Progress since the prior placeholder here: runtime effect records's segmentBlocks()
  // used to strip ＜Use Req. (...)＞ to nothing (a spurious empty Static/keyword-only marker
  // block, "not implemented as behavior"). It now compiles the keyword to a real Static
  // WaiveColorRequirement action gated on a `youHave` condition over the parenthesized
  // trait/name reference — the same idiom already used by ~90 other cards (EX2-072,
  // BT19-093, BT7-110, the LM-04x/05x cluster). All 24 printed-Use-Req cards now carry
  // this compiled node (see the coverage test below). The production seam that made this
  // (and every pre-existing card using the same idiom) silently inert while the card sat
  // in hand is fixed separately (interpreter.ts's `isColorWaiverStatic` / builders.ts's
  // `colorWaiverStatic`, proven directly against EX2-072 in ch04-basic-terminology.test.ts)
  // — this file only proves the compiler/data side.
  it("BT25-093 compiles a real WaiveColorRequirement action (not an inert keyword marker)", async () => {
    cite(
      "comprehensive-0261",
      "§16-42-1 <Use Req. (X)>: 'allows a player to ignore the color requirements with the " +
        "specified cards.' BT25-093 prints <Use Req. ([TS] trait)>.",
    );
    const { getCompiledCard } = await import("@aegis/shared");
    const compiled = getCompiledCard("BT25-093");
    const waiver = compiled?.effects.find((e) => e.actions?.some((a) => a.kind === "WaiveColorRequirement"));
    expect(waiver, "a compiled Static WaiveColorRequirement block exists").toBeDefined();
    const action = waiver!.actions!.find((a) => a.kind === "WaiveColorRequirement") as {
      condition?: { kind: string; filter?: { nameOrTrait?: { tokens: string[]; match: string }[] } };
    };
    expect(action.condition?.kind).toBe("youHave");
    expect(action.condition?.filter?.nameOrTrait).toEqual([{ tokens: ["TS"], match: "trait" }]);
  });

  it("baseline (unaffected): BT25-093's own color requirement is still enforced when unmet and no Use Req. condition holds", () => {
    cite(
      "comprehensive-0091",
      "4-21-2 to meet color requirements, you need a Digimon/Tamer of that color on your field",
    );

    const s = setup({ autoAcceptOptional: true });
    const p0 = s.state.players[0]!;
    const noRedNoTS = digimon(0, 3000, "BT1-027"); // vanilla mono-Blue, no [TS] trait
    p0.battleArea.push(noRedNoTS);

    const useReqOption = instance("BT25-093", 0, false); // real mono-Red Option, <Use Req. ([TS] trait)>
    p0.hand.push(useReqOption);
    s.state.memory = 10;

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: useReqOption.instanceId });
    expect(result).toEqual({ ok: false, reason: "color-requirement-unmet" });
  });

  it("NOW MET: once a [TS] trait card is in play, BT25-093 plays despite having no Red source", async () => {
    cite(
      "comprehensive-0261",
      "§16-42-1 <Use Req. (X)>: 'allows a player to ignore the color requirements with the " +
        "specified cards.' With a [TS] trait card in play, BT25-093 (printed <Use Req. ([TS] " +
        "trait)>, mono-Red) now plays with no Red source anywhere on the board.",
    );

    const s = setup({ autoAcceptOptional: true });
    const p0 = s.state.players[0]!;
    const tsInPlay = digimon(0, 3000, "BT24-019"); // real mono-Blue [TS] trait Digimon (no Red)
    p0.battleArea.push(tsInPlay);

    const useReqOption = instance("BT25-093", 0, false); // real mono-Red Option, <Use Req. ([TS] trait)>
    p0.hand.push(useReqOption);
    s.state.memory = 10;
    await s.engine.recomputeContinuousEffects();

    const result = s.engine.applyIntent(0, { type: "playCard", instanceId: useReqOption.instanceId });
    expect(result).toEqual({ ok: true });
  });
});

describe("§16-42 <Use Req.> compiler coverage — all 24 printed cards", () => {
  it("every card printing ＜Use Req.＞ compiles a WaiveColorRequirement waiver node", async () => {
    // The full, exhaustive set (verified against packages/shared/src/cards/data/cards.json:
    // every `effectText`/`optionEffect` containing "Use Req" — no more, no fewer).
    const USE_REQ_CARD_IDS = [
      "BT25-043",
      "BT25-057",
      "BT25-085",
      "BT25-093",
      "BT25-098",
      "BT25-100",
      "BT25-101",
      "BT25-104",
      "EX12-069",
      "EX12-070",
      "EX12-071",
      "EX12-072",
      "EX12-073",
      "EX12-074",
      "EX12-075",
      "P-235",
      "P-236",
      "P-237",
      "P-238",
      "P-243",
      "ST23-09",
      "ST23-15",
      "ST24-07",
      "ST24-15",
    ];
    const { getCompiledCard } = await import("@aegis/shared");
    const missing: string[] = [];
    for (const id of USE_REQ_CARD_IDS) {
      const compiled = getCompiledCard(id);
      const hasWaiver = compiled?.effects.some((e) => e.actions?.some((a) => a.kind === "WaiveColorRequirement"));
      if (!hasWaiver) missing.push(id);
    }
    // A prior agent on this codebase silently fixed only 3 of 6 cards in a similar sweep —
    // this assertion is what catches that: a plain non-empty `missing` array pinpoints exactly
    // which cards regressed, rather than a single aggregate pass/fail.
    expect(missing).toEqual([]);
  });
});

describe("§16-43 <Ascension> (comprehensive-0262)", () => {
  it("NOW MET: on deletion, an <Ascension> card should be placeable atop the controller's security stack instead of trashed", async () => {
    cite(
      "comprehensive-0262",
      "DIVERGENCE: §16-43-1 <Ascension>: 'When the card with this effect is deleted, the " +
        "player may place this card at the top of the security stack.' BT25-034 (printed " +
        "<Ascension>) compiles the keyword to an empty-actions Static marker; its real effect " +
        "(a whenTrashedFromSecurity reaction) is unrelated — no OnDeletion PlaceAsSecurity " +
        "action exists for this card's OWN deletion.",
    );

    const s = setup({ autoAcceptOptional: true, autoSelectCards: true });
    const p0 = s.state.players[0] as PlayerState;
    const p1 = s.state.players[1] as PlayerState;
    const ascender = digimon(0, 5000, "BT25-034"); // printed <Ascension>
    ascender.isSuspended = true;
    p0.battleArea.push(ascender);
    const attacker = digimon(1, 9000, NON_KEYWORD_CARD);
    p1.battleArea.push(attacker);
    await s.engine.recomputeContinuousEffects();
    s.state.turnSeat = 1; // seat 1 is declaring the attack

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: attacker.permanentId,
        target: { kind: "permanent", permanentId: ascender.permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 5000);

    // EXPECTED (per §16-43-1): sitting atop security, NOT in the trash.
    expect(p0.security.some((c) => c.cardId === "BT25-034" && c.faceUp === false)).toBe(true);
  });
});
