import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX10-052.js";
import "../index.js";

const CARD_ID = "EX10-052";

const PURPLE_LV4 = "BT4-082";
const PURPLE_LV3 = "BT7-067";
const LUCEMON_LV3 = "BT4-115";
const INERT_A = "BT1-009";
const INERT_B = "BT1-013";
const INERT_C = "BT1-014";

describe("EX10-052 Lucemon: Chaos Mode", () => {
  it("records the exact catalog and printed text", () => {
    const definition = getCardDefinition(CARD_ID)!;
    expect(definition).toMatchObject({
      nameEn: "Lucemon: Chaos Mode",
      colors: ["Purple", "Yellow"],
      kinds: ["Digimon"],
      level: 5,
      playCost: 13,
      dp: 13000,
      evoCosts: [
        { color: "Purple", level: 4, memoryCost: 7 },
        { color: "Yellow", level: 4, memoryCost: 7 },
      ],
      forms: ["Ultimate"],
      attributes: ["Virus"],
      types: ["Demon Lord", "Seven Great Demon Lords"],
    });
    expect(definition.effectText).toContain("[Digivolve] [Lucemon]: Cost 5");
    expect(definition.effectText).toContain(
      "[When Digivolving] [When Attacking] By trashing 1 card in your hand, your opponent may delete 1 of their Digimon or Tamers. If this effect didn't delete, ＜Recovery +1 (Deck)＞",
    );
    expect(definition.effectText).toContain(
      "[All Turns] [Once Per Turn] When this Digimon would leave the battle area, your opponent may delete 1 of their Digimon or Tamers. If this effect didn't delete, it doesn't leave.",
    );
    expect(definition.inheritedEffectText ?? "").toBe("");
    expect(definition.securityEffectText ?? "").toBe("");
    expect(definition.isAce ?? false).toBe(false);
  });

  it("compiles every printed clause: the two triggers, the leave replacement and the alternate route", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Lucemon"], cost: 5, isAlternate: true }]);
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) {
      expect(compiled.effects?.find((effect) => effect.trigger === trigger)).toMatchObject({
        cost: { kind: "trash", target: { filter: { zone: "hand", controller: "mine" }, count: 1 } },
        actions: [
          {
            kind: "Delete",
            controller: "opponent",
            target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
            optional: true,
            allowCostWithoutTarget: true,
          },
          {
            kind: "SecurityManipulation",
            op: "addTop",
            controller: "mine",
            source: "deck",
            amount: 1,
            condition: { kind: "ifThisEffectDidNotDelete" },
          },
        ],
      });
    }
    expect(compiled.effects?.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          optional: false,
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Delete",
              controller: "opponent",
              optional: true,
              target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
            },
            { kind: "Prevent", mode: "leavePlay", optional: false, condition: { kind: "ifThisEffectDidNotDelete" } },
          ],
        },
      ],
    });
  });

  it("digivolves for 7 from a Purple Lv.4 and recovers when the opponent has nothing to delete", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_LV4, as: "base" }],
          hand: [
            { card: CARD_ID, as: "lucemon" },
            { card: INERT_A, as: "cost" },
          ],
          deck: [
            { card: INERT_B, as: "bonusDraw" },
            { card: INERT_C, as: "recovery" },
          ],
          security: [{ card: INERT_A, as: "existingSecurity" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    const baseId = s.inst("base").instanceId;
    const lucemonId = s.inst("lucemon").instanceId;
    const permanentId = s.perm("base").permanentId;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId, instanceId: lucemonId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    const p0 = s.state.players[0]!;
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard!.instanceId).toBe(lucemonId);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseId]);
    expect(s.perm("base").currentDP).toBe(13000);
    expect(p0.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(p0.security.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("recovery").instanceId,
      s.inst("existingSecurity").instanceId,
    ]);
    expect(p0.security.every(({ faceUp }) => faceUp === false)).toBe(true);
    expect(p0.deck).toHaveLength(0);
    expect(s.state.pendingDecision ?? null).toBeNull();
  });

  it("does not recover when the opponent deletes one of their own Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_LV4, as: "base" }],
          hand: [
            { card: CARD_ID, as: "lucemon" },
            { card: INERT_A, as: "cost" },
          ],
          deck: [INERT_B, INERT_C],
        },
        1: { battleArea: [{ card: INERT_A, as: "theirs" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;
    const theirsId = s.perm("theirs").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lucemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);

    const p0 = s.state.players[0]!;
    expect(s.state.players[1]!.battleArea.map(({ permanentId }) => permanentId)).not.toContain(theirsId);
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual([INERT_A]);
    expect(p0.security).toHaveLength(0);
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.pendingDecision ?? null).toBeNull();
  });

  it("keeps the trigger silent when the opponent declines the deletion but still recovers", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: PURPLE_LV4, as: "base" }],
          hand: [
            { card: CARD_ID, as: "lucemon" },
            { card: INERT_A, as: "cost" },
          ],
          deck: [INERT_B, { card: INERT_C, as: "recovery" }],
        },
        1: { battleArea: [{ card: INERT_A, as: "theirs" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 7;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lucemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const costChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: costChoice.decisionId,
        response: { kind: "optional", accept: true },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision?.kind === "optional" && s.state.pendingDecision.decisionId !== costChoice.decisionId,
    );
    const deletionChoice = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(1, {
        type: "respondDecision",
        decisionId: deletionChoice.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("recovery").instanceId]);
    expect(s.state.pendingDecision ?? null).toBeNull();
  });

  it("takes the [Lucemon] Cost 5 route from a Lv.3 named Lucemon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: LUCEMON_LV3, as: "base" }],
          hand: [
            { card: CARD_ID, as: "lucemon" },
            { card: INERT_A, as: "cost" },
          ],
          deck: [INERT_B, { card: INERT_C, as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const baseId = s.inst("base").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lucemon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 1);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard!.cardId).toBe(CARD_ID);
    expect(s.perm("base").stack.map(({ instanceId }) => instanceId)).toEqual([baseId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("recovery").instanceId]);
  });

  it.each([
    ["a Purple Lv.4 that is not named Lucemon", PURPLE_LV4],
    ["a Purple Lv.3 that is not named Lucemon", PURPLE_LV3],
  ])("refuses the Cost 5 route from %s", async (_label, base) => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: base, as: "base" }],
          hand: [
            { card: CARD_ID, as: "lucemon" },
            { card: INERT_A, as: "cost" },
          ],
          deck: [INERT_B, INERT_C],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    const baseId = s.inst("base").instanceId;
    const lucemonId = s.inst("lucemon").instanceId;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: lucemonId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
    expect(s.state.memory).toBe(5);
    expect(s.perm("base").topCard!.instanceId).toBe(baseId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toContain(lucemonId);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("fires on a declared attack and recovers when the opponent has nothing to delete", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lucemon" }],
          hand: [{ card: INERT_A, as: "cost" }],
          deck: [{ card: INERT_C, as: "recovery" }, INERT_B],
        },
        1: { security: [INERT_A, INERT_B] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lucemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);

    const p0 = s.state.players[0]!;
    expect(p0.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(p0.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("recovery").instanceId]);
    expect(p0.hand).toHaveLength(0);
    expect(s.perm("lucemon").isSuspended).toBe(true);
    expect(s.state.pendingDecision ?? null).toBeNull();
  });

  it("skips the whole clause when the hand cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lucemon" }],
          hand: [],
          deck: [INERT_C, INERT_B],
        },
        1: { battleArea: [{ card: INERT_A, as: "theirs" }], security: [INERT_A] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lucemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("still skips the deletion offer when the hand cost cannot be paid", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "lucemon" }], hand: [], deck: [INERT_C, INERT_B] },
        1: { battleArea: [{ card: INERT_A, as: "theirs" }], security: [INERT_A] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: s.perm("lucemon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.trash).toHaveLength(0);
  });

  it("Q5135: survives a lost security battle when the opponent has nothing to delete", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lucemon", dp: 1000 }],
          hand: [{ card: INERT_A, as: "cost" }],
          deck: [{ card: INERT_C, as: "recovery" }, INERT_B],
        },
        1: { security: [INERT_B] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lucemonPermanentId = s.perm("lucemon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: lucemonPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => false, 30);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lucemonPermanentId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("cost").instanceId]);
    expect(s.state.players[0]!.security.map(({ instanceId }) => instanceId)).toEqual([s.inst("recovery").instanceId]);
    expect(s.state.pendingDecision ?? null).toBeNull();
  });

  it("Q5135: survives a lost battle when the opponent declines the replacement's deletion", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "lucemon" }], hand: [], deck: [INERT_B, INERT_C] },
        1: { battleArea: [{ card: INERT_A, as: "wall", dp: 20_000, suspended: true }], security: [INERT_A] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lucemonPermanentId = s.perm("lucemon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: lucemonPermanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => false, 40);

    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toContain(lucemonPermanentId);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
  });

  it("Q6039: leaves the battle area when the opponent's deletion did delete", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "lucemon" }], hand: [], deck: [INERT_B, INERT_C] },
        1: {
          battleArea: [
            { card: INERT_A, as: "wall", dp: 20_000, suspended: true },
            { card: INERT_B, as: "fodder" },
          ],
          security: [INERT_A],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const lucemonPermanentId = s.perm("lucemon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: lucemonPermanentId,
        target: { kind: "permanent", permanentId: s.perm("wall").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId }) => permanentId === lucemonPermanentId));

    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.trash).toHaveLength(1);
  });

  it("[All Turns] [Once Per Turn]: the per-turn use resets on the next own turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "lucemon", dp: 1000 }],
          hand: [INERT_A, INERT_B, INERT_C],
          deck: [INERT_A, INERT_B, INERT_C, INERT_A, INERT_B, INERT_C],
          security: [INERT_A],
        },
        1: {
          hand: [INERT_A],
          deck: [INERT_A, INERT_B, INERT_C, INERT_A],
          security: [INERT_B, INERT_B],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    const lucemonPermanentId = s.perm("lucemon").permanentId;

    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: lucemonPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 1);
    await settle(() => false, 30);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lucemonPermanentId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);

    expect(s.perm("lucemon").isSuspended).toBe(false);
    expect(
      s.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: lucemonPermanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.security.length === 0);
    await settle(() => false, 30);
    expect(s.state.players[0]!.battleArea.map(({ permanentId }) => permanentId)).toEqual([lucemonPermanentId]);

    expect(s.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("[Once Per Turn]: the second departure in the same turn is not prevented (structural)", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: CARD_ID, as: "lucemon" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const permanentId = s.perm("lucemon").permanentId;

    await advance(s.engine).verb.deletePermanent([permanentId], "byEffect");
    await settle(() => s.state.pendingDecision === null || s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.battleArea.map(({ permanentId: id }) => id)).toContain(permanentId);

    await advance(s.engine).verb.deletePermanent([permanentId], "byEffect");
    await settle(() => !s.state.players[0]!.battleArea.some(({ permanentId: id }) => id === permanentId));
    expect(s.state.players[0]!.battleArea).toHaveLength(0);
    expect(s.state.players[0]!.trash.map(({ cardId }) => cardId)).toEqual([CARD_ID]);
  });
});
