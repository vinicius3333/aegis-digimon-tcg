import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-056.js";

describe("BT14-056", () => {
  it("reveals five and adds a D-Brigade or DigiPolice card", () => expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 5, rest: "deckTopOrBottom", add: [{ count: 1, to: "hand", filter: { nameOrTrait: [{ tokens: ["D-Brigade", "DigiPolice"], match: "trait" }] } }] }));
  it("inherits once-per-turn leave-play prevention by deleting another D-Brigade Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "Replacement", event: "wouldLeavePlay", actions: [{ kind: "Prevent", cost: { kind: "deleteOwn" } }] }] }));
});
