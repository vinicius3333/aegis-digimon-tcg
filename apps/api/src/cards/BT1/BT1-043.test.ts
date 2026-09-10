import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-043.js";
describe("BT1-043 SaberLeomon", () => {
  it("matches the catalog and exact When Digivolving IR contract", () => {
    expect(getCardDefinition("BT1-043")).toMatchObject({
      cardId: "BT1-043",
      set: "BT1",
      nameEn: "SaberLeomon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 11,
      dp: 10000,
      evoCosts: [{ color: "Blue", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Ancient Animal"],
      effectText: "[When Digivolving] Trash 4 digivolution cards under 1 of your opponent's Digimon.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-043",
      nameJp: "サーベルレオモン",
    });
    expect(getCardDefinition("BT1-043")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-043")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "WhenDigivolving",
          actions: [
            {
              kind: "TrashDigivolution",
              target: { filter: { controller: "opponent", kind: ["Digimon"], digivolutionCards: "hasAny" }, count: 1 },
              amount: 4,
              fromTop: false,
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("trashes exactly four digivolution cards when the target has more than four", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-039", as: "base" }],
          hand: [{ card: "BT1-043", as: "evolving" }],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
        1: {
          battleArea: [
            { card: "BT2-020", under: ["BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"], as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 1);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-039"]);
    expect(s.perm("target").stack).toHaveLength(1);
    expect(s.perm("target").stack.map((card) => card.cardId)).toEqual(["BT1-014"]);
    expect(s.state.players[1]!.trash.map((card) => card.cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-011", "BT1-012", "BT1-013"]),
    );
  });

  it("trashes all available digivolution cards when the target has fewer than four", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-039", as: "base" }], hand: [{ card: "BT1-043", as: "evolving" }] },
        1: { battleArea: [{ card: "BT2-020", under: ["BT1-010", "BT1-011"], as: "target" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").stack.length === 0);
    expect(s.perm("target").stack).toHaveLength(0);
  });

  it("chooses only a sourced opponent Digimon and leaves a source-less peer untouched", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-039", as: "base" }], hand: [{ card: "BT1-043", as: "evolving" }] },
        1: {
          battleArea: [
            { card: "BT1-010", as: "sourceLess" },
            { card: "BT2-020", under: ["BT1-010", "BT1-011", "BT1-012", "BT1-013"], as: "sourced" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("sourced").stack.length === 0);

    expect(s.perm("sourced").stack).toHaveLength(0);
    expect(s.perm("sourceLess").topCard.cardId).toBe("BT1-010");
    expect(s.state.players[1]!.trash.map(({ cardId }) => cardId)).toEqual(
      expect.arrayContaining(["BT1-010", "BT1-011", "BT1-012", "BT1-013"]),
    );
  });

  it("rejects evolution from a non-blue level-5 Digimon", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-020", as: "base" }], hand: [{ card: "BT1-043", as: "evolving" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
