import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, settle, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";
import { compiled } from "./P-248.js";

const cardId = "P-248";

const NAME_MATCH = "BT2-026";
const TEXT_ONLY_MATCH = "BT11-112";
const FREE_TRAIT_MATCH = "BT1-027";
const ARMOR_FORM_MATCH = "BT12-037";
const NON_MATCH = "BT1-009";

const DEMIVEEMON = "ST8-01";
const OTHER_BLUE_EGG = "BT1-003";
const OFF_COLOUR_EGG = "BT1-007";

function neutralDeck(length: number): string[] {
  return Array.from({ length }, () => NON_MATCH);
}

describe("P-248 Veemon", () => {
  it("matches the catalog printed text, stats and evolution costs", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      cardId,
      nameEn: "Veemon",
      colors: ["Blue", "Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 2000,
      forms: ["Rookie"],
      attributes: ["Free"],
      types: ["Mini Dragon"],
      evoCosts: [
        { color: "Blue", level: 2, memoryCost: 1 },
        { color: "Red", level: 2, memoryCost: 1 },
      ],
      effectText:
        "[Digivolve] [DemiVeemon]: Cost 0 \n\n[Start of Your Main Phase] By trashing 1 card with [Veedramon] in its text or the [Armor Form] or [Free] trait from your hand, ＜Draw 1＞ and gain 1 memory.",
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
    });
  });

  it("compiles every printed clause", () => {
    expect(runtimeCompiledCard(cardId)).toMatchObject({ coverage: "full", residual: [] });

    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["DemiVeemon"], cost: 0, isAlternate: true }]);

    const startOfMain = compiled.effects.find((effect) => effect.trigger === "StartOfYourMainPhase")!;
    expect(startOfMain.isInherited).toBeUndefined();
    expect(startOfMain.actions).toHaveLength(1);
    const block = startOfMain.actions[0]!;
    if (block.kind !== "CostGatedBlock") throw new Error("Start-of-Main action is not a CostGatedBlock");
    expect(block).toMatchObject({
      abortOnDecline: true,
      cost: {
        kind: "trash",
        target: {
          count: 1,
          filter: {
            zone: "hand",
            controller: "mine",
            nameOrTrait: [
              { tokens: ["Veedramon"], match: "text" },
              { tokens: ["Armor Form", "Free"], match: "trait", orPrevious: true },
            ],
          },
        },
      },
    });
    expect(block.cost.optional).toBeUndefined();
    expect(block.actions).toEqual([
      { kind: "Draw", controller: "mine", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);

    expect(compiled.effects.find((effect) => effect.isInherited === true)).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [
        {
          kind: "ModifyDP",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          amount: 2000,
          duration: "permanent",
        },
      ],
    });
  });

  it("digivolves from a [DemiVeemon] egg for 0 memory and keeps the egg as its only source", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: DEMIVEEMON, as: "egg" },
        hand: [{ card: cardId, as: "veemon" }],
        deck: [{ card: NON_MATCH, as: "bonusDraw" }],
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("veemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === cardId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("egg").stack.map(({ instanceId }) => instanceId)).toEqual([s.inst("egg").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
  });

  it("refuses the alternate path from an off-colour egg that is not a [DemiVeemon]", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: OFF_COLOUR_EGG, as: "egg" },
        hand: [{ card: cardId, as: "veemon" }],
        deck: neutralDeck(1),
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("veemon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
    expect(s.perm("egg").topCard.cardId).toBe(OFF_COLOUR_EGG);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("veemon").instanceId]);
  });

  it("charges the printed Blue Lv.2 cost from a same-colour egg that is not a [DemiVeemon]", async () => {
    const s = setupEngine({
      0: {
        breeding: { card: OTHER_BLUE_EGG, as: "egg" },
        hand: [{ card: cardId, as: "veemon" }],
        deck: neutralDeck(1),
      },
    });
    s.state.memory = 0;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("egg").permanentId,
        instanceId: s.inst("veemon").instanceId,
        useAlternateCost: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("egg").topCard.cardId === cardId);

    expect(s.state.memory).toBe(-1);
  });

  const DRAWN_SENTINEL = "BT1-013";

  async function runStartOfMain(hand: string[]): Promise<{
    trashed: string[];
    handCardIds: string[];
    memory: number;
  }> {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "veemon" }],
          hand: hand.map((card, index) => ({ card, as: `hand-${index}` })),
          deck: [{ card: DRAWN_SENTINEL, as: "drawn" }, ...neutralDeck(5)],
          security: neutralDeck(2),
        },
        1: { deck: neutralDeck(4), security: neutralDeck(2) },
      },
      { autoSelectCards: true, autoOrderCards: true },
    );
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.pendingDecision === undefined);
    const observed = {
      trashed: s.state.players[0]!.trash.map(({ cardId: id }) => id),
      handCardIds: s.state.players[0]!.hand.map(({ cardId: id }) => id),
      memory: s.state.memory,
    };
    assertNoLoudGap(s);
    advance(s.engine).endMainPhaseIfOpen(0);
    await turn;
    return observed;
  }

  it("trashes nothing and changes no resource when the hand holds no qualifying card", async () => {
    const control = await runStartOfMain([NON_MATCH, NON_MATCH]);

    expect(control.trashed).toEqual([]);
    expect(control.handCardIds).toEqual([NON_MATCH, NON_MATCH]);
  });

  it("trashes a [Free] trait card, draws 1 and gains 1 memory", async () => {
    const control = await runStartOfMain([NON_MATCH]);
    const observed = await runStartOfMain([FREE_TRAIT_MATCH]);

    expect(observed.trashed).toEqual([FREE_TRAIT_MATCH]);
    expect(observed.handCardIds).toEqual([DRAWN_SENTINEL]);
    expect(observed.memory).toBe(control.memory + 1);
  });

  it("trashes a card that carries [Veedramon] only in its printed text", async () => {
    const observed = await runStartOfMain([TEXT_ONLY_MATCH]);

    expect(observed.trashed).toEqual([TEXT_ONLY_MATCH]);
    expect(observed.handCardIds).toEqual([DRAWN_SENTINEL]);
  });

  it("trashes a card named [Veedramon] through the same text reference", async () => {
    const observed = await runStartOfMain([NAME_MATCH]);

    expect(observed.trashed).toEqual([NAME_MATCH]);
  });

  it("trashes an [Armor Form] card", async () => {
    const observed = await runStartOfMain([ARMOR_FORM_MATCH]);

    expect(observed.trashed).toEqual([ARMOR_FORM_MATCH]);
  });

  it("trashes exactly 1 card when the hand holds several qualifying cards", async () => {
    const control = await runStartOfMain([NON_MATCH]);
    const observed = await runStartOfMain([FREE_TRAIT_MATCH, ARMOR_FORM_MATCH, TEXT_ONLY_MATCH]);

    expect(observed.trashed).toHaveLength(1);
    expect(observed.handCardIds).toHaveLength(3);
    expect(observed.handCardIds).toContain(DRAWN_SENTINEL);
    expect(observed.memory).toBe(control.memory + 1);
  });

  it("does not fire on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "veemon" }],
          hand: [{ card: FREE_TRAIT_MATCH, as: "free" }],
          deck: neutralDeck(4),
          security: neutralDeck(2),
        },
        1: { deck: neutralDeck(4), security: neutralDeck(2) },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await s.ready();

    const turn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("free").instanceId]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await turn;
  });

  it("gives its host +2000 DP only during the host controller's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: NAME_MATCH, as: "host", under: [DEMIVEEMON, cardId] }] },
    });
    const baseDP = s.perm("host").baseDP;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(baseDP + 2000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(baseDP);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(baseDP + 2000);
  });

  it("does not grant the inherited bonus without P-248 in the digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: NAME_MATCH, as: "host", under: [DEMIVEEMON] }] },
    });
    const baseDP = s.perm("host").baseDP;
    await s.ready();

    expect(s.perm("host").currentDP).toBe(baseDP);
  });

  it("keeps the inherited bonus after a real digivolution buries P-248 in the stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: cardId, as: "stack", under: [DEMIVEEMON] }],
        hand: [{ card: NAME_MATCH, as: "veedramon" }],
        deck: neutralDeck(4),
      },
    });
    s.state.memory = 6;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("stack").permanentId,
        instanceId: s.inst("veedramon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("stack").topCard.cardId === NAME_MATCH);

    const host = s.perm("stack");
    expect(host.stack.map(({ cardId: id }) => id)).toEqual([DEMIVEEMON, cardId]);
    expect(host.currentDP).toBe(host.baseDP + 2000);
  });

  it("exposes the start-of-main clause as this card's own effect, fired directly", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "veemon" }],
          hand: [{ card: FREE_TRAIT_MATCH, as: "free" }],
          deck: neutralDeck(4),
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 0;
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("veemon"));
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("free").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.memory).toBe(1);
  });
});
