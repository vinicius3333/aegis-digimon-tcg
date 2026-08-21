import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "../index.js";

describe("EX10-065 Yukio Oikawa", () => {
  it("requires deleting this Tamer before the Myotismon play reaction grants Rush and memory (Q5180)", () => {
    const compiled = getCompiledCard("EX10-065")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const action = compiled.effects!.find((entry) => entry.trigger === "AllTurns")!.actions[0]!;
    expect(action).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Myotismon"], match: "name" }] },
      actions: [
        {
          kind: "GainKeyword",
          keyword: { keyword: "Rush" },
          duration: "forTheTurn",
          cost: { kind: "deleteOwn", target: { filter: { isSelfRef: true }, isSelf: true } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
  });
});
