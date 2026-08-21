import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

describe("ST24-01 Koromon", () => {
  it("inherits a once-per-turn optional attack digivolution paid by the bottom face-down Tamer card", () => {
    const compiled = registeredCompiledCards.get("ST24-01") ?? getCompiledCard("ST24-01")!;
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenAttacking");

    expect(effect).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          reduceCost: 2,
          optional: true,
          cost: {
            kind: "trash",
            target: {
              count: 1,
              filter: {
                zone: "digivolutionCards",
                faceDown: true,
                position: "bottom",
                hostFilter: { kind: ["Tamer"] },
              },
            },
          },
        },
      ],
    });
  });
});
