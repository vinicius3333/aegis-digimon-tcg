import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-012.js";

describe("BT24-012 Dimetromon", () => {
  it("only protects other Reptile/Dragonkin Digimon from opponent effects", () => {
    const replacement = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions?.[0] as any;
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "byOpponentEffect",
      sourceFilter: { controller: "mine", excludeSelf: true },
    });
    expect(replacement.actions[0]).toMatchObject({ kind: "Prevent", cost: { kind: "return" } });
  });

  it("retains Blocker and inherited once-per-turn memory gain", () => {
    expect(compiled.effects[0]?.keywords?.[0]?.keyword).toBe("Blocker");
    const inherited = compiled.effects.find((effect) => effect.isInherited) as any;
    expect(inherited.frequency).toBe("OncePerTurn");
    expect(inherited.actions[0].actions[0]).toMatchObject({ kind: "GainMemory", amount: 1 });
  });
});
