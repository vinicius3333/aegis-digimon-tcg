import { describe, expect, it } from "vitest";
import { compiledEffects, digivolutionRequirementsFor, getCardDefinition } from "@aegis/shared";
import { compiled } from "./EX12-053.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("EX12-053 Hagurumon", () => {
  it("reveals three and adds one matching Machine/Cyborg/Mutant and one ME card", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0];

    expect(action).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom" });
    expect(action).toMatchObject({
      add: [
        {
          count: 1,
          to: "hand",
          filter: { nameOrTrait: [{ match: "trait", tokens: ["Machine", "Cyborg", "Mutant"] }] },
        },
        { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "trait", tokens: ["ME"] }] } },
      ],
    });
  });

  it("retains inherited Blocker and the alternate ME evolution", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toContainEqual({
      keyword: "Blocker",
      raw: "＜Blocker＞",
    });
    expect(digivolutionRequirementsFor("EX12-053")).toEqual([{ level: 2, traits: ["ME"], cost: 0, isAlternate: true }]);
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(registeredCompiledCards.get("EX12-053")).toEqual(compiled);
    expect(compiledEffects["EX12-053"]).toEqual(compiled);
  });

  it("reveals three cards, adds distinct Machine and ME cards, and bottoms the remainder", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-053", as: "hagurumon" }],
          deck: ["EX12-054", "EX12-008", "BT1-009"],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.hand.some((card) => card.cardId === "EX12-054"));

    const player = s.state.players[0]!;
    expect(player.hand.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX12-054", "EX12-008"]));
    expect(player.deck.map((card) => card.cardId)).toEqual(["BT1-009"]);
  });

  it("never adds the same physical card twice when it matches both reveal slots", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-053", as: "hagurumon" }],
          deck: [
            { card: "EX12-053", as: "dualMatch" },
            { card: "BT1-009", as: "restOne" },
            { card: "BT1-010", as: "restTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("dualMatch").instanceId),
    );

    expect(
      s.state.players[0]!.hand.filter(({ instanceId }) => instanceId === s.inst("dualMatch").instanceId),
    ).toHaveLength(1);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("restOne").instanceId,
      s.inst("restTwo").instanceId,
    ]);
  });

  it("adds the available category and bottoms every nonmatch when the other category is absent", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "EX12-053", as: "hagurumon" }],
          deck: [
            { card: "BT11-066", as: "machineOnly" },
            { card: "BT1-009", as: "restOne" },
            { card: "BT1-010", as: "restTwo" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hagurumon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("machineOnly").instanceId),
    );

    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("restOne").instanceId,
      s.inst("restTwo").instanceId,
    ]);
  });

  it("grants inherited Blocker only to its own host", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT1-069", as: "host", under: ["EX12-053"] },
          { card: "EX12-053", as: "top" },
          { card: "BT1-069", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(s.perm("other"), "Blocker")).toBe(false);
  });

  it("uses the normal black and alternate ME routes and rejects an off-color non-ME base", async () => {
    for (const [baseCardId, useAlternateCost] of [
      ["BT2-005", false],
      ["EX12-003", true],
    ] as const) {
      const s = setupEngine({
        0: { battleArea: [{ card: baseCardId, as: "base" }], hand: [{ card: "EX12-053", as: "target" }] },
      });
      expect(
        s.engine.applyIntent(0, {
          type: "digivolve",
          permanentId: s.perm("base").permanentId,
          instanceId: s.inst("target").instanceId,
          useAlternateCost,
        }),
      ).toEqual({ ok: true });
      await settle(() => s.perm("base").topCard.cardId === "EX12-053");
      expect(s.state.memory).toBe(0);
    }

    const invalid = setupEngine({
      0: { battleArea: [{ card: "BT1-001", as: "base" }], hand: [{ card: "EX12-053", as: "target" }] },
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

  it("matches the complete catalog identity", () => {
    expect(getCardDefinition("EX12-053")).toMatchObject({
      nameEn: "Hagurumon",
      colors: ["Black"],
      kinds: ["Digimon"],
      playCost: 3,
      dp: 2000,
      level: 3,
      forms: ["Rookie"],
      attributes: ["Virus"],
      types: ["Machine", "ME"],
      evoCosts: [{ color: "Black", level: 2, memoryCost: 0 }],
    });
  });
});
