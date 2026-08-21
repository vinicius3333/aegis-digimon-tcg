import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-042.js";

describe("EX7-042", () => {
  it("draws 2 by optionally trashing a Rock Dragon or Earth Dragon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Draw", amount: 2, optional: true, cost: { kind: "trash" } }));
  it("plays Hina Kurihara when digivolving with one or fewer Tamers and inherits +2000 DP", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", optional: true, condition: { kind: "zoneCount", filter: { zone: "battleArea", controller: "mine", kind: ["Tamer"] }, op: "lte", value: 1 } });
    expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" });
  });
});
