import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-008.js";

describe("EX7-008 Wizardmon", () => {
  it("reveals three for Three Musketeers and a cost-6 Option", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "hand" }, { count: 1, to: "hand" }], rest: "deckBottom" }));
  it("inherits permanent +2000 DP", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" }));
});
