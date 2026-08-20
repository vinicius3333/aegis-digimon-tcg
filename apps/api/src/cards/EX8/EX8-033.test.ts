import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-033.js";

describe("EX8-033", () => {
  it("returns an NSo card from trash on play and digivolving and gives an opposing Digimon -4000 DP on deletion", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { count: 1 } });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "Return", to: "hand" });
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion" && !entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: -4000, duration: "forTheTurn" });
  });
  it("inherits Recovery +1 (Deck)", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Recovery", amount: 1, raw: "＜Recovery +1 (Deck)＞" }));
});
