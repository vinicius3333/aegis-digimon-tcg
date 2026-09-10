import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT20-064.js";
import "../BT17/BT17-091.js";
import "./index.js";

describe("BT20-064 Loogamon", () => {
  it("reveals three and adds one SoC/SEEKERS card and one Eiji Nagasumi, bottoming the rest", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            { filter: { nameOrTrait: [{ tokens: ["SoC", "SEEKERS"], match: "trait" }] }, count: 1, to: "hand" },
            { filter: { nameOrTrait: [{ tokens: ["Eiji Nagasumi"], match: "nameExact" }] }, count: 1, to: "hand" },
          ],
        },
      ],
    });
  });

  it("grants inherited +2000 DP during its controller's turn", () => {
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "ModifyDP",
          amount: 2000,
          duration: "permanent",
          target: { filter: { isSelfRef: true }, isSelf: true },
        },
      ],
    });
  });

  it("publishes stats and both exact zero-cost alternate evolution routes", async () => {
    expect(getCardDefinition("BT20-064")).toMatchObject({
      cardId: "BT20-064",
      nameEn: "Loogamon",
      colors: ["Purple", "Red"],
      kinds: ["Digimon"],
      level: 3,
      playCost: 3,
      dp: 1000,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Dark Animal", "X Antibody", "SoC", "SEEKERS"],
      evoCosts: [
        { color: "Red", level: 2, memoryCost: 1 },
        { color: "Yellow", level: 2, memoryCost: 1 },
      ],
      effectText: expect.stringContaining("Eiji Nagasumi"),
      inheritedEffectText: expect.stringContaining("gets +2000 DP"),
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { namesExact: ["Bowmon"], cost: 0, isAlternate: true },
      { level: 2, traits: ["SEEKERS"], cost: 0, isAlternate: true },
    ]);
    for (const [base, requirementIndex] of [
      ["BT14-006", 0],
      ["BT20-003", 1],
    ] as const) {
      const s = setupEngine({
        0: {
          breeding: { card: base, as: "base" },
          hand: [{ card: "BT20-064", as: "loogamon" }],
          deck: ["BT20-047"],
        },
      });
      s.state.memory = 0;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("loogamon").instanceId,
          alternateRequirementIndex: requirementIndex,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "BT20-064");
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([base]);
      expect(s.state.memory).toBe(0);
    }
  });

  it("on play adds a SoC/SEEKERS card and Eiji while bottoming the nonmatch", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-064", as: "loogamon" }],
          deck: ["BT20-070", "BT14-087", "BT20-047"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT14-087", "BT20-070"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT20-047"]);
  });

  it("accepts a card whose Rule Name is exactly Eiji Nagasumi", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-064", as: "loogamon" }],
          deck: ["BT20-070", "BT17-091", "BT20-047"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.cardId).sort()).toEqual(["BT17-091", "BT20-070"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT20-047"]);
  });

  it("applies inherited +2000 only underneath a host on its controller's turn", async () => {
    const ownTurn = setupEngine({
      0: {
        battleArea: [
          { card: "BT20-070", under: ["BT20-064"], as: "host" },
          { card: "BT20-064", as: "standalone" },
        ],
        hand: ["BT1-010"],
      },
      1: {
        battleArea: [{ card: "BT1-010", as: "opponentDummy" }],
        hand: ["BT1-010"],
        deck: ["BT1-010", "BT1-010", "BT1-010", "BT1-010", "BT1-010"],
      },
    });
    const turns = ownTurn.engine.startTurnLoop();
    await advance(ownTurn.engine).waitForMainPhase(0);
    expect(ownTurn.perm("host").currentDP).toBe(8000);
    expect(ownTurn.perm("standalone").currentDP).toBe(1000);
    advance(ownTurn.engine).endMainPhaseIfOpen(0);
    await advance(ownTurn.engine).waitForMainPhase(1);
    expect(ownTurn.perm("host").currentDP).toBe(6000);
    expect(ownTurn.engine.applyIntent(1, { type: "surrender" })).toEqual({ ok: true });
    await turns;
  });

  it("returns all revealed cards to the bottom when neither printed target exists", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT20-064", as: "loogamon" }],
          deck: ["BT20-047", "BT20-057", "BT20-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("loogamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.length === 0 && s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT20-047", "BT20-057", "BT20-009"]);
  });
});
