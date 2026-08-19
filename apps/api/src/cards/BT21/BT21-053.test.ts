import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-053.js";

describe("BT21-053 Watchmon", () => {
  it("restricts one opponent Digimon from attacking players until opponent turn end", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OnPlay");

    expect(effect?.actions).toEqual([
      {
        kind: "Restrict",
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        restriction: "attackPlayers",
        duration: "untilOpponentTurnEnd",
      },
    ]);
  });
});
