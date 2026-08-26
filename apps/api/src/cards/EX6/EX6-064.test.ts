import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-064.js";

describe("EX6-064 Shu-Chong Wong", () => {
  it("reveals three for Beast-family cards", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [{ count: 1, to: "hand" }],
      rest: "deckBottom",
    }));
  it("watches any own effect-suspended Digimon, then suspends this Tamer to reduce evolution by two", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenEffectSuspends",
      triggerFilter: { controller: "mine", kind: ["Digimon"] },
      actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 2, cost: { kind: "suspend" } }],
    });
    expect(compiled.effects?.find((entry) => entry.isSecurity)?.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      payCost: false,
    });
  });
});
