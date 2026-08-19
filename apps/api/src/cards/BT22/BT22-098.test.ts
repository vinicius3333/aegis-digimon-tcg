import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-098.js";

describe("BT22-098 Unique Emblem: Fable Waltz", () => {
  it("requires both Puppet and LIBERATOR traits for the Delay digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    const digivolve = effect?.actions[1] as any;

    expect(digivolve).toMatchObject({ kind: "Digivolve", reduceCost: 3, optional: true });
    expect(digivolve.into.and).toEqual([
      { nameOrTrait: [{ tokens: ["Puppet"], match: "trait" }] },
      { nameOrTrait: [{ tokens: ["LIBERATOR"], match: "trait" }] },
    ]);
  });

  it("places itself after the optional Main play", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Main");
    expect(effect?.actions).toMatchObject([
      { kind: "PlayWithoutCost", optional: true },
      { kind: "PlaceInBattleAreaSelf" },
    ]);
    expect((effect?.actions[1] as any).optional).toBeUndefined();
  });

  it("activates its Main effects from Security", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(effect).toMatchObject({ isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });
});
