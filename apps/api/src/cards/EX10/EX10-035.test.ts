import { describe, it, expect } from "vitest";
import { EffectTiming, getCardDefinition, type CardInstance } from "@aegis/shared";
import { effectsOf } from "../../engine/effects/collect.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import type { CardSource } from "../../engine/effects/CardSource.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./EX10-035.js";
import "../index.js"; // register compiled cards so the real play / attack / turn-loop paths run

/**
 * EX10-035 Machinedramon (Black, Lv.6 Mega, [Machine]/[Dark Masters], play cost 11, 11000 DP,
 * no digivolution requirements).
 *
 *   [Hand] [Main] If you don't have any Digimon other than Digimon with [Dark Masters] in
 *                 their texts, you may play this card with the play cost reduced by 5. At turn
 *                 end, delete the Digimon this effect played.
 *   [On Play] [When Attacking] ＜De-Digivolve 2＞ 2 of your opponent's Digimon.
 *   [All Turns] This Digimon can only digivolve into [Apocalymon].
 *   [On Deletion] If you have no black face-up security cards, place this Digimon face up as
 *                 the bottom security card.
 *   [Security] If this card was face-up, you may play 1 level 5 or lower card with
 *              [Dark Masters] in its text from your hand or trash without paying the cost.
 *
 * Every clause below is driven from a public intent (playCard, attack, digivolve,
 * activateEffect) or the real turn loop. No `advance.fire*` / `fireTiming` injection.
 *
 * Fixture vocabulary
 * - BT15-072 Vilemon: level 4, trait [Evil], name Vilemon — carries "[Dark Masters]" ONLY in
 *   its effect text. It is the KB Q5104 lever for "with [X] in its text".
 * - BT15-066 Machinedramon: carries the [Dark Masters] TRAIT (a same-name, different-print
 *   peer used only as a board body).
 * - BT1-009 / BT1-013 (Lv.3), BT1-014 (Lv.4), BT1-020 (Lv.5): inert main-deck Digimon with no
 *   effect, inherited or security text, so they can neither open a decision nor change a
 *   result.
 * - BT15-102 Apocalymon (Lv.7, Black Lv.6 evo cost 6) and BT12-057 Quartzmon (Lv.7, Black
 *   Lv.6 evo cost 6): the allowed and the refused digivolve target.
 */

/** The OnDeclaration effectKey for the card's [Hand] [Main] reduced-cost play. */
function reducedCostPlayEffectKey(s: EngineSetup, instance: CardInstance): string {
  const source = (s.engine as unknown as { cardSourceOf(i: CardInstance): CardSource }).cardSourceOf(instance);
  const found = effectsOf(EffectTiming.OnDeclaration, source).find((e) => e.effectKey.startsWith("EX10-035/"));
  if (found === undefined) throw new Error("EX10-035 surfaces no [Hand] [Main] activated effect");
  return found.effectKey;
}

function onField(s: EngineSetup, instanceId: string): boolean {
  return s.state.players[0]!.battleArea.some((p) => p.topCard?.instanceId === instanceId);
}

function topsOf(s: EngineSetup, seat: 0 | 1): string[] {
  return s.state.players[seat]!.battleArea.map(({ topCard }) => topCard?.cardId ?? "");
}

describe("EX10-035 Machinedramon — catalog and compiled clauses", () => {
  it("records the exact catalog facts and every printed executable clause", () => {
    const definition = getCardDefinition("EX10-035")!;
    expect(definition).toMatchObject({
      cardId: "EX10-035",
      nameEn: "Machinedramon",
      colors: ["Black"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 11000,
      evoCosts: [],
      forms: ["Mega"],
      attributes: ["Virus"],
      types: ["Machine", "Dark Masters"],
      maxCountInDeck: 4,
    });
    // The card has no inherited effect; its Security text is the free-play clause.
    expect(definition.inheritedEffectText ?? "").toBe("");
    expect(definition.securityEffectText).toContain("If this card was face-up");
    expect(definition.effectText).toContain("＜De-Digivolve 2＞ 2 of your opponent's Digimon");

    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(registeredCompiledCards.get("EX10-035")).toEqual(compiled);
    expect(compiled.effects.map(({ trigger }) => trigger)).toEqual([
      "Main",
      "OnPlay",
      "WhenAttacking",
      "AllTurns",
      "OnDeletion",
      "Security",
    ]);
    // The turn-end self-delete belongs to the reduced-cost play, not to [On Play] (KB Q5737).
    expect(compiled.effects[0]!.isFromHand).toBe(true);
    expect(compiled.effects[0]!.actions.map(({ kind }) => kind)).toEqual(["PlayWithoutCost", "DelayedDeletePlayed"]);
    expect(compiled.effects[1]!.actions.map(({ kind }) => kind)).toEqual(["DeDigivolve"]);
  });
});

describe("EX10-035 — [Hand] [Main] reduced-cost play", () => {
  it("plays this card from hand for 11 − 5 with only a [Dark Masters]-text Digimon out (KB Q5104)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-035", as: "machine" }],
          // Q5104: Vilemon carries [Dark Masters] only in its EFFECT TEXT — no name, no trait —
          // and still counts as a "Digimon with [Dark Masters] in their texts", so the gate holds.
          battleArea: [{ card: "BT15-072", as: "textOnly" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const machineId = s.inst("machine").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: machineId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("machine")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, machineId));

    expect(onField(s, machineId)).toBe(true);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0); // 6 − (11 − 5)
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
    // REVERT-CONFIRM-RED: drop `reduceCostBy: 5` => the play costs 11 => memory ends at −5.
  });

  it("activates with no Digimon at all (KB Q5109)", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "EX10-035", as: "machine" }] } },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const machineId = s.inst("machine").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: machineId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("machine")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, machineId));

    expect(onField(s, machineId)).toBe(true);
    expect(s.state.memory).toBe(0);
  });

  it("does not play for the reduced cost while a non-[Dark Masters] Digimon is out", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-035", as: "machine" }],
          battleArea: [{ card: "BT1-009", as: "plain" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 6;
    const machineId = s.inst("machine").instanceId;

    s.engine.applyIntent(0, {
      type: "activateEffect",
      sourceInstanceId: machineId,
      effectKey: reducedCostPlayEffectKey(s, s.inst("machine")),
    });
    await settle();

    expect(onField(s, machineId)).toBe(false);
    expect(s.state.players[0]!.hand.map((c) => c.instanceId)).toEqual([machineId]);
    expect(s.state.memory).toBe(6);
    // REVERT-CONFIRM-RED: drop the `excludeNameOrTrait` rejection => `youHaveNone` holds =>
    // EX10-035 is played.
  });

  it("deletes the Digimon this effect played at its own turn end through the real turn loop (KB Q5737)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-035", as: "machine" }, "BT1-014"],
          battleArea: [{ card: "BT15-066", as: "bystander" }],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"], security: ["BT1-009", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const machineId = s.inst("machine").instanceId;
    const bystanderId = s.perm("bystander").topCard!.instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: machineId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("machine")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, machineId));
    expect(onField(s, machineId)).toBe(true);

    // The production turn loop closes the turn — no injected OnEndTurn.
    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(onField(s, machineId)).toBe(false);
    // It left the battle area, so its own [On Deletion] clause ran: with no black face-up
    // security card it is placed face up at the bottom of security.
    const security = s.state.players[0]!.security;
    expect(security.map((c) => c.instanceId).at(-1)).toBe(machineId);
    expect(security.at(-1)!.faceUp).toBe(true);
    // Only the Digimon THIS effect played is deleted; the bystander survives.
    expect(onField(s, bystanderId)).toBe(true);
    // REVERT-CONFIRM-RED: drop the `DelayedDeletePlayed` action => EX10-035 survives turn end.

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("leaves a normally played copy alive through its own turn end (the gate on Q5737)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-035", as: "machine" }, "BT1-014"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-020", as: "victim", under: ["BT1-009", "BT1-014"] }],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const machineId = s.inst("machine").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 11;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: machineId })).toEqual({ ok: true });
    await settle(() => onField(s, machineId) && s.state.pendingDecision === undefined);
    expect(s.state.memory).toBe(0); // full printed cost, no reduction on a normal play

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    expect(onField(s, machineId)).toBe(true);
    // REVERT-CONFIRM-RED: move `DelayedDeletePlayed` back under OnPlay => the normal play arms
    // the delete => EX10-035 is deleted here. This is the lever binding the delete to the
    // reduced-cost [Hand] [Main] play alone (Q5737).

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-035 — [On Play] / [When Attacking] ＜De-Digivolve 2＞ on 2 opposing Digimon", () => {
  it("De-Digivolves exactly 2 of the opponent's Digimon by 2 when played from hand", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-035", as: "machine" }, "BT1-014"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
        1: {
          battleArea: [
            { card: "BT1-020", as: "victimA", under: ["BT1-009", "BT1-014"] },
            { card: "BT1-020", as: "victimB", under: ["BT1-013", "BT1-014"] },
            { card: "BT1-020", as: "spared", under: ["BT1-009", "BT1-014"] },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("victimA").topCard!.instanceId, s.perm("victimB").topCard!.instanceId);
    const machineId = s.inst("machine").instanceId;
    s.state.memory = 11;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: machineId })).toEqual({ ok: true });
    await settle(() => s.perm("victimA").topCard!.cardId !== "BT1-020" && s.state.pendingDecision === undefined);

    // Two sources peeled off each chosen Digimon: Lv.5 -> Lv.4 -> Lv.3, and the peeled tops
    // went to their owner's trash.
    expect(s.perm("victimA").topCard!.cardId).toBe("BT1-009");
    expect(s.perm("victimA").stack).toHaveLength(0);
    expect(s.perm("victimA").currentDP).toBe(3000);
    expect(s.perm("victimB").topCard!.cardId).toBe("BT1-013");
    expect(s.perm("victimB").stack).toHaveLength(0);
    // Exactly 2 — the third Digimon is untouched.
    expect(s.perm("spared").topCard!.cardId).toBe("BT1-020");
    expect(s.perm("spared").stack.map((c) => c.cardId)).toEqual(["BT1-009", "BT1-014"]);
    expect(s.state.players[1]!.trash.map((c) => c.cardId).sort()).toEqual(["BT1-014", "BT1-014", "BT1-020", "BT1-020"]);
    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.events.some((e) => e.kind === "actionRejected")).toBe(false);
    // REVERT-CONFIRM-RED: drop the OnPlay `DeDigivolve` action => both victims keep BT1-020 on top.
  });

  it("De-Digivolves again on a real attack declaration ([When Attacking])", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-035", as: "machine" }] },
        1: {
          battleArea: [
            { card: "BT1-020", as: "victimA", under: ["BT1-009", "BT1-014"] },
            { card: "BT1-020", as: "victimB", under: ["BT1-013", "BT1-014"] },
            { card: "BT1-020", as: "spared", under: ["BT1-009", "BT1-014"] },
          ],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("victimA").topCard!.instanceId, s.perm("victimB").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.perm("victimA").topCard!.cardId).toBe("BT1-009");
    expect(s.perm("victimB").topCard!.cardId).toBe("BT1-013");
    expect(s.perm("spared").topCard!.cardId).toBe("BT1-020");
    // One security card was checked by the attack; the attacker survives.
    expect(s.state.players[1]!.security).toHaveLength(1);
    expect(topsOf(s, 0)).toEqual(["EX10-035"]);
    // REVERT-CONFIRM-RED: drop the WhenAttacking `DeDigivolve` action => the victims keep BT1-020.
  });

  it("stops at level 3: a Lv.4 top over a single Lv.3 source loses only that one source", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "EX10-035", as: "machine" }] },
        1: {
          battleArea: [
            { card: "BT1-014", as: "shallow", under: ["BT1-009"] },
            { card: "BT1-020", as: "deep", under: ["BT1-013", "BT1-014"] },
          ],
          security: ["BT1-009", "BT1-013"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    await s.ready();
    preferred.push(s.perm("shallow").topCard!.instanceId, s.perm("deep").topCard!.instanceId);

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // ＜De-Digivolve＞ never demotes past a level 3 top, so the Lv.4 host peels once and stops.
    expect(s.perm("shallow").topCard!.cardId).toBe("BT1-009");
    expect(s.perm("shallow").stack).toHaveLength(0);
    // The deeper stack takes the full 2.
    expect(s.perm("deep").topCard!.cardId).toBe("BT1-013");
    expect(s.perm("deep").stack).toHaveLength(0);
  });
});

describe("EX10-035 — [All Turns] this Digimon can only digivolve into [Apocalymon]", () => {
  it("allows [Apocalymon] and refuses another otherwise legal level 7 through the digivolve intent", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-035", as: "machine" }],
          hand: [
            { card: "BT15-102", as: "apocalymon" },
            { card: "BT12-057", as: "quartzmon" },
          ],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    await s.ready();
    s.state.memory = 8;
    const host = s.perm("machine");

    // BT12-057 Quartzmon prints a Black Lv.6 evolution cost, so only the [All Turns] clause
    // stands between it and a legal digivolve.
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("quartzmon").instanceId,
      }),
    ).toMatchObject({ ok: false });
    expect(s.perm("machine").topCard!.cardId).toBe("EX10-035");

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("machine").topCard!.cardId === "BT15-102");
    expect(s.perm("machine").stack.map((c) => c.cardId)).toEqual(["EX10-035"]);
    // REVERT-CONFIRM-RED: drop the AllTurns `RestrictDigivolveInto` action => Quartzmon is
    // accepted.
  });

  it("still deletes the played host at turn end after it digivolved, the turn player choosing the order (KB Q5110/Q5738)", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX10-035", as: "machine" }, { card: "BT15-102", as: "apocalymon" }, "BT1-014"],
          deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"],
          trash: ["BT1-013"],
        },
        1: { deck: ["BT1-012", "BT1-013", "BT1-014", "BT1-009"], security: ["BT1-009", "BT1-014"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoChooseOption: true },
    );
    const machineId = s.inst("machine").instanceId;

    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 6;
    expect(
      s.engine.applyIntent(0, {
        type: "activateEffect",
        sourceInstanceId: machineId,
        effectKey: reducedCostPlayEffectKey(s, s.inst("machine")),
      }),
    ).toEqual({ ok: true });
    await settle(() => onField(s, machineId));
    const host = s.state.players[0]!.battleArea.find(({ topCard }) => topCard?.instanceId === machineId)!;

    s.state.memory = 8;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: host.permanentId,
        instanceId: s.inst("apocalymon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("machine").topCard!.cardId === "BT15-102");

    expect(s.engine.applyIntent(0, { type: "endPhase" })).toEqual({ ok: true });
    await advance(s.engine).waitForMainPhase(1);

    // The whole stack left the battle area: "the Digimon this effect played" is the permanent,
    // which the digivolve did not replace.
    expect(s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === host.permanentId)).toBe(false);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toEqual(expect.arrayContaining(["BT15-102"]));
    // Q5110/Q5738: the delayed delete and Apocalymon's [End of Your Turn] are simultaneous
    // pending processing, so the TURN PLAYER is asked for the order rather than the engine
    // fixing one.
    const orderPrompts = s.decisions.filter(({ req }) => req.kind === "orderTriggers");
    expect(orderPrompts.length).toBeGreaterThan(0);
    expect(orderPrompts.every(({ seat }) => seat === 0)).toBe(true);
    expect(orderPrompts.some(({ req }) => (req.options?.triggerKeys ?? []).length > 1)).toBe(true);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});

describe("EX10-035 — [On Deletion] face-up security placement", () => {
  it("places itself face up as the BOTTOM security card after losing a real battle (KB Q5105)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-035", as: "machine" }],
          security: [
            { card: "BT1-009", as: "secTop" },
            { card: "BT1-014", as: "secSecond" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const machineId = s.perm("machine").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.some((c) => c.instanceId === machineId));

    const security = s.state.players[0]!.security;
    expect(security.map((c) => c.instanceId)).toEqual([
      s.inst("secTop").instanceId,
      s.inst("secSecond").instanceId,
      machineId,
    ]);
    // Q5105: the placed card stays revealed; the pre-existing cards stay face down.
    expect(security[2]!.faceUp).toBe(true);
    expect(security.slice(0, 2).every((c) => c.faceUp !== true)).toBe(true);
    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).not.toContain(machineId);
    // REVERT-CONFIRM-RED: drop `toTop: false` => the card lands on TOP of security and the
    // exact-order assertion fails; drop `faceUp: true` => the faceUp assertion fails.
  });

  it("goes to the trash instead when a black face-up security card already exists", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX10-035", as: "machine" }],
          security: [{ card: "EX10-035", faceUp: true }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "wall", dp: 20_000, suspended: true }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const machineId = s.perm("machine").topCard!.instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("machine").permanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.some((c) => c.instanceId === machineId));

    expect(s.state.players[0]!.trash.map((c) => c.instanceId)).toContain(machineId);
    expect(s.state.players[0]!.security).toHaveLength(1);
    // REVERT-CONFIRM-RED: drop the `youHaveNone` black-face-up-security condition => the card
    // is placed into security and this assertion fails.
  });
});

describe("EX10-035 — [Security] free play", () => {
  it("plays a level 5 or lower [Dark Masters]-text card from hand and then battles (KB Q5104/Q5106/Q5107/Q6512)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          // Q5104: BT15-072 Vilemon has [Dark Masters] only in its effect text.
          hand: [{ card: "BT15-072", as: "freePlay" }],
          security: [{ card: "EX10-035", as: "guard", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const guardId = s.inst("guard").instanceId;
    const attackerId = s.perm("attacker").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: attackerId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // Q5107: the [Security] effect triggered on the face-up card's check, and it resolved for
    // free (no memory moved for the defender's play).
    expect(topsOf(s, 1)).toContain("BT15-072");
    expect(s.state.players[1]!.hand).toHaveLength(0);
    // Q6512 / Q5106: the check ran normally with the card revealed and it then BATTLED —
    // 11000 DP deletes the 3000 DP attacker, and the security Digimon goes to the trash.
    expect(s.state.players[0]!.battleArea.some((p) => p.permanentId === attackerId)).toBe(false);
    expect(s.state.players[0]!.trash.map((c) => c.cardId)).toContain("BT1-009");
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).toContain(guardId);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });

  it("plays the same card from the trash", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          trash: [{ card: "BT15-072", as: "freePlay" }],
          security: [{ card: "EX10-035", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.some(({ topCard }) => topCard?.cardId === "BT15-072"));

    expect(topsOf(s, 1)).toContain("BT15-072");
    expect(s.state.players[1]!.trash.map((c) => c.instanceId)).not.toContain(s.inst("freePlay").instanceId);
  });

  it("does nothing when the card was checked face down (KB Q5111)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          hand: [{ card: "BT15-072", as: "freePlay" }],
          security: [{ card: "EX10-035", faceUp: false }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    // Q5111: "if this card was face-up" is met only when the card is face-up in security AS IT
    // IS CHECKED. A face-down check leaves the hand card alone.
    expect(s.state.players[1]!.hand.map((c) => c.instanceId)).toEqual([s.inst("freePlay").instanceId]);
    expect(topsOf(s, 1)).not.toContain("BT15-072");
  });

  it("refuses a level 6 [Dark Masters] card and a low-level card with no [Dark Masters] text", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-009", as: "attacker" }] },
        1: {
          // BT15-066 is level 6 (over the bound); BT1-013 carries no [Dark Masters] text at all.
          hand: [
            { card: "BT15-066", as: "tooHigh" },
            { card: "BT1-013", as: "noText" },
          ],
          security: [{ card: "EX10-035", faceUp: true }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking() && s.state.pendingDecision === undefined);

    expect(s.state.players[1]!.hand.map((c) => c.cardId).sort()).toEqual(["BT1-013", "BT15-066"]);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
