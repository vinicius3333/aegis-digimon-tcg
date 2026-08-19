import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-079.js";
describe("BT21-079 Megidramon", () => {
  it("has Security Attack plus one, wipes opposing Digimon, and recurs Guilmon family", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "EndOfAttack",
        frequency: "OncePerTurn",
        actions: [{ kind: "Delete", target: expect.objectContaining({ count: "all" }) }],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "OnDeletion",
        actions: expect.arrayContaining([expect.objectContaining({ kind: "PlayWithoutCost", from: ["trash"] })]),
      }),
    );
  });
});
