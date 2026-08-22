import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-091.js";

describe("BT26-091 compiled fidelity", () => {
  it("registers both printed reaction sources with a suspension-paid reduced digivolution", () => {
    const card = getCompiledCard("BT26-091");
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "PlaceUnder", faceDown: true },
      { kind: "Draw", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);
    const actions = card?.effects?.find((effect) => effect.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "SubTrigger", event: "whenSuspended", sourceFilter: { controller: "opponent" } }),
      expect.objectContaining({ kind: "SubTrigger", event: "whenDigivolutionTrashed", hostFilter: { isSelfRef: true } }),
    ]));
    for (const watcher of actions) {
      expect(watcher.actions?.[0]).toMatchObject({ kind: "Digivolve", from: ["hand"], costDelta: -1, optional: true, cost: { kind: "suspend" } });
    }
    expect(card?.effects?.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
    ]);
  });
});
