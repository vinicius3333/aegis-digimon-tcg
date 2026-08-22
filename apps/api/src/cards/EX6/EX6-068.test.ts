import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-068.js";
describe("EX6-068 Descent of the Three Great Angels", () => {
  it("exposes complete IR for the Angel Delay security search", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    const watcher = compiled.effects.find((effect) => effect.trigger === "AllTurns")?.actions[0] as Extract<
      (typeof compiled.effects)[number]["actions"][number],
      { kind: "SubTrigger" }
    >;
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "onDeletionOf", delayArmedIntrinsic: true });
    expect(watcher.actions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "SearchSecurity" }),
        expect.objectContaining({ kind: "SecurityManipulation", op: "shuffle" }),
      ]),
    );
  });
});
