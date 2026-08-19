import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-101.js";

describe("BT22-101 Kyoko Kuremi", () => {
  it("sets memory to three at the start of your turn when memory is two or less", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "StartOfYourTurn");
    expect(effect?.actions[0]).toMatchObject({
      kind: "SetMemory",
      value: 3,
      condition: { kind: "memoryAtMost", value: 2, controller: "mine" },
    });
  });

  it("returns a CS Digimon from trash when a level 4 or higher CS Digimon is deleted", () => {
    const watcher = compiled.effects.find((entry) => entry.trigger === "AllTurns")?.actions[0] as any;
    expect(watcher).toMatchObject({
      kind: "SubTrigger",
      event: "onDeletionOf",
      sourceFilter: {
        controller: "mine",
        kind: ["Digimon"],
        levelComparison: { op: "gte", value: 4 },
        nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
      },
      actions: [
        {
          kind: "Return",
          to: "hand",
          cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
          optional: true,
          abortOnDecline: true,
        },
      ],
    });
    expect(watcher.actions[0].target.filter).toMatchObject({
      zone: "trash",
      controller: "mine",
      kind: ["Digimon"],
      nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
    });
  });

  it("digivolves itself into Alphamon only when it unsuspends and no Alphamon is present", () => {
    const watcher = compiled.effects.find((entry) => entry.trigger === "YourTurn")?.actions[0] as any;
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenUnsuspended", sourceFilter: { isSelfRef: true } });
    expect(watcher.actions[0]).toMatchObject({
      kind: "Digivolve",
      target: { filter: { isSelfRef: true }, isSelf: true, count: 1 },
      into: { nameOrTrait: [{ tokens: ["Alphamon"], match: "name" }] },
      from: ["hand"],
      reduceCost: 2,
      optional: true,
      condition: {
        kind: "youHaveNone",
        filter: { nameOrTrait: [{ tokens: ["Alphamon"], match: "name" }] },
      },
    });
  });

  it("plays itself from security without paying its cost", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security");
    expect(security).toMatchObject({ isSecurity: true, actions: [{ kind: "PlayWithoutCost", payCost: false }] });
  });
});
