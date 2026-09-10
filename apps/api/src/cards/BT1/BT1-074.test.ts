import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-074.js";
describe("BT1-074 Togemon", () => {
  it("matches the catalog and level-filtered reveal IR contract", () => {
    expect(getCardDefinition("BT1-074")).toMatchObject({
      cardId: "BT1-074",
      set: "BT1",
      nameEn: "Togemon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 6,
      dp: 5000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Vegetation"],
      rarity: "R",
      maxCountInDeck: 4,
      imageId: "BT1-074",
      nameJp: "トゲモン",
    });
    expect(getCardDefinition("BT1-074")?.effectText).toBe(
      "[When Digivolving] Reveal 3 cards from the top of your deck. Add 1 level 5 or higher Digimon card among them to your hand. Place the remaining cards at the bottom of your deck in any order.",
    );
    expect(getCardDefinition("BT1-074")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-074")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "RevealAdd",
              revealCount: 3,
              add: [{ filter: { kind: ["Digimon"], levelComparison: { op: "gte", value: 5 } }, count: 1, to: "hand" }],
              rest: "deckBottomAnyOrder",
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("adds a revealed level 5 or higher Digimon when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "base" }],
          hand: [{ card: "BT1-074", as: "evolving" }],
          deck: [{ card: "BT1-009", as: "drawn" }, { card: "BT1-075", as: "eligible" }, "BT1-068", "BT1-069"],
        },
      },
      { autoSelectCards: true },
    );
    const p = s.state.players[0] as PlayerState;
    s.state.memory = 2;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => p.hand.some((c) => c.instanceId === s.inst("eligible").instanceId));
    expect(p.hand.some((c) => c.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(p.deck).toHaveLength(2);
    expect(s.state.memory).toBe(0);
  });

  it("accepts a level 7 Digimon and excludes a level 4 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "base" }],
          hand: [{ card: "BT1-074", as: "evolving" }],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-084", as: "levelSeven" },
            { card: "BT1-070", as: "levelFour" },
            { card: "BT1-085", as: "tamer" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("levelSeven").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("levelFour").instanceId)).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(false);
  });

  it("accepts a non-green level 5 Digimon (Q924)", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "base" }],
          hand: [{ card: "BT1-074", as: "evolving" }],
          deck: [{ card: "BT1-009", as: "drawn" }, { card: "BT1-040", as: "blueLevelFive" }, "BT1-070", "BT1-085"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blueLevelFive").instanceId));

    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("blueLevelFive").instanceId)).toBe(true);
  });

  it("lets the player order the remaining revealed cards at the deck bottom", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-067", as: "base" }],
          hand: [{ card: "BT1-074", as: "evolving" }],
          deck: [
            { card: "BT1-009", as: "drawn" },
            { card: "BT1-075", as: "eligible" },
            { card: "BT1-068", as: "first" },
            { card: "BT1-069", as: "second" },
          ],
        },
      },
      { autoSelectCards: true, autoOrderCards: false },
    );
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "orderCards");
    const decision = s.decisions.at(-1)!.req;
    const order = [s.inst("second").instanceId, s.inst("first").instanceId];

    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "orderCards", order },
      }),
    ).toEqual({ ok: true });
    await settle(
      () =>
        s.state.pendingDecision === undefined &&
        s.state.players[0]!.deck.map((card) => card.instanceId).join(",") === order.join(","),
    );

    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual(order);
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT1-074", as: "togemon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("togemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
