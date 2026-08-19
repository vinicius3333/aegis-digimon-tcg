import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-058.js";

describe("BT23-058 Craniamon", () => {
  it("declares Reboot and Blocker", () => {
    expect(
      compiled.effects
        .filter((entry) => entry.trigger === "Static")
        .flatMap((entry) => entry.keywords?.map((keyword) => keyword.keyword) ?? []),
    ).toEqual(["Reboot", "Blocker"]);
  });

  it("protects one of your Digimon or Tamers from an opponent effect by suspending this Digimon", () => {
    const replacement = (
      compiled.effects.find((entry) => entry.trigger === "AllTurns" && entry.actions[0]?.kind === "Replacement") as any
    ).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      mode: "prevent",
      leaveCause: "byOpponentEffect",
      sourceFilter: { controller: "mine", kind: ["Digimon", "Tamer"] },
      target: { filter: { controller: "mine", kind: ["Digimon", "Tamer"] }, count: 1 },
      cost: { kind: "suspend", target: { filter: { isSelfRef: true }, isSelf: true } },
    });
  });

  it("once per turn deletes all opposing lowest-play-cost Digimon when this Digimon suspends", () => {
    const effect = compiled.effects.find(
      (entry) => entry.trigger === "AllTurns" && entry.actions[0]?.kind === "SubTrigger",
    ) as any;
    expect(effect.frequency).toBe("OncePerTurn");
    expect(effect.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      sourceFilter: { isSelfRef: true },
      actions: [
        { kind: "Delete", target: { filter: { controller: "opponent", superlative: "lowestPlayCost" }, count: "all" } },
      ],
    });
  });

  it("requires a level 5 CS Digimon for alternate evolution", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["CS"], cost: 3, isAlternate: true }]);
  });
});
