import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-059.js";

describe("EX7-059", () => {
  it("has Blast Digivolve and returns an Option from trash before using a Three Musketeers Option without cost", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Counter")?.keywords?.[0]).toMatchObject({ keyword: "BlastDigivolve" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions).toMatchObject([{ kind: "Return", to: "hand", target: { count: 1 } }, { kind: "UseOptionWithoutCost", payCost: false, from: ["hand"], optional: true }]);
  });
  it("uses a Three Musketeers Option when attacking by trashing an Option from its digivolution cards", () => expect(compiled.effects?.find((entry) => entry.trigger === "WhenAttacking")?.actions[0]).toMatchObject({ kind: "UseOptionWithoutCost", cost: { kind: "trash", target: { count: 1, filter: { zone: "digivolutionCards" } } }, optional: true }));
});
