import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./LM-004.js";

describe("LM-004 Thetismon", () => {
  it("registers both entrance timings and the Jellymon inherited watcher as complete IR", () => {
    const compiled = runtimeCompiledCard("LM-004")!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toMatchObject([
        { kind: "Unsuspend", cost: { kind: "trash", target: { count: 2 } }, optional: true },
        { kind: "Unsuspend", target: { filter: { kind: ["Tamer"] } } },
        { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" },
      ]);
    }
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenTrashedFromHand",
          sourceFilter: { nameOrTrait: [{ tokens: ["Jellymon"], match: "text" }] },
          actions: [{ kind: "Unsuspend", optional: true }],
        },
      ],
    });
  });

  it("trashes exactly two blue cards to unsuspend a Digimon and Kiyoshiro", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-027", as: "digimon", suspended: true }, { card: "BT9-086", as: "kiyoshiro", suspended: true }],
          hand: [{ card: "LM-004", as: "thetismon" }, "BT1-027", "BT1-027"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("thetismon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.filter((card) => card.cardId === "BT1-027").length === 2);
    expect(s.perm("digimon").isSuspended).toBe(false);
    expect(s.perm("kiyoshiro").isSuspended).toBe(false);
  });
});
