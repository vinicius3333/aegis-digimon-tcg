import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./EX13-032.js";

const cardId = "EX13-032";

// Inert neutral fixtures (main-deck Digimon, no printed effects of any kind).
const SENTINEL = "BT1-009"; // Red Lv.3, 3000 DP
const NEUTRAL_LV4 = "BT1-014"; // Red Lv.4, 4000 DP — also the illegal evolution source

// Evolution-source fixtures.
//   BT1-051 Reppamon      — Yellow Lv.4 [Holy Beast], NO printed effects: the catalog's printed
//                           Yellow Lv.4 route.
//   BT25-023 Gaogamon     — BLUE Lv.4 [Beast]/[DATA SQUAD]: only the printed
//                           "[Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3" alternate route can
//                           reach Chirinmon from it, because its color does not match.
//   BT1-014 Kokatorimon   — RED Lv.4 with no [DATA SQUAD] trait: the negative that pins the
//                           trait gate (same level, same "wrong colour" as Gaogamon).
const YELLOW_LV4 = "BT1-051";
const DATA_SQUAD_LV4 = "BT25-023";

// "any of your Tamers": BT13-098 Richard Sampson's own effects are [Start of Your Main Phase],
// [Main] and a security-trash trigger, so none of them fire inside these scenarios.
const TAMER = "BT13-098";

// Inherited-clause hosts for "with [Kentaurosmon] in its name".
//   BT3-043  Kentaurosmon — the match.
//   BT22-037 Chirinmon    — the NEAR-match: it prints "[Kentaurosmon]" inside its own effect
//                           TEXT but not in its name, so `match: "name"` must refuse it.
//   BT1-009  Monodramon   — the plain non-match.
const KENTAUROSMON = "BT3-043";
const TEXT_ONLY_KENTAUROSMON = "BT22-037";

// Opponent pair for the [When Digivolving] lock: BT20-031 Liamon's own [When Digivolving] gives
// 1 of ITS controller's opponent's Digimon -3000 DP for the turn, so whether that effect
// activated is observable on the board.
const OPPONENT_LV3 = "BT20-030";
const OPPONENT_LV4 = "BT20-031";

describe("EX13-032 Chirinmon", () => {
  it("matches the catalog printed text, stats and evolution cost", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Chirinmon",
      colors: ["Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 7,
      dp: 7000,
      forms: ["Ultimate"],
      attributes: ["Vaccine"],
      types: ["Holy Beast", "DATA SQUAD"],
      evoCosts: [{ color: "Yellow", level: 4, memoryCost: 3 }],
      effectText:
        "[Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3 \n\n[When Digivolving] [When Attacking] [Once Per Turn] By trashing your top security card or the bottom face-down card from under any of your Tamers, this Digimon unsuspends. After, 1 of your opponent's Digimon can't activate [When Digivolving] effects until their turn ends.\n[All Turns] When this Digimon would leave the battle area, by placing its top stacked card as the top security card, it doesn't leave.",
      inheritedEffectText:
        "[All Turns] [Once Per Turn] When this Digimon with [Kentaurosmon] in its name would leave the battle area, by placing its top stacked card as the top security card, it doesn't leave.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["DATA SQUAD"], cost: 3, isAlternate: true },
    ]);
    expect(compiled.effects.some(({ isSecurity }) => isSecurity)).toBe(false);

    // One printed sentence under two timings: identical bodies, one shared Once Per Turn budget.
    const costs = [
      { kind: "trashSecurityTop", controller: "mine", raw: "By trashing your top security card" },
      {
        kind: "trashBottomFaceDownUnderTamer",
        controller: "mine",
        raw: "By trashing the bottom face-down card from under any of your Tamers",
      },
    ];
    const timings = compiled.effects.filter(
      ({ trigger }) => trigger === "WhenDigivolving" || trigger === "WhenAttacking",
    );
    expect(timings.map(({ trigger }) => trigger)).toEqual(["WhenDigivolving", "WhenAttacking"]);
    for (const effect of timings) {
      expect(effect.frequency).toBe("OncePerTurn");
      expect(effect.sharedUseKey).toBe(timings[0]!.sharedUseKey);
      expect(effect.isInherited).toBeUndefined();
      expect(effect.actions).toMatchObject([
        {
          kind: "Modal",
          choose: 1,
          options: costs.map((cost) => [
            {
              kind: "CostGatedBlock",
              cost,
              optional: true,
              abortOnDecline: true,
              actions: [
                { kind: "Unsuspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
                {
                  kind: "Restrict",
                  target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
                  restriction: "cannotActivateWhenDigivolving",
                  duration: "untilOpponentTurnEnd",
                },
              ],
            },
          ]),
        },
      ]);
    }

    const leaveCost = {
      kind: "place",
      targetIsPermanent: true,
      detachPermanentTop: true,
      target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
      destination: "security",
      position: "top",
    };
    const ownLeave = compiled.effects.find(({ trigger, isInherited }) => trigger === "AllTurns" && !isInherited)!;
    expect(ownLeave.frequency).toBeUndefined();
    expect(ownLeave.actions).toMatchObject([
      {
        kind: "Replacement",
        event: "wouldLeavePlay",
        mode: "prevent",
        sourceFilter: { isSelfRef: true },
        actions: [],
        cost: leaveCost,
      },
    ]);
    // No printed leave cause, so every cause is covered.
    expect((ownLeave.actions[0] as { leaveCause?: string }).leaveCause).toBeUndefined();

    const inherited = compiled.effects.find(({ isInherited }) => isInherited === true)!;
    expect(inherited).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          sourceFilter: { isSelfRef: true, nameOrTrait: [{ tokens: ["Kentaurosmon"], match: "name" }] },
          actions: [],
          cost: leaveCost,
        },
      ],
    });
  });

  // ---------------------------------------------------------------------------
  // [Digivolve] Lv.4 w/[DATA SQUAD] trait: Cost 3, beside the printed Yellow Lv.4 route.
  // ---------------------------------------------------------------------------

  it("digivolves over the printed Yellow Lv.4 route for 3 with the bonus draw and source identity", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: YELLOW_LV4, as: "base" }],
        hand: [{ card: cardId, as: "chirinmon" }],
        deck: [{ card: SENTINEL, as: "bonusDraw" }, SENTINEL],
        security: [SENTINEL, SENTINEL],
      },
      1: { security: [SENTINEL, SENTINEL] },
    });
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirinmon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map(({ cardId: id }) => id)).toEqual([YELLOW_LV4]);
    expect(s.perm("base").currentDP).toBe(7000);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    // No cost was chosen, so nothing was trashed for the [When Digivolving] clause.
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("digivolves off a non-Yellow [DATA SQUAD] Lv.4 through the alternate route and refuses a traitless Lv.4", async () => {
    const legal = setupEngine({
      0: {
        battleArea: [{ card: DATA_SQUAD_LV4, as: "base" }],
        hand: [{ card: cardId, as: "chirinmon" }],
        deck: [SENTINEL, SENTINEL],
      },
    });
    legal.state.memory = 3;
    await legal.ready();
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("chirinmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === cardId);
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("base").stack.map(({ cardId: id }) => id)).toEqual([DATA_SQUAD_LV4]);

    const illegal = setupEngine({
      0: {
        battleArea: [{ card: NEUTRAL_LV4, as: "base" }],
        hand: [{ card: cardId, as: "chirinmon" }],
        deck: [SENTINEL, SENTINEL],
      },
    });
    illegal.state.memory = 3;
    await illegal.ready();
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("chirinmon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(illegal.perm("base").topCard.cardId).toBe(NEUTRAL_LV4);
    // The route was refused, not silently charged (REVIEW-NOTES: useAlternateCost is a preference).
    expect(illegal.state.memory).toBe(3);
    expect(illegal.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      illegal.inst("chirinmon").instanceId,
    ]);
  });

  // ---------------------------------------------------------------------------
  // [When Digivolving] [When Attacking] [Once Per Turn] By trashing your top security card or the
  // bottom face-down card from under any of your Tamers, this Digimon unsuspends. After, 1 of
  // your opponent's Digimon can't activate [When Digivolving] effects until their turn ends.
  // ---------------------------------------------------------------------------

  it("trashes the top security card on digivolution to unsuspend and lock one opposing Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YELLOW_LV4, as: "base", suspended: true }],
          hand: [{ card: cardId, as: "chirinmon" }],
          deck: [SENTINEL, SENTINEL],
          security: [
            { card: SENTINEL, as: "securityTop" },
            { card: NEUTRAL_LV4, as: "securityRest" },
          ],
        },
        1: { battleArea: [{ card: SENTINEL, as: "victim" }], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirinmon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId && !s.perm("base").isSuspended);

    expect(s.perm("base").isSuspended).toBe(false);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("securityRest").instanceId,
    ]);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("securityTop").instanceId, faceUp: true }),
    );
    expect(observe(s.engine).isRestricted(s.perm("victim"), "cannotActivateWhenDigivolving")).toBe(true);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("pays the second printed half with a Tamer's bottom face-down card instead", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: cardId, as: "chirinmon", suspended: true },
            { card: TAMER, as: "tamer", under: [{ card: SENTINEL, as: "tamerCost", faceUp: false }] },
          ],
          security: [{ card: SENTINEL, as: "securityTop" }],
          deck: [SENTINEL, SENTINEL],
        },
        1: { battleArea: [{ card: SENTINEL, as: "victim" }], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, preferOptionIndex: 1, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("chirinmon"), {
      attackerPermanentId: s.perm("chirinmon").permanentId,
    });
    await settle(() => !s.perm("chirinmon").isSuspended);

    expect(s.perm("chirinmon").isSuspended).toBe(false);
    // The Tamer half was chosen, so the security stack is untouched.
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("securityTop").instanceId,
    ]);
    expect(s.perm("tamer").stack).toHaveLength(0);
    expect(s.state.players[0]!.trash).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("tamerCost").instanceId, faceUp: true }),
    );
    expect(observe(s.engine).isRestricted(s.perm("victim"), "cannotActivateWhenDigivolving")).toBe(true);
  });

  it("leaves the board untouched when the cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "chirinmon", suspended: true }],
          security: [{ card: SENTINEL, as: "securityTop" }],
          deck: [SENTINEL, SENTINEL],
        },
        1: { battleArea: [{ card: SENTINEL, as: "victim" }], security: [SENTINEL] },
      },
      { autoDeclineOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("chirinmon"), {
      attackerPermanentId: s.perm("chirinmon").permanentId,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("securityTop").instanceId,
    ]);
    // §15-7-2: nothing after the declined optional processing condition happens.
    expect(s.perm("chirinmon").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("does nothing when neither printed cost half can be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "chirinmon", suspended: true }],
          deck: [SENTINEL, SENTINEL],
        },
        1: { battleArea: [{ card: SENTINEL, as: "victim" }], security: [SENTINEL] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("chirinmon"), {
      attackerPermanentId: s.perm("chirinmon").permanentId,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.perm("chirinmon").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("victim"), "cannotActivateWhenDigivolving")).toBe(false);
  });

  it("spends one Once Per Turn budget across both printed timings and resets next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: YELLOW_LV4, as: "base", suspended: true }],
          hand: [{ card: cardId, as: "chirinmon" }],
          deck: Array.from({ length: 6 }, () => SENTINEL),
          security: [
            { card: SENTINEL, as: "firstCost" },
            { card: SENTINEL, as: "secondCost" },
          ],
        },
        1: { battleArea: [{ card: SENTINEL, as: "victim" }], security: [SENTINEL], deck: [SENTINEL, SENTINEL] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    s.state.memory = 3;
    await s.ready();

    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("chirinmon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.cardId === cardId && !s.perm("base").isSuspended);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("secondCost").instanceId]);

    // The [When Attacking] copy shares the spent budget: the second security card survives.
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("base"), {
      attackerPermanentId: s.perm("base").permanentId,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("secondCost").instanceId]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const nextOwnTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("base"), {
      attackerPermanentId: s.perm("base").permanentId,
    });
    await settle(() => s.state.players[0]!.security.length === 0);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("secondCost").instanceId);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextOwnTurn;
  });

  it("suppresses only the locked Digimon's own [When Digivolving] effect", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "chirinmon", suspended: true }],
          security: [{ card: SENTINEL, as: "securityTop" }],
          deck: [SENTINEL, SENTINEL],
        },
        1: {
          battleArea: [
            { card: OPPONENT_LV3, as: "locked" },
            { card: OPPONENT_LV3, as: "free" },
          ],
          hand: [
            { card: OPPONENT_LV4, as: "lockedEvolution" },
            { card: OPPONENT_LV4, as: "freeEvolution" },
          ],
          deck: [SENTINEL, SENTINEL, SENTINEL, SENTINEL],
        },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("locked").topCard.instanceId);
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("chirinmon"), {
      attackerPermanentId: s.perm("chirinmon").permanentId,
    });
    await settle(() => observe(s.engine).isRestricted(s.perm("locked"), "cannotActivateWhenDigivolving"));
    expect(observe(s.engine).isRestricted(s.perm("free"), "cannotActivateWhenDigivolving")).toBe(false);
    preferred.length = 0;
    preferred.push(s.perm("chirinmon").topCard.instanceId);

    s.state.turnSeat = 1;
    s.state.memory = 4;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("locked").permanentId,
        instanceId: s.inst("lockedEvolution").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("locked").topCard.cardId === OPPONENT_LV4);
    await settle();
    // The locked Digimon's -3000 DP [When Digivolving] effect never activated.
    expect(s.perm("chirinmon").currentDP).toBe(7000);

    s.state.memory = 4;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("free").permanentId,
        instanceId: s.inst("freeEvolution").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("chirinmon").currentDP === 4000);
    expect(s.perm("chirinmon").currentDP).toBe(4000);
  });

  // ---------------------------------------------------------------------------
  // [All Turns] When this Digimon would leave the battle area, by placing its top stacked card
  // as the top security card, it doesn't leave.
  // ---------------------------------------------------------------------------

  it("stays in the battle area by promoting its stack and placing itself on top of security", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "chirinmon", under: [{ card: YELLOW_LV4, as: "promoted" }] }],
          security: [{ card: SENTINEL, as: "oldTop" }],
          deck: [SENTINEL, SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL, SENTINEL] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const chirinmonInstanceId = s.perm("chirinmon").topCard.instanceId;
    const permanentId = s.perm("chirinmon").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId: id }) => id)).toEqual([permanentId]);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("promoted").instanceId);
    expect(s.state.players[0]!.battleArea[0]!.stack).toHaveLength(0);
    expect(s.state.players[0]!.battleArea[0]!.currentDP).toBe(4000);
    expect(
      s.state.players[0]!.security.map(({ instanceId, faceUp }) => ({ instanceId, faceUp: faceUp === true })),
    ).toEqual([
      { instanceId: chirinmonInstanceId, faceUp: false },
      { instanceId: s.inst("oldTop").instanceId, faceUp: false },
    ]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  // One board, two other printed leave causes: the clause names none, so each is covered.
  const seedStackedChirinmon = (): ReturnType<typeof setupEngine> =>
    setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "chirinmon", under: [{ card: YELLOW_LV4, as: "promoted" }] }],
          security: [SENTINEL],
          deck: [SENTINEL, SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL, SENTINEL] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );

  it("prevents battle deletion the same way", async () => {
    const s = seedStackedChirinmon();
    await s.ready();
    const permanentId = s.perm("chirinmon").permanentId;
    const chirinmonInstanceId = s.perm("chirinmon").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byBattle")).toBe(0);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId: id }) => id)).toEqual([permanentId]);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(chirinmonInstanceId);
  });

  it("prevents a return to the hand the same way", async () => {
    const s = seedStackedChirinmon();
    await s.ready();
    const permanentId = s.perm("chirinmon").permanentId;
    const chirinmonInstanceId = s.perm("chirinmon").topCard.instanceId;

    await advance(s.engine).verb.returnToHand([chirinmonInstanceId]);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId: id }) => id)).toEqual([permanentId]);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(chirinmonInstanceId);
  });

  it("leaves when it has no stacked card to place", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "chirinmon" }],
          security: [{ card: SENTINEL, as: "securityTop" }],
          deck: [SENTINEL, SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL, SENTINEL] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const chirinmonInstanceId = s.perm("chirinmon").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([s.perm("chirinmon").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([chirinmonInstanceId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("securityTop").instanceId,
    ]);
  });

  it("may be repeated within one turn: the main clause prints no Once Per Turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: cardId,
              as: "chirinmon",
              under: [
                { card: SENTINEL, as: "bottomStack" },
                { card: YELLOW_LV4, as: "promoted" },
              ],
            },
          ],
          security: [SENTINEL],
          deck: [SENTINEL, SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL, SENTINEL] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("chirinmon").permanentId;

    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(0);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("promoted").instanceId);

    // Second leave in the SAME turn: the promoted Reppamon has no such clause, so it leaves —
    // but the Chirinmon copy now in the stack does not gate the first prevention either.
    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.security[0]!.cardId).toBe(cardId);
  });

  // ---------------------------------------------------------------------------
  // Inherited [All Turns] [Once Per Turn] "this Digimon with [Kentaurosmon] in its name".
  // ---------------------------------------------------------------------------

  it("keeps a [Kentaurosmon] host in play once per turn and lets the second leave resolve", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: KENTAUROSMON, as: "host", under: [{ card: YELLOW_LV4, as: "bottomStack" }, cardId] }],
          security: [{ card: SENTINEL, as: "oldTop" }],
          deck: [SENTINEL, SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL, SENTINEL] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("host").permanentId;
    const hostInstanceId = s.perm("host").topCard.instanceId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(0);
    advance(s.engine).verb.leaveEffectResolution();
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.battleArea.map(({ permanentId: id }) => id)).toEqual([permanentId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      hostInstanceId,
      s.inst("oldTop").instanceId,
    ]);
    // The promoted top card is the Chirinmon that granted the prevention.
    expect(s.state.players[0]!.battleArea[0]!.topCard.cardId).toBe(cardId);

    // Second leave in the same turn: the Once Per Turn budget is spent, and the promoted
    // Chirinmon's OWN clause pays with its remaining stack card instead.
    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(0);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("bottomStack").instanceId);
    expect(s.state.players[0]!.security.map(({ cardId: id }) => id)).toEqual([cardId, KENTAUROSMON, SENTINEL]);
  });

  it("spends the inherited Once Per Turn budget even when the promoted card keeps the name", async () => {
    const s = setupEngine(
      {
        0: {
          // Stack, bottom-most first: the granting Chirinmon, then a second Kentaurosmon, so the
          // promoted top card still satisfies "with [Kentaurosmon] in its name". Only the printed
          // [Once Per Turn] can stop the second prevention.
          battleArea: [{ card: KENTAUROSMON, as: "host", under: [cardId, { card: KENTAUROSMON, as: "spare" }] }],
          security: [{ card: SENTINEL, as: "oldTop" }],
          deck: [SENTINEL, SENTINEL],
        },
        1: { security: [SENTINEL], deck: [SENTINEL, SENTINEL] },
      },
      { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("host").permanentId;
    const firstHostInstanceId = s.perm("host").topCard.instanceId;

    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(0);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea[0]!.topCard.instanceId).toBe(s.inst("spare").instanceId);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(firstHostInstanceId);

    // Same turn, same granting Chirinmon, still a [Kentaurosmon]-named host: the budget is spent.
    expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual(
      expect.arrayContaining([KENTAUROSMON, cardId]),
    );
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
      firstHostInstanceId,
      s.inst("oldTop").instanceId,
    ]);
  });

  it("refuses a host that only prints [Kentaurosmon] in its text, and a plain host", async () => {
    for (const host of [TEXT_ONLY_KENTAUROSMON, SENTINEL]) {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: host, as: "host", under: [cardId] }],
            security: [{ card: SENTINEL, as: "securityTop" }],
            deck: [SENTINEL, SENTINEL],
          },
          1: { security: [SENTINEL], deck: [SENTINEL, SENTINEL] },
        },
        { autoAcceptOptional: true, autoChooseOption: true, autoSelectCards: true },
      );
      await s.ready();
      const permanentId = s.perm("host").permanentId;

      advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
      expect(await advance(s.engine).verb.deletePermanent([permanentId], "byEffect")).toBe(1);
      advance(s.engine).verb.leaveEffectResolution();
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.battleArea).toHaveLength(0);
      expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([
        s.inst("securityTop").instanceId,
      ]);
      expect(s.state.players[0]!.trash.map(({ cardId: id }) => id)).toEqual(expect.arrayContaining([host, cardId]));
    }
  });
});
