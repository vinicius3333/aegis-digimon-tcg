import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT26-089.js";
import "../index.js";

describe("BT26-089 compiled fidelity", () => {
  it("separates check-driven and effect-driven security removal while sharing the placement cost", () => {
    const card = getCompiledCard("BT26-089");
    expect(card?.coverage).toBe("full");
    expect(card?.effects?.find((effect) => effect.trigger === "StartOfYourMainPhase")?.actions).toMatchObject([
      { kind: "PlaceUnder", faceDown: true },
      { kind: "Draw", amount: 1 },
      { kind: "GainMemory", amount: 1 },
    ]);
    const watchers = card?.effects?.find((effect) => effect.trigger === "AllTurns")?.actions ?? [];
    expect(watchers).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "SubTrigger", event: "whenSecurityRemoved", fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" } }),
      expect.objectContaining({ kind: "SubTrigger", event: "whenEffectRemovesFromSecurity", fireCondition: { kind: "triggerRemovedSecuritySeat", seat: "mine" } }),
    ]));
    expect(watchers[1]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "Suspend" }),
      expect.objectContaining({ kind: "PlaceUnder", fromDeckTop: true, faceDown: true }),
      expect.objectContaining({ kind: "GainKeyword", keyword: { keyword: "SecurityAttack", amount: -1 } }),
    ]));
    expect(card?.effects?.find((effect) => effect.trigger === "Security")?.actions).toMatchObject([
      { kind: "PlayWithoutCost", payCost: false },
    ]);
  });

  it("places a BEATBREAK card under itself, draws, and gains memory at main-phase start", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT26-089", as: "kyo" }],
        hand: [{ card: "ST23-08", as: "beatbreak" }],
        deck: ["BT1-001", "BT1-002"],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("kyo"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.perm("kyo").stack.some((card) => card.cardId === "ST23-08")).toBe(true);
  });
});
