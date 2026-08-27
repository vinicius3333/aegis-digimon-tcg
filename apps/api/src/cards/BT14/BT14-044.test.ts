import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-044.js";

describe("BT14-044", () => {
  it("makes an opposing Digimon lose two memory when suspended until the opponent's turn end", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({
      kind: "GrantAuraToOpponents",
      duration: "untilOpponentTurnEnd",
      effectText: expect.stringContaining("lose 2 memory"),
    }));
  it("inherits a once-per-turn green-Tamer digivolution cost reduction", () =>
    expect(compiled.effects?.find((entry) => entry.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          actions: [{ mode: "reduceCost", amount: 1, condition: { kind: "youHave", filter: { colors: ["Green"] } } }],
        },
      ],
    }));
});
