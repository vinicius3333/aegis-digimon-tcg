import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT1-015.js";

describe("BT1-015 Greymon", () => {
  it("matches the catalog and exports the inherited DP effect", () => {
    expect(getCardDefinition("BT1-015")).toMatchObject({
      cardId: "BT1-015",
      set: "BT1",
      nameEn: "Greymon",
      colors: ["Red"],
      kinds: ["Digimon"],
      level: 4,
      playCost: 4,
      dp: 4000,
      evoCosts: [{ color: "Red", level: 3, memoryCost: 2 }],
      forms: ["Champion"],
      attributes: ["Vaccine"],
      types: ["Dinosaur"],
      inheritedEffectText: "[Your Turn] This Digimon gets +2000 DP.",
      rarity: "U",
      maxCountInDeck: 4,
      imageId: "BT1-015",
      nameJp: "グレイモン",
    });
    expect(getCardDefinition("BT1-015")?.effectText).toBeUndefined();
    expect(getCardDefinition("BT1-015")?.securityEffectText).toBeUndefined();
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          isInherited: true,
          actions: [
            {
              kind: "ModifyDP",
              amount: 2000,
              duration: "permanent",
              target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            },
          ],
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  it("gives its Digimon +2000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", as: "host", under: ["BT1-015"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("does not give its Digimon +2000 DP during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", as: "host", under: ["BT1-015"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);
  });

  it("regains the inherited boost when its controller's next turn begins", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-021", as: "host", under: ["BT1-015"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(7000);

    s.state.turnSeat = 0;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(9000);
  });

  it("keeps the inherited boost when the host digivolves", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-021", as: "host", under: [{ card: "BT1-015", as: "greymon" }] }],
        hand: [{ card: "BT1-025", as: "evolving" }],
        deck: [{ card: "BT1-010", as: "drawn" }],
      },
    });
    s.state.memory = 6;
    await s.ready();
    expect(s.perm("host").currentDP).toBe(9000);
    expect(s.state.memory).toBe(6);

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("host").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").topCard.instanceId).toBe(s.inst("evolving").instanceId);
    expect(s.perm("host").stack.map((card) => card.instanceId)).toContain(s.inst("greymon").instanceId);
    expect(s.perm("host").topCard.cardId).toBe("BT1-025");
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT1-015", "BT1-021"]);
    expect(s.state.memory).toBe(3);
    expect(s.perm("host").currentDP).toBe(13000);
  });
});
