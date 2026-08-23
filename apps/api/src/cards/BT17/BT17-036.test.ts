import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-036.js";

describe("BT17-036 Boutmon", () => {
  it("once per turn prevents opponent-effect removal by trashing security", () => {
    expect(
      compiled.effects.find((entry) => entry.frequency === "OncePerTurn" && entry.actions[0]?.kind === "Replacement"),
    ).toMatchObject({
      trigger: "AllTurns",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "byOpponentEffect",
          cost: { kind: "trashSecurityTop" },
        },
      ],
    });
  });

  it("evolves into a Pulsemon-text Digimon after effect-removing a security card when Leon is underneath", () => {
    expect(compiled.effects.find((entry) => entry.actions[0]?.kind === "SubTrigger")).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          event: "whenEffectRemovesFromSecurity",
          actions: [
            {
              kind: "Digivolve",
              from: ["hand"],
              payCost: false,
              optional: true,
              into: { nameOrTrait: [{ tokens: ["Pulsemon"], match: "text" }] },
            },
          ],
        },
      ],
    });
  });

  it("may trash security to unsuspend after attacking when its top card has Pulsemon in its text", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "EndOfAttack",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Unsuspend",
          condition: { kind: "selfTopHasText" },
          cost: { kind: "trashSecurityTop" },
          optional: true,
        },
      ],
    });
  });
});
