import { describe, expect, it } from "vitest";
import { playEx4Card } from "./livePlayTestHelpers.js";
import { ex4CardBehaviorTests } from "./livePlayTestHelpers.js";
import { compiled } from "./EX4-061.js";

describe("EX4-061 Matt Ishida & Tai Kamiya", () => {
  it("gains memory by suspending itself when Gabumon or Agumon is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { nameOrTrait: [{ match: "name", tokens: ["Gabumon", "Agumon"] }] },
      actions: [{ kind: "GainMemory", amount: 1, cost: { kind: "suspend", target: { filter: { isSelfRef: true } } } }],
    });
  });
  it("plays the linked partner from hand or trash after a qualifying digivolution", () => {
    const effects = compiled.effects?.filter((entry) => entry.trigger === "YourTurn");
    expect(effects?.[1]?.actions?.[0]).toMatchObject({ kind: "SubTrigger", event: "whenOneOfYoursDigivolves" });
    expect((effects?.[1]?.actions?.[0] as { actions?: unknown[] } | undefined)?.actions).toMatchObject([
      {
        kind: "PlayWithoutCost",
        from: ["hand", "trash"],
        payCost: false,
        target: { filter: { nameOrTrait: [{ match: "name", tokens: ["Gabumon"] }] } },
      },
      {
        kind: "PlayWithoutCost",
        from: ["hand", "trash"],
        payCost: false,
        target: { filter: { nameOrTrait: [{ match: "name", tokens: ["Agumon"] }] } },
      },
    ]);
  });

  it("plays through the live engine", async () => {
    const s = await playEx4Card("EX4-061");
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("subject").instanceId)).toBe(false);
  });
  ex4CardBehaviorTests("EX4-061");
});
