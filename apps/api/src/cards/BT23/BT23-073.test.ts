import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-073.js";

describe("BT23-073 Eater Bit", () => {
  it("deletes an opponent level 3 Digimon on play", () => {
    const onPlay = (compiled.effects.find((entry) => entry.trigger === "OnPlay") as any).actions[0];
    expect(onPlay).toMatchObject({
      kind: "Delete",
      target: { count: 1, filter: { controller: "opponent", levels: [3] } },
    });
  });

  it("offers the two correct leave-prevention costs for another Eater/Hudie Digimon", () => {
    const replacement = (compiled.effects.find((entry) => entry.trigger === "AllTurns") as any).actions[0];
    expect(replacement).toMatchObject({
      kind: "Replacement",
      event: "wouldLeavePlay",
      leaveCause: "otherThanYourEffect",
      sourceFilter: { controller: "mine", excludeSelf: true },
    });
    const prevent = replacement.actions[0];
    expect(prevent.costOptions.map((cost: any) => cost.kind)).toEqual(["deleteOwn", "place"]);
    expect(prevent.costOptions[1]).toMatchObject({
      targetIsPermanent: true,
      destination: "digivolutionStack",
      position: "bottom",
      host: { filter: { zone: "breeding", nameOrTrait: [{ tokens: ["Mother Eater"], match: "name" }] } },
    });
  });

  it("keeps the inherited Eater play-cost reduction once per turn in breeding", () => {
    const inherited = compiled.effects.find((entry) => entry.trigger === "YourTurn") as any;
    expect(inherited).toMatchObject({ isInherited: true, isBreeding: true, frequency: "OncePerTurn" });
    expect(inherited.actions[0]).toMatchObject({ kind: "Replacement", event: "wouldBePlayed" });
  });
});
