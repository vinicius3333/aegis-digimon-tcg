import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-077.js";

describe("BT13-077 Craniamon", () => {
  it("grants Blocker and opponent-Digimon effect immunity through the opponent's turn", () => {
    expect(compiled.effects?.filter((entry) => ["OnPlay", "WhenDigivolving"].includes(entry.trigger)).every((entry) =>
      entry.keywords?.some((keyword) => keyword.keyword === "Blocker"),
    )).toBe(true);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [expect.objectContaining({ kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "untilOpponentTurnEnd" })],
      });
    }
  });

  it("redirects an opponent's end-of-turn attack after choosing a Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "EndOfOpponentsTurn")?.actions?.[0]).toMatchObject({
      kind: "RedirectAttack",
      target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
    });
  });
});
