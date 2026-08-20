import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-043.js";

describe("EX7-043", () => {
  it("de-digivolves an opposing Digimon by 1 to level 3 by returning 3 Three Musketeers cards", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1, stopAtLevel: 3, optional: true, cost: { kind: "return", target: { count: 3 } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1, stopAtLevel: 3 });
  });
  it("inherits Reboot", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Reboot", raw: "＜Reboot＞" }));
});
