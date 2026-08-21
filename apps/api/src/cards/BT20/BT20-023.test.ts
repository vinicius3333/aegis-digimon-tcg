import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-023.js";

describe("BT20-023 Coredramon", () => {
  it("reacts only to green Digimon with Dracomon or Examon in their text", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "Static")?.keywords).toEqual([{ keyword: "Jamming", raw: "＜Jamming＞" }]);
    const effect = compiled.effects.find((entry) => entry.trigger === "YourTurn" && !entry.isInherited);
    expect(effect).toMatchObject({ actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Green"], nameOrTrait: [{ tokens: ["Dracomon", "Examon"], match: "text" }] }, actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 2, optional: true, into: { nameOrTrait: [{ tokens: ["Wingdramon"], match: "name" }] } }] }] });
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({ trigger: "YourTurn", actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }] });
  });
});
