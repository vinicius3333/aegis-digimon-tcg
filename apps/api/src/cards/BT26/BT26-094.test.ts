import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-094.js";

describe("BT26-094 compiled fidelity", () => {
  it("distinguishes opponent-hand trash from this Tamer's under-stack trash", () => {
    const card = getCompiledCard("BT26-094");
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "PlaceUnder", faceDown: true },
      { kind: "Draw", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);
    const actions = card?.effects?.find((effect) => effect.trigger === "YourTurn")?.actions ?? [];
    expect(actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "SubTrigger", event: "whenHandTrashed", fireCondition: { kind: "triggerHandTrashedSeat", seat: "opponent" } }),
      expect.objectContaining({ kind: "SubTrigger", event: "whenDigivolutionTrashed", hostFilter: { isSelfRef: true } }),
    ]));
    for (const watcher of actions) {
      expect(watcher.actions).toMatchObject([
        { kind: "Suspend", target: { isSelf: true } },
        { kind: "GainKeyword", keyword: { keyword: "Execute" }, duration: "untilEachTurnEnd" },
      ]);
    }
    expect(card?.effects?.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
    ]);
  });
});
