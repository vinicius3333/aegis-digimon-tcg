import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./EX5-017.js";
import "../index.js";

describe("EX5-017 Lekismon", () => {
  it("matches the catalog and has complete IR coverage", () => {
    expect(getCardDefinition("EX5-017")).toMatchObject({
      cardId: "EX5-017",
      nameEn: "Lekismon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [
        { color: "Blue", level: 3, memoryCost: 2 },
        { color: "Red", level: 3, memoryCost: 2 },
      ],
      forms: ["Champion"],
      attributes: ["Data"],
      types: ["Beastkin", "Night Claw"],
      effectText: expect.stringContaining("Reveal the top 3 cards of your deck"),
      inheritedEffectText: "[Opponent's Turn] This Digimon gets +2000 DP.",
    });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
  });

  it("reveals three and adds Night Claw plus Light Fang/Galaxy cards on play and digivolving", () => {
    const effects = compiled.effects?.filter(
      (entry) => entry.trigger === "OnPlay" || entry.trigger === "WhenDigivolving",
    );
    expect(effects).toHaveLength(2);
    expect(effects?.[0]?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        { filter: { nameOrTrait: [{ match: "trait", tokens: ["Night Claw"] }] } },
        { filter: { nameOrTrait: [{ match: "trait", tokens: ["Light Fang", "Galaxy"] }] } },
      ],
    });
  });
  it("grants itself 2000 DP during the opponent's turn when inherited", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "OpponentsTurn",
      isInherited: true,
      actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent", target: { filter: { isSelfRef: true } } }],
    });
  });

  it("adds one card from each matching trait group on play and bottoms the rest", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-017", as: "lekismon" }],
          deck: ["EX5-007", "EX5-016", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lekismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-017"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-016", "EX5-007"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("adds the available Galaxy match even when the Night Claw reveal group is absent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX5-017", as: "lekismon" }],
          deck: ["EX5-073", "BT1-009", "BT1-010"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lekismon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "EX5-017"));

    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-073"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).not.toContain("BT1-009");
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT1-010"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("resolves the same mandatory reveal/add-as-many buckets when digivolving", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX5-016", as: "base" }],
          hand: [{ card: "EX5-017", as: "lekismon" }],
          deck: ["EX5-007", "EX5-016", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 5;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("lekismon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.cardId === "EX5-017");
    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["EX5-016"]);
    expect(s.state.players[0]!.hand.map((card) => card.cardId)).toEqual(["EX5-007", "EX5-016"]);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("takes legal red/blue level-3 routes, including a mixed peer stack, and rejects level 4", async () => {
    const routes: Array<[string, string[]]> = [
      ["EX5-007", []],
      ["EX5-016", ["EX5-007"]],
    ];
    for (const [source, under] of routes) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: source, as: "base", under }],
          hand: [{ card: "EX5-017", as: "lekismon" }],
        },
      });
      await s.ready();
      s.state.memory = 2;
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("lekismon").instanceId,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard?.cardId === "EX5-017");
      expect(s.state.memory).toBe(0);
      expect(s.perm("base").stack.map((card) => card.cardId)).toEqual([...under, source]);
    }

    const illegal = setupEngine({
      0: { battleArea: [{ card: "BT1-014", as: "base" }], hand: [{ card: "EX5-017", as: "lekismon" }] },
    });
    await illegal.ready();
    illegal.state.memory = 2;
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("base").permanentId,
        instanceId: illegal.inst("lekismon").instanceId,
      }).ok,
    ).toBe(false);
    expect(illegal.state.memory).toBe(2);
    expect(illegal.perm("base").topCard?.cardId).toBe("BT1-014");
    expect(illegal.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: illegal.inst("lekismon").instanceId }),
    );
  });

  it("applies the inherited 2000 DP only during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["EX5-017"] }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5_000);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(3_000);
  });
});
