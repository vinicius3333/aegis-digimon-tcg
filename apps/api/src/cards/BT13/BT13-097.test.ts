import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-097.js";

describe("BT13-097 Thomas H. Norstein", () => {
  it("sets memory to 3 at the start of turn when memory is 2 or less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourTurn")?.actions?.[0]).toMatchObject({ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } });
  });

  it("draws for both players after a matching Digimon attacks, paying by suspending this Tamer", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "YourTurn")?.actions?.[0] as { sourceFilter?: unknown; actions?: unknown[] };
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenAttacking", sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Gaomon", "GaoGamon"] }] } });
    expect(watcher.actions).toEqual([
      expect.objectContaining({ kind: "Draw", controller: "mine", amount: 1, cost: expect.objectContaining({ kind: "suspend" }) }),
      { kind: "Draw", controller: "opponent", amount: 1 },
    ]);
  });
});
