import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-053.js";

describe("EX4-053 Falcomon", () => {
  it("reveals three and adds purple Ravemon/Bird/Avian plus Keenan Crier", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      rest: "deckBottom",
      add: [
        {
          filter: {
            colors: ["Purple"],
            nameOrTrait: [
              { match: "name", tokens: ["Ravemon"] },
              { match: "trait", tokens: ["Bird", "Avian"] },
            ],
          },
        },
        { filter: { nameOrTrait: [{ match: "name", tokens: ["Keenan Crier"] }] } },
      ],
    });
  });
  it("inherits hand trashing only when deleted outside battle", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")?.actions?.[0]).toMatchObject({
      kind: "Trash",
      chooser: "opponent",
      condition: { kind: "not", condition: { kind: "triggerRemovalCause", removalCause: "byBattle" } },
    });
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-053");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-053");
});
