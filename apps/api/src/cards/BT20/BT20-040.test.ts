import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-040.js";

describe("BT20-040 Coredramon", () => {
  it("reacts to blue Digimon with Dracomon or Examon in their text and optionally reduces Groundramon evolution", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([{ keyword: "Raid", raw: "＜Raid＞" }]);
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    expect(effect).toMatchObject({ actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Blue"], nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }] }, actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 2, optional: true, into: { nameOrTrait: [{ tokens: ["Groundramon"], match: "name" }] } }] }] });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] });
  });
});
