import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-098.js";
import "../index.js";

describe("BT26-098 compiled fidelity", () => {
  it("encodes the face-down Tamer payment, literal materials, free Rosemon evolution, and Security mode", () => {
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
          target: {
            filter: {
              kind: ["Digimon", "Tamer"],
              orFilters: [
                { nameOrTrait: [{ tokens: ["Lalamon"], match: "name" }] },
                { nameOrTrait: [{ tokens: ["Yoshino Fujieda"], match: "name" }] },
              ],
            },
          },
        },
        { kind: "AddToHandSelf" },
      ],
    });

    const beforePayCost = card?.effects?.find((effect) => effect.trigger === "BeforePayCost")?.actions ?? [];
    expect(beforePayCost).toMatchObject([
      {
        kind: "CostModifier",
        costType: "use",
        mode: "reduce",
        amount: 2,
        handResident: true,
        cost: { kind: "trashBottomFaceDownUnderTamer", controller: "mine" },
        optional: true,
        abortOnDecline: true,
      },
    ]);

    const main = card?.effects?.find((effect) => effect.trigger === "Main")?.actions ?? [];
    expect(main[0]).toMatchObject({ kind: "PlaceUnder", position: "bottom", bindHostAs: "lalamonHost" });
    expect(main[1]).toMatchObject({ kind: "PlaceUnder", position: "bottom", underSelectionRef: "lalamonHost" });
    expect(main[2]).toMatchObject({
      kind: "Digivolve",
      from: ["hand"],
      payCost: false,
      ignoreRequirements: true,
      optional: true,
    });
  });

  it("publicly plays a Lalamon from hand and adds itself to hand from security", async () => {
    const s = setupEngine(
      {
        0: {
          security: [{ card: "BT26-098", as: "option", faceUp: true }],
          hand: [{ card: "BT26-036", as: "lalamon" }],
          battleArea: [{ card: "BT26-036", as: "existingLalamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("option"));

    expect(s.state.players[0]!.battleArea.filter(({ topCard }) => topCard?.cardId === "BT26-036")).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toContain("BT26-098");
  });
});
