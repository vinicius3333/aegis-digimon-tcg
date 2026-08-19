import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-060.js";

describe("BT21-060 Destromon", () => {
  it("uses this stack's Vemmon cards for the inherited attack-prevention cost", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    const prevent = (inherited?.actions[0] as { actions?: unknown[] } | undefined)?.actions?.[0] as
      | { cost?: unknown }
      | undefined;

    expect(inherited).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn" });
    expect(prevent).toMatchObject({ kind: "Prevent", optional: true, abortOnDecline: true });
    expect(prevent?.cost).toMatchObject({
      kind: "return",
      target: {
        filter: {
          controller: "mine",
          zone: "digivolutionCards",
          kind: ["Digimon"],
          nameOrTrait: [{ tokens: ["Vemmon"], match: "name" }],
        },
        count: 2,
      },
    });
  });
});
