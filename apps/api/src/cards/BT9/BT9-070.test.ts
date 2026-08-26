import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-070.js";

describe("BT9-070 Gazimon (X Antibody)", () => {
  it("matches catalog, Gazimon evolution, and exact three-card trash IR", () => {
    expect(getCardDefinition("BT9-070")).toMatchObject({
      cardId: "BT9-070", nameEn: "Gazimon (X Antibody)", colors: ["Purple"], kinds: ["Digimon"], level: 3,
      playCost: 3, dp: 3000, evoCosts: [{ color: "Purple", level: 2, memoryCost: 0 }], forms: ["Rookie"],
      attributes: ["Virus"], types: ["Mammal", "X Antibody"],
    });
    expect(compiled).toEqual({
      effects: [{ trigger: "WhenDigivolving", actions: [{ kind: "TrashTopDeck", controller: "mine", amount: 3 }] }],
      coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Gazimon"], cost: 0, isAlternate: true }],
    });
  });

  it("trashes the top 3 cards of your deck", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT10-006", as: "base" }],
        hand: [{ card: "BT9-070", as: "evolving" }],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
    });
    s.state.memory = 0;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("evolving").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
