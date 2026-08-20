import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-050.js";

describe("EX8-050", () => {
  it("has Blocker and reveals 3 to play a Mineral or Rock Digimon costing 5 or less on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static")?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "play", optional: true }], rest: "trash" });
  });
  it("inherits once-per-turn attack redirection when the opponent attacks", () => expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentAttacks", actions: [{ kind: "RedirectAttack", optional: true }] }] }));
});
