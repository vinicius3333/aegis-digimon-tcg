import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-053.js";

describe("EX8-053", () => {
  it("has Blocker, gains +5000 DP when the opponent has a 13000 DP or higher Digimon, and plays a Mineral/Rock Digimon costing 8 or less on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Static" && entry.keywords)?.keywords).toContainEqual({ keyword: "Blocker", raw: "＜Blocker＞" });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions[0]).toMatchObject({ kind: "Aura", effect: { kind: "modifyDP", amount: 5000 }, while: { kind: "opponentHas" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions[0]).toMatchObject({ kind: "RevealAdd", revealCount: 3, add: [{ count: 1, to: "play", optional: true }], rest: "trash" });
  });
});
