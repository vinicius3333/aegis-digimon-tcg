import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-095.js";

describe("BT13-095 Marcus Damon", () => {
  it("sets memory to 3 at the start of turn when memory is 2 or less", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourTurn")?.actions?.[0]).toMatchObject({ kind: "SetMemory", value: 3, condition: { kind: "memoryAtMost", value: 2 } });
  });

  it("suspends optionally on play", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions?.[0]).toMatchObject({ kind: "Suspend", optional: true, target: { filter: { isSelfRef: true }, isSelf: true } });
  });

  it("keeps the DP loss and conditional memory gain inside the suspension watcher", () => {
    const watcher = compiled.effects?.find((entry) => entry.trigger === "AllTurns")?.actions?.[0] as { actions?: unknown[] };
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenSuspended" });
    expect(watcher.actions).toHaveLength(2);
    expect(watcher.actions?.[0]).toMatchObject({ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" });
    expect(watcher.actions?.[1]).toMatchObject({ kind: "GainMemory", amount: 1, condition: { kind: "youHave", filter: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "name", tokens: ["Agumon", "Greymon"] }] } } });
  });
});
