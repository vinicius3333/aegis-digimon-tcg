import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-009.js";

describe("EX7-009 Hina Kurihara", () => {
  it("returns a Machine Dragon/Sky Dragon or Hina from trash on play and can play Hina on digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { zone: "trash" } } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true, condition: { kind: "youHave" } });
  });
  it("inherits permanent +2000 DP", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" }));
});
