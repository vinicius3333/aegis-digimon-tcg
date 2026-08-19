import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-090.js";

describe("BT21-090 The Strongest of Brothers", () => {
  it("keeps the Delay payload separate from the placement watcher", () => {
    const allTurns = compiled.effects.filter((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toHaveLength(2);
    expect(allTurns[0]?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "onAddDigivolutionCards" });
    expect(allTurns[1]?.keywords).toEqual([{ keyword: "Delay", raw: "＜Delay＞" }]);
    expect(allTurns[1]?.actions[0]).toMatchObject({
      kind: "Digivolve",
      payCost: false,
      from: ["hand"],
      optional: true,
      into: { nameOrTrait: [{ tokens: ["Gammamon"], match: "text" }] },
    });
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Main",
        actions: [expect.objectContaining({ kind: "RevealAdd" }), { kind: "PlaceInBattleAreaSelf" }],
      }),
    );
    expect(compiled.effects).toContainEqual(expect.objectContaining({ trigger: "Security", isSecurity: true }));
  });
});
