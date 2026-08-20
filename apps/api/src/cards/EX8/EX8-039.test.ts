import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-039.js";

describe("EX8-039", () => {
  it("reveals 3 for an Insectoid and an NSp card", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }], rest: "deckBottom" }));
  it("inherits +2000 DP during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" }));
});
