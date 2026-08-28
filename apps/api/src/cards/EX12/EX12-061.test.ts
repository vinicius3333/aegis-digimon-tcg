import { describe, expect, it } from "vitest";
import { compiledEffects, digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import { compiled } from "./EX12-061.js";

const CARD_ID = "EX12-061";

describe("EX12-061 Hanimon", () => {
  it("maps the Shambala evolution, Puppet/TB payment, and inherited Once Per Turn effect", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["Shambala"], cost: 0, isAlternate: true }]);
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "Draw",
          controller: "mine",
          amount: 2,
          optional: true,
          abortOnDecline: true,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                controller: "mine",
                zone: "hand",
                nameOrTrait: [{ tokens: ["Puppet", "TB"], match: "trait" }],
              },
            },
          },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "WhenAttacking",
      frequency: "OncePerTurn",
      actions: [
        { kind: "Draw", controller: "mine", amount: 1 },
        { kind: "Trash", target: { count: 1, filter: { controller: "mine", zone: "hand" } } },
      ],
    });
    expect(registeredCompiledCards.get(CARD_ID)).toEqual(compiled);
    expect(compiledEffects[CARD_ID]).toEqual(compiled);
  });

  it.each([
    ["Puppet", "BT1-038"],
    ["TB", "EX12-004"],
  ])("trashes a %s card from hand and draws two on play", async (_trait, costCardId) => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "source" },
            { card: costCardId, as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        player.trash.some((card) => card.instanceId === s.inst("cost").instanceId) &&
        player.hand.some((card) => card.cardId === "BT1-010"),
    );

    expect(player.trash.some((card) => card.instanceId === s.inst("cost").instanceId)).toBe(true);
    expect(player.hand.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(player.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID)).toBe(true);
  });

  it("may decline an available On Play payment without trashing or drawing", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: CARD_ID, as: "source" },
            { card: "BT1-038", as: "cost" },
          ],
          deck: ["BT1-009", "BT1-010"],
        },
      },
      { autoAcceptOptional: false, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: s.state.pendingDecision!.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID));

    expect(player.hand.map(({ instanceId }) => instanceId)).toContain(s.inst("cost").instanceId);
    expect(player.deck).toHaveLength(2);
    expect(player.trash).toHaveLength(0);
  });

  it("does not draw when no Puppet/TB payment is available", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: CARD_ID, as: "source" }, "BT1-009"], deck: ["BT1-010", "BT1-011"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => player.battleArea.some((permanent) => permanent.topCard?.cardId === CARD_ID));

    expect(player.hand.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-010", "BT1-011"]);
  });

  it("draws and trashes once from the inherited attack effect", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX12-062", as: "host", under: [CARD_ID] }],
          hand: ["BT1-009"],
          deck: ["BT1-010"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => player.deck.length === 0 && player.trash.length === 1);

    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
    expect(player.hand.some((card) => card.cardId === "BT1-010")).toBe(true);

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle();
    expect(player.hand).toHaveLength(1);
    expect(player.trash).toHaveLength(1);
  });

  it("draws before the mandatory inherited trash when the hand starts empty", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "EX12-062", as: "host", under: [CARD_ID] }], deck: ["BT1-010"] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const player = s.state.players[0]!;

    await advance(s.engine).fire(EffectTiming.OnUseAttack, s.perm("host"));
    await settle(() => player.deck.length === 0 && player.trash.length === 1);

    expect(player.hand).toHaveLength(0);
    expect(player.trash[0]?.cardId).toBe("BT1-010");
  });

  it("uses both normal colors and the Shambala alternate, rejects a nonmatch, and matches the catalog", async () => {
    expect(digivolutionRequirementsFor(CARD_ID)).toEqual([
      { level: 2, traits: ["Shambala"], cost: 0, isAlternate: true },
    ]);
    expect(getCardDefinition(CARD_ID)).toMatchObject({
      nameEn: "Hanimon",
      colors: ["Purple"],
      kinds: ["Digimon"],
      playCost: 3,
      dp: 2000,
      level: 3,
      forms: ["Rookie"],
      attributes: ["Data"],
      types: ["Puppet", "Shambala", "TB"],
      evoCosts: [
        { color: "Purple", level: 2, memoryCost: 0 },
        { color: "Yellow", level: 2, memoryCost: 0 },
      ],
    });
    for (const [baseCardId, useAlternateCost] of [
      ["BT10-006", false],
      ["BT1-005", false],
      ["EX12-002", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === CARD_ID);
      expect(s.state.memory).toBe(0);
    }
    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-003", as: "base" }], hand: [{ card: CARD_ID, as: "target" }] },
    });
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("target").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
