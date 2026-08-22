import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-095.js";
import "../index.js";

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

  it("places a BEATBREAK card under itself, draws, and gains memory at main-phase start", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-095", as: "reina" }],
        hand: [{ card: "ST23-08", as: "beatbreak" }],
        deck: ["BT1-001", "BT1-002"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("reina"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("reina").stack.some((card) => card.cardId === "ST23-08")).toBe(true);
  });
});
