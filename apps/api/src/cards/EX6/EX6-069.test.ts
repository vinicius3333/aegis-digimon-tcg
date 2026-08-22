import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-069.js";
describe("EX6-069 Rise of the Seven Great Demon Lords", () => {
  it("exposes complete IR for the Gate breeding-area Delay play", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const watcher = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0];
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "onDeletionOf", delayArmedIntrinsic: true });
    expect(watcher.actions[0]).toMatchObject({
      kind: "PlayWithoutCost",
      from: ["digivolutionCards"],
      source: "breeding",
      payCost: false,
      optional: true,
    });
  });
});
