import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-045.js";

describe("EX7-045", () => {
  it("de-digivolves an opposing Digimon by 1 to level 3 on play", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      stopAtLevel: 3,
    }));
  it("gives all your NSp Digimon Blocker during the opponent's turn", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OpponentsTurn")?.actions[0]).toMatchObject({
      kind: "GainKeyword",
      keyword: { keyword: "Blocker" },
      target: { count: "all" },
      duration: "permanent",
    }));
});
