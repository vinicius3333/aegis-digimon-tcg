import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-036.js";

describe("EX4-036 BlackRapidmon", () => {
  it("trashes digivolution cards until level three and then De-Digivolves one opponent Digimon", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "EndOfAttack")?.actions;
    expect(actions?.[0]).toMatchObject({ kind: "TrashDigivolution", amount: 99, stopAtLevel: 3, fromTop: true });
    expect(actions?.[1]).toMatchObject({
      kind: "DeDigivolve",
      amount: 1,
      target: { filter: { controller: "opponent" } },
    });
  });
  it("gains Piercing when an effect suspends another opposing Digimon", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { controller: "opponent", excludeSelf: true },
          actions: [{ kind: "GainKeyword", keyword: { keyword: "Piercing" } }],
        },
      ],
    });
  });
  it("records complete compiled coverage", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-036");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-036");
});
