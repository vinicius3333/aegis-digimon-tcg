import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-027.js";

describe("EX9-027", () => {
  it("gives an opposing Digimon -4000 DP on digivolving or deletion by trashing a hand card", () => {
    for (const trigger of ["WhenDigivolving", "OnDeletion"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: -4000, duration: "forTheTurn", cost: { kind: "trash", target: { filter: { zone: "hand" } } } }] });
    }
  });
  it("inherits once-per-turn attack prevention by deleting another own Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "Prevent", cost: { kind: "deleteOwn" } }] }] });
  });
});
