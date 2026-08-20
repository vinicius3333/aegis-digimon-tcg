import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-096.js";

describe("BT22-096 Unique Emblem: Poseidia Lagoon", () => {
  it("requires both Aquatic and LIBERATOR traits for the Delay digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn");
    const watcher = effect?.actions[0] as any;
    const digivolve = watcher.actions[0];

    expect(effect?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(digivolve).toMatchObject({ kind: "Digivolve", reduceCost: 3, optional: true });
    expect(digivolve.into.and).toEqual([
      { nameOrTrait: [{ tokens: ["Aquatic"], match: "trait" }] },
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
