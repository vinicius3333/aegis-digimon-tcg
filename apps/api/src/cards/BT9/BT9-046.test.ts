import { describe, expect, it } from "vitest";
import { getCardDefinition, type PlayerState } from "@aegis/shared";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT9-046.js";

describe("BT9-046 Kokuwamon (X Antibody)", () => {
  it("matches catalog and Q1841-Q1843 mandatory dual-category search IR", () => {
    expect(getCardDefinition("BT9-046")).toMatchObject({
      cardId: "BT9-046", nameEn: "Kokuwamon (X Antibody)", colors: ["Green"], kinds: ["Digimon"], level: 3,
      playCost: 3, dp: 2000, evoCosts: [{ color: "Green", level: 2, memoryCost: 0 }], forms: ["Rookie"],
      attributes: ["Data"], types: ["Machine", "X Antibody"],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [
          { filter: { nameOrTrait: [{ tokens: ["Insectoid", "Machine"], match: "trait" }] }, count: 1 },
          { filter: { nameOrTrait: [{ tokens: ["X Antibody"], match: "name" }] }, count: 1 },
        ] }],
      });
    }
    expect(compiled).toMatchObject({ coverage: "full", residual: [], digivolutionRequirement: [{ names: ["Kokuwamon"], cost: 0, isAlternate: true }] });
  });

  it("adds an Insectoid card and X Antibody Option from three revealed cards", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT9-046", as: "source" }],
          deck: [{ card: "BT9-049", as: "insectoid" }, { card: "BT9-109", as: "xAntibody" }, "BT9-047"],
        },
      },
      { autoSelectCards: true },
    );
    const player = s.state.players[0] as PlayerState;
    const ids = [s.inst("insectoid").instanceId, s.inst("xAntibody").instanceId];
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => ids.every((id) => player.hand.some((c) => c.instanceId === id)));
    expect(player.deck).toHaveLength(1);
  });
});
