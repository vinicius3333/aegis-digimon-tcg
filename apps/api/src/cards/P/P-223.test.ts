import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-223.js";

describe("P-223 Kuzuhamon", () => {
  it("reduces play cost by 4 with three or fewer security cards", () => {
    expect(runtimeCompiledCard("P-223")!.effects.find((effect) => effect.trigger === "Static")).toMatchObject({
      actions: [
        {
          kind: "Replacement",
          actions: [
            {
              kind: "Replacement",
              mode: "reduceCost",
              amount: 4,
              condition: { kind: "zoneCount", seat: "mine", zone: "security", op: "lte", value: 3 },
            },
          ],
        },
      ],
    });
  });

  it("uses one matching Onmyōjutsu or Plug-In Option from hand or trash", () => {
    const card = runtimeCompiledCard("P-223")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      expect(card.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "UseOptionWithoutCost",
            filter: { kind: ["Option"], nameOrTrait: [{ tokens: ["Onmyōjutsu", "Plug-In"], match: "trait" }] },
            from: ["hand", "trash"],
            payCost: false,
            optional: true,
          },
        ],
      });
    }
  });

  it("once per turn may play a Pipe Fox Token after a genuine Option use", () => {
    expect(runtimeCompiledCard("P-223")!.effects.find((effect) => effect.trigger === "AllTurns")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenOptionUsed",
          sourceFilter: { controller: "mine", kind: ["Option"] },
          actions: [{ kind: "PlayToken", tokens: ["Pipe Fox"], count: 1, payCost: false, optional: true }],
        },
      ],
    });
  });
});
