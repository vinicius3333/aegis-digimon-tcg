import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-033.js";

describe("BT1-033 Dolphmon", () => {
  it("matches the catalog and exact inherited DP IR", () => {
    expect(getCardDefinition("BT1-033")).toMatchObject({
      cardId: "BT1-033",
      set: "BT1",
      nameEn: "Dolphmon",
      colors: ["Blue"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Blue", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Sea Animal"],
      inheritedEffectText:
        "[Your Turn] While your opponent has a Digimon with no digivolution cards in play， this Digimon gets +1000 DP.",
      rarity: "C",
      maxCountInDeck: 4,
      imageId: "BT1-033",
      nameJp: "ルカモン",
    });
    expect(getCardDefinition("BT1-033")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-033")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            {
              kind: "ModifyDP",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
              amount: 1000,
              duration: "forTheTurn",
              condition: {
                kind: "opponentHas",
                countMin: 1,
                filter: { kind: ["Digimon"], zone: "battleArea", digivolutionCards: "none" },
              },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gives its Digimon +1000 DP while the opponent has a Digimon without digivolution cards", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-033"] }] },
      1: { battleArea: ["BT1-016"] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("loses the bonus immediately when the last qualifying battle-area Digimon leaves and ignores breeding", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-033"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "qualifier" }], breeding: "BT1-017" },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    await advance(s.engine).verb.deletePermanent([s.perm("qualifier").permanentId]);
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not count an opposing Digimon that has a digivolution card", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-033"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "qualified", under: ["BT1-009"] }] },
    });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("does not give the bonus during the opponent's turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-033"] }] },
      1: { battleArea: ["BT1-016"] },
    });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(5000);
  });

  it("digivolves from a blue level 3 for 2 memory, draws, and retains the inherited effect", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-029", as: "base" }],
        hand: [{ card: "BT1-033", as: "dolphmon" }],
        deck: [{ card: "BT1-030", as: "drawn" }],
      },
      1: { battleArea: [{ card: "BT1-016", as: "qualifier" }] },
    });
    s.state.memory = 2;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dolphmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.engine.recomputeContinuousEffects();

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").topCard.cardId).toBe("BT1-033");
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT1-029"]);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT1-030");
    // The inherited text is active while BT1-033 is under a host; as the top
    // card after this evolution, it contributes only its printed 4000 DP.
    expect(s.perm("base").currentDP).toBe(4000);
  });

  it("rejects evolution from a red level 3", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "base" }], hand: [{ card: "BT1-033", as: "dolphmon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("dolphmon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });
});
