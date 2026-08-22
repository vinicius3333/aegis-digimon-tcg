import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-091.js";
import "../index.js";

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

  it("places a DATA SQUAD card under itself, draws, and gains memory at main-phase start", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-091", as: "yoshino" }],
        hand: [{ card: "ST24-08", as: "dataSquad" }],
        deck: ["BT1-001", "BT1-002"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("yoshino"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("yoshino").stack.some((card) => card.cardId === "ST24-08")).toBe(true);
  });
});
