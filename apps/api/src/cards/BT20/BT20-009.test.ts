import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-009.js";

describe("BT20-009 Veemon", () => {
  it("proves purple-play triggering and optional Free digivolution from hand", () => {
    const effect = compiled.effects.find((entry) => !entry.isInherited);
    const watcher = effect?.actions[0];
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "whenPlayed",
      sourceFilter: { controller: "mine", kind: ["Digimon"], colors: ["Purple"] },
    });
    expect(watcher?.actions[0]).toMatchObject({
      kind: "Digivolve",
      optional: true,
      reduceCost: 1,
      from: ["hand"],
      into: { nameOrTrait: [{ tokens: ["Free"], match: "trait" }] },
    });
  });
});
