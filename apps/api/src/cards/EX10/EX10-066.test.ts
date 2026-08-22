import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "../index.js";

describe("EX10-066 Akihiro Kurata", () => {
  it("requires the hand threshold and places this Tamer under a Belphemon before trash digivolution", () => {
    const compiled = getCompiledCard("EX10-066")!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    const action = compiled.effects!.find((entry) => entry.trigger === "EndOfYourTurn")!.actions[0]!;
    expect(action).toMatchObject({
      kind: "Digivolve",
      from: ["trash"],
      payCost: false,
      optional: true,
      condition: { kind: "zoneCount", zone: "hand", op: "lte", value: 6 },
      cost: {
        kind: "place",
        target: { filter: { isSelfRef: true }, isSelf: true },
        underFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ tokens: ["Belphemon"], match: "name" }] },
        destination: "digivolutionStack",
        position: "bottom",
        host: "target",
      },
      into: { nameOrTrait: [{ tokens: ["Belphemon"], match: "name" }] },
    });
  });
});
