import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-102.js";
import "../index.js";

describe("BT26-102 compiled fidelity", () => {
  it("keeps the Seven Code waiver and complete Security clause while exposing the mixed placement seam", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.residual).toEqual([]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand", "trash"],
          payCost: false,
          optional: true,
          target: { filter: { playCostLte: 5, nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] } },
        },
        { kind: "AddToHandSelf" },
      ],
    });
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "WaiveColorRequirement" }]);
    expect(card?.effects?.[1]?.actions).toMatchObject([
      {
        kind: "PlaceUnder",
        mixedSources: { battleAreaPermanents: true, linkedCards: true, trash: true },
        trackCount: "sevenCodeMaterials",
      },
      {
        kind: "Digivolve",
        ignoreRequirements: true,
        payCost: false,
        condition: { kind: "namedCountAtLeast", countSource: "sevenCodeMaterials", count: 6 },
      },
    ]);
  });

  it("publicly plays an Appmon from hand and adds itself to hand from security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT26-102", as: "option" }],
        hand: [{ card: "BT21-009", as: "appmon" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT21-009");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-102");
  });
});
