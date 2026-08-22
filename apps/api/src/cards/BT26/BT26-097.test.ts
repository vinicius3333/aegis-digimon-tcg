import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-097.js";
import "../index.js";

describe("BT26-097 compiled fidelity", () => {
  it("encodes the live security surcharge, permanent placement cost, authorized free evolution, and gated tail", () => {
    const card = compiled;
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            filter: { kind: ["Digimon", "Tamer"], playCostLte: 5, nameOrTrait: [{ tokens: ["TS"], match: "trait" }] },
          },
        },
        { kind: "AddToHandSelf" },
      ],
    });
    expect(card?.effects?.find((effect) => effect.trigger === "Static")?.actions).toMatchObject([
      { kind: "CostModifier", costType: "use", handResident: true, amount: 1, scaling: { unit: "security", per: 1 } },
    ]);
    const main = card?.effects?.find((effect) => effect.trigger === "Main")?.actions ?? [];
    expect(main[0]).toMatchObject({ kind: "PlaceUnder", targetIsPermanent: true, position: "bottom" });
    expect(main[1]).toMatchObject({
      kind: "Digivolve",
      from: ["hand", "trash"],
      payCost: false,
      ignoreRequirements: true,
      optional: true,
    });
    expect(main[2]).toMatchObject({
      kind: "PlaceUnder",
      position: "top",
      optional: true,
      condition: { kind: "ifThisEffectDigivolved" },
    });
    expect(card.effects.find((effect) => effect.trigger === "Static")?.actions[0]).toMatchObject({
      scaling: { unit: "security", per: 1 },
    });
  });

  it("publicly plays a low-cost TS card from hand and adds itself to hand from security", async () => {
    const s = setupEngine({
      0: {
        security: [{ card: "BT26-097", as: "option", faceUp: true }],
        hand: [{ card: "BT26-009", as: "tsCard" }],
        battleArea: [{ card: "BT26-030", as: "tsSource" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.map(({ topCard }) => topCard?.cardId)).toContain("BT26-009");
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-097");
  });
});
