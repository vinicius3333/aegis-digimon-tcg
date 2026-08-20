import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";
import { compiled } from "./BT23-027.js";

describe("BT23-027 Angemon", () => {
  it("draws first, then DNA evolves itself and another Digimon into an unsuspended Shakkoumon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT23-027", as: "angemon" },
            { card: "BT23-050", as: "other", suspended: true },
          ],
          hand: [{ card: "BT23-032", as: "shakkoumon" }],
          deck: [{ card: "BT1-009", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const drawnId = s.inst("drawn").instanceId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("angemon"));

    const result = s.state.players[0]!.battleArea.find((card) => card.topCard?.cardId === "BT23-032");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === drawnId)).toBe(true);
    expect(result).toBeDefined();
    expect(result?.isSuspended).toBe(false);
    expect(result?.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["BT23-027", "BT23-050"]));
  });

  it("declares Barrier", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static") as any;
    expect(staticEffect.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
  });

  it("draws one, then may DNA digivolve two of your Digimon into Shakkoumon on your turn", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const actions = (compiled.effects.find((entry) => entry.trigger === trigger) as any).actions;
      expect(actions[0]).toEqual({ kind: "Draw", controller: "mine", amount: 1 });
      expect(actions[1]).toMatchObject({
        kind: "DnaDigivolve",
        materials: { filter: { controller: "mine", kind: ["Digimon"] }, count: 2 },
        into: { controllerDefault: "mine", nameOrTrait: [{ tokens: ["Shakkoumon"], match: "name" }] },
        from: ["hand"],
        payCost: true,
        condition: { kind: "isYourTurn" },
        optional: true,
      });
    }
  });

  it("declares inherited Barrier", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Barrier" }],
    });
  });
});
