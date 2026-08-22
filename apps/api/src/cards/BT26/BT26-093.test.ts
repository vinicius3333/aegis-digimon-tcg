import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-093.js";

describe("BT26-093 compiled fidelity", () => {
  it("registers the hand placement cost, global attack watcher, grants, and Security play", () => {
    const card = getCompiledCard("BT26-093");
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "PlaceUnder", faceDown: true },
      { kind: "Draw", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);
    const watcher = card?.effects?.find((effect) => effect.trigger === "AllTurns")?.actions?.[0];
    expect(watcher).toMatchObject({ kind: "SubTrigger", event: "whenAttacking" });
    expect(watcher?.actions).toMatchObject([
      { kind: "Suspend", target: { isSelf: true } },
      { kind: "PlaceUnder", fromDeckTop: true, faceDown: true },
      { kind: "GainKeyword", keyword: { keyword: "Collision" } },
      { kind: "GainKeyword", keyword: { keyword: "Blocker" } },
    ]);
    expect(card?.effects?.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
    ]);
  });
});
