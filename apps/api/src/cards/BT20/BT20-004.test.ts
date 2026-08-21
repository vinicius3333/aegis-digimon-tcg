import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-004.js";

describe("BT20-004 Pinamon", () => {
  it("proves the inherited once-per-turn optional ACCEL digivolution", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    const watcher = effect?.actions[0];
    expect(effect).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn" });
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { nameOrTrait: [{ tokens: ["ACCEL"], match: "trait" }] },
    });
    expect(watcher?.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      reduceCost: 2,
      into: { nameOrTrait: [{ tokens: ["ACCEL"], match: "trait" }] },
      from: ["hand"],
    });
  });
});
