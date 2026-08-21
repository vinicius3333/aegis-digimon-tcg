import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-216.js";

describe("P-216 WaruMonzaemon", () => {
  it("has Blocker on the card and as an inherited keyword", () => {
    expect(
      runtimeCompiledCard("P-216")!
        .effects.filter((effect) => effect.trigger === "Static")
        .map((effect) => effect.keywords),
    ).toEqual([[{ keyword: "Blocker", raw: "＜Blocker＞" }], [{ keyword: "Blocker", raw: "＜Blocker＞" }]]);
  });

  it("plays a Dark Masters Digimon from hand and restricts that played card until opponent turn end", () => {
    expect(runtimeCompiledCard("P-216")!.effects.find((effect) => effect.trigger === "OnPlay")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["hand"],
          payCost: false,
          optional: true,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }],
            },
          },
        },
        { kind: "Restrict", target: { sameTarget: true }, restriction: "digivolve", duration: "permanent" },
        { kind: "DelayedDeletePlayed", timing: "opponentTurnEnd" },
      ],
    });
  });

  it("plays a face-up Dark Masters Digimon from security and deletes it at your turn end", () => {
    expect(runtimeCompiledCard("P-216")!.effects.find((effect) => effect.trigger === "OnDeletion")).toMatchObject({
      actions: [
        {
          kind: "PlayWithoutCost",
          from: ["security"],
          payCost: false,
          optional: true,
          target: {
            count: 1,
            filter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Dark Masters"], match: "trait" }],
            },
          },
        },
        { kind: "Restrict", target: { sameTarget: true }, restriction: "digivolve", duration: "permanent" },
        { kind: "DelayedDeletePlayed", timing: "yourTurnEnd" },
      ],
    });
  });
});
