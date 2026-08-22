import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-095.js";

describe("BT26-095 compiled fidelity", () => {
  it("registers the placement cost and Digimon-deletion reaction in printed order", () => {
    const card = getCompiledCard("BT26-095");
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "PlaceUnder", faceDown: true },
      { kind: "Draw", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);
    const watcher = card?.effects?.find((effect) => effect.trigger === "AllTurns")?.actions?.[0];
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "onDeletionOf", sourceFilter: { kind: ["Digimon"] } });
    expect(watcher?.actions).toMatchObject([
      { kind: "Draw", amount: 1, cost: { kind: "suspend" } },
      { kind: "Trash", target: { filter: { zone: "hand" }, count: 1 } },
      { kind: "PlaceUnder", faceDown: true },
    ]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
    ]);
  });
});
