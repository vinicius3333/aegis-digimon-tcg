import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-070.js";

describe("BT1-070 Kuwagamon", () => {
  it("matches the catalog and exact On Play IR contract", () => {
    expect(getCardDefinition("BT1-070")).toMatchObject({
      cardId: "BT1-070",
      set: "BT1",
      nameEn: "Kuwagamon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Green", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Virus"],
      types: ["Insectoid"],
      effectText: "[On Play] Suspend 1 of your opponent's Digimon.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-070",
      nameJp: "クワガーモン",
    });
    expect(getCardDefinition("BT1-070")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-070")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OnPlay",
          actions: [
            {
              kind: "Suspend",
              target: {
                filter: { controller: "opponent", kind: ["Digimon"] },
                count: 1,
                allowUnaffectableChoice: true,
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("suspends one opponent Digimon on play", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-070", as: "kuwagamon" }] },
        1: { battleArea: [{ card: "BT1-029", as: "target", dp: 2000 }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kuwagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not suspend an opposing Tamer", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-070", as: "kuwagamon" }] },
        1: { battleArea: [{ card: "BT1-085", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kuwagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-070"));

    expect(s.perm("tamer").isSuspended).toBe(false);
  });

  it("does nothing when the opponent has no Digimon", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT1-070", as: "kuwagamon" }] },
        1: { battleArea: [{ card: "BT1-085", as: "tamer" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("kuwagamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT1-070"));
    expect(s.perm("tamer").isSuspended).toBe(false);
    expect(s.state.pendingDecision).toBeUndefined();
  });

  it("digivolves from a legal green level 3 for 2 memory and draws", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "base" }],
        hand: [{ card: "BT1-070", as: "kuwagamon" }],
        deck: [{ card: "BT1-010", as: "evolutionDraw" }],
      },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("kuwagamon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("kuwagamon").instanceId);
    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-064"]);
    expect(s.state.players[0]!.hand[0]!.instanceId).toBe(s.inst("evolutionDraw").instanceId);
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "redBase" }], hand: [{ card: "BT1-070", as: "kuwagamon" }] },
    });
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("kuwagamon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
