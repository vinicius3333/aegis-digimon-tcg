import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-006.js";

describe("EX8-006", () => {
  it("inherits a once-per-turn optional attack effect that trashes a card to delete an opposing level 3 Digimon", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", actions: [{ kind: "Delete", target: { count: 1, filter: { levels: [3] } }, condition: { kind: "selfHasTrait" }, cost: { kind: "trash", target: { count: 1 } }, optional: true, abortOnDecline: true }] }));
});
