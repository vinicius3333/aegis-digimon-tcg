import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-046.js";

describe("EX9-046", () => {
  it("reveals three and adds a Negamon-text card and Abbadomon", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, rest: "deckBottom", add: [{ to: "hand", filter: { nameOrTrait: [{ tokens: ["Negamon"], match: "text" }] } }, { to: "hand", filter: { nameOrTrait: [{ tokens: ["Abbadomon"], match: "name" }] } }] }));
  it("inherits +1000 DP", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: 1000, duration: "permanent" }] }));
});
