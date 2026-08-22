import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-094.js";
import "../index.js";

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

  it("places a DATA SQUAD card under itself, draws, and gains memory at main-phase start", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-094", as: "keenan" }],
        hand: [{ card: "ST24-08", as: "dataSquad" }],
        deck: ["BT1-001", "BT1-002"],
      },
    }, { autoSelectCards: true });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("keenan"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("keenan").stack.some((card) => card.cardId === "ST24-08")).toBe(true);
  });
});
