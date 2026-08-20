import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-050.js";

describe("BT23-050 Ankylomon", () => {
  it("finishes the DP reduction before optionally DNA digivolving into Shakkoumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-050", as: "anky" },
            { card: "BT23-027", as: "yellowMaterial", suspended: true },
          ],
          hand: [{ card: "BT23-032", as: "shakkou" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "zeroDp", dp: 2000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const zeroId = s.perm("zeroDp").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("anky"));

    const shakkoumon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT23-032");
    expect(shakkoumon).toBeDefined();
    expect(shakkoumon?.isSuspended).toBe(false);
    expect(shakkoumon?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT23-050", "BT23-027"]));
    expect(s.state.players[1]!.battleArea.some((p) => p.permanentId === zeroId)).toBe(false);
  });

  it("has Blocker as a main and inherited keyword", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Blocker", "Blocker"]);
  });

  it("gives one opposing Digimon -2000 DP until the opponent's turn ends on play and digivolving", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -2000,
        duration: "untilOpponentTurnEnd",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it("then optionally DNA digivolves two of your Digimon into Shakkoumon only during your turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const action = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions[1];
      expect(action).toMatchObject({
        kind: "DnaDigivolve",
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: { nameOrTrait: [{ tokens: ["Shakkoumon"], match: "name" }] },
        from: ["hand"],
        payCost: true,
        condition: { kind: "isYourTurn" },
        optional: true,
      });
    }
  });
});
