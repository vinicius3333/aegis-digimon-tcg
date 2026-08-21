import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-097.js";

describe("BT21-097 App Link", () => {
  it("verifies the Appmon waiver, reveal-and-place Main, Delay Link, and Security placement", () => {
    const staticEffect = compiled.effects.find((entry) => entry.trigger === "Static");
    expect(staticEffect?.actions[0]).toMatchObject({
      kind: "WaiveColorRequirement",
      condition: {
        kind: "youHave",
        filter: { kind: ["Digimon", "Tamer"], nameOrTrait: [{ tokens: ["Appmon"], match: "trait" }] },
      },
    });

    const main = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(main?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "trash" });
    expect(main?.actions[1]).toEqual({ kind: "PlaceInBattleAreaSelf" });

    const delay = compiled.effects.find((entry) => entry.trigger === "EndOfYourTurn");
    expect(delay?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(delay?.actions[0]).toMatchObject({
      kind: "Link",
      from: ["hand"],
      payCost: false,
      optional: true,
      target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
    });

    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlaceInBattleAreaSelf" }] }),
    );
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });
});
